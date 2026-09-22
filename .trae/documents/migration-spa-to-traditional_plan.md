# Plan de Migración: SPA → Arquitectura Tradicional Multi-App

## Resumen Ejecutivo: ¿ES VIABLE?

**✅ SÍ, es 100% viable y ALTAMENTE RECOMENDABLE.**

La arquitectura actual (SPA monolítica en Expo/React Native Web) sufre de:
- ~684 líneas de lógica condicional hipercompleja en `AppNavigator.tsx`
- Mecanismo custom frágil de `session_ticket` cross-domain para sync entre `eldojo.tech` ↔ `app.eldojo.tech`
- 3 builds separados (`build:web`, `build:web:admin`, `build:web:student`) sobre la MISMA base de código
- Gating por hostname (`isPublicHostname` vs `isAppHostname`) extremadamente frágil
- Carga de TODO el bundle JS en cada vista (landing público + admin + alumno)

Esta migración ELIMINA TODOS esos problemas y no requiere reescribir el backend.

---

## Investigación de la Arquitectura Actual

### Estructura de dominios (producción):
| Dominio | Propósito Actual | Problema |
|---------|-----------------|----------|
| `eldojo.tech` / `www.eldojo.tech` | Landing público + Login + Portal alumno | TODO en una misma SPA |
| `app.eldojo.tech` / `admin.eldojo.tech` | Dashboard admin | Requiere `session_ticket` cross-domain para autenticar |
| `mi.eldojo.tech` | (Reservado para alumnos) | Sin uso actualmente |
| Backend: `api.eldojo.tech` o proxy `/api/v1` | FastAPI REST | ✅ Correcto, se mantiene |

### Archivos críticos con complejidad incidental:
- [AppNavigator.tsx](file:///C:/Users/dante/Documents/trae_projects/eldojo-mobile/src/navigation/AppNavigator.tsx) — 684 líneas (el 90% se elimina)
- [AuthContext.tsx](file:///C:/Users/dante/Documents/trae_projects/eldojo-mobile/src/context/AuthContext.tsx) — 555 líneas (se simplifica a ~150)
- [domains.ts](file:///C:/Users/dante/Documents/trae_projects/eldojo-mobile/src/utils/domains.ts) — 173 líneas (se reduce a ~40)
- [publicRoutes.ts](file:///C:/Users/dante/Documents/trae_projects/eldojo-mobile/src/navigation/publicRoutes.ts) — 173 líneas (se divide por app)
- [authApi.ts](file:///C:/Users/dante/Documents/trae_projects/eldojo-mobile/src/api/authApi.ts) — 424 líneas (se eliminan endpoints de `session_ticket`)
- Backend: [auth.py](file:///C:/Users/dante/Documents/trae_projects/eldojo-backend-api/app/api/routes/auth.py) — (se eliminan rutas `session-ticket/*`)

---

## Arquitectura Objetivo (Tradicional Multi-App)

```
┌─────────────────────────────────────────────────────────────────┐
│                     nginx / reverse proxy                       │
├──────────────────┬─────────────────────┬────────────────────────┤
│  eldojo.tech     │   app.eldojo.tech   │    mi.eldojo.tech      │
│  (Público+Login) │   (Admin Dashboard) │   (Portal Alumno)      │
├──────────────────┼─────────────────────┼────────────────────────┤
│  Build único:    │  Build único:       │  Build único:          │
│  dist-public/    │  dist-admin/        │  dist-student/         │
│                  │                     │                        │
│  • Landing       │  • Login gate       │  • Login gate          │
│  • Acerca        │  • AdminDashboard   │  • StudentHome         │
│  • Eventos       │  • StudentsList     │  • StudentProfile      │
│  • Tiendas       │  • QrCodesList      │  • AttendanceHistory   │
│  • Login form    │  • Trajectory*      │  • SecuritySettings    │
│  • Registro      │                     │                        │
│  • Activaciones  │                     │                        │
└──────────────────┴─────────────────────┴────────────────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │    api.eldojo.tech     │
         │    FastAPI (sin cambios│
         │    mayores)            │
         └────────────────────────┘
```

### Flujo de autenticación (SIMPLIFICADO al máximo):
```
Usuario visita eldojo.tech/iniciar-sesion
    → POST /api/v1/auth/login (email + password)
    → Backend responde: { access_token, refresh_token, user: { role: "gym_admin" | "student" } }
    → Guarda tokens en localStorage/cookie
    → REDIRECT CLIENT-SIDE SIMPLE:
        • si role === "gym_admin" → window.location = "https://app.eldojo.tech/"
        • si role === "student"   → window.location = "https://mi.eldojo.tech/"

Cada app (app.eldojo.tech / mi.eldojo.tech) al montar:
    → Busca token en storage
    → Si NO hay token → redirect a eldojo.tech/iniciar-sesion
    → Si SÍ hay token → GET /api/v1/auth/me para validar y obtener user
    → Si token inválido → logout + redirect a eldojo.tech/iniciar-sesion
    → Si token válido y rol NO coincide → logout + redirect (seguridad)
    → Si todo OK → renderiza la app

Logout en cualquier app:
    → Limpiar storage
    → redirect a eldojo.tech/?signed_out=1
```

---

## Tickets de Implementación (11 en total, ordenados)

### PRIORIDAD ALTA: Bloque fundacional (4 tickets)

#### TICKET 1: Setup — Crear puntos de entrada separados por aplicación
**Objetivo**: Tener 3 `AppEntry.tsx` distintos en vez de uno solo compartido.
- Crear `src/app-entries/PublicAppEntry.tsx` → solo importa rutas públicas + LoginScreen
- Crear `src/app-entries/AdminAppEntry.tsx` → solo importa AdminStack + gate de auth
- Crear `src/app-entries/StudentAppEntry.tsx` → solo importa StudentStack + gate de auth
- Modificar `app.json` / `babel.config.js` / `metro.config.js` para soportar múltiples puntos de entrada
- Actualizar `package.json` scripts:
  ```
  "build:web:public":  "cross-env EXPO_PUBLIC_APP_ROLE=public  expo export --platform web",
  "build:web:admin":   "cross-env EXPO_PUBLIC_APP_ROLE=admin   expo export --platform web",
  "build:web:student": "cross-env EXPO_PUBLIC_APP_ROLE=student expo export --platform web",
  ```
**Archivos**: `package.json`, `babel.config.js`, `metro.config.js`, `app.json`, `src/app-entries/*` (nuevo)
**Riesgo**: Bajo — solo estructura
**Validación**: Cada build compila sin errores

---

#### TICKET 2: Extraer — Shell de autenticación simple sin cross-domain hacks
**Objetivo**: Crear `SimpleAuthGate.tsx` y `SimpleAuthProvider.tsx` que NO usen session_tickets ni hostname gating.
- Eliminar completamente `session_ticket`, `redeemSessionTicket`, `createSessionSyncTicket` del flujo
- Eliminar `isPublicHostname`, `isAppHostname` del flujo de auth
- `SimpleAuthProvider` solo hace 3 cosas:
  1. Al montar → lee tokens de storage → llama `/auth/me`
  2. Expone `login(payload)` → llama API → guarda tokens → retorna `user.role`
  3. Expone `logout()` → limpia storage
- `SimpleAuthGate` para admin/student:
  - Si sin auth → `window.location.replace("https://eldojo.tech/iniciar-sesion")`
  - Si auth pero rol equivocado → logout + redirect
  - Si OK → render children
**Archivos**: `src/context/SimpleAuthProvider.tsx` (nuevo), `src/components/SimpleAuthGate.tsx` (nuevo), elimina ~300 líneas de `AuthContext.tsx`
**Riesgo**: Medio — es el corazón del cambio
**Validación**: Login admin + alumno funcionan con redirect correcto

---

#### TICKET 3: Desmantelar — Simplificar AppNavigator.tsx (90% de reducción)
**Objetivo**: Pasar de 684 líneas a ~70.
- Cada app tiene su propio stack NAVAL, no un mega-navigator condicional
- `PublicAppNavigator`: solo Home, About, Events, Stores, SignIn, CreateAccount, ConfirmAccount, ActivateStudent, ResetStudentPassword, AccountConfirmed
- `AdminAppNavigator`: solo AdminHome, StudentsList, QrCodesList, TrajectoryList, TrajectoryDetail
- `StudentAppNavigator`: solo StudentHome, StudentProfile, SecuritySettings, AttendanceHistory
- ELIMINAR:
  - Toda la lógica de `session_ticket` redemption (líneas 274-340)
  - Todo el gating `isPublicHostname` vs `isAppHostname` (líneas 391-650)
  - Toda la lógica de `publicAttendanceRoute` de nivel raíz (mover a su propio entry si se usa)
**Archivos**: `src/navigation/AppNavigator.tsx` (reescribir), crear `PublicNavigator.tsx`, `AdminNavigator.tsx`, `StudentNavigator.tsx`
**Riesgo**: Bajo — es cortar y pegar ordenado
**Validación**: Cada app navega correctamente entre sus pantallas

---

#### TICKET 4: Backend — Eliminar rutas de session_ticket (limpieza)
**Objetivo**: Remover código muerto del backend ya que no se usa más.
- Eliminar endpoints:
  - `POST /auth/session-ticket/create`
  - `POST /auth/session-ticket/redeem`
- Eliminar modelo `SessionSyncTicket` y su tabla (opcional: dejar tabla por 1 mes para logs)
- Eliminar functions `generate_session_sync_token` en `security.py`
- Mantener: TODO LO DEMÁS de auth.py (login, register, academy confirm, student invitation, etc.)
**Archivos**: `eldojo-backend-api/app/api/routes/auth.py`, `eldojo-backend-api/app/models/session_sync_ticket.py`, `eldojo-backend-api/app/core/security.py`
**Riesgo**: Muy bajo — código no usado
**Validación**: `pytest` o probar endpoints restantes siguen funcionando

---

### PRIORIDAD MEDIA: Dominio, Builds y Nginx (4 tickets)

#### TICKET 5: Configuración por entorno — Variables ENV por aplicación
**Objetivo**: Cada app conoce SU propia URL y la del público, sin heurísticas de hostname.
- Crear `.env.public`, `.env.admin`, `.env.student`
- Variables mínimas por entorno:
  ```
  EXPO_PUBLIC_APP_ROLE=public|admin|student
  EXPO_PUBLIC_PUBLIC_WEB_ORIGIN=https://eldojo.tech
  EXPO_PUBLIC_APP_WEB_ORIGIN=https://app.eldojo.tech     (solo admin)
  EXPO_PUBLIC_STUDENT_WEB_ORIGIN=https://mi.eldojo.tech  (solo student)
  EXPO_PUBLIC_API_URL=https://api.eldojo.tech/api/v1
  ```
- Simplificar `domains.ts` a ~40 líneas: solo leer de env, no inferir por hostname/puerto
- Eliminar `readConfiguredOrigin`, `hostnameMatchesAny`, `defaultEnvFromHostname`
**Archivos**: `.env.public` (nuevo), `.env.admin` (nuevo), `.env.student` (nuevo), `src/utils/domains.ts` (reescribir)
**Riesgo**: Bajo
**Validación**: Todas las builds generan links correctos

---

#### TICKET 6: Login unificado — Redirección por rol desde el público
**Objetivo**: Que `SignInScreen`/`LoginScreen` hagan redirect simple a `app.` o `mi.` según rol.
- Modificar `handleLoginSubmit` en LoginScreen:
  ```ts
  const result = await signIn({ email, password });
  // signIn ya no hace redirect cross-domain interno, solo guarda tokens
  if (result.user.role === "gym_admin") {
    window.location.href = "https://app.eldojo.tech/?login_fresh=1";
  } else if (result.user.role === "student") {
    window.location.href = "https://mi.eldojo.tech/?login_fresh=1";
  }
  ```
- Eliminar `CrossDomainAuthResult`, `ticketResponse`, `navigateWithBypass` del signIn en AuthContext
- Para academy confirm y student invitation redeem: misma lógica → guardar tokens + redirect al dominio correcto
**Archivos**: `src/screens/auth/PublicSiteScreen.tsx` o `LoginScreen.tsx`, `AuthContext.tsx` signIn
**Riesgo**: Bajo
**Validación**: Login con admin → va a app.eldojo.tech; login con alumno → va a mi.eldojo.tech

---

#### TICKET 7: Configuración Nginx — 3 server blocks independientes
**Objetivo**: Desplegar los 3 builds en 3 dominios con sus propios `root`.
- Template por server block:
  ```nginx
  # eldojo.tech (Público)
  server {
      listen 443 ssl http2;
      server_name eldojo.tech www.eldojo.tech;
      root /var/www/eldojo/dist-public;
      # Serve index.html for SPA fallback
      location / { try_files $uri $uri/ /index.html; }
      # Proxy API
      location /api/ { proxy_pass http://localhost:8000/api/; ... CORS headers ... }
  }

  # app.eldojo.tech (Admin)
  server {
      listen 443 ssl http2;
      server_name app.eldojo.tech admin.eldojo.tech;
      root /var/www/eldojo/dist-admin;
      location / { try_files $uri $uri/ /index.html; }
      location /api/ { proxy_pass http://localhost:8000/api/; }
  }

  # mi.eldojo.tech (Alumnos)
  server {
      listen 443 ssl http2;
      server_name mi.eldojo.tech;
      root /var/www/eldojo/dist-student;
      location / { try_files $uri $uri/ /index.html; }
      location /api/ { proxy_pass http://localhost:8000/api/; }
  }
  ```
- Si hay un solo dominio en dev: proxy por path `/admin/*` → `dist-admin`, `/mi/*` → `dist-student`
**Archivos**: Configuración nginx del VPS (fuera del repo o en `scripts/`)
**Riesgo**: Medio — configuración de servidor
**Validación**: Los 3 dominios cargan sus builds correspondientes

---

#### TICKET 8: Logout global — Flujo consistente en las 3 apps
**Objetivo**: Cualquier logout lleva a eldojo.tech (el público) con limpieza completa.
- Botón logout en AdminShell y en StudentView/SecuritySettings
- Acción de logout ÚNICA:
  1. Llamar `/auth/logout` si existe (opcional)
  2. Borrar access_token, refresh_token, user de storage
  3. `window.location.replace("https://eldojo.tech/?signed_out=1")`
- Eliminar `clear_session`, `signed_out` flag del flujo cross-domain anterior
- Pantalla pública detecta `?signed_out=1` y muestra toast opcional "Sesión cerrada"
**Archivos**: `AdminShell.tsx`, `StudentView.tsx`, `AuthContext.tsx` logout, `PublicSiteScreen.tsx`
**Riesgo**: Bajo
**Validación**: Logout desde admin → llega a público; logout desde alumno → llega a público

---

### PRIORIDAD BAJA: Pulido y flujos edge (3 tickets)

#### TICKET 9: Activación de alumnos — Mantener flujo en dominio público
**Objetivo**: Links de activación/recovery siguen apuntando a `eldojo.tech/activar?...` (público).
- `/activar?token=...` → carga en público, hace redeem, si OK guarda tokens, redirect a `mi.eldojo.tech/?welcome=1`
- `/restablecer-contrasena-alumno?...` → mismo patrón
- `/confirmar-cuenta?...` (academy admin) → mismo patrón, redirect a `app.eldojo.tech/?welcome=1`
- Mailer del backend: actualizar URLs generadas en `build_academy_confirmation_url`, etc. si apuntaban a `app.`
**Archivos**: Backend `mail.py` build URLs, `StudentActivateScreen.tsx`, `ConfirmAccountScreen.tsx`, `StudentPasswordResetScreen.tsx`
**Riesgo**: Bajo
**Validación**: Probar links de activación de admin y alumno

---

#### TICKET 10: Enlaces públicos internos — Navegación inter-dominio correcta
**Objetivo**: Que links de "Panel Admin" y "Mi Portal" naveguen al dominio correcto.
- En el público, si usuario está autenticado como admin → mostrar botón "Ir al panel" → href a `app.eldojo.tech`
- En el público, si usuario está autenticado como alumno → mostrar botón "Mi perfil" → href a `mi.eldojo.tech`
- En admin, link "Ver sitio público" → `eldojo.tech`
- En alumno, link "Volver al inicio" → `eldojo.tech`
**Archivos**: `PublicSiteScreen.tsx` navbar, `AdminShell.tsx` user menu, `StudentView.tsx`
**Riesgo**: Muy bajo
**Validación**: Click en todos los enlaces inter-dominio

---

#### TICKET 11: Desarrollo local — Script de arranque multi-puerto
**Objetivo**: Poder correr las 3 apps en local sin romperse.
- Opción A: `concurrently` o scripts paralelos:
  ```
  "dev:public":  "cross-env EXPO_PUBLIC_APP_ROLE=public  expo start --web --port 8081",
  "dev:admin":   "cross-env EXPO_PUBLIC_APP_ROLE=admin   expo start --web --port 8082",
  "dev:student": "cross-env EXPO_PUBLIC_APP_ROLE=student expo start --web --port 8083",
  "dev": "concurrently \"npm:dev:*\""
  ```
- Opción B: Un solo Expo con 3 rutas `/`, `/admin`, `/mi` simulando los dominios (más simple para dev)
**Archivos**: `package.json` scripts
**Riesgo**: Bajo
**Validación**: `npm run dev` arranca las 3 apps y el flujo login → redirect funciona en localhost

---

## Dependencias y Consideraciones Clave

### Cosas que NO cambian (para alivio):
- ✅ **Todo el backend de FastAPI** permanece idéntico (salvo session_ticket)
- ✅ **Todos los screens internos** (AdminDashboard, StudentsList, StudentProfile, AttendanceHistory...) → CERO CAMBIOS
- ✅ **Todos los componentes UI** (AppButton, AppInput, AppCard, modals) → CERO CAMBIOS
- ✅ **Todas las API calls** (studentsApi, attendanceApi, paymentsApi, etc.) → CERO CAMBIOS
- ✅ **Modelos y schemas de DB** → sin cambios
- ✅ **El paquete Expo/React Native** → se mantiene, no hay que migrar a Next.js ni nada

### Dependencias de orden:
1. Ticket 1 (entries) → debe ir primero
2. Ticket 2 (SimpleAuth) → debe ir antes del 3 y 6
3. Ticket 3 (Navigator) → después del 1 y 2
4. Tickets 5-6 (env + login redirect) → después del 2
5. Ticket 7 (nginx) → Último en producción
6. Tickets 9-11 → en cualquier momento después del 6

### Compatibilidad móvil (Expo iOS/Android):
- Si la app móvil nativa sigue existiendo: mantener el `AppNavigator` ORIGINAL solo para `Platform.OS !== "web"`, o aplicar el mismo patrón de 3 app entries también para builds nativas por separado (Admin .apk vs Student .apk).
- **Decisión recomendada**: Para web → multi-app tradicional; para móvil → mantener un solo binario con el Navigator condicional actual simplificado (no hay session_ticket cross-domain en mobile nativo).

---

## Validación Post-Migración (Checklist final)

1. 🔐 **Admin login**: `eldojo.tech/iniciar-sesion` → admin@... → entra a `app.eldojo.tech`
2. 🎓 **Student login**: `eldojo.tech/iniciar-sesion` → alumno@... → entra a `mi.eldojo.tech`
3. 🚫 **Sin auth en app.eldojo.tech**: visitar directamente → redirect a público/login
4. 🚫 **Rol equivocado**: alumno intenta entrar a app.eldojo.tech → logout + redirect
5. 🔗 **Activación admin**: Link por correo → carga `eldojo.tech/confirmar` → redirect `app.eldojo.tech?welcome=1`
6. 🔗 **Activación alumno**: Link por correo → carga `eldojo.tech/activar` → redirect `mi.eldojo.tech?welcome=1`
7. 🚪 **Logout admin**: Botón logout → `eldojo.tech/?signed_out=1`
8. 🚪 **Logout alumno**: Botón logout → `eldojo.tech/?signed_out=1`
9. 📱 **Build móvil**: Si existe, sigue compilando y funcionando
10. 📊 **Tamaño de bundles**: Cada build <50% del tamaño original (porque no carga admin code en alumno y viceversa)

---

## Riesgos y Mitigación

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|:------------:|:-------:|------------|
| Builds Expo con múltiples entry points no son triviales | **Alta** | Medio | Si falla, usar alternativa: 3 carpetas `packages/public`, `packages/admin`, `packages/student` en monorepo con symlink a `src/components`, `src/api`, `src/screens/admin`, etc. |
| Sesión se "pierde" entre dominios por localStorage aislado | **Muy alta** | Crítico | Esto es **esperado y correcto** en la arquitectura tradicional: el usuario SIEMPRE inicia sesión DESDE el público. El gate de admin/student solo valida el token que el público guardó (lo almacenará en su propio storage al llegar por primera vez con el login). **Nota**: si se usa cookie HttpOnly con dominio `.eldojo.tech` esto es transparente; si localStorage → habrá que re-pedir login cada vez si el usuario navega directamente al dominio sin pasar por el login público (mitigado por el redirect). |
| Expo no soporta bien 3 entry points | Media | Bajo | Plan B: Migrar el LANDING PÚBLICO a HTML/CSS/vanilla JS (el más simple de los 3) en un repo/carpeta separada, y dejar admin + alumno como 2 builds de Expo. |
| Profundidad de dependencias circulares al refactor | Media | Bajo | Hacer commits pequeños por ticket, probar `tsc --noEmit` en cada paso. |

---

## Conclusión

Esta migración es **baja complejidad técnica y alto retorno**:
- No se tocan los ~80% del código que son screens internos y lógica de negocio
- Se elimina ~800 líneas de código altamente bug-prone (session_ticket + hostname gating)
- Los tiempos de carga se reducen de 2-4x
- La base de código pasa de "monolito SPA frágil" a "3 apps pequeñas bien delimitadas"
- El debugging de auth se simplifica de "investigar 6 fuentes de verdad" a "mirar si hay token y qué devuelve /auth/me"
