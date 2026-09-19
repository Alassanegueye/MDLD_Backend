'use strict'

const asyncHandler = require('../../middlewares/asyncHandler')
const commandeService = require('../../services/commande.service')
const auditService = require('../../services/audit.service')
const { ok } = require('../../utils/response')

const lister = asyncHandler(async (req, res) => {
  const resultat = await commandeService.lister(req.query)
  return ok(res, resultat, 'Commandes récupérées')
})

const detail = asyncHandler(async (req, res) => {
  const commande = await commandeService.parId(req.params.id)
  return ok(res, commande, 'Commande récupérée')
})

const changerStatut = asyncHandler(async (req, res) => {
  const { statut, noteInterne } = req.body
  const avant = await commandeService.parId(req.params.id)
  const commande = await commandeService.changerStatut(req.params.id, statut, req.user, noteInterne)

  // Trace obligatoire : « qui a annulé cette commande ? » doit avoir une réponse.
  await auditService.tracer({
    utilisateur: req.user,
    action: 'changement_statut_commande',
    ressource: 'commande',
    ressourceId: commande.id,
    details: { reference: commande.reference, avant: avant.statut, apres: statut },
    ip: req.ip,
  })

  return ok(res, commande, `Commande passée en « ${statut} »`)
})

const statistiques = asyncHandler(async (req, res) => {
  const stats = await commandeService.statistiques()
  return ok(res, stats, 'Statistiques récupérées')
})

module.exports = { lister, detail, changerStatut, statistiques }
