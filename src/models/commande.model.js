'use strict'

const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/db')

/**
 * Commande passée depuis la boutique du site vitrine.
 *
 * Les coordonnées du client sont copiées ici plutôt que rattachées à un
 * compte : on ne demande pas au visiteur de s'inscrire pour acheter un
 * carnet. La commande est donc auto-portante, et reste lisible même si
 * le client recommande plus tard avec un autre e-mail.
 */
const STATUTS = ['en_attente', 'confirmee', 'prete', 'livree', 'annulee']

const Commande = sequelize.define(
  'Commande',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    /** Référence courte dictée au téléphone (MDLD-9F3K2A). */
    reference: { type: DataTypes.STRING(20), allowNull: false, unique: true },

    // ---- Coordonnées du client ----
    prenom: { type: DataTypes.STRING(100), allowNull: false },
    nom: { type: DataTypes.STRING(100), allowNull: false },
    email: {
      type: DataTypes.STRING(180),
      allowNull: false,
      validate: { isEmail: true },
      set(valeur) {
        this.setDataValue('email', String(valeur || '').trim().toLowerCase())
      },
    },
    telephone: { type: DataTypes.STRING(40), allowNull: false },

    // ---- Livraison ----
    modeLivraison: {
      type: DataTypes.ENUM('retrait', 'livraison'),
      allowNull: false,
      defaultValue: 'retrait',
    },
    adresse: { type: DataTypes.STRING(255), allowNull: true },
    ville: { type: DataTypes.STRING(120), allowNull: true },
    quartier: { type: DataTypes.STRING(120), allowNull: true },
    note: { type: DataTypes.TEXT, allowNull: true },

    // ---- Montants (entiers, en FCFA) ----
    // Recalculés côté serveur à partir du catalogue : le total envoyé par
    // le navigateur n'est qu'une indication, jamais une source de vérité.
    sousTotal: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    fraisLivraison: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    total: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    devise: { type: DataTypes.STRING(8), allowNull: false, defaultValue: 'FCFA' },

    statut: {
      type: DataTypes.ENUM(...STATUTS),
      allowNull: false,
      defaultValue: 'en_attente',
    },
    /** Commentaire interne de l'équipe, invisible du client. */
    noteInterne: { type: DataTypes.TEXT, allowNull: true },
    traiteePar: { type: DataTypes.UUID, allowNull: true },
    confirmeeLe: { type: DataTypes.DATE, allowNull: true },
    adresseIp: { type: DataTypes.STRING(64), allowNull: true },
    supprimeLe: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: 'commandes',
    paranoid: true,
    deletedAt: 'supprimeLe',
    indexes: [
      { unique: true, fields: ['reference'] },
      { fields: ['statut'] },
      { fields: ['email'] },
      { fields: ['createdAt'] },
      { fields: ['traiteePar'] },
    ],
  }
)

Commande.STATUTS = STATUTS

module.exports = Commande
