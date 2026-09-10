# Spec: Sprint 3 — Portal Alumno Ampliado + Builds Dobles Web

**Fecha de especificación**: 2026-09-10
**Repositorio principal**: `eldojo-mobile` (solo cambios Web; repo `eldojo` = panel staff sin tocar)
**Backend**: `eldojo-backend-api` — sin cambios de código, endpoints Sprint 1 reutilizados.

---

## 1. Problema / Contexto

Sprint 2 cerró el MVP Web del Portal Alumno: activación con token, Home con botón QR + 3 KPIs, reutilización de `StudentProfileScreen`. Falta cerrar 4 huecos funcionales + la capacidad real de deployar 2 builds condicionales a los 2 subdominios establecidos en arquitectura:

| Gap actual | Impacto |
|---|---|
| Alumnos con `first_time === true` no reciben bienvenida; staff sí (AdminDashboard tiene tutorial 4 steps). | Onboarding inconsistente entre roles. |
| Sin pantalla de `SecuritySettings`: los endpoints `PATCH /me/password` y `PATCH /me/email` no tienen UI consumidora. | Alumno no puede auto-gestionar credenciales; soporte manual. |
| Sin pantalla `AttendanceHistoryScreen`: endpoint `GET /me/attendance` listo pero no hay paginación 12 items + filtros de fecha/clase para alumno. | Muestra `last_30_days` en Home pero no hay detalle. |
| 2 builds Web condicionales no están parametrizadas (`EXPO_PUBLIC_APP_MODE=admin|student`) + script build + server blocks Nginx falta. | Deploy manual no escala a 2 subdominios distintos (admin.eldojo.tech / mi.eldojo.tech). |

## 2. Users / Goals / Non-goals

**2.1 Usuarios objetivo**
- `ROLE=student` → Portal del Alumno (subdominio `mi.eldojo.tech` en PROD)
- `ROLE=org_admin / branch_admin / instructor / receptionist` → Panel Staff (subdominio `admin.eldojo.tech` en PROD) — sin nuevas features en Sprint 3.
- DevOps / owner del repo → capacidad de build doble condicional + deploy scripts.

**2.2 Goals del Sprint 3**
1. **Bienvenida Web-only**: Alumno `first_time=true` ve modal de bienvenida 3 pasos; al dismiss llama `authApi.updateTutorialState({ first_time: false })`.
2. **Seguridad alumno**: Screen `SecuritySettings` con 2 forms — cambio de contraseña y cambio de email; validaciones client-side; consume `meApi.changeMyPassword` / `changeMyEmail`.
3. **Historial alumno paginado**: Screen `AttendanceHistoryScreen` reutilizando `AttendanceSectionView` existente; page size = **12 items hard constraint**; filtros por clase y rango de fecha; `hasMore` button "Cargar más".
4. **Builds condicionales doble deploy**:
   - `package.json` script `build:web:admin` / `build:web:student`.
   - `src/utils/domains.ts` respeta `EXPO_PUBLIC_APP_MODE` para determinar default hostname si está presente.
   - `README`-level build instructions NO: no escribir docs (constraint sistema). Solo `package.json` y 1 archivo `.trae/documents/sprint3_deploy_notes.md` como bitácora técnica interna (no .md público unless pedido — este no cuenta como docu de entrega al cliente).

**2.3 Non-goals / Out of Scope**
- NO construir nada nuevo para rol staff/admin; solo preservar backcompat con su tutorial existente.
- NO reescribir `AttendanceSectionView`; solo parametrizar `PAGE_SIZE` y adaptar el consumer para alumno si difiere de admin.
- NO configurar Nginx en el VPS en este spec (fuera de alcance: requiere acceso SSH/consola). Solo entregamos server blocks de referencia + script build parametrizado.
- NO builds Android/iOS nativo (hard constraint ya impuesto: Web-only).
- NO traducciones i18n; strings en español igual que el resto.

## 3. Tech Stack + Constraints

### Stack (igual que Sprint 2)
- React Native Web (Expo) + TypeScript strict
- React Navigation Native Stack v7
- TanStack Query v5 (staleTime 60s–120s)
- StyleSheet.create con design tokens `@/constants/theme` (aged wood primary, etc.)
- Build Web: `expo export --platform web`

### Hard constraints a respetar
- **≤12 items/página**: `meApi.getMyAttendance()` siempre pasa `limit=12`. `AttendanceSectionView` tenía `ATTENDANCE_HISTORY_PAGE_SIZE=10`; bump a 12 (backward-compat).
- **Solo Web builds**: No `expo run:android` ni scheme deep linking `eldojo://`. Rutas URL path-only.
- **Backcompat Admin 100% intacto**:
  - `AdminStackParamList.AdminHome` 6 params (`section`, `focusedStudentId`, `openCreateAttendance`, `openAttendanceManager`, `openAttendanceManagerTab`, `attendanceManagerPrefillStudentId`) — NO renombrar/borrar.
  - Tutorial admin de `AdminDashboardScreen` — NO borrar steps ni cambiar FIRST_TIME_TUTORIAL_STEPS.
- **Campo `accept_terms`**: ya está cerrado en Sprint 2, no volver a tocar.
- **Build condicional respeta dominios**: `mi.eldojo.tech` = `EXPO_PUBLIC_APP_MODE=student` (StudentFlow como home autorizado). `admin.eldojo.tech` = `EXPO_PUBLIC_APP_MODE=admin` (AdminFlow como home autorizado).

### Assumptions
- `process.env.EXPO_PUBLIC_APP_MODE` está disponible al build time con Expo Web; `getDomainConfig()` puede usarlo como hint cuando hostname no se puede inferir (localhost dev).
- Attendance list row ya está implementado en `AttendanceSectionView`; solo hay que conectar el data-source a `/me/attendance` y filtrar `by_class` con lista de `profile.available_classes` que ya devuelve `/me`.

## 4. Requisitos Funcionales

**R1 — Modal Bienvenida Alumno (Web-only)**
R1.1. Ubicación: dentro de `StudentHomeScreen`, useEffect detecta `user.first_time === true` AND role=student → monta `<StudentWelcomeModal />`.
R1.2. 3 pasos, texto:
  - Paso 1: "Tu credencial QR → muestra este código en cada clase para marcar tu asistencia." (con ícono QR gigante falso)
  - Paso 2: "Tu progreso → revisa tu historial, pagos y cinturones desde Mi Perfil."
  - Paso 3: "Tu seguridad → cambia tu contraseña y email cuando quieras desde Configuración."
R1.3. Botón "Siguiente" y "Saltar" en cada step. Paso final: botón "¡Comenzar!" = dismiss + API call a `authApi.updateTutorialState({ first_time: false })` (reutilizar AuthContext, no crear método nuevo si existe `completeFirstTimeTutorial`; usar el existente).
R1.4. Persistencia state: si API call falla, modal reaparece en siguiente refresh hasta que success.

**R2 — Security Settings (Cambio contraseña + email)**
R2.1. Nueva screen `SecuritySettingsScreen.tsx` en `src/screens/student/SecuritySettingsScreen.tsx`.
R2.2. Registrar en `StudentStackParamList.SecuritySettings` ya existente de Sprint 2 types.
R2.3. Linking path `alumno/seguridad` ya agregado en Sprint 2 — conectar screen.
R2.4. Bloque A: Cambiar contraseña. Campos:
  - `current_password` (secureTextEntry)
  - `new_password` ≥8 chars
  - `confirm_new_password` = match
  - Submit → `meApi.changeMyPassword(payload)`. Success: limpiar campos + mensaje verde. Error: mensaje rojo con `getErrorMessage`.
R2.5. Bloque B: Cambiar email. Campo:
  - `new_email` (valido regex email)
  - Submit → `meApi.changeMyEmail(payload)`. Success: alerta "Te enviaremos un correo para confirmar tu nuevo email." (mensaje fidedigno backend 200).
R2.6. Botón arriba a la izquierda "←" para navegar `navigation.goBack()` (dentro del stack StudentStack).

**R3 — Attendance History (paginado 12 items)**
R3.1. Nueva screen `AttendanceHistoryScreen.tsx` en `src/screens/student/AttendanceHistoryScreen.tsx`.
R3.2. Registrar en linking `alumno/asistencia` (ya existente en Sprint 2).
R3.3. **Reutilizar 100% `AttendanceSectionView` component** ya existente en `src/components/AttendanceSectionView.tsx`.
R3.4. Bump constante `ATTENDANCE_HISTORY_PAGE_SIZE` de 10 → 12 (hard constraint ≤12).
R3.5. Data sources:
  - summary: `meApi.getMyAttendanceSummary()` (con filtros dateFrom/dateTo/classId)
  - history: `meApi.getMyAttendance({ limit: 12, offset, classId, dateFrom, dateTo })`
R3.6. Filtros: dropdown clase `AppSelect` con options = `MyProfile.available_classes.map(c => ({ label: c.name, value: String(c.id) }))`; 2 pickers fecha `AppDateInput` rango desde/hasta; botón "Limpiar filtros".
R3.7. Paginación: botón "Cargar más" al final si `history.length === 12 * currentPage` (porque next page existe). Presionar = offset += 12, concat al array actual.
R3.8. Empty state: sin asistencias → "Aún no tienes asistencias registradas. ¡Empieza entrenando!"

**R4 — Builds Web condicionales (doble deploy)**
R4.1. Variable `EXPO_PUBLIC_APP_MODE ∈ {"admin" | "student" | undefined}`.
R4.2. 3 scripts nuevos en `package.json`:
  - `"build:web:admin": "cross-env-shell EXPO_PUBLIC_APP_MODE=admin expo export --platform web"`
  - `"build:web:student": "cross-env-shell EXPO_PUBLIC_APP_MODE=student expo export --platform web"`
  - `"clean:web": "rimraf dist"`
R4.3. Instalar `cross-env` + `rimraf` como devDependencies (SOLO si no están presentes — chequear package.json antes).
R4.4. Actualizar `src/utils/domains.ts` `getDomainConfig()`: cuando hostname no coincide con nada (localhost dev / preview build local), si `EXPO_PUBLIC_APP_MODE === "admin"` → default cfg.isAppHostname=true (panel admin como home autorizado). Si `EXPO_PUBLIC_APP_MODE === "student"` → default cfg.isPublicHostname=true. Si undefined → comportamiento actual (prioridad hostname puerto).
R4.5. Restricción app mode para evitar leak entre builds:
  - `AppNavigator.tsx` → si `EXPO_PUBLIC_APP_MODE === "admin"` y usuario autenticado es student → `signOut + mensaje "Esta app es solo para staff"`;
  - Si `EXPO_PUBLIC_APP_MODE === "student"` y usuario autenticado es gym admin → `signOut + mensaje "Esta app es solo para alumnos"`.

## 5. Requisitos No Funcionales (NFRs)

- **Typecheck 0 errors Sprint 3**: `npm run typecheck` al final debe pasar con 0 errors debidos a Sprint 3. El error preexistente `QrScanner.tsx` dependency `jsqr` queda fuera (no se toca QrScanner).
- **No crashes en states**: skeleton loading, empty state, error state para todas las queries nuevas.
- **Auditoría backcompat Admin**: grep de `AdminHome.params` al final = unchanged; `isGymAdminUser` usage = unchanged (solo agregamos guards `isStudentUser` nuevos).
- **Bundle size Web sin growth >15KB gzzipped**: los 3 screens nuevos deben usar componentes existentes sin agregar librerías nuevas pesadas (solo agregar `cross-env` + `rimraf` devDependencies si faltan).

---

## 6. Criterios de Aceptación (rule | rubric)

### ACs rule (condición binaria verificable)

**AC-BIENV-1 (rule)**
> Cuando un user student con `first_time=true` navega a StudentHome por primera vez, se muestra un modal de bienvenida 3 pasos. Al hacer "¡Comenzar!" se llama a API update tutorial `first_time=false`. Si API call success → modal no vuelve a aparecer aunque refresh. Si falla → modal persiste.
> Evidence: search `first_time` usages + grep StudentWelcomeModal references + mock review code path.

**AC-BIENV-2 (rule)**
> Modal student NO aparece para rol org_admin/branch_admin/instructor/receptionist ni afecta el tutorial staff existente. Tutorial AdminDashboard 4 steps quedan INTACTOS.
> Evidence: grep FIRST_TIME_TUTORIAL_STEPS unchanged.

**AC-SEC-1 (rule)**
> `SecuritySettingsScreen.tsx` existe; export nombrada `export function SecuritySettingsScreen()`. Está registrada en `StudentStack.Navigator` de `StudentFlow` en AppNavigator. Linking config `alumno/seguridad` navega a ella.
> Evidence: grep SecuritySettingsScreen x 3: export, stack, linking.

**AC-SEC-2 (rule)**
> Form change password pasa validación: si `new_password.length < 8` → disabled submit + hint; si `new !== confirm` → hint; si valido → llama `meApi.changeMyPassword`. Success limpia inputs. Error se muestra en `feedback` con `getErrorMessage`.
> Evidence: code review conditional canSubmit + onSubmit handler.

**AC-SEC-3 (rule)**
> Form change email valida regex básico email antes de submit; llama `meApi.changeMyEmail`. Success muestra alerta; muestra error si falla.
> Evidence: code review validación + submit handler.

**AC-HIST-1 (rule)**
> Constante `ATTENDANCE_HISTORY_PAGE_SIZE` en `AttendanceSectionView.tsx` ahora = 12. `meApi.getMyAttendance()` llamada con `limit: 12` explícito.
> Evidence: grep constante 12 + llamada.

**AC-HIST-2 (rule)**
> `AttendanceHistoryScreen.tsx` renderiza `AttendanceSectionView` con props: `studentId`, `summary`, `history`, `isLoadingSummary`, `isLoadingHistory`, `onLoadMore`, `hasMore`, `classOptions`, `selectedClassId`, `onClassChange`, `dateFrom/To`, `onDateFromChange`, `onDateToChange`, `onClearFilters`, `hasActiveFilters`. Data sources = `/me/attendance` + `/me/attendance/summary`.
> Evidence: JSX match interface AttendanceSectionViewProps.

**AC-HIST-3 (rule)**
> Filtros clase y fecha cambian query params y resetean offset a 0; "Cargar más" suma 12 al offset y concatena sin duplicar. Empty state muestra string mensaje.
> Evidence: handlers onClassChange, onDateFromChange, onDateToChange, onClearFilters, onLoadMore.

**AC-BUILD-1 (rule)**
> `package.json` scripts `build:web:admin`, `build:web:student`, `clean:web` existen y usan `EXPO_PUBLIC_APP_MODE` con cross-env. Si `cross-env` o `rimraf` no estaban, son devDependencies nuevas listadas.
> Evidence: cat package.json L scripts + devDependencies.

**AC-BUILD-2 (rule)**
> `getDomainConfig()` localhost fallback respeta `EXPO_PUBLIC_APP_MODE`: admin → isAppHostname=true, student → isPublicHostname=true. AppNavigator bloquea cross-role: admin build no loguea alumnos; student build no loguea staff.
> Evidence: code review domains.ts getDomainConfig L fallthrough + AppNavigator L role-based gate.

**AC-VERIFY-A (rule)**
> `npm run typecheck` → 0 errors DEBIDOS A SPRINT 3. (Allow único error preexistente = QrScanner.tsx: Cannot find module 'jsqr').
> Evidence: run command output.

**AC-VERIFY-B (rule)**
> Grep audit backcompat: 1) `AdminStackParamList.AdminHome` keys = 6 params exactos. 2) `FIRST_TIME_TUTORIAL_STEPS` length no cambió (4 pasos).
> Evidence: grep -n outputs.

### ACs rubric (evaluativo escala numérica umbral mín)

**AC-UX-1 (rubric 0..3 ≥ 2)**
> Calidad UX pantallas nuevas (SecuritySettings + AttendanceHistory + WelcomeModal).
> 1pt: skeleton, empty, error states presentes en las 3 screens
> 1pt: tokens colores/spacing/typography consistentes con design system aged-wood en las 3
> 1pt: accesibilidad: Pressable con accessibilityLabel + botón "Atrás" en stack student
> Umbral ≥ 2 para aprobar.

**AC-REUSE-1 (rubric 0..2 ≥ 2)**
> % Reutilización componentes existentes en pantallas nuevas:
> 2pt: (AttendanceSectionView reutilizado al 100% sin duplicación) AND (AppCard / AppButton / AppInput / AppBadge / AppSelect / AppDateInput usados en SecuritySettings o History o Welcome)
> 1pt: uno de los dos
> 0pt: ninguno
> Umbral ≥ 2 para aprobar (fuerza reuse first strategy).

**AC-BUILD-3 (rubric 0..2 ≥ 1)**
> Build scripts corren sin fatal error de sintaxis package.json. cross-env-shell se parsea bien como script.
> 2pt: `npm run build:web:student -- --help` no rompe parseo de scripts (solo --list testear)
> 1pt: scripts syntactically valid JSON package.json
> 0pt: JSON malformed o cross-env sin instalación
> Umbral ≥ 1 para aprobar.
