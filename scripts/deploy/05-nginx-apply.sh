#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"

LOG_FILE="$PROJECT_ROOT/deploy.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [NGINX APPLY] $*" | tee -a "$LOG_FILE"; }

log "====================================="
log "Aplicar builds a Nginx (permisos + nginx -t + reload)"
log "====================================="

# 3 carpetas que sirve Nginx (root + alias en server blocks 040/050/060)
DIRS=("dist" "dist-admin" "dist-student")
for d in "${DIRS[@]}"; do
  full="$PROJECT_ROOT/$d"
  log "🔧 Permisos recursivos $full"
  [[ -d "$full" ]] || { log "WARN: $full no existe (no se buildió — si es build público/legacy solo, se ignora)."; continue; }
  chown -R root:www-data "$full"
  find "$full" -type d -exec chmod 755 {} \;
  find "$full" -type f -exec chmod 644 {} \;
done

# Sync filesystem para no tener writes pendientes antes de reload
sync; sleep 0.3

# Nginx syntax check FINAL (todos los sites-enabled)
log "nginx -t FINAL (todos los sites-enabled)..."
if ! nginx -t >> "$LOG_FILE" 2>&1; then
  log "❌ FATAL: nginx -t falló POST-build. Verifica conf en /etc/nginx/sites-enabled/"
  exit 1
fi

# Nginx reload (intenta systemctl, si no, nginx -s reload; reopen logs)
log "systemctl reload nginx..."
if systemctl reload nginx >> "$LOG_FILE" 2>&1; then
  log "✅ Reload vía systemctl OK."
else
  log "ℹ️  systemctl reload falló → nginx -s reload directo."
  nginx -s reload >> "$LOG_FILE" 2>&1
fi
nginx -s reopen >> "$LOG_FILE" 2>&1 || true
sleep 2

log "✅ Nginx reload + reopen logs OK. Builds ya servidos LIVE."
exit 0
