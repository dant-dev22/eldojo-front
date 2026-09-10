# Tasks: Sprint 4 Deploy Doble Build Nginx (Spec aprobación pendiente)
Pipeline A = paste-and-run VPS manual. NO tocar eldojo-frontend legacy directamente, sino
generar 3 archivos nuevos separados (eldojo-public / eldojo-admin / eldojo-student) y
luego swapear symlinks en sites-enabled.

---

## Task 1 — Actualizar `domains.ts` con 3 subdominios nuevos (mi/app/admin)

**Status**: pending
**Priority**: high
**Depends on**: (ninguno, start here)
**Cubre ACs**: AC-DOM-1, AC-DOM-2, AC-REUSE (rubric pt2)

### Archivos a tocar
- `src/utils/domains.ts` (EDITAR backcompat-safe, solo agregar hostnames, NO tocar fallthrough EXPO_PUBLIC_APP_MODE)

### Work
1. Abrir `src/utils/domains.ts L85-L118` donde se define `isAppHostname` y `isPublicHostname` por hostname exacto.
2. Bloque `if (currentHostname.startsWith("app."))` que existía → MANTENER intacto para backcompat.
3. **Agregar `admin.eldojo.tech` también al match de app**:
   - Modificar `else if (currentHostname.startsWith("app.") || ...)` para incluir `currentHostname === "admin.eldojo.tech"` al lado del hostnameMatchesAny appWebOrigin.
4. Bloque `else if (eldojo.tech || www.eldojo.tech || hostnameMatchesAny(publicWebOrigin))` → **agregar `currentHostname === "mi.eldojo.tech"`** para que el portal alumno sea publicHostname.
5. NO tocar localhost/127.0.0.1, NO tocar fallback EXPO_PUBLIC_APP_MODE.
6. `npm run typecheck` tras cambios; 0 nuevos errores S4.

### TRs Task 1
| TR | Criterio |
|---|---|
| T1-TR1 | `domains.ts` grep `admin.eldojo.tech` = 1 match y `mi.eldojo.tech` = 1 match, ambos en los else if correctos. |
| T1-TR2 | `startsWith("app.")` INTACTO (no borramos el backcompat). Fallback EXPO_PUBLIC_APP_MODE sin cambios L109-L118. |
| T1-TR3 | `npm run typecheck` salida S4 = ÚNICO error permitido = jsqr preexistente. 0 nuevos. |

---

## Task 2 — Build 2 bundles Web en laptop y renombrar carpetas

**Status**: pending
**Priority**: high
**Depends on**: T1 completado (isAppHostname actualizado embebido en builds)
**Cubre ACs**: AC-BUILD-1, AC-BUILD-2, AC-BUILD-3

### Archivos a tocar (ninguno)
- Artifacts generados: `dist-admin/` y `dist-student/` en root eldojo-mobile (NO commitear, solo para scp).

### Work
1. **PASO IMPORTANTE: Clean state**. `npm run clean:web` → borra `dist/` de builds anteriores.
2. Build admin: `npm run build:web:admin` → genera `dist/` con `EXPO_PUBLIC_APP_MODE=admin`. Esperar a que termine.
3. **Renombrar inmediatamente** `dist/` → `dist-admin/`. IMPORTANTE: si no se renombra, el siguiente build pisa la carpeta.
   - Cmd Windows (PowerShell): `Move-Item -Force dist dist-admin`
   - Si `dist-admin` ya existe por runs previos: `Remove-Item -Recurse -Force dist-admin` antes.
4. Build student: `npm run build:web:student` → genera `dist/` con `EXPO_PUBLIC_APP_MODE=student`.
5. **Renombrar inmediatamente** `dist/` → `dist-student/`.
6. Validación opcional embebida: `Select-String -Path dist-admin/index.html, dist-student/index.html -Pattern "admin|student|APP_MODE"` — no rompe si no está; el build está correcto por ENV cross-env.
7. Validación: `(Get-ChildItem dist-admin -Recurse -File | Measure-Object).Count -gt 10` = TRUE. Mismo para dist-student.

### TRs Task 2
| TR | Criterio |
|---|---|
| T2-TR1 | `Test-Path dist-admin/index.html` = TRUE y `Test-Path dist-student/index.html` = TRUE |
| T2-TR2 | Contador files >10 en ambos dist-admin y dist-student. |
| T2-TR3 | Ambos builds terminan con `exit code 0` (npm run build:web:admin y build:web:student). |

---

## Task 3 — Generar archivos Nuevos Nginx + checklist deploy

**Status**: pending
**Priority**: high
**Depends on**: T2 completado (no depende de T1 realmente pero es orden de riesgo).
**Cubre ACs**: AC-NGINX-1, AC-NGINX-3, AC-REUSE rubric pt1, AC-ROLLBACK-1 rubric.

### Archivos NUEVOS generados dentro de `.trae/deploy-sprint4/`:
1. `eldojo-public.conf` = EXACTA COPIA del server block `eldojo.tech` (incluye redirect www → eldojo.tech).
2. `eldojo-admin.conf` = server block `server_name app.eldojo.tech admin.eldojo.tech;` root `/eldojo/eldojo-front/dist-admin`.
3. `eldojo-student.conf` = server block `server_name mi.eldojo.tech;` root `/eldojo/eldojo-front/dist-student`.
4. `deploy-checklist.md` = paste-and-run paso por paso VPS root commands + rollback.
5. `rollback.sh` = script bash copia-pegar rollback automático ≤5 min.

### Reglas para los 3 nuevos conf
- Location `/api/` y `/uploads/`: copiar VERBATIM anti-502 + anti-cache del config actual.
- **Agregar línea `proxy_cookie_domain eldojo.tech .eldojo.tech;` DENTRO de location `/api/`** (dentro del block mismo, no en server). Cross-domain cookie .eldojo.tech.
- Listeners **no incluir `ssl_certificate` paths hardcoded** en los 3 conf. DEJAR 2 bloques por conf:
  1) server { listen 80; server_name X; return 301 https://$host$request_uri; }
  2) server { listen 443 ssl http2; server_name X; ... ROOT ... locations; **CERT PATHS lo inyecta CERTBOT con --nginx; lo hacemos en T4.** }
  - Mejor aún: incluimos `ssl_certificate /etc/letsencrypt/live/eldojo.tech/fullchain.pem;` y `privkey` COMO COMENTARIO `#` en los 3 archivos. Durante T4 certbot --expand los reescribe con paths correctos, así no hay riesgo de mismatch cert path.
- Cache locations HTML no-cache, /_expo immutable 1y, /assets 30d, images/js immutable 1y: COPIAR VERBATIM.
- SPA fallback `try_files $uri $uri/ /index.html;` igual que el actual.

### TRs Task 3
| TR | Criterio |
|---|---|
| T3-TR1 | `.trae/deploy-sprint4/eldojo-public.conf` · `eldojo-admin.conf` · `eldojo-student.conf` · `deploy-checklist.md` · `rollback.sh` 5 archivos creados. |
| T3-TR2 | Admin conf contiene `root /eldojo/eldojo-front/dist-admin;` y student conf `root /eldojo/eldojo-front/dist-student;`. Public conf contiene público. |
| T3-TR3 | Admin conf `server_name app.eldojo.tech admin.eldojo.tech;` y student `server_name mi.eldojo.tech;`. |
| T3-TR4 | Los 3 nuevos conf contienen `proxy_cookie_domain eldojo.tech .eldojo.tech;` dentro de location /api/. |
| T3-TR5 | Deploy checklist paso a paso lista rollback · backup · scp · symlink · certbot · nginx -t · reload · smoke curl. |

---

## Task 4 — Deploy Paste-and-run VPS (TÚ EJECUTAS COMO root)

**Status**: pending
**Priority**: high
**Depends on**: T1+T2+T3 done (builds listos + 3 conf generados)
**Cubre ACs**: AC-NGINX-2, AC-DEPLOY-1, AC-DEPLOY-2, AC-SMOOTH-DEPLOY (rubric), AC-ROLLBACK-1

### Work (step-by-step paste, cada paso tu pegas stdout)
1. **Paso 1 — Backup**. Copiar `cp -a /etc/nginx/sites-available/eldojo-frontend /etc/nginx/sites-available/eldojo-frontend.BAK.pre-sprint4.$(date +%Y%m%d%H%M%S)` → devuelve echo nombre backup.
2. **Paso 2 — Subir builds**: Tú ejecutas SCP desde tu laptop Windows:
   ```
   scp -r dist-admin/* root@IP_VPS:/eldojo/eldojo-front/dist-admin/
   scp -r dist-student/* root@IP_VPS:/eldojo/eldojo-front/dist-student/
   ```
   O si usas un FTP ya configurado, lo mismo. El punto es `/eldojo/eldojo-front/dist-admin/index.html` y `dist-student/index.html` existan.
3. **Paso 3 — Copiar 3 nuevos archivos de conf a VPS**: Tú creas 3 archivos en VPS y pegas contenido del Task 3:
   `nano /etc/nginx/sites-available/eldojo-public` + paste.
   `nano /etc/nginx/sites-available/eldojo-admin` + paste.
   `nano /etc/nginx/sites-available/eldojo-student` + paste.
   Chmod: `chmod 644 /etc/nginx/sites-available/eldojo-*`
4. **Paso 4 — Symlink enable**:
   ```
   rm -f /etc/nginx/sites-enabled/eldojo-frontend   # ← IMPORTANTE: solo deshabilita LEGACY (no borra .BAK ni .conf available)
   ln -sf /etc/nginx/sites-available/eldojo-public  /etc/nginx/sites-enabled/040-eldojo-public
   ln -sf /etc/nginx/sites-available/eldojo-admin   /etc/nginx/sites-enabled/050-eldojo-admin
   ln -sf /etc/nginx/sites-available/eldojo-student /etc/nginx/sites-enabled/060-eldojo-student
   ```
   Listar: `ls -la /etc/nginx/sites-enabled/` → debe mostrar 3 symlinks y NO mostrar eldojo-frontend.
5. **Paso 5 — Expand cert Let's Encrypt**:
   `certbot --nginx -d eldojo.tech -d www.eldojo.tech -d app.eldojo.tech -d admin.eldojo.tech -d mi.eldojo.tech --expand`
   → Selecciona "Expand" o lo que sea no-destructivo. Si pide email, usa tu correo de owner o el del registro.
6. **Paso 6 — Validar config**:
   `nginx -t` → **OUTPUT DEBE SER:** `nginx: the configuration file /etc/nginx/nginx.conf syntax is ok` + `test is successful`. **Si no, STOP y no corras reload!** Pégame el error antes de seguir.
7. **Paso 7 — Reload (sin restart)**:
   `systemctl reload nginx` → sin output. Luego `systemctl status nginx | head -3` → active (running).
8. **Paso 8 — Smoke tests curl (pegarme salida cada uno)**:
   ```
   curl -I https://admin.eldojo.tech/ 2>&1 | head -10
   curl -I https://mi.eldojo.tech/alumno/asistencia 2>&1 | head -10
   curl -I https://app.eldojo.tech/admin 2>&1 | head -10
   curl -I https://eldojo.tech/ 2>&1 | head -10
   curl -I https://eldojo.tech/api/auth/csrf 2>&1 | head -15
   ```
   El último debe mostrar `set-cookie: access_token=...; Domain=.eldojo.tech;`. Si no, lo arreglamos.

### TRs Task 4
| TR | Criterio |
|---|---|
| T4-TR1 | Backup .BAK.pre-sprint4 existe en sites-available. |
| T4-TR2 | sites-enabled tiene 3 symlinks 040/050/060; NO hay eldojo-frontend. |
| T4-TR3 | certbot certificates muestra 5 SANs (eldojo.tech + www + app + admin + mi) |
| T4-TR4 | `nginx -t` stdout syntax ok y successful. |
| T4-TR5 | 4 curls 200 y 1 curl API 200 con set-cookie Domain=.eldojo.tech. |

---

## Summary tasks priority counts

| Prio | Count | IDs |
|---|---|---|
| HIGH | 4 | T1, T2, T3, T4 |
