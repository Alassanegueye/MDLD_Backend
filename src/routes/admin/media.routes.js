'use strict'

const express = require('express')
const ctrl = require('../../controllers/admin/renovation.controller')
const { auth, checkActiveUser } = require('../../middlewares/auth.middleware')
const { limiteAdmin, limiteMutation, limiteUtilisateur } = require('../../middlewares/rateLimit.middleware')
const { upload, verifierImage } = require('../../middlewares/upload.middleware')
const { ForbiddenError } = require('../../errors/AppError')

/**
 * Téléversement des visuels, partagé par la boutique et la rénovation.
 *
 * Route neutre plutôt que rattachée à l'un des deux domaines : un
 * gestionnaire du catalogue n'a pas à détenir `renovation.ecrire` pour
 * pouvoir illustrer un article.
 */
const router = express.Router()

router.use(auth, checkActiveUser, limiteUtilisateur, limiteAdmin)

/** Écrire quelque part suffit : la route ne fait qu'entreposer un fichier. */
function peutTeleverser(req, res, next) {
  const droits = ['produits.ecrire', 'renovation.ecrire']
  if (droits.some((d) => req.user.aPermission(d))) return next()
  return next(new ForbiddenError('Permission d\'écriture requise pour téléverser un visuel'))
}

router.post('/', peutTeleverser, limiteMutation, upload.single('fichier'), verifierImage, ctrl.televerser)

module.exports = router
