'use strict'

const express = require('express')
const ctrl = require('../../controllers/admin/commande.controller')
const validate = require('../../middlewares/validate.middleware')
const { auth, checkActiveUser, requirePermission } = require('../../middlewares/auth.middleware')
const { limiteAdmin, limiteMutation, limiteUtilisateur } = require('../../middlewares/rateLimit.middleware')
const schemas = require('../../validations/commande.validation')

const router = express.Router()

router.use(auth, checkActiveUser, limiteUtilisateur, limiteAdmin)

router.get('/statistiques', requirePermission('commandes.lire'), ctrl.statistiques)
router.get('/', requirePermission('commandes.lire'), validate(schemas.listerCommandes, 'query'), ctrl.lister)
router.get('/:id', requirePermission('commandes.lire'), ctrl.detail)
router.patch(
  '/:id/statut',
  requirePermission('commandes.traiter'),
  limiteMutation,
  validate(schemas.changerStatut),
  ctrl.changerStatut
)

module.exports = router
