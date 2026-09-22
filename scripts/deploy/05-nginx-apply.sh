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

# Aplicar plantilla nginx multiapp a sites-enabled (backup primero + dry-run)
NGINX_TEMPLATE="$SCRIPT_DIR/nginx-eldojo-multiapp.conf.template"
NGINX_AVAILABLE="/etc/nginx/sites-available/eldojo-multiapp.conf"
NGINX_ENABLED="/etc/nginx/sites-enabled/eldojo-multiapp.conf"
NGINX_BACKUP_DIR="/etc/nginx/sites-enabled.bak.$(date +%Y%m%d-%H%M%S)"

if [[ -f "$NGINX_TEMPLATE" ]]; then
  log "📄 Plantilla nginx detectada: $NGINX_TEMPLATE"
  if [[ -d "/etc/nginx/sites-enabled" ]]; then
    log "💾 Backup sites-enabled actual → $NGINX_BACKUP_DIR"
    mkdir -p "$NGINX_BACKUP_DIR"
    cp -a /etc/nginx/sites-enabled/* "$NGINX_BACKUP_DIR/" 2>/dev/null || true
    log "📝 Copiar plantilla a sites-available y activar symlink"
    cp "$NGINX_TEMPLATE" "$NGINX_AVAILABLE"
    ln -sf "$NGINX_AVAILABLE" "$NGINX_ENABLED"
    log "⚠️  Comprueba manualmente server_names y cert paths SSL en $NGINX_AVAILABLE antes de nginx -t si usaste la plantilla por primera vez."
  else
    log "ℹ️  /etc/nginx/sites-enabled no existe en este host — se omite aplicar plantilla nginx (modo local?)"
  fi
else
  log "ℹ️  Sin plantilla nginx en scripts/deploy/nginx-eldojo-multiapp.conf.template — se asume que la conf ya está deployada."
fi

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
