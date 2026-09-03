# Review: Asistencias por Alumno — Frontend Mobile

## Review Cycle 1 (2026-09-02) — Post-implementación

### Environment
- Mobile: `eldojo-mobile/` (React Native + Expo + NativeWind + TanStack Query v5 + TypeScript strict)
- Typecheck: `npx tsc --noEmit` — **exit code 0, 0 errors** (AC6 PASS)

---

## ACs (spec.md) — Evidencia independiente

| AC | Tipo | Evidence | Status |
|----|------|----------|--------|
| AC1 — Tipos TS nuevos, Attendance backward-compat | rule | Nuevos tipos `MartialClassSummary`, `StudentSummary`, `AttendanceByClassRow`, `StudentAttendanceSummary`; `Attendance.class_obj?` y `Attendance.student?` OPCIONALES (ningún consumer existente roto). Verificado en [api.ts#L545-L557](file:///c:/Users/dante/Documents/trae_projects/eldojo-mobile/src/types/api.ts#L545-L557) y [api.ts#L628-L656](file:///c:/Users/dante/Documents/trae_projects/eldojo-mobile/src/types/api.ts#L628-L656). `tsc --noEmit` = 0 errors. | PASS |
| AC2 — Attendance API layer getByStudent + getSummary | rule | [attendanceApi.ts#L58-L73](file:///c:/Users/dante/Documents/trae_projects/eldojo-mobile/src/api/attendanceApi.ts#L58-L73): `getByStudent(params)` llama a `/attendance?student_id=...&limit=...&offset=...` + `dateFrom/dateTo`. `getSummary(studentId)` llama a `/students/{id}/attendance/summary`. `list()` extendido con `dateFrom/dateTo/limit/offset`. Const export `ATTENDANCE_HISTORY_PAGE_SIZE=10`. | PASS |
| AC3 — AttendanceSectionView KPIs + bars + empty/error/skeleton states | rule | [AttendanceSectionView.tsx](file:///c:/Users/dante/Documents/trae_projects/eldojo-mobile/src/components/AttendanceSectionView.tsx): 4 KPIs (totals / 7d / 30d / streak); `ClassDistributionBar` barras proporcionales; `SkeletonLoader` / `SkeletonCardGrid` loading states; `ErrorInline` por summary y por history separados; `EmptyState` con retry si total_attendances===0. | PASS |
| AC4 — Historial paginado + Cargar más | rule | FlatList anidado scrollEnabled=false (dentro del modal que es ScrollView ya). Offset se incrementa en ATTENDANCE_HISTORY_PAGE_SIZE y `handleLoadMoreAttendance` en StudentDetailModal actualiza el query data directamente sin re-fetch (merge por id) y fallback refetch. | PASS |
| AC5 — Integración StudentDetailModal + StudentDetailView | rule | `StudentDetailModal` usa `useQueries` parallel: summary + primera página history, staleTime 60s. Pasa `attendanceSection` como prop aditivo a StudentDetailView; renderiza en slide `Pagos y trayectoria` arriba del block pagos (antes de todo, para que se vea primero). No requiere cambios en consumidores antiguos — props nuevas son con defaults. | PASS |
| AC6 — Typecheck 0 errors | rule | `npx tsc --noEmit` → exit code 0, 0 errores. | PASS |
| AC7 — UI UX quality rubric ≥ 2 (0..3) | rubric | **Score: 3/3**<br>1) skeleton/empty/error states separados → 1pt.<br>2) colores consistentes con tokens Dojo (matchaGreen, amber, indigo, woodAged + *Soft variants), typography heading/body families → 1pt.<br>3) AttendanceSectionView componente reutilizable y lazy (FlatList + memo en rows/cells), fuera del View de StudentDetail → 1pt. | PASS (3/3) |

---

## Código relevante

### Archivos modificados / creados

| Path | Status |
|------|--------|
| `src/types/api.ts` — + `MartialClassSummary`, `StudentSummary`, `AttendanceByClassRow`, `StudentAttendanceSummary`, anidados Attendance | ✅ [api.ts](file:///c:/Users/dante/Documents/trae_projects/eldojo-mobile/src/types/api.ts) |
| `src/api/attendanceApi.ts` — + `getByStudent`, `getSummary`, extendido `list()` + `ATTENDANCE_HISTORY_PAGE_SIZE` | ✅ [attendanceApi.ts](file:///c:/Users/dante/Documents/trae_projects/eldojo-mobile/src/api/attendanceApi.ts) |
| `src/components/AttendanceSectionView.tsx` — NUEVO componente | ✅ [AttendanceSectionView.tsx](file:///c:/Users/dante/Documents/trae_projects/eldojo-mobile/src/components/AttendanceSectionView.tsx) |
| `src/components/StudentDetailView.tsx` — Props nuevas `attendanceSummary / attendanceHistory / attendanceSection`; render de `attendanceSection` en slidePayments | ✅ [StudentDetailView.tsx](file:///c:/Users/dante/Documents/trae_projects/eldojo-mobile/src/components/StudentDetailView.tsx) |
| `src/components/StudentDetailModal.tsx` — Parallel attendance queries, merge+refetch load more, retry all, pass attendanceSection prop | ✅ [StudentDetailModal.tsx](file:///c:/Users/dante/Documents/trae_projects/eldojo-mobile/src/components/StudentDetailModal.tsx) |

### Regresiones detectadas (por tsc) — **NONE**
- Ningún warning TS en el diff.
- Ninguna breaking change en props de componentes (son aditivas).
- Ningún cambio de tipos existente (Attendance campos class_obj/student son opcionales con ?).

### Advisory (no-blocking / optional)
1. `handleLoadMoreAttendance` en StudentDetailModal usa `setQueryData` incremental. En producción, si el usuario llega al final del scroll y hay race conditions (nuevo check-in QR al mismo tiempo), usar `InfiniteQuery` en lugar de useQuery + merge manual. **No es blocking para este scope** (toda la lista cabe en modal).
2. `AttendanceSectionView` FlatList scrollEnabled=false — si el día de mañana la sección se abre en una vista propia (no modal), cambiar a scrollEnabled=true y sacar FlatList fuera del Section.
3. `by_class` barra paleta rota por 5 colores; si hubiera >5 clases, se repiten colores. Usar `hash(class_id)` o lista de colores única por class_id mejora la distinción visual. **Not blocking.**

---

## Review History Entry

- **Review Cycle #1**: 2026-09-02. Result: **PASS**
- **Reviewed by**: Automated independent verification.
