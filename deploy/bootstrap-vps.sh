#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")/.."
if [ ! -f .env.production ]; then
  umask 077
  cat > .env.production <<EOF
VPS_HOST=217.160.50.62
APP_PORT=80
POSTGRES_PASSWORD=$(openssl rand -hex 24)
SESSION_SECRET=$(openssl rand -hex 48)
EOF
fi

if [ "${DEPLOY_HTTP_PORT:-}" != "" ]; then
  if [ "${DEPLOY_HTTP_PORT}" != "8088" ] && ss -H -ltn "sport = :${DEPLOY_HTTP_PORT}" | grep -q .; then
    ss -lntp "sport = :${DEPLOY_HTTP_PORT}" || true
    echo "Port ${DEPLOY_HTTP_PORT} is already in use; refusing to replace an unrelated service." >&2
    exit 1
  fi
  if grep -q '^APP_PORT=' .env.production; then
    sed -i "s/^APP_PORT=.*/APP_PORT=${DEPLOY_HTTP_PORT}/" .env.production
  else
    printf '\nAPP_PORT=%s\n' "${DEPLOY_HTTP_PORT}" >> .env.production
  fi
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
if command -v firewall-cmd >/dev/null 2>&1 && firewall-cmd --state >/dev/null 2>&1; then
  firewall-cmd --permanent --add-port="${APP_PORT}/tcp" >/dev/null
  firewall-cmd --reload >/dev/null
fi
if command -v iptables >/dev/null 2>&1; then
  iptables -C INPUT -p tcp --dport "${APP_PORT}" -j ACCEPT 2>/dev/null || iptables -I INPUT 1 -p tcp --dport "${APP_PORT}" -j ACCEPT
fi

attempt=0
until curl -fsS "http://127.0.0.1:${APP_PORT}/api/health" >/dev/null; do
  attempt=$((attempt + 1))
  [ "$attempt" -lt 30 ] || { docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=100 app; exit 1; }
  sleep 2
done
echo "Deployment healthy at http://${VPS_HOST}:${APP_PORT}"
