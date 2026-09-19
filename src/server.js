'use strict'

require('dotenv').config()

const app = require('./app')
const logger = require('./utils/logger')
const securite = require('./config/security')
const { sequelize } = require('./models')
const { demarrerTaches } = require('./jobs')

/**
 * Point d'entrée du serveur.
 *
 * L'ordre compte : on vérifie la base AVANT d'ouvrir le port. Un serveur
 * qui accepte des requêtes sans base répond 500 à tout le monde et
 * passe quand même les contrôles de démarrage d'un orchestrateur.
 */
let serveur

async function demarrer() {
  try {
    await sequelize.authenticate()
    logger.info('Connexion à la base de données établie')

    // sync({ alter }) en développement uniquement.
    // En production on ne synchronise PAS : les migrations font foi. Un
    // sync qui crée les tables hors migration désynchronise SequelizeMeta,
    // et le prochain `db:migrate` échoue sur « table déjà existante ».
    if (securite.env === 'development') {
      await sequelize.sync({ alter: true })
      logger.info('Schéma synchronisé (développement)')
    } else {
      logger.info('Schéma géré par les migrations (aucune synchronisation automatique)')
    }

    demarrerTaches()

    serveur = app.listen(securite.port, () => {
      logger.info(`API MDLD démarrée sur le port ${securite.port}`, {
        environnement: securite.env,
        prefixe: securite.prefixeApi,
      })
    })
  } catch (erreur) {
    logger.error('Démarrage impossible', { message: erreur.message, stack: erreur.stack })
    process.exit(1)
  }
}

/** Arrêt propre : on laisse les requêtes en cours se terminer. */
function arretPropre(signal) {
  logger.info(`Signal ${signal} reçu, arrêt en cours…`)
  if (!serveur) process.exit(0)

  serveur.close(async () => {
    try {
      await sequelize.close()
      logger.info('Connexions fermées, arrêt terminé')
      process.exit(0)
    } catch (erreur) {
      logger.error('Erreur pendant l\'arrêt', { message: erreur.message })
      process.exit(1)
    }
  })

  // Filet de sécurité : si une requête ne se termine jamais, on ne reste
  // pas bloqué indéfiniment au redéploiement.
  setTimeout(() => {
    logger.error('Arrêt forcé après 10 s')
    process.exit(1)
  }, 10000).unref()
}

process.on('SIGTERM', () => arretPropre('SIGTERM'))
process.on('SIGINT', () => arretPropre('SIGINT'))

process.on('unhandledRejection', (raison) => {
  logger.error('Promesse rejetée non gérée', { raison: String(raison) })
})

process.on('uncaughtException', (erreur) => {
  // Après une exception non capturée, l'état du process n'est plus fiable :
  // on trace puis on laisse l'orchestrateur redémarrer proprement.
  logger.error('Exception non capturée', { message: erreur.message, stack: erreur.stack })
  process.exit(1)
})

demarrer()

module.exports = { demarrer, arretPropre }
