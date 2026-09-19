'use strict'

const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/db')

/**
 * Sessions actives (refresh tokens).
 *
 * On ne stocke que le SHA-256 du jeton : une fuite de la table ne permet
 * pas de rejouer les sessions. La colonne est indexée car chaque
 * rafraîchissement fait une recherche par hash.
 */
const RefreshToken = sequelize.define(
  'RefreshToken',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    utilisateurId: { type: DataTypes.UUID, allowNull: false },
    tokenHash: { type: DataTypes.STRING(64), allowNull: false },
    expireLe: { type: DataTypes.DATE, allowNull: false },
    revoqueLe: { type: DataTypes.DATE, allowNull: true },
    // Traces utiles pour repérer une session volée
    adresseIp: { type: DataTypes.STRING(64), allowNull: true },
    agent: { type: DataTypes.STRING(255), allowNull: true },
  },
  {
    tableName: 'refresh_tokens',
    indexes: [
      { fields: ['tokenHash'] },
      { fields: ['utilisateurId'] },
      { fields: ['expireLe'] },
    ],
  }
)

module.exports = RefreshToken
