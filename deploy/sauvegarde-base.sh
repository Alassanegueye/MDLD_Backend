#!/usr/bin/env bash
# ============================================================
# Sauvegarde de la base MDLD
#
# À planifier par cron sur le serveur, par exemple chaque nuit :
#   15 2 * * * /opt/mdld/deploy/sauvegarde-base.sh >> /var/log/mdld-backup.log 2>&1
#
# Le dump est pris DANS le conteneur : pas besoin d'exposer PostgreSQL
# sur l'hôte, ce qui reste la règle en production.
# ============================================================
set -euo pipefail

DOSSIER_SAUVEGARDE="${DOSSIER_SAUVEGARDE:-/var/backups/mdld}"
CONTENEUR_BASE="${CONTENEUR_BASE:-mdld_base}"
RETENTION_JOURS="${RETENTION_JOURS:-14}"

# Les identifiants viennent du .env du projet, jamais du script.
RACINE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ -f "$RACINE/.env" ]]; then
  # shellcheck disable=SC1091
  set -a; source "$RACINE/.env"; set +a
fi

DB_NAME="${DB_NAME:-mdld}"
DB_USER="${DB_USER:-mdld}"

horodatage="$(date +%Y%m%d-%H%M%S)"
fichier="$DOSSIER_SAUVEGARDE/mdld-$horodatage.sql.gz"

mkdir -p "$DOSSIER_SAUVEGARDE"

echo "[$(date -Is)] Sauvegarde de $DB_NAME vers $fichier"

# --clean --if-exists : le dump est rejouable sur une base existante.
docker exec "$CONTENEUR_BASE" \
  pg_dump --username "$DB_USER" --dbname "$DB_NAME" --clean --if-exists \
  | gzip -9 > "$fichier"

# Un dump vide (base injoignable, mauvais identifiants) ne doit pas être
# conservé : il donnerait une fausse impression de sauvegarde valide.
taille=$(stat -c%s "$fichier" 2>/dev/null || stat -f%z "$fichier")
if [[ "$taille" -lt 1024 ]]; then
  echo "ERREUR : sauvegarde suspecte ($taille octets), fichier supprimé" >&2
  rm -f "$fichier"
  exit 1
fi

echo "[$(date -Is)] Sauvegarde terminée ($taille octets)"

# Rotation
find "$DOSSIER_SAUVEGARDE" -name 'mdld-*.sql.gz' -type f -mtime "+$RETENTION_JOURS" -delete
echo "[$(date -Is)] Sauvegardes de plus de $RETENTION_JOURS jours supprimées"

# Restauration :
#   gunzip -c mdld-AAAAMMJJ-HHMMSS.sql.gz | docker exec -i mdld_base psql -U mdld -d mdld
