'use strict'

const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/db')

/**
 * Campagne de rénovation — ligne unique.
 *
 * Objectif et montant collecté vivent en base et non dans le code : ce
 * sont les deux chiffres que l'équipe met à jour le plus souvent, et un
 * redéploiement du site pour changer un total serait absurde.
 *
 * Montants en entiers de FCFA, comme les prix de la boutique : le franc
 * n'a pas de centimes et un flottant finit toujours par afficher un
 * 199999999,99 sur un objectif rond.
 */
const Campagne = sequelize.define(
  'Campagne',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    titre: { type: DataTypes.STRING(180), allowNull: false, defaultValue: 'Campagne de rénovation' },
    /** Objectif global. La somme des estimations de chantiers doit y correspondre. */
    objectif: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, validate: { min: 0 } },
    /** Total réellement collecté, saisi par l'équipe depuis le dashboard. */
    collecte: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, validate: { min: 0 } },
    devise: { type: DataTypes.STRING(8), allowNull: false, defaultValue: 'FCFA' },
    /** Visuel de l'en-tête de la page rénovation. */
    imageHero: { type: DataTypes.STRING(500), allowNull: true },
    /** Logo de la campagne ; null = le front utilise celui livré avec le site. */
    logo: { type: DataTypes.STRING(500), allowNull: true },
    actif: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  { tableName: 'campagnes' }
)

/** Pourcentage atteint, borné à 100 : un dépassement ne doit pas casser une barre de progression. */
Campagne.prototype.pourcentage = function pourcentage() {
  if (!this.objectif) return 0
  return Math.min(100, Math.round((this.collecte / this.objectif) * 100))
}

module.exports = Campagne
