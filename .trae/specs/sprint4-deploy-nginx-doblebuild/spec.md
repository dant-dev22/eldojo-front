# Spec: Sprint 4 — Deploy Doble Build + Nginx (Alternativa A / Pipeline A)
# TRAE-spec-mode

**Fecha spec**: 2026-09-10
**Autoriza pipeline**: Alternativa A (app.eldojo.tech ↔ admin.eldojo.tech alias mismo build admin) + Pipeline A (paste-and-run VPS, builds en laptop, no SSH user nuevo)
**Repositorios**: `eldojo-mobile` (solo edita domains.ts + ejecuta build scripts) + VPS config manual via paste-and-run. **NO editamos el repo público `eldojo` ni el `eldojo-backend-api`**.

---

## 1. Problema / Contexto
Sprint 3 cerrado 100% entregó 2 builds condicionales Web parametrizados por `EXPO_PUBLIC_APP_MODE ∈ {admin, student}` pero no está deployado. El VPS actualmente ejecuta una **única build compartida `root /eldojo/eldojo-front/dist`** servida por **2 server blocks**: `eldojo.tech` (público auth flow) + `app.eldojo.tech` (admin flow detectado por hostname). Esto rompe el diseño de cross-gates del Sprint 3 porque:
1. El build de admin contiene código de StudentFlow + gates que kickean; el build de student contiene código de AdminFlow + gates; comparten mismo dist/ porque hay 1 sola build.
2. No hay build dedicado para `mi.eldojo.tech` (Portal Alumno).
3. Falta SANs en el certificado Let's Encrypt para `admin.eldojo.tech` y `mi.eldojo.tech` → SSL error Misdirected.
4. `domains.ts` no reconoce `mi.eldojo.tech` como publicHostname ni `admin.eldojo.tech` como appHostname (solo `startsWith("app.")` alcanzaba al hostname legacy).

### Restricciones Hard Sprint 4
- **No tocar** el server block `eldojo.tech` público (ubicado sitios-available/eldojo-frontend: location /api, uploads, assets, etc.).
- **No tocar** el server block legacy `app.eldojo.tech` existente para no romper bookmarks; EN SU LUGAR creamos 2 server blocks NUEVOS separados:
  - `sites-available/eldojo-admin` → `server_name app.eldojo.tech admin.eldojo.tech;` → **root /eldojo/eldojo-front/dist-admin** build APP_MODE=admin.
  - `sites-available/eldojo-student` → `server_name mi.eldojo.tech;` → **root /eldojo/eldojo-front/dist-student** build APP_MODE=student.
  Después **deshabilitamos el bloque `app.eldojo.tech` legado** poniendo `# comentarios` en su server block (NO lo borramos; rollback en 1 minuto quitando comentarios).
- **Público `eldojo.tech`**: INTACTO, sigue apuntando a `/eldojo/eldojo-front/dist`.
- **Cookie Domain JWT cross-subdomain**: Setear `Domain=.eldojo.tech` en backend o si backend no lo hace, agregar `proxy_cookie_domain` en cada location /api/ nuevo.
- **Ruta deploy**: `/eldojo/eldojo-front/dist-admin` y `/eldojo/eldojo-front/dist-student` (misma raíz `/eldojo/eldojo-front/` que tu estructura).
- **2 DNS listos**: Usuario confirmó `admin.eldojo.tech` y `mi.eldojo.tech` creados en DNS apuntando al mismo VPS.
- **Let's Encrypt SANs**: Correr `certbot --expand -d 5 dominios` durante deploy; certbot actualiza paths cert y listen 443 en los nuevos server blocks.

## 2. Goals / Non-goals

### 2.1 Goals Sprint 4
1. **App + Admin alias**: `app.eldojo.tech` y `admin.eldojo.tech` → misma build `EXPO_PUBLIC_APP_MODE=admin`. Ambos son staff only.
2. **Student subdomain**: `mi.eldojo.tech` → build dedicada `EXPO_PUBLIC_APP_MODE=student`.
3. **Public intacto**: `eldojo.tech` → build compartida legacy sin tocar.
4. **2 builds en laptop**: Correr `npm run build:web:admin` → mover/copiar salida a carpeta temporal `dist-admin/`; correr `build:web:student` → mover/copiar a `dist-student/`. Subir via `scp` por ti.
5. **Nuevos server blocks Nginx**: 2 archivos nuevos en `sites-available` (eldojo-admin + eldojo-student). Deshabilitar el bloque `app.eldojo.tech` LEGACY con comentario `#` (backup).
6. **Cert expand**: Extender Let's Encrypt existente para 5 dominios.
7. **Smoke tests HTTP 200**: curl cada subdominio + rutas SPA fallback (`/alumno/asistencia`, `/alumno/seguridad`, `/admin`). Cross-kick role: alumno autenticado contra `app.eldojo.tech` debe renderizar StatusView kick; staff contra `mi.eldojo.tech` igual.

### 2.2 Non-goals
- NO crear usuario SSH nuevo en VPS (ya acordado Pipeline A).
- NO modificar backend FastAPI `eldojo-backend-api` endpoints; si cookie domain faltara, lo resolvemos con `proxy_cookie_domain` Nginx que es 0 riesgo producción.
- NO escribir docs README público; entrega = doc interna `.trae/deploy-sprint4/deploy-checklist.md` paste-and-run + 2 archivos conf Nginx copiar al VPS.
- NO deployar landing `eldojo.tech` nuevo build; público intacto sprint actual.

## 3. Tech Stack
- `eldojo-mobile`: Repo builds, `expo export --platform web` + cross-env EXPO_PUBLIC_APP_MODE.
- VPS Ubuntu/Debian (basado en paths /etc/nginx, /usr/lib/sftp-server, certbot, apt-get), Nginx 1.24+, Let's Encrypt certbot.
- Pipe paste-and-run bash (copy/paste tú ejecutas como root).

## 4. Requisitos Funcionales

### R1 — domain mapping
R1.1. `app.eldojo.tech` y `admin.eldojo.tech` → `isAppHostname=true` en `domains.ts`. Además fallthrough localhost EXPO_PUBLIC_APP_MODE=admin intacto.
R1.2. `mi.eldojo.tech` → `isPublicHostname=true` en `domains.ts` (igual que el público eldojo.tech y www). Además fallthrough EXPO_PUBLIC_APP_MODE=student intacto.
R1.3. `eldojo.tech` y `www.eldojo.tech` → sin cambios de comportamiento.

### R2 — Builds en laptop
R2.1. `npm run build:web:admin` → `dist/` generado. Renombrar temporalmente `dist/` → `dist-admin/` para no sobreescribir al correr el build student.
R2.2. `npm run build:web:student` → `dist/` generado. Renombrar temporalmente → `dist-student/`.
R2.3. Subir por usuario via `scp` desde laptop Windows al VPS:
  - `dist-admin/*` → VPS `/eldojo/eldojo-front/dist-admin/`
  - `dist-student/*` → VPS `/eldojo/eldojo-front/dist-student/`
R2.4. Comprobar que ambos `dist-admin/index.html` y `dist-student/index.html` tienen `EXPO_PUBLIC_APP_MODE=admin` embebido en el comentario `<meta>` o inline `__APP_MODE__` (si existe).

### R3 — Nuevos server blocks Nginx
R3.1. `/etc/nginx/sites-available/eldojo-admin` → server block doble `server_name app.eldojo.tech admin.eldojo.tech;` listen 443 ssl http2; `root /eldojo/eldojo-front/dist-admin`. Location /api/ anti-502 igual que tu config. Location catch-all SPA fallback anti-cache igual que tu config. Location /uploads proxy al backend. Location /_expo inmutable, /assets 30d, JS/CSS inmutable 1 año.
R3.2. `/etc/nginx/sites-available/eldojo-student` → `server_name mi.eldojo.tech;` `root /eldojo/eldojo-front/dist-student`. Location /api/ anti-502 igual. Location SPA fallback, uploads, assets igual.
R3.3. Agregar `proxy_cookie_domain eldojo.tech .eldojo.tech;` en cada location /api/ de los 2 nuevos blocks y en el público `eldojo.tech` (si no lo tiene ya, pero cuidado con no duplicar).
R3.4. Backup `/etc/nginx/sites-available/eldojo-frontend` como `/etc/nginx/sites-available/eldojo-frontend.BAK.pre-sprint4` (timestamp opcional). Comentar la **segunda mitad del archivo existente (server block `app.eldojo.tech` legado)** con `#` para que no choque con `server_name` en eldojo-admin; público `eldojo.tech` permanece intacto.
R3.5. Symlink enable nuevos: `ln -sf /etc/nginx/sites-available/eldojo-admin /etc/nginx/sites-enabled/050-eldojo-admin` + `ln -sf /etc/nginx/sites-available/eldojo-student /etc/nginx/sites-enabled/060-eldojo-student`. Deshabilitar (si existe symlink a sitios-enabled/eldojo-frontend) → renombrarlo si es necesario. **OJO**: público eldojo.tech debe seguir existiendo; para no romperlo lo más seguro es:
  - Nuevo `/etc/nginx/sites-available/eldojo-public` = EXACTA COPIA del bloque `eldojo.tech` del archivo original.
  - Symlink enable `/etc/nginx/sites-enabled/040-eldojo-public`.
  - Finalmente **deshabilitamos `sites-enabled/eldojo-frontend`** completo (remove symlink) → así no hay riesgo de choque de server_names; los 3 blocks independientes 040/050/060 están. Esto es lo más mantenible a futuro: 3 archivos separados por propósito.

### R4 — Cert expand + Nginx Reload
R4.1. Expandir cert: `sudo certbot --nginx -d eldojo.tech -d www.eldojo.tech -d app.eldojo.tech -d admin.eldojo.tech -d mi.eldojo.tech --expand --non-interactive --agree-tos --register-unsafely-without-email || sudo certbot --nginx -d eldojo.tech -d www.eldojo.tech -d app.eldojo.tech -d admin.eldojo.tech -d mi.eldojo.tech --expand`
R4.2. `sudo nginx -t → 2 outputs: syntax is OK y test is successful`.
R4.3. `sudo systemctl reload nginx` (no restart; reload preserva conexiones activas).
R4.4. `systemctl status nginx | head -5 → active (running)`.

### R5 — Smoke tests post-reload
R5.1. `curl -I -k https://admin.eldojo.tech/` → Status 200 y Content-Type text/html.
R5.2. `curl -I -k https://mi.eldojo.tech/alumno/asistencia` → Status 200 (fallback SPA entrega index.html).
R5.3. `curl -I -k https://app.eldojo.tech/admin` → 200.
R5.4. `curl -I -k https://eldojo.tech/` → 200.
R5.5. `curl -I https://eldojo.tech/api/auth/csrf` (sin -k si SSL OK) → 200 o 401 (API reachable / JWT auth, pero endpoint público csrf devuelve 200 con cookie Set-Cookie; Domain=.eldojo.tech visible).
R5.6. Cleanup borrar `.BAK` y backups temporales si todo OK tras 10min de smoke; sino rollback al final de este spec.

## 5. Requisitos No Funcionales
- **Zero downtime (99.9% en deploy)**: Reload no reinicia nginx workers en uso; symlink swap es atómico.
- **Rollback ≤ 5 min**: Backup archivo + comando `mv` + `systemctl reload` listo.
- **Bundle size sin sobrecarga**: Los 2 builds deben quedar ~300KB gzipped (Expo web typical). Nginx gzip on global ya presente en nginx.conf.
- **Seguridad**: No exponer `/.env` ni archivos internos en las builds. Exports no incluye `node_modules`.

## 6. Criterios de Aceptación (10 rule + 3 rubric)

### AC Rule (binario verificable)
**AC-DOM-1** `domains.ts isAppHostname=true` para admin.eldojo.tech y app.eldojo.tech; `isPublicHostname=true` para mi.eldojo.tech.
**AC-DOM-2** Público eldojo.tech y www.eldojo.tech sin cambios.

**AC-BUILD-1** `npm run build:web:admin` genera `dist/index.html` sin errores y `dist/` >10 archivos.
**AC-BUILD-2** `npm run build:web:student` genera `dist/index.html` sin errores y `dist/` >10 archivos.
**AC-BUILD-3** Carpeta temporal `dist-admin/` y `dist-student/` existen en laptop tras R2.1-R2.2.

**AC-NGINX-1** 3 archivos Nuevos Nginx: `eldojo-admin`, `eldojo-student`, `eldojo-public` (copia exacta pública) copiados a `/etc/nginx/sites-available/` y habilitados symlink en `sites-enabled/040`, `050`, `060`.
**AC-NGINX-2** `sudo nginx -t` exit code 0 después de cambios.
**AC-NGINX-3** Symlink original `sites-enabled/eldojo-frontend` (si estaba) REMOVIDO o renombrado a `.disabled` para evitar server_name duplicate collision app.eldojo.tech.

**AC-DEPLOY-1** sudo certbot --expand → exit 0 (sin errores) y al menos 5 dominios SANs listados en `sudo certbot certificates | head -40`.
**AC-DEPLOY-2** Los 4 smoke tests R5.1-R5.4 Status 200 y Content-Type text/html; R5.5 API reachable y Set-Cookie tiene `Domain=.eldojo.tech`.

### AC Rubric (evaluativo)
**AC-ROLLBACK-1 (0..2 ≥1)** 1pt: backup `.BAK` de sites-available existe. 2pts: se prueba y documenta rollback pasos. ≥1 pass.
**AC-SMOOTH-DEPLOY (0..3 ≥2)** 1pt: nginx reload sin restart. 1pt: smoke tests curl ≤ 10min. 1pt: público eldojo.tech intacto (200). ≥2 pass.
**AC-REUSE (0..2 ≥2)** 1pt: nuevos blocks Nginx REUSAN verbatim la configuración anti-502/cache/SPA del bloque actual. 1pt: domains.ts reutiliza mismo pattern `hostnameMatchesAny / startsWith / fallback ENV`. ≥2 pass.

## 7. Rollback Plan (5 minutos)
Si algo falla (ej: 502/404 tras reload, certbot error inesperado):
1. `sudo cp -a /etc/nginx/sites-available/eldojo-frontend.BAK.pre-sprint4 /etc/nginx/sites-available/eldojo-frontend`
2. `sudo rm -f /etc/nginx/sites-enabled/040-eldojo-public /etc/nginx/sites-enabled/050-eldojo-admin /etc/nginx/sites-enabled/060-eldojo-student`
3. `sudo ln -sf /etc/nginx/sites-available/eldojo-frontend /etc/nginx/sites-enabled/eldojo-frontend`
4. `sudo nginx -t` && `sudo systemctl reload nginx`
5. Si certbot falló el SANs: `sudo certbot rollback` o volver a generar cert solo original.
