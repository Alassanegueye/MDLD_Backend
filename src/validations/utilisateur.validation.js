'use strict'

const Joi = require('joi')
const { PERMISSIONS } = require('../services/utilisateur.service')

const TELEPHONE = /^[+0-9\s().-]{7,25}$/

const creerUtilisateur = Joi.object({
  email: Joi.string().trim().email({ tlds: { allow: false } }).max(180).required().messages({
    'string.email': 'Adresse e-mail invalide',
    'any.required': 'L\'adresse e-mail est obligatoire',
  }),
  // 10 caractères : ces comptes ouvrent l'administration complète.
  motDePasse: Joi.string().min(10).max(128).required().messages({
    'string.min': 'Le mot de passe doit contenir au moins 10 caractères',
    'any.required': 'Le mot de passe est obligatoire',
  }),
  prenom: Joi.string().trim().min(2).max(100).required().messages({
    'any.required': 'Le prénom est obligatoire',
  }),
  nom: Joi.string().trim().min(2).max(100).required().messages({
    'any.required': 'Le nom est obligatoire',
  }),
  telephone: Joi.string().trim().pattern(TELEPHONE).allow('', null).messages({
    'string.pattern.base': 'Numéro de téléphone invalide',
  }),
  role: Joi.string().valid('admin', 'gestionnaire').default('gestionnaire'),
  // Liste blanche : une permission inventée n'ouvrirait rien, mais elle
  // laisserait croire à un droit accordé.
  permissions: Joi.array().items(Joi.string().valid(...PERMISSIONS)).default([]),
  actif: Joi.boolean().default(true),
})

const modifierUtilisateur = Joi.object({
  prenom: Joi.string().trim().min(2).max(100),
  nom: Joi.string().trim().min(2).max(100),
  telephone: Joi.string().trim().pattern(TELEPHONE).allow('', null),
  role: Joi.string().valid('admin', 'gestionnaire'),
  permissions: Joi.array().items(Joi.string().valid(...PERMISSIONS)),
  actif: Joi.boolean(),
}).min(1).messages({ 'object.min': 'Aucune modification fournie' })

const reinitialiserMotDePasse = Joi.object({
  nouveauMotDePasse: Joi.string().min(10).max(128).required().messages({
    'string.min': 'Le mot de passe doit contenir au moins 10 caractères',
    'any.required': 'Le nouveau mot de passe est obligatoire',
  }),
})

const listerUtilisateurs = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  role: Joi.string().valid('admin', 'gestionnaire'),
  actif: Joi.boolean(),
  recherche: Joi.string().trim().max(120).allow(''),
})

/** Profil : l'utilisateur ne peut toucher qu'à son identité, jamais à ses droits. */
const majProfil = Joi.object({
  prenom: Joi.string().trim().min(2).max(100),
  nom: Joi.string().trim().min(2).max(100),
  telephone: Joi.string().trim().pattern(TELEPHONE).allow('', null),
}).min(1).messages({ 'object.min': 'Aucune modification fournie' })

module.exports = {
  creerUtilisateur,
  modifierUtilisateur,
  reinitialiserMotDePasse,
  listerUtilisateurs,
  majProfil,
}
