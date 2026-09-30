# QR Asistencia Tablet + Registro Manual — Implementation Plan

## 1. Repository Research (Conclusiones)

### Existe INFRAESTRUCTURA REUTILIZABLE que NO hay que re-crear:
1. **Pantalla pública existente**: [PublicAttendanceScreen.tsx](file:///c:/Users/dante/Documents/trae_projects/eldojo-mobile/src/screens/public/PublicAttendanceScreen.tsx)
   - Ruta detectada por regex: `/:orgSlug/:branchSlug/asistencia` (definida en [publicAttendanceRoute.ts](file:///c:/Users/dante/Documents/trae_projects/eldojo-mobile/src/utils/publicAttendanceRoute.ts#L5))
   - YA tiene: lookupStudent por código/nombre, registro de asistencia SIN auth, selector de clase, QrScanner integrado, flujo manual, estados de progreso `AttendanceProgressView`
   - Se renderiza SIN login antes que cualquier guard de auth en [AppNavigator.tsx](file:///c:/Users/dante/Documents/trae_projects/eldojo-mobile/src/navigation/AppNavigator.tsx#L383-L389)

2. **API pública existente**: [publicAttendanceApi.ts](file:///c:/Users/dante/Documents/trae_projects/eldojo-mobile/src/api/publicAttendanceApi.ts)
   - `getContext(orgSlug, branchSlug)` → obtiene organización, sucursal, clases del día
   - `lookupStudent(...)` → busca alumno por código único o nombre
   - `register(...)` → registra asistencia sin token, con header `X-Attendance-Source: manual|qr`

3. **Patrones de UI reutilizables**:
   - [AppModal.tsx](file:///c:/Users/dante/Documents/trae_projects/eldojo-mobile/src/components/AppModal.tsx) (base para el popup selector en admin)
   - [DashboardQuickActionsModal.tsx](file:///c:/Users/dante/Documents/trae_projects/eldojo-mobile/src/components/DashboardQuickActionsModal.tsx) (patrón grid de tarjetas seleccionables)
   - [CredencialQRModal.tsx](file:///c:/Users/dante/Documents/trae_projects/eldojo-mobile/src/components/CredencialQRModal.tsx) (renderizado de `react-native-qrcode-svg` + share/copy utilities)

### Piezas que SÍ hay que crear / modificar:
- **Admin**: Agregar botón "Abrir pantalla de recepción (QR tablet)" en la sección **Asistencias** de `AdminDashboardScreen`, que dispara un **AppModal selector** (Sucursal → Clase) con vista previa del QR y acciones (Abrir pestaña nueva / Copiar enlace).
- **Vista Pública Tablet**: La ruta `/:orgSlug/:branchSlug/asistencia` ya existe, pero hay que **adaptarla con un modo "kiosk/tablet"** (UI fullscreen centrada) que muestre:
  1. **Modo predeterminado**: QR GRANDE codificado con la URL pública (para que los alumnos escaneen con su teléfono), OPCIONALMENTE una tab/switch para activar el lector de cámara en la tablet.
  2. **Botón "Registro manual"** prominente debajo → al hacer clic muestra el buscador de alumno + clase, con botón de registrar (flujo que ya existe en `PublicAttendanceScreen`).
- **Utils**: Extender `buildPublicAttendanceUrl` / `buildPublicAttendancePath` para aceptar un parámetro opcional `classId` (query param `?class=X`) que pre-seleccione la clase en la pantalla pública.
- **Whitelist de rutas públicas**: Asegurar que `isPublicAllowedWithoutAuth()` en AppNavigator incluya el path de asistencia con match flexible (ya se maneja por regex en `getPublicAttendanceRoute` antes del guard, así que no hay bloqueo).

---

## 2. Punto de Clarificación (Antes de Aprobar)

> Hay dos interpretaciones para "QR que se muestra en la tablet":
>
> **OPCIÓN A — QR PASIVO MOSTRADO EN TABLET** (default del plan si no se contesta):
> - La tablet muestra un QR GIGANTE codificado con la URL de asistencia pública (`eldojo.tech/:org/:branch/asistencia?class=X`)
> - Los alumnos **escanean ese QR con SUS TELÉFONOS** y completan el registro allí.
> - El botón "Registro manual" en la tablet es el fallback: un alumno se acerca, no tiene teléfono / no puede escanear → se busca a sí mismo en la tablet y registra manualmente.
> - **Ventaja**: No requiere cámara en la tablet (funciona en cualquier tablet/PC). Muy bajo mantenimiento.
>
> **OPCIÓN B — TABLET COMO LECTORA DE QR**:
> - La tablet NO muestra un QR. Abre la CÁMARA (`QrScanner`) directamente para leer LA CREDENCIAL QR FÍSICA DE CADA ALUMNO.
> - El botón "Registro manual" es fallback cuando la credencial no se escanea bien.
> - **Ventaja**: Flujo más rápido cuando todos los alumnos tienen credencial física.
> - **Requiere**: Permisos de cámara persistentes en el navegador de la tablet.

**⚠️ El plan asume OPCIÓN A a menos que indiques lo contrario.** Si quieres Opción B, la pantalla pública tablet cambia: en vez de renderizar un `QRCode` svg, renderiza `QrScanner` por defecto. Ambas comparten el 90% del resto del código (modo manual, modal selector admin, URL params).

---

## 3. Files and Modules (Cambios por Archivo)

| Ruta | Tipo | Cambio Esperado |
|---|---|---|
| `src/screens/admin/AdminDashboardScreen.tsx` | Modificar | (a) Agregar botón CTA "Pantalla recepción QR" en `attendanceHeaderMainContent`. (b) Agregar estado `showQrKioskLauncherModal` + componente `<QrKioskLauncherModal />`. (c) Si el admin tiene múltiples sucursales, el modal primero elige branch, luego clase. |
| `src/components/QrKioskLauncherModal.tsx` | **CREAR** | Nuevo componente: AppModal que lista (sucursales →) clases del día, renderiza QR con la URL pública completa, con botones "Abrir en pestaña nueva" y "Copiar enlace". Reutiliza `QRCode` SVG + `AppButton` + `AppCard`. |
| `src/screens/public/PublicAttendanceScreen.tsx` | Modificar | (a) Agregar `kioskMode` activado automáticamente si viene `?kiosk=1` en URL. (b) En kioskMode: UI fullscreen centrada (ocultar navbar chrome, fondo claro, max-w container). (c) Renderizar el gran `QRCode` SVG en la parte superior (la URL actual para que los alumnos lo escaneen). (d) Botón prominente "Registro manual" (toggle) que expande/colapsa el formulario de búsqueda + selector de clase existente. (e) Pre-seleccionar `classId` si viene `?class=X` en query param. |
| `src/utils/publicAttendanceRoute.ts` | Modificar | (a) Agregar `buildPublicAttendanceUrl(origin, orgSlug, branchName, classId?)` → devuelve URL con `?class=X&kiosk=1` cuando corresponda. (b) Extender `PublicAttendanceRouteParams` type para parsear `classId` y `kiosk` de searchParams. |
| `src/types/publicAttendance.ts` | Modificar | Extender `PublicAttendanceRouteParams` con `classId?: number`, `kiosk?: boolean` (o usar un type paralelo si hay incompatibilidad). |
| `src/navigation/AppNavigator.tsx` | Modificar | Revisar que `isPublicAllowedWithoutAuth` no bloquee paths de asistencia. Ya tiene bypass con `if (publicAttendanceRoute)` al principio, así que probablemente NO se toca, pero se valida. |

---

## 4. Implementation Steps (Órden de Dependencias)

### Paso 1 — Extender Utils de Route con classId + kiosk
**Archivos**: `src/utils/publicAttendanceRoute.ts` + `src/types/publicAttendance.ts`
- Agregar parámetro `classId?: number` y `kiosk?: boolean` opcionales a `buildPublicAttendancePath` y `buildPublicAttendanceUrl`.
- Query params: `?class=<classId>&kiosk=1` (kiosk solo en la URL generada por el admin).

### Paso 2 — Crear QrKioskLauncherModal.tsx (selector en Admin)
- Basar UI en `AppModal` + grid tipo `DashboardQuickActionsModal`.
- Recibir `admin_assignments` (branches) y `classesQuery` (clases) como props.
- Flujo interno: si admin tiene >1 sucursal, selector de branch; luego lista clases de HOY (filtrar por día actual).
- Cada clase seleccionada → renderiza `QRCode` SVG (usar `react-native-qrcode-svg`, igual que `CredencialQRModal`) con la URL final (`buildPublicAttendanceUrl` + kiosk=1 + class=X).
- Botones:
  - 🆕 **Abrir en pestaña nueva** → `window.open(url, "_blank", "noopener")`
  - 📋 **Copiar enlace** → `navigator.clipboard.writeText(url)` con feedback toast/texto inline.

### Paso 3 — Integrar Modal en AdminDashboardScreen (sección Asistencias)
- Agregar estado `boolean showQrKioskLauncherModal` en el top del componente junto a otros modales.
- En `attendanceHeaderMainContent`: agregar un `AppButton` "Pantalla de recepción / QR tablet" (variante primary, icono `monitor`) que setea el modal visible=true.
- Pasar props necesarias al modal: `branchesQuery.data`, `classesQuery.data`, `organizationSlug` (de user assignment o resolver), `publicWebOrigin` (de `getDomainConfig()`).

### Paso 4 — Adaptar PublicAttendanceScreen.tsx con Modo Kiosk
- Parsear `kiosk` y `class` de `window.location.search` (web-only).
- **Si `kiosk === true`**:
  1. Reemplazar el `PublicPageChrome` wrapper por un simple `<View style={styles.kioskContainer}>` (sin navbar, fullscreen).
  2. Renderizar:
     ```
     ┌─────────────────────────────┐
     │  Logo + Nombre Sucursal     │
     │  + clase precargada (si)    │
     │                             │
     │       ▓▓▓▓▓▓▓▓▓▓▓          │
     │       ▓ QR GIGANTE ▓        │
     │       ▓▓▓▓▓▓▓▓▓▓▓          │
     │   "Escaneá con tu teléfono" │
     │                             │
     │  [ 📝 Registro manual ] ◀───┼─── Botón toggle expandible
     │                             │
     │  ┌ SI expandido: ─────────┐ │
     │  │  Buscador de alumno    │ │
     │  │  Selector de clase     │ │
     │  │  [ Registrar ]         │ │
     │  └────────────────────────┘ │
     └─────────────────────────────┘
     ```
  3. Si viene `?class=X`: auto-setear `selectedClassId` y ocultar el selector (a menos que el usuario toque "Cambiar clase").
  4. Después de un registro exitoso en modo kiosk: countdown de 3s + auto-volver a la vista QR pasiva (resetear `studentIdentifier`, colapsar modo manual).
- **Si NO es kiosk mode**: mantener UI existente intacta (100% backward compatible).

### Paso 5 — Validación de Auth Whitelist & URL Directa
- Confirmar en [AppNavigator.tsx](file:///c:/Users/dante/Documents/trae_projects/eldojo-mobile/src/navigation/AppNavigator.tsx#L249) que el bypass de `if (publicAttendanceRoute)` se ejecuta ANTES de cualquier redirección por `status === "unauthenticated"`. Ya está en L383, así que únicamente validar manualmente.
- Confirmar que el regex de `PUBLIC_ATTENDANCE_PATH` no requiere cambios (ya captura `/:org/:branch/asistencia`, los query params son ignorados por el regex y leídos por separado, OK).

### Paso 6 — GetDiagnostics TS Check
- Correr `GetDiagnostics` para confirmar 0 errores.

---

## 5. Dependencies and Considerations

### Dependencias ya instaladas (NO hay que instalar nada nuevo):
- `react-native-qrcode-svg` (en uso por `CredencialQRModal.tsx`)
- `@tanstack/react-query` (en uso, las queries `publicAttendanceApi` ya están tipadas)
- `expo-vector-icons` / `Feather` (todos los íconos listos)

### Compatibilidad:
- **Cero cambios en backend**: Toda la API pública (`/public/attendance/...`) ya existe y funciona sin token.
- **Cero cambios en auth/guards**: La ruta pública ya tiene bypass antes del guard.
- **Backward compatible**: `PublicAttendanceScreen` sigue funcionando igual si NO viene `?kiosk=1`.

### Paleta / UX:
- Seguir restricción B/W del proyecto (Black, #FFFFFF, True Black #000000).
- Modo kiosk: máximo whitespace, tipografía grande para distancia de 1m en tablet, alto contraste.

---

## 6. Validation (Post-Implementación)

| Check | Cómo Verificar |
|---|---|
| TS sin errores | `GetDiagnostics` → [] |
| Botón en Admin abre modal | Ir a `/admin/asistencias` → click botón recepción → modal visible |
| Modal lista clases correctas | Clases del día actual con horario + instructor |
| QR codifica URL válida | Escanear QR con teléfono → abre `eldojo.tech/:org/:branch/asistencia?kiosk=1&class=X` |
| Abrir pestaña nueva funciona | Botón → abre pestaña nueva sin bloqueo de popup |
| Copiar enlace funciona | Botón → navigator clipboard, pegar en nueva tab carga la pantalla |
| Kiosk mode UI fullscreen | Sin navbar, QR grande centrado, botón "Registro manual" visible |
| Modo manual toggle | Click botón → expande buscador + selector clase |
| Pre-selección clase | `?class=X` → selector tiene la clase correcta cargada |
| Registro manual exitoso | Buscar alumno → seleccionar → click Registrar → feedback success → countdown → auto-reset a modo QR |
| Sin sesión NO se bloquea | Abrir URL kiosk en incógnito → muestra la pantalla sin redirigir a login |
| Registro persiste en admin | Después de registrar manual, volver a `/admin/asistencias` → aparece el registro en la lista |

---

## 7. Risks

| Riesgo | Probabilidad | Manejo |
|---|---|---|
| El admin no tiene `organization_slug` visible en `user.admin_assignments[0]` | Media | Agregar fallback: si no hay slug en assignment, resolver desde `organizationsApi.list()` (ya existe) o extraerlo de `meApi`. Guardar en el estado del launcher modal con fallback. |
| `classesQuery.data` en AdminDashboard no tiene todas las clases de todas las branches | Alta si multi-branch | El `classesQuery` actual usa `fixedBranchId`. Para el modal multi-branch, hacer un queryKey por branch seleccionada (`["public-attendance-context", branchSlug]` → llamar a `publicAttendanceApi.getContext(orgSlug, branchSlug)` desde el launcher, ya que este endpoint devuelve LAS CLASES en su payload. Así reutilizamos exactamente las mismas clases que luego usará la pantalla pública. **→ Este approach está mejor, lo usamos directamente.** |
| Popup blocker bloquea `window.open` en admin | Media | El botón "Abrir en pestaña nueva" debe ser un Pressable/Button que dispara window.open en onPress síncrono (no en un setTimeout después de cerrar modal). Si el browser lo bloquea, se muestra un toast "Copiá el enlace y abrilo manualmente" + auto-copy. |
| Browser en tablet no soporta `navigator.share`/`clipboard` | Baja | Fallback a `Prompt` + selección manual de texto. |
| El regex de PUBLIC_ATTENDANCE_PATH no matchea URLs con query params | Baja | Los query params no son parte de `location.pathname`, así que el regex (que matchea pathname) sigue funcionando. Los params se leen por separado. ✅ |
