'use strict'

const asyncHandler = require('../../middlewares/asyncHandler')
const renovationService = require('../../services/renovation.service')
const { ok } = require('../../utils/response')

/**
 * Page rénovation du site vitrine.
 *
 * Un seul point d'entrée pour les quatre ressources : la page les affiche
 * toutes ensemble, quatre requêtes depuis Dakar en 4G coûteraient quatre
 * allers-retours pour rien.
 */
const page = asyncHandler(async (req, res) => {
  const contenu = await renovationService.pagePublique()
  return ok(res, contenu, 'Page rénovation récupérée')
})

module.exports = { page }
