# Deploy Sprint 4 — Checklist paste-and-run VPS (Pipeline A)
Ejecuta COMO ROOT en tu VPS `root@srv1333724`. Copia y pega UN BLOQUE A LA VEZ. Después de cada bloque, pega la salida STDOUT aquí.

⚠️ **RULES**
- Ejecuta BLOQUE POR BLOQUE. NO ejecutes todo de una. Espera mi OK entre bloques 1 y 8 (solo si nginx -t falla; si todo OK puedes avanzar solo).
- Si alguna línea tira error, PÁRATE, NO SIGAS, y pégame el output aquí.
- Rollback automático ≤5 min existe (`rollback.sh`) al final.

---

## PREVIO en TU LAPTOP WINDOWS (antes de entrar al VPS)
Antes de los bloques VPS, ejecuta estos 2 comandos SCP desde Windows PowerShell, **cambia `IP_VPS` por la IP pública de tu srv1333724**:

```powershell
# Laptop Windows (powershell, carpeta: eldojo-mobile root)
# Copia build ADMIN a VPS
scp -r dist-admin/* root@IP_VPS:/eldojo/eldojo-front/dist-admin/

# Copia build STUDENT a VPS
scp -r dist-student/* root@IP_VPS:/eldojo/eldojo-front/dist-student/
```

Si usas otra ruta (no root) o puerto SSH no 22, ajusta `scp -P 2222 ...` como corresponda.

---

## BLOQUE 1 — Backup archivos legado y carpetas
```bash
# ============ BLOQUE 1 / 8 ============
TS=$(date +%Y%m%d%H%M%S)
echo "=== BLOQUE1 Backup timestamp: $TS ==="

# 1.1 Backup config legado Nginx
cp -a /etc/nginx/sites-available/eldojo-frontend /etc/nginx/sites-available/eldojo-frontend.BAK.pre-sprint4.$TS
echo "Backup guardado: /etc/nginx/sites-available/eldojo-frontend.BAK.pre-sprint4.$TS"
ls -la /etc/nginx/sites-available/eldojo-frontend.BAK.pre-sprint4.$TS

# 1.2 Crear carpetas deploy VPS si no existen
mkdir -p /eldojo/eldojo-front/dist-admin
mkdir -p /eldojo/eldojo-front/dist-student
chown -R www-data:www-data /eldojo/eldojo-front/dist-admin /eldojo/eldojo-front/dist-student
chmod -R u+rwX,g+rwX,o+rX /eldojo/eldojo-front/dist-admin /eldojo/eldojo-front/dist-student
echo "Estructura:"
ls -ld /eldojo/eldojo-front/dist-admin /eldojo/eldojo-front/dist-student
echo "Validar archivos (después de tu scp en laptop):"
ls /eldojo/eldojo-front/dist-admin/index.html 2>&1 || echo "⚠️  AÚN NO HAS COPIADO dist-admin"
ls /eldojo/eldojo-front/dist-student/index.html 2>&1 || echo "⚠️  AÚN NO HAS COPIADO dist-student"
```
👉 **Después de pegar salida**: me aseguro de que los 2 index.html estén presentes.

---

## BLOQUE 2 — Crear 3 archivos NUEVOS Nginx en sites-available
Haz esto C/UNO por UNO. Abre nano, pega todo el contenido de cada archivo, guarda y sale.

**2.1 Eldojo PUBLIC**
```bash
# 2.1 PUBLIC
cat > /etc/nginx/sites-available/eldojo-public << '__ENDPUBLIC__'
# (AQUÍ PEGAR EL CONTENIDO EXACTO DE)
# eldojo-mobile/.trae/deploy-sprint4/eldojo-public.conf
__ENDPUBLIC__
```
⚠️ **MANUAL**: Abre `nano /etc/nginx/sites-available/eldojo-public` y reemplaza TODO el texto de arriba por el contenido exacto de [eldojo-public.conf](file:///c:/Users/dante/Documents/trae_projects/eldojo-mobile/.trae/deploy-sprint4/eldojo-public.conf). Guarda Ctrl+O, sale Ctrl+X.

**2.2 Eldojo ADMIN**
```bash
nano /etc/nginx/sites-available/eldojo-admin
# ↑ Pega EXACTO .trae/deploy-sprint4/eldojo-admin.conf ↓ guarda sale
```

**2.3 Eldojo STUDENT**
```bash
nano /etc/nginx/sites-available/eldojo-student
# ↑ Pega EXACTO .trae/deploy-sprint4/eldojo-student.conf ↓ guarda sale
```

**2.4 Permisos**
```bash
chmod 644 /etc/nginx/sites-available/eldojo-public
chmod 644 /etc/nginx/sites-available/eldojo-admin
chmod 644 /etc/nginx/sites-available/eldojo-student
ls -la /etc/nginx/sites-available/eldojo-*
```

---

## BLOQUE 3 — Swap symlinks sites-enabled (PASO RIESGO ALTO, rollback listo)
```bash
# ============ BLOQUE3 / 8 ============
echo "Estado actual sites-enabled:"
ls -la /etc/nginx/sites-enabled/
echo "==="

# 3.1 Deshabilitar config legada eldojo-frontend (NO borra el .conf ni el .BAK; solo quita symlink)
rm -f /etc/nginx/sites-enabled/eldojo-frontend

# 3.2 Habilitar 3 nuevos con número prefix para orden carga
ln -sf /etc/nginx/sites-available/eldojo-public  /etc/nginx/sites-enabled/040-eldojo-public
ln -sf /etc/nginx/sites-available/eldojo-admin   /etc/nginx/sites-enabled/050-eldojo-admin
ln -sf /etc/nginx/sites-available/eldojo-student /etc/nginx/sites-enabled/060-eldojo-student

echo "Estado NUEVO sites-enabled:"
ls -la /etc/nginx/sites-enabled/
```

---

## BLOQUE 4 — Expand Let's Encrypt Cert SANs (5 dominios)
```bash
# ============ BLOQUE4 / 8 ============
# Si certbot NO está instalado: apt-get install -y certbot python3-certbot-nginx
echo "Certificados actuales:"
certbot certificates 2>&1 | head -50
echo "===="

# Expand cert a 5 names (reemplaza <TU_EMAIL> por tu correo, o quita --email y usa --register-unsafely-without-email)
certbot --nginx \
  -d eldojo.tech \
  -d www.eldojo.tech \
  -d app.eldojo.tech \
  -d admin.eldojo.tech \
  -d mi.eldojo.tech \
  --expand \
  --non-interactive \
  --agree-tos \
  --register-unsafely-without-email

echo "Post-expand certificates:"
certbot certificates 2>&1 | head -60
```

---

## BLOQUE 5 — Validación NGINX (STOP AQUÍ SI FALLA)
```bash
# ============ BLOQUE5 / 8 ============
nginx -t
# SALIDA ESPERADA 2 LÍNEAS:
#   nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
#   nginx: configuration file /etc/nginx/nginx.conf test is successful
echo "Exit code nginx -t: $?"
```
❌ **Si NO sale "syntax is ok + test is successful" → NO EJECUTAR BLOQUE 6 ni 7.** Pégame el error aquí.

---

## BLOQUE 6 — Reload Nginx (Zero downtime)
```bash
# ============ BLOQUE6 / 8 ============
systemctl reload nginx
sleep 1
systemctl status nginx --no-pager | head -5
# Esperamos: active (running) since hace 1s
```

---

## BLOQUE 7 — Smoke tests HTTP (pega salida COMPLETA aquí)
```bash
# ============ BLOQUE7 / 8 ============
echo "---- (1) admin.eldojo.tech root ----"
curl -I -k https://admin.eldojo.tech/ 2>&1 | head -12
echo "---- (2) mi.eldojo.tech ruta profunda SPA fallback /alumno/asistencia ----"
curl -I -k https://mi.eldojo.tech/alumno/asistencia 2>&1 | head -12
echo "---- (3) app.eldojo.tech /admin legacy ----"
curl -I -k https://app.eldojo.tech/admin 2>&1 | head -12
echo "---- (4) eldojo.tech público intacto ----"
curl -I -k https://eldojo.tech/ 2>&1 | head -12
echo "---- (5) /api/auth/csrf — verifica Set-Cookie Domain=.eldojo.tech ----"
curl -I https://eldojo.tech/api/auth/csrf 2>&1 | head -20
echo "---- (6) Cross-kick student en admin — curl head HTML body fragment ----"
curl -s -k https://mi.eldojo.tech/ | head -c 1500 | strings | head -15
echo "DONE smoke tests."
```

Esperado smoke tests:
- (1)-(4): `HTTP/2 200` + `content-type: text/html`.
- (5): respuesta 200 o 204 o 404 (cualquiera menos 502), y header `set-cookie` contiene `Domain=.eldojo.tech`.
- (6): strings de HTML index.html (no 502).

---

## BLOQUE 8 — Cleanup opcional tras 15min smoke OK (ejecutar SOLO si (1)-(6) todos 200)
```bash
# ============ BLOQUE8 / 8 ============
echo "Si TODO smoke tests OK, borramos backups OLD de hace 1 día+ para no ocupar:"
find /etc/nginx/sites-available -maxdepth 1 -type f -name "*.BAK.*" -mtime +0 -exec ls -la {} \;
# (No los borro auto — decide tú: rm -i /etc/nginx/sites-available/*.BAK.*)
echo "Deploy Sprint4 COMPLETE 🚀"
```

---

# ROLLBACK AUTOMÁTICO ≤5 min
Si BLOQUE5 (nginx -t) o BLOQUE7 (smoke) fallan, ejecuta ESTE SCRIPT AHORA MISMO:
```bash
# #####################################################################
# ROLLBACK — deshace Sprint 4 en ~1 minuto
# #####################################################################
cd /etc/nginx
# 1) Deshabilita 3 symlinks nuevos
rm -f sites-enabled/040-eldojo-public sites-enabled/050-eldojo-admin sites-enabled/060-eldojo-student
# 2) Re-habilita legado (cambia .BAK.* por el nombre exacto de tu BLOQUE1 backup):
#    Si no recuerdas nombre: ls /etc/nginx/sites-available/*.BAK.*
BAK=$(ls /etc/nginx/sites-available/eldojo-frontend.BAK.pre-sprint4.* | head -1)
echo "Restaurando desde backup $BAK"
cp -a "$BAK" /etc/nginx/sites-available/eldojo-frontend
ln -sf /etc/nginx/sites-available/eldojo-frontend /etc/nginx/sites-enabled/eldojo-frontend
# 3) Valida y reload
nginx -t
systemctl reload nginx
systemctl status nginx --no-pager | head -5
# 4) Revierte cert si certbot expand fue el problema:
#    certbot rollback --cert-name eldojo.tech
echo "ROLLBACK DONE."
```

## Referencia archivos conf creados
Siempre disponibles en tu laptop (antes de subir al VPS):
- [eldojo-public.conf](file:///c:/Users/dante/Documents/trae_projects/eldojo-mobile/.trae/deploy-sprint4/eldojo-public.conf)
- [eldojo-admin.conf](file:///c:/Users/dante/Documents/trae_projects/eldojo-mobile/.trae/deploy-sprint4/eldojo-admin.conf)
- [eldojo-student.conf](file:///c:/Users/dante/Documents/trae_projects/eldojo-mobile/.trae/deploy-sprint4/eldojo-student.conf)
