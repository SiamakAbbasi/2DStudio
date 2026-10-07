#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")/.."
if [ ! -f .env.production ]; then
  umask 077
  cat > .env.production <<EOF
VPS_HOST=217.160.50.62
APP_PORT=8088
POSTGRES_PASSWORD=$(openssl rand -hex 24)
SESSION_SECRET=$(openssl rand -hex 48)
EOF
fi

set -a
. ./.env.production
set +a

docker compose --env-file .env.production -f docker-compose.prod.yml build
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --remove-orphans
docker compose --env-file .env.production -f docker-compose.prod.yml ps

if command -v ufw >/dev/null 2>&1 && ufw status | grep -q '^Status: active'; then
  ufw allow "${APP_PORT}/tcp" >/dev/null
fi

attempt=0
until curl -fsS "http://127.0.0.1:${APP_PORT}/api/health" >/dev/null; do
  attempt=$((attempt + 1))
  [ "$attempt" -lt 30 ] || { docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=100 app; exit 1; }
  sleep 2
done
echo "Deployment healthy at http://${VPS_HOST}:${APP_PORT}"
