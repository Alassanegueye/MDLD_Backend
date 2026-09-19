'use strict'

const { JournalAudit } = require('../models')
const { paramsPagination, reponsePaginee } = require('../utils/paginate')
const logger = require('../utils/logger')

/**
 * Journalisation des actions d'administration.
 *
 * L'écriture ne doit JAMAIS faire échouer l'action métier : si le journal
 * tombe, la commande doit quand même être confirmée. D'où le catch qui
 * se contente de tracer l'incident.
 */
async function tracer({ utilisateur, action, ressource, ressourceId, details, ip }) {
  try {
    await JournalAudit.create({
      utilisateurId: utilisateur ? utilisateur.id : null,
      emailUtilisateur: utilisateur ? utilisateur.email : null,
      action,
      ressource: ressource || null,
      ressourceId: ressourceId ? String(ressourceId) : null,
      details: details || null,
      adresseIp: ip || null,
    })
  } catch (erreur) {
    logger.error('Écriture du journal d\'audit impossible', { action, message: erreur.message })
  }
}

async function lister(query = {}) {
  const { page, limit, offset } = paramsPagination(query)
  const where = {}
  if (query.action) where.action = query.action
  if (query.utilisateurId) where.utilisateurId = query.utilisateurId

  const resultat = await JournalAudit.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  })
  return reponsePaginee(resultat, { page, limit })
}

module.exports = { tracer, lister }
