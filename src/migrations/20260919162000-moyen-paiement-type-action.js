'use strict'

/**
 * Nature de l'action d'un moyen de contribution.
 *
 * Sans cette colonne, le front devrait deviner au nom (« ce moyen
 * contient-il le mot nature ? ») quel bouton afficher — une règle qui
 * casse dès qu'on renomme une carte depuis le dashboard.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('moyens_paiement', 'typeAction', {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'don',
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('moyens_paiement', 'typeAction')
  },
}
