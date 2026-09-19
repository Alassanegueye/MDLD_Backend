'use strict'

const request = require('supertest')
const app = require('../src/app')
const { reinitialiserBase, fermerBase, creerUtilisateur, creerProduit } = require('./aide')
const { prefixeApi } = require('../src/config/security')

const AUTH = `${prefixeApi}/admin/auth`
const PRODUITS = `${prefixeApi}/admin/produits`

/** Connecte un compte et renvoie son access token. */
async function jetonDe(email, motDePasse = 'MotDePasseTest123') {
  const reponse = await request(app).post(`${AUTH}/connexion`).send({ email, motDePasse })
  return reponse.body.data.accessToken
}

describe('Chaîne d\'autorisation', () => {
  beforeAll(reinitialiserBase)
  afterAll(fermerBase)
  beforeEach(reinitialiserBase)

  test('un compte SANS permission ne peut rien lire (modèle strict)', async () => {
    // Le piège classique est d'accorder l'accès par défaut quand la liste
    // de permissions est vide : ici, vide = aucun droit.
    await creerUtilisateur({ email: 'vide@mdld.sn', role: 'gestionnaire', permissions: [] })
    const jeton = await jetonDe('vide@mdld.sn')

    const reponse = await request(app).get(PRODUITS).set('Authorization', `Bearer ${jeton}`)
    expect(reponse.status).toBe(403)
  })

  test('une permission ciblée ouvre la lecture mais pas l\'écriture', async () => {
    await creerUtilisateur({
      email: 'lecteur@mdld.sn',
      role: 'gestionnaire',
      permissions: ['produits.lire'],
    })
    const jeton = await jetonDe('lecteur@mdld.sn')

    const lecture = await request(app).get(PRODUITS).set('Authorization', `Bearer ${jeton}`)
    expect(lecture.status).toBe(200)

    const ecriture = await request(app)
      .post(PRODUITS)
      .set('Authorization', `Bearer ${jeton}`)
      .send({ reference: 'X-1', nom: 'Test', prix: 1000 })
    expect(ecriture.status).toBe(403)
  })

  test('["all"] ouvre tout', async () => {
    await creerUtilisateur({ email: 'patron@mdld.sn', permissions: ['all'] })
    const jeton = await jetonDe('patron@mdld.sn')

    const reponse = await request(app)
      .post(PRODUITS)
      .set('Authorization', `Bearer ${jeton}`)
      .send({ reference: 'ALL-1', nom: 'Produit complet', prix: 5000 })

    expect(reponse.status).toBe(201)
    expect(reponse.body.data.slug).toBe('produit-complet')
  })

  test('un compte désactivé après émission du jeton perd l\'accès', async () => {
    const utilisateur = await creerUtilisateur({ email: 'suspendu@mdld.sn', permissions: ['all'] })
    const jeton = await jetonDe('suspendu@mdld.sn')

    // Le jeton reste cryptographiquement valide : c'est checkActiveUser
    // qui doit fermer la porte, sans attendre son expiration.
    await utilisateur.update({ actif: false })

    const reponse = await request(app).get(PRODUITS).set('Authorization', `Bearer ${jeton}`)
    expect(reponse.status).toBe(403)
  })

  test('le journal d\'audit est réservé au rôle admin', async () => {
    await creerUtilisateur({
      email: 'gestion@mdld.sn',
      role: 'gestionnaire',
      permissions: ['all'],
    })
    const jeton = await jetonDe('gestion@mdld.sn')

    const reponse = await request(app)
      .get(`${prefixeApi}/admin/journal`)
      .set('Authorization', `Bearer ${jeton}`)

    expect(reponse.status).toBe(403)
  })

  test('les routes publiques restent ouvertes sans jeton', async () => {
    await creerProduit({ nom: 'Article public' })

    const reponse = await request(app).get(`${prefixeApi}/boutique/produits`)
    expect(reponse.status).toBe(200)
    expect(reponse.body.data.items.length).toBe(1)
  })
})
