# Notas de Deploy — Sprint 3 Builds Dobles Web
# Proyecto: eldo-eldojo-mobile (solo Web, no builds nativos)
# Fecha: 2026-09-10

---

## 1. Arquitectura post-Sprint 3

```
MISMO REPO: eldojo-mobile
├── BUILD A (admin)     → npm run build:web:admin → EXPO_PUBLIC_APP_MODE=admin
│   Output: dist/*      → deploy carpeta → Nginx server block
│   Hostname:           → admin.eldojo.tech       (isAppHostname=true)
│   Users:              → isGymAdminUser()        (cross-gate kick students)
│
├── BUILD B (student)   → npm run build:web:student → EXPO_PUBLIC_APP_MODE=student
│   Output: dist/*      → deploy carpeta DIFERENTE → Nginx server block
│   Hostname:           → mi.eldojo.tech          (isPublicHostname=true)
│   Users:              → isStudentUser()         (cross-gate kick admins)
│
└── BACKEND COMPARTIDO: eldo-eldojo-backend-api (FastAPI, same VPS, same MySQL)
    Endpoints:          → /api/* (auth/student-invitation, /me/*, /students/*)
    Autenticación:      → JWT HTTPOnly cookie (misma cookie domain .eldojo.tech)
```

---

## 2. Pre-requisitos Build

### 2.1 Instalar nuevas dependencias de desarrollo (T4 package.json)
```bash
cd eldojo-mobile
# Por si se clona repo limpio:
npm install
# Valida cross-env y rimraf instalados en devDependencies:
npm ls cross-env rimraf
```

### 2.2 Variables buildtime (ENV file)
Opcional: Crear archivos `.env.admin` / `.env.student` si se necesitan override de API host:
- `EXPO_PUBLIC_API_URL`: Si el API está en host distinto → `https://api.eldojo.tech` (no cambiar si es mismo VPS + `/api` proxypass).
- `EXPO_PUBLIC_PUBLIC_WEB_ORIGIN`: Build admin → `https://mi.eldojo.tech`; Build student → no hace falta (es su propio origin).
- `EXPO_PUBLIC_APP_WEB_ORIGIN`: Build student → `https://admin.eldojo.tech`; Build admin → no hace falta.
- `EXPO_PUBLIC_SESSION_COOKIE_DOMAIN`: `.eldojo.tech` (producción, cross-subdomain cookie share).

---

## 3. Builds paso a paso (Web-only)

### 3.1 Build A — Admin portal (admin.eldojo.tech)
```bash
# 1. Limpia artefactos + exporta Web con APP_MODE=admin
npm run build:web:admin
# 2. Verifica salida dist/:
ls -la dist/
# 3. Sube/copia dist/* al directorio root de admin.eldojo.tech en VPS:
scp -r dist/* user@eldojo.tech:/var/www/admin.eldojo.tech/
```

### 3.2 Build B — Student portal (mi.eldojo.tech)
```bash
# 1. Limpia artefactos + exporta Web con APP_MODE=student
npm run build:web:student
# 2. Sube/copia dist/* al directorio root SEPARADO de mi.eldojo.tech:
scp -r dist/* user@eldojo.tech:/var/www/mi.eldojo.tech/
```

**Importante**: NUNCA mezclar outputs de los 2 builds en la misma carpeta — cada build sube su propio `dist/`.

---

## 4. Configuración Nginx (2 server blocks, 2 carpetas dist)

### 4.1 /etc/nginx/sites-available/admin.eldojo.tech.conf
```nginx
server {
    listen 443 ssl http2;
    server_name admin.eldojo.tech;

    # Let's Encrypt certbot
    ssl_certificate     /etc/letsencrypt/live/admin.eldojo.tech/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/admin.eldojo.tech/privkey.pem;

    root /var/www/admin.eldojo.tech;
    index index.html;

    # SPA fallback: Expo Web = React SPA
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache bust static assets (Expo output)
    location ~* \.(?:js|css|woff2?|ttf|eot|otf|png|jpg|jpeg|gif|svg|ico|webp|map)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # Proxy reverso al Backend FastAPI compartido (same VPS)
    location /api/ {
        proxy_pass         http://127.0.0.1:8000;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cookie_path  / /;  # preserve JWT HTTPOnly cookie
    }
}
```

### 4.2 /etc/nginx/sites-available/mi.eldojo.tech.conf
```nginx
server {
    listen 443 ssl http2;
    server_name mi.eldojo.tech;

    ssl_certificate     /etc/letsencrypt/live/mi.eldojo.tech/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mi.eldojo.tech/privkey.pem;

    root /var/www/mi.eldojo.tech;
    index index.html;

    # SPA fallback (mismo patrón)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache assets estáticos idéntico al portal admin
    location ~* \.(?:js|css|woff2?|ttf|eot|otf|png|jpg|jpeg|gif|svg|ico|webp|map)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # MISMO proxypass /api → MISMO backend FastAPI (shared DB)
    location /api/ {
        proxy_pass         http://127.0.0.1:8000;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cookie_path  / /;
        # Cookie share cross-subdomain: backend must set Domain=.eldojo.tech on JWT cookie
    }
}
```

### 4.3 Activar sites + test Nginx
```bash
ln -s /etc/nginx/sites-available/admin.eldojo.tech.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/mi.eldojo.tech.conf /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

---

## 5. Fallback hostname (localhost / dev / staging desconocido)

Implementado en `src/utils/domains.ts:L109-L118` (T4 domains fallback).
Si window.location.hostname **no matchea** ninguno de los conocidos:
  - `EXPO_PUBLIC_APP_MODE=admin` → isAppHostname=true → rutas admin.
  - `EXPO_PUBLIC_APP_MODE=student` → isPublicHostname=true → rutas alumno.

Esto permite dev local con Expo Start simplemente seteando ENV antes de `npm run web`.

---

## 6. Cross-role Build Gates (AppNavigator.tsx) — protección leak

Código implementado en ambas ramas `isAppHostname` y `isPublicHostname`:
  - **Build admin** + usuario autenticado student → StatusView + AppButton `signOut(true)` (kick alumno).
  - **Build student** + usuario autenticado gym admin → StatusView + AppButton `signOut(true)` (kick staff).

Esto garantiza que:
  - Un cookie JWT válido de alumno **no** pueda cargar el portal admin.
  - Un cookie JWT válido de admin **no** pueda cargar el portal alumno.
  - Ningún leak de UI / datos / routes entre builds.

---

## 7. Smoke test checklist post-deploy (por subdominio)

### 7.1 admin.eldojo.tech
- [ ] Inicia sesión gym admin → `/admin` carga dashboard.
- [ ] Intenta navegar manualmente a `/alumno/perfil` → debe redirigir o no mostrar pantalla alumno.
- [ ] Verifica que los 6 params AdminStackParamList.AdminHome existan funcionen (overview/students/etc).
- [ ] `FIRST_TIME_TUTORIAL_STEPS` = 4 steps intactos.
- [ ] Cerrar sesión → redirige al sitio público.

### 7.2 mi.eldojo.tech
- [ ] Clic link invitación `/activar?token=X` → StudentActivateScreen monta correctamente.
- [ ] Redeem invitación exitosa → redirige `/` StudentHome, user.first_time = true.
- [ ] Modal StudentWelcomeModal 3 steps muestra y dismiss OK → first_time = false ya no monta.
- [ ] StudentHome botón QR 280px abre CredencialQRModal OK.
- [ ] Navegación: SecuritySettingsScreen `/alumno/seguridad` → cambio password 401/200 funciona; cambio email feedback OK.
- [ ] AttendanceHistoryScreen `/alumno/asistencia` → page_size = 12. Empty state string exacto: "Aún no tienes asistencias registradas. ¡Empieza entrenando!".
- [ ] Cerrar sesión → redirige al sitio público.

---

## 8. Hard constraints preservados Sprint 3
- **SOLO Web**: No se agregaron esquemas eldojo:// ni builds Android/iOS. Expo export Web es el único artefacto.
- **≤12 items por página**: `ATTENDANCE_HISTORY_PAGE_SIZE=12` aplicado; `meApi.getMyAttendance()` llamado con `limit:12` en AttendanceHistoryScreen.tsx.
- **Backcompat admin 100%**: `AdminStackParamList.AdminHome` 6 params INTACTO; `FIRST_TIME_TUTORIAL_STEPS.length === 4` INTACTO.
- **Reuse-first strategy**: AttendanceSectionView (admin) REUTILIZADO 100% por alumno sin duplicar componentes; solo agregado 2 props opcionales emptyTitle/emptyDescription defaults back-compat.
