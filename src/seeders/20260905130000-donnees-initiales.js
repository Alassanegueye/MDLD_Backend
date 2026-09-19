'use strict'

const crypto = require('crypto')
const bcrypt = require('bcryptjs')

/**
 * Jeu de données initial : compte administrateur, gammes et catalogue
 * repris du site vitrine.
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

const PRODUITS = [
  {
    reference: 'MDLD-PUZ-001',
    nom: 'Puzzle · Façade',
    slug: 'puzzle-facade',
    description:
      "Assembler la mosquée pièce par pièce. Ce que des mains ont bâti, d'autres mains le reconstituent.",
    prix: 45000,
    categorie: 'editions',
    badge: 'Édition limitée',
    enVedette: true,
    stock: 20,
    ordre: 1,
  },
  {
    reference: 'MDLD-TOT-001',
    nom: 'Tote Bag · Jub',
    slug: 'tote-bag-jub',
    description:
      'Les trois mots en calligraphie sur le fond vert de la mosquée. Le message à porter chaque jour.',
    prix: 15000,
    categorie: 'textile',
    enVedette: true,
    stock: 60,
    ordre: 2,
  },
  {
    reference: 'MDLD-HOO-001',
    nom: 'Hoodie · Héritage',
    slug: 'hoodie-heritage',
    description: 'Molleton lourd, coupe architecturale et insigne brodé de Masdjidou Rabbani.',
    prix: 25000,
    categorie: 'textile',
    enVedette: true,
    stock: 35,
    ordre: 3,
  },
  {
    reference: 'MDLD-CAR-001',
    nom: 'Carnet · 1973',
    slug: 'carnet-1973',
    description: 'Couverture inspirée du cahier où Sangabi a dessiné la mosquée révélée en songe.',
    prix: 20000,
    categorie: 'papeterie',
    enVedette: true,
    stock: 80,
    ordre: 4,
  },
  {
    reference: 'MDLD-POL-001',
    nom: 'Polo Officiel',
    slug: 'polo-officiel',
    description: 'Piqué de coton premium, broderie dorée.',
    prix: 12500,
    categorie: 'textile',
    stock: 40,
    ordre: 5,
  },
  {
    reference: 'MDLD-THE-001',
    nom: 'Thermos Signature',
    slug: 'thermos-signature',
    description: 'Acier inoxydable, isolation 24h.',
    prix: 18000,
    categorie: 'textile',
    stock: 25,
    ordre: 6,
  },
  {
    reference: 'MDLD-VES-001',
    nom: 'Vestes Équipes',
    slug: 'vestes-equipes',
    description: 'Accueil, Logistique & Media.',
    prix: 30000,
    categorie: 'textile',
    // Fabriqué à la demande : pas de stock, mais toujours commandable.
    stock: null,
    surCommande: true,
    ordre: 7,
  },
  {
    reference: 'MDLD-NAT-001',
    nom: 'Natte de Prière',
    slug: 'natte-de-priere',
    description: 'Tissage artisanal, motifs géométriques inspirés de la coupole centrale.',
    prix: 22000,
    categorie: 'spirituelle',
    stock: 30,
    ordre: 8,
  },
  {
    reference: 'MDLD-TAS-001',
    nom: 'Tasbih & Parfums',
    slug: 'tasbih-parfums',
    description: "Coffret précieux : bois d'ébène et essences pures de musc.",
    prix: 28000,
    categorie: 'spirituelle',
    stock: 18,
    ordre: 9,
  },
  {
    reference: 'MDLD-DAT-001',
    nom: 'Dattes de Prestige',
    slug: 'dattes-de-prestige',
    description: 'Sélection exclusive pour le mois béni et les occasions sacrées.',
    prix: 10000,
    categorie: 'spirituelle',
    stock: 100,
    ordre: 10,
  },
]

module.exports = {
  async up(queryInterface) {
    const maintenant = new Date()

    // ---- Catégories ----
    const categories = CATEGORIES.map((c) => ({
      id: crypto.randomUUID(),
      nom: c.nom,
      slug: c.slug,
      description: null,
      ordre: c.ordre,
      active: true,
      createdAt: maintenant,
      updatedAt: maintenant,
    }))
    await queryInterface.bulkInsert('categories', categories)

    const idParSlug = new Map(categories.map((c) => [c.slug, c.id]))

    // ---- Produits ----
    await queryInterface.bulkInsert(
      'produits',
      PRODUITS.map((p) => ({
        id: crypto.randomUUID(),
        reference: p.reference,
        nom: p.nom,
        slug: p.slug,
        description: p.description,
        prix: p.prix,
        devise: 'FCFA',
        categorieId: idParSlug.get(p.categorie) || null,
        image: null,
        stock: p.stock === undefined ? null : p.stock,
        surCommande: Boolean(p.surCommande),
        badge: p.badge || null,
        enVedette: Boolean(p.enVedette),
        actif: true,
        ordre: p.ordre,
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
    await queryInterface.bulkDelete('produits', null, {})
    await queryInterface.bulkDelete('categories', null, {})
    await queryInterface.bulkDelete('utilisateurs', { role: 'admin' }, {})
  },
}
