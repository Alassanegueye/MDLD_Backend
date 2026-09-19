'use strict'

const { Sequelize } = require('sequelize')
const logger = require('../utils/logger')
const { enTest, enProduction } = require('./security')

/**
 * Instance Sequelize unique de l'application.
 *
 * En test on bascule sur SQLite en mémoire : la suite doit tourner sur
 * n'importe quelle machine et en CI sans Postgres à côté. La production
 * reste sur PostgreSQL, et c'est elle qui fait foi (migrations).
 */
const commun = {
  logging: enProduction || enTest ? false : (msg) => logger.debug(msg),
  define: {
    freezeTableName: true,
    underscored: false,
    timestamps: true,
  },
}

let sequelize

if (enTest) {
  sequelize = new Sequelize({ ...commun, dialect: 'sqlite', storage: ':memory:' })
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME || 'mdld',
    process.env.DB_USER || 'mdld',
    process.env.DB_PASSWORD || '',
    {
      ...commun,
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 5432),
      dialect: 'postgres',
      pool: {
        max: Number(process.env.DB_POOL_MAX || 10),
        min: Number(process.env.DB_POOL_MIN || 0),
        idle: Number(process.env.DB_POOL_IDLE || 10000),
        acquire: Number(process.env.DB_POOL_ACQUIRE || 30000),
      },
      dialectOptions:
        process.env.DB_SSL === 'true'
          ? { ssl: { require: true, rejectUnauthorized: false } }
          : {},
    }
  )
}

/** Utilisé par /health : une API qui répond 200 sans base ment à son superviseur. */
async function verifierConnexion() {
  await sequelize.authenticate()
  return true
}

module.exports = { sequelize, verifierConnexion }
