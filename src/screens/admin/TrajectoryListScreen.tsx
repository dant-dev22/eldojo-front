import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { getErrorMessage } from "@/api/http";
import { studentsApi } from "@/api/studentsApi";
import { trajectoryApi } from "@/api/trajectoryApi";
import { AppCard } from "@/components/AppCard";
import { AppInput } from "@/components/AppInput";
import { AdminShell } from "@/components/AdminShell";
import { BeltIndicator } from "@/components/BeltIndicator";
import { Screen } from "@/components/Screen";
import { StatusView } from "@/components/StatusView";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import type { AdminStackParamList } from "@/navigation/types";
import type { Student, StudentTrajectorySummary } from "@/types/api";
import { formatDate } from "@/utils/format";

type Props = NativeStackScreenProps<AdminStackParamList, "TrajectoryList">;
const STUDENTS_PER_PAGE = 20;

function formatStudentStatus(status: Student["status"]): string {
  switch (status) {
    case "active":
      return "Activo";
    case "frozen":
      return "Congelado";
    case "inactive":
      return "Inactivo";
    default:
      return status;
  }
}

export function TrajectoryListScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { contentMaxWidth, isDesktop } = useResponsiveLayout();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [currentPage, setCurrentPage] = useState(1);

  const currentAssignment = user?.admin_assignments[0] ?? null;
  const organizationId = currentAssignment?.organization_id ?? null;
  const fixedBranchId = currentAssignment?.branch_id ?? null;

  const studentsQuery = useQuery({
    queryKey: ["students", debouncedSearch, "trajectory"],
    queryFn: () => studentsApi.list({ search: debouncedSearch.trim() || undefined }),
  });

  const allStudents = useMemo(() => studentsQuery.data ?? [], [studentsQuery.data]);
  const visibleStudents = useMemo(
    () =>
      allStudents.filter(
        (student) =>
          student.deleted_at === null &&
          (!fixedBranchId || student.branch_id === fixedBranchId),
      ),
    [allStudents, fixedBranchId],
  );
  const visibleStudentIds = useMemo(
    () => visibleStudents.map((s) => s.id),
    [visibleStudents],
  );

  const summaryQuery = useQuery({
    queryKey: ["trajectory-summary", organizationId, visibleStudentIds.join(",")],
    queryFn: () =>
      trajectoryApi.summaryByStudent({
        organization_id: organizationId ?? undefined,
        student_ids: visibleStudentIds,
      }),
    enabled: Boolean(organizationId && visibleStudentIds.length > 0),
  });

  const summaryByStudentId = useMemo(() => {
    const map = new Map<number, StudentTrajectorySummary>();
    (summaryQuery.data ?? []).forEach((summary) => {
      map.set(summary.student_id, summary);
    });
    return map;
  }, [summaryQuery.data]);

  const totalStudents = visibleStudents.length;
  const totalEvents = useMemo(
    () =>
      Array.from(summaryByStudentId.values()).reduce(
        (sum, item) => sum + item.total_events,
        0,
      ),
    [summaryByStudentId],
  );
  const studentsWithTrajectory = useMemo(
    () =>
      Array.from(summaryByStudentId.values()).filter((s) => s.total_events > 0)
        .length,
    [summaryByStudentId],
  );
  const totalPages = Math.max(1, Math.ceil(visibleStudents.length / STUDENTS_PER_PAGE));
  const paginatedStudents = useMemo(
    () =>
      visibleStudents.slice(
        (currentPage - 1) * STUDENTS_PER_PAGE,
        currentPage * STUDENTS_PER_PAGE,
      ),
    [currentPage, visibleStudents],
  );

  const sidebarSummary = useMemo(
    () => ({
      organizationName: null,
      suffix: null,
      branchName: null,
      location: null,
      mainSchedule: null,
    }),
    [],
  );

  if (!organizationId) {
    return (
      <Screen
        contentStyle={[styles.screenContent, { alignItems: "center" }]}
        nativeID="screens-admin-trajectory-list-missing-scope-screen"
        testID="screens-admin-trajectory-list-missing-scope-screen"
      >
        <View
          nativeID="screens-admin-trajectory-list-missing-scope-container"
          style={[styles.container, { maxWidth: contentMaxWidth }]}
          testID="screens-admin-trajectory-list-missing-scope-container"
        >
          <StatusView
            nativeID="screens-admin-trajectory-list-missing-scope-status"
            title="No encontramos el alcance admin"
            description="El usuario autenticado no tiene una asignación válida para operar trayectoria."
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      scrollable
      contentStyle={styles.screenContent}
      nativeID="screens-admin-trajectory-list-screen"
      testID="screens-admin-trajectory-list-screen"
    >
      <AdminShell
        activeSection="trajectory"
        onGoBranches={() =>
          navigation.navigate("AdminHome", { section: "branches" })
        }
        onGoDashboard={() => navigation.navigate("AdminHome")}
        onGoDojo={() => navigation.navigate("AdminHome", { section: "dojo" })}
        onGoOperations={() =>
          navigation.navigate("AdminHome", { section: "operations" })
        }
        onGoPayments={() =>
          navigation.navigate("AdminHome", { section: "payments" })
        }
        onGoStudents={() => navigation.navigate("StudentsList")}
        onGoTrajectory={() => navigation.navigate("TrajectoryList")}
        sidebarSummary={sidebarSummary}
        subtitle="registra hitos y recuerdos en la trayectoria de cada alumno"
        title="Trayectoria"
        headerMainContent={
          <View
            nativeID="screens-admin-trajectory-list-header-block"
            style={styles.headerBlock}
            testID="screens-admin-trajectory-list-header-block"
          >
            <View
              nativeID="screens-admin-trajectory-list-header-top"
              style={[
                styles.headerTop,
                isDesktop ? desktopStyles.headerTop : mobileStyles.headerTop,
              ]}
              testID="screens-admin-trajectory-list-header-top"
            >
              <View
                nativeID="screens-admin-trajectory-list-header-copy"
                style={styles.headerCopy}
                testID="screens-admin-trajectory-list-header-copy"
              >
                <Text
                  nativeID="screens-admin-trajectory-list-header-kicker"
                  style={styles.headerKicker}
                  testID="screens-admin-trajectory-list-header-kicker"
                >
                  Trayectoria
                </Text>
                <Text
                  nativeID="screens-admin-trajectory-list-header-title"
                  style={styles.headerTitle}
                  testID="screens-admin-trajectory-list-header-title"
                >
                  Línea del tiempo por alumno
                </Text>
                <Text
                  nativeID="screens-admin-trajectory-list-header-description"
                  style={styles.headerDescription}
                  testID="screens-admin-trajectory-list-header-description"
                >
                  Selecciona un alumno para entrar a su calendario y registrar
                  graduaciones, torneos, exámenes o cualquier hito importante.
                </Text>
              </View>
            </View>

            <View
              nativeID="screens-admin-trajectory-list-metrics-grid"
              style={[
                styles.metricsGrid,
                isDesktop ? desktopStyles.metricsGrid : mobileStyles.metricsGrid,
              ]}
              testID="screens-admin-trajectory-list-metrics-grid"
            >
              <AppCard
                nativeID="screens-admin-trajectory-list-metric-students"
                style={[styles.metricCard, styles.metricInfo]}
                testID="screens-admin-trajectory-list-metric-students"
              >
                <View style={styles.metricCopy}>
                  <Text style={styles.metricTitle}>Alumnos</Text>
                  <Text style={styles.metricValue}>{totalStudents}</Text>
                  <Text style={styles.metricDescription}>
                    Totales en el padrón
                  </Text>
                </View>
              </AppCard>
              <AppCard
                nativeID="screens-admin-trajectory-list-metric-with-trajectory"
                style={[styles.metricCard, styles.metricSuccess]}
                testID="screens-admin-trajectory-list-metric-with-trajectory"
              >
                <View style={styles.metricCopy}>
                  <Text style={styles.metricTitle}>Con trayectoria</Text>
                  <Text style={styles.metricValue}>{studentsWithTrajectory}</Text>
                  <Text style={styles.metricDescription}>
                    Alumnos con al menos un suceso
                  </Text>
                </View>
              </AppCard>
              <AppCard
                nativeID="screens-admin-trajectory-list-metric-events"
                style={[styles.metricCard, styles.metricAmber]}
                testID="screens-admin-trajectory-list-metric-events"
              >
                <View style={styles.metricCopy}>
                  <Text style={styles.metricTitle}>Sucesos totales</Text>
                  <Text style={styles.metricValue}>{totalEvents}</Text>
                  <Text style={styles.metricDescription}>
                    Registrados en la organización
                  </Text>
                </View>
              </AppCard>
            </View>

            <View
              nativeID="screens-admin-trajectory-list-search-row"
              style={styles.searchRow}
              testID="screens-admin-trajectory-list-search-row"
            >
              <AppInput
                nativeID="screens-admin-trajectory-list-search-input"
                testID="screens-admin-trajectory-list-search-input"
                label="Buscar alumno"
                placeholder="Nombre, apellidos o código"
                value={search}
                onChangeText={setSearch}
              />
            </View>
          </View>
        }
      >
        <View
          nativeID="screens-admin-trajectory-list-content"
          style={[styles.container, { maxWidth: contentMaxWidth }]}
          testID="screens-admin-trajectory-list-content"
        >
          {studentsQuery.isLoading ? (
            <AppCard
              nativeID="screens-admin-trajectory-list-loading-card"
              style={styles.loadingCard}
              testID="screens-admin-trajectory-list-loading-card"
            >
              <Text style={styles.loadingText}>Cargando alumnos…</Text>
            </AppCard>
          ) : studentsQuery.isError ? (
            <View style={styles.errorBlock}>
              <StatusView
                nativeID="screens-admin-trajectory-list-error-status"
                title="No pudimos cargar los alumnos"
                description={getErrorMessage(studentsQuery.error)}
              />
            </View>
          ) : visibleStudents.length === 0 ? (
            <AppCard
              nativeID="screens-admin-trajectory-list-empty-card"
              style={styles.loadingCard}
              testID="screens-admin-trajectory-list-empty-card"
            >
              <Text style={styles.resultsTitle}>
                {debouncedSearch.trim()
                  ? "Sin resultados para la búsqueda"
                  : "Todavía no hay alumnos"}
              </Text>
              <Text style={styles.resultsDescription}>
                {debouncedSearch.trim()
                  ? "Prueba con otro nombre, apellido o código."
                  : "Agrega alumnos desde la sección 'Alumnos' y luego vuelve aquí para registrar su trayectoria."}
              </Text>
            </AppCard>
          ) : (
            <AppCard
              nativeID="screens-admin-trajectory-list-results-panel"
              style={styles.resultsPanel}
              testID="screens-admin-trajectory-list-results-panel"
            >
              <View
                nativeID="screens-admin-trajectory-list-results-head"
                style={styles.resultsHead}
                testID="screens-admin-trajectory-list-results-head"
              >
                <Text style={styles.resultsHeadTitle}>
                  Lista de alumnos
                </Text>
                <Text style={styles.resultsHeadMeta}>
                  {visibleStudents.length === 1
                    ? "1 alumno"
                    : `${visibleStudents.length} alumnos`}
                </Text>
              </View>

              <View
                nativeID="screens-admin-trajectory-list-table-head"
                style={[
                  styles.tableHead,
                  isDesktop ? null : mobileStyles.tableHead,
                ]}
                testID="screens-admin-trajectory-list-table-head"
              >
                <Text style={[styles.tableHeadCell, styles.tableColStudent]}>
                  Alumno
                </Text>
                <Text
                  style={[styles.tableHeadCell, styles.tableColBelt]}
                >
                  Cinta
                </Text>
                {isDesktop ? (
                  <Text
                    style={[styles.tableHeadCell, styles.tableColStatus]}
                  >
                    Estado
                  </Text>
                ) : null}
                {isDesktop ? (
                  <Text
                    style={[styles.tableHeadCell, styles.tableColCount]}
                  >
                    Sucesos
                  </Text>
                ) : null}
                {isDesktop ? (
                  <Text
                    style={[styles.tableHeadCell, styles.tableColLast]}
                  >
                    Último suceso
                  </Text>
                ) : null}
                <Text
                  style={[styles.tableHeadCell, styles.tableColActions]}
                >
                  Acciones
                </Text>
              </View>

              <ScrollView
                horizontal={!isDesktop}
                style={styles.tableScroll}
                contentContainerStyle={styles.tableScrollContent}
                showsHorizontalScrollIndicator={false}
              >
                <View style={styles.tableBody}>
                  {paginatedStudents.map((student) => {
                    const summary = summaryByStudentId.get(student.id);
                    return (
                      <View
                        key={student.id}
                        nativeID={`screens-admin-trajectory-list-table-row-${student.id}`}
                        style={styles.tableRow}
                        testID={`screens-admin-trajectory-list-table-row-${student.id}`}
                      >
                        <View
                          style={[
                            styles.tableCell,
                            styles.tableColStudent,
                            !isDesktop
                              ? mobileStyles.tableColStudent
                              : null,
                          ]}
                        >
                          <Text
                            style={styles.studentName}
                            numberOfLines={1}
                          >
                            {student.first_name} {student.last_name}
                          </Text>
                          <Text style={styles.studentCode}>
                            {student.unique_code}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.tableCell,
                            styles.tableColBelt,
                            !isDesktop ? mobileStyles.tableColBelt : null,
                          ]}
                        >
                          <BeltIndicator
                            beltLevel={student.current_belt_level}
                            size="xs"
                            stripe={student.current_stripe}
                            testID={`screens-admin-trajectory-list-row-belt-value-${student.id}`}
                          />
                        </View>

                        {isDesktop ? (
                          <View
                            style={[
                              styles.tableCell,
                              styles.tableColStatus,
                            ]}
                          >
                            <Text style={styles.statusText}>
                              {formatStudentStatus(student.status)}
                            </Text>
                          </View>
                        ) : null}

                        {isDesktop ? (
                          <View
                            style={[
                              styles.tableCell,
                              styles.tableColCount,
                            ]}
                          >
                            <Text style={styles.countText}>
                              {summary?.total_events ?? 0}
                            </Text>
                          </View>
                        ) : null}

                        {isDesktop ? (
                          <View
                            style={[styles.tableCell, styles.tableColLast]}
                          >
                            <Text style={styles.lastEventText}>
                              {summary?.last_event_date
                                ? formatDate(summary.last_event_date)
                                : "—"}
                            </Text>
                          </View>
                        ) : null}

                        <View
                          style={[
                            styles.tableCell,
                            styles.tableColActions,
                            !isDesktop
                              ? mobileStyles.tableColActions
                              : null,
                          ]}
                        >
                          <Pressable
                            accessibilityRole="link"
                            hitSlop={{
                              bottom: 8,
                              left: 8,
                              right: 8,
                              top: 8,
                            }}
                            nativeID={`screens-admin-trajectory-list-edit-link-${student.id}`}
                            onPress={() =>
                              navigation.navigate("TrajectoryDetail", {
                                studentId: student.id,
                              })
                            }
                            style={(state) => {
                              const hovered =
                                (state as typeof state & { hovered?: boolean })
                                  .hovered ?? false;
                              return [
                                styles.inlineLink,
                                hovered
                                  ? styles.inlineLinkHovered
                                  : null,
                                state.pressed
                                  ? styles.inlineLinkPressed
                                  : null,
                              ];
                            }}
                            testID={`screens-admin-trajectory-list-edit-link-${student.id}`}
                          >
                            <Text
                              style={[
                                styles.inlineLinkLabel,
                                styles.inlineLinkLabelUnderlined,
                              ]}
                            >
                              Editar trayectoria
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>

              {totalPages > 1 ? (
                <View style={styles.paginationRow}>
                  <Text style={styles.paginationMeta}>
                    Página {currentPage} de {totalPages}
                  </Text>
                </View>
              ) : null}
            </AppCard>
          )}
        </View>
      </AdminShell>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    width: "100%",
  },
  container: {
    alignSelf: "center",
    gap: spacing.lg,
    width: "100%",
  },
  headerBlock: {
    gap: spacing.lg,
    width: "100%",
  },
  headerTop: {
    gap: spacing.md,
    justifyContent: "space-between",
  },
  headerCopy: {
    gap: spacing.xs,
  },
  headerKicker: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  headerTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 24,
    fontWeight: "800",
  },
  headerDescription: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 20,
  },
  metricsGrid: {
    gap: spacing.sm,
  },
  metricCard: {
    borderRadius: radius.md,
    borderColor: colors.border,
    borderWidth: 1,
    gap: spacing.sm,
    minHeight: 96,
    padding: spacing.md,
  },
  metricInfo: {
    backgroundColor: colors.infoSoft,
  },
  metricSuccess: {
    backgroundColor: colors.successSoft,
  },
  metricAmber: {
    backgroundColor: colors.warningSoft,
  },
  metricCopy: {
    flex: 1,
    gap: 2,
  },
  metricTitle: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  metricValue: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 22,
    fontWeight: "800",
  },
  metricDescription: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 18,
  },
  searchRow: {
    gap: spacing.sm,
  },
  loadingCard: {
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.xl,
  },
  loadingText: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
  },
  resultsTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 16,
    fontWeight: "700",
  },
  resultsDescription: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  errorBlock: {
    flex: 1,
  },
  resultsPanel: {
    gap: spacing.sm,
    padding: 0,
  },
  resultsHead: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  resultsHeadTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 18,
    fontWeight: "800",
  },
  resultsHeadMeta: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
  },
  tableHead: {
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  tableHeadCell: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  tableScroll: {
    width: "100%",
  },
  tableScrollContent: {
    minWidth: "100%",
  },
  tableBody: {
    width: "100%",
  },
  tableRow: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  tableCell: {
    minWidth: 0,
  },
  tableColStudent: {
    flex: 2.4,
  },
  tableColBelt: {
    flex: 1.4,
  },
  tableColStatus: {
    flex: 1.2,
  },
  tableColCount: {
    flex: 1,
  },
  tableColLast: {
    flex: 1.4,
  },
  tableColActions: {
    flex: 1.6,
  },
  studentName: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 15,
    fontWeight: "700",
  },
  studentCode: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
    marginTop: 2,
  },
  statusText: {
    color: colors.text,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
  },
  countText: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 16,
    fontWeight: "700",
  },
  lastEventText: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
  },
  inlineLink: {
    alignSelf: "flex-start",
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 6,
  },
  inlineLinkHovered: {
    backgroundColor: colors.actionSoft ?? colors.primarySoft,
  },
  inlineLinkPressed: {
    opacity: 0.84,
  },
  inlineLinkLabel: {
    color: colors.action,
    fontFamily: typography.headingFamily,
    fontSize: 13,
    fontWeight: "700",
  },
  inlineLinkLabelUnderlined: {
    textDecorationLine: "underline",
  },
  paginationRow: {
    alignItems: "center",
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  paginationMeta: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
  },
});

const mobileStyles = StyleSheet.create({
  headerTop: {
    flexDirection: "column",
  },
  metricsGrid: {
    flexDirection: "column",
  },
  tableHead: {
    minWidth: 720,
  },
  tableColStudent: {
    minWidth: 220,
  },
  tableColBelt: {
    minWidth: 160,
  },
  tableColActions: {
    minWidth: 180,
  },
});

const desktopStyles = StyleSheet.create({
  headerTop: {
    flexDirection: "row",
  },
  metricsGrid: {
    flexDirection: "row",
  },
});
