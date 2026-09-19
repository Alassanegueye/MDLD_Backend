'use strict'

const cron = require('node-cron')
const logger = require('../utils/logger')
const { purgerSessions } = require('../services/auth.service')
const { enTest } = require('../config/security')

/**
 * Tâches planifiées.
 *
 * Sans purge, la table des refresh tokens grossit indéfiniment : chaque
 * connexion y laisse une ligne, jamais reprise. On nettoie donc les
 * sessions expirées ou révoquées une fois par nuit.
 */
function demarrerTaches() {
  if (enTest) return // la suite de tests n'a pas à planifier de cron

  // 03h15 : creux d'activité, et décalé des heures rondes où tout le
  // monde planifie ses tâches.
  cron.schedule('15 3 * * *', async () => {
    try {
      const nb = await purgerSessions()
      logger.info('Purge des sessions terminée', { supprimees: nb })
    } catch (erreur) {
      logger.error('Purge des sessions en échec', { message: erreur.message })
    }
  })

  logger.info('Tâches planifiées activées')
}

module.exports = { demarrerTaches }
