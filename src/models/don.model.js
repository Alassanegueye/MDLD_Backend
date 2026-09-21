'use strict'

const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/db')

/**
 * Dons reçus pour la campagne de rénovation.
 *
 * Le nom du donateur est conservé même quand il demande l'anonymat : le
 * comité doit pouvoir rapprocher un versement de son auteur pour les
 * remerciements et la comptabilité. C'est l'affichage public qui masque
 * l'identité, pas la base — effacer le nom rendrait tout contrôle
 * impossible et serait irréversible.
 *
 * `chantierId` à null = don au fonds global, non fléché vers un projet.
 * Montants en entiers de FCFA, comme partout ailleurs.
 */
const Don = sequelize.define(
  'Don',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    prenom: { type: DataTypes.STRING(100), allowNull: true },
    nom: { type: DataTypes.STRING(100), allowNull: true },
    /** Le donateur ne veut pas voir son nom affiché sur le site. */
    anonyme: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    email: { type: DataTypes.STRING(180), allowNull: true },
    telephone: { type: DataTypes.STRING(40), allowNull: true },
    montant: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1 } },
    devise: { type: DataTypes.STRING(8), allowNull: false, defaultValue: 'FCFA' },
    /** Projet financé ; null = fonds global de sauvegarde. */
    chantierId: { type: DataTypes.UUID, allowNull: true },
    /** Wave, Orange Money, PAMECAS, espèces… saisi librement. */
    moyen: { type: DataTypes.STRING(60), allowNull: true },
    reference: { type: DataTypes.STRING(60), allowNull: true },
    message: { type: DataTypes.TEXT, allowNull: true },
    /**
     * Un don annoncé n'est pas un don encaissé. Seuls les « recu »
     * comptent dans les totaux : gonfler la collecte avec des promesses
     * ferait mentir la barre de progression du site.
     */
    statut: {
      type: DataTypes.ENUM('promesse', 'recu', 'annule'),
      allowNull: false,
      defaultValue: 'recu',
    },
    /** Date du versement, distincte de la date de saisie. */
    recuLe: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: 'dons',
    indexes: [
      { fields: ['chantierId'] },
      { fields: ['statut'] },
      { fields: ['recuLe'] },
    ],
  }
)

/** Nom affichable côté public : « Anonyme » si le donateur l'a demandé. */
Don.prototype.nomAffiche = function nomAffiche() {
  if (this.anonyme) return 'Anonyme'
  const complet = [this.prenom, this.nom].filter(Boolean).join(' ').trim()
  return complet || 'Anonyme'
}

module.exports = Don
