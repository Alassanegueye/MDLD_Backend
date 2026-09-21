'use strict'

/**
 * Dons de la campagne de rénovation.
 *
 * Jusqu'ici la collecte était un nombre saisi à la main sur la campagne
 * et sur chaque chantier. Impossible de dire qui avait donné, ni de
 * justifier un total. Les montants se déduisent désormais des dons.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { UUID, UUIDV4, STRING, TEXT, INTEGER, BOOLEAN, DATE, ENUM } = Sequelize

    await queryInterface.createTable('dons', {
      id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
      prenom: { type: STRING(100) },
      nom: { type: STRING(100) },
      anonyme: { type: BOOLEAN, allowNull: false, defaultValue: false },
      email: { type: STRING(180) },
      telephone: { type: STRING(40) },
      montant: { type: INTEGER, allowNull: false },
      devise: { type: STRING(8), allowNull: false, defaultValue: 'FCFA' },
      chantierId: {
        type: UUID,
        allowNull: true,
        references: { model: 'chantiers', key: 'id' },
        // Supprimer un chantier ne doit pas effacer l'historique des dons :
        // le versement a eu lieu, il reste acquis au fonds global.
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      moyen: { type: STRING(60) },
      reference: { type: STRING(60) },
      message: { type: TEXT },
      statut: {
        type: ENUM('promesse', 'recu', 'annule'),
        allowNull: false,
        defaultValue: 'recu',
      },
      recuLe: { type: DATE },
      createdAt: { type: DATE, allowNull: false },
      updatedAt: { type: DATE, allowNull: false },
    })

    await queryInterface.addIndex('dons', ['chantierId'])
    await queryInterface.addIndex('dons', ['statut'])
    await queryInterface.addIndex('dons', ['recuLe'])
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('dons')
    // PostgreSQL garde le type ENUM après la suppression de la table ;
    // sans ce nettoyage, rejouer la migration échoue sur « type déjà existant ».
    if (queryInterface.sequelize.getDialect() === 'postgres') {
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_dons_statut";')
    }
    void Sequelize
  },
}
