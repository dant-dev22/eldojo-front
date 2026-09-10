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

# Build condicional admin (usa cross-env del package.json + expo export web --output-dir)
log "Build EXPO_PUBLIC_APP_MODE=admin..."
npx cross-env EXPO_PUBLIC_APP_MODE=admin \
  npx expo export --platform web --output-dir "$DIST_ADMIN" >> "$LOG_FILE" 2>&1

[[ -f "$DIST_ADMIN/index.html" ]] || { log "❌ FATAL build admin: falta dist-admin/index.html"; exit 1; }
SIZE_INDEX=$(stat -c%s "$DIST_ADMIN/index.html" 2>/dev/null || echo 0)
[[ "$SIZE_INDEX" -ge 500 ]] || { log "❌ FATAL build admin: index.html < 500 bytes (${SIZE_INDEX})"; exit 1; }
log "✅ Build admin OK (index.html ${SIZE_INDEX} bytes)."

# Permisos
chown -R root:www-data "$DIST_ADMIN"
chmod -R u=rwX,g=rX,o=rX "$DIST_ADMIN"
log "✅ Build admin listo para Nginx."
exit 0
