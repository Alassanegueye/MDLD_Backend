'use strict'

const Joi = require('joi')

/**
 * Validation des commandes.
 *
 * Les messages sont en français : ils sont affichés tels quels sous les
 * champs du formulaire de la boutique, sans table de traduction côté client.
 */

// Formats sénégalais tolérés : +221 77 123 45 67, 00221771234567, 77 123 45 67…
const TELEPHONE = /^[+0-9\s().-]{7,25}$/

const article = Joi.object({
  produitId: Joi.string().uuid().required().messages({
    'string.guid': 'Identifiant de produit invalide',
    'any.required': 'Identifiant de produit manquant',
  }),
  quantite: Joi.number().integer().min(1).max(99).required().messages({
    'number.min': 'La quantité doit être d\'au moins 1',
    'number.max': 'Quantité maximale : 99 par article',
    'any.required': 'Quantité manquante',
  }),
})

const creerCommande = Joi.object({
  prenom: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Le prénom est obligatoire',
    'string.min': 'Le prénom doit contenir au moins 2 caractères',
    'any.required': 'Le prénom est obligatoire',
  }),
  nom: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Le nom est obligatoire',
    'string.min': 'Le nom doit contenir au moins 2 caractères',
    'any.required': 'Le nom est obligatoire',
  }),
  email: Joi.string().trim().email({ tlds: { allow: false } }).max(180).required().messages({
    'string.email': 'Adresse e-mail invalide',
    'string.empty': 'L\'adresse e-mail est obligatoire',
    'any.required': 'L\'adresse e-mail est obligatoire',
  }),
  telephone: Joi.string().trim().pattern(TELEPHONE).required().messages({
    'string.pattern.base': 'Numéro de téléphone invalide',
    'string.empty': 'Le numéro de téléphone est obligatoire',
    'any.required': 'Le numéro de téléphone est obligatoire',
  }),

  modeLivraison: Joi.string().valid('retrait', 'livraison').default('retrait'),

  // L'adresse devient obligatoire dès qu'on demande une livraison :
  // une commande à livrer sans adresse est ingérable pour l'équipe.
  adresse: Joi.when('modeLivraison', {
    is: 'livraison',
    then: Joi.string().trim().min(5).max(255).required().messages({
      'any.required': 'L\'adresse est obligatoire pour une livraison',
      'string.min': 'Adresse trop courte',
    }),
    otherwise: Joi.string().trim().max(255).allow('', null),
  }),
  ville: Joi.when('modeLivraison', {
    is: 'livraison',
    then: Joi.string().trim().min(2).max(120).required().messages({
      'any.required': 'La ville est obligatoire pour une livraison',
    }),
    otherwise: Joi.string().trim().max(120).allow('', null),
  }),
  quartier: Joi.string().trim().max(120).allow('', null),
  note: Joi.string().trim().max(1000).allow('', null),

  articles: Joi.array().items(article).min(1).max(50).required().messages({
    'array.min': 'Votre panier est vide',
    'array.max': 'Trop d\'articles dans une même commande',
    'any.required': 'Votre panier est vide',
  }),
})

const suivreCommande = Joi.object({
  reference: Joi.string().trim().max(20).required().messages({
    'any.required': 'La référence de commande est obligatoire',
  }),
  email: Joi.string().trim().email({ tlds: { allow: false } }).required().messages({
    'string.email': 'Adresse e-mail invalide',
    'any.required': 'L\'adresse e-mail est obligatoire',
  }),
})

// stripUnknown supprime tout paramètre non déclaré : les filtres de liste
// doivent donc figurer ici, sinon ils disparaissent silencieusement.
const listerCommandes = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  statut: Joi.string().valid('en_attente', 'confirmee', 'prete', 'livree', 'annulee'),
  recherche: Joi.string().trim().max(120).allow(''),
})

const changerStatut = Joi.object({
  statut: Joi.string()
    .valid('en_attente', 'confirmee', 'prete', 'livree', 'annulee')
    .required()
    .messages({ 'any.only': 'Statut inconnu', 'any.required': 'Le statut est obligatoire' }),
  noteInterne: Joi.string().trim().max(1000).allow('', null),
})

module.exports = { creerCommande, suivreCommande, listerCommandes, changerStatut }
