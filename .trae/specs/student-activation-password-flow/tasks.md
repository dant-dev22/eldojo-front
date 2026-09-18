# Plan de implementación: Nuevo flujo activación alumno (contraseña simple paso)

Cada task incluye Test Requirements (TR) de tipo `rule` o `rubric` según spec.md.

---

## Task 1: Backend — nueva función `send_student_invitation_link_email` y actualización de mail.py

**Priority**: high
**Status**: pending
**Read first paths**:
- `app/core/mail.py` (eldojo-backend-api)
- `app/core/config.py` (settings: student_invitation_url_base)

### Description

En `app/core/mail.py`, crear `send_student_invitation_link_email(recipient_email, recipient_name | None, dojo_name | None, invitation_link: str, expires_hours: int = 48) -> bool`, con el mismo patrón fail-open de `send_student_verification_code_email`. Plantilla de texto: asunto claro, link completo visible, expiración en 48h.

**Test Requirements**:
- TR1 (rule): Con SMTP válido, la función devuelve True y se entrega un correo que contiene exactamente el `invitation_link` provisto.
- TR2 (rule): Con SMTP no configurado o fallando, devuelve False sin elevar exception.
- TR3 (rule): El asunto NO contiene "código" ni dígitos tipo OTP; sí contiene palabras de activación.

---

## Task 2: Backend — enviar link automáticamente al crear alumno y al resend-invitation

**Priority**: high
**Status**: pending
**Read first paths**:
- `app/api/routes/students.py` (rutas create_student, resend_student_invitation)
- `app/core/student_invitation.py` (build_student_invitation_link)
- `app/models/organization.py` (name field)

### Description

**Punto A — create_student**:
Después de `db.commit()` exitoso y antes de refrescar el Student para devolver, si `should_enable_portal == True` y `generated_raw_token` existe:
  - Resolver `dojo_name = organization.name` (ya tenemos la `organization` de validate_student_links).
  - Resolver `recipient_name = f"{payload.first_name} {payload.last_name}"`.
  - Construir link con `build_student_invitation_link(generated_raw_token)`.
  - Llamar a `send_student_invitation_link_email(...)`.
  - Si `mail_ok == True` y el email destinatario es distinto, persistir `email_sent_to` en la invitación recién creada (hacer `refresh` + `commit` o update directo). No revertir transacción por fallo de mail.

**Punto B — resend_student_invitation**:
Eliminar todo el bloque que emite y envía OTP por correo. Reemplazar por:
  - Si la invitación es reconstruíble o nueva, construir `raw_token` (como hoy).
  - Llamar a `send_student_invitation_link_email` con el link completo.
  - Incrementar `sent_count` en 1 respecto al valor previo `new_sent_count` (ya está, no tocar).
  - Si mail OK, update email_sent_to; si no, no hacer nada extra (fail-open).

**Test Requirements**:
- TR4 (rule): `create_student` con SMTP OK → 1 correo enviado con link válido (preview GET retorna status=valid).
- TR5 (rule): `create_student` con SMTP FAIL → 201 response, invitación creada, invitation_link en el response.
- TR6 (rule): `resend-invitation` ya no envía OTP; devuelve `verification_code_sent=False` en portal_access.

---

## Task 3: Backend — simplificar redeem para no requerir OTP / challenge_token

**Priority**: high
**Status**: pending
**Read first paths**:
- `app/api/routes/auth.py` (función `redeem_student_invitation`, líneas ~1165-1275)
- `app/schemas/auth.py` (`StudentInvitationRedeemRequest`)
- `app/core/student_invitation.py` (`_resolve_student_recipient_email`)

### Description

**Punto A — schema `StudentInvitationRedeemRequest`**:
  - Mantener `challenge_token` como opcional por compatibilidad.
  - `password` y `confirm_password` siguen con validador de coincidencia.
  - Añadir: validación de que `email` (si se envía) coincida con el esperado por la invitación, **a nivel de ruta** (no a nivel Pydantic, porque Pydantic no tiene acceso a la BD).

**Punto B — ruta `redeem_student_invitation`**:
  - Eliminar/reemplazar el bloque `if code_hash is not None: ... if code_verified is None and not challenge_ok ... HTTP 409 ... "Debes verificar el código..."`. NO bloquear por falta de OTP verificado.
  - Dejar solo: validar token válido, no usado, no expirado, user existente y activo.
  - Resolver `expected_final_email` con la misma lógica que hoy: `invitation.email_sent_to → student.email → (user.email no placeholder)`.
  - Si `payload.email` es provisto: normalizar y comparar case-insensitive contra `expected_final_email`. Si NO coincide → HTTP 422 `"El correo proporcionado no coincide con el correo registrado en la invitación."`.
  - Si `payload.email` NO es provisto → usar `expected_final_email`.
  - Verificar que `expected_final_email` no sea None/empty; si lo es, 422 (como hoy).
  - Resto del flujo igual que hoy: actualizar user, marcar used_at, invalidate siblings, commit, devolver TokenResponse.

**Test Requirements**:
- TR7 (rule): Redeem con invitación legacy (verification_code_hash != null y verification_code_verified_at = null) sin challenge_token → 200 OK y tokens emitidos.
- TR8 (rule): Redeem con `payload.email` distinto al resuelto → 422 y token NO marcado como usado.
- TR9 (rule): Redeem con passwords distintas (bypass client) → Pydantic 422.
- TR10 (rule): Redeem con token usado → 410 (mantenido).

---

## Task 4: Backend — ajustar preview para no sugerir OTP (campos a false/null)

**Priority**: medium
**Status**: pending
**Read first paths**:
- `app/api/routes/auth.py` (función `preview_student_invitation`, líneas ~878-952)

### Description

En `preview_student_invitation`, mantener la compatibilidad de la firma, pero:
  - Para invitaciones NUEVAS (sin OTP emitido): devolver `verification_code_sent=false`, `verification_code_verified=false`, `verification_code_expires_at=null`, `verification_code_masked_email=null`. Esto ya pasa por diseño si no se emitió OTP.
  - Para invitaciones LEGACY con OTP ya verificado: mantener valores actuales.
  - Para LEGACY con OTP pendiente: `verification_code_sent=true` **PERO** el frontend (Task 6) lo va a ignorar y mostrar formulario de contraseña directamente. Garantizar que el backend redeem sí permita canje sin verify-code.

**Test Requirements**:
- TR11 (rule): Invitación nueva creada tras deploy → preview retorna `verification_code_sent=false`.

---

## Task 5: Frontend — limpiar tipos API y authApi de llamadas OTP (mantención compatibilidad)

**Priority**: high
**Status**: pending
**Read first paths**:
- `eldojo-mobile/src/types/api.ts`
- `eldojo-mobile/src/api/authApi.ts`

### Description

No eliminar tipos de OTP por compatibilidad legacy, pero sí:
  - Asegurarse que `StudentInvitationRedeemPayload` acepte no enviar `challenge_token` (ya lo es, optional).
  - En `authApi.redeemStudentInvitation`, eliminar la dependencia lógica de `challenge_token`; hoy ya es optional.
  - Los métodos `verifyStudentInvitationCode` y `resendStudentInvitationCode` se **mantienen** en el API client pero dejarán de ser invocados desde ActivateAccountScreen. No eliminarlos para no romper otras potenciales referencias. Si no hay referencias, marcar con TODO comentario (pero sin borrar).

**Test Requirements**:
- TR12 (rule): `authApi.redeemStudentInvitation` envia el payload correcto sin `challenge_token`.

---

## Task 6: Frontend — rediseñar ActivateAccountScreen.tsx a UN SOLO PASO

**Priority**: critical
**Status**: pending
**Read first paths**:
- `eldojo-mobile/src/screens/auth/ActivateAccountScreen.tsx`
- Componentes reutilizados: `AppInput`, `AppButton`, `PublicPageChrome`, `StatusView`
- `eldojo-mobile/src/constants/theme.ts` (paleta, spacing)
- `useAuth` hook → método `redeemStudentInvitation` (AuthContext)
- `navigation/types.ts` para rutas

### Description (sub-steps)

1. **Eliminar todos los estados y refs de OTP**: `challengeToken`, `otpValues`, `otpRefs`, `verifyInlineError`, `verifyInlineStatus`, `resendCooldown`, `resendFeedback`, `currentStep` (eliminar el type Step), variables de cooldown, `RESEND_COOLDOWN_SECONDS`, `OTP_DIGITS`. Eliminar imports de OTP / keyboard relacionados si no se usan.
2. **Mantener estados**: `formEmail`, `formNewPassword`, `formConfirmPassword`, `acceptTerms`, `profileFeedback`. Añadir estado `notification` o usar el componente de Toast/Banner que exista en el proyecto (si no existe, crear un bloque visual inline de éxito).
3. **Preview al montar**: igual que hoy — si hay token, llama previewMutation; si no, mensaje de "falta token".
4. **Bloque de resumen (AppCard)**: mantener sección eyebrow + título + descripción + previewBlock (Academia, Código, Estado). Eliminar "Código enviado a xxxxx" de preview block.
5. **Formulario (si redeemable=true)**:
   - Label: "Personaliza tu acceso al portal" o similar.
   - Input **Email**: usar `AppInput` con la prop adecuada para `disabled=true` (o `editable=false` en RN). Valor = `preview.suggested_email` o fallback a `formEmail` que se popula del preview. Subtle visual de "read only".
   - Input **Contraseña**: `AppInput` → label "Contraseña para activar tu cuenta", placeholder EXACTO: "Ingresa la contraseña para activar la cuenta", `secureTextEntry`, minLength 8, `onChangeText` que actualice `formNewPassword` y **cada cambio debe**:
     - Si `formNewPassword.length === 0`: set `formConfirmPassword = ""` y marcar confirm field como disabled.
     - Si `formNewPassword.length >= 1`: habilitar confirm field.
   - Input **Confirmar contraseña**:
     - Inicialmente disabled.
     - Cuando disabled: input se ve gris, no responde a taps, no tiene foco.
     - Placeholder: "Vuelve a ingresar la contraseña".
     - `secureTextEntry`.
   - Switch de términos y condiciones (ya existe, mantener).
   - Validaciones inline en tiempo real:
     - Password <8 → mensaje "Debe tener al menos 8 caracteres".
     - Password y confirmPassword distintas → mensaje "Las contraseñas no coinciden".
     - Términos no aceptados al intentar submit → mensaje.
   - Botón "Activar mi cuenta": disabled mientras fallen validaciones (incluyendo términos).
6. **Comportamiento submit**:
   - Payload a `redeemMutation`: `{ token, new_password: formNewPassword, confirm_password: formConfirmPassword, accept_terms: true, email: formEmail }`. NO incluir `challenge_token`.
7. **Transición éxito**:
   - En `redeemMutation.isSuccess`:
     a) Mostrar banner/toast de éxito: "¡Cuenta activada correctamente! Entrando a tu perfil..."
     b) Timer de 1200-1800 ms.
     c) Después: **navegar a `StudentProfile`**. Usar:
        - Si web: `window.location.replace("/alumno/perfil")` O `navigation.navigate("StudentProfile")` (dado que al estar autenticado el Navigator renderiza StudentFlow, este debe funcionar).
        - Si nativo: `navigation.navigate("StudentProfile")`.
     d) `AuthContext` ya debe haber seteado tokens por la mutación `redeemStudentInvitation` (confirmar comportamiento en AuthContext).
8. **Estados loading/error igual que hoy**: mantener StatusView para `previewMutation.isPending`, `redeemMutation.isSuccess` (loading redirect).

### Consideraciones de diseño

- Paleta consistente con el resto: `agedWood` / `agedWoodSoft` para accents, colores primary/text/textMuted del theme.
- Input disabled: estilo atenuado, borde más claro, background más claro.
- Max 12 elementos visibles por vista (restricción user profile).

**Test Requirements**:
- TR13 (rule): Pantalla sin OTP inputs; solo email (disabled) + 2 password + términos + botón.
- TR14 (rule): Confirmar contraseña inicia disabled; al tipear 1+ caracter en password, se habilita; al borrar todo, se limpia y deshabilita.
- TR15 (rule): Submit OK → banner éxito visible + navigation a StudentProfile en <2.5s.
- TR16 (rule): Submit con password distintas → botón disabled O error inline, no llamada a API.
- TR17 (rule): `formEmail` input no se puede editar (no cambia valor ni gana foco).

---

## Task 7: Frontend — AuthContext y verificación de navegación post-redeem

**Priority**: high
**Status**: pending
**Read first paths**:
- `eldojo-mobile/src/context/AuthContext.tsx` (buscar `redeemStudentInvitation` function)
- `AppNavigator.tsx` (efecto de justLoggedIn, redirect a StudentProfile después de login para alumno)

### Description

- Confirmar que `redeemStudentInvitation` en AuthContext:
  1. Llama a `authApi.redeemStudentInvitation`.
  2. Persiste tokens (access/refresh).
  3. Setea `user`, `status="authenticated"`.
  4. Pone `justLoggedIn=true` o similar para disparar el redirect effect.
- Si hoy el redirect post-login lleva a StudentHome, modificarlo para que cuando sea "justo después de redeem de invitación" lleve a StudentProfile. Opciones:
  - Agregar una flag `postActivationRedirect` en AuthContext state y consumirla en AppNavigator effect.
  - O en ActivateAccountScreen directamente, después del redeem exitoso, hacer `navigation.navigate("StudentProfile")` con setTimeout. Se prefiere la segunda por simplicidad (ya está contemplada en Task 6), pero confirmar que cuando el Navigator se re-renderiza con status=authenticated, el StudentStack está montado y StudentProfile existe en él.
- Asegurar que cuando el alumno tiene sesión iniciada pero visita `/activar?token=...` no crashea; se puede redirigir a `/alumno/perfil` o mostrar mensaje apropiado.

**Test Requirements**:
- TR18 (rule): Después de redeem exitoso, la app redirige a `/alumno/perfil` (web) y la pantalla muestra los datos del perfil, no la Home de alumno.

---

## Task 8: Smoke tests + typecheck

**Priority**: high
**Status**: pending

### Description

- **Frontend**:
  - Ejecutar `npx tsc --noEmit` en el directorio de eldojo-mobile. Debe retornar 0 errores.
  - Revisar que `AppNavigator.tsx` no tenga referencias rotas a `challenge_token` o steps OTP eliminados.
  - Revisar que no haya imports unused en ActivateAccountScreen.
- **Backend** (si hay tests configurados):
  - Si existe script de pytest/uvicorn smoke: ejecutar los tests de auth student-invitation.
  - Sino: validar estructura estática (imports resolubles, Pydantic compila) ejecutando `python -c "from app.api.routes.auth import router; from app.api.routes.students import router; print('OK')"` en el venv del backend.

**Test Requirements**:
- TR19 (rule): `npx tsc --noEmit` exit code = 0.
- TR20 (rule): `python` import test OK = sin excepciones.

---

## Task 9: Verificación independiente de seguridad y edge cases

**Priority**: high
**Status**: pending
**Review-only task** → evidencia para review.md.

Se ejecutará en fase Review: validar manualmente (o con tests de integración si existen) los criterios AC8 de seguridad y casos borde.
