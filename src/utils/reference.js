'use strict'

const crypto = require('crypto')

/**
 * Référence de commande lisible par un humain au téléphone : MDLD-9F3K2A.
 *
 * Pourquoi pas l'UUID : le client passe commande puis appelle la mosquée
 * pour la retirer ; dicter un UUID est impraticable. La référence courte
 * sert à la conversation, l'UUID reste la clé technique.
 * Alphabet sans I, O, 0 ni 1 pour éviter les confusions à l'oral.
 */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function genererReference(prefixe = 'MDLD') {
  let suffixe = ''
  const octets = crypto.randomBytes(6)
  for (let i = 0; i < 6; i += 1) {
    suffixe += ALPHABET[octets[i] % ALPHABET.length]
  }
  return `${prefixe}-${suffixe}`
}

module.exports = { genererReference }
