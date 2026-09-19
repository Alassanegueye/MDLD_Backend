'use strict'

const jwt = require('jsonwebtoken')
const { Utilisateur } = require('../models')
const { jwt: confJwt } = require('../config/security')
const { UnauthorizedError, ForbiddenError } = require('../errors/AppError')
const asyncHandler = require('./asyncHandler')

/**
 * Chaîne d'autorisation du dashboard :
 *   auth -> checkActiveUser -> admin -> requirePermission('x')
 *
 * Chaque maillon est volontairement séparé : mélanger « es-tu connecté »
 * et « as-tu le droit » dans un seul middleware finit toujours par ouvrir
 * une route par accident lors d'un copier-coller.
 */

/** 1. Le jeton est-il valide ? Charge l'utilisateur dans req.user. */
const auth = asyncHandler(async (req, res, next) => {
  const entete = req.headers.authorization || ''
  if (!entete.startsWith('Bearer ')) {
    throw new UnauthorizedError('Jeton d\'authentification absent')
  }

  const token = entete.slice(7).trim()
  // jwt.verify jette TokenExpiredError / JsonWebTokenError : le
  // gestionnaire central les traduit déjà en 401 explicites.
  const charge = jwt.verify(token, confJwt.accessSecret, { issuer: confJwt.issuer })

  const utilisateur = await Utilisateur.findByPk(charge.sub)
  if (!utilisateur) {
    // Le compte a été supprimé alors que le jeton court toujours.
    throw new UnauthorizedError('Compte introuvable')
  }

  req.user = utilisateur
  req.tokenPayload = charge
  return next()
})

/** 2. Le compte est-il toujours actif ? (désactivation immédiate sans attendre l'expiration) */
function checkActiveUser(req, res, next) {
  if (!req.user) return next(new UnauthorizedError('Authentification requise'))
  if (!req.user.actif) {
    return next(new ForbiddenError('Compte désactivé, contactez un administrateur'))
  }
  return next()
}

/** 3. Réservé au rôle administrateur. */
function admin(req, res, next) {
  if (!req.user) return next(new UnauthorizedError('Authentification requise'))
  if (req.user.role !== 'admin') {
    return next(new ForbiddenError('Action réservée aux administrateurs'))
  }
  return next()
}

/**
 * 4. Droit fin. Modèle STRICT : aucune permission = aucun accès.
 * Un compte sans permissions ne peut rien faire, même authentifié.
 */
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) return next(new UnauthorizedError('Authentification requise'))
    if (!req.user.aPermission(permission)) {
      return next(new ForbiddenError(`Permission « ${permission} » requise`))
    }
    return next()
  }
}

module.exports = { auth, checkActiveUser, admin, requirePermission }
