'use strict'

const express = require('express')
const asyncHandler = require('../../middlewares/asyncHandler')
const auditService = require('../../services/audit.service')
const { ok } = require('../../utils/response')
const { auth, checkActiveUser, admin } = require('../../middlewares/auth.middleware')
const { limiteAdmin } = require('../../middlewares/rateLimit.middleware')

/** Journal d'audit : consultation réservée aux administrateurs. */
const router = express.Router()

router.get(
  '/',
  auth,
  checkActiveUser,
  admin,
  limiteAdmin,
  asyncHandler(async (req, res) => {
    const resultat = await auditService.lister(req.query)
    return ok(res, resultat, 'Journal récupéré')
  })
)

module.exports = router
