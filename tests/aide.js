'use strict'

const { sequelize, Utilisateur, Categorie, Produit } = require('../src/models')

/** Recrée un schéma vierge avant chaque fichier de tests. */
async function reinitialiserBase() {
  await sequelize.sync({ force: true })
}

async function fermerBase() {
  await sequelize.close()
}

/** Crée un compte de test. Par défaut : administrateur tous droits. */
async function creerUtilisateur(surcharges = {}) {
  return Utilisateur.create({
    email: surcharges.email || `admin${Date.now()}@test.sn`,
    motDePasse: surcharges.motDePasse || 'MotDePasseTest123',
    nom: surcharges.nom || 'Test',
    prenom: surcharges.prenom || 'Compte',
    role: surcharges.role || 'admin',
    permissions: surcharges.permissions !== undefined ? surcharges.permissions : ['all'],
    actif: surcharges.actif !== undefined ? surcharges.actif : true,
  })
}

/** Catégorie + produit prêts à commander. */
async function creerProduit(surcharges = {}) {
  const categorie = await Categorie.create({
    nom: 'Textiles',
    slug: `textile-${Math.random().toString(36).slice(2, 8)}`,
  })

  return Produit.create({
    reference: surcharges.reference || `REF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    nom: surcharges.nom || 'Hoodie de test',
    slug: surcharges.slug || `hoodie-${Math.random().toString(36).slice(2, 8)}`,
    prix: surcharges.prix !== undefined ? surcharges.prix : 25000,
    categorieId: categorie.id,
    stock: surcharges.stock !== undefined ? surcharges.stock : 10,
    surCommande: surcharges.surCommande || false,
    actif: surcharges.actif !== undefined ? surcharges.actif : true,
  })
}

/** Client de commande valide, à surcharger champ par champ dans les tests. */
function commandeValide(articles) {
  return {
    prenom: 'Alassane',
    nom: 'Gueye',
    email: 'client@test.sn',
    telephone: '+221 77 123 45 67',
    modeLivraison: 'retrait',
    articles,
  }
}

module.exports = {
  reinitialiserBase,
  fermerBase,
  creerUtilisateur,
  creerProduit,
  commandeValide,
  sequelize,
}
