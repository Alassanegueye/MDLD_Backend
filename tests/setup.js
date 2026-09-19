'use strict'

/**
 * Amorçage de la suite de tests.
 *
 * NODE_ENV=test bascule la base sur SQLite en mémoire (cf. config/db.js) :
 * la suite doit tourner sur n'importe quelle machine et en CI sans qu'un
 * PostgreSQL soit lancé à côté. La production, elle, reste sur Postgres
 * avec ses migrations.
 */
process.env.NODE_ENV = 'test'

// Secrets de test : distincts et assez longs pour passer les validations
// de démarrage de config/security.js.
process.env.JWT_ACCESS_SECRET = 'test-access-secret-aaaaaaaaaaaaaaaaaaaaaaaaaaaa'
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-bbbbbbbbbbbbbbbbbbbbbbbbbbbb'
process.env.JWT_RESET_SECRET = 'test-reset-secret-cccccccccccccccccccccccccccc'
process.env.CORS_ORIGINS = 'http://localhost:5173'
// 4 tours au lieu de 12 : bcrypt est volontairement lent, et la suite
// crée des dizaines de comptes. La production garde 12 (contrôlé au boot).
process.env.BCRYPT_ROUNDS = '4'

jest.setTimeout(30000)
