'use strict'

const asyncHandler = require('../../middlewares/asyncHandler')
const authService = require('../../services/auth.service')
const auditService = require('../../services/audit.service')
const utilisateurService = require('../../services/utilisateur.service')
const { Utilisateur } = require('../../models')
const { ok } = require('../../utils/response')
const { UnauthorizedError, BadRequestError } = require('../../errors/AppError')

/**
 * Contrôleurs d'authentification.
 *
 * Ils n'exécutent aucune requête : ils traduisent HTTP <-> service.
 * Toute la logique (comparaison, rotation, quotas de sessions) vit dans
 * services/auth.service.js et reste testable sans serveur.
 */

const contexteRequete = (req) => ({
  ip: req.ip,
  agent: req.headers['user-agent'],
})

const connexion = asyncHandler(async (req, res) => {
  const resultat = await authService.connexion(req.body, contexteRequete(req))

  await auditService.tracer({
    utilisateur: resultat.utilisateur,
    action: 'connexion',
    ressource: 'utilisateur',
    ressourceId: resultat.utilisateur.id,
    ip: req.ip,
  })

  return ok(res, resultat, 'Connexion réussie')
})

const rafraichir = asyncHandler(async (req, res) => {
  const resultat = await authService.rafraichir(req.body.refreshToken, contexteRequete(req))
  return ok(res, resultat, 'Session renouvelée')
})

const deconnexion = asyncHandler(async (req, res) => {
  await authService.deconnexion(req.body.refreshToken, {
    toutesLesSessions: req.body.toutesLesSessions,
    utilisateurId: req.user ? req.user.id : undefined,
  })
  return ok(res, null, 'Déconnexion effectuée')
})

/** Profil courant : le dashboard s'en sert pour restaurer la session au chargement. */
const moi = asyncHandler(async (req, res) => {
  return ok(res, authService.nettoyer(req.user), 'Profil récupéré')
})

/** Mise a jour de son propre profil (identite seulement, jamais les droits). */
const majProfil = asyncHandler(async (req, res) => {
  const utilisateur = await utilisateurService.majProfil(req.user.id, req.body)

  await auditService.tracer({
    utilisateur: req.user,
    action: 'modification_profil',
    ressource: 'utilisateur',
    ressourceId: utilisateur.id,
    details: { champs: Object.keys(req.body) },
    ip: req.ip,
  })

  return ok(res, utilisateur, 'Profil mis a jour')
})

const changerMotDePasse = asyncHandler(async (req, res) => {
  const { ancienMotDePasse, nouveauMotDePasse } = req.body

  // On recharge avec le hash : le scope par défaut l'exclut.
  const utilisateur = await Utilisateur.scope('avecMotDePasse').findByPk(req.user.id)

  const correct = await utilisateur.verifierMotDePasse(ancienMotDePasse)
  if (!correct) throw new UnauthorizedError('Ancien mot de passe incorrect')

  if (ancienMotDePasse === nouveauMotDePasse) {
    throw new BadRequestError('Le nouveau mot de passe doit être différent de l\'ancien')
  }

  utilisateur.motDePasse = nouveauMotDePasse
  await utilisateur.save()

  // Changer de mot de passe doit invalider les autres sessions : c'est
  // le geste qu'on fait justement quand on soupçonne un vol de compte.
  await authService.deconnexion(null, { toutesLesSessions: true, utilisateurId: utilisateur.id })

  await auditService.tracer({
    utilisateur: req.user,
    action: 'changement_mot_de_passe',
    ressource: 'utilisateur',
    ressourceId: utilisateur.id,
    ip: req.ip,
  })

  return ok(res, null, 'Mot de passe modifié, veuillez vous reconnecter')
})

module.exports = { connexion, rafraichir, deconnexion, moi, majProfil, changerMotDePasse }
