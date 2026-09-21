'use strict'

const crypto = require('crypto')
const bcrypt = require('bcryptjs')

/**
 * Jeu de données initial : compte administrateur et gammes de la boutique.
 *
 * Aucun produit n'est créé ici. Le catalogue se saisit depuis le dashboard :
 * un article semé en base finirait affiché sur le site vitrine comme s'il
 * était en vente, et personne ne saurait s'il est réel ou non.
 *
 * Le mot de passe administrateur vient de ADMIN_PASSWORD : aucun mot de
 * passe par défaut n'est écrit en dur ici, sinon il finirait en production.
 */
const CATEGORIES = [
  { nom: 'Éditions Limitées', slug: 'editions', ordre: 1 },
  { nom: 'Textiles', slug: 'textile', ordre: 2 },
  { nom: 'Papeterie d\'art', slug: 'papeterie', ordre: 3 },
  { nom: 'Spirituelle', slug: 'spirituelle', ordre: 4 },
]

module.exports = {
  async up(queryInterface) {
    const maintenant = new Date()

    // ---- Gammes ----
    // Structure vide, sans article : elle sert à classer les produits que
    // l'équipe saisira depuis le dashboard.
    await queryInterface.bulkInsert(
      'categories',
      CATEGORIES.map((c) => ({
        id: crypto.randomUUID(),
        nom: c.nom,
        slug: c.slug,
        description: null,
        ordre: c.ordre,
        active: true,
        createdAt: maintenant,
        updatedAt: maintenant,
      }))
    )

    // ---- Compte administrateur ----
    const motDePasse = process.env.ADMIN_PASSWORD
    if (!motDePasse) {
      throw new Error(
        'ADMIN_PASSWORD est absent : refus de créer un administrateur avec un mot de passe par défaut'
      )
    }

    await queryInterface.bulkInsert('utilisateurs', [
      {
        id: crypto.randomUUID(),
        email: (process.env.ADMIN_EMAIL || 'admin@mosqueedeladivinite.org').toLowerCase(),
        motDePasse: await bcrypt.hash(motDePasse, Number(process.env.BCRYPT_ROUNDS || 12)),
        nom: process.env.ADMIN_NOM || 'Administrateur',
        prenom: process.env.ADMIN_PRENOM || 'MDLD',
        role: 'admin',
        // ['all'] = accès total, déclaré explicitement (le modèle est strict :
        // un tableau vide ne donnerait aucun droit).
        permissions: JSON.stringify(['all']),
        actif: true,
        createdAt: maintenant,
        updatedAt: maintenant,
      },
    ])
  },

  async down(queryInterface) {
    // On ne touche pas à la table produits : le seeder n'en crée aucun, et
    // un bulkDelete ici effacerait le catalogue réel saisi par l'équipe.
    await queryInterface.bulkDelete('categories', { slug: CATEGORIES.map((c) => c.slug) }, {})
    await queryInterface.bulkDelete('utilisateurs', { role: 'admin' }, {})
  },
}
