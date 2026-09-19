'use strict'

/**
 * Schéma initial.
 *
 * Les migrations font foi en production : `sync({ alter: true })` est
 * réservé au développement, parce qu'il lui arrive de recréer une colonne
 * — donc d'en perdre le contenu — pour un simple changement de type.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { UUID, UUIDV4, STRING, TEXT, INTEGER, BOOLEAN, DATE, JSON: JSONB, ENUM } = Sequelize

    // ---- utilisateurs ----
    await queryInterface.createTable('utilisateurs', {
      id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
      email: { type: STRING(180), allowNull: false, unique: true },
      motDePasse: { type: STRING(255), allowNull: false },
      nom: { type: STRING(100), allowNull: false },
      prenom: { type: STRING(100), allowNull: false },
      telephone: { type: STRING(40) },
      role: { type: ENUM('admin', 'gestionnaire'), allowNull: false, defaultValue: 'gestionnaire' },
      permissions: { type: JSONB, allowNull: false, defaultValue: [] },
      actif: { type: BOOLEAN, allowNull: false, defaultValue: true },
      derniereConnexion: { type: DATE },
      supprimeLe: { type: DATE },
      createdAt: { type: DATE, allowNull: false },
      updatedAt: { type: DATE, allowNull: false },
    })
    await queryInterface.addIndex('utilisateurs', ['email'], { unique: true, name: 'idx_utilisateurs_email' })
    await queryInterface.addIndex('utilisateurs', ['role'], { name: 'idx_utilisateurs_role' })

    // ---- refresh_tokens ----
    await queryInterface.createTable('refresh_tokens', {
      id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
      utilisateurId: {
        type: UUID,
        allowNull: false,
        references: { model: 'utilisateurs', key: 'id' },
        onDelete: 'CASCADE',
      },
      tokenHash: { type: STRING(64), allowNull: false },
      expireLe: { type: DATE, allowNull: false },
      revoqueLe: { type: DATE },
      adresseIp: { type: STRING(64) },
      agent: { type: STRING(255) },
      createdAt: { type: DATE, allowNull: false },
      updatedAt: { type: DATE, allowNull: false },
    })
    await queryInterface.addIndex('refresh_tokens', ['tokenHash'], { name: 'idx_refresh_hash' })
    await queryInterface.addIndex('refresh_tokens', ['utilisateurId'], { name: 'idx_refresh_utilisateur' })
    await queryInterface.addIndex('refresh_tokens', ['expireLe'], { name: 'idx_refresh_expire' })

    // ---- categories ----
    await queryInterface.createTable('categories', {
      id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
      nom: { type: STRING(120), allowNull: false },
      slug: { type: STRING(140), allowNull: false, unique: true },
      description: { type: TEXT },
      ordre: { type: INTEGER, allowNull: false, defaultValue: 0 },
      active: { type: BOOLEAN, allowNull: false, defaultValue: true },
      supprimeLe: { type: DATE },
      createdAt: { type: DATE, allowNull: false },
      updatedAt: { type: DATE, allowNull: false },
    })
    await queryInterface.addIndex('categories', ['slug'], { unique: true, name: 'idx_categories_slug' })
    await queryInterface.addIndex('categories', ['ordre'], { name: 'idx_categories_ordre' })

    // ---- produits ----
    await queryInterface.createTable('produits', {
      id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
      reference: { type: STRING(60), allowNull: false, unique: true },
      nom: { type: STRING(180), allowNull: false },
      slug: { type: STRING(200), allowNull: false, unique: true },
      description: { type: TEXT },
      prix: { type: INTEGER, allowNull: false },
      devise: { type: STRING(8), allowNull: false, defaultValue: 'FCFA' },
      categorieId: {
        type: UUID,
        references: { model: 'categories', key: 'id' },
        onDelete: 'SET NULL',
      },
      image: { type: STRING(500) },
      stock: { type: INTEGER },
      surCommande: { type: BOOLEAN, allowNull: false, defaultValue: false },
      badge: { type: STRING(60) },
      enVedette: { type: BOOLEAN, allowNull: false, defaultValue: false },
      actif: { type: BOOLEAN, allowNull: false, defaultValue: true },
      ordre: { type: INTEGER, allowNull: false, defaultValue: 0 },
      supprimeLe: { type: DATE },
      createdAt: { type: DATE, allowNull: false },
      updatedAt: { type: DATE, allowNull: false },
    })
    await queryInterface.addIndex('produits', ['slug'], { unique: true, name: 'idx_produits_slug' })
    await queryInterface.addIndex('produits', ['reference'], { unique: true, name: 'idx_produits_reference' })
    // Index explicite sur la clé étrangère : PostgreSQL n'en crée pas
    // automatiquement, et chaque filtre par gamme ferait un scan complet.
    await queryInterface.addIndex('produits', ['categorieId'], { name: 'idx_produits_categorie' })
    await queryInterface.addIndex('produits', ['actif'], { name: 'idx_produits_actif' })
    await queryInterface.addIndex('produits', ['enVedette'], { name: 'idx_produits_vedette' })

    // ---- commandes ----
    await queryInterface.createTable('commandes', {
      id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
      reference: { type: STRING(20), allowNull: false, unique: true },
      prenom: { type: STRING(100), allowNull: false },
      nom: { type: STRING(100), allowNull: false },
      email: { type: STRING(180), allowNull: false },
      telephone: { type: STRING(40), allowNull: false },
      modeLivraison: { type: ENUM('retrait', 'livraison'), allowNull: false, defaultValue: 'retrait' },
      adresse: { type: STRING(255) },
      ville: { type: STRING(120) },
      quartier: { type: STRING(120) },
      note: { type: TEXT },
      sousTotal: { type: INTEGER, allowNull: false, defaultValue: 0 },
      fraisLivraison: { type: INTEGER, allowNull: false, defaultValue: 0 },
      total: { type: INTEGER, allowNull: false, defaultValue: 0 },
      devise: { type: STRING(8), allowNull: false, defaultValue: 'FCFA' },
      statut: {
        type: ENUM('en_attente', 'confirmee', 'prete', 'livree', 'annulee'),
        allowNull: false,
        defaultValue: 'en_attente',
      },
      noteInterne: { type: TEXT },
      traiteePar: {
        type: UUID,
        references: { model: 'utilisateurs', key: 'id' },
        onDelete: 'SET NULL',
      },
      confirmeeLe: { type: DATE },
      adresseIp: { type: STRING(64) },
      supprimeLe: { type: DATE },
      createdAt: { type: DATE, allowNull: false },
      updatedAt: { type: DATE, allowNull: false },
    })
    await queryInterface.addIndex('commandes', ['reference'], { unique: true, name: 'idx_commandes_reference' })
    await queryInterface.addIndex('commandes', ['statut'], { name: 'idx_commandes_statut' })
    await queryInterface.addIndex('commandes', ['email'], { name: 'idx_commandes_email' })
    await queryInterface.addIndex('commandes', ['createdAt'], { name: 'idx_commandes_date' })
    await queryInterface.addIndex('commandes', ['traiteePar'], { name: 'idx_commandes_gestionnaire' })

    // ---- lignes_commande ----
    await queryInterface.createTable('lignes_commande', {
      id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
      commandeId: {
        type: UUID,
        allowNull: false,
        references: { model: 'commandes', key: 'id' },
        onDelete: 'CASCADE',
      },
      produitId: {
        type: UUID,
        references: { model: 'produits', key: 'id' },
        onDelete: 'SET NULL',
      },
      nomProduit: { type: STRING(180), allowNull: false },
      referenceProduit: { type: STRING(60) },
      prixUnitaire: { type: INTEGER, allowNull: false },
      quantite: { type: INTEGER, allowNull: false },
      sousTotal: { type: INTEGER, allowNull: false },
      createdAt: { type: DATE, allowNull: false },
      updatedAt: { type: DATE, allowNull: false },
    })
    await queryInterface.addIndex('lignes_commande', ['commandeId'], { name: 'idx_lignes_commande' })
    await queryInterface.addIndex('lignes_commande', ['produitId'], { name: 'idx_lignes_produit' })

    // ---- journal_audit ----
    await queryInterface.createTable('journal_audit', {
      id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
      utilisateurId: {
        type: UUID,
        references: { model: 'utilisateurs', key: 'id' },
        onDelete: 'SET NULL',
      },
      emailUtilisateur: { type: STRING(180) },
      action: { type: STRING(80), allowNull: false },
      ressource: { type: STRING(80) },
      ressourceId: { type: STRING(80) },
      details: { type: JSONB },
      adresseIp: { type: STRING(64) },
      createdAt: { type: DATE, allowNull: false },
    })
    await queryInterface.addIndex('journal_audit', ['utilisateurId'], { name: 'idx_audit_utilisateur' })
    await queryInterface.addIndex('journal_audit', ['action'], { name: 'idx_audit_action' })
    await queryInterface.addIndex('journal_audit', ['createdAt'], { name: 'idx_audit_date' })
  },

  async down(queryInterface) {
    // Ordre inverse : les tables filles d'abord, sinon les FK bloquent.
    await queryInterface.dropTable('journal_audit')
    await queryInterface.dropTable('lignes_commande')
    await queryInterface.dropTable('commandes')
    await queryInterface.dropTable('produits')
    await queryInterface.dropTable('categories')
    await queryInterface.dropTable('refresh_tokens')
    await queryInterface.dropTable('utilisateurs')

    // Les types ENUM survivent au dropTable sous PostgreSQL et bloquent
    // un futur `up` avec « type already exists ».
    const q = queryInterface.sequelize.getQueryInterface()
    if (q.sequelize.getDialect() === 'postgres') {
      await q.sequelize.query('DROP TYPE IF EXISTS "enum_utilisateurs_role";')
      await q.sequelize.query('DROP TYPE IF EXISTS "enum_commandes_modeLivraison";')
      await q.sequelize.query('DROP TYPE IF EXISTS "enum_commandes_statut";')
    }
  },
}
