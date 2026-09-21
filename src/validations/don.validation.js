'use strict'

const Joi = require('joi')

/**
 * Validation des dons.
 *
 * Messages en français : ils s'affichent tels quels sous les champs du
 * dashboard, sans table de traduction côté client.
 */
const TELEPHONE = /^[+0-9\s().-]{7,25}$/

const base = {
  prenom: Joi.string().trim().max(100).allow('', null),
  nom: Joi.string().trim().max(100).allow('', null),
  anonyme: Joi.boolean(),
  email: Joi.string().trim().email({ tlds: { allow: false } }).max(180).allow('', null).messages({
    'string.email': 'Adresse e-mail invalide',
  }),
  telephone: Joi.string().trim().pattern(TELEPHONE).allow('', null).messages({
    'string.pattern.base': 'Numéro de téléphone invalide',
  }),
  montant: Joi.number().integer().min(1).max(1000000000000).messages({
    'number.base': 'Le montant doit être un nombre',
    'number.integer': 'Le montant doit être un entier de FCFA (pas de centimes)',
    'number.min': 'Le montant doit être supérieur à zéro',
  }),
  devise: Joi.string().trim().max(8),
  // null accepté : don au fonds global, non fléché vers un projet.
  chantierId: Joi.string().uuid().allow(null).messages({
    'string.guid': 'Projet ciblé invalide',
  }),
  moyen: Joi.string().trim().max(60).allow('', null),
  reference: Joi.string().trim().max(60).allow('', null),
  message: Joi.string().trim().max(1000).allow('', null),
  statut: Joi.string().valid('promesse', 'recu', 'annule').messages({
    'any.only': 'Statut attendu : promesse, recu ou annule',
  }),
  recuLe: Joi.date().allow(null),
}

const creerDon = Joi.object({
  ...base,
  montant: base.montant.required().messages({ 'any.required': 'Le montant est obligatoire' }),
})
  // Un don nominatif sans nom ne sert à rien : soit on sait qui a donné,
  // soit l'anonymat est déclaré explicitement.
  .or('nom', 'prenom', 'anonyme')
  .messages({ 'object.missing': 'Indiquez un nom, ou cochez « anonyme »' })

const modifierDon = Joi.object(base).min(1).messages({
  'object.min': 'Aucune modification fournie',
})

// stripUnknown supprime tout paramètre non déclaré : un filtre absent
// d'ici disparaîtrait silencieusement entre l'URL et le service.
const listerDons = Joi.object({
  statut: Joi.string().valid('promesse', 'recu', 'annule'),
  chantierId: Joi.alternatives().try(Joi.string().uuid(), Joi.string().valid('global')),
  anonyme: Joi.boolean(),
})

module.exports = { creerDon, modifierDon, listerDons }
