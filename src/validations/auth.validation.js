'use strict'

const Joi = require('joi')

const connexion = Joi.object({
  email: Joi.string().trim().email({ tlds: { allow: false } }).required().messages({
    'string.email': 'Adresse e-mail invalide',
    'any.required': 'L\'adresse e-mail est obligatoire',
  }),
  // Aucune longueur minimale A LA CONNEXION : cette regle appartient a la
  // creation du mot de passe. L'imposer ici bloquerait les comptes plus
  // anciens et renseignerait un attaquant sur la politique en vigueur.
  motDePasse: Joi.string().max(128).required().messages({
    'string.empty': 'Le mot de passe est obligatoire',
    'any.required': 'Le mot de passe est obligatoire',
  }),
})

const rafraichir = Joi.object({
  refreshToken: Joi.string().required().messages({
    'any.required': 'Jeton de rafraîchissement manquant',
  }),
})

const deconnexion = Joi.object({
  refreshToken: Joi.string().allow('', null),
  toutesLesSessions: Joi.boolean().default(false),
})

const changerMotDePasse = Joi.object({
  ancienMotDePasse: Joi.string().required().messages({
    'any.required': 'L\'ancien mot de passe est obligatoire',
  }),
  // 10 caractères minimum : ces comptes ouvrent l'administration complète.
  nouveauMotDePasse: Joi.string().min(10).max(128).required().messages({
    'string.min': 'Le nouveau mot de passe doit contenir au moins 10 caractères',
    'any.required': 'Le nouveau mot de passe est obligatoire',
  }),
})

module.exports = { connexion, rafraichir, deconnexion, changerMotDePasse }
