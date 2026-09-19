'use strict'

/**
 * Enveloppe un contrôleur asynchrone pour que toute promesse rejetée
 * parte dans next(), donc dans le gestionnaire d'erreurs central.
 *
 * Sans cela, un `await` qui échoue dans un handler Express laisse la
 * requête pendante jusqu'au timeout du client, sans la moindre trace.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

module.exports = asyncHandler
