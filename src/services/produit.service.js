'use strict'

const { Op } = require('sequelize')
const { Produit, Categorie } = require('../models')
const { paramsPagination, reponsePaginee } = require('../utils/paginate')
const { NotFoundError, ConflictError } = require('../errors/AppError')

/** Transforme « Puzzle · Façade » en « puzzle-facade » pour l'URL. */
function fabriquerSlug(texte) {
  return String(texte)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 190)
}

/** Garantit l'unicité du slug en suffixant -2, -3… si besoin. */
async function slugUnique(base, idExclu = null) {
  let slug = base
  let n = 2
  // Boucle bornée par la réalité : deux produits homonymes, pas mille.
  while (true) {
    const where = { slug }
    if (idExclu) where.id = { [Op.ne]: idExclu }
    const existe = await Produit.findOne({ where, paranoid: false })
    if (!existe) return slug
    slug = `${base}-${n}`
    n += 1
  }
}

/** Catalogue public : uniquement les articles actifs. */
async function listerPublic(query = {}) {
  const { page, limit, offset } = paramsPagination({ ...query, limit: query.limit || 50 })
  const where = { actif: true }

  if (query.categorie) {
    const categorie = await Categorie.findOne({ where: { slug: query.categorie } })
    if (!categorie) return reponsePaginee({ count: 0, rows: [] }, { page, limit })
    where.categorieId = categorie.id
  }
  if (query.vedette === true) where.enVedette = true
  if (query.recherche) {
    where.nom = { [Op.like]: `%${query.recherche}%` }
  }

  const resultat = await Produit.findAndCountAll({
    where,
    include: [{ model: Categorie, as: 'categorie', attributes: ['id', 'nom', 'slug'] }],
    order: [['ordre', 'ASC'], ['createdAt', 'DESC']],
    limit,
    offset,
  })

  return reponsePaginee(resultat, { page, limit })
}

/** Liste d'administration : inclut les articles désactivés. */
async function listerAdmin(query = {}) {
  const { page, limit, offset } = paramsPagination(query)
  const where = {}

  if (query.actif !== undefined) where.actif = query.actif
  if (query.categorieId) where.categorieId = query.categorieId
  if (query.recherche) {
    const motif = `%${query.recherche}%`
    where[Op.or] = [{ nom: { [Op.like]: motif } }, { reference: { [Op.like]: motif } }]
  }

  const resultat = await Produit.findAndCountAll({
    where,
    include: [{ model: Categorie, as: 'categorie', attributes: ['id', 'nom', 'slug'] }],
    order: [['ordre', 'ASC'], ['createdAt', 'DESC']],
    limit,
    offset,
  })

  return reponsePaginee(resultat, { page, limit })
}

async function parSlug(slug) {
  const produit = await Produit.findOne({
    where: { slug, actif: true },
    include: [{ model: Categorie, as: 'categorie', attributes: ['id', 'nom', 'slug'] }],
  })
  if (!produit) throw new NotFoundError('Produit introuvable')
  return produit
}

async function parId(id) {
  const produit = await Produit.findByPk(id, {
    include: [{ model: Categorie, as: 'categorie', attributes: ['id', 'nom', 'slug'] }],
  })
  if (!produit) throw new NotFoundError('Produit introuvable')
  return produit
}

async function creer(donnees) {
  const existe = await Produit.findOne({ where: { reference: donnees.reference }, paranoid: false })
  if (existe) throw new ConflictError('Cette référence produit est déjà utilisée')

  const slug = await slugUnique(fabriquerSlug(donnees.slug || donnees.nom))
  return Produit.create({ ...donnees, slug })
}

async function modifier(id, donnees) {
  const produit = await parId(id)

  // Le slug ne bouge que si le nom change explicitement : les liens déjà
  // partagés vers une fiche produit doivent continuer de fonctionner.
  if (donnees.nom && donnees.nom !== produit.nom && !donnees.slug) {
    donnees.slug = await slugUnique(fabriquerSlug(donnees.nom), produit.id)
  } else if (donnees.slug) {
    donnees.slug = await slugUnique(fabriquerSlug(donnees.slug), produit.id)
  }

  await produit.update(donnees)
  return parId(produit.id)
}

/** Suppression douce : l'historique des commandes reste lisible. */
async function supprimer(id) {
  const produit = await parId(id)
  await produit.destroy()
  return true
}

module.exports = {
  listerPublic,
  listerAdmin,
  parSlug,
  parId,
  creer,
  modifier,
  supprimer,
  fabriquerSlug,
}
