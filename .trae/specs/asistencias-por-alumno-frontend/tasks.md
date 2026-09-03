# Tasks — Asistencias por Alumno Frontend

Dep graph:
T1 (types) → T2 (api layer) → T3 (AttendanceSectionView) → T4 (integración StudentDetail) → T5 (tsc) → T6 (Review)

| ID | Task | Depends | Estimate | Test Requirement Local |
|----|------|---------|----------|------------------------|
| T1 | Actualizar `src/types/api.ts`: tipos de summary + anidados Attendance backward compat | - | 0.25h | `tsc` sin regressions en cualquier import existente de `Attendance` |
| T2 | `src/api/api.ts` agregar `attendanceApi.getByStudent` y `attendanceApi.getSummary` | T1 | 0.25h | call signature correcta (params + returns Promise<typed>) |
| T3 | Crear `AttendanceSectionView.tsx` component: KPI cards + by_class horizontal bars + paginated history FlatList con "Cargar más" | T1,T2 | 1.5h | render sin data (empty state), render skeletons (isLoading), render full data (by_class no vacío), onPress loadMore offset++ |
| T4 | Integrar en StudentDetail: queries en parallel via useQueries, pasar data a AttendanceSectionView; catch 403 fallback | T1-T3 | 0.5h | snapshot mental: modal alumno abre y muestra sección asistencias |
| T5 | `npx tsc --noEmit` en root dir del proyecto | T1-T4 | 0.1h | 0 errors, 0 type any nueva introducido |
| T6 | Review independiente + validación ACs pass | T1-T5 | 0.1h | checklist AC6 pass |
