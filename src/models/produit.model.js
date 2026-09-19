'use strict'

const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/db')

/**
 * Articles de la boutique patrimoine.
 *
 * Le prix est stocké en entier (francs CFA), pas en flottant : le FCFA
 * n'a pas de centimes et un DECIMAL flottant finit toujours par produire
 * un 24999,999999 dans un total de panier.
 */
const Produit = sequelize.define(
  'Produit',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    reference: { type: DataTypes.STRING(60), allowNull: false, unique: true },
    nom: { type: DataTypes.STRING(180), allowNull: false },
    slug: { type: DataTypes.STRING(200), allowNull: false, unique: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    prix: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 0 },
    },
    devise: { type: DataTypes.STRING(8), allowNull: false, defaultValue: 'FCFA' },
    categorieId: { type: DataTypes.UUID, allowNull: true },
    /** Chemin ou URL du visuel principal ; les images vivent hors de la base. */
    image: { type: DataTypes.STRING(500), allowNull: true },
    /**
     * `stock` null = article toujours disponible (fait sur commande).
     * Un 0 explicite signifie « rupture », ce qui n'est pas la même chose.
     */
    stock: { type: DataTypes.INTEGER, allowNull: true, validate: { min: 0 } },
    surCommande: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    badge: { type: DataTypes.STRING(60), allowNull: true },
    /** Mis en avant sur la page d'accueil du site vitrine. */
    enVedette: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    actif: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    ordre: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    supprimeLe: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: 'produits',
    paranoid: true,
    deletedAt: 'supprimeLe',
    indexes: [
      { unique: true, fields: ['slug'] },
      { unique: true, fields: ['reference'] },
      // Index explicite sur la clé étrangère : sans lui, chaque filtre par
      // gamme fait un scan complet dès que le catalogue grossit.
      { fields: ['categorieId'] },
      { fields: ['actif'] },
      { fields: ['enVedette'] },
    ],
  }
)

/** Disponible à la vente ? Un article sur commande l'est toujours. */
Produit.prototype.estDisponible = function estDisponible(quantite = 1) {
  if (!this.actif) return false
  if (this.surCommande || this.stock === null) return true
  return this.stock >= quantite
}

module.exports = Produit
