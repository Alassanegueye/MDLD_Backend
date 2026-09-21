'use strict'

const express = require('express')
const ctrl = require('../../controllers/public/renovation.controller')

/** Route ouverte : contenu de la page rénovation (lecture seule). */
const router = express.Router()

router.get('/', ctrl.page)

module.exports = router
