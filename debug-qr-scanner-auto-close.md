# Debug Session: qr-scanner-auto-close

Status: **[OPEN]**
Created: 2026-08-28

## Bug Description
El escaneo QR cierra el modal automáticamente después de detectar un código, sin mostrar la pantalla de proceso/éxito/error de registro de asistencia. El usuario solo ve la cámara que se cierra de golpe y luego vuelve al formulario, sin feedback del proceso de registro.

Expected: QR detectado → modal permanece abierto, cambia vista al stepper AttendanceProgressView → muestra proceso paso a paso → tarjeta éxito/error → auto-volver a cámara (solo después de éxito 3s).

## Reproduction Steps
1. Navegar a `/<org>/<branch>/asistencia`
2. Tocar "Escanear QR"
3. Apuntar a un QR válido de alumno
4. Observar: modal de cámara se cierra solo, no se muestra pantalla de proceso

## Environment
- Platform: Web (Chrome/Safari mobile?)
- Stack: Expo SDK 56, React Native Web, React Query 5.90

## Hypotheses (falsificables)

### H1: Runtime Exception en AttendanceProgressView
Causa: Acceso a propiedad null/undefined durante el render del stepper → React desmonta el modal AppModal/QrScanner.
Checkpoint: Se reporta error `componentDidCatch` o stack trace en el render de AttendanceProgressView.

### H2: `scannerProcessState` no se settea correctamente
Causa: Race condition en `handleQrCodeScanned` o `openScannerProcess` no recibe valor inicial correcto → `attendanceProcess === null` → cámara nunca cambia a modo proceso y algo dispara onClose.
Checkpoint: Verificar que después de handleQrCodeScanned: scannerProcessState !== null y scannerVisible sigue === true.

### H3: `selectedClassId` === "" impide que se complete el lookup/register
Causa: Falta clase seleccionada → useEffects de sincronización no disparan registro automático → al detectar QR no hay flujo visible pero alguna otra cosa cierra el modal.
Checkpoint: selectedClassId tiene valor NO-vacío inmediatamente después de detectar QR.

### H4: `debouncedStudentIdentifier` no coincide con `normalizedStudentIdentifier`
Causa: El useEffect con setTimeout 350ms sobreescribe el valor inmediato, o los valores no son estrictamente iguales → `resolvedStudent` === null → lookup nunca OK.
Checkpoint: Ambos valores son estrictamente iguales inmediatamente después de handleQrCodeScanned.

### H5: El backdrop press/otro evento dispara onClose accidentalmente
Causa: Algún re-render cambia la posición del modal y un press en la cámara propaga al backdrop → onClose → scannerVisible = false.
Checkpoint: Se registra llamada a onClose del QrScanner inmediatamente después de handleBarcodeScanned.

## Log Key Map
| Code | Significado |
|---|---|
| HANDLE_SCAN | handleQrCodeScanned invocado |
| OPEN_PROCESS | openScannerProcess ejecutado |
| EFFECT_LOOKUP_SYNC | useEffect lookup-sync ejecutado, revisa isLookupSuccess/isLookupError |
| EFFECT_MUTATION_SYNC | useEffect register-sync ejecutado, decide disparar mutate() |
| ONOVERLAY_CLOSE | onClose de QrScanner invocado (padre) |
| RENDER_PROGRESS | AttendanceProgressView inicia render, con valores de props |
| RENDER_ERROR | Error capturado en try/catch de render (vía instrumentación) |
| LOOKUP_ENABLED | studentLookupQuery.enabled === true/false |

## Session Outputs
- `trae-debug-log-qr-scanner-auto-close.ndjson`
- Debug Server: http://localhost:<port>

---
## Changes

