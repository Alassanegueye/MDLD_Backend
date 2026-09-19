'use strict'

const request = require('supertest')
const app = require('../src/app')
const {
  reinitialiserBase,
  fermerBase,
  creerUtilisateur,
  creerProduit,
  commandeValide,
} = require('./aide')
const { prefixeApi } = require('../src/config/security')
const { Produit } = require('../src/models')

const BOUTIQUE = `${prefixeApi}/boutique`
const AUTH = `${prefixeApi}/admin/auth`

describe('Commandes de la boutique', () => {
  beforeAll(reinitialiserBase)
  afterAll(fermerBase)
  beforeEach(reinitialiserBase)

  test('une commande valide est enregistrée avec sa référence', async () => {
    const produit = await creerProduit({ prix: 25000, stock: 10 })

    const reponse = await request(app)
      .post(`${BOUTIQUE}/commandes`)
      .send(commandeValide([{ produitId: produit.id, quantite: 2 }]))

    expect(reponse.status).toBe(201)
    expect(reponse.body.data.reference).toMatch(/^MDLD-[A-Z2-9]{6}$/)
    expect(reponse.body.data.total).toBe(50000)
    expect(reponse.body.data.lignes).toHaveLength(1)
  })

  test('le total est recalculé côté serveur, jamais lu depuis le client', async () => {
    const produit = await creerProduit({ prix: 25000, stock: 10 })

    const reponse = await request(app)
      .post(`${BOUTIQUE}/commandes`)
      .send({
        ...commandeValide([{ produitId: produit.id, quantite: 1 }]),
        // Tentative de fraude : un total et un prix imposés par le navigateur.
        total: 1,
        sousTotal: 1,
        prix: 1,
      })

    expect(reponse.status).toBe(201)
    expect(reponse.body.data.total).toBe(25000)
    expect(reponse.body.data.lignes[0].prixUnitaire).toBe(25000)
  })

  test('les coordonnées du client sont obligatoires', async () => {
    const produit = await creerProduit()
    const articles = [{ produitId: produit.id, quantite: 1 }]

    const reponse = await request(app)
      .post(`${BOUTIQUE}/commandes`)
      .send({ articles })

    expect(reponse.status).toBe(422)
    const champs = reponse.body.details.map((d) => d.champ)
    expect(champs).toEqual(expect.arrayContaining(['prenom', 'nom', 'email', 'telephone']))
  })

  test('e-mail invalide refusé', async () => {
    const produit = await creerProduit()
    const reponse = await request(app)
      .post(`${BOUTIQUE}/commandes`)
      .send({
        ...commandeValide([{ produitId: produit.id, quantite: 1 }]),
        email: 'pas-un-email',
      })

    expect(reponse.status).toBe(422)
    expect(reponse.body.details.some((d) => d.champ === 'email')).toBe(true)
  })

  test('une livraison sans adresse est refusée', async () => {
    const produit = await creerProduit()
    const reponse = await request(app)
      .post(`${BOUTIQUE}/commandes`)
      .send({
        ...commandeValide([{ produitId: produit.id, quantite: 1 }]),
        modeLivraison: 'livraison',
      })

    expect(reponse.status).toBe(422)
    const champs = reponse.body.details.map((d) => d.champ)
    expect(champs).toEqual(expect.arrayContaining(['adresse', 'ville']))
  })

  test('la livraison ajoute des frais au total', async () => {
    const produit = await creerProduit({ prix: 10000, stock: 5 })
    const reponse = await request(app)
      .post(`${BOUTIQUE}/commandes`)
      .send({
        ...commandeValide([{ produitId: produit.id, quantite: 1 }]),
        modeLivraison: 'livraison',
        adresse: 'Cité Comico, villa 12',
        ville: 'Dakar',
      })

    expect(reponse.status).toBe(201)
    expect(reponse.body.data.fraisLivraison).toBe(2000)
    expect(reponse.body.data.total).toBe(12000)
  })

  test('un panier vide est refusé', async () => {
    const reponse = await request(app).post(`${BOUTIQUE}/commandes`).send(commandeValide([]))
    expect(reponse.status).toBe(422)
  })

  test('commander plus que le stock est refusé', async () => {
    const produit = await creerProduit({ stock: 2 })
    const reponse = await request(app)
      .post(`${BOUTIQUE}/commandes`)
      .send(commandeValide([{ produitId: produit.id, quantite: 5 }]))

    expect(reponse.status).toBe(409)
  })

  test('un article sur commande reste commandable sans stock', async () => {
    const produit = await creerProduit({ stock: null, surCommande: true })
    const reponse = await request(app)
      .post(`${BOUTIQUE}/commandes`)
      .send(commandeValide([{ produitId: produit.id, quantite: 3 }]))

    expect(reponse.status).toBe(201)
  })

  test('le stock est décrémenté puis rendu à l\'annulation', async () => {
    const produit = await creerProduit({ stock: 10 })
    await creerUtilisateur({ email: 'gestion@mdld.sn', permissions: ['all'] })

    const commande = await request(app)
      .post(`${BOUTIQUE}/commandes`)
      .send(commandeValide([{ produitId: produit.id, quantite: 3 }]))

    let apres = await Produit.findByPk(produit.id)
    expect(apres.stock).toBe(7)

    const connexion = await request(app)
      .post(`${AUTH}/connexion`)
      .send({ email: 'gestion@mdld.sn', motDePasse: 'MotDePasseTest123' })
    const jeton = connexion.body.data.accessToken

    await request(app)
      .patch(`${prefixeApi}/admin/commandes/${commande.body.data.id}/statut`)
      .set('Authorization', `Bearer ${jeton}`)
      .send({ statut: 'annulee' })

    apres = await Produit.findByPk(produit.id)
    expect(apres.stock).toBe(10)
  })

  test('les transitions de statut interdites sont bloquées', async () => {
    const produit = await creerProduit({ stock: 5 })
    await creerUtilisateur({ email: 'gestion@mdld.sn', permissions: ['all'] })

    const commande = await request(app)
      .post(`${BOUTIQUE}/commandes`)
      .send(commandeValide([{ produitId: produit.id, quantite: 1 }]))

    const connexion = await request(app)
      .post(`${AUTH}/connexion`)
      .send({ email: 'gestion@mdld.sn', motDePasse: 'MotDePasseTest123' })
    const jeton = connexion.body.data.accessToken

    // en_attente -> livree saute deux étapes : refusé.
    const saut = await request(app)
      .patch(`${prefixeApi}/admin/commandes/${commande.body.data.id}/statut`)
      .set('Authorization', `Bearer ${jeton}`)
      .send({ statut: 'livree' })

    expect(saut.status).toBe(409)
  })

  test('le suivi public exige la référence ET l\'e-mail', async () => {
    const produit = await creerProduit()
    const commande = await request(app)
      .post(`${BOUTIQUE}/commandes`)
      .send(commandeValide([{ produitId: produit.id, quantite: 1 }]))

    const reference = commande.body.data.reference

    // Bonne référence, mauvais e-mail : une référence devinée ne doit pas
    // suffire à lire les coordonnées d'un client.
    const mauvais = await request(app)
      .get(`${BOUTIQUE}/commandes/suivi`)
      .query({ reference, email: 'autre@test.sn' })
    expect(mauvais.status).toBe(404)

    const bon = await request(app)
      .get(`${BOUTIQUE}/commandes/suivi`)
      .query({ reference, email: 'client@test.sn' })
    expect(bon.status).toBe(200)
    // Les données internes ne sortent jamais côté public.
    expect(bon.body.data.noteInterne).toBeUndefined()
    expect(bon.body.data.adresseIp).toBeUndefined()
  })

  test('un produit désactivé n\'est plus commandable', async () => {
    const produit = await creerProduit({ actif: false })
    const reponse = await request(app)
      .post(`${BOUTIQUE}/commandes`)
      .send(commandeValide([{ produitId: produit.id, quantite: 1 }]))

    expect(reponse.status).toBe(400)
  })
})
