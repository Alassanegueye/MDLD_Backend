'use strict'

/**
 * Logo de la campagne.
 *
 * Il vivait dans le dépôt du front : le changer imposait un
 * redéploiement. Le front garde le fichier livré comme repli, pour que la
 * page reste signée même sur une base vierge.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('campagnes', 'logo', {
      type: Sequelize.STRING(500),
      allowNull: true,
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('campagnes', 'logo')
  },
}
