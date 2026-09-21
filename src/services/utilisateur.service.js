'use strict'

const { Op } = require('sequelize')
const { Utilisateur } = require('../models')
const { paramsPagination, reponsePaginee } = require('../utils/paginate')
const {
  NotFoundError,
  ConflictError,
  BadRequestError,
  ForbiddenError,
} = require('../errors/AppError')

/**
 * Gestion des comptes d'administration.
 *
 * Trois garde-fous, chacun pour un incident réel possible :
 *   1. on ne peut pas se désactiver ni se supprimer soi-même ;
 *   2. on ne peut pas modifier son propre rôle ni ses propres permissions
 *      (sinon un admin se retire ses droits et personne ne peut les lui rendre) ;
 *   3. le dernier administrateur actif est intouchable — sans lui, plus
 *      aucun accès à l'administration, et il faut passer par la base.
 */

/** Permissions proposées par l'interface. « all » ouvre tout. */
const PERMISSIONS = [
  'all',
  'commandes.lire',
  'commandes.traiter',
  'produits.lire',
  'produits.ecrire',
  'produits.supprimer',
  'renovation.lire',
  'renovation.ecrire',
]

async function nombreAdminsActifs(saufId = null) {
  const where = { role: 'admin', actif: true }
  if (saufId) where.id = { [Op.ne]: saufId }
  return Utilisateur.count({ where })
}

async function lister(query = {}) {
  const { page, limit, offset } = paramsPagination(query)
  const where = {}

  if (query.role) where.role = query.role
  if (query.actif !== undefined) where.actif = query.actif
  if (query.recherche) {
    const motif = `%${query.recherche}%`
    where[Op.or] = [
      { email: { [Op.like]: motif } },
      { nom: { [Op.like]: motif } },
      { prenom: { [Op.like]: motif } },
    ]
  }

  const resultat = await Utilisateur.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  })
  return reponsePaginee(resultat, { page, limit })
}

async function parId(id) {
  const utilisateur = await Utilisateur.findByPk(id)
  if (!utilisateur) throw new NotFoundError('Compte introuvable')
  return utilisateur
}

async function creer(donnees) {
  const email = String(donnees.email).trim().toLowerCase()

  // paranoid: false — un compte supprimé occupe toujours l'adresse, la
  // contrainte d'unicité en base la refuserait de toute façon.
  const existe = await Utilisateur.findOne({ where: { email }, paranoid: false })
  if (existe) throw new ConflictError('Un compte utilise déjà cette adresse e-mail')

  const utilisateur = await Utilisateur.create({
    email,
    motDePasse: donnees.motDePasse,
    nom: donnees.nom,
    prenom: donnees.prenom,
    telephone: donnees.telephone || null,
    role: donnees.role || 'gestionnaire',
    permissions: donnees.permissions || [],
    actif: donnees.actif !== undefined ? donnees.actif : true,
  })

  // Le hash ne doit jamais sortir, même à la création.
  return parId(utilisateur.id)
}

async function modifier(id, donnees, auteur) {
  const utilisateur = await parId(id)
  const cEstMoi = auteur && auteur.id === utilisateur.id

  if (cEstMoi && (donnees.role !== undefined || donnees.permissions !== undefined)) {
    throw new ForbiddenError(
      'Vous ne pouvez pas modifier votre propre rôle ni vos propres permissions'
    )
  }
  if (cEstMoi && donnees.actif === false) {
    throw new ForbiddenError('Vous ne pouvez pas désactiver votre propre compte')
  }

  // Retirer le dernier administrateur actif fermerait la porte à tout le monde.
  const perdSonAcces =
    (donnees.actif === false && utilisateur.actif) ||
    (donnees.role && donnees.role !== 'admin' && utilisateur.role === 'admin')

  if (perdSonAcces && utilisateur.role === 'admin' && utilisateur.actif) {
    const restants = await nombreAdminsActifs(utilisateur.id)
    if (restants === 0) {
      throw new ConflictError(
        'Impossible : ce compte est le dernier administrateur actif'
      )
    }
  }

  await utilisateur.update(donnees)
  return parId(utilisateur.id)
}

/** Réinitialisation par un administrateur : aucun ancien mot de passe requis. */
async function reinitialiserMotDePasse(id, nouveauMotDePasse) {
  const utilisateur = await Utilisateur.scope('avecMotDePasse').findByPk(id)
  if (!utilisateur) throw new NotFoundError('Compte introuvable')

  utilisateur.motDePasse = nouveauMotDePasse
  await utilisateur.save()
  return true
}

async function supprimer(id, auteur) {
  const utilisateur = await parId(id)

  if (auteur && auteur.id === utilisateur.id) {
    throw new ForbiddenError('Vous ne pouvez pas supprimer votre propre compte')
  }
  if (utilisateur.role === 'admin' && utilisateur.actif) {
    const restants = await nombreAdminsActifs(utilisateur.id)
    if (restants === 0) {
      throw new ConflictError('Impossible : ce compte est le dernier administrateur actif')
    }
  }

  // Suppression douce : les commandes traitées gardent leur gestionnaire.
  await utilisateur.destroy()
  return true
}

/** Mise à jour de ses propres informations — jamais le rôle ni les droits. */
async function majProfil(id, donnees) {
  const champsAutorises = ['prenom', 'nom', 'telephone']
  const filtre = {}
  champsAutorises.forEach((c) => {
    if (donnees[c] !== undefined) filtre[c] = donnees[c]
  })

  if (Object.keys(filtre).length === 0) {
    throw new BadRequestError('Aucune information à mettre à jour')
  }

  const utilisateur = await parId(id)
  await utilisateur.update(filtre)
  return parId(utilisateur.id)
}

module.exports = {
  lister,
  parId,
  creer,
  modifier,
  reinitialiserMotDePasse,
  supprimer,
  majProfil,
  PERMISSIONS,
}
