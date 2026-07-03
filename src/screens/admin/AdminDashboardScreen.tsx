import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { classesApi } from "@/api/classesApi";
import { getErrorMessage } from "@/api/http";
import { studentsApi } from "@/api/studentsApi";
import { AppBadge } from "@/components/AppBadge";
import { AppButton } from "@/components/AppButton";
import { AppCard } from "@/components/AppCard";
import { AdminShell } from "@/components/AdminShell";
import { Screen } from "@/components/Screen";
import { StatusView } from "@/components/StatusView";
import { colors, radius, spacing } from "@/constants/theme";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";

import type { AdminStackParamList } from "@/navigation/types";

type Props = NativeStackScreenProps<AdminStackParamList, "AdminHome">;

export function AdminDashboardScreen({ navigation }: Props) {
  const { isDesktop } = useResponsiveLayout();

  const studentsQuery = useQuery({
    queryKey: ["dashboard-students"],
    queryFn: () => studentsApi.list(),
  });

  const classesQuery = useQuery({
    queryKey: ["dashboard-classes"],
    queryFn: () => classesApi.list({ isActive: true }),
  });

  const students = studentsQuery.data ?? [];
  const classes = classesQuery.data ?? [];
  const activeStudents = students.filter((item) => item.status === "active").length;
  const latePayments = students.filter((item) => item.payment_status === "late").length;
  const isLoading = studentsQuery.isLoading || classesQuery.isLoading;
  const hasError = studentsQuery.isError || classesQuery.isError;

  return (
    <Screen scrollable contentStyle={styles.screenContent}>
      <AdminShell
        activeSection="dashboard"
        headerActions={<AppButton label="Ver alumnos" onPress={() => navigation.navigate("StudentsList")} />}
        onGoDashboard={() => navigation.navigate("AdminHome")}
        onGoStudents={() => navigation.navigate("StudentsList")}
        subtitle="Gestiona alumnos y clases desde un panel pensado para la operacion diaria del gimnasio."
        title="Resumen del gimnasio"
      >
        <View style={styles.container}>
        <AppCard style={[styles.heroCard, isDesktop ? desktopStyles.heroCard : mobileStyles.heroCard]}>
          <View style={[styles.heroTop, isDesktop ? desktopStyles.heroTop : mobileStyles.heroTop]}>
            <View style={styles.heroCopy}>
              <AppBadge label="Resumen operativo" tone="info" />
              <Text style={styles.title}>Visibilidad rapida del gimnasio</Text>
              <Text style={styles.subtitle}>
                La experiencia ya no depende de una app movil dedicada. Este panel concentra la operacion diaria en una web responsive estable.
              </Text>
            </View>
            <View style={styles.heroActions}>
              <AppButton label="Nuevo alumno" onPress={() => navigation.navigate("StudentsList", { openCreate: true })} />
            </View>
          </View>

          {isDesktop ? (
            <View style={[styles.scopeRow, desktopStyles.scopeRow]}>
              <View style={styles.scopeItem}>
                <Text style={styles.scopeLabel}>Canal actual</Text>
                <Text style={styles.scopeValue}>Web responsive</Text>
              </View>
              <View style={styles.scopeItem}>
                <Text style={styles.scopeLabel}>Prioridad</Text>
                <Text style={styles.scopeValue}>Operacion interna</Text>
              </View>
            </View>
          ) : null}
        </AppCard>

        {isLoading ? (
          <StatusView
            title="Cargando panel"
            description="Obteniendo alumnos y clases activas para tu organización."
            loading
          />
        ) : hasError ? (
          <AppCard>
            <StatusView
              title="No pudimos cargar el panel"
              description={getErrorMessage(studentsQuery.error ?? classesQuery.error)}
            />
            <AppButton label="Reintentar" onPress={() => {
              void studentsQuery.refetch();
              void classesQuery.refetch();
            }} />
          </AppCard>
        ) : (
          <>
            <View style={[styles.metricsGrid, isDesktop ? desktopStyles.metricsGrid : mobileStyles.metricsGrid]}>
              <MetricCard label="Alumnos activos" value={String(activeStudents)} tone="success" />
              <MetricCard label="Clases activas" value={String(classes.length)} tone="info" />
              <MetricCard label="Pagos vencidos" value={String(latePayments)} tone={latePayments > 0 ? "danger" : "neutral"} />
              <MetricCard label="Total alumnos" value={String(students.length)} tone="neutral" />
            </View>

            <View style={[styles.contentGrid, isDesktop ? desktopStyles.contentGrid : mobileStyles.contentGrid]}>
              <AppCard style={styles.panelCard}>
                <Text style={styles.sectionTitle}>Accesos rápidos</Text>
                <QuickAction
                  description="Abre el padrón para buscar y revisar el estado de tus alumnos."
                  label="Administrar alumnos"
                  onPress={() => navigation.navigate("StudentsList")}
                />
                <QuickAction
                  description="Inicia el alta de un alumno nuevo y confirma los datos antes de guardarlo."
                  label="Nuevo alumno"
                  onPress={() => navigation.navigate("StudentsList", { openCreate: true })}
                />
                <QuickAction
                  description="La gestión de clases se conecta al backend y será expandida en la siguiente entrega."
                  label="Clases del gimnasio"
                  onPress={() => undefined}
                  disabled
                />
              </AppCard>

              <AppCard style={styles.panelCard}>
                <Text style={styles.sectionTitle}>Clases activas</Text>
                {classes.length > 0 ? (
                  classes.slice(0, 5).map((classItem) => (
                    <View key={classItem.id} style={styles.classRow}>
                      <View style={styles.classCopy}>
                        <Text style={styles.className}>{classItem.name}</Text>
                        <Text style={styles.classMeta}>
                          {classItem.instructor_name ? `Instructor: ${classItem.instructor_name}` : "Instructor pendiente"}
                        </Text>
                      </View>
                      <AppBadge
                        label={classItem.capacity ? `${classItem.capacity} cupos` : "Sin cupo"}
                        tone="neutral"
                      />
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyBlock}>
                    <Text style={styles.emptyTitle}>Sin clases activas</Text>
                    <Text style={styles.emptyDescription}>
                      Cuando el gimnasio registre clases activas, aparecerán aquí como resumen operativo.
                    </Text>
                  </View>
                )}
              </AppCard>
            </View>
          </>
        )}
        </View>
      </AdminShell>
    </Screen>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "neutral" | "success" | "danger" | "info";
}) {
  return (
    <AppCard style={styles.metricCard}>
      <AppBadge label={label} tone={tone} />
      <Text style={styles.metricValue}>{value}</Text>
    </AppCard>
  );
}

function QuickAction({
  label,
  description,
  onPress,
  disabled = false,
}: {
  label: string;
  description: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickAction,
        disabled ? styles.quickActionDisabled : null,
        pressed && !disabled ? styles.quickActionPressed : null,
      ]}
    >
      <Text style={styles.quickActionTitle}>{label}</Text>
      <Text style={styles.quickActionDescription}>{description}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    flexGrow: 1,
  },
  container: {
    gap: spacing.md,
    width: "100%",
  },
  heroCard: {
    gap: spacing.lg,
  },
  heroTop: {
    gap: spacing.md,
  },
  heroCopy: {
    gap: spacing.sm,
  },
  heroActions: {
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  scopeRow: {
    gap: spacing.md,
  },
  scopeItem: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    flex: 1,
    gap: 4,
    padding: spacing.md,
  },
  scopeLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  scopeValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  metricsGrid: {
    gap: spacing.md,
  },
  metricCard: {
    flex: 1,
    minHeight: 104,
  },
  metricValue: {
    color: colors.text,
    fontSize: 34,
    fontWeight: "800",
  },
  contentGrid: {
    gap: spacing.md,
  },
  panelCard: {
    flex: 1,
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
  },
  quickAction: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  quickActionDisabled: {
    opacity: 0.6,
  },
  quickActionPressed: {
    opacity: 0.85,
  },
  quickActionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  quickActionDescription: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  classRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  classCopy: {
    flex: 1,
    gap: 4,
  },
  className: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  classMeta: {
    color: colors.textMuted,
    fontSize: 13,
  },
  emptyBlock: {
    gap: spacing.xs,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  emptyDescription: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
});

const mobileStyles = StyleSheet.create({
  heroCard: {
    paddingBottom: spacing.lg,
  },
  heroTop: {
    flexDirection: "column",
  },
  scopeRow: {
    flexDirection: "column",
  },
  metricsGrid: {
    flexDirection: "column",
  },
  contentGrid: {
    flexDirection: "column",
  },
});

const desktopStyles = StyleSheet.create({
  heroCard: {
    padding: 28,
  },
  heroTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  scopeRow: {
    flexDirection: "row",
  },
  metricsGrid: {
    flexDirection: "row",
  },
  contentGrid: {
    alignItems: "flex-start",
    flexDirection: "row",
  },
});
