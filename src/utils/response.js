'use strict'

/**
 * Format de réponse unique pour toute l'API.
 *
 * Le dashboard et le site vitrine s'appuient sur ce contrat :
 *   succès -> { success: true,  message, data }
 *   échec  -> { success: false, message, details? }
 * Un contrôleur qui renvoie autre chose casse les clients, d'où ces
 * quatre helpers plutôt que des res.json() dispersés.
 */

function ok(res, data = null, message = 'Opération réussie') {
  return res.status(200).json({ success: true, message, data })
}

function created(res, data = null, message = 'Ressource créée') {
  return res.status(201).json({ success: true, message, data })
}

function fail(res, statusCode = 400, message = 'Requête invalide', details) {
  const corps = { success: false, message }
  if (details) corps.details = details
  return res.status(statusCode).json(corps)
}

function serverError(res, message = 'Erreur interne du serveur') {
  return res.status(500).json({ success: false, message })
}

module.exports = { ok, created, fail, serverError }
