'use strict'

const express = require('express')
const ctrl = require('../../controllers/admin/renovation.controller')
const validate = require('../../middlewares/validate.middleware')
const { auth, checkActiveUser, requirePermission } = require('../../middlewares/auth.middleware')
const { limiteAdmin, limiteMutation, limiteUtilisateur } = require('../../middlewares/rateLimit.middleware')
const { upload, verifierImage } = require('../../middlewares/upload.middleware')
const schemas = require('../../validations/renovation.validation')
const donCtrl = require('../../controllers/admin/don.controller')
const donSchemas = require('../../validations/don.validation')

/**
 * Gestion de la page rénovation depuis le dashboard.
 * Chaîne commune : auth -> compte actif -> quotas, puis permission fine.
 */
const router = express.Router()

router.use(auth, checkActiveUser, limiteUtilisateur, limiteAdmin)

// ---- Campagne (objectif et collecte) ----
router.get('/campagne', requirePermission('renovation.lire'), ctrl.lireCampagne)
router.patch(
  '/campagne',
  requirePermission('renovation.ecrire'),
  limiteMutation,
  validate(schemas.modifierCampagne),
  ctrl.modifierCampagne
)

// ---- Chantiers ----
router.get('/chantiers', requirePermission('renovation.lire'), ctrl.listerChantiers)
router.post('/chantiers', requirePermission('renovation.ecrire'), limiteMutation, validate(schemas.creerChantier), ctrl.creerChantier)
router.patch('/chantiers/:id', requirePermission('renovation.ecrire'), limiteMutation, validate(schemas.modifierChantier), ctrl.modifierChantier)
router.delete('/chantiers/:id', requirePermission('renovation.ecrire'), limiteMutation, ctrl.supprimerChantier)

// ---- Responsables ----
router.get('/responsables', requirePermission('renovation.lire'), ctrl.listerResponsables)
router.post('/responsables', requirePermission('renovation.ecrire'), limiteMutation, validate(schemas.creerResponsable), ctrl.creerResponsable)
router.patch('/responsables/:id', requirePermission('renovation.ecrire'), limiteMutation, validate(schemas.modifierResponsable), ctrl.modifierResponsable)
router.delete('/responsables/:id', requirePermission('renovation.ecrire'), limiteMutation, ctrl.supprimerResponsable)

// ---- Moyens de paiement ----
router.get('/moyens-paiement', requirePermission('renovation.lire'), ctrl.listerMoyens)
router.post('/moyens-paiement', requirePermission('renovation.ecrire'), limiteMutation, validate(schemas.creerMoyen), ctrl.creerMoyen)
router.patch('/moyens-paiement/:id', requirePermission('renovation.ecrire'), limiteMutation, validate(schemas.modifierMoyen), ctrl.modifierMoyen)
router.delete('/moyens-paiement/:id', requirePermission('renovation.ecrire'), limiteMutation, ctrl.supprimerMoyen)

// ---- Dons ----
// /dons/campagnes est declare AVANT /dons/:id, sinon « campagnes »
// serait pris pour un identifiant.
router.get('/dons/campagnes', requirePermission('renovation.lire'), donCtrl.parCampagne)
router.get('/dons', requirePermission('renovation.lire'), validate(donSchemas.listerDons, 'query'), donCtrl.lister)
router.post('/dons', requirePermission('renovation.ecrire'), limiteMutation, validate(donSchemas.creerDon), donCtrl.creer)
router.patch('/dons/:id', requirePermission('renovation.ecrire'), limiteMutation, validate(donSchemas.modifierDon), donCtrl.modifier)
router.delete('/dons/:id', requirePermission('renovation.ecrire'), limiteMutation, donCtrl.supprimer)

// ---- Visuels ----
// `upload` remplit req.file en mémoire, `verifierImage` contrôle les
// magic bytes : le Content-Type déclaré par le client ne fait pas foi.
router.post(
  '/medias',
  requirePermission('renovation.ecrire'),
  limiteMutation,
  upload.single('fichier'),
  verifierImage,
  ctrl.televerser
)

module.exports = router
