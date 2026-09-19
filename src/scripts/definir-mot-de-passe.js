'use strict'

require('dotenv').config()

const { sequelize, Utilisateur } = require('../models')
const authService = require('../services/auth.service')

/**
 * Réinitialise le mot de passe d'un compte depuis le serveur.
 *
 * Utilisation :
 *   node src/scripts/definir-mot-de-passe.js <email> <nouveau-mot-de-passe>
 *
 * Pourquoi un script et pas une route : la réinitialisation sans preuve
 * d'identité ne doit exister nulle part dans l'API. Elle exige un accès
 * au serveur, ce qui est déjà une preuve suffisante.
 *
 * Le hachage est fait par le hook du modèle : aucun mot de passe en clair
 * ne peut atteindre la base, même par ce chemin.
 */
async function principal() {
  const [email, nouveauMotDePasse] = process.argv.slice(2)

  if (!email || !nouveauMotDePasse) {
    console.error('Usage : node src/scripts/definir-mot-de-passe.js <email> <mot-de-passe>')
    process.exit(1)
  }

  await sequelize.authenticate()

  const utilisateur = await Utilisateur.scope('avecMotDePasse').findOne({
    where: { email: email.trim().toLowerCase() },
  })

  if (!utilisateur) {
    console.error(`Aucun compte avec l'adresse ${email}`)
    process.exit(1)
  }

  utilisateur.motDePasse = nouveauMotDePasse
  await utilisateur.save()

  // Toutes les sessions ouvertes deviennent caduques : un mot de passe
  // change justement quand on soupçonne qu'il a fuité.
  await authService.deconnexion(null, {
    toutesLesSessions: true,
    utilisateurId: utilisateur.id,
  })

  if (nouveauMotDePasse.length < 10) {
    console.warn(
      `\n  ATTENTION : « ${nouveauMotDePasse} » fait ${nouveauMotDePasse.length} caractères.\n` +
        '  Acceptable en développement local, à proscrire sur un serveur exposé.\n'
    )
  }

  console.log(`Mot de passe de ${utilisateur.email} mis à jour. Sessions révoquées.`)
  await sequelize.close()
}

principal().catch(async (erreur) => {
  console.error('Échec :', erreur.message)
  await sequelize.close().catch(() => {})
  process.exit(1)
})
