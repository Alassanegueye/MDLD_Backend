'use strict'

/**
 * Vérification du type réel d'un fichier par sa signature binaire.
 *
 * La whitelist MIME seule ne protège de rien : le Content-Type est fourni
 * par le client, donc un exécutable renommé « photo.png » la traverse.
 * On relit donc les premiers octets du tampon.
 */
const SIGNATURES = [
  { mime: 'image/jpeg', octets: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', octets: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  // WEBP = « RIFF » .... « WEBP » : le conteneur RIFF impose de sauter 4 octets de taille
  { mime: 'image/webp', octets: [0x52, 0x49, 0x46, 0x46], suite: { offset: 8, octets: [0x57, 0x45, 0x42, 0x50] } },
]

function correspond(buffer, octets, offset = 0) {
  if (!buffer || buffer.length < offset + octets.length) return false
  return octets.every((o, i) => buffer[offset + i] === o)
}

/** Renvoie le type MIME réel du tampon, ou null si aucune signature connue. */
function typeReel(buffer) {
  for (const sig of SIGNATURES) {
    if (!correspond(buffer, sig.octets)) continue
    if (sig.suite && !correspond(buffer, sig.suite.octets, sig.suite.offset)) continue
    return sig.mime
  }
  return null
}

/** Le fichier est-il réellement d'un des types autorisés ? */
function estTypeAutorise(buffer, mimesAutorises) {
  const reel = typeReel(buffer)
  return reel !== null && mimesAutorises.includes(reel)
}

module.exports = { typeReel, estTypeAutorise }
