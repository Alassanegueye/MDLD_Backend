'use strict'

const asyncHandler = require('../../middlewares/asyncHandler')
const renovationService = require('../../services/renovation.service')
const mediaService = require('../../services/media.service')
const auditService = require('../../services/audit.service')
const { ok, created } = require('../../utils/response')

/** Trace une action d'administration sans alourdir chaque handler. */
function tracer(req, action, ressource, ressourceId, details) {
  return auditService.tracer({
    utilisateur: req.user,
    action,
    ressource,
    ressourceId,
    details,
    ip: req.ip,
  })
}

// ---- Campagne ----

const lireCampagne = asyncHandler(async (req, res) => {
  const campagne = await renovationService.campagne()
  return ok(res, campagne, 'Campagne récupérée')
})

const modifierCampagne = asyncHandler(async (req, res) => {
  const campagne = await renovationService.modifierCampagne(req.body)
  await tracer(req, 'modification_campagne', 'campagne', campagne.id, {
    champs: Object.keys(req.body),
  })
  return ok(res, campagne, 'Campagne mise à jour')
})

// ---- Chantiers ----

const listerChantiers = asyncHandler(async (req, res) => {
  const chantiers = await renovationService.listerChantiers({ tousStatuts: true })
  return ok(res, chantiers, 'Chantiers récupérés')
})

const creerChantier = asyncHandler(async (req, res) => {
  const chantier = await renovationService.creerChantier(req.body)
  await tracer(req, 'creation_chantier', 'chantier', chantier.id, { titre: chantier.titre })
  return created(res, chantier, 'Chantier créé')
})

const modifierChantier = asyncHandler(async (req, res) => {
  const chantier = await renovationService.modifierChantier(req.params.id, req.body)
  await tracer(req, 'modification_chantier', 'chantier', chantier.id, {
    champs: Object.keys(req.body),
  })
  return ok(res, chantier, 'Chantier modifié')
})

const supprimerChantier = asyncHandler(async (req, res) => {
  const chantier = await renovationService.supprimerChantier(req.params.id)
  await tracer(req, 'suppression_chantier', 'chantier', chantier.id, { titre: chantier.titre })
  return ok(res, null, 'Chantier supprimé')
})

// ---- Responsables ----

const listerResponsables = asyncHandler(async (req, res) => {
  const responsables = await renovationService.listerResponsables({ tousStatuts: true })
  return ok(res, responsables, 'Responsables récupérés')
})

const creerResponsable = asyncHandler(async (req, res) => {
  const responsable = await renovationService.creerResponsable(req.body)
  await tracer(req, 'creation_responsable', 'responsable', responsable.id, { nom: responsable.nom })
  return created(res, responsable, 'Responsable créé')
})

const modifierResponsable = asyncHandler(async (req, res) => {
  const responsable = await renovationService.modifierResponsable(req.params.id, req.body)
  await tracer(req, 'modification_responsable', 'responsable', responsable.id, {
    champs: Object.keys(req.body),
  })
  return ok(res, responsable, 'Responsable modifié')
})

const supprimerResponsable = asyncHandler(async (req, res) => {
  const responsable = await renovationService.supprimerResponsable(req.params.id)
  await tracer(req, 'suppression_responsable', 'responsable', responsable.id, { nom: responsable.nom })
  return ok(res, null, 'Responsable supprimé')
})

// ---- Moyens de paiement ----

const listerMoyens = asyncHandler(async (req, res) => {
  const moyens = await renovationService.listerMoyens({ tousStatuts: true })
  return ok(res, moyens, 'Moyens de paiement récupérés')
})

const creerMoyen = asyncHandler(async (req, res) => {
  const moyen = await renovationService.creerMoyen(req.body)
  await tracer(req, 'creation_moyen_paiement', 'moyen_paiement', moyen.id, { nom: moyen.nom })
  return created(res, moyen, 'Moyen de paiement créé')
})

const modifierMoyen = asyncHandler(async (req, res) => {
  const moyen = await renovationService.modifierMoyen(req.params.id, req.body)
  await tracer(req, 'modification_moyen_paiement', 'moyen_paiement', moyen.id, {
    champs: Object.keys(req.body),
  })
  return ok(res, moyen, 'Moyen de paiement modifié')
})

const supprimerMoyen = asyncHandler(async (req, res) => {
  const moyen = await renovationService.supprimerMoyen(req.params.id)
  await tracer(req, 'suppression_moyen_paiement', 'moyen_paiement', moyen.id, { nom: moyen.nom })
  return ok(res, null, 'Moyen de paiement supprimé')
})

// ---- Visuels ----

const televerser = asyncHandler(async (req, res) => {
  const media = await mediaService.enregistrer(req.file)
  await tracer(req, 'televersement_visuel', 'media', null, { nom: media.nom, taille: media.taille })
  return created(res, media, 'Visuel téléversé')
})

module.exports = {
  lireCampagne,
  modifierCampagne,
  listerChantiers,
  creerChantier,
  modifierChantier,
  supprimerChantier,
  listerResponsables,
  creerResponsable,
  modifierResponsable,
  supprimerResponsable,
  listerMoyens,
  creerMoyen,
  modifierMoyen,
  supprimerMoyen,
  televerser,
}
