'use strict'

const Joi = require('joi')

/**
 * Validation du contenu de la page rénovation.
 *
 * Messages en français : ils remontent tels quels sous les champs du
 * dashboard, sans table de traduction côté client.
 *
 * Rappel du piège maison : `stripUnknown` supprime tout champ non déclaré
 * ici. Une nouvelle colonne ajoutée au modèle sans être ajoutée à ce
 * schéma disparaîtrait silencieusement entre le formulaire et la base.
 */

// Chemin servi par l'API (/medias/xxx.webp) ou URL complète.
const image = Joi.string().trim().max(500).allow('', null).messages({
  'string.max': 'Chemin d\'image trop long (500 caractères maximum)',
})

const couleur = Joi.string().trim().pattern(/^#[0-9a-fA-F]{3,8}$/).allow('', null).messages({
  'string.pattern.base': 'Couleur attendue au format hexadécimal (#0e4b50)',
})

const montant = Joi.number().integer().min(0).max(1000000000000).messages({
  'number.base': 'Le montant doit être un nombre',
  'number.integer': 'Le montant doit être un entier de FCFA (pas de centimes)',
  'number.min': 'Le montant ne peut pas être négatif',
})

const modifierCampagne = Joi.object({
  titre: Joi.string().trim().min(2).max(180),
  objectif: montant,
  collecte: montant,
  devise: Joi.string().trim().max(8),
  imageHero: image,
  logo: image,
  actif: Joi.boolean(),
}).min(1).messages({ 'object.min': 'Aucune modification fournie' })

const chantierBase = {
  code: Joi.string().trim().max(40),
  titre: Joi.string().trim().min(2).max(180),
  badge: Joi.string().trim().max(120).allow('', null),
  resume: Joi.string().trim().max(2000).allow('', null),
  travaux: Joi.array().items(Joi.string().trim().max(300)).max(20).messages({
    'array.max': 'Vingt travaux au maximum par chantier',
  }),
  estimation: montant,
  collecte: montant,
  image,
  couleur,
  icone: Joi.string().trim().max(40).allow('', null),
  ordre: Joi.number().integer().min(0),
  actif: Joi.boolean(),
}

const creerChantier = Joi.object({
  ...chantierBase,
  code: chantierBase.code.required().messages({ 'any.required': 'Le code du chantier est obligatoire' }),
  titre: chantierBase.titre.required().messages({ 'any.required': 'Le titre est obligatoire' }),
})

const modifierChantier = Joi.object(chantierBase).min(1).messages({
  'object.min': 'Aucune modification fournie',
})

const responsableBase = {
  nom: Joi.string().trim().min(2).max(180),
  roleTitre: Joi.string().trim().max(180).allow('', null),
  responsabilite: Joi.string().trim().max(180).allow('', null),
  bio: Joi.string().trim().max(3000).allow('', null),
  image,
  ordre: Joi.number().integer().min(0),
  actif: Joi.boolean(),
}

const creerResponsable = Joi.object({
  ...responsableBase,
  nom: responsableBase.nom.required().messages({ 'any.required': 'Le nom est obligatoire' }),
})

const modifierResponsable = Joi.object(responsableBase).min(1).messages({
  'object.min': 'Aucune modification fournie',
})

const moyenBase = {
  nom: Joi.string().trim().min(2).max(120),
  categorie: Joi.string().trim().max(120).allow('', null),
  description: Joi.string().trim().max(1000).allow('', null),
  numero: Joi.string().trim().max(60).allow('', null),
  logo: image,
  libelleBouton: Joi.string().trim().max(80).allow('', null),
  typeAction: Joi.string().valid('don', 'nature').messages({
    'any.only': "Action attendue : 'don' ou 'nature'",
  }),
  couleur,
  ordre: Joi.number().integer().min(0),
  actif: Joi.boolean(),
}

const creerMoyen = Joi.object({
  ...moyenBase,
  nom: moyenBase.nom.required().messages({ 'any.required': 'Le nom est obligatoire' }),
})

const modifierMoyen = Joi.object(moyenBase).min(1).messages({
  'object.min': 'Aucune modification fournie',
})

module.exports = {
  modifierCampagne,
  creerChantier,
  modifierChantier,
  creerResponsable,
  modifierResponsable,
  creerMoyen,
  modifierMoyen,
}
