'use strict'

const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/db')

/** Membres du comité directeur affichés sur la page rénovation. */
const Responsable = sequelize.define(
  'Responsable',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    nom: { type: DataTypes.STRING(180), allowNull: false },
    roleTitre: { type: DataTypes.STRING(180), allowNull: true },
    responsabilite: { type: DataTypes.STRING(180), allowNull: true },
    bio: { type: DataTypes.TEXT, allowNull: true },
    image: { type: DataTypes.STRING(500), allowNull: true },
    ordre: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    actif: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  {
    tableName: 'responsables',
    indexes: [{ fields: ['actif'] }, { fields: ['ordre'] }],
  }
)

module.exports = Responsable
