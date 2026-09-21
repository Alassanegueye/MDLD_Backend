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

/**
 * Compare les migrations présentes sur le disque à celles enregistrées.
 *
 * Remplace l'ancien `sync()` : on ne corrige plus le schéma en silence,
 * on signale l'écart. Un démarrage qui ne prévient de rien alors que la
 * base est en retard donne des 500 incompréhensibles sur une colonne
 * manquante, des heures plus tard.
 */
async function verifierSchema() {
  const fs = require('fs/promises')
  const path = require('path')

  try {
    const fichiers = (await fs.readdir(path.join(__dirname, 'migrations')))
      .filter((n) => n.endsWith('.js'))
      .sort()

    const [lignes] = await sequelize.query('SELECT name FROM "SequelizeMeta"')
    const appliquees = new Set(lignes.map((l) => l.name))
    const enRetard = fichiers.filter((n) => !appliquees.has(n))

    if (enRetard.length) {
      logger.warn(
        `${enRetard.length} migration(s) non appliquée(s) — lancez « npm run migrate »`,
        { migrations: enRetard }
      )
    } else {
      logger.info(`Schéma à jour (${fichiers.length} migrations appliquées)`)
    }
  } catch (erreur) {
    // Table SequelizeMeta absente = base jamais migrée. On le dit sans
    // bloquer : le conteneur doit pouvoir démarrer pour qu'on y lance
    // justement les migrations.
    logger.warn('Impossible de vérifier l\'état des migrations', { message: erreur.message })
  }
}

async function demarrer() {
  try {
    await sequelize.authenticate()
    logger.info('Connexion à la base de données établie')

    // Aucune synchronisation automatique, même en développement : les
    // migrations font foi partout.
    //
    // `sync({ alter: true })` alignait la base sur les modèles du code en
    // cours d'exécution. Un conteneur démarré sur une image antérieure à
    // une migration supprimait donc la colonne qu'il ne connaissait pas,
    // avec son contenu — et la recréait vide au redéploiement suivant.
    // Des données disparaissaient sans la moindre erreur.
    await verifierSchema()

    demarrerTaches()

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
