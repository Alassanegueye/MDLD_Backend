'use strict'

const request = require('supertest')
const app = require('../src/app')
const { reinitialiserBase, fermerBase, creerUtilisateur } = require('./aide')
const { prefixeApi } = require('../src/config/security')

const AUTH = `${prefixeApi}/admin/auth`
const COMPTES = `${prefixeApi}/admin/utilisateurs`

async function jetonDe(email, motDePasse = 'MotDePasseTest123') {
  const r = await request(app).post(`${AUTH}/connexion`).send({ email, motDePasse })
  return r.body.data.accessToken
}

describe('Gestion des comptes d\'administration', () => {
  beforeAll(reinitialiserBase)
  afterAll(fermerBase)
  beforeEach(reinitialiserBase)

  test('un administrateur crée un compte', async () => {
    await creerUtilisateur({ email: 'patron@mdld.sn', role: 'admin' })
    const jeton = await jetonDe('patron@mdld.sn')

    const reponse = await request(app)
      .post(COMPTES)
      .set('Authorization', `Bearer ${jeton}`)
      .send({
        email: 'Nouveau@MDLD.SN',
        motDePasse: 'MotDePasseSolide2026',
        prenom: 'Awa',
        nom: 'Diop',
        role: 'gestionnaire',
        permissions: ['commandes.lire'],
      })

    expect(reponse.status).toBe(201)
    // L'e-mail est normalisé en minuscules à l'enregistrement.
    expect(reponse.body.data.email).toBe('nouveau@mdld.sn')
    // Le hash ne sort jamais de l'API, même à la création.
    expect(reponse.body.data.motDePasse).toBeUndefined()
  })

  test('le compte créé peut se connecter', async () => {
    await creerUtilisateur({ email: 'patron@mdld.sn', role: 'admin' })
    const jeton = await jetonDe('patron@mdld.sn')

    await request(app)
      .post(COMPTES)
      .set('Authorization', `Bearer ${jeton}`)
      .send({
        email: 'awa@mdld.sn',
        motDePasse: 'MotDePasseSolide2026',
        prenom: 'Awa',
        nom: 'Diop',
      })

    const connexion = await request(app)
      .post(`${AUTH}/connexion`)
      .send({ email: 'awa@mdld.sn', motDePasse: 'MotDePasseSolide2026' })

    expect(connexion.status).toBe(200)
  })

  test('un e-mail déjà utilisé est refusé', async () => {
    await creerUtilisateur({ email: 'patron@mdld.sn', role: 'admin' })
    const jeton = await jetonDe('patron@mdld.sn')

    const reponse = await request(app)
      .post(COMPTES)
      .set('Authorization', `Bearer ${jeton}`)
      .send({
        email: 'patron@mdld.sn',
        motDePasse: 'MotDePasseSolide2026',
        prenom: 'Autre',
        nom: 'Personne',
      })

    expect(reponse.status).toBe(409)
  })

  test('un mot de passe trop court est refusé à la création', async () => {
    await creerUtilisateur({ email: 'patron@mdld.sn', role: 'admin' })
    const jeton = await jetonDe('patron@mdld.sn')

    const reponse = await request(app)
      .post(COMPTES)
      .set('Authorization', `Bearer ${jeton}`)
      .send({ email: 'court@mdld.sn', motDePasse: 'court', prenom: 'Awa', nom: 'Diop' })

    expect(reponse.status).toBe(422)
  })

  test('un gestionnaire ne peut pas gérer les comptes, même avec ["all"]', async () => {
    // Distribuer des droits est une prérogative du rôle admin, pas une
    // permission qu'on pourrait s'accorder.
    await creerUtilisateur({ email: 'gestion@mdld.sn', role: 'gestionnaire', permissions: ['all'] })
    const jeton = await jetonDe('gestion@mdld.sn')

    const liste = await request(app).get(COMPTES).set('Authorization', `Bearer ${jeton}`)
    expect(liste.status).toBe(403)

    const creation = await request(app)
      .post(COMPTES)
      .set('Authorization', `Bearer ${jeton}`)
      .send({ email: 'x@mdld.sn', motDePasse: 'MotDePasseSolide2026', prenom: 'X', nom: 'Y' })
    expect(creation.status).toBe(403)
  })

  test('on ne peut pas modifier son propre rôle ni ses permissions', async () => {
    const moi = await creerUtilisateur({ email: 'patron@mdld.sn', role: 'admin' })
    const jeton = await jetonDe('patron@mdld.sn')

    const reponse = await request(app)
      .patch(`${COMPTES}/${moi.id}`)
      .set('Authorization', `Bearer ${jeton}`)
      .send({ role: 'gestionnaire' })

    expect(reponse.status).toBe(403)
  })

  test('on ne peut pas se désactiver ni se supprimer soi-même', async () => {
    const moi = await creerUtilisateur({ email: 'patron@mdld.sn', role: 'admin' })
    const jeton = await jetonDe('patron@mdld.sn')

    const desactivation = await request(app)
      .patch(`${COMPTES}/${moi.id}`)
      .set('Authorization', `Bearer ${jeton}`)
      .send({ actif: false })
    expect(desactivation.status).toBe(403)

    const suppression = await request(app)
      .delete(`${COMPTES}/${moi.id}`)
      .set('Authorization', `Bearer ${jeton}`)
    expect(suppression.status).toBe(403)
  })

  test('le dernier administrateur actif ne peut pas être désactivé', async () => {
    // Sans lui, plus personne n'accède à l'administration : il faudrait
    // repasser par la base de données pour rouvrir la porte.
    const patron = await creerUtilisateur({ email: 'patron@mdld.sn', role: 'admin' })
    const second = await creerUtilisateur({ email: 'second@mdld.sn', role: 'admin' })
    const jeton = await jetonDe('second@mdld.sn')

    // Deux admins : la désactivation du premier passe.
    const premier = await request(app)
      .patch(`${COMPTES}/${patron.id}`)
      .set('Authorization', `Bearer ${jeton}`)
      .send({ actif: false })
    expect(premier.status).toBe(200)

    // « second » est désormais seul : il ne peut pas se retirer non plus.
    const dernier = await request(app)
      .patch(`${COMPTES}/${second.id}`)
      .set('Authorization', `Bearer ${jeton}`)
      .send({ actif: false })
    expect(dernier.status).toBe(403)
  })

  test('un administrateur réinitialise le mot de passe d\'un autre compte', async () => {
    await creerUtilisateur({ email: 'patron@mdld.sn', role: 'admin' })
    const cible = await creerUtilisateur({ email: 'awa@mdld.sn', role: 'gestionnaire' })
    const jeton = await jetonDe('patron@mdld.sn')

    const reponse = await request(app)
      .post(`${COMPTES}/${cible.id}/mot-de-passe`)
      .set('Authorization', `Bearer ${jeton}`)
      .send({ nouveauMotDePasse: 'NouveauMotDePasse2026' })

    expect(reponse.status).toBe(200)

    const connexion = await request(app)
      .post(`${AUTH}/connexion`)
      .send({ email: 'awa@mdld.sn', motDePasse: 'NouveauMotDePasse2026' })
    expect(connexion.status).toBe(200)
  })

  test('chacun met à jour son profil, sans toucher à ses droits', async () => {
    await creerUtilisateur({ email: 'gestion@mdld.sn', role: 'gestionnaire', permissions: ['commandes.lire'] })
    const jeton = await jetonDe('gestion@mdld.sn')

    const reponse = await request(app)
      .patch(`${AUTH}/moi`)
      .set('Authorization', `Bearer ${jeton}`)
      .send({ prenom: 'Awa', nom: 'Diop', telephone: '+221 77 000 11 22', role: 'admin' })

    expect(reponse.status).toBe(200)
    expect(reponse.body.data.prenom).toBe('Awa')
    // `role` est retiré par stripUnknown : l'élévation est impossible.
    expect(reponse.body.data.role).toBe('gestionnaire')
  })
})
