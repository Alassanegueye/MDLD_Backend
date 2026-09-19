'use strict'

const asyncHandler = require('../../middlewares/asyncHandler')
const produitService = require('../../services/produit.service')
const categorieService = require('../../services/categorie.service')
const auditService = require('../../services/audit.service')
const { ok, created } = require('../../utils/response')

// ---- Produits ----

const lister = asyncHandler(async (req, res) => {
  const resultat = await produitService.listerAdmin(req.query)
  return ok(res, resultat, 'Produits récupérés')
})

const detail = asyncHandler(async (req, res) => {
  const produit = await produitService.parId(req.params.id)
  return ok(res, produit, 'Produit récupéré')
})

const creer = asyncHandler(async (req, res) => {
  const produit = await produitService.creer(req.body)
  await auditService.tracer({
    utilisateur: req.user,
    action: 'creation_produit',
    ressource: 'produit',
    ressourceId: produit.id,
    details: { nom: produit.nom, prix: produit.prix },
    ip: req.ip,
  })
  return created(res, produit, 'Produit créé')
})

const modifier = asyncHandler(async (req, res) => {
  const produit = await produitService.modifier(req.params.id, req.body)
  await auditService.tracer({
    utilisateur: req.user,
    action: 'modification_produit',
    ressource: 'produit',
    ressourceId: produit.id,
    details: { champs: Object.keys(req.body) },
    ip: req.ip,
  })
  return ok(res, produit, 'Produit modifié')
})

const supprimer = asyncHandler(async (req, res) => {
  await produitService.supprimer(req.params.id)
  await auditService.tracer({
    utilisateur: req.user,
    action: 'suppression_produit',
    ressource: 'produit',
    ressourceId: req.params.id,
    ip: req.ip,
  })
  return ok(res, null, 'Produit supprimé')
})

// ---- Catégories ----

const listerCategories = asyncHandler(async (req, res) => {
  const categories = await categorieService.lister({ toutes: true })
  return ok(res, categories, 'Catégories récupérées')
})

const creerCategorie = asyncHandler(async (req, res) => {
  const categorie = await categorieService.creer(req.body)
  await auditService.tracer({
    utilisateur: req.user,
    action: 'creation_categorie',
    ressource: 'categorie',
    ressourceId: categorie.id,
    ip: req.ip,
  })
  return created(res, categorie, 'Catégorie créée')
})

const modifierCategorie = asyncHandler(async (req, res) => {
  const categorie = await categorieService.modifier(req.params.id, req.body)
  return ok(res, categorie, 'Catégorie modifiée')
})

const supprimerCategorie = asyncHandler(async (req, res) => {
  await categorieService.supprimer(req.params.id)
  await auditService.tracer({
    utilisateur: req.user,
    action: 'suppression_categorie',
    ressource: 'categorie',
    ressourceId: req.params.id,
    ip: req.ip,
  })
  return ok(res, null, 'Catégorie supprimée')
})

module.exports = {
  lister,
  detail,
  creer,
  modifier,
  supprimer,
  listerCategories,
  creerCategorie,
  modifierCategorie,
  supprimerCategorie,
}
