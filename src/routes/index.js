'use strict'

const express = require('express')
const boutiqueRoutes = require('./public/boutique.routes')
const renovationPublicRoutes = require('./public/renovation.routes')
const authRoutes = require('./admin/auth.routes')
const produitRoutes = require('./admin/produit.routes')
const commandeRoutes = require('./admin/commande.routes')
const auditRoutes = require('./admin/audit.routes')
const utilisateurRoutes = require('./admin/utilisateur.routes')
const renovationRoutes = require('./admin/renovation.routes')
const mediaRoutes = require('./admin/media.routes')

/**
 * Table de routage de l'API.
 *
 * Découpage par rôle utilisateur : ce qui est ouvert au public d'un côté,
 * ce qui exige un compte de l'autre. Une route mal rangée se remarque
 * immédiatement, alors qu'un découpage par type technique (« routes »,
 * « handlers ») laisse passer une route admin non protégée.
 */
const router = express.Router()

// ---- Public : consommé par le site vitrine ----
router.use('/boutique', boutiqueRoutes)
router.use('/renovation', renovationPublicRoutes)

// ---- Administration : consommé par le dashboard ----
router.use('/admin/auth', authRoutes)
router.use('/admin/produits', produitRoutes)
router.use('/admin/commandes', commandeRoutes)
router.use('/admin/utilisateurs', utilisateurRoutes)
router.use('/admin/renovation', renovationRoutes)
router.use('/admin/medias', mediaRoutes)
router.use('/admin/journal', auditRoutes)

module.exports = router
