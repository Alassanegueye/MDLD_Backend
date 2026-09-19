'use strict'

const { Categorie, Produit } = require('../models')
const { NotFoundError, ConflictError } = require('../errors/AppError')
const { fabriquerSlug } = require('./produit.service')

/** Gammes de la boutique — peu nombreuses, donc pas de pagination. */
async function lister({ toutes = false } = {}) {
  const where = toutes ? {} : { active: true }
  return Categorie.findAll({ where, order: [['ordre', 'ASC'], ['nom', 'ASC']] })
}

async function parId(id) {
  const categorie = await Categorie.findByPk(id)
  if (!categorie) throw new NotFoundError('Catégorie introuvable')
  return categorie
}

async function creer(donnees) {
  const slug = fabriquerSlug(donnees.slug || donnees.nom)
  const existe = await Categorie.findOne({ where: { slug }, paranoid: false })
  if (existe) throw new ConflictError('Une catégorie porte déjà ce nom')
  return Categorie.create({ ...donnees, slug })
}

async function modifier(id, donnees) {
  const categorie = await parId(id)
  if (donnees.slug) donnees.slug = fabriquerSlug(donnees.slug)
  await categorie.update(donnees)
  return categorie
}

/** Refus de supprimer une gamme encore rattachée à des produits :
 *  sinon le catalogue se retrouve avec des articles orphelins invisibles. */
async function supprimer(id) {
  const categorie = await parId(id)
  const nb = await Produit.count({ where: { categorieId: categorie.id } })
  if (nb > 0) {
    throw new ConflictError(`Cette catégorie contient encore ${nb} produit(s)`)
  }
  await categorie.destroy()
  return true
}

module.exports = { lister, parId, creer, modifier, supprimer }
