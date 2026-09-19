'use strict'

const asyncHandler = require('../../middlewares/asyncHandler')
const utilisateurService = require('../../services/utilisateur.service')
const authService = require('../../services/auth.service')
const auditService = require('../../services/audit.service')
const { ok, created } = require('../../utils/response')

const lister = asyncHandler(async (req, res) => {
  const resultat = await utilisateurService.lister(req.query)
  return ok(res, resultat, 'Comptes récupérés')
})

const detail = asyncHandler(async (req, res) => {
  const utilisateur = await utilisateurService.parId(req.params.id)
  return ok(res, utilisateur, 'Compte récupéré')
})

const creer = asyncHandler(async (req, res) => {
  const utilisateur = await utilisateurService.creer(req.body)

  // Création d'un compte d'administration : toujours tracée, avec le rôle
  // et les droits accordés — c'est la question qu'on se pose après coup.
  await auditService.tracer({
    utilisateur: req.user,
    action: 'creation_compte',
    ressource: 'utilisateur',
    ressourceId: utilisateur.id,
    details: { email: utilisateur.email, role: utilisateur.role, permissions: utilisateur.permissions },
    ip: req.ip,
  })

  return created(res, utilisateur, 'Compte créé')
})

const modifier = asyncHandler(async (req, res) => {
  const utilisateur = await utilisateurService.modifier(req.params.id, req.body, req.user)

  await auditService.tracer({
    utilisateur: req.user,
    action: 'modification_compte',
    ressource: 'utilisateur',
    ressourceId: utilisateur.id,
    details: { email: utilisateur.email, champs: Object.keys(req.body) },
    ip: req.ip,
  })

  return ok(res, utilisateur, 'Compte modifié')
})

const reinitialiserMotDePasse = asyncHandler(async (req, res) => {
  await utilisateurService.reinitialiserMotDePasse(req.params.id, req.body.nouveauMotDePasse)

  // Le compte visé est déconnecté partout : si son mot de passe a fuité,
  // laisser ses sessions ouvertes viderait la mesure de son sens.
  await authService.deconnexion(null, {
    toutesLesSessions: true,
    utilisateurId: req.params.id,
  })

  await auditService.tracer({
    utilisateur: req.user,
    action: 'reinitialisation_mot_de_passe',
    ressource: 'utilisateur',
    ressourceId: req.params.id,
    ip: req.ip,
  })

  return ok(res, null, 'Mot de passe réinitialisé, sessions révoquées')
})

const supprimer = asyncHandler(async (req, res) => {
  await utilisateurService.supprimer(req.params.id, req.user)

  await authService.deconnexion(null, {
    toutesLesSessions: true,
    utilisateurId: req.params.id,
  })

  await auditService.tracer({
    utilisateur: req.user,
    action: 'suppression_compte',
    ressource: 'utilisateur',
    ressourceId: req.params.id,
    ip: req.ip,
  })

  return ok(res, null, 'Compte supprimé')
})

/** Liste des permissions attribuables — évite de la dupliquer côté dashboard. */
const permissions = asyncHandler(async (req, res) => {
  return ok(res, utilisateurService.PERMISSIONS, 'Permissions disponibles')
})

module.exports = {
  lister,
  detail,
  creer,
  modifier,
  reinitialiserMotDePasse,
  supprimer,
  permissions,
}
