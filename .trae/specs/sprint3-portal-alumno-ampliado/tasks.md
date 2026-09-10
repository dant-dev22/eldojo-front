# Tasks: Sprint 3 — Portal Alumno Ampliado + Builds Dobles Web

**Archivo spec asociado**: `spec.md` (misma carpeta)
**Inicio Plan**: 2026-09-10

## Nota de orden de dependencia vertical

T1 → T2 → T3 son independientes entre sí y se pueden delegar concurrentemente. T4 depende de ninguno (package.json solo). T5 integración = después de T1-T4. No hay tasks bloqueantes entre sí en T1..T4.

---

## Task 1 — Modal Bienvenida Alumno First Time

**Status**: pending
**Priority**: high
**Cubre ACs**: AC-BIENV-1, AC-BIENV-2, AC-UX-1 (1/3), AC-REUSE-1

### Archivos a tocar
- `src/components/StudentWelcomeModal.tsx` (NUEVO)
- `src/screens/student/StudentHomeScreen.tsx` (MODIFICAR — integrar modal + useEffect first_time)
- (Sin tocar AdminDashboard — constraint)

### Work
1. Crear `StudentWelcomeModal.tsx` componente: 3 pasos, botones Siguiente/Saltar/Comenzar, ProgressDotBar, AppModal wrapper o StyleSheet absoluteFill overlay.
2. Internamente el modal guarda stepIndex 0..2 local. "Saltar" o "Comenzar" (solo en step 2) hacen onDismiss(true) (API call dismiss pattern).
3. En StudentHomeScreen agregar `user.first_time` detection useEffect: si true AND user.role === student → showWelcome = true.
4. onDismiss(save: bool) → si save, llamar `completeFirstTimeTutorial` existente en AuthContext (o `authApi.updateTutorialState` fallback si AuthContext no expone para student). Success → showWelcome = false. Error → mensaje feedback y modal persist.
5. No renderizar para roles != student (backcompat).

### TRs Task 1

| TR id | Tipo | Criterio |
|---|---|---|
| T1-TR1 | rule | Modal monta SOLO cuando `user.first_time === true AND isStudentUser(user)`. Grep `first_time` en StudentHomeScreen + condición. |
| T1-TR2 | rule | Al presionar botón dismiss con save: invoca `authApi.updateTutorialState({ first_time: false })` o wrapper AuthContext existente; success → setShowWelcome(false). Si throw error → modal no se cierra + Text feedback. |
| T1-TR3 | rule | `FIRST_TIME_TUTORIAL_STEPS` en AdminDashboardScreen intacto (length = 4). Grep output L unchanged. |
| T1-TR4 | rubric (0..1, pass ≥1) | 1pt si WelcomeModal tiene skeleton/empty/error states adecuados para el wait de la API call dismiss. 0pt si no tiene loading spinner. |
| T1-TR5 | rubric (0..1, pass ≥1) | 1pt si usa tokens theme `colors`, `spacing`, `radius`, `typography` consistentes. 0pt si hay colores hardcodeados. |

### Completion Evidence
- [ ] Commits en 2 archivos (StudentWelcomeModal new + StudentHomeScreen edit).
- [ ] T1-TR1..T1-TR5 auto-verified pass.

---

## Task 2 — SecuritySettingsScreen (Contraseña + Email)

**Status**: pending
**Priority**: high
**Cubre ACs**: AC-SEC-1, AC-SEC-2, AC-SEC-3, AC-UX-1 (2/3), AC-REUSE-1

### Archivos a tocar
- `src/screens/student/SecuritySettingsScreen.tsx` (NUEVO)
- `src/navigation/AppNavigator.tsx` (MODIFICAR — agregar screen al StudentStack)
- `src/utils/domains.ts` (si fuera necesario, probablemente no)
- Sin tocar `AuthContext` (métodos ya existen en meApi)

### Work
1. Crear `SecuritySettingsScreen.tsx` con 2 bloques AppCard: A) Cambiar contraseña B) Cambiar email.
2. Bloque A: 3 AppInput secureTextEntry (current, new, confirm). Variables `currentPw, newPw, confirmPw`. `canSubmit = current && new.length≥8 && confirm===new && !mutationPending`. Submit → `meApi.changeMyPassword({ current_password, new_password, confirm_new_password })`. Success → limpiar + feedback verde. Error → feedback rojo getErrorMessage.
3. Bloque B: 1 AppInput email + 1 botón. Validación regex básica de email. Submit → `meApi.changeMyEmail({ new_email })`. Success feedback "Se enviará un correo de confirmación a tu nuevo email.". Error feedback rojo.
4. Header arriba: botón Atrás → `navigation.goBack()` (estilo AppButton secondary pequeño o Pressable con Ionicons `arrow-back`).
5. Registrar screen en StudentStack.Navigator L AppNavigator.
6. Skeleton loader while profileQuery carga → no hace falta cargar profile (security no usa profile salvo para datos que no necesita).

### TRs Task 2

| TR id | Tipo | Criterio |
|---|---|---|
| T2-TR1 | rule | Existe export function SecuritySettingsScreen. Está en StudentFlow linking config screens (grep SecuritySettings). Path `/alumno/seguridad` funciona. |
| T2-TR2 | rule | Bloque A change password: `newPw.length < 8` → submit disabled + Text hint visible. `confirm !== new` → hint visible. Submit llama meApi.changeMyPassword con shape {current_password, new_password, confirm_new_password} exacto. |
| T2-TR3 | rule | Bloque A success → inputs limpiados por programación (setState("")). Bloque A error → `<Text>` inline muestra getErrorMessage. |
| T2-TR4 | rule | Bloque B change email: validación regex antes de submit. Submit llama meApi.changeMyEmail({ new_email }). Success muestra feedback; Error muestra feedback. |
| T2-TR5 | rubric (0..1, pass ≥1) | 1pt si pantalla tiene header con Atrás + título grande + 2 AppCard; skeleton si loading mutation; 0pt si no tiene loading state. |
| T2-TR6 | rubric (0..1, pass ≥1) | 1pt si usa AppInput / AppCard / AppButton / colors.theme sin hardcodes. 0pt si hay styles inline hardcodeados. |

### Completion Evidence
- [ ] 2 archivos tocados (SecuritySettingsScreen new + AppNavigator edit).
- [ ] T2-TR1..T2-TR6 auto-verified pass.

---

## Task 3 — AttendanceHistoryScreen paginado 12 items

**Status**: pending
**Priority**: high
**Cubre ACs**: AC-HIST-1, AC-HIST-2, AC-HIST-3, AC-UX-1 (3/3), AC-REUSE-1

### Archivos a tocar
- `src/components/AttendanceSectionView.tsx` (MODIFICAR — constante 10 → 12 + adaptar props si faltan)
- `src/screens/student/AttendanceHistoryScreen.tsx` (NUEVO)
- `src/navigation/AppNavigator.tsx` (MODIFICAR — agregar screen en StudentStack)
- `src/screens/student/StudentHomeScreen.tsx` (opcional — botón quick action "Ver historial" para llegar fácil)

### Work
1. Cambiar const `ATTENDANCE_HISTORY_PAGE_SIZE = 10` → 12 en AttendanceSectionView.tsx.
2. Crear `AttendanceHistoryScreen.tsx`:
   - TanStack parallel queries:
     a) `myProfileQuery = useQuery(["my-profile"], meApi.getProfile, { staleTime: 5_min })` → obtener available_classes para filtro clase.
     b) `summaryQuery = useQuery(["my-attendance-summary", filters], () => meApi.getMyAttendanceSummary(filters), { keepPreviousData: true })`
     c) `historyQuery = useQuery(["my-attendance", { limit: 12, offset, ...filters }], () => meApi.getMyAttendance({ limit: 12, offset, class_id, date_from, date_to }), { keepPreviousData: true })`
   - Filtros state: selectedClassId, dateFrom, dateTo. Al cambiar cualquiera → `setOffset(0)`.
   - `hasMore = history.length > 0 && history.length >= 12 * (Math.floor(offset/12)+1)` → O bien: si `history.length === (page * 12)` hay más.
   - onLoadMore: `setOffset(prev => prev + 12)`.
   - Header navigation back button igual que SecuritySettings.
3. Registrar screen en StudentStack Navigator L AppNavigator.
4. Quick Action opcional en StudentHomeScreen: botón "Ver historial completo" → navigation.navigate("AttendanceHistory").

### TRs Task 3

| TR id | Tipo | Criterio |
|---|---|---|
| T3-TR1 | rule | AttendanceSectionView.tsx grep `ATTENDANCE_HISTORY_PAGE_SIZE = 12`. meApi.getMyAttendance llamado con limit=12 (search string `limit: 12`). |
| T3-TR2 | rule | AttendanceHistoryScreen renderiza AttendanceSectionView con interface Props: studentId = profileQuery.data.student_id, summary, history, isLoadingSummary, isLoadingHistory, onLoadMore, hasMore, classOptions (derived from available_classes), selectedClassId, onClassChange, dateFrom, dateTo, onDateFromChange, onDateToChange, onClearFilters, hasActiveFilters. |
| T3-TR3 | rule | Filtro change (clase o fecha) resetea offset → 0. onLoadMore suma 12. Resultado de página nueva se concatena sin duplicados (key=attendance.id en FlatList o map). |
| T3-TR4 | rule | Empty state muestra el string exacto "Aún no tienes asistencias registradas. ¡Empieza entrenando!". |
| T3-TR5 | rubric (0..2, pass ≥2) | 1pt skeleton loading while queries pending; 1pt filter row layout ordenado (filtro clase + fechas + limpiar). Pass requiere ambos. |

### Completion Evidence
- [ ] 3 archivos tocados (AttendanceSectionView edit, AttendanceHistoryScreen new, AppNavigator edit) + 1 opcional StudentHome.
- [ ] T3-TR1..T3-TR5 auto-verified pass.

---

## Task 4 — Builds Dobles Web Condicionales

**Status**: pending
**Priority**: high
**Cubre ACs**: AC-BUILD-1, AC-BUILD-2, AC-BUILD-3

### Archivos a tocar
- `package.json` (MODIFICAR — scripts + devDeps)
- `src/utils/domains.ts` (MODIFICAR — fallthrough EXPO_PUBLIC_APP_MODE)
- `src/navigation/AppNavigator.tsx` (MODIFICAR — gate cross-role build mode)
- `.trae/documents/sprint3_deploy_notes.md` (NUEVO interno dev, NO cuenta como docu público)

### Work
1. Chequear package.json: ¿cross-env y rimraf existen en devDeps? Si NO → instalarlos `npm i -D cross-env rimraf` (luego continuar).
2. Agregar 3 scripts:
   - `"clean:web": "rimraf dist"`
   - `"build:web:admin": "cross-env EXPO_PUBLIC_APP_MODE=admin expo export --platform web"`
   - `"build:web:student": "cross-env EXPO_PUBLIC_APP_MODE=student expo export --platform web"`
3. Modificar domains.ts `getDomainConfig()`: añadir fallback. Si hostname no matchea public ni app, chequear `process.env.EXPO_PUBLIC_APP_MODE`:
   - "admin" → cfg.isAppHostname=true, cfg.isPublicHostname=false
   - "student" → cfg.isAppHostname=false, cfg.isPublicHostname=true
   - undefined → comportamiento legacy
4. AppNavigator.tsx gates cross-build:
   - (Punto 1, L450 isPublicHostname block o equivalente): Si `EXPO_PUBLIC_APP_MODE === "admin"` && autenticado && `isStudentUser(user)` → signOut + StatusView "Esta app es solo para el staff de la academia. Redirigiendo...".
   - (Punto 2): Si `EXPO_PUBLIC_APP_MODE === "student"` && autenticado && `isGymAdminUser(user)` → signOut + StatusView "Esta app es solo para alumnos. Redirigiendo...".
5. Escribir `sprint3_deploy_notes.md` con server blocks de Nginx de referencia para 2 subdominios + comandos build.
6. Testear scripts sintaxis (no build completo; solo valido JSON y que no haya typos).

### TRs Task 4

| TR id | Tipo | Criterio |
|---|---|---|
| T4-TR1 | rule | package.json JSON válido. Scripts `clean:web`, `build:web:admin`, `build:web:student` existen. `cross-env` y `rimraf` son devDependencies (instalados o listados). |
| T4-TR2 | rule | `domains.ts getDomainConfig`: grep `EXPO_PUBLIC_APP_MODE` = fallback para admin/student cuando hostname no coincide. |
| T4-TR3 | rule | AppNavigator.tsx tiene 2 gates cross-role: admin build no permite students; student build no permite gym admins. Cada gate tiene StatusView con mensaje descriptivo + signOut(true). |
| T4-TR4 | rubric (0..2, pass ≥1) | 1pt si package.json JSON válido al parsearlo (JSON.parse no tira). 2pts si `npm run` (sin args) lista scripts sin romper. Pass ≥1. |

### Completion Evidence
- [ ] 3 archivos tocados (package.json, domains.ts, AppNavigator.tsx) + 1 archivo interno deploy notes.
- [ ] T4-TR1..T4-TR4 auto-verified pass.

---

## Task 5 — Integración Final + Validaciones Globales

**Status**: pending
**Priority**: high
**Depends on**: Task1 ∧ Task2 ∧ Task3 ∧ Task4 completed

**Cubre ACs**: AC-VERIFY-A, AC-VERIFY-B

### Work
1. Run `npm run typecheck` — revisar 0 errors S3 (solo se permite QrScanner.tsx 'jsqr' preexistente). Si hay errors, volver a task ofender y arreglar, regresar.
2. Grep backcompat:
   a) `AdminStackParamList.AdminHome` keys = 6 params: `section`, `focusedStudentId`, `openCreateAttendance`, `openAttendanceManager`, `openAttendanceManagerTab`, `attendanceManagerPrefillStudentId`.
   b) `FIRST_TIME_TUTORIAL_STEPS` length = 4 exact.
3. Grep `isGymAdminUser` usages nuevos = 0; solo debemos agregar `isStudentUser` nuevos.
4. Grep global AttendanceSectionView usado en 2 lugares: StudentDetailModal (admin, previo) + AttendanceHistoryScreen (nuevo). Correcto.
5. Ejecutar `npm run` para listar scripts y verificar los 3 builds.
6. (Opcional) Si hay expo instalado global: `npx expo --help` para sanity check Expo OK.

### TRs Task 5

| TR id | Tipo | Criterio |
|---|---|---|
| T5-TR1 | rule | `npm run typecheck` stdout muestra 1 error permitido (QrScanner.tsx jsqr preexistente) y 0 errors nuevos atribuibles a S3. |
| T5-TR2 | rule | AdminHome params = 6 exact; FIRST_TIME_TUTORIAL_STEPS length = 4. |
| T5-TR3 | rule | `npm run` lista los 3 scripts (clean:web, build:web:admin, build:web:student) sin crash. |

### Completion Evidence
- [ ] Logs typecheck + grep guardados como evidence screenshot/salida
- [ ] T5-TR1..T5-TR3 auto-verified pass.

---

## Resumen Tasks Priority counts

| Prioridad | Cant | IDs |
|---|---|---|
| HIGH | 5 | T1 T2 T3 T4 T5 |
| MED | 0 | — |
| LOW | 0 | — |

Total tasks = 5.
