'use strict'

const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/db')

/**
 * Lignes d'une commande.
 *
 * Le nom et le prix du produit sont RECOPIÉS au moment de l'achat.
 * Sans cela, augmenter le prix d'un hoodie changerait rétroactivement le
 * montant des commandes déjà passées — et les comptes ne tomberaient plus.
 */
const LigneCommande = sequelize.define(
  'LigneCommande',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    commandeId: { type: DataTypes.UUID, allowNull: false },
    // Peut devenir null si l'article est supprimé du catalogue : la ligne
    // doit survivre à la disparition du produit.
    produitId: { type: DataTypes.UUID, allowNull: true },
    nomProduit: { type: DataTypes.STRING(180), allowNull: false },
    referenceProduit: { type: DataTypes.STRING(60), allowNull: true },
    prixUnitaire: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 0 } },
    quantite: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, max: 999 } },
    sousTotal: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 0 } },
  },
  {
    tableName: 'lignes_commande',
    indexes: [{ fields: ['commandeId'] }, { fields: ['produitId'] }],
  }
)

module.exports = LigneCommande
