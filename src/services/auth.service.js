'use strict'

const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const { Op } = require('sequelize')
const { Utilisateur, RefreshToken } = require('../models')
const { jwt: confJwt, bcryptRounds } = require('../config/security')
const { UnauthorizedError, ForbiddenError } = require('../errors/AppError')
const logger = require('../utils/logger')

/**
 * Authentification du dashboard.
 *
 * Un service ne touche jamais à `res` : il renvoie des données ou lève
 * une AppError. C'est ce qui permet de le tester sans serveur HTTP.
 */

/**
 * Hash factice comparé quand l'e-mail n'existe pas.
 *
 * Sans cela, une réponse instantanée pour « utilisateur inconnu » et une
 * réponse lente pour « mot de passe faux » suffisent à énumérer les
 * comptes existants (attaque temporelle). On paie donc toujours le coût
 * d'un bcrypt, quel que soit le cas.
 */
const HASH_FACTICE = bcrypt.hashSync('mot-de-passe-inexistant-anti-timing', bcryptRounds)

function hacherToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function signerAccess(utilisateur) {
  return jwt.sign(
    {
      sub: utilisateur.id,
      email: utilisateur.email,
      role: utilisateur.role,
      type: 'access',
    },
    confJwt.accessSecret,
    { expiresIn: confJwt.accessExpires, issuer: confJwt.issuer }
  )
}

function signerRefresh(utilisateur) {
  // jti aléatoire : deux refresh émis dans la même seconde pour le même
  // compte auraient sinon le même hash, donc la même ligne en base.
  return jwt.sign(
    { sub: utilisateur.id, type: 'refresh', jti: crypto.randomUUID() },
    confJwt.refreshSecret,
    { expiresIn: confJwt.refreshExpires, issuer: confJwt.issuer }
  )
}

/** Enregistre la session et limite le nombre de sessions simultanées. */
async function enregistrerSession(utilisateur, refreshToken, contexte = {}) {
  const decode = jwt.decode(refreshToken)

  await RefreshToken.create({
    utilisateurId: utilisateur.id,
    tokenHash: hacherToken(refreshToken),
    expireLe: new Date(decode.exp * 1000),
    adresseIp: contexte.ip || null,
    agent: (contexte.agent || '').slice(0, 255) || null,
  })

  // Au-delà du quota, on révoque les plus anciennes : un compte compromis
  // ne peut pas accumuler des sessions dormantes indéfiniment.
  const sessions = await RefreshToken.findAll({
    where: { utilisateurId: utilisateur.id, revoqueLe: null },
    order: [['createdAt', 'DESC']],
  })

  if (sessions.length > confJwt.maxRefreshTokens) {
    const aRevoquer = sessions.slice(confJwt.maxRefreshTokens)
    await RefreshToken.update(
      { revoqueLe: new Date() },
      { where: { id: aRevoquer.map((s) => s.id) } }
    )
  }
}

/** Connexion par e-mail + mot de passe. */
async function connexion({ email, motDePasse }, contexte = {}) {
  const utilisateur = await Utilisateur.scope('avecMotDePasse').findOne({
    where: { email: String(email).trim().toLowerCase() },
  })

  if (!utilisateur) {
    // Comparaison factice pour uniformiser le temps de réponse.
    await bcrypt.compare(motDePasse, HASH_FACTICE)
    throw new UnauthorizedError('Identifiants incorrects')
  }

  const correct = await utilisateur.verifierMotDePasse(motDePasse)
  if (!correct) {
    logger.warn('Échec de connexion', { email: utilisateur.email, ip: contexte.ip })
    // Message identique au cas « compte inconnu » : ne jamais révéler
    // lequel des deux champs est faux.
    throw new UnauthorizedError('Identifiants incorrects')
  }

  if (!utilisateur.actif) {
    throw new ForbiddenError('Compte désactivé, contactez un administrateur')
  }

  const accessToken = signerAccess(utilisateur)
  const refreshToken = signerRefresh(utilisateur)
  await enregistrerSession(utilisateur, refreshToken, contexte)

  utilisateur.derniereConnexion = new Date()
  await utilisateur.save()

  return { utilisateur: nettoyer(utilisateur), accessToken, refreshToken }
}

/** Échange d'un refresh token contre un nouveau couple de jetons (rotation). */
async function rafraichir(refreshToken, contexte = {}) {
  if (!refreshToken) throw new UnauthorizedError('Jeton de rafraîchissement absent')

  const charge = jwt.verify(refreshToken, confJwt.refreshSecret, { issuer: confJwt.issuer })
  if (charge.type !== 'refresh') throw new UnauthorizedError('Type de jeton invalide')

  const enregistrement = await RefreshToken.findOne({
    where: { tokenHash: hacherToken(refreshToken), revoqueLe: null },
  })
  if (!enregistrement) throw new UnauthorizedError('Session révoquée ou inconnue')
  if (enregistrement.expireLe < new Date()) throw new UnauthorizedError('Session expirée')

  const utilisateur = await Utilisateur.findByPk(charge.sub)
  if (!utilisateur) throw new UnauthorizedError('Compte introuvable')
  if (!utilisateur.actif) throw new ForbiddenError('Compte désactivé')

  // Rotation : l'ancien jeton est révoqué immédiatement. Un jeton rejoué
  // après rotation signale un vol et ne fonctionnera pas.
  enregistrement.revoqueLe = new Date()
  await enregistrement.save()

  const nouveauRefresh = signerRefresh(utilisateur)
  await enregistrerSession(utilisateur, nouveauRefresh, contexte)

  return {
    utilisateur: nettoyer(utilisateur),
    accessToken: signerAccess(utilisateur),
    refreshToken: nouveauRefresh,
  }
}

/** Déconnexion : révoque la session courante (ou toutes). */
async function deconnexion(refreshToken, { toutesLesSessions = false, utilisateurId } = {}) {
  if (toutesLesSessions && utilisateurId) {
    await RefreshToken.update(
      { revoqueLe: new Date() },
      { where: { utilisateurId, revoqueLe: null } }
    )
    return
  }
  if (!refreshToken) return
  await RefreshToken.update(
    { revoqueLe: new Date() },
    { where: { tokenHash: hacherToken(refreshToken), revoqueLe: null } }
  )
}

/** Purge des sessions expirées ou révoquées — appelée par le cron. */
async function purgerSessions() {
  const supprimees = await RefreshToken.destroy({
    where: {
      [Op.or]: [{ expireLe: { [Op.lt]: new Date() } }, { revoqueLe: { [Op.ne]: null } }],
    },
  })
  return supprimees
}

/** Retire le hash du mot de passe avant tout envoi au client. */
function nettoyer(utilisateur) {
  const brut = utilisateur.toJSON()
  delete brut.motDePasse
  return brut
}

module.exports = {
  connexion,
  rafraichir,
  deconnexion,
  purgerSessions,
  nettoyer,
  hacherToken,
}
