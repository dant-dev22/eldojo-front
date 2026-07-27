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
          headerActions={<AppButton label="Volver al listado" nativeID="screens-admin-student-detail-loading-back-button" onPress={() => navigation.goBack()} testID="screens-admin-student-detail-loading-back-button" variant="secondary" />}
          onGoDashboard={() => navigation.navigate("AdminHome")}
          onGoStudents={() => navigation.navigate("StudentsList")}
          subtitle="Preparando la ficha principal y el historial financiero del alumno."
          title="Detalle de alumno"
        >
        <View nativeID="screens-admin-student-detail-loading-state" style={styles.container} testID="screens-admin-student-detail-loading-state">
          <StatusView
            nativeID="screens-admin-student-detail-loading-status"
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
          headerActions={<AppButton label="Volver al listado" nativeID="screens-admin-student-detail-error-back-button" onPress={() => navigation.goBack()} testID="screens-admin-student-detail-error-back-button" variant="secondary" />}
          onGoDashboard={() => navigation.navigate("AdminHome")}
          onGoStudents={() => navigation.navigate("StudentsList")}
          subtitle="No fue posible cargar la informacion del alumno."
          title="Detalle de alumno"
        >
        <View nativeID="screens-admin-student-detail-error-state" style={styles.container} testID="screens-admin-student-detail-error-state">
          <StatusView
            nativeID="screens-admin-student-detail-error-status"
            title="No pudimos cargar al alumno"
            description={getErrorMessage(studentQuery.error)}
          />
          <View nativeID="screens-admin-student-detail-error-actions" style={[styles.inlineActions, isDesktop ? desktopStyles.inlineActions : mobileStyles.inlineActions]} testID="screens-admin-student-detail-error-actions">
            <AppButton label="Volver" nativeID="screens-admin-student-detail-error-return-button" onPress={() => navigation.goBack()} testID="screens-admin-student-detail-error-return-button" variant="secondary" />
            <AppButton label="Reintentar" nativeID="screens-admin-student-detail-error-retry-button" onPress={() => studentQuery.refetch()} testID="screens-admin-student-detail-error-retry-button" />
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
  const sidebarSummary = {
    organizationName: null,
    suffix: null,
    branchName: branch?.name ?? null,
    location: branch ? [branch.city, branch.state, branch.country].filter(Boolean).join(", ") || branch.address : null,
    mainSchedule: null,
  };

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
        sidebarSummary={sidebarSummary}
        subtitle={`Codigo ${student.unique_code}. Consulta la ficha general y el historial financiero del alumno.`}
        title={`${student.first_name} ${student.last_name}`}
      >
      <View nativeID="screens-admin-student-detail-content" style={styles.container} testID="screens-admin-student-detail-content">

        <View nativeID="screens-admin-student-detail-summary-grid" style={[styles.summaryGrid, isDesktop ? desktopStyles.summaryGrid : mobileStyles.summaryGrid]} testID="screens-admin-student-detail-summary-grid">
          <AppCard nativeID="screens-admin-student-detail-status-card" style={styles.summaryCard} testID="screens-admin-student-detail-status-card">
            <Text nativeID="screens-admin-student-detail-status-card-title" style={styles.cardTitle} testID="screens-admin-student-detail-status-card-title">Estado actual</Text>
            <View nativeID="screens-admin-student-detail-status-badges" style={styles.badgesRow} testID="screens-admin-student-detail-status-badges">
              <AppBadge
                label={formatPaymentStatus(student.payment_status)}
                nativeID="screens-admin-student-detail-payment-status-badge"
                testID="screens-admin-student-detail-payment-status-badge"
                tone={getStudentPaymentTone(student.payment_status)}
              />
              <AppBadge
                label={formatStudentStatus(student.status)}
                nativeID="screens-admin-student-detail-student-status-badge"
                testID="screens-admin-student-detail-student-status-badge"
                tone={getStudentStatusTone(student.status)}
              />
            </View>
            <DetailRow idPrefix="screens-admin-student-detail-status-next-payment" label="Próximo pago" value={formatDate(student.next_payment_date)} />
            <DetailRow
              idPrefix="screens-admin-student-detail-status-monthly-fee"
              label="Mensualidad"
              value={formatCurrency(student.monthly_fee, student.currency)}
            />
            <DetailRow idPrefix="screens-admin-student-detail-status-currency" label="Moneda" value={student.currency} />
          </AppCard>

          <AppCard nativeID="screens-admin-student-detail-profile-card" style={styles.summaryCard} testID="screens-admin-student-detail-profile-card">
            <Text nativeID="screens-admin-student-detail-profile-card-title" style={styles.cardTitle} testID="screens-admin-student-detail-profile-card-title">Ficha general</Text>
            <DetailRow
              idPrefix="screens-admin-student-detail-profile-birth"
              label="Nacimiento"
              value={`${formatDate(student.birth_date)} · ${student.birth_place}`}
            />
            <DetailRow idPrefix="screens-admin-student-detail-profile-enrollment" label="Inscripción" value={formatDate(student.enrollment_date)} />
            <DetailRow
              idPrefix="screens-admin-student-detail-profile-height"
              label="Altura"
              value={student.height_cm ? `${student.height_cm} cm` : "No disponible"}
            />
            <DetailRow
              idPrefix="screens-admin-student-detail-profile-branch"
              label="Sucursal"
              value={branch ? `${branch.name} · ${branch.city}` : `ID ${student.branch_id}`}
            />
            <DetailRow
              idPrefix="screens-admin-student-detail-profile-class"
              label="Clase principal"
              value={primaryClass?.name ?? "No asignada"}
            />
          </AppCard>
        </View>

        <View nativeID="screens-admin-student-detail-detail-grid" style={[styles.detailGrid, isDesktop ? desktopStyles.detailGrid : mobileStyles.detailGrid]} testID="screens-admin-student-detail-detail-grid">
          <AppCard nativeID="screens-admin-student-detail-guardian-card" style={styles.infoCard} testID="screens-admin-student-detail-guardian-card">
            <Text nativeID="screens-admin-student-detail-guardian-card-title" style={styles.cardTitle} testID="screens-admin-student-detail-guardian-card-title">Tutor y observaciones</Text>
            <DetailRow idPrefix="screens-admin-student-detail-guardian-name" label="Tutor" value={student.guardian_name ?? "No registrado"} />
            <DetailRow idPrefix="screens-admin-student-detail-guardian-phone" label="Teléfono" value={student.guardian_phone ?? "No registrado"} />
            <DetailRow idPrefix="screens-admin-student-detail-guardian-notes" label="Notas" value={student.notes ?? "Sin notas"} />
          </AppCard>

          <AppCard nativeID="screens-admin-student-detail-payments-summary-card" style={styles.infoCard} testID="screens-admin-student-detail-payments-summary-card">
            <Text nativeID="screens-admin-student-detail-payments-summary-title" style={styles.cardTitle} testID="screens-admin-student-detail-payments-summary-title">Resumen de pagos</Text>
            <DetailRow idPrefix="screens-admin-student-detail-payments-count" label="Pagos registrados" value={String(payments.length)} />
            <DetailRow
              idPrefix="screens-admin-student-detail-payments-last-movement"
              label="Último movimiento"
              value={lastPayment ? formatDateTime(lastPayment.paid_at) : "Sin pagos registrados"}
            />
            <DetailRow
              idPrefix="screens-admin-student-detail-payments-last-amount"
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
            <View nativeID="screens-admin-student-detail-history-header-copy" style={styles.historyHeaderCopy} testID="screens-admin-student-detail-history-header-copy">
              <Text nativeID="screens-admin-student-detail-history-title" style={styles.cardTitle} testID="screens-admin-student-detail-history-title">Historial de pagos</Text>
              <Text nativeID="screens-admin-student-detail-history-description" style={styles.sectionDescription} testID="screens-admin-student-detail-history-description">
                El backend entrega los pagos ordenados del más reciente al más antiguo por fecha de pago.
              </Text>
            </View>
            <AppBadge label={`${payments.length} registros`} nativeID="screens-admin-student-detail-history-badge" testID="screens-admin-student-detail-history-badge" tone="neutral" />
          </View>

          {paymentsQuery.isLoading ? (
            <InlineStatus title="Cargando pagos" description="Preparando el historial financiero del alumno." loading />
          ) : paymentsQuery.isError ? (
            <View nativeID="screens-admin-student-detail-history-error" style={styles.historyState} testID="screens-admin-student-detail-history-error">
              <InlineStatus
                idPrefix="screens-admin-student-detail-payments-error-status"
                title="No pudimos cargar los pagos"
                description={getErrorMessage(paymentsQuery.error)}
              />
              <AppButton label="Reintentar pagos" nativeID="screens-admin-student-detail-payments-retry-button" onPress={() => paymentsQuery.refetch()} testID="screens-admin-student-detail-payments-retry-button" />
            </View>
          ) : payments.length === 0 ? (
            <InlineStatus
              title="Sin pagos registrados"
              description="Todavía no existen movimientos financieros asociados a este alumno."
            />
          ) : (
            <View nativeID="screens-admin-student-detail-payments-list" style={styles.paymentsList} testID="screens-admin-student-detail-payments-list">
              {payments.map((payment) => (
                <PaymentRow key={payment.id} payment={payment} idPrefix={`screens-admin-student-detail-payment-${payment.id}`} />
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
  idPrefix,
}: {
  title: string;
  description: string;
  loading?: boolean;
  idPrefix?: string;
}) {
  const baseId = idPrefix ?? "screens-admin-student-detail-inline-status";

  return (
    <View nativeID={baseId} style={styles.inlineStatus} testID={baseId}>
      {loading ? <Text nativeID={`${baseId}-spinner`} style={styles.inlineStatusSpinner} testID={`${baseId}-spinner`}>Cargando...</Text> : null}
      <Text nativeID={`${baseId}-title`} style={styles.inlineStatusTitle} testID={`${baseId}-title`}>{title}</Text>
      <Text nativeID={`${baseId}-description`} style={styles.inlineStatusDescription} testID={`${baseId}-description`}>{description}</Text>
    </View>
  );
}

function DetailRow({ label, value, idPrefix }: { label: string; value: string; idPrefix?: string }) {
  const baseId =
    idPrefix ?? `screens-admin-student-detail-detail-row-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <View nativeID={baseId} style={styles.detailRow} testID={baseId}>
      <Text nativeID={`${baseId}-label`} style={styles.detailLabel} testID={`${baseId}-label`}>{label}</Text>
      <Text nativeID={`${baseId}-value`} style={styles.detailValue} testID={`${baseId}-value`}>{value}</Text>
    </View>
  );
}

function PaymentRow({ payment, idPrefix }: { payment: Payment; idPrefix?: string }) {
  const baseId = idPrefix ?? `screens-admin-student-detail-payment-${payment.id}`;

  return (
    <View nativeID={baseId} style={styles.paymentRow} testID={baseId}>
      <View nativeID={`${baseId}-top`} style={styles.paymentRowTop} testID={`${baseId}-top`}>
        <View nativeID={`${baseId}-amount-block`} style={styles.paymentAmountBlock} testID={`${baseId}-amount-block`}>
          <Text nativeID={`${baseId}-amount`} style={styles.paymentAmount} testID={`${baseId}-amount`}>
            {formatCurrency(payment.amount, payment.currency)}
          </Text>
          <Text nativeID={`${baseId}-meta`} style={styles.paymentMeta} testID={`${baseId}-meta`}>Pago #{payment.id}</Text>
        </View>
        <AppBadge
          label={formatPaymentRecordStatus(payment.status)}
          nativeID={`${baseId}-status-badge`}
          testID={`${baseId}-status-badge`}
          tone={getPaymentRecordTone(payment.status)}
        />
      </View>

      <View nativeID={`${baseId}-meta-grid`} style={styles.paymentMetaGrid} testID={`${baseId}-meta-grid`}>
        <DetailRow idPrefix={`${baseId}-paid-at`} label="Fecha de pago" value={formatDateTime(payment.paid_at)} />
        <DetailRow idPrefix={`${baseId}-method`} label="Método" value={formatPaymentMethod(payment.method)} />
        <DetailRow
          idPrefix={`${baseId}-period`}
          label="Período"
          value={`${formatDate(payment.period_start)} al ${formatDate(payment.period_end)}`}
        />
        <DetailRow idPrefix={`${baseId}-recorded-by`} label="Registrado por" value={`Usuario ${payment.recorded_by}`} />
      </View>

      {payment.notes ? <Text nativeID={`${baseId}-notes`} style={styles.paymentNotes} testID={`${baseId}-notes`}>Notas: {payment.notes}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    flexGrow: 1,
  },
  container: {
    gap: spacing.lg,
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
    backgroundColor: colors.surfaceAlt,
    gap: spacing.sm,
  },
  detailGrid: {
    gap: spacing.md,
  },
  infoCard: {
    backgroundColor: colors.surfaceAlt,
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
    backgroundColor: colors.surface,
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
    borderColor: colors.border,
    borderRadius: 22,
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
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
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
