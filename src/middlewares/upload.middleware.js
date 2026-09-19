'use strict'

const multer = require('multer')
const { uploads } = require('../config/security')
const { BadRequestError } = require('../errors/AppError')
const { estTypeAutorise, typeReel } = require('../utils/magicBytes')

/**
 * Téléversement des visuels produits.
 *
 * memoryStorage : le fichier ne touche jamais le disque du conteneur.
 * Il est vérifié en mémoire puis poussé vers le stockage objet — un
 * fichier écrit sur disque avant contrôle est déjà un fichier hostile
 * posé sur le serveur.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: uploads.tailleMaxOctets,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    // Premier filtre sur le MIME déclaré : rejette l'évident tout de suite.
    // Le vrai contrôle se fait après lecture des octets (cf. verifierImage).
    if (!uploads.mimesAutorises.includes(file.mimetype)) {
      return cb(new BadRequestError('Format d\'image non autorisé (JPEG, PNG ou WEBP)'))
    }
    return cb(null, true)
  },
})

/**
 * Contrôle des magic bytes — à monter APRÈS multer.
 * Le Content-Type vient du client : un .exe renommé .png traverse la
 * whitelist MIME sans problème. Seule la signature binaire fait foi.
 */
function verifierImage(req, res, next) {
  if (!req.file) return next()

  if (!estTypeAutorise(req.file.buffer, uploads.mimesAutorises)) {
    const detecte = typeReel(req.file.buffer) || 'inconnu'
    return next(
      new BadRequestError(`Le contenu du fichier n'est pas une image valide (détecté : ${detecte})`)
    )
  }
  return next()
}

module.exports = { upload, verifierImage }
