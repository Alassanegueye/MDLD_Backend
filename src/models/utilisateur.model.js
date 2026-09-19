'use strict'

const { DataTypes } = require('sequelize')
const bcrypt = require('bcryptjs')
const { sequelize } = require('../config/db')
const { bcryptRounds } = require('../config/security')

/**
 * Comptes d'administration du dashboard.
 *
 * Le site vitrine ne crée jamais de compte : les visiteurs commandent
 * sans s'inscrire (leurs coordonnées vivent sur la commande). Cette table
 * ne contient donc que l'équipe de la mosquée.
 */
const Utilisateur = sequelize.define(
  'Utilisateur',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(180),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
      // Normalisé en minuscules : sans cela « Admin@… » et « admin@… »
      // créent deux comptes distincts pour la même personne.
      set(valeur) {
        this.setDataValue('email', String(valeur || '').trim().toLowerCase())
      },
    },
    motDePasse: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    nom: { type: DataTypes.STRING(100), allowNull: false },
    prenom: { type: DataTypes.STRING(100), allowNull: false },
    telephone: { type: DataTypes.STRING(40), allowNull: true },
    role: {
      type: DataTypes.ENUM('admin', 'gestionnaire'),
      allowNull: false,
      defaultValue: 'gestionnaire',
    },
    /**
     * Modèle strict : un tableau vide ne donne AUCUN droit.
     * L'accès total se déclare explicitement par ['all'] — jamais par défaut.
     */
    permissions: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    actif: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    derniereConnexion: { type: DataTypes.DATE, allowNull: true },
    // Soft delete : on ne perd jamais la trace de qui a validé une commande
    supprimeLe: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: 'utilisateurs',
    paranoid: true,
    deletedAt: 'supprimeLe',
    indexes: [{ unique: true, fields: ['email'] }, { fields: ['role'] }],
    defaultScope: {
      // Le hash ne sort jamais du modèle par accident : il faut le demander.
      attributes: { exclude: ['motDePasse'] },
    },
    scopes: {
      avecMotDePasse: { attributes: { include: ['motDePasse'] } },
    },
  }
)

// Le hachage vit dans le modèle : impossible d'enregistrer un mot de passe
// en clair, quel que soit le service appelant.
async function hacherSiModifie(utilisateur) {
  if (utilisateur.changed('motDePasse')) {
    utilisateur.motDePasse = await bcrypt.hash(utilisateur.motDePasse, bcryptRounds)
  }
}

Utilisateur.addHook('beforeCreate', hacherSiModifie)
Utilisateur.addHook('beforeUpdate', hacherSiModifie)

Utilisateur.prototype.verifierMotDePasse = function verifierMotDePasse(clair) {
  return bcrypt.compare(clair, this.motDePasse)
}

/** L'utilisateur possède-t-il ce droit ? ['all'] ouvre tout, [] ne donne rien. */
Utilisateur.prototype.aPermission = function aPermission(permission) {
  const droits = Array.isArray(this.permissions) ? this.permissions : []
  return droits.includes('all') || droits.includes(permission)
}

module.exports = Utilisateur
