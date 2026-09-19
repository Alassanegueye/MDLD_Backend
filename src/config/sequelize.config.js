'use strict'

// Configuration destinée à sequelize-cli (migrations et seeders).
// Séparée de config/db.js car la CLI n'exécute pas l'application :
// elle a seulement besoin des identifiants de connexion.
require('dotenv').config()

const base = {
  username: process.env.DB_USER || 'mdld',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mdld',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  dialect: 'postgres',
  dialectOptions:
    process.env.DB_SSL === 'true'
      ? { ssl: { require: true, rejectUnauthorized: false } }
      : {},
}

module.exports = {
  development: base,
  test: { ...base, database: (process.env.DB_NAME || 'mdld') + '_test' },
  production: base,
}
