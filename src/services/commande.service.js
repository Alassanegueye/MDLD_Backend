'use strict'

const { Op } = require('sequelize')
const { sequelize, Commande, LigneCommande, Produit } = require('../models')
const { genererReference } = require('../utils/reference')
const { paramsPagination, reponsePaginee } = require('../utils/paginate')
const { BadRequestError, NotFoundError, ConflictError } = require('../errors/AppError')
const logger = require('../utils/logger')

/**
 * Commandes de la boutique.
 *
 * Règle centrale : le panier envoyé par le navigateur ne contient que des
 * identifiants et des quantités. Les prix, les noms et le total sont
 * relus dans la base. Faire confiance au total du client, c'est accepter
 * qu'on achète un hoodie à 1 FCFA.
 */

const FRAIS_LIVRAISON_DAKAR = 2000

/** Transitions autorisées : on ne « dé-livre » pas une commande. */
const TRANSITIONS = {
  en_attente: ['confirmee', 'annulee'],
  confirmee: ['prete', 'annulee'],
  prete: ['livree', 'annulee'],
  livree: [],
  annulee: [],
}

async function creer(donnees, contexte = {}) {
  const { articles, modeLivraison } = donnees

  // 1. Relire les produits en base
  const ids = articles.map((a) => a.produitId)
  const produits = await Produit.findAll({ where: { id: ids, actif: true } })

  if (produits.length !== new Set(ids).size) {
    throw new BadRequestError('Un ou plusieurs articles du panier ne sont plus disponibles')
  }

  const parId = new Map(produits.map((p) => [p.id, p]))

  // 2. Recalculer chaque ligne à partir du catalogue
  const lignes = []
  let sousTotal = 0

  for (const article of articles) {
    const produit = parId.get(article.produitId)

    if (!produit.estDisponible(article.quantite)) {
      throw new ConflictError(`« ${produit.nom} » n'est pas disponible dans cette quantité`)
    }

    const montant = produit.prix * article.quantite
    sousTotal += montant

    lignes.push({
      produitId: produit.id,
      nomProduit: produit.nom,
      referenceProduit: produit.reference,
      prixUnitaire: produit.prix,
      quantite: article.quantite,
      sousTotal: montant,
    })
  }

  const fraisLivraison = modeLivraison === 'livraison' ? FRAIS_LIVRAISON_DAKAR : 0

  // 3. Écrire commande + lignes + décrément du stock dans UNE transaction :
  // une commande enregistrée sans ses lignes serait ingérable côté équipe.
  return sequelize.transaction(async (t) => {
    const commande = await Commande.create(
      {
        reference: genererReference(),
        prenom: donnees.prenom,
        nom: donnees.nom,
        email: donnees.email,
        telephone: donnees.telephone,
        modeLivraison,
        adresse: donnees.adresse || null,
        ville: donnees.ville || null,
        quartier: donnees.quartier || null,
        note: donnees.note || null,
        sousTotal,
        fraisLivraison,
        total: sousTotal + fraisLivraison,
        statut: 'en_attente',
        adresseIp: contexte.ip || null,
      },
      { transaction: t }
    )

    await LigneCommande.bulkCreate(
      lignes.map((l) => ({ ...l, commandeId: commande.id })),
      { transaction: t }
    )

    // Décrément du stock pour les articles qui en ont un.
    for (const ligne of lignes) {
      const produit = parId.get(ligne.produitId)
      if (produit.stock !== null && !produit.surCommande) {
        await produit.decrement('stock', { by: ligne.quantite, transaction: t })
      }
    }

    logger.info('Nouvelle commande', {
      reference: commande.reference,
      total: commande.total,
      articles: lignes.length,
    })

    return chargerAvecLignes(commande.id, t)
  })
}

async function chargerAvecLignes(id, transaction) {
  return Commande.findByPk(id, {
    include: [{ model: LigneCommande, as: 'lignes' }],
    transaction,
  })
}

/** Suivi public : référence + e-mail, pour ne pas exposer une commande à qui devine une référence. */
async function suivrePublic({ reference, email }) {
  const commande = await Commande.findOne({
    where: { reference: String(reference).toUpperCase(), email: String(email).toLowerCase() },
    include: [{ model: LigneCommande, as: 'lignes' }],
    attributes: { exclude: ['noteInterne', 'adresseIp', 'traiteePar'] },
  })
  if (!commande) throw new NotFoundError('Aucune commande ne correspond à ces informations')
  return commande
}

/** Liste paginée pour le dashboard. */
async function lister(query = {}) {
  const { page, limit, offset } = paramsPagination(query)
  const where = {}

  if (query.statut) where.statut = query.statut
  if (query.recherche) {
    const motif = `%${query.recherche}%`
    where[Op.or] = [
      { reference: { [Op.like]: motif } },
      { email: { [Op.like]: motif } },
      { nom: { [Op.like]: motif } },
      { prenom: { [Op.like]: motif } },
      { telephone: { [Op.like]: motif } },
    ]
  }

  const resultat = await Commande.findAndCountAll({
    where,
    include: [{ model: LigneCommande, as: 'lignes' }],
    order: [['createdAt', 'DESC']],
    limit,
    offset,
    distinct: true,
  })

  return reponsePaginee(resultat, { page, limit })
}

async function parId(id) {
  const commande = await Commande.findByPk(id, {
    include: [{ model: LigneCommande, as: 'lignes' }],
  })
  if (!commande) throw new NotFoundError('Commande introuvable')
  return commande
}

/** Changement de statut, avec contrôle des transitions. */
async function changerStatut(id, statut, utilisateur, noteInterne) {
  const commande = await parId(id)

  const autorises = TRANSITIONS[commande.statut] || []
  if (!autorises.includes(statut)) {
    throw new ConflictError(
      `Transition impossible : « ${commande.statut} » ne peut pas devenir « ${statut} »`
    )
  }

  commande.statut = statut
  commande.traiteePar = utilisateur.id
  if (noteInterne !== undefined) commande.noteInterne = noteInterne
  if (statut === 'confirmee') commande.confirmeeLe = new Date()

  // Une annulation rend le stock : sinon un article reste bloqué à vie.
  if (statut === 'annulee') {
    const lignes = await LigneCommande.findAll({ where: { commandeId: commande.id } })
    for (const ligne of lignes) {
      if (!ligne.produitId) continue
      const produit = await Produit.findByPk(ligne.produitId)
      if (produit && produit.stock !== null && !produit.surCommande) {
        await produit.increment('stock', { by: ligne.quantite })
      }
    }
  }

  await commande.save()
  return commande
}

/** Chiffres du tableau de bord. */
async function statistiques() {
  const [total, enAttente, confirmees, livrees] = await Promise.all([
    Commande.count(),
    Commande.count({ where: { statut: 'en_attente' } }),
    Commande.count({ where: { statut: 'confirmee' } }),
    Commande.count({ where: { statut: 'livree' } }),
  ])

  // Le chiffre d'affaires ignore les commandes annulées.
  const chiffreAffaires = await Commande.sum('total', {
    where: { statut: { [Op.ne]: 'annulee' } },
  })

  const dernieres = await Commande.findAll({
    order: [['createdAt', 'DESC']],
    limit: 5,
    include: [{ model: LigneCommande, as: 'lignes' }],
  })

  return {
    commandes: { total, enAttente, confirmees, livrees },
    chiffreAffaires: chiffreAffaires || 0,
    dernieres,
  }
}

module.exports = {
  creer,
  lister,
  parId,
  changerStatut,
  suivrePublic,
  statistiques,
  FRAIS_LIVRAISON_DAKAR,
  TRANSITIONS,
}
