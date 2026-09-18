#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"

LOG_FILE="$PROJECT_ROOT/deploy.log"
DIST_STUDENT="$PROJECT_ROOT/dist-student"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [BUILD STUDENT] $*" | tee -a "$LOG_FILE"; }

log "====================================="
log "Build 3/3: STUDENT → $DIST_STUDENT (EXPO_PUBLIC_APP_MODE=student)"
log "  → server_name nginx: mi.eldojo.tech"
log "====================================="

log "Limpiando $DIST_STUDENT..."
rm -rf "$DIST_STUDENT"
mkdir -p "$DIST_STUDENT"

# Build condicional student (usa cross-env del package.json + expo export web --output-dir)
# Importante: SOURCE .env para exportar EXPO_PUBLIC_* vars a npx expo export
log "Cargando $PROJECT_ROOT/.env y exportando EXPO_PUBLIC_* ..."
set -a
# shellcheck disable=SC1091
[[ -f "$PROJECT_ROOT/.env" ]] && source "$PROJECT_ROOT/.env"
set +a
export EXPO_PUBLIC_APP_MODE=student
log "  EXPO_PUBLIC_API_URL=${EXPO_PUBLIC_API_URL:-<not set>}"
log "  EXPO_PUBLIC_PUBLIC_WEB_ORIGIN=${EXPO_PUBLIC_PUBLIC_WEB_ORIGIN:-<not set>}"
log "  EXPO_PUBLIC_APP_WEB_ORIGIN=${EXPO_PUBLIC_APP_WEB_ORIGIN:-<not set>}"
log "  EXPO_PUBLIC_APP_MODE=${EXPO_PUBLIC_APP_MODE:-<not set>}"
log "Build EXPO_PUBLIC_APP_MODE=student..."
npx cross-env \
  EXPO_PUBLIC_APP_MODE="${EXPO_PUBLIC_APP_MODE:-student}" \
  EXPO_PUBLIC_API_URL="${EXPO_PUBLIC_API_URL:-}" \
  EXPO_PUBLIC_PUBLIC_WEB_ORIGIN="${EXPO_PUBLIC_PUBLIC_WEB_ORIGIN:-}" \
  EXPO_PUBLIC_APP_WEB_ORIGIN="${EXPO_PUBLIC_APP_WEB_ORIGIN:-}" \
  EXPO_PUBLIC_SESSION_COOKIE_DOMAIN="${EXPO_PUBLIC_SESSION_COOKIE_DOMAIN:-}" \
  EXPO_PUBLIC_ENVIRONMENT="${EXPO_PUBLIC_ENVIRONMENT:-}" \
  npx expo export --platform web --output-dir "$DIST_STUDENT" >> "$LOG_FILE" 2>&1

[[ -f "$DIST_STUDENT/index.html" ]] || { log "❌ FATAL build student: falta dist-student/index.html"; exit 1; }
SIZE_INDEX=$(stat -c%s "$DIST_STUDENT/index.html" 2>/dev/null || echo 0)
[[ "$SIZE_INDEX" -ge 500 ]] || { log "❌ FATAL build student: index.html < 500 bytes (${SIZE_INDEX})"; exit 1; }
log "✅ Build student OK (index.html ${SIZE_INDEX} bytes)."

chown -R root:www-data "$DIST_STUDENT"
chmod -R u=rwX,g=rX,o=rX "$DIST_STUDENT"
log "✅ Build student listo para Nginx."
exit 0
