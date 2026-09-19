'use strict'

const { rateLimit, ipKeyGenerator } = require('express-rate-limit')
const { limites, enTest } = require('../config/security')
const { fail } = require('../utils/response')

/**
 * Quotas à plusieurs niveaux.
 *
 * Le piège classique est de tout limiter par IP : derrière un partage de
 * connexion (cybercafé, 4G mobile, bureau de la mosquée), dix personnes
 * sortent de la même IP et se bloquent mutuellement. On limite donc par
 * utilisateur authentifié dès qu'on en a un, et par IP seulement sinon.
 *
 * Les quotas sont désactivés en test : sinon la suite se bloque elle-même
 * au bout de cinq requêtes d'authentification.
 */

function construire({ fenetreMs, max, message, cle }) {
  return rateLimit({
    windowMs: fenetreMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => enTest,
    keyGenerator: cle,
    handler: (req, res) => fail(res, 429, message),
  })
}

// ipKeyGenerator normalise les adresses IPv6 (/64) : sans lui, un client
// IPv6 change d'adresse dans le même préfixe et contourne le quota.
const parIp = (req) => ipKeyGenerator(req.ip)

/** Filet global : protège l'infrastructure, pas les comptes. */
const limiteGlobale = construire({
  ...limites.global,
  cle: parIp,
  message: 'Trop de requêtes, réessayez dans quelques minutes',
})

/** Quota par compte : la clé est l'utilisateur, pas l'IP partagée. */
const limiteUtilisateur = construire({
  ...limites.parUtilisateur,
  cle: (req) => (req.user ? `u:${req.user.id}` : `ip:${ipKeyGenerator(req.ip)}`),
  message: 'Trop de requêtes sur ce compte, patientez quelques minutes',
})

/** Connexion : 5 essais / 15 min, cléffé sur l'e-mail visé ET l'IP.
 *  Sans l'e-mail, un attaquant changeant d'IP passerait sous le radar ;
 *  sans l'IP, il suffirait de changer d'e-mail à chaque essai. */
const limiteAuth = construire({
  ...limites.auth,
  cle: (req) => {
    const email = (req.body && req.body.email ? String(req.body.email) : '').toLowerCase()
    return `${ipKeyGenerator(req.ip)}:${email}`
  },
  message: 'Trop de tentatives de connexion, réessayez dans 15 minutes',
})

/** Écritures sensibles côté administration. */
const limiteMutation = construire({
  ...limites.mutation,
  cle: (req) => (req.user ? `u:${req.user.id}` : `ip:${ipKeyGenerator(req.ip)}`),
  message: 'Trop de modifications successives, patientez un instant',
})

const limiteAdmin = construire({
  ...limites.admin,
  cle: (req) => (req.user ? `u:${req.user.id}` : `ip:${ipKeyGenerator(req.ip)}`),
  message: 'Trop de requêtes d\'administration',
})

/** Création de commande : borne l'inondation de fausses commandes depuis une IP. */
const limiteCommande = construire({
  ...limites.commande,
  cle: parIp,
  message: 'Trop de commandes envoyées depuis cette connexion, réessayez plus tard',
})

module.exports = {
  limiteGlobale,
  limiteUtilisateur,
  limiteAuth,
  limiteMutation,
  limiteAdmin,
  limiteCommande,
}
