'use strict'

/**
 * Tables de la page rénovation.
 *
 * Tout ce qui s'affichait en dur dans le composant React passe ici :
 * objectif, estimations des chantiers, responsables et coordonnées de
 * paiement. Un chiffre qui change ne doit plus demander un déploiement.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { UUID, UUIDV4, STRING, TEXT, INTEGER, BOOLEAN, DATE, JSON: JSONB } = Sequelize

    const horodatage = {
      createdAt: { type: DATE, allowNull: false },
      updatedAt: { type: DATE, allowNull: false },
    }

    // ---- campagnes (ligne unique) ----
    await queryInterface.createTable('campagnes', {
      id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
      titre: { type: STRING(180), allowNull: false, defaultValue: 'Campagne de rénovation' },
      objectif: { type: INTEGER, allowNull: false, defaultValue: 0 },
      collecte: { type: INTEGER, allowNull: false, defaultValue: 0 },
      devise: { type: STRING(8), allowNull: false, defaultValue: 'FCFA' },
      imageHero: { type: STRING(500) },
      actif: { type: BOOLEAN, allowNull: false, defaultValue: true },
      ...horodatage,
    })

    // ---- chantiers ----
    await queryInterface.createTable('chantiers', {
      id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
      code: { type: STRING(40), allowNull: false },
      titre: { type: STRING(180), allowNull: false },
      badge: { type: STRING(120) },
      resume: { type: TEXT },
      travaux: { type: JSONB, allowNull: false, defaultValue: [] },
      estimation: { type: INTEGER, allowNull: false, defaultValue: 0 },
      collecte: { type: INTEGER, allowNull: false, defaultValue: 0 },
      image: { type: STRING(500) },
      couleur: { type: STRING(9) },
      icone: { type: STRING(40) },
      ordre: { type: INTEGER, allowNull: false, defaultValue: 0 },
      actif: { type: BOOLEAN, allowNull: false, defaultValue: true },
      ...horodatage,
    })
    await queryInterface.addIndex('chantiers', ['actif'])
    await queryInterface.addIndex('chantiers', ['ordre'])

    // ---- responsables ----
    await queryInterface.createTable('responsables', {
      id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
      nom: { type: STRING(180), allowNull: false },
      roleTitre: { type: STRING(180) },
      responsabilite: { type: STRING(180) },
      bio: { type: TEXT },
      image: { type: STRING(500) },
      ordre: { type: INTEGER, allowNull: false, defaultValue: 0 },
      actif: { type: BOOLEAN, allowNull: false, defaultValue: true },
      ...horodatage,
    })
    await queryInterface.addIndex('responsables', ['actif'])
    await queryInterface.addIndex('responsables', ['ordre'])

    // ---- moyens de paiement ----
    await queryInterface.createTable('moyens_paiement', {
      id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
      nom: { type: STRING(120), allowNull: false },
      categorie: { type: STRING(120) },
      description: { type: TEXT },
      numero: { type: STRING(60) },
      logo: { type: STRING(500) },
      libelleBouton: { type: STRING(80) },
      couleur: { type: STRING(9) },
      ordre: { type: INTEGER, allowNull: false, defaultValue: 0 },
      actif: { type: BOOLEAN, allowNull: false, defaultValue: true },
      ...horodatage,
    })
    await queryInterface.addIndex('moyens_paiement', ['actif'])
    await queryInterface.addIndex('moyens_paiement', ['ordre'])
  },

  async down(queryInterface) {
    await queryInterface.dropTable('moyens_paiement')
    await queryInterface.dropTable('responsables')
    await queryInterface.dropTable('chantiers')
    await queryInterface.dropTable('campagnes')
  },
}
