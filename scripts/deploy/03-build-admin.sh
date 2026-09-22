#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"

LOG_FILE="$PROJECT_ROOT/deploy.log"
DIST_ADMIN="$PROJECT_ROOT/dist-admin"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [BUILD ADMIN] $*" | tee -a "$LOG_FILE"; }

log "====================================="
log "Build 2/3: ADMIN → $DIST_ADMIN (EXPO_PUBLIC_APP_MODE=admin)"
log "  → server_name nginx: app.eldojo.tech + admin.eldojo.tech (alias mismo build)"
log "====================================="

# Limpiar output dir
log "Limpiando $DIST_ADMIN..."
rm -rf "$DIST_ADMIN"
mkdir -p "$DIST_ADMIN"

# Build admin: usa script package.json build:web:admin (cross-env + expo export --output-dir dist-admin/)
log "Cargando $PROJECT_ROOT/.env y exportando EXPO_PUBLIC_* ..."
set -a
# shellcheck disable=SC1091
[[ -f "$PROJECT_ROOT/.env" ]] && source "$PROJECT_ROOT/.env"
set +a
export EXPO_PUBLIC_APP_MODE=admin
log "  EXPO_PUBLIC_API_URL=${EXPO_PUBLIC_API_URL:-<not set>}"
log "  EXPO_PUBLIC_PUBLIC_WEB_ORIGIN=${EXPO_PUBLIC_PUBLIC_WEB_ORIGIN:-<not set>}"
log "  EXPO_PUBLIC_APP_WEB_ORIGIN=${EXPO_PUBLIC_APP_WEB_ORIGIN:-<not set>}"
log "  EXPO_PUBLIC_APP_MODE=${EXPO_PUBLIC_APP_MODE:-<not set>}"
log "Build admin via npm run build:web:admin → $DIST_ADMIN ..."
npm run --silent build:web:admin >> "$LOG_FILE" 2>&1

[[ -f "$DIST_ADMIN/index.html" ]] || { log "❌ FATAL build admin: falta dist-admin/index.html"; exit 1; }
SIZE_INDEX=$(stat -c%s "$DIST_ADMIN/index.html" 2>/dev/null || echo 0)
[[ "$SIZE_INDEX" -ge 500 ]] || { log "❌ FATAL build admin: index.html < 500 bytes (${SIZE_INDEX})"; exit 1; }
log "✅ Build admin OK (index.html ${SIZE_INDEX} bytes)."

# Permisos
chown -R root:www-data "$DIST_ADMIN"
chmod -R u=rwX,g=rX,o=rX "$DIST_ADMIN"
log "✅ Build admin listo para Nginx."
exit 0
