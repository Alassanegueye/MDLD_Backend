'use strict'

/**
 * Point unique de déclaration des associations.
 *
 * Pourquoi ici et nulle part ailleurs : déclarer une relation dans le
 * fichier du modèle crée des imports croisés (produit -> catégorie ->
 * produit) qui cassent au premier require circulaire. Tous les modèles
 * sont donc chargés d'abord, reliés ensuite.
 */

const { sequelize } = require('../config/db')

const Utilisateur = require('./utilisateur.model')
const RefreshToken = require('./refreshToken.model')
const Categorie = require('./categorie.model')
const Produit = require('./produit.model')
const Commande = require('./commande.model')
const LigneCommande = require('./ligneCommande.model')
const JournalAudit = require('./journalAudit.model')
const Campagne = require('./campagne.model')
const Chantier = require('./chantier.model')
const Responsable = require('./responsable.model')
const MoyenPaiement = require('./moyenPaiement.model')
const Don = require('./don.model')

// ---- Sessions ----
Utilisateur.hasMany(RefreshToken, { foreignKey: 'utilisateurId', as: 'sessions', onDelete: 'CASCADE' })
RefreshToken.belongsTo(Utilisateur, { foreignKey: 'utilisateurId', as: 'utilisateur' })

// ---- Catalogue ----
Categorie.hasMany(Produit, { foreignKey: 'categorieId', as: 'produits' })
Produit.belongsTo(Categorie, { foreignKey: 'categorieId', as: 'categorie' })

// ---- Commandes ----
// SET NULL et non CASCADE : supprimer un produit ne doit jamais effacer
// l'historique de vente, seulement délier la ligne.
Commande.hasMany(LigneCommande, { foreignKey: 'commandeId', as: 'lignes', onDelete: 'CASCADE' })
LigneCommande.belongsTo(Commande, { foreignKey: 'commandeId', as: 'commande' })

Produit.hasMany(LigneCommande, { foreignKey: 'produitId', as: 'lignes', onDelete: 'SET NULL' })
LigneCommande.belongsTo(Produit, { foreignKey: 'produitId', as: 'produit' })

Utilisateur.hasMany(Commande, { foreignKey: 'traiteePar', as: 'commandesTraitees' })
Commande.belongsTo(Utilisateur, { foreignKey: 'traiteePar', as: 'gestionnaire' })

// ---- Rénovation ----
// Aucune association : campagne, chantiers, responsables et moyens de
// paiement sont quatre listes indépendantes rendues sur la même page.
// Une clé étrangère vers la campagne n'apporterait rien tant qu'il n'y
// en a qu'une, et compliquerait chaque requête publique.

// ---- Dons ----
// SET NULL : supprimer un chantier ne doit pas effacer les versements
// deja recus, ils restent acquis au fonds global.
Chantier.hasMany(Don, { foreignKey: 'chantierId', as: 'dons', onDelete: 'SET NULL' })
Don.belongsTo(Chantier, { foreignKey: 'chantierId', as: 'chantier' })

// ---- Audit ----
Utilisateur.hasMany(JournalAudit, { foreignKey: 'utilisateurId', as: 'actions' })
JournalAudit.belongsTo(Utilisateur, { foreignKey: 'utilisateurId', as: 'utilisateur' })

module.exports = {
  sequelize,
  Utilisateur,
  RefreshToken,
  Categorie,
  Produit,
  Commande,
  LigneCommande,
  JournalAudit,
  Campagne,
  Chantier,
  Responsable,
  MoyenPaiement,
  Don,
}
