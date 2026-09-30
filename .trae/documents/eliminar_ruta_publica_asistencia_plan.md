# Eliminar ruta pública de asistencia — Plan de Implementación

## Repository Research (Conclusiones)
El usuario ordena explícitamente: **NO debe existir lógica de vista pública de asistencia**. La vista de asistencia (tablet de recepción) **solo debe funcionar con sesión admin iniciada**, es decir, exclusivamente a través de `/admin/asistencias-kiosk`.

### Estado actual
1. **Bypass de AuthGuard en AppNavigator** ([AppNavigator.tsx:L389-L395](file:///c:/Users/dante/Documents/trae_projects/eldojo-mobile/src/navigation/AppNavigator.tsx#L389-L395)): Si la URL matchea regex `/:orgSlug/:branchSlug/asistencia` (via `getPublicAttendanceRoute()`), se renderiza `<PublicAttendanceScreen>` sin login, ANTES de cualquier guardia de autenticación. **Esto es lo que hay que eliminar.**
2. **`PublicAttendanceScreen`** ([PublicAttendanceScreen.tsx](file:///c:/Users/dante/Documents/trae_projects/eldojo-mobile/src/screens/public/PublicAttendanceScreen.tsx)): Pantalla completa con vista pública/kiosk + modo registro manual. Sus props `routeParams` vienen del regex slug. **NO se usará más como ruta pública.**
3. **Sección `attendanceKiosk` en AdminDashboardScreen** ([AdminDashboardScreen.tsx:L4190-L4310](file:///c:/Users/dante/Documents/trae_projects/eldojo-mobile/src/screens/admin/AdminDashboardScreen.tsx#L4190-L4310)): Vista protegida (requiere sesión admin) con QR + metadatos + "Registro manual" button que navega a `/admin/asistencias`. **Esta es la ÚNICA vista tablet permitida.**
4. **Admin Dashboard muestra links/buttons públicos por sucursal** ([AdminDashboardScreen.tsx:L4771-L4791](file:///c:/Users/dante/Documents/trae_projects/eldojo-mobile/src/screens/admin/AdminDashboardScreen.tsx#L4771-L4791)): Bloque "publicRouteBlock" que muestra/copia `eldojo.tech/ORG/BRANCH/asistencia` y llama `openPublicAttendancePage()` con `window.open`. **Estas referencias deben ser REEMPLAZADAS por el link privado `/admin/asistencias-kiosk?branch=X`.**
5. **`QrKioskLauncherModal`** ya no usa rutas públicas — correcto: `adminTabletUrl = app.eldojo.tech/admin/asistencias-kiosk?branch=X&class=Y` (L189-205). Bien orientado a sesión. **Solo requiere remover la importación sin uso `slugifyPublicSegment`.**
6. **utils/publicAttendanceRoute.ts**: Contiene `buildPublicAttendancePath`, `buildPublicAttendanceUrl`, `getPublicAttendanceRoute`. **Funciones quedan sin uso tras el cambio.**

## Files and Modules

| Archivo | Cambio esperado |
|---|---|
| `src/navigation/AppNavigator.tsx` | ELIMINAR: import `PublicAttendanceScreen`, import `getPublicAttendanceRoute`, const `publicAttendanceRoute`, y todo el bloque `if (publicAttendanceRoute) { return ...PublicAttendanceScreen... }` |
| `src/screens/public/PublicAttendanceScreen.tsx` | DEJAR SIN REFERENCIAS (no borrar aún — conservar como archivo legacy por si hay imports en otros proyectos/mobile-only). Si no se usa más en web, se puede remover después. |
| `src/utils/publicAttendanceRoute.ts` | REMOVER los exports `getPublicAttendanceRoute`, `buildPublicAttendancePath`, `buildPublicAttendanceUrl` (o comentar/marcar deprecated). AGREGAR un helper nuevo `buildAdminKioskUrl(origin, branchId, classId?)` para no repetir lógica de armado de query string. |
| `src/components/QrKioskLauncherModal.tsx` | REMOVER import `slugifyPublicSegment` de `@/utils/publicAttendanceRoute` (sin uso ya). Opcionalmente reemplazar armado inline de adminTabletUrl por el nuevo helper. |
| `src/screens/admin/AdminDashboardScreen.tsx` | (A) REEMPLAZAR import `buildPublicAttendanceUrl` por el helper nuevo `buildAdminKioskUrl`. (B) REMOVER función `openPublicAttendancePage` (L538-553) y reemplazarla por `openAdminKioskPage` que abre `/admin/asistencias-kiosk?branch=X`. (C) Reemplazar todos los callsites (L2179-2183 copy; L4771-4791 display block + copy + open) para usar link privado. (D) Actualizar strings UI: ya no es "liga pública", es "liga tablet (sesión requerida)". |

## Implementation Steps (ordenado por dependencia)

1. **Paso 1 — Nuevo helper en `publicAttendanceRoute.ts`**: Agregar `buildAdminKioskUrl(origin, branchId, classId?)` (quedará como único helper activo; marcar los viejos como deprecated).
2. **Paso 2 — Eliminar bypass en `AppNavigator.tsx`**: Quitar imports de `PublicAttendanceScreen` y `getPublicAttendanceRoute`; eliminar la detección `publicAttendanceRoute` y el early-return que renderiza la pantalla sin auth.
3. **Paso 3 — Limpiar `QrKioskLauncherModal.tsx`**: Eliminar import sin uso de `slugifyPublicSegment`; opcionalmente migrar armado de `adminTabletUrl` al nuevo helper.
4. **Paso 4 — Reemplazar callsites en `AdminDashboardScreen.tsx`**:
   - Cambiar import al helper nuevo
   - Borrar `openPublicAttendancePage` y crear `openAdminKioskPage` (abre `/admin/asistencias-kiosk?branch=X` con `window.open`)
   - Actualizar el menú contextual de sucursales (L2179+)
   - Actualizar el bloque `publicRouteBlock` por sucursal (L4771+) en labels, urls y funciones
5. **Paso 5 — Verificación TypeScript**: `npx tsc --noEmit` para detectar imports rotos o references.

## Dependencies and Considerations
- **Breaking change intencional**: Cualquier bookmark/link viejo a `eldojo.tech/ORG/BRANCH/asistencia` ya no bypass-eará auth. Si el usuario navega ahí sin sesión, caerá en el landing público (comportamiento normal), y con sesión admin activa en `app.eldojo.tech` no habrá match.
- **Builds Expo Web**: Este cambio toca sólo el código fuente de Eldojo Mobile; los 3 builds (public/app/student) deben ser regenerados.
- **Mobile-only**: ¿PublicAttendanceScreen se usa en mobile? Grep sólo devolvió 4 archivos web. No tocar la screen por ahora (legacy-safe).
- **String updates**: Nótese que el proyecto usa paleta Negro/Blanco/TrueBlack; los cambios de UI son de labels/copy, no de tokens de diseño.
- **No tocar auth**: Nunca alterar `useAuth`, cookies o token handlers (hard constraint del proyecto).

## Validation
1. **TypeScript**: `cd eldojo-mobile ; npx tsc --noEmit` — 0 errors.
2. **Manual routing checks** (inspección de código, no necesita deployar aún):
   - En `AppNavigator.tsx`: No existe mención de `PublicAttendanceScreen` ni `getPublicAttendanceRoute`
   - En `AdminDashboardScreen.tsx`: 0 llamadas a `buildPublicAttendanceUrl` ni `openPublicAttendancePage`
   - Todo link "tablet" termina en `/admin/asistencias-kiosk?branch=<id>[&class=<id>]`
3. **Regresión**: Correr `GetDiagnostics` (linting) antes de cerrar.

## Risks
| Riesgo | Mitigación |
|---|---|
| Links públicos compartidos previamente dejen de funcionar | Intencional (lo pide el usuario). Se considera "correcto" por ahora. |
| Olvido de un callsite a `buildPublicAttendanceUrl` en otras ramas | Grep post-cambios para pattern `buildPublicAttendance|getPublicAttendance|openPublicAttendance` en `src/` |
| Import type de `PublicAttendanceRouteParams` quede en `PublicAttendanceScreen.tsx` | Se mantiene el archivo screen sin borrar; types quedan autogestionados |
| `publicAttendanceOrigin` variable sin uso | No importa; quitar la variable solo si rompe lint (var sin uso) |
