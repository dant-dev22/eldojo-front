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

# -------- PASO NUEVO (FIX SPINNER INFINITO eldojo.tech): --------
# Los builds se generan en $PROJECT_ROOT/{dist,dist-admin,dist-student}
# PERO Nginx los sirve desde /eldojo/eldojo-front/{dist,dist-admin,dist-student}
# (ver `root` en eldojo-public.conf línea 43). Sin este rsync la carpeta
# servida se queda con builds obsoletos mezclados (ej: build student en el
# root del público → SimpleAuthGate judogiRed + loop de redirects).
NGINX_DOCROOT_BASE="${NGINX_DOCROOT_BASE:-/eldojo/eldojo-front}"
BUILD_PAIRS=(
  "dist:${NGINX_DOCROOT_BASE}/dist"
  "dist-admin:${NGINX_DOCROOT_BASE}/dist-admin"
  "dist-student:${NGINX_DOCROOT_BASE}/dist-student"
)
for pair in "${BUILD_PAIRS[@]}"; do
  src_rel="${pair%%:*}"
  dst="${pair##*:}"
  src="$PROJECT_ROOT/$src_rel"
  if [[ ! -d "$src" ]]; then
    log "ℹ️  $src_rel no existe en el repo (no se buildió). Se salta rsync → $dst."
    continue
  fi
  log "📦 rsync --delete $src/  →  $dst/"
  mkdir -p "$dst"
  rsync -a --delete --chown=root:www-data \
        --chmod=D755,F644 \
        "$src/" "$dst/"
  log "✅ $src_rel → $dst  listo."
done

# Permisos FINALES sobre la carpeta servida por Nginx (no sobre $PROJECT_ROOT)
log "🔧 Permisos finales sobre docroot Nginx ($NGINX_DOCROOT_BASE):"
[[ -d "$NGINX_DOCROOT_BASE" ]] && {
  chown -R root:www-data "$NGINX_DOCROOT_BASE"
  find "$NGINX_DOCROOT_BASE" -type d -exec chmod 755 {} \;
  find "$NGINX_DOCROOT_BASE" -type f -exec chmod 644 {} \;
}

# Backwards-compat: también aplica permisos en $PROJECT_ROOT (por si alguien
# lee desde ahí con scripts legacy)
DIRS=("dist" "dist-admin" "dist-student")
for d in "${DIRS[@]}"; do
  full="$PROJECT_ROOT/$d"
  [[ -d "$full" ]] || continue
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
