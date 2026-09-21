'use strict'

const { Campagne, Chantier, Responsable, MoyenPaiement } = require('../models')
const { NotFoundError } = require('../errors/AppError')
const donService = require('./don.service')

/**
 * Contenu de la page rénovation.
 *
 * Un service, quatre ressources : elles ne sont jamais consultées
 * séparément par le site vitrine, qui fait un seul appel pour toute la
 * page. Les découper en quatre services obligerait le contrôleur public
 * à en orchestrer quatre.
 */

// ---- Campagne (ligne unique) ----

/**
 * La campagne, créée à la volée si la table est vide.
 *
 * Sans cela, une base fraîchement migrée mais non semée ferait tomber la
 * page publique en 404 alors qu'il n'y a rien d'anormal : il n'y a juste
 * pas encore de chiffres.
 */
async function campagne() {
  const existante = await Campagne.findOne({ order: [['createdAt', 'ASC']] })
  if (existante) return existante
  return Campagne.create({})
}

async function modifierCampagne(donnees) {
  const courante = await campagne()
  await courante.update(donnees)
  return courante
}

// ---- Chantiers ----

function listerChantiers({ tousStatuts = false } = {}) {
  return Chantier.findAll({
    where: tousStatuts ? {} : { actif: true },
    order: [['ordre', 'ASC'], ['createdAt', 'ASC']],
  })
}

async function chantierParId(id) {
  const chantier = await Chantier.findByPk(id)
  if (!chantier) throw new NotFoundError('Chantier introuvable')
  return chantier
}

function creerChantier(donnees) {
  return Chantier.create(donnees)
}

async function modifierChantier(id, donnees) {
  const chantier = await chantierParId(id)
  await chantier.update(donnees)
  return chantier
}

async function supprimerChantier(id) {
  const chantier = await chantierParId(id)
  await chantier.destroy()
  return chantier
}

// ---- Responsables ----

function listerResponsables({ tousStatuts = false } = {}) {
  return Responsable.findAll({
    where: tousStatuts ? {} : { actif: true },
    order: [['ordre', 'ASC'], ['createdAt', 'ASC']],
  })
}

async function responsableParId(id) {
  const responsable = await Responsable.findByPk(id)
  if (!responsable) throw new NotFoundError('Responsable introuvable')
  return responsable
}

function creerResponsable(donnees) {
  return Responsable.create(donnees)
}

async function modifierResponsable(id, donnees) {
  const responsable = await responsableParId(id)
  await responsable.update(donnees)
  return responsable
}

async function supprimerResponsable(id) {
  const responsable = await responsableParId(id)
  await responsable.destroy()
  return responsable
}

// ---- Moyens de paiement ----

function listerMoyens({ tousStatuts = false } = {}) {
  return MoyenPaiement.findAll({
    where: tousStatuts ? {} : { actif: true },
    order: [['ordre', 'ASC'], ['createdAt', 'ASC']],
  })
}

async function moyenParId(id) {
  const moyen = await MoyenPaiement.findByPk(id)
  if (!moyen) throw new NotFoundError('Moyen de paiement introuvable')
  return moyen
}

function creerMoyen(donnees) {
  return MoyenPaiement.create(donnees)
}

async function modifierMoyen(id, donnees) {
  const moyen = await moyenParId(id)
  await moyen.update(donnees)
  return moyen
}

async function supprimerMoyen(id) {
  const moyen = await moyenParId(id)
  await moyen.destroy()
  return moyen
}

// ---- Vue publique ----

/** Tout le contenu de la page en une requête, statuts inactifs exclus. */
/**
 * Contenu public de la page renovation.
 *
 * Les montants collectes viennent des dons encaisses, jamais des
 * colonnes  saisies a la main : deux chiffres entretenus
 * separement divergent toujours, et ce serait celui affiche au public
 * qui aurait tort.
 */
async function pagePublique() {
  const [laCampagne, chantiers, responsables, moyens, collecteTotale, parChantier] = await Promise.all([
    campagne(),
    listerChantiers(),
    listerResponsables(),
    listerMoyens(),
    donService.totalCollecte(),
    donService.collecteParChantier(),
  ])

  return {
    campagne: {
      titre: laCampagne.titre,
      objectif: laCampagne.objectif,
      collecte: collecteTotale,
      devise: laCampagne.devise,
      imageHero: laCampagne.imageHero,
      logo: laCampagne.logo,
      pourcentage:
        laCampagne.objectif > 0
          ? Math.min(100, Math.round((collecteTotale / laCampagne.objectif) * 100))
          : 0,
      // Le reste à financer est calculé ici et non côté client : deux
      // clients qui le recalculent finissent par diverger d'un arrondi.
      reste: Math.max(0, laCampagne.objectif - collecteTotale),
    },
    // Chaque chantier porte le total de ses propres dons.
    chantiers: chantiers.map((c) => ({
      ...c.toJSON(),
      collecte: parChantier.get(c.id) || 0,
    })),
    responsables,
    moyensPaiement: moyens,
  }
}

module.exports = {
  campagne,
  modifierCampagne,
  listerChantiers,
  chantierParId,
  creerChantier,
  modifierChantier,
  supprimerChantier,
  listerResponsables,
  responsableParId,
  creerResponsable,
  modifierResponsable,
  supprimerResponsable,
  listerMoyens,
  moyenParId,
  creerMoyen,
  modifierMoyen,
  supprimerMoyen,
  pagePublique,
}
