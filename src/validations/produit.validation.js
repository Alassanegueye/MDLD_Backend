'use strict'

const Joi = require('joi')

const creerProduit = Joi.object({
  reference: Joi.string().trim().max(60).required().messages({
    'any.required': 'La référence est obligatoire',
  }),
  nom: Joi.string().trim().min(2).max(180).required().messages({
    'any.required': 'Le nom du produit est obligatoire',
  }),
  slug: Joi.string().trim().max(200).allow('', null),
  description: Joi.string().trim().max(4000).allow('', null),
  // Prix en francs CFA entiers : le FCFA n'a pas de subdivision.
  prix: Joi.number().integer().min(0).max(100000000).required().messages({
    'number.base': 'Le prix doit être un nombre entier',
    'any.required': 'Le prix est obligatoire',
  }),
  categorieId: Joi.string().uuid().allow(null),
  image: Joi.string().trim().max(500).allow('', null),
  stock: Joi.number().integer().min(0).allow(null),
  surCommande: Joi.boolean().default(false),
  badge: Joi.string().trim().max(60).allow('', null),
  enVedette: Joi.boolean().default(false),
  actif: Joi.boolean().default(true),
  ordre: Joi.number().integer().min(0).default(0),
})

// Tous les champs optionnels, mais au moins un requis : un PATCH vide
// n'est pas une erreur serveur, c'est une requête inutile à signaler.
const modifierProduit = creerProduit.fork(Object.keys(creerProduit.describe().keys), (s) =>
  s.optional()
).min(1)

const listerProduitsPublic = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
  categorie: Joi.string().trim().max(140),
  vedette: Joi.boolean(),
  recherche: Joi.string().trim().max(120).allow(''),
})

const listerProduitsAdmin = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  actif: Joi.boolean(),
  categorieId: Joi.string().uuid(),
  recherche: Joi.string().trim().max(120).allow(''),
})

const creerCategorie = Joi.object({
  nom: Joi.string().trim().min(2).max(120).required(),
  slug: Joi.string().trim().max(140).allow('', null),
  description: Joi.string().trim().max(2000).allow('', null),
  ordre: Joi.number().integer().min(0).default(0),
  active: Joi.boolean().default(true),
})

const modifierCategorie = creerCategorie.fork(
  Object.keys(creerCategorie.describe().keys),
  (s) => s.optional()
).min(1)

module.exports = {
  creerProduit,
  modifierProduit,
  listerProduitsPublic,
  listerProduitsAdmin,
  creerCategorie,
  modifierCategorie,
}
