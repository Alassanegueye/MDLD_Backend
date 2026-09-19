'use strict'

const express = require('express')
const ctrl = require('../../controllers/admin/utilisateur.controller')
const validate = require('../../middlewares/validate.middleware')
const { auth, checkActiveUser, admin } = require('../../middlewares/auth.middleware')
const { limiteAdmin, limiteMutation, limiteUtilisateur } = require('../../middlewares/rateLimit.middleware')
const schemas = require('../../validations/utilisateur.validation')

/**
 * Comptes d'administration.
 *
 * Réservé au rôle `admin` et non à une permission fine : créer un compte
 * revient à distribuer des droits, c'est la prérogative d'un
 * administrateur, pas d'une permission qu'on pourrait s'auto-accorder.
 */
const router = express.Router()

router.use(auth, checkActiveUser, admin, limiteUtilisateur, limiteAdmin)

router.get('/permissions', ctrl.permissions)
router.get('/', validate(schemas.listerUtilisateurs, 'query'), ctrl.lister)
router.get('/:id', ctrl.detail)
router.post('/', limiteMutation, validate(schemas.creerUtilisateur), ctrl.creer)
router.patch('/:id', limiteMutation, validate(schemas.modifierUtilisateur), ctrl.modifier)
router.post(
  '/:id/mot-de-passe',
  limiteMutation,
  validate(schemas.reinitialiserMotDePasse),
  ctrl.reinitialiserMotDePasse
)
router.delete('/:id', limiteMutation, ctrl.supprimer)

module.exports = router
