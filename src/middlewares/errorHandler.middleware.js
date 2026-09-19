'use strict'

const logger = require('../utils/logger')
const { fail, serverError } = require('../utils/response')
const { AppError } = require('../errors/AppError')
const { enProduction } = require('../config/security')

/**
 * Gestionnaire d'erreurs central — À MONTER EN DERNIER dans app.js.
 *
 * Règle : en production, seul le message des erreurs opérationnelles
 * sort. Tout le reste devient « Erreur interne du serveur ». Un message
 * Sequelize brut révèle les noms de tables et de colonnes, c'est-à-dire
 * la moitié du travail d'un attaquant.
 */
// eslint-disable-next-line no-unused-vars -- Express identifie le handler d'erreur à ses 4 arguments
function errorHandler(err, req, res, next) {
  const contexte = {
    methode: req.method,
    url: req.originalUrl,
    ip: req.ip,
    utilisateur: req.user ? req.user.id : null,
  }

  // ---- Erreurs métier explicites ----
  if (err instanceof AppError) {
    if (err.statusCode >= 500) logger.error(err.message, { ...contexte, stack: err.stack })
    else logger.warn(err.message, contexte)
    return fail(res, err.statusCode, err.message, err.details)
  }

  // ---- JSON malformé (body-parser) ----
  if (err.type === 'entity.parse.failed' || (err instanceof SyntaxError && 'body' in err)) {
    return fail(res, 400, 'Corps de requête JSON malformé')
  }
  // ---- Charge utile trop volumineuse ----
  if (err.type === 'entity.too.large' || err.status === 413) {
    return fail(res, 413, 'Charge utile trop volumineuse')
  }

  // ---- JWT ----
  if (err.name === 'TokenExpiredError') {
    return fail(res, 401, 'Session expirée, veuillez vous reconnecter')
  }
  if (err.name === 'JsonWebTokenError' || err.name === 'NotBeforeError') {
    return fail(res, 401, 'Jeton d\'authentification invalide')
  }

  // ---- Multer ----
  if (err.name === 'MulterError') {
    const messages = {
      LIMIT_FILE_SIZE: 'Fichier trop volumineux',
      LIMIT_FILE_COUNT: 'Trop de fichiers envoyés',
      LIMIT_UNEXPECTED_FILE: 'Champ de fichier inattendu',
    }
    return fail(res, 400, messages[err.code] || 'Téléversement refusé')
  }

  // ---- Sequelize ----
  if (err.name === 'SequelizeValidationError') {
    const details = (err.errors || []).map((e) => ({ champ: e.path, message: e.message }))
    return fail(res, 422, 'Données invalides', details)
  }
  if (err.name === 'SequelizeUniqueConstraintError') {
    const details = (err.errors || []).map((e) => ({ champ: e.path, message: 'Valeur déjà utilisée' }))
    return fail(res, 409, 'Cette valeur existe déjà', details)
  }
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return fail(res, 400, 'Référence invalide vers une ressource inexistante')
  }
  if (err.name === 'SequelizeConnectionError' || err.name === 'SequelizeConnectionRefusedError') {
    logger.error('Base de données injoignable', { ...contexte, message: err.message })
    return fail(res, 503, 'Service temporairement indisponible')
  }

  // ---- Tout le reste : bug non prévu ----
  logger.error(err.message || 'Erreur inconnue', { ...contexte, stack: err.stack })
  if (enProduction) return serverError(res)
  // Hors production seulement, on rend le message brut : c'est ce qui fait
  // gagner du temps en développement.
  return fail(res, err.statusCode || 500, err.message || 'Erreur interne du serveur', {
    stack: err.stack,
  })
}

module.exports = errorHandler
