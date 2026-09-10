#!/bin/bash
# =============================================================
# ElDojo Sprint4 ROLLBACK AUTOMÁTICO ≤5 min
# Ejecutar COMO ROOT solo si nginx -t falla o smoke tests fallan
# Uso:
#   chmod +x /root/rollback-sprint4.sh
#   bash /root/rollback-sprint4.sh  [ruta_absoluta_Backup]
# Ejemplo sin arg usa el .BAK.* más nuevo en sites-available
# =============================================================
set -euo pipefail

echo "[ROLLBACK] Inicio $(date)"
BACKUP_ARG="${1:-}"

# 1. Deshabilitar 3 symlinks Sprint4
echo "[1/5] Removiendo symlinks 040/050/060 sites-enabled"
rm -f /etc/nginx/sites-enabled/040-eldojo-public
rm -f /etc/nginx/sites-enabled/050-eldojo-admin
rm -f /etc/nginx/sites-enabled/060-eldojo-student

# 2. Buscar o asignar BAK legado
if [ -n "$BACKUP_ARG" ] && [ -f "$BACKUP_ARG" ]; then
    BAK="$BACKUP_ARG"
else
    BAK=$(ls -1t /etc/nginx/sites-available/eldojo-frontend.BAK.pre-sprint4.* 2>/dev/null | head -1 || true)
fi
if [ -z "${BAK:-}" ] || [ ! -f "$BAK" ]; then
    echo "[ERROR] No encontré BAK .BAK.pre-sprint4.* en /etc/nginx/sites-available"
    echo "Pásalo: bash $0 /etc/nginx/sites-available/eldojo-frontend.BAK.pre-sprint4.YYYY..."
    exit 1
fi
echo "[2/5] Restaurando desde: $BAK"
cp -a "$BAK" /etc/nginx/sites-available/eldojo-frontend

# 3. Re-enable symlink LEGACY eldojo-frontend
echo "[3/5] Re-habilitando sites-enabled/eldojo-frontend"
ln -sf /etc/nginx/sites-available/eldojo-frontend /etc/nginx/sites-enabled/eldojo-frontend
ls -la /etc/nginx/sites-enabled/

# 4. Validar
echo "[4/5] nginx -t"
if nginx -t; then
    echo "[4/5] OK syntax."
else
    echo "[4/5] FATAL nginx -t falló. Revisar conf manualmente."
    exit 1
fi

# 5. Reload
echo "[5/5] systemctl reload nginx"
systemctl reload nginx
sleep 1
systemctl status nginx --no-pager | head -6

# (Opcional) Certbot rollback si el problema es SANs mismatch
echo "[ROLLBACK] Listo. Si persiste error SSL, ejecuta manualmente:"
echo "   certbot rollback --cert-name eldojo.tech"
echo "[ROLLBACK] Fin $(date)"
