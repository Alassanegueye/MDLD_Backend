'use strict'

const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/db')

/**
 * Gammes de la boutique (Éditions, Textile, Papeterie, Spirituelle…).
 *
 * Le `slug` sert de filtre stable côté site : renommer une catégorie en
 * vitrine ne doit pas casser les liens ni les filtres déjà partagés.
 */
const Categorie = sequelize.define(
  'Categorie',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    nom: { type: DataTypes.STRING(120), allowNull: false },
    slug: { type: DataTypes.STRING(140), allowNull: false, unique: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    ordre: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    supprimeLe: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: 'categories',
    paranoid: true,
    deletedAt: 'supprimeLe',
    indexes: [{ unique: true, fields: ['slug'] }, { fields: ['ordre'] }],
  }
)

module.exports = Categorie
