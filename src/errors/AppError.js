'use strict'

/**
 * Erreurs métier de l'API.
 *
 * `isOperational` distingue une erreur attendue (mauvais mot de passe,
 * ressource absente…) d'un bug non prévu. Le gestionnaire d'erreurs
 * n'expose au client que le message des erreurs opérationnelles : tout
 * le reste devient un 500 générique, pour ne pas fuiter la structure
 * interne de l'application.
 */
class AppError extends Error {
  constructor(message, statusCode = 500, details = undefined) {
    super(message)
    this.name = this.constructor.name
    this.statusCode = statusCode
    this.isOperational = true
    if (details) this.details = details
    Error.captureStackTrace(this, this.constructor)
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Requête invalide', details) {
    super(message, 400, details)
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Authentification requise') {
    super(message, 401)
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Accès refusé') {
    super(message, 403)
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Ressource introuvable') {
    super(message, 404)
  }
}

class ConflictError extends AppError {
  constructor(message = 'Conflit avec l\'état actuel de la ressource') {
    super(message, 409)
  }
}

class ValidationError extends AppError {
  constructor(message = 'Données invalides', details = []) {
    super(message, 422, details)
  }
}

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
}
