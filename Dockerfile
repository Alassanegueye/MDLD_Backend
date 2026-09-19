# ============================================================
# Backend MDLD — image de production
# Multi-stage : les outils de compilation (node-gyp pour bcrypt,
# sqlite3…) restent dans l'étage de build et ne partent pas en prod.
# ============================================================

# ---------- Étage 1 : dépendances ----------
FROM node:22-alpine AS deps

WORKDIR /app

# python3/make/g++ sont nécessaires aux modules natifs. Ils disparaissent
# avec cet étage : les garder gonflerait l'image et sa surface d'attaque.
RUN apk add --no-cache python3 make g++

COPY package*.json ./
# npm ci : installation reproductible à partir du lock. --omit=dev retire
# jest, nodemon et sqlite3 de l'image finale.
RUN npm ci --omit=dev

# ---------- Étage 2 : image finale ----------
FROM node:22-alpine AS runtime

# tini : sans init, Node reçoit PID 1 et ignore SIGTERM — le conteneur
# est alors tué de force au redéploiement, coupant les requêtes en cours.
RUN apk add --no-cache tini curl

ENV NODE_ENV=production \
    PORT=4000

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src

# Les logs sont écrits par l'application : le dossier doit appartenir à
# l'utilisateur non-root, sinon winston échoue au premier fichier.
RUN mkdir -p logs && chown -R node:node /app

# Jamais root : une exécution de code arbitraire dans le conteneur
# resterait cantonnée à un compte sans privilèges.
USER node

EXPOSE 4000

# La sonde interroge /health, qui vérifie réellement la base.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1:4000/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/server.js"]
