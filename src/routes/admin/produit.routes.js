'use strict'

const express = require('express')
const ctrl = require('../../controllers/admin/produit.controller')
const validate = require('../../middlewares/validate.middleware')
const { auth, checkActiveUser, requirePermission } = require('../../middlewares/auth.middleware')
const { limiteAdmin, limiteMutation, limiteUtilisateur } = require('../../middlewares/rateLimit.middleware')
const schemas = require('../../validations/produit.validation')

/**
 * Catalogue côté administration.
 * Chaîne appliquée à toutes les routes : auth -> compte actif -> quota,
 * puis une permission fine par action.
 */
const router = express.Router()

router.use(auth, checkActiveUser, limiteUtilisateur, limiteAdmin)

router.get('/', requirePermission('produits.lire'), validate(schemas.listerProduitsAdmin, 'query'), ctrl.lister)

// Les catégories sont déclarées AVANT /:id, sinon « categories » serait
// interprété comme un identifiant de produit.
router.get('/categories', requirePermission('produits.lire'), ctrl.listerCategories)
router.post('/categories', requirePermission('produits.ecrire'), limiteMutation, validate(schemas.creerCategorie), ctrl.creerCategorie)
router.patch('/categories/:id', requirePermission('produits.ecrire'), limiteMutation, validate(schemas.modifierCategorie), ctrl.modifierCategorie)
router.delete('/categories/:id', requirePermission('produits.supprimer'), limiteMutation, ctrl.supprimerCategorie)

router.get('/:id', requirePermission('produits.lire'), ctrl.detail)
router.post('/', requirePermission('produits.ecrire'), limiteMutation, validate(schemas.creerProduit), ctrl.creer)
router.patch('/:id', requirePermission('produits.ecrire'), limiteMutation, validate(schemas.modifierProduit), ctrl.modifier)
router.delete('/:id', requirePermission('produits.supprimer'), limiteMutation, ctrl.supprimer)

module.exports = router
