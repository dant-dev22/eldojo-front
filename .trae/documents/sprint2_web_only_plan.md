# Sprint 2 — Portal Alumno Web-Only Implementation Plan
**Objetivo**: Desbloquear el flujo completo del portal alumno **solo Web build (Expo export --platform web)** en `eldojo-mobile`. Sin builds nativos Android/iOS. Sin Expo scheme deep linking nativo. Rutas por URL query params solo.

## Repository Research
### Código reusable YA EXISTENTE (cerca del 70% del Sprint 2)
| Componente | Archivo | Estado actual |
|---|---|---|
| Pantalla Perfil Alumno | `src/screens/student/StudentProfileScreen.tsx` | ✅ 100% funcional: foto picker, clase actual, signOut, `meApi.getProfile/updateProfile` ya consumidos |
| Modal QR Credencial | `src/components/CredencialQRModal.tsx` | ✅ 100% pulido: Web Share API + download, props interface lista (`uniqueCode`, `studentFullName`, `branchName`, `photoUrl`, etc.) |
| Patrón pantalla pública token | `src/screens/auth/ConfirmAccountScreen.tsx` | ✅ Reusable 1:1 para `StudentActivateScreen` (usa `PublicPageChrome`, lee `?token=` de URL, estados loading/success/error, AppButton/AppCard/AppInput) |
| Routing Web URL | `src/navigation/publicRoutes.ts` + `src/utils/domains.ts` | ✅ Enrutamiento basado en hostname/puerto ya funcional. Config `isPublicHostname=localhost:8081` |
| AuthStack + AdminStack | `src/navigation/AppNavigator.tsx` + `src/navigation/types.ts` | ✅ Patrón listo, solo falta agregar StudentStack como 3er caso del switch |
| API types base | `src/types/api.ts` | ✅ `UserRole` ya incluye `"student"`; `LoginResponse`, `User`, `MyProfile`, `StudentAttendanceSummary`, `Attendance` existen |

### Gaps reales a implementar (Sprint 2 scope)
1. **AuthContext bloquea alumnos actualmente**: 6 lugares usan `isGymAdminUser(response.user)` + en caso false → `clearSession + unauthenticated`. Hay que reemplazar por switch por `role`: admin→AdminFlow, student→StudentFlow.
2. **Sin StudentStackParamList / StudentFlow** en navegación: Solo hay 2 stacks (AuthFlow/AdminFlow).
3. **Sin ruta pública `/activar?token=`** en `publicRoutes.ts` + `AUTH_STACK`.
4. **Faltan 6 métodos en APIs cliente**:
   - `authApi.getStudentInvitationPreview(token)` → `GET /auth/student-invitation?token=`
   - `authApi.redeemStudentInvitation(payload)` → `POST /auth/student-invitation/redeem`
   - `meApi.changeMyPassword` → `PATCH /me/password`
   - `meApi.changeMyEmail` → `PATCH /me/email`
   - `meApi.getMyAttendance(limit, offset, class_id?, date_from?, date_to?)` → `GET /me/attendance`
   - `meApi.getMyAttendanceSummary(params?)` → `GET /me/attendance/summary`
5. **Falta 1 nueva pantalla**: `StudentHomeScreen.tsx` (botón QR gigante 1-click + header bienvenida + 3 KPI summary + nav a perfil).
6. **Falta 1 nueva pantalla pública**: `StudentActivateScreen.tsx` (basada en patrón `ConfirmAccountScreen`).
7. **Falta helper `isStudentUser`/`isStudentRole`** en `utils/roles.ts` + `User` type field `email_verified_at` que ya llegó en Sprint 1.

## Files and Modules
### Modificar (cambios incrementales, backward compat)
| Archivo | Cambio esperado |
|---|---|
| `src/utils/roles.ts` | Agregar `isStudentRole()` / `isStudentUser()` type guard. NO tocar `GYM_ADMIN_ROLES`. |
| `src/types/api.ts` | 1) Agregar `email_verified_at: string \| null` a interface `User` (llegó en Sprint 1). 2) Agregar 4 types nuevos: `StudentInvitationStatus`, `StudentInvitationPreviewResponse`, `StudentInvitationRedeemPayload`, `MyPasswordChangePayload`, `MyEmailChangePayload`. NO romper types existentes. |
| `src/api/authApi.ts` | Agregar 2 methods: `getStudentInvitationPreview(token)` + `redeemStudentInvitation(payload)`. Mantener patrón `shouldUseWebFetch()` existente. |
| `src/api/meApi.ts` | Agregar 4 methods: `changeMyPassword`, `changeMyEmail`, `getMyAttendance`, `getMyAttendanceSummary`. Mantener `http` axios instance existente. |
| `src/context/AuthContext.tsx` | **Cambio estructural central**: Reemplazar los 6 `if (!isGymAdminUser(x)) clearSession` por `switch (user.role)`: <br>`org_admin`/`branch_admin`→admin flow (existente); `student`→student flow; `super_admin`→por ahora mantener admin flow; default→throw error. Agregar método `redeemStudentInvitationAndLogin(payload)` a AuthContextValue o `saveSession + setUser`. |
| `src/navigation/types.ts` | Agregar `StudentStackParamList` con `StudentHome`, `StudentProfile`, `AttendanceHistory` (último opcional, usar en Sprint3). NO borrar 6 params de `AdminHome`. |
| `src/navigation/publicRoutes.ts` | Agregar `PUBLIC_ROUTE_SEGMENTS.activateStudent = "activar"` + `PUBLIC_SCREEN_PATHS.ActivateStudent` + incluirla en `isPublicAllowedWithoutAuth()`. Meta opcional (no obligatoria). |
| `src/navigation/AppNavigator.tsx` | 1) Importar StudentStack screens. 2) Agregar `createNativeStackNavigator<StudentStackParamList>()` como `StudentFlow`. 3) Switch routing principal: después de `isGymAdminUser(user) == true → AdminFlow` agregar case `isStudentUser(user) == true → StudentFlow`. 4) Agregar `ActivateStudent` al `AuthStack` actual. 5) Actualizar `isPublicAllowedWithoutAuth()` para incluir la nueva ruta `/activar`. 6) Actualizar `linking.config.screens` con la ruta nueva + StudentFlow paths `/alumno/*` opcional (sin romper admin). |

### Crear (solo 2 archivos nuevos de pantallas)
| Archivo | Descripción |
|---|---|
| `src/screens/auth/StudentActivateScreen.tsx` | Pública sin auth. Basada en `ConfirmAccountScreen` patrón. 3 pasos UI: <br>1) Loading: `GET /auth/student-invitation?token=X` preview<br>2) Success preview: Muestra datos dojo/alumno + suggested_email pre-poblado editable + password + confirm password + checkbox `Acepto términos y condiciones` (obligatorio en payload)<br>3) Submit: `POST /auth/student-invitation/redeem` → on success → `AuthContext.redeemSessionTicket? NO, saveSession manual` → guardar tokens/user → redirect/navigate a `StudentHome`. Estados error 404 token inválido, 409 email duplicate, 401. Usa `PublicPageChrome` + `AppCard/AppInput/AppButton`. |
| `src/screens/student/StudentHomeScreen.tsx` | Pantalla inicial post-login alumno. Layout vertical Web responsive. 4 secciones: <br>1) Header: Saludo `Hola {first_name}` + `Código: {unique_code}` + botón derecha avatar → navega `StudentProfile`<br>2) **Botón QR 1-click gigante** (≥60px alto, width=90%, alto contraste wood/gold, icono `qr-code-outline`): onPress abre `CredencialQRModal` ya existente con props sacadas de `meApi.getProfile()`.<br>3) 3 KPIs `GET /me/attendance/summary` (SkeletonLoader mientras carga): `Últimos 30 días (last_30_days)`, `Total asistencias (total_attendances)`, `Racha días (streak_days)`.<br>4) Navegación pie (opcional, tabs futuro): botón "Ver historial completo" (deshabilitado temporalmente o muestra "Próximamente"). |

## Implementation Steps (dependency order)
1. **Types + Roles (2 archivos, no rompen nada)**: Actualizar `types/api.ts` agregando `User.email_verified_at` y los 6 types nuevos. Agregar `isStudentRole()` + `isStudentUser()` a `utils/roles.ts`.
2. **API Client Layers (2 archivos)**: Agregar 2 methods a `authApi.ts` + 4 methods a `meApi.ts`. Usar tipo de retorno correctos para que `useQuery/useMutation` infiera bien.
3. **AuthContext unblock (1 archivo crítico)**: Refactor de los 6 bloques `if (!isGymAdminUser(x))` → switch por `role`. Para STUDENT: mismo `saveSession + setStatus authenticated` que admin, pero sin cross-domain ticket redirect al panel admin (el portal alumno usa `isPublicHostname` + build dedicado).
4. **Navigator types + public routes (2 archivos)**: Agregar `StudentStackParamList` a types.ts; agregar ruta `/activar` y path segments nuevos a publicRoutes.ts.
5. **AppNavigator routing switch (1 archivo)**: Agregar StudentStack + ActivateStudent al linking config. Implementar el branch routing `if (isStudentUser) → <StudentFlow />` después del branch admin existente. NO borrar ni modificar los 6 params de `AdminStackParamList.AdminHome`.
6. **StudentActivateScreen pública (nuevo archivo)**: Basada en `ConfirmAccountScreen.tsx` estilo. Incluir validaciones locales: password 8+ chars, passwords coinciden, aceptar términos checked. Manejar 4 estados (preview loading, preview ok/form, redeeming, error) y redirección post-success a StudentHome.
7. **StudentHomeScreen (nuevo archivo)**: Consumir `my-profile` query + `attendance/summary` query. Integrar `CredencialQRModal` con props de profile. Botón perfil en header → navegar a `StudentProfileScreen` existente.
8. **Glue final AuthContext para redeem**: Agregar `studentActivateAndLogin(payload: RedeemPayload)` al AuthContext que encapsula redeem + saveSession + setUser, para evitar duplicación de lógica entre StudentActivateScreen (HTTP fetch directo) y contexto.

## Dependencies and Considerations
- **Hard constraint ≤12 items**: El KPI panel no muestra listas, pero si agrega preview de últimas asistencias en el futuro respetar `limit=12, ge=1, le=12`.
- **Backward compat Admin**: NO modificar la firma de `AdminStackParamList.AdminHome`, los 6 params `section/focusedStudentId/openCreateAttendance/openAttendanceManager/openAttendanceManagerTab/attendanceManagerPrefillStudentId` deben seguir funcionando igual.
- **`User.email_verified_at`**: Sprint 1 lo agregó en backend schema `UserRead`. Ahora hay que agregarlo en `types/api.ts` interface `User` para que el frontend tenga el dato y el flujo ActivateScreen pueda setearlo correctamente (redeem lo envía lleno).
- **`accept_terms: bool` obligatorio**: El payload `/auth/student-invitation/redeem` requiere el campo. El schema backend devuelve 422 sin él. Validar localmente antes de submit.
- **CredencialQRModal sin cambios**: Props listas, solo pasar `unique_code` + `full_name` + `photo_url` + `branch_name` de `MyProfile`.
- **Builds Web**: Después del Sprint 4 habrá 2 builds Web separados. Mientras tanto, en dev localhost:8081 (public hostname) servirá el portal alumno y 8082 (app hostname) el admin.
- **Cross-tab storage**: En Web la sesión se guarda en `localStorage` por `utils/storage.ts`. Si un usuario abre dos pestañas (admin + alumno) con distinto rol, la sesión se pisa. Es comportamiento aceptado; en producción los subdominios separan storage.

## Validation
1. **TypeScript Typecheck**: `cd eldo-mobile && npm run typecheck` (tsc --noEmit). **0 errors de tipos = gate de aprobación paso 3/5**.
2. **Smoke screens (no runtime aún)**: Revisar exports de `AppNavigator`, `StudentStack`, `AuthStack` no se rompen.
3. **Checklist manual flows en navegador (después de implementación + backend running)**:
   - 3.1 `GET /activar?token=invalido` → pantalla error amigable, no crash.
   - 3.2 `GET /activar?token=<token_válido>` → preview datos, formulario con email prepopulado editable.
   - 3.3 Submit redeem exitoso → auto redirect a StudentHome con datos.
   - 3.4 Botón QR gigante StudentHome → abre CredencialQRModal con nombre + código correctos.
   - 3.5 Header → StudentProfileScreen existente abre correctamente.
   - 3.6 Login normal alumno post-redeem → pasa por AuthContext y va a StudentFlow (no AdminFlow ni error).
4. **Grep audit de 6 checks isGymAdminUser**: Ejecutar `Grep pattern="isGymAdminUser"` global en eldo-mobile después del refactor → debe seguir existiendo pero los 6 bloques ahora tienen fallback case STUDENT y no clearSession for alumno válido.
5. **Admin regresivo**: Abrir localhost:8082 (admin) → login admin → pasar por la pantalla AdminDashboard con los 6 params funcionales (section=operations abre la pestaña correcta).

## Risks
| Riesgo | Prob | Impacto | Mitigación |
|---|---|---|---|
| Olvidar actualizar uno de los 6 `!isGymAdminUser()` checks → Alumno random recibe `clearSession` y redirección a login | Alta | Crítico | Grep exhaustivo ANTES y DESPUÉS del refactor. Lista manual de 6 ubicaciones (L140, L271, L303, L321, L357, L427, L452 en AuthContext actual). |
| Romper firma params AdminDashboard al editar navigation/types.ts | Baja | Crítico | Editar types.ts solo APPENDEANDO, nunca renombrar ni borrar keys de `AdminStackParamList.AdminHome`. |
| `isPublicAllowedWithoutAuth()` olvida incluir `/activar` → pantalla redirect loop a Home | Media | Alto | Paso 4 de implementación explicitamente incluye la ruta; test manual 3.1 valida antes de cerrar sprint. |
| `email_verified_at` null en User después de redeem → Login devuelve 403 "enlace activación" | Alta | Medio | Agregar campo al type User; Assert manual 3.6: login post-redeem NO tiene que ser 403. |
| Web build URL routing `linking` mal configurado → StudentHome 404 | Media | Medio | Agregar paths al linking config y después testear directamente `/alumno` en URL bar (o dejar sin paths explícitos, solo state navigator). |
| `meApi.updateProfile` usa FormData multipart en Web → browser CORS preflight OPTIONS | Baja | Bajo | Ya funciona hoy (StudentProfileScreen existente); NO tocar `http` axios instance ni interceptors. |
