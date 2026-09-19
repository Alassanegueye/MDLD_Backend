'use strict'

const asyncHandler = require('../../middlewares/asyncHandler')
const produitService = require('../../services/produit.service')
const categorieService = require('../../services/categorie.service')
const commandeService = require('../../services/commande.service')
const { ok, created } = require('../../utils/response')

/**
 * Endpoints ouverts, consommés par le site vitrine.
 * Aucun d'eux ne demande d'authentification : on n'oblige pas un visiteur
 * à créer un compte pour acheter un carnet.
 */

const listerProduits = asyncHandler(async (req, res) => {
  const resultat = await produitService.listerPublic(req.query)
  return ok(res, resultat, 'Catalogue récupéré')
})

const produitParSlug = asyncHandler(async (req, res) => {
  const produit = await produitService.parSlug(req.params.slug)
  return ok(res, produit, 'Produit récupéré')
})

const listerCategories = asyncHandler(async (req, res) => {
  const categories = await categorieService.lister()
  return ok(res, categories, 'Catégories récupérées')
})

const creerCommande = asyncHandler(async (req, res) => {
  const commande = await commandeService.creer(req.body, { ip: req.ip })
  return created(res, commande, `Commande ${commande.reference} enregistrée`)
})

/** Suivi : référence + e-mail, pour qu'une référence devinée ne suffise pas. */
const suivreCommande = asyncHandler(async (req, res) => {
  const commande = await commandeService.suivrePublic(req.query)
  return ok(res, commande, 'Commande trouvée')
})

module.exports = {
  listerProduits,
  produitParSlug,
  listerCategories,
  creerCommande,
  suivreCommande,
}
