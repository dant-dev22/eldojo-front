#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"

LOG_FILE="$PROJECT_ROOT/deploy.log"
NGINX_SITE_FILE="/etc/nginx/sites-available/eldojo-frontend"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [PREFLIGHT] $*" | tee -a "$LOG_FILE"; }

log "Project root: $PROJECT_ROOT"
log "Log file: $LOG_FILE"

# 1.1 Backend healthy? (gunicorn directo)
log "Check backend :5001 healthy..."
if ! curl -fsS "http://127.0.0.1:5001/api/v1/health" >/dev/null 2>&1; then
  log "WARN: backend :5001 NOT healthy. Si vas a deployar BACK + FRONT juntos, primero corre BACKEND deploy.sh."
  read -r -p "  Continuar de todos modos? (s/N): " ans
  if [[ ! "${ans,,}" =~ ^s(i)?$ ]]; then
    log "Abortado por usuario."
    exit 1
  fi
fi
log "✅ Backend check done."

# 1.2 .env required EXPO vars
log "Checking $PROJECT_ROOT/.env..."
[[ -f "$PROJECT_ROOT/.env" ]] || { log "❌ FATAL falta $PROJECT_ROOT/.env"; exit 1; }
for v in EXPO_PUBLIC_API_URL EXPO_PUBLIC_PUBLIC_WEB_ORIGIN EXPO_PUBLIC_APP_WEB_ORIGIN; do
  if ! grep -Eq "^${v}=" "$PROJECT_ROOT/.env"; then
    log "❌ FATAL: falta variable $v en $PROJECT_ROOT/.env"
    exit 1
  fi
done
log "✅ .env OK (API_URL + origins definidos)."

# 1.3 node + npm + npx
log "Node toolchain check..."
command -v node >/dev/null 2>&1 || { log "❌ FATAL node no está en PATH"; exit 1; }
command -v npm  >/dev/null 2>&1 || { log "❌ FATAL npm no está en PATH";  exit 1; }
command -v npx  >/dev/null 2>&1 || { log "❌ FATAL npx no está en PATH";  exit 1; }
log "✅ Node $(node -v) / npm $(npm -v) OK."

# 1.4 nginx syntax PREVIO (antes de tocar NADA) si existe el conf
if [[ -f "$NGINX_SITE_FILE" ]]; then
  log "nginx -t pre-build..."
  if ! nginx -t >> "$LOG_FILE" 2>&1; then
    log "❌ FATAL: nginx -t falla ANTES de deploy. NO continúes hasta arreglarlo."
    exit 1
  fi
fi
log "✅ Preflight OK. Preparado para builds."
exit 0
