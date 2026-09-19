'use strict'

const path = require('path')
const winston = require('winston')
const { enProduction, enTest } = require('../config/security')

const dossierLogs = process.env.LOG_DIR || 'logs'

// En développement : sortie colorée et lisible à l'œil.
// En production : JSON, parce que les logs sont agrégés par une machine.
const formatDev = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...reste }) => {
    const extra = Object.keys(reste).length ? ' ' + JSON.stringify(reste) : ''
    return `${timestamp} ${level} ${message}${extra}`
  })
)

const formatProd = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
)

const transports = [
  new winston.transports.Console({
    // Les tests n'ont pas à polluer la sortie : seules les erreurs remontent.
    silent: enTest,
  }),
]

if (enProduction) {
  // Rotation par taille : évite qu'un incident remplisse le disque.
  transports.push(
    new winston.transports.File({
      filename: path.join(dossierLogs, 'erreurs.log'),
      level: 'error',
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(dossierLogs, 'application.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    })
  )
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (enProduction ? 'info' : 'debug'),
  format: enProduction ? formatProd : formatDev,
  transports,
  exitOnError: false,
})

// Adaptateur pour morgan, qui écrit dans un flux
logger.stream = {
  write: (message) => logger.http ? logger.http(message.trim()) : logger.info(message.trim()),
}

module.exports = logger
