'use strict'

const { Op, fn, col, literal } = require('sequelize')
const { Don, Chantier } = require('../models')
const { NotFoundError } = require('../errors/AppError')

/**
 * Dons de la campagne de rénovation.
 *
 * Les totaux sont TOUJOURS calculés à partir des dons, jamais lus dans
 * une colonne « collecte » saisie à la main : deux chiffres entretenus
 * séparément finissent par diverger, et c'est celui qui s'affiche sur le
 * site public qui aurait tort.
 *
 * Seuls les dons au statut « recu » comptent. Une promesse annoncée
 * n'est pas un versement encaissé, l'inclure ferait mentir la barre de
 * progression.
 */
const OU_ENCAISSE = { statut: 'recu' }

function lister({ statut, chantierId, anonyme } = {}) {
  const where = {}
  if (statut) where.statut = statut
  if (chantierId === 'global') where.chantierId = null
  else if (chantierId) where.chantierId = chantierId
  if (anonyme !== undefined) where.anonyme = anonyme

  return Don.findAll({
    where,
    include: [{ model: Chantier, as: 'chantier', attributes: ['id', 'code', 'titre', 'couleur'] }],
    // Le plus récent d'abord : c'est ce que l'équipe vient saisir.
    // COALESCE : un don sans date de versement se classe sur sa saisie.
    order: [[literal('COALESCE("Don"."recuLe", "Don"."createdAt")'), 'DESC']],
  })
}

async function parId(id) {
  const don = await Don.findByPk(id, {
    include: [{ model: Chantier, as: 'chantier', attributes: ['id', 'code', 'titre'] }],
  })
  if (!don) throw new NotFoundError('Don introuvable')
  return don
}

function creer(donnees) {
  return Don.create({
    ...donnees,
    // Un don saisi sans date est réputé reçu le jour de la saisie.
    recuLe: donnees.recuLe || new Date(),
  })
}

async function modifier(id, donnees) {
  const don = await parId(id)
  await don.update(donnees)
  return don
}

async function supprimer(id) {
  const don = await parId(id)
  await don.destroy()
  return don
}

/** Total encaissé, tous projets confondus. */
async function totalCollecte() {
  const somme = await Don.sum('montant', { where: OU_ENCAISSE })
  return somme || 0
}

/** Total encaissé par chantier. Map id -> montant. */
async function collecteParChantier() {
  const lignes = await Don.findAll({
    where: { ...OU_ENCAISSE, chantierId: { [Op.ne]: null } },
    attributes: ['chantierId', [fn('SUM', col('montant')), 'total']],
    group: ['chantierId'],
    raw: true,
  })
  return new Map(lignes.map((l) => [l.chantierId, Number(l.total) || 0]))
}

/**
 * Vue par campagne : objectif, collecté, reste et donateurs.
 * C'est la vue que le dashboard affiche — un chantier n'a d'intérêt ici
 * que rapporté à ce qu'il a réuni et à qui l'a financé.
 */
async function parCampagne() {
  const [chantiers, dons] = await Promise.all([
    Chantier.findAll({ order: [['ordre', 'ASC'], ['createdAt', 'ASC']] }),
    lister({ statut: 'recu' }),
  ])

  const groupes = chantiers.map((c) => {
    const siens = dons.filter((d) => d.chantierId === c.id)
    const collecte = siens.reduce((t, d) => t + d.montant, 0)
    return {
      id: c.id,
      code: c.code,
      titre: c.titre,
      couleur: c.couleur,
      actif: c.actif,
      objectif: c.estimation,
      collecte,
      reste: Math.max(0, c.estimation - collecte),
      pourcentage: c.estimation > 0 ? Math.min(100, Math.round((collecte / c.estimation) * 100)) : 0,
      nombreDons: siens.length,
      donateurs: siens.map((d) => ({
        id: d.id,
        nom: d.nomAffiche(),
        anonyme: d.anonyme,
        montant: d.montant,
        moyen: d.moyen,
        recuLe: d.recuLe,
      })),
    }
  })

  // Les dons non fléchés forment une entrée à part : les noyer dans un
  // chantier fausserait son avancement.
  const globaux = dons.filter((d) => !d.chantierId)
  if (globaux.length) {
    groupes.push({
      id: 'global',
      code: 'FONDS GLOBAL',
      titre: 'Dons non fléchés',
      couleur: '#0e4b50',
      actif: true,
      objectif: 0,
      collecte: globaux.reduce((t, d) => t + d.montant, 0),
      reste: 0,
      pourcentage: 0,
      nombreDons: globaux.length,
      donateurs: globaux.map((d) => ({
        id: d.id,
        nom: d.nomAffiche(),
        anonyme: d.anonyme,
        montant: d.montant,
        moyen: d.moyen,
        recuLe: d.recuLe,
      })),
    })
  }

  return groupes
}

module.exports = {
  lister,
  parId,
  creer,
  modifier,
  supprimer,
  totalCollecte,
  collecteParChantier,
  parCampagne,
}
