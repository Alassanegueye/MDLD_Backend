'use strict'

const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/db')

/**
 * Les chantiers de la campagne (Structure, Sanitaires, Électricité…).
 *
 * `travaux` est un tableau JSON plutôt qu'une table dédiée : ce sont de
 * simples puces d'affichage, jamais filtrées ni jointes. Une table pour
 * trois lignes de texte coûterait une requête de plus à chaque visite.
 */
const Chantier = sequelize.define(
  'Chantier',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    code: { type: DataTypes.STRING(40), allowNull: false },
    titre: { type: DataTypes.STRING(180), allowNull: false },
    badge: { type: DataTypes.STRING(120), allowNull: true },
    resume: { type: DataTypes.TEXT, allowNull: true },
    travaux: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
    estimation: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, validate: { min: 0 } },
    collecte: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, validate: { min: 0 } },
    image: { type: DataTypes.STRING(500), allowNull: true },
    /** Couleur d'accent de la carte, en hexadécimal. */
    couleur: { type: DataTypes.STRING(9), allowNull: true },
    /** Nom d'icône résolu côté front (HardHat, Building2, Zap, Volume2…). */
    icone: { type: DataTypes.STRING(40), allowNull: true },
    ordre: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    actif: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  {
    tableName: 'chantiers',
    indexes: [{ fields: ['actif'] }, { fields: ['ordre'] }],
  }
)

module.exports = Chantier
