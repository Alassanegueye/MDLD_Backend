'use strict'

const express = require('express')
const ctrl = require('../../controllers/public/boutique.controller')
const validate = require('../../middlewares/validate.middleware')
const { limiteCommande } = require('../../middlewares/rateLimit.middleware')
const { listerProduitsPublic } = require('../../validations/produit.validation')
const { creerCommande, suivreCommande } = require('../../validations/commande.validation')

/**
 * Routes ouvertes (site vitrine).
 *
 * La création de commande porte son propre quota : c'est le seul endpoint
 * public qui écrit en base, donc la cible naturelle d'un flood.
 */
const router = express.Router()

router.get('/produits', validate(listerProduitsPublic, 'query'), ctrl.listerProduits)
router.get('/produits/:slug', ctrl.produitParSlug)
router.get('/categories', ctrl.listerCategories)

router.post('/commandes', limiteCommande, validate(creerCommande), ctrl.creerCommande)
router.get('/commandes/suivi', validate(suivreCommande, 'query'), ctrl.suivreCommande)

module.exports = router
