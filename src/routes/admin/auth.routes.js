'use strict'

const express = require('express')
const ctrl = require('../../controllers/admin/auth.controller')
const validate = require('../../middlewares/validate.middleware')
const { auth, checkActiveUser } = require('../../middlewares/auth.middleware')
const { limiteAuth, limiteMutation } = require('../../middlewares/rateLimit.middleware')
const schemas = require('../../validations/auth.validation')
const { majProfil } = require('../../validations/utilisateur.validation')

const router = express.Router()

// Quota strict : 5 essais / 15 min, cléffé sur l'IP ET l'e-mail visé.
router.post('/connexion', limiteAuth, validate(schemas.connexion), ctrl.connexion)
router.post('/rafraichir', validate(schemas.rafraichir), ctrl.rafraichir)
router.post('/deconnexion', validate(schemas.deconnexion), ctrl.deconnexion)

// À partir d'ici, jeton obligatoire et compte actif.
router.get('/moi', auth, checkActiveUser, ctrl.moi)
router.patch('/moi', auth, checkActiveUser, limiteMutation, validate(majProfil), ctrl.majProfil)
router.post(
  '/mot-de-passe',
  auth,
  checkActiveUser,
  limiteMutation,
  validate(schemas.changerMotDePasse),
  ctrl.changerMotDePasse
)

module.exports = router
