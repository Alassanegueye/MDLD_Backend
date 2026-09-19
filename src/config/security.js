'use strict'

/**
 * Source unique de toute la configuration de sécurité.
 *
 * Pourquoi centraliser : une clé lue à deux endroits finit toujours par
 * diverger (un défaut ici, une variable là) et la faille passe inaperçue.
 * Tout ce qui touche aux secrets, aux durées de vie, au CORS et aux quotas
 * est donc résolu ici, une seule fois, au démarrage.
 *
 * Le module échoue volontairement au boot plutôt que de laisser tourner
 * une instance mal configurée : un crash au démarrage se voit, une faille
 * silencieuse non.
 */

const VALEURS_EXEMPLE = [
  'remplacer-par-un-secret-aleatoire-de-48-octets',
  'remplacer-par-un-autre-secret-aleatoire-distinct',
  'remplacer-par-un-troisieme-secret-encore-different',
  'change-moi',
  'change-moi-immediatement',
  'secret',
  'changeme',
]

const LONGUEUR_SECRET_MINI = 32

const env = process.env.NODE_ENV || 'development'
const enProduction = env === 'production'
const enTest = env === 'test'

const erreurs = []

/** Lit une variable obligatoire ; accumule l'erreur au lieu de jeter tout de suite,
 *  pour afficher TOUS les problèmes de configuration d'un coup. */
function requis(cle, valeurDeTest) {
  const valeur = process.env[cle]
  if (valeur) return valeur
  // En test, on autorise des valeurs de repli : la CI ne doit pas exiger un vrai .env
  if (enTest && valeurDeTest) return valeurDeTest
  erreurs.push(`Variable d'environnement manquante : ${cle}`)
  return undefined
}

function nombre(cle, defaut) {
  const brut = process.env[cle]
  if (brut === undefined || brut === '') return defaut
  const n = Number(brut)
  if (Number.isNaN(n)) {
    erreurs.push(`${cle} doit être un nombre (reçu : « ${brut} »)`)
    return defaut
  }
  return n
}

// ---- Secrets JWT : trois usages, trois secrets ----
// Un même secret pour l'access et le refresh permettrait d'utiliser un access
// token expiré comme refresh token : ce sont bien trois clés distinctes.
const jwt = {
  accessSecret: requis('JWT_ACCESS_SECRET', 'secret-de-test-access-32-caracteres-minimum'),
  refreshSecret: requis('JWT_REFRESH_SECRET', 'secret-de-test-refresh-32-caracteres-minimum'),
  resetSecret: requis('JWT_RESET_SECRET', 'secret-de-test-reset-32-caracteres-minimum'),
  accessExpires: process.env.JWT_ACCESS_EXPIRES || '1h',
  refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  resetExpires: process.env.JWT_RESET_EXPIRES || '1h',
  maxRefreshTokens: nombre('MAX_REFRESH_TOKENS', 5),
  issuer: 'mdld-api',
}

// ---- CORS ----
const originesBrutes = (process.env.CORS_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean)

// ---- Quotas (fenêtres en millisecondes) ----
const limites = {
  global: { fenetreMs: 15 * 60 * 1000, max: nombre('RATE_GLOBAL_MAX', 600) },
  parUtilisateur: { fenetreMs: 15 * 60 * 1000, max: nombre('RATE_USER_MAX', 300) },
  auth: { fenetreMs: 15 * 60 * 1000, max: nombre('RATE_AUTH_MAX', 5) },
  mutation: { fenetreMs: 15 * 60 * 1000, max: nombre('RATE_MUTATION_MAX', 60) },
  admin: { fenetreMs: 15 * 60 * 1000, max: nombre('RATE_ADMIN_MAX', 200) },
  commande: { fenetreMs: 60 * 60 * 1000, max: nombre('RATE_COMMANDE_MAX', 10) },
}

// ---- Téléversements ----
const uploads = {
  tailleMaxOctets: nombre('UPLOAD_MAX_BYTES', 3 * 1024 * 1024),
  mimesAutorises: ['image/jpeg', 'image/png', 'image/webp'],
}

const securite = {
  env,
  enProduction,
  enTest,
  port: nombre('PORT', 4000),
  prefixeApi: process.env.API_PREFIX || '/mdld/v1',
  jwt,
  bcryptRounds: nombre('BCRYPT_ROUNDS', 12),
  corsOrigins: originesBrutes,
  limites,
  uploads,
  tailleMaxJson: '512kb',
}

// ============================================================
// Validations de démarrage
// ============================================================

const secrets = [jwt.accessSecret, jwt.refreshSecret, jwt.resetSecret].filter(Boolean)

// 1. Longueur minimale : un secret court se casse hors ligne
secrets.forEach((secret, i) => {
  if (secret.length < LONGUEUR_SECRET_MINI) {
    erreurs.push(`Le secret JWT n°${i + 1} fait moins de ${LONGUEUR_SECRET_MINI} caractères`)
  }
})

// 2. Unicité : trois usages, trois clés
if (new Set(secrets).size !== secrets.length) {
  erreurs.push('Les trois secrets JWT doivent être différents les uns des autres')
}

// 3. Aucune valeur d'exemple ne doit survivre en production
if (enProduction) {
  const suspects = [
    ...secrets,
    process.env.DB_PASSWORD,
    process.env.ADMIN_PASSWORD,
  ].filter(Boolean)

  suspects.forEach((valeur) => {
    if (VALEURS_EXEMPLE.includes(valeur)) {
      erreurs.push('Une valeur d\'exemple issue de .env.example est encore utilisée en production')
    }
  })

  if (securite.corsOrigins.length === 0) {
    erreurs.push('CORS_ORIGINS est obligatoire en production (liste blanche explicite)')
  }
  if (securite.corsOrigins.includes('*')) {
    erreurs.push('CORS_ORIGINS ne peut pas valoir « * » en production')
  }
  if (securite.bcryptRounds < 12) {
    erreurs.push('BCRYPT_ROUNDS doit valoir au moins 12 en production')
  }
}

if (erreurs.length > 0) {
  // Pas de logger ici : il dépend lui-même de la configuration.
  console.error('\n[BOOT] Configuration de sécurité invalide :')
  erreurs.forEach((e) => console.error('  ✗ ' + e))
  console.error('\nCorrigez le fichier .env (voir .env.example) puis relancez.\n')
  process.exit(1)
}

module.exports = securite
