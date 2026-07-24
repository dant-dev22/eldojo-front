import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { RefreshControl, StyleSheet, Text, View } from "react-native";

import { branchesApi } from "@/api/branchesApi";
import { classesApi } from "@/api/classesApi";
import { getErrorMessage } from "@/api/http";
import { paymentsApi } from "@/api/paymentsApi";
import { studentsApi } from "@/api/studentsApi";
import { AppBadge } from "@/components/AppBadge";
import { AppButton } from "@/components/AppButton";
import { AppCard } from "@/components/AppCard";
import { AdminShell } from "@/components/AdminShell";
import { Screen } from "@/components/Screen";
import { StatusView } from "@/components/StatusView";
import { colors, spacing, typography } from "@/constants/theme";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { formatCurrency, formatDate, formatDateTime, formatPaymentMethod, formatPaymentRecordStatus, formatPaymentStatus } from "@/utils/format";

import type { AdminStackParamList } from "@/navigation/types";
import type { Payment, PaymentRecordStatus, PaymentStatus, StudentStatus } from "@/types/api";

type Props = NativeStackScreenProps<AdminStackParamList, "StudentDetail">;

function getStudentPaymentTone(status: PaymentStatus): "success" | "warning" | "danger" | "neutral" {
  switch (status) {
    case "up_to_date":
      return "success";
    case "partial":
    case "due_soon":
      return "warning";
    case "late":
    case "overdue":
      return "danger";
    default:
      return "neutral";
  }
}

function getStudentStatusTone(status: StudentStatus): "success" | "warning" | "neutral" {
  switch (status) {
    case "active":
      return "success";
    case "frozen":
      return "warning";
    default:
      return "neutral";
  }
}

function getPaymentRecordTone(status: PaymentRecordStatus): "success" | "warning" | "danger" {
  switch (status) {
    case "paid":
      return "success";
    case "pending":
      return "warning";
    case "void":
      return "danger";
    default:
      return "warning";
  }
}

function formatStudentStatus(status: StudentStatus): string {
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

export function StudentDetailScreen({ navigation, route }: Props) {
  const { isDesktop } = useResponsiveLayout();
  const { studentId } = route.params;

  const studentQuery = useQuery({
    queryKey: ["student", studentId],
    queryFn: () => studentsApi.getById(studentId),
  });

  const paymentsQuery = useQuery({
    queryKey: ["payments", "student", studentId],
    queryFn: () => paymentsApi.list({ studentId }),
  });

  const branchesQuery = useQuery({
    queryKey: ["branches", "student-detail", studentQuery.data?.organization_id],
    queryFn: () =>
      branchesApi.list({
        organizationId: studentQuery.data?.organization_id,
        isActive: true,
      }),
    enabled: Boolean(studentQuery.data?.organization_id),
  });

  const classesQuery = useQuery({
    queryKey: [
      "classes",
      "student-detail",
      studentQuery.data?.organization_id,
      studentQuery.data?.branch_id,
    ],
    queryFn: () =>
      classesApi.list({
        organizationId: studentQuery.data?.organization_id,
        branchId: studentQuery.data?.branch_id,
        isActive: true,
      }),
    enabled: Boolean(studentQuery.data?.organization_id && studentQuery.data?.branch_id),
  });

  function handleRefresh() {
    void studentQuery.refetch();
    void paymentsQuery.refetch();
    if (branchesQuery.isEnabled) {
      void branchesQuery.refetch();
    }
    if (classesQuery.isEnabled) {
      void classesQuery.refetch();
    }
  }

  if (studentQuery.isLoading) {
    return (
      <Screen contentStyle={styles.screenContent}>
        <AdminShell
          activeSection="students"
          headerActions={<AppButton label="Volver al listado" onPress={() => navigation.goBack()} variant="secondary" />}
          onGoDashboard={() => navigation.navigate("AdminHome")}
          onGoStudents={() => navigation.navigate("StudentsList")}
          subtitle="Preparando la ficha principal y el historial financiero del alumno."
          title="Detalle de alumno"
        >
        <View style={styles.container}>
          <StatusView
            title="Cargando detalle del alumno"
            description="Obteniendo la ficha principal y preparando el historial de pagos."
            loading
          />
        </View>
        </AdminShell>
      </Screen>
    );
  }

  if (studentQuery.isError || !studentQuery.data) {
    return (
      <Screen contentStyle={styles.screenContent}>
        <AdminShell
          activeSection="students"
          headerActions={<AppButton label="Volver al listado" onPress={() => navigation.goBack()} variant="secondary" />}
          onGoDashboard={() => navigation.navigate("AdminHome")}
          onGoStudents={() => navigation.navigate("StudentsList")}
          subtitle="No fue posible cargar la informacion del alumno."
          title="Detalle de alumno"
        >
        <View style={styles.container}>
          <StatusView
            title="No pudimos cargar al alumno"
            description={getErrorMessage(studentQuery.error)}
          />
          <View style={[styles.inlineActions, isDesktop ? desktopStyles.inlineActions : mobileStyles.inlineActions]}>
            <AppButton label="Volver" onPress={() => navigation.goBack()} variant="secondary" />
            <AppButton label="Reintentar" onPress={() => studentQuery.refetch()} />
          </View>
        </View>
        </AdminShell>
      </Screen>
    );
  }

  const student = studentQuery.data;
  const payments = paymentsQuery.data ?? [];
  const branch = (branchesQuery.data ?? []).find((item) => item.id === student.branch_id) ?? null;
  const primaryClass =
    (classesQuery.data ?? []).find((item) => item.id === student.primary_class_id) ?? null;
  const lastPayment = payments[0] ?? null;

  return (
    <Screen
      scrollable
      contentStyle={styles.screenContent}
      nativeID="screens-admin-student-detail-screen"
      refreshControl={
        <RefreshControl
          refreshing={studentQuery.isRefetching || paymentsQuery.isRefetching}
          onRefresh={handleRefresh}
        />
      }
      testID="screens-admin-student-detail-screen"
    >
      <AdminShell
        activeSection="students"
        headerActions={
          <AppButton
            label="Volver al listado"
            nativeID="screens-admin-student-detail-back-button"
            onPress={() => navigation.goBack()}
            testID="screens-admin-student-detail-back-button"
            variant="secondary"
          />
        }
        onGoDashboard={() => navigation.navigate("AdminHome")}
        onGoStudents={() => navigation.navigate("StudentsList")}
        subtitle={`Codigo ${student.unique_code}. Consulta la ficha general y el historial financiero del alumno.`}
        title={`${student.first_name} ${student.last_name}`}
      >
      <View nativeID="screens-admin-student-detail-content" style={styles.container} testID="screens-admin-student-detail-content">

        <View nativeID="screens-admin-student-detail-summary-grid" style={[styles.summaryGrid, isDesktop ? desktopStyles.summaryGrid : mobileStyles.summaryGrid]} testID="screens-admin-student-detail-summary-grid">
          <AppCard nativeID="screens-admin-student-detail-status-card" style={styles.summaryCard} testID="screens-admin-student-detail-status-card">
            <Text style={styles.cardTitle}>Estado actual</Text>
            <View style={styles.badgesRow}>
              <AppBadge
                label={formatPaymentStatus(student.payment_status)}
                tone={getStudentPaymentTone(student.payment_status)}
              />
              <AppBadge
                label={formatStudentStatus(student.status)}
                tone={getStudentStatusTone(student.status)}
              />
            </View>
            <DetailRow label="Próximo pago" value={formatDate(student.next_payment_date)} />
            <DetailRow
              label="Mensualidad"
              value={formatCurrency(student.monthly_fee, student.currency)}
            />
            <DetailRow label="Moneda" value={student.currency} />
          </AppCard>

          <AppCard nativeID="screens-admin-student-detail-profile-card" style={styles.summaryCard} testID="screens-admin-student-detail-profile-card">
            <Text style={styles.cardTitle}>Ficha general</Text>
            <DetailRow
              label="Nacimiento"
              value={`${formatDate(student.birth_date)} · ${student.birth_place}`}
            />
            <DetailRow label="Inscripción" value={formatDate(student.enrollment_date)} />
            <DetailRow
              label="Altura"
              value={student.height_cm ? `${student.height_cm} cm` : "No disponible"}
            />
            <DetailRow
              label="Sucursal"
              value={branch ? `${branch.name} · ${branch.city}` : `ID ${student.branch_id}`}
            />
            <DetailRow
              label="Clase principal"
              value={primaryClass?.name ?? "No asignada"}
            />
          </AppCard>
        </View>

        <View nativeID="screens-admin-student-detail-detail-grid" style={[styles.detailGrid, isDesktop ? desktopStyles.detailGrid : mobileStyles.detailGrid]} testID="screens-admin-student-detail-detail-grid">
          <AppCard nativeID="screens-admin-student-detail-guardian-card" style={styles.infoCard} testID="screens-admin-student-detail-guardian-card">
            <Text style={styles.cardTitle}>Tutor y observaciones</Text>
            <DetailRow label="Tutor" value={student.guardian_name ?? "No registrado"} />
            <DetailRow label="Teléfono" value={student.guardian_phone ?? "No registrado"} />
            <DetailRow label="Notas" value={student.notes ?? "Sin notas"} />
          </AppCard>

          <AppCard nativeID="screens-admin-student-detail-payments-summary-card" style={styles.infoCard} testID="screens-admin-student-detail-payments-summary-card">
            <Text style={styles.cardTitle}>Resumen de pagos</Text>
            <DetailRow label="Pagos registrados" value={String(payments.length)} />
            <DetailRow
              label="Último movimiento"
              value={lastPayment ? formatDateTime(lastPayment.paid_at) : "Sin pagos registrados"}
            />
            <DetailRow
              label="Último monto"
              value={
                lastPayment
                  ? formatCurrency(lastPayment.amount, lastPayment.currency)
                  : "Sin pagos registrados"
              }
            />
          </AppCard>
        </View>

        <AppCard nativeID="screens-admin-student-detail-history-card" style={styles.historyCard} testID="screens-admin-student-detail-history-card">
          <View nativeID="screens-admin-student-detail-history-header" style={[styles.historyHeader, isDesktop ? desktopStyles.historyHeader : mobileStyles.historyHeader]} testID="screens-admin-student-detail-history-header">
            <View style={styles.historyHeaderCopy}>
              <Text style={styles.cardTitle}>Historial de pagos</Text>
              <Text style={styles.sectionDescription}>
                El backend entrega los pagos ordenados del más reciente al más antiguo por fecha de pago.
              </Text>
            </View>
            <AppBadge label={`${payments.length} registros`} tone="neutral" />
          </View>

          {paymentsQuery.isLoading ? (
            <InlineStatus title="Cargando pagos" description="Preparando el historial financiero del alumno." loading />
          ) : paymentsQuery.isError ? (
            <View style={styles.historyState}>
              <InlineStatus
                title="No pudimos cargar los pagos"
                description={getErrorMessage(paymentsQuery.error)}
              />
              <AppButton label="Reintentar pagos" onPress={() => paymentsQuery.refetch()} />
            </View>
          ) : payments.length === 0 ? (
            <InlineStatus
              title="Sin pagos registrados"
              description="Todavía no existen movimientos financieros asociados a este alumno."
            />
          ) : (
            <View style={styles.paymentsList}>
              {payments.map((payment) => (
                <PaymentRow key={payment.id} payment={payment} />
              ))}
            </View>
          )}
        </AppCard>
      </View>
      </AdminShell>
    </Screen>
  );
}

function InlineStatus({
  title,
  description,
  loading = false,
}: {
  title: string;
  description: string;
  loading?: boolean;
}) {
  return (
    <View style={styles.inlineStatus}>
      {loading ? <Text style={styles.inlineStatusSpinner}>Cargando...</Text> : null}
      <Text style={styles.inlineStatusTitle}>{title}</Text>
      <Text style={styles.inlineStatusDescription}>{description}</Text>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function PaymentRow({ payment }: { payment: Payment }) {
  return (
    <View style={styles.paymentRow}>
      <View style={styles.paymentRowTop}>
        <View style={styles.paymentAmountBlock}>
          <Text style={styles.paymentAmount}>
            {formatCurrency(payment.amount, payment.currency)}
          </Text>
          <Text style={styles.paymentMeta}>Pago #{payment.id}</Text>
        </View>
        <AppBadge
          label={formatPaymentRecordStatus(payment.status)}
          tone={getPaymentRecordTone(payment.status)}
        />
      </View>

      <View style={styles.paymentMetaGrid}>
        <DetailRow label="Fecha de pago" value={formatDateTime(payment.paid_at)} />
        <DetailRow label="Método" value={formatPaymentMethod(payment.method)} />
        <DetailRow
          label="Período"
          value={`${formatDate(payment.period_start)} al ${formatDate(payment.period_end)}`}
        />
        <DetailRow label="Registrado por" value={`Usuario ${payment.recorded_by}`} />
      </View>

      {payment.notes ? <Text style={styles.paymentNotes}>Notas: {payment.notes}</Text> : null}
    </View>
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
  header: {
    gap: spacing.sm,
  },
  headerCopy: {
    gap: 4,
  },
  title: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 20,
  },
  inlineActions: {
    gap: spacing.sm,
  },
  summaryGrid: {
    gap: spacing.md,
  },
  summaryCard: {
    gap: spacing.sm,
  },
  detailGrid: {
    gap: spacing.md,
  },
  infoCard: {
    gap: spacing.sm,
  },
  cardTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 18,
    fontWeight: "800",
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  detailRow: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: 4,
    paddingBottom: spacing.sm,
  },
  detailLabel: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  detailValue: {
    color: colors.text,
    fontFamily: typography.bodyFamily,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 21,
  },
  historyCard: {
    gap: spacing.md,
  },
  historyHeader: {
    gap: spacing.sm,
  },
  historyHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  sectionDescription: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 20,
  },
  historyState: {
    gap: spacing.sm,
  },
  paymentsList: {
    gap: spacing.md,
  },
  paymentRow: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.borderStrong,
    borderRadius: 16,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  paymentRowTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  paymentAmountBlock: {
    flex: 1,
    gap: 4,
  },
  paymentAmount: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 20,
    fontWeight: "800",
  },
  paymentMeta: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
  },
  paymentMetaGrid: {
    gap: spacing.sm,
  },
  paymentNotes: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 20,
  },
  inlineStatus: {
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.lg,
  },
  inlineStatusSpinner: {
    color: colors.accent,
    fontFamily: typography.headingFamily,
    fontSize: 13,
    fontWeight: "700",
  },
  inlineStatusTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  inlineStatusDescription: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
});

const mobileStyles = StyleSheet.create({
  header: {
    flexDirection: "column",
  },
  inlineActions: {
    flexDirection: "column",
  },
  summaryGrid: {
    flexDirection: "column",
  },
  detailGrid: {
    flexDirection: "column",
  },
  historyHeader: {
    flexDirection: "column",
  },
});

const desktopStyles = StyleSheet.create({
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  inlineActions: {
    alignItems: "center",
    flexDirection: "row",
  },
  summaryGrid: {
    flexDirection: "row",
  },
  detailGrid: {
    flexDirection: "row",
  },
  historyHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
