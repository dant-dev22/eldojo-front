#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"

LOG_FILE="$PROJECT_ROOT/deploy.log"
DIST_PUBLIC="$PROJECT_ROOT/dist"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [BUILD PUBLIC] $*" | tee -a "$LOG_FILE"; }

log "====================================="
log "Build 1/3: PÚBLICO (eldojo.tech) → $DIST_PUBLIC"
log "====================================="

# 2.1 Git pull código más nuevo (npm ci build con versiones exactas package-lock)
log "git pull + npm ci (si package-lock) o npm install fallback..."
git pull >> "$LOG_FILE" 2>&1
if [[ -f package-lock.json ]]; then
  npm ci --no-audit --no-fund --loglevel=error >> "$LOG_FILE" 2>&1 || {
    log "WARN: npm ci failed → fallback npm install"
    npm install --no-audit --no-fund --loglevel=error >> "$LOG_FILE" 2>&1
  }
else
  npm install --no-audit --no-fund --loglevel=error >> "$LOG_FILE" 2>&1
fi

# 2.2 Clean + build público (usando scripts package.json)
log "Limpiando $DIST_PUBLIC..."
npm run --silent clean:web 2>/dev/null || rm -rf "$DIST_PUBLIC"

log "Build web público (build:web)..."
npm run --silent build:web >> "$LOG_FILE" 2>&1

# 2.3 Sanity check build
[[ -f "$DIST_PUBLIC/index.html" ]] || { log "❌ FATAL build público: falta dist/index.html"; exit 1; }
SIZE_INDEX=$(stat -c%s "$DIST_PUBLIC/index.html" 2>/dev/null || echo 0)
[[ "$SIZE_INDEX" -ge 500 ]] || { log "❌ FATAL build público: index.html pequeño: ${SIZE_INDEX} bytes < 500"; exit 1; }
log "✅ Build público OK (index.html ${SIZE_INDEX} bytes)."

# 2.4 Permisos básicos (propios y grupo www-data)
log "Permisos carpeta dist..."
chown -R root:www-data "$DIST_PUBLIC"
chmod -R u=rwX,g=rX,o=rX "$DIST_PUBLIC"
log "✅ Build público listo para Nginx."
exit 0
