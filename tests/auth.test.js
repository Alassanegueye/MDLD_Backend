'use strict'

const request = require('supertest')
const app = require('../src/app')
const { reinitialiserBase, fermerBase, creerUtilisateur } = require('./aide')
const { prefixeApi } = require('../src/config/security')

const AUTH = `${prefixeApi}/admin/auth`

describe('Authentification du dashboard', () => {
  beforeAll(reinitialiserBase)
  afterAll(fermerBase)

  beforeEach(async () => {
    await reinitialiserBase()
    await creerUtilisateur({ email: 'admin@mdld.sn', motDePasse: 'MotDePasseTest123' })
  })

  test('connexion réussie avec les bons identifiants', async () => {
    const reponse = await request(app)
      .post(`${AUTH}/connexion`)
      .send({ email: 'admin@mdld.sn', motDePasse: 'MotDePasseTest123' })

    expect(reponse.status).toBe(200)
    expect(reponse.body.success).toBe(true)
    expect(reponse.body.data.accessToken).toBeDefined()
    expect(reponse.body.data.refreshToken).toBeDefined()
    // Le hash ne doit jamais sortir de l'API, même dans l'objet utilisateur.
    expect(reponse.body.data.utilisateur.motDePasse).toBeUndefined()
  })

  test('l\'e-mail est insensible à la casse', async () => {
    const reponse = await request(app)
      .post(`${AUTH}/connexion`)
      .send({ email: 'ADMIN@MDLD.SN', motDePasse: 'MotDePasseTest123' })

    expect(reponse.status).toBe(200)
  })

  test('mauvais mot de passe : 401', async () => {
    const reponse = await request(app)
      .post(`${AUTH}/connexion`)
      .send({ email: 'admin@mdld.sn', motDePasse: 'MauvaisMotDePasse' })

    expect(reponse.status).toBe(401)
    expect(reponse.body.success).toBe(false)
  })

  test('compte inexistant et mot de passe faux renvoient le MÊME message', async () => {
    // Sinon la différence de message permet d'énumérer les comptes existants.
    const inconnu = await request(app)
      .post(`${AUTH}/connexion`)
      .send({ email: 'personne@mdld.sn', motDePasse: 'MotDePasseTest123' })
    const mauvais = await request(app)
      .post(`${AUTH}/connexion`)
      .send({ email: 'admin@mdld.sn', motDePasse: 'MauvaisMotDePasse' })

    expect(inconnu.status).toBe(401)
    expect(mauvais.status).toBe(401)
    expect(inconnu.body.message).toBe(mauvais.body.message)
  })

  test('compte désactivé : 403', async () => {
    await creerUtilisateur({
      email: 'inactif@mdld.sn',
      motDePasse: 'MotDePasseTest123',
      actif: false,
    })

    const reponse = await request(app)
      .post(`${AUTH}/connexion`)
      .send({ email: 'inactif@mdld.sn', motDePasse: 'MotDePasseTest123' })

    expect(reponse.status).toBe(403)
  })

  test('le refresh token fait tourner la session et révoque l\'ancien', async () => {
    const connexion = await request(app)
      .post(`${AUTH}/connexion`)
      .send({ email: 'admin@mdld.sn', motDePasse: 'MotDePasseTest123' })

    const ancien = connexion.body.data.refreshToken

    const premier = await request(app).post(`${AUTH}/rafraichir`).send({ refreshToken: ancien })
    expect(premier.status).toBe(200)
    expect(premier.body.data.accessToken).toBeDefined()

    // Rejouer l'ancien jeton doit échouer : c'est la signature d'un vol.
    const rejeu = await request(app).post(`${AUTH}/rafraichir`).send({ refreshToken: ancien })
    expect(rejeu.status).toBe(401)
  })

  test('/moi exige un jeton valide', async () => {
    const sansJeton = await request(app).get(`${AUTH}/moi`)
    expect(sansJeton.status).toBe(401)

    const bidon = await request(app).get(`${AUTH}/moi`).set('Authorization', 'Bearer nimportequoi')
    expect(bidon.status).toBe(401)

    const connexion = await request(app)
      .post(`${AUTH}/connexion`)
      .send({ email: 'admin@mdld.sn', motDePasse: 'MotDePasseTest123' })

    const ok = await request(app)
      .get(`${AUTH}/moi`)
      .set('Authorization', `Bearer ${connexion.body.data.accessToken}`)

    expect(ok.status).toBe(200)
    expect(ok.body.data.email).toBe('admin@mdld.sn')
  })

  test('la déconnexion révoque la session', async () => {
    const connexion = await request(app)
      .post(`${AUTH}/connexion`)
      .send({ email: 'admin@mdld.sn', motDePasse: 'MotDePasseTest123' })

    const refreshToken = connexion.body.data.refreshToken
    await request(app).post(`${AUTH}/deconnexion`).send({ refreshToken })

    const apres = await request(app).post(`${AUTH}/rafraichir`).send({ refreshToken })
    expect(apres.status).toBe(401)
  })
})
