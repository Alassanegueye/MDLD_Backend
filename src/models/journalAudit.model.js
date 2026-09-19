'use strict'

const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/db')

/**
 * Journal d'audit des actions d'administration.
 *
 * Sert le jour où une commande a été annulée « par personne » : on veut
 * savoir qui, quand, depuis quelle IP. Écriture seule — aucune route ne
 * permet de modifier ou supprimer une entrée.
 */
const JournalAudit = sequelize.define(
  'JournalAudit',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    utilisateurId: { type: DataTypes.UUID, allowNull: true },
    emailUtilisateur: { type: DataTypes.STRING(180), allowNull: true },
    action: { type: DataTypes.STRING(80), allowNull: false },
    ressource: { type: DataTypes.STRING(80), allowNull: true },
    ressourceId: { type: DataTypes.STRING(80), allowNull: true },
    details: { type: DataTypes.JSON, allowNull: true },
    adresseIp: { type: DataTypes.STRING(64), allowNull: true },
  },
  {
    tableName: 'journal_audit',
    updatedAt: false,
    indexes: [
      { fields: ['utilisateurId'] },
      { fields: ['action'] },
      { fields: ['createdAt'] },
    ],
  }
)

module.exports = JournalAudit
