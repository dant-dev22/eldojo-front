# Especificación: Nuevo flujo de activación de cuenta de alumno (sin OTP, con contraseña doble campo)

## Problema

El flujo actual de activación de alumnos requiere dos pasos: (1) ingresar un código OTP de 6 dígitos enviado por correo y (2) completar un perfil completo con email editable, nombres y contraseña. Esto es complejo para los alumnos y añade fricción. Además, el correo con el link de activación NO se envía automáticamente al crear el alumno desde el admin — el admin debe ejecutar manualmente "reenviar invitación".

## Usuarios

1. **Admin de dojo**: crea alumnos con `enable_portal_access=true` e ingresa el `student_email`.
2. **Alumno final**: recibe el email, abre el link, establece su contraseña y accede al portal.

## Objetivos

- Simplificar el flujo de activación a **un único paso** después de abrir el link.
- Garantizar que el **email no se pueda editar** (previene suplantación).
- Establecer contraseña con doble campo: segundo campo se activa solo después de que el primero tenga contenido.
- Auto-login inmediato después de activación exitosa + redirección al perfil del alumno.
- **Envío automático del link de activación** por correo al momento de crear el alumno (sin necesidad de "reenviar invitación").
- Eliminar la dependencia del código OTP como paso obligatorio.
- Mantener estrategia "fail-open": si el correo SMTP falla al crear alumno, el link sigue siendo válido y reconstruible por el admin.

## No-objetivos

- No cambiar el modelo de tokens de invitación (HMAC determinístico con 48h TTL).
- No cambiar la estructura ORM de `StudentInvitationToken` más allá de lo estrictamente necesario para soportar el nuevo flujo.
- No cambiar el esquema de login normal del alumno.
- No refactorizar el sistema de hashing de contraseñas (se mantiene SHA-256 existente para no romper cuentas activas).

---

## Requisitos funcionales

### RF1 — Creación de alumno: envío automático de link por correo

Cuando el admin llama a `POST /students` con `enable_portal_access=true` y `student_email` poblado:
  - Se debe generar la invitación (token HMAC, nonce, user placeholder) igual que hoy.
  - **Inmediatamente después de commitear**, se debe intentar enviar un correo electrónico al `student_email` conteniendo el **link de activación completo** (no un código OTP).
  - El envío de correo debe implementar estrategia **fail-open**: si SMTP falla (no configurado, timeout, error de red), NO se debe revertir la transacción. La invitación queda válida y el admin puede copiar el link desde el dashboard.
  - El `sent_count` de la invitación debe reflejar que se intentó enviar (mismo valor actual).

### RF2 — Endpoint público preview (sin cambios de firma, sí de semántica)

`GET /auth/student-invitation?token=...` debe:
  - Seguir devolviendo `status ∈ {valid, invalid, used, expired}`.
  - **No requiere verificación OTP**: los campos `verification_code_sent`, `verification_code_verified`, `verification_code_expires_at`, `verification_code_masked_email` pueden conservarse para compatibilidad, pero su valor debe ser `false/null` en el flujo nuevo. De hecho, si existen datos legacy de OTP, se deben **ignorar** a efectos del flujo: el alumno podrá canjear directamente con contraseña, sin necesidad de OTP.
  - Debe devolver `suggested_email` poblado y correcto (igual al `email_sent_to` de la invitación, con fallback a `student.email`, etc.). Este es el email que se mostrará "disabled" en el frontend.

### RF3 — Endpoint público redeem (nueva semántica, firma compatible)

`POST /auth/student-invitation/redeem` debe:
  - **Dejar de requerir `challenge_token` y verificación de código OTP**. Si se recibe `challenge_token`, se ignora silenciosamente (compatibilidad con clientes antiguos).
  - Los campos `verification_code_hash` y `verification_code_verified_at` de la tabla deben **ignorarse** para decidir si se permite canjear. Solo importa: token válido, no usado, no expirado.
  - Validar `password` y `confirm_password` coincidan (longitud mínima 8 chars, validación ya existente en schema Pydantic).
  - El campo `email` del payload debe **coincidir exactamente** (case-insensitive tras normalizar) con el email resuelto para la invitación (`email_sent_to` → `student.email` → `user.email` no-placeholder). Si el frontend envía un email distinto al esperado, debe retornar 422. Si no envía email, se usa el resuelto.
  - Si se valida todo: actualizar `User.email`, `User.password_hash`, `User.email_verified_at`, `User.last_login_at`; marcar invitación como `used_at`; invalidar otras invitaciones pendientes.
  - Devolver `TokenResponse` completo (access + refresh token + user) para auto-login.

### RF4 — Endpoints OTP (compatibilidad legacy)

Los endpoints `/auth/student-invitation/verify-code` y `/auth/student-invitation/resend-code` deben seguir funcionando:
  - Para invitaciones legacy que tienen OTP vigente, deben operar igual.
  - Para invitaciones nuevas (sin OTP), `verify-code` debe retornar `status=code_required` o similar, y `redeem` debe permitir activar directamente sin necesidad del código.
  - Esto garantiza que links de invitación emitidos antes del cambio sigan siendo válidos con su flujo original de 2 pasos.

### RF5 — Resend-invitation admin (ajustado al nuevo flujo)

`POST /students/{id}/resend-invitation` debe:
  - Dejar de emitir OTP automáticamente.
  - En su lugar, **enviar por correo el link de activación** reconstruido (usando HMAC determinístico).
  - Mantener la misma lógica de "si la invitación pendiente tiene nonce, reutilizar la misma URL; si no, regenerar".
  - Mantener fail-open: si el correo falla, no romper nada; el admin sigue pudiendo copiar el link.

### RF6 — Plantilla de correo nueva

Nueva función `send_student_invitation_link_email(...)` en `app/core/mail.py`:
  - Destinatario: alumno.
  - Asunto: "Activa tu cuenta de ElDojo" o similar.
  - Contenido: saludo personalizado, nombre del dojo, **el link completo de activación**, expiración en 48 horas, disclaimer si no solicitó.
  - Devuelve `bool` indicando éxito, igual que la función OTP.

### RF7 — Pantalla `ActivateAccountScreen` (frontend) simplificada

La pantalla debe tener **un solo paso** (eliminar el paso OTP):

1. **Cargar preview**: al abrir con `?token=...`, llamar a `preview_student_invitation`.
2. **Mostrar bloque de resumen**: nombre del alumno, dojo, código alumno si aplica, estado del link.
3. **Formulario de activación** (solo si link válido):
   - Campo **Email**: texto visible, **disabled/readonly**, valor = `preview.suggested_email`. No editable.
   - Campo **Contraseña**: `secureTextEntry`, placeholder = "Ingresa la contraseña para activar la cuenta", mínimo 8 chars.
   - Campo **Confirmar contraseña**: inicialmente **deshabilitado** (grayed out). Se **habilita automáticamente** cuando el campo "Contraseña" tiene al menos 1 carácter. Si se borra el primero, el segundo campo se deshabilita y se limpia su valor. Placeholder = "Vuelve a ingresar la contraseña".
   - Validación en tiempo real de coincidencia de contraseñas.
   - Checkbox de términos y condiciones (como hoy).
   - Botón "Activar mi cuenta" — habilitado solo cuando:
     * Token válido
     * Password ≥8 chars
     * Ambos passwords coinciden
     * Términos aceptados
4. **Al enviar** (`redeemStudentInvitation`):
   - Llamar al endpoint redeem.
   - En **éxito**:
     * Mostrar una notificación Toast / banner de éxito: "¡Cuenta activada correctamente! Redirigiendo a tu perfil..."
     * `AuthContext` ya guarda los tokens y pasa a `authenticated` (hoy el redeem mutation ya lo hace).
     * Redirección **automática** a la pantalla `StudentProfile` (no a `StudentHome`).
     * Debe funcionar tanto en Expo Web (URL change a `/alumno/perfil`) como en móvil nativo (navigation.navigate).
   - En **error**: mostrar mensaje amigable, no crashear.

### RF8 — Eliminación del paso OTP en ActivateAccountScreen

- Se deben eliminar: inputs OTP de 6 dígitos, cooldown timer de reenvío OTP, llamadas a `verifyStudentInvitationCode` y `resendStudentInvitationCode` desde esta pantalla, variables de estado `challengeToken`, `otpValues`, `resendCooldown`, etc.
- La lógica de `currentStep` se simplifica: o hay error de token o se muestra el formulario de contraseña. No hay más "step otp" ni "step profile".
- Si el preview indica que hay OTP enviado (caso legacy), la pantalla **debe ignorarlo** y mostrar directamente el formulario de contraseña. Para los casos realmente legacy que requieran OTP, el backend `redeem` devolverá un error amigable y se podrá manejar; pero según RF3, el backend permitirá redeem sin OTP.

---

## Requisitos no funcionales

### NFR1 — Seguridad

- **No exponer el email completo en la respuesta preview** si el token no es válido (ya existe masking, mantener).
- **No permitir cambiar el email al redeem** (validación servidor-side). Un atacante con el link no puede asignar el alumno a su propio correo.
- **Rate limiting**: si bien no hay OTP, se recomienda no exponer el endpoint redeem sin protección. Por ahora, la validación de token único (SHA-256) + uso único reduce el riesgo. Se registra `used_at` en la transacción con `select ... for update` o equivalente en la redeem actual — mantener o mejorar.
- **Comparación timing-safe**: `hmac.compare_digest` para passwords y tokens — mantener la práctica actual.
- Las contraseñas NO se loguean ni serializan en errores.

### NFR2 — Compatibilidad hacia atrás

- Invitaciones creadas ANTES del deploy deben seguir canjeables. Para legacy con OTP: el backend redeem NO debe bloquear por falta de `challenge_token`; debe permitir redeem directo.
- Schemas Pydantic deben aceptar los mismos campos de entrada, solo relajando la necesidad de `challenge_token`.
- El linking de React Navigation sigue usando `ActivateAccount` con el mismo path.

### NFR3 — Disponibilidad / Fail-open

- Si SMTP no está configurado: la creación del alumno debe seguir funcionando. El link se copia desde el dashboard admin.
- Si el correo de invitación falla: la invitación no se invalida. `sent_count` sí se incrementa para trazabilidad.

### NFR4 — UX / UI

- Diseño UI de alta fidelidad, pulido y responsivo (estilo "ui-ux-pro-max" según perfil del usuario).
- Máximo 12 elementos visibles en pantalla; si aplica, mantener consistencia con la paleta `agedWood`, `agedWoodSoft`, tipografías existentes.
- Estados vacíos, de loading y de error consistentes con el resto del app.
- Validación cliente-side instantánea para contraseñas no coincidentes.

### NFR5 — Type Safety

- `npx tsc --noEmit` debe pasar sin errores en `eldojo-mobile` después de los cambios.
- En backend: `pydantic` schema validation + mypy no se rompen (no se requiere pasar mypy por política, pero sí que los schemas sean coherentes).

---

## Suposiciones y dependencias

- El token HMAC existente (48 horas) es suficientemente seguro para no necesitar OTP adicional.
- El admin ingresa un `student_email` válido al crear. Si no lo hace, el correo no se envía, pero la invitación se crea con el email que tenga en la ficha del alumno (fallback existente).
- `AuthContext.redeemStudentInvitation` ya persiste tokens correctamente y cambia el estado a `authenticated`.
- `StudentProfileScreen` ya existe y funciona con usuario autenticado.

## Preguntas abiertas

Ninguna. Se asume el flujo descrito por el usuario como fuente de verdad.

---

## Criterios de aceptación

### AC1 (rule) — Admin crea alumno y se envía correo con link automáticamente

Condición: Admin autenticado llama a `POST /students` con `enable_portal_access=true` y un `student_email` válido, con SMTP configurado.

Pasar si:
  - Se crea `StudentInvitationToken` en BD.
  - Se envía 1 correo al `student_email` conteniendo una URL que hace match con `/activar?token=...` y el valor del token es válido (el preview devuelve status=valid para ese token).
  - El correo **no contiene un código OTP de 6 dígitos** como cuerpo principal.

### AC2 (rule) — Link de activación abre formulario con email deshabilitado

Condición: Alumno abre el link `/activar?token={válido}`.

Pasar si:
  - La pantalla muestra un input de email con valor = `suggested_email`, atributo `disabled=true` o `editable=false`.
  - La pantalla muestra **solo** dos inputs de contraseña + checkbox términos + submit, sin inputs OTP.
  - El input "Confirmar contraseña" está inicialmente deshabilitado.

### AC3 (rule) — Segundo campo de contraseña se activa condicionalmente

Condición: En la pantalla de activación, con token válido.

Pasar si:
  - Cuando `password.length === 0`, el input Confirmar está deshabilitado y en gris.
  - Cuando `password.length >= 1`, el input Confirmar se habilita y se puede escribir.
  - Si el usuario escribe en Confirmar y luego borra todo de Password, Confirmar se limpia y se deshabilita automáticamente.

### AC4 (rule) — Activación exitosa produce auto-login y redirección a perfil

Condición: Alumno envía formulario con contraseñas válidas y términos aceptados.

Pasar si:
  - Respuesta 200 con TokenResponse.
  - `AuthContext.status === "authenticated"` y los tokens se persisten.
  - Aparece notificación de éxito visible al usuario.
  - En ≤ 2.5s, la aplicación navega a `StudentProfile` (ruta `/alumno/perfil` en web).
  - El usuario aparece con `email_verified_at != null` y su correo es igual al que el admin ingresó.

### AC5 (rule) — Email distinto en payload es rechazado por backend

Condición: Se envía redeem con `email` distinto al resuelto por la invitación.

Pasar si:
  - Backend retorna HTTP 422 con detail que indique que el email no coincide.
  - La invitación NO se marca como usada.

### AC6 (rule) — Contraseñas distintas rechazadas antes de submit (cliente) y en backend

Pasar si:
  - Cliente-side: botón deshabilitado si `password !== confirm_password`.
  - Backend-side: si se envía por bypass, Pydantic retorna error de validación 422.

### AC7 (rule) — Invitación legacy canjeable sin OTP

Condición: Invitación creada antes del deploy, con `verification_code_hash != null` y `verification_code_verified_at = null`.

Pasar si:
  - `redeem` permite activar la cuenta sin enviar `challenge_token`, solo con password + email correcto.
  - El token se marca como usado correctamente.

### AC8 (rubric) — Seguridad y robustez

Escala 0-2. Pass threshold ≥ 1.5.

Anclas:
  - 0: Permite canjear con email distinto; no hay validación server-side de coincidencia de email; no usa timing-safe compare.
  - 1: Valida email coincidente, timing safe, pero sin feedback de error preciso o no controla doble gasto de token en race condición.
  - 2: Validación estricta email + passwords coincidentes + timing safe + race condition safe (used_at en transacción atómica) + mensajes de error que no filtran información sensible.

### AC9 (rubric) — Calidad UI / fidelidad del diseño

Escala 0-2. Pass threshold ≥ 1.5.

Anclas:
  - 0: Diseño roto, inputs mal alineados, estados disabled no distinguibles, sin feedback.
  - 1: Diseño funcional, inputs ordenados, estados disabled visibles, feedback básico de éxito/error.
  - 2: Diseño pulido, consistente con la paleta/theme, animaciones suaves en transitions de disabled, mensajes contextuales, responsive en mobile/web correcto.

### AC10 (rule) — Compilación typescript sin errores

Pasar si `npx tsc --noEmit` en `eldojo-mobile` retorna exit code 0.
