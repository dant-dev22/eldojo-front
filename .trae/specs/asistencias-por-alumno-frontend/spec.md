# Spec: Asistencias por Alumno — Frontend Mobile

**Scope Vertical**: Agregar a la pantalla de **Detalle del Alumno** (actualmente en [StudentDetailModal.tsx / StudentDetail.tsx) la sección de Asistencias — con KPIs, desglose por clase, y listado paginado) usando los endpoints nuevos del backend (`GET /students/{id}/attendance/summary` y `GET /attendance?student_id=...`).

---

## R1 (User / Goal)

> Como **staff / instructor**, cuando entro al detalle de un alumno, quiero ver el historial de asistencias del alumno, KPIs (totales, 7d, 30d, streak) y la distribución por clase, para entender su asistencia sin salir del detalle.

---

## R2 (Non-goals / Out of Scope)

- Check-in de asistencia desde el modal de alumno (out: eso sigue en QR/AttendanceScanner.
- Edición / borrado de asistencias.
- Exportar PDF de historial.

---

## R3 (Tech Stack)

- React Native (Expo) + NativeWind + TypeScript strict.
- TanStack Query (`@tanstack/react-query@5` vía `src/api/queryClient.ts`.
- Zustand stores (`src/store`) solo si es necesario para UI state.
- API layer exists: `src/api/api.ts` con `attendanceApi`, `studentsApi`.

---

## R4 (Architectural Decisions)

AD1: **Usar TanStack Query para:
  - `useQuery(['students.summary.${studentId}summary` con `staleTime: 1 min`.
  - `useInfiniteQuery(['attendance', studentId` NO;` si el listado largo
    crece, pero MVP limit/offset. Para MVP simple usamos paginación limit/offset simple con useQuery + botón "Cargar más".

AD2: **Nuevo types compartido reusable componente `AttendanceSectionView.tsx` en `src/components/domain/students/AttendanceSectionView.tsx` y renderizado por StudentDetailModal.tsx.

AD3: **Nuevo types compartido en `src/types/api.ts`:
  - `MartialClassSummary`, `StudentAttendanceSummary`, `AttendanceByClassRow`.
  - Extender `Attendance`: campos opcionales `.class_obj` y `.student` (backward-compat).

---

## ACs (Criterios de Aceptación — rule / rubric)

### AC1 — Tipos TS correctos y backward-compat (rule)
En `api.ts` agrega `MartialClassSummary`, `Attendance` ahora incluye `AttendanceByClassRow`, `StudentAttendanceSummary`. Extiende `Attendance` anidados `class_obj?` y `student?` opcionales. **Ningún consumer existente de `Attendance` debe romperse.

### AC2 — Attendance API layer (rule)
`attendanceApi.getByStudent({ studentId, dateFrom, dateTo, limit, offset })` llama `GET /attendance?student_id=...` con query params.
`attendanceApi.getSummary(studentId)` llama `GET /students/{id}/attendance/summary`.

### AC3 — AttendanceSectionView — KPIs (rule)
Componente muestra:
- 4 KPI cards: total, last_7_days, last_30_days y streak con iconos y colores NativeWind.
- Lista de barras horizontales de `by_class[]`: cada renglón muestra `Class badge por clase y el `barra proporcional al max_count.
- Loading skeleton mientras queries loading y ErrorBoundary fallback simple si fallan ambas queries (no crashea).
- Si total=0 muestra "Sin asistencias registradas"

### AC4 — Historial paginado (rule)
Debajo de KPIs+by_class hay un `FlatList` paginado:
- Cada fila: fecha+hora check_in_at, `method`, class_obj.name (si existe), discipline badge si existe.
- Botón "Cargar más" al final si `count >= limit: offset += limit, staleTime adecuado.
- Orden: check_in_at DESC (lo garantiza backend).

### AC5 — Integración en StudentDetail (rule)
`StudentDetailModal render AttendanceSectionView` renderiza queries (`useQueries` parallel queries summary + primera página de historial. No bloquea render del student (parallel queries).
- Si student sin asistencias: AC3 empty state OK.
- Authorization 403: muestra fallback "No tienes permisos para ver asistencias".

### AC6 — Typecheck (rule)
`npx tsc --noEmit --project tsconfig.json` 0 errores.

### AC7 — UI UX calidad (rubric 0..3 ≥ 2)
Score ≥2: 1pt por (skeleton/empty/error state, 1pt por (colores consistentes con DojoDesign tokens design system + typography tokens), 1pt por (anidado lazy list item reutilizable fuera del modal student).
