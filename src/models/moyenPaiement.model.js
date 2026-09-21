'use strict'

const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/db')

/**
 * Moyens de contribution (PAMECAS, Wave, Orange Money, don en nature).
 *
 * Le numéro est une chaîne et non un entier : il porte des tirets, des
 * espaces et parfois un préfixe international, et aucun calcul n'est
 * jamais fait dessus.
 */
const MoyenPaiement = sequelize.define(
  'MoyenPaiement',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    nom: { type: DataTypes.STRING(120), allowNull: false },
    /** Étiquette de rubrique affichée au-dessus du nom. */
    categorie: { type: DataTypes.STRING(120), allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    numero: { type: DataTypes.STRING(60), allowNull: true },
    /** Logo du prestataire ; null = le front retombe sur une icône générique. */
    logo: { type: DataTypes.STRING(500), allowNull: true },
    libelleBouton: { type: DataTypes.STRING(80), allowNull: true },
    /** 'don' = renvoie vers le tunnel de don ; 'nature' = ouvre le formulaire matériaux. */
    typeAction: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'don' },
    couleur: { type: DataTypes.STRING(9), allowNull: true },
    ordre: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    actif: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  {
    tableName: 'moyens_paiement',
    indexes: [{ fields: ['actif'] }, { fields: ['ordre'] }],
  }
)

module.exports = MoyenPaiement
