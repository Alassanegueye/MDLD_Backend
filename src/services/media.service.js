'use strict'

const fs = require('fs/promises')
const path = require('path')
const crypto = require('crypto')
const { typeReel } = require('../utils/magicBytes')
const { BadRequestError } = require('../errors/AppError')

/**
 * Stockage des visuels téléversés depuis le dashboard.
 *
 * Disque local et non base de données : une image en BLOB gonfle chaque
 * sauvegarde et interdit toute mise en cache par le navigateur. Le
 * dossier est monté en volume Docker, sinon un redéploiement emporterait
 * les photos du chantier.
 *
 * Le nom du fichier est tiré au sort et l'extension déduite des octets
 * réels, jamais du nom envoyé par le client : « photo.png.php » ne doit
 * pas pouvoir atterrir tel quel sur le disque.
 */
const DOSSIER = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads'))

const EXTENSIONS = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
}

/** Chemin public servi par Express, stocké tel quel dans les tables. */
const PREFIXE_PUBLIC = '/medias'

async function preparerDossier() {
  await fs.mkdir(DOSSIER, { recursive: true })
}

/**
 * Écrit le fichier vérifié et renvoie son chemin public.
 * @param {{buffer: Buffer}} fichier — sortie de multer (memoryStorage)
 */
async function enregistrer(fichier) {
  if (!fichier?.buffer?.length) throw new BadRequestError('Aucun fichier reçu')

  const mime = typeReel(fichier.buffer)
  const extension = EXTENSIONS[mime]
  if (!extension) throw new BadRequestError('Format d\'image non autorisé (JPEG, PNG ou WEBP)')

  await preparerDossier()
  const nom = `${crypto.randomUUID()}${extension}`
  await fs.writeFile(path.join(DOSSIER, nom), fichier.buffer)

  return { url: `${PREFIXE_PUBLIC}/${nom}`, nom, mime, taille: fichier.buffer.length }
}

/**
 * Supprime un visuel à partir de son chemin public.
 * Le basename est réextrait : un chemin remonté du client pourrait
 * contenir « ../ » et viser un fichier hors du dossier.
 */
async function supprimer(cheminPublic) {
  if (!cheminPublic?.startsWith(`${PREFIXE_PUBLIC}/`)) return false
  const nom = path.basename(cheminPublic)
  try {
    await fs.unlink(path.join(DOSSIER, nom))
    return true
  } catch (erreur) {
    // Fichier déjà absent : la suppression a atteint son but.
    if (erreur.code === 'ENOENT') return false
    throw erreur
  }
}

module.exports = { enregistrer, supprimer, preparerDossier, DOSSIER, PREFIXE_PUBLIC }
