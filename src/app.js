'use strict'

const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const compression = require('compression')
const morgan = require('morgan')

const securite = require('./config/security')
const logger = require('./utils/logger')
const { verifierConnexion } = require('./config/db')
const routes = require('./routes')
const errorHandler = require('./middlewares/errorHandler.middleware')
const mediaService = require('./services/media.service')
const { limiteGlobale } = require('./middlewares/rateLimit.middleware')
const { fail } = require('./utils/response')

const app = express()

// Derrière Nginx : sans cela req.ip vaut l'IP du proxy et TOUS les visiteurs
// partagent le même quota — le rate-limiting devient inutile.
app.set('trust proxy', 1)
app.disable('x-powered-by')

// ---- Sécurité des en-têtes ----
app.use(
  helmet({
    // L'API ne sert pas de HTML : la CSP par défaut de helmet gêne
    // seulement la page de documentation, on la laisse au reverse proxy.
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
)

// ---- CORS en liste blanche ----
app.use(
  cors({
    origin(origin, callback) {
      // Pas d'origine = appel serveur à serveur ou outil en ligne de commande.
      if (!origin) return callback(null, true)
      if (securite.corsOrigins.includes(origin)) return callback(null, true)
      logger.warn('Origine CORS refusée', { origin })
      return callback(new Error('Origine non autorisée par la politique CORS'))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  })
)

// ---- Corps de requête ----
// 512 ko suffisent largement à un panier ; au-delà c'est un abus.
app.use(express.json({ limit: securite.tailleMaxJson }))
app.use(express.urlencoded({ extended: true, limit: securite.tailleMaxJson }))
app.use(compression())

// ---- Journalisation HTTP ----
if (!securite.enTest) {
  app.use(morgan(securite.enProduction ? 'combined' : 'dev', { stream: logger.stream }))
}

// ---- Quota global ----
app.use(limiteGlobale)

/**
 * Sonde de santé — volontairement HORS du préfixe de version : elle doit
 * rester à la même adresse même quand l'API passera en v2.
 * Elle vérifie la base : une API qui répond 200 sans base ment à son
 * superviseur, et le déploiement passe alors qu'il est cassé.
 */
app.get('/health', async (req, res) => {
  try {
    await verifierConnexion()
    return res.status(200).json({
      success: true,
      status: 'ok',
      base: 'connectee',
      horodatage: new Date().toISOString(),
    })
  } catch (erreur) {
    logger.error('Sonde de santé en échec', { message: erreur.message })
    return res.status(503).json({ success: false, status: 'degrade', base: 'injoignable' })
  }
})

// ---- Visuels téléversés ----
// Servis en statique depuis le disque : les faire transiter par un
// contrôleur Express ferait passer chaque photo par le fil du process
// Node au lieu du sendfile du noyau, pour aucun gain.
// immutable : le nom de fichier est un UUID, un contenu ne change jamais
// de nom, donc le navigateur peut le garder sans revalidation.
app.use(
  mediaService.PREFIXE_PUBLIC,
  express.static(mediaService.DOSSIER, {
    maxAge: '30d',
    immutable: true,
    index: false,
    dotfiles: 'deny',
  })
)

// ---- API versionnée ----
app.use(securite.prefixeApi, routes)

// ---- 404 : toute route inconnue ----
app.use((req, res) => fail(res, 404, `Route introuvable : ${req.method} ${req.originalUrl}`))

// ---- Gestionnaire d'erreurs : TOUJOURS en dernier ----
app.use(errorHandler)

module.exports = app
