'use strict'

const crypto = require('crypto')

/**
 * Catalogue de la boutique patrimoine.
 *
 * Ce sont les articles réellement proposés à la vente, repris de la
 * maquette du site vitrine où ils vivaient en dur. Ils passent en base
 * pour que l'équipe puisse en changer le prix, le stock ou la photo sans
 * redéploiement.
 *
 * Les visuels ne sont pas semés ici : ils se téléversent depuis le
 * dashboard, ce qui évite qu'une même image vive dans le dépôt du front
 * et en base.
 *
 * Le seeder est idempotent sur la référence : relancé, il n'écrase ni ne
 * duplique un article dont l'équipe aurait déjà ajusté le prix.
 */
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
    // Fabriqué à la demande : stock null, mais toujours commandable.
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
  async up(queryInterface, Sequelize) {
    const maintenant = new Date()

    const gammes = await queryInterface.sequelize.query(
      'SELECT id, slug FROM categories',
      { type: Sequelize.QueryTypes.SELECT }
    )
    const idParSlug = new Map(gammes.map((g) => [g.slug, g.id]))

    // Un article déjà présent n'est pas réinséré : sa référence est unique
    // et l'équipe a pu en ajuster le prix depuis le dashboard.
    const existants = await queryInterface.sequelize.query(
      'SELECT reference FROM produits',
      { type: Sequelize.QueryTypes.SELECT }
    )
    const dejaLa = new Set(existants.map((p) => p.reference))

    const aInserer = PRODUITS.filter((p) => !dejaLa.has(p.reference)).map((p) => ({
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

    if (aInserer.length) await queryInterface.bulkInsert('produits', aInserer)
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('produits', {
      reference: { [Sequelize.Op.in]: PRODUITS.map((p) => p.reference) },
    })
  },
}
