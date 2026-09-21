'use strict'

const asyncHandler = require('../../middlewares/asyncHandler')
const donService = require('../../services/don.service')
const auditService = require('../../services/audit.service')
const { ok, created } = require('../../utils/response')

/** Trace une action d'administration sans alourdir chaque handler. */
function tracer(req, action, ressourceId, details) {
  return auditService.tracer({
    utilisateur: req.user,
    action,
    ressource: 'don',
    ressourceId,
    details,
    ip: req.ip,
  })
}

const lister = asyncHandler(async (req, res) => {
  const dons = await donService.lister(req.query)
  return ok(res, dons, 'Dons récupérés')
})

/** Vue par campagne : objectif, collecté, reste et donateurs de chacune. */
const parCampagne = asyncHandler(async (req, res) => {
  const campagnes = await donService.parCampagne()
  return ok(res, campagnes, 'Dons par campagne récupérés')
})

const creer = asyncHandler(async (req, res) => {
  const don = await donService.creer(req.body)
  // Le montant est tracé : c'est le champ qui engage la comptabilité.
  await tracer(req, 'creation_don', don.id, { montant: don.montant, chantierId: don.chantierId })
  return created(res, don, 'Don enregistré')
})

const modifier = asyncHandler(async (req, res) => {
  const don = await donService.modifier(req.params.id, req.body)
  await tracer(req, 'modification_don', don.id, { champs: Object.keys(req.body) })
  return ok(res, don, 'Don modifié')
})

const supprimer = asyncHandler(async (req, res) => {
  const don = await donService.supprimer(req.params.id)
  await tracer(req, 'suppression_don', don.id, { montant: don.montant })
  return ok(res, null, 'Don supprimé')
})

module.exports = { lister, parCampagne, creer, modifier, supprimer }
