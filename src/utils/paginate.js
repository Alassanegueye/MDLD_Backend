'use strict'

const LIMITE_MAX = 100
const LIMITE_DEFAUT = 20

/**
 * Traduit ?page & ?limit en offset/limit Sequelize.
 *
 * La limite est bornée à 100 : sans plafond, un `?limit=100000` suffit
 * à faire tomber la base depuis l'extérieur.
 */
function paramsPagination(query = {}) {
  let page = parseInt(query.page, 10)
  let limit = parseInt(query.limit, 10)

  if (!Number.isFinite(page) || page < 1) page = 1
  if (!Number.isFinite(limit) || limit < 1) limit = LIMITE_DEFAUT
  if (limit > LIMITE_MAX) limit = LIMITE_MAX

  return { page, limit, offset: (page - 1) * limit }
}

/** Enveloppe un findAndCountAll de Sequelize dans le format attendu par les clients. */
function reponsePaginee({ count, rows }, { page, limit }) {
  return {
    items: rows,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.max(1, Math.ceil(count / limit)),
    },
  }
}

module.exports = { paramsPagination, reponsePaginee, LIMITE_MAX, LIMITE_DEFAUT }
