import { useQuery } from "@tanstack/react-query";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { branchesApi } from "@/api/branchesApi";
import { classesApi } from "@/api/classesApi";
import { getErrorMessage } from "@/api/http";
import { paymentsApi } from "@/api/paymentsApi";
import { studentsApi } from "@/api/studentsApi";
import { AppModal } from "@/components/AppModal";
import { BeltIndicator } from "@/components/BeltIndicator";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatPaymentMethod,
  formatPaymentRecordStatus,
  formatPaymentStatus,
} from "@/utils/format";

import type { Payment, PaymentRecordStatus, PaymentStatus, Student, StudentStatus } from "@/types/api";

const PAYMENTS_PER_PAGE = 4;
const MIN_TOUCH_TARGET = 44;
const TOUCH_HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

interface StudentDetailModalProps {
  visible: boolean;
  studentId: number | null;
  onClose: () => void;
}

function getStudentPaymentColor(status: PaymentStatus): string {
  switch (status) {
    case "up_to_date":
      return colors.success;
    case "partial":
    case "due_soon":
      return colors.warning;
    case "late":
    case "overdue":
      return colors.danger;
    default:
      return colors.textMuted;
  }
}

function getStudentStatusColor(status: StudentStatus): string {
  switch (status) {
    case "active":
      return colors.success;
    case "frozen":
      return colors.warning;
    default:
      return colors.textMuted;
  }
}

function getPaymentRecordColor(status: PaymentRecordStatus): string {
  switch (status) {
    case "paid":
      return colors.success;
    case "pending":
      return colors.warning;
    case "void":
      return colors.danger;
    default:
      return colors.textMuted;
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

export function StudentDetailModal({ visible, studentId, onClose }: StudentDetailModalProps) {
  const { isDesktop } = useResponsiveLayout();
  const [paymentsPage, setPaymentsPage] = useState(1);

  useEffect(() => {
    setPaymentsPage(1);
  }, [visible, studentId]);

  const studentQuery = useQuery({
    queryKey: ["student", "modal", studentId],
    queryFn: () => (studentId ? studentsApi.getById(studentId) : Promise.reject(new Error("No student id"))),
    enabled: Boolean(studentId) && visible,
  });

  const paymentsQuery = useQuery({
    queryKey: ["payments", "modal", "student", studentId],
    queryFn: () => (studentId ? paymentsApi.list({ studentId }) : Promise.reject(new Error("No student id"))),
    enabled: Boolean(studentId) && visible,
  });

  const branchesQuery = useQuery({
    queryKey: ["branches", "student-modal", studentQuery.data?.organization_id],
    queryFn: () =>
      branchesApi.list({
        organizationId: studentQuery.data?.organization_id,
        isActive: true,
      }),
    enabled: Boolean(studentQuery.data?.organization_id) && visible,
  });

  const classesQuery = useQuery({
    queryKey: ["classes", "student-modal", studentQuery.data?.organization_id, studentQuery.data?.branch_id],
    queryFn: () =>
      classesApi.list({
        organizationId: studentQuery.data?.organization_id,
        branchId: studentQuery.data?.branch_id,
        isActive: true,
      }),
    enabled: Boolean(studentQuery.data?.organization_id && studentQuery.data?.branch_id) && visible,
  });

  const student = studentQuery.data ?? null;
  const payments = paymentsQuery.data ?? [];
  const branch = (branchesQuery.data ?? []).find((item) => item.id === student?.branch_id) ?? null;
  const primaryClass =
    (classesQuery.data ?? []).find((item) => item.id === student?.primary_class_id) ?? null;

  const totalPaymentsPages = Math.max(1, Math.ceil(payments.length / PAYMENTS_PER_PAGE));
  const paginatedPayments = useMemo(
    () =>
      payments.slice(
        (paymentsPage - 1) * PAYMENTS_PER_PAGE,
        paymentsPage * PAYMENTS_PER_PAGE,
      ),
    [payments, paymentsPage],
  );
  const paymentsPageStart = payments.length === 0 ? 0 : (paymentsPage - 1) * PAYMENTS_PER_PAGE + 1;
  const paymentsPageEnd = Math.min(paymentsPage * PAYMENTS_PER_PAGE, payments.length);

  const handleRefetch = useCallback(() => {
    void studentQuery.refetch();
    void paymentsQuery.refetch();
  }, [studentQuery, paymentsQuery]);

  const handlePaymentsRetry = useCallback(() => {
    void paymentsQuery.refetch();
  }, [paymentsQuery]);

  const handlePrevPage = useCallback(() => {
    setPaymentsPage((current) => Math.max(1, current - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setPaymentsPage((current) => Math.min(totalPaymentsPages, current + 1));
  }, [totalPaymentsPages]);

  const paginationLiveText = useMemo(
    () => `Página ${paymentsPage} de ${totalPaymentsPages}. Mostrando ${paymentsPageStart} a ${paymentsPageEnd} de ${payments.length} pagos.`,
    [paymentsPage, totalPaymentsPages, paymentsPageStart, paymentsPageEnd, payments.length],
  );

  return (
    <AppModal
      visible={visible}
      title={student ? `${student.first_name} ${student.last_name}` : "Detalle del alumno"}
      description={student ? `Código ${student.unique_code}` : "Cargando información del alumno..."}
      onClose={onClose}
      nativeID="components-student-detail-modal"
      testID="components-student-detail-modal"
    >
      {studentQuery.isLoading || !student ? (
        <LoadingState />
      ) : studentQuery.isError ? (
        <ErrorState
          message={getErrorMessage(studentQuery.error)}
          onRetry={handleRefetch}
        />
      ) : (
        <View style={styles.content} testID="components-student-detail-modal-content">
          <View
            style={[styles.headerSection, isDesktop ? desktopStyles.headerSection : mobileStyles.headerSection]}
            testID="components-student-detail-modal-header"
          >
            <View style={styles.photoBlock} testID="components-student-detail-modal-photo-block">
              {student.photo_url ? (
                <Image
                  accessibilityLabel={`Foto de ${student.first_name} ${student.last_name}`}
                  source={{ uri: student.photo_url }}
                  style={styles.photo}
                  testID="components-student-detail-modal-photo"
                />
              ) : (
                <View
                  accessibilityLabel={`Iniciales del alumno ${student.first_name} ${student.last_name}`}
                  style={styles.photoPlaceholder}
                  testID="components-student-detail-modal-photo-placeholder"
                >
                  <Text style={styles.photoInitials} accessible={false}>
                    {student.first_name.charAt(0)}
                    {student.last_name.charAt(0)}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.headerCopy} testID="components-student-detail-modal-header-copy">
              <Text style={styles.headerName} testID="components-student-detail-modal-name">
                {student.first_name} {student.last_name}
              </Text>
              <Text style={styles.headerCode} testID="components-student-detail-modal-code">
                Código {student.unique_code}
              </Text>
              <View style={styles.headerBeltRow} testID="components-student-detail-modal-belt-row">
                <BeltIndicator
                  beltLevel={student.current_belt_level}
                  size="sm"
                  stripe={student.current_stripe}
                  testID="components-student-detail-modal-belt"
                />
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <View
            style={[styles.twoColGrid, isDesktop ? desktopStyles.twoColGrid : mobileStyles.twoColGrid]}
            testID="components-student-detail-modal-status-grid"
          >
            <View style={styles.infoBlock} testID="components-student-detail-modal-status-block">
              <Text style={styles.sectionLabel}>Estado</Text>
              <InfoRow
                idPrefix="components-student-detail-modal-status-payment"
                label="Pago"
                value={formatPaymentStatus(student.payment_status)}
                valueColor={getStudentPaymentColor(student.payment_status)}
              />
              <InfoRow
                idPrefix="components-student-detail-modal-status-student"
                label="Alumno"
                value={formatStudentStatus(student.status)}
                valueColor={getStudentStatusColor(student.status)}
              />
              <InfoRow
                idPrefix="components-student-detail-modal-status-next"
                label="Próximo pago"
                value={formatDate(student.next_payment_date)}
              />
              <InfoRow
                idPrefix="components-student-detail-modal-status-fee"
                label="Mensualidad"
                value={formatCurrency(student.monthly_fee, student.currency)}
              />
            </View>

            <View style={styles.infoBlock} testID="components-student-detail-modal-profile-block">
              <Text style={styles.sectionLabel}>Perfil</Text>
              <InfoRow
                idPrefix="components-student-detail-modal-profile-birth"
                label="Nacimiento"
                value={`${formatDate(student.birth_date)} · ${student.birth_place}`}
              />
              <InfoRow
                idPrefix="components-student-detail-modal-profile-enrollment"
                label="Inscripción"
                value={formatDate(student.enrollment_date)}
              />
              <InfoRow
                idPrefix="components-student-detail-modal-profile-height"
                label="Altura"
                value={student.height_cm ? `${student.height_cm} cm` : "No disponible"}
              />
              <InfoRow
                idPrefix="components-student-detail-modal-profile-branch"
                label="Sucursal"
                value={branch ? `${branch.name} · ${branch.city}` : `ID ${student.branch_id}`}
              />
              <InfoRow
                idPrefix="components-student-detail-modal-profile-class"
                label="Clase"
                value={primaryClass?.name ?? "No asignada"}
              />
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoBlock} testID="components-student-detail-modal-guardian-block">
            <Text style={styles.sectionLabel}>Contacto y notas</Text>
            <InfoRow
              idPrefix="components-student-detail-modal-guardian-name"
              label="Tutor"
              value={student.guardian_name ?? "No registrado"}
            />
            <InfoRow
              idPrefix="components-student-detail-modal-guardian-phone"
              label="Teléfono"
              value={student.guardian_phone ?? "No registrado"}
            />
            <InfoRow
              idPrefix="components-student-detail-modal-guardian-notes"
              label="Notas"
              value={student.notes ?? "Sin notas"}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.paymentsBlock} testID="components-student-detail-modal-payments-block">
            <View style={styles.paymentsHeader} testID="components-student-detail-modal-payments-header">
              <View style={styles.paymentsHeaderCopy}>
                <Text style={styles.paymentsTitle}>Pagos</Text>
                <Text style={styles.paymentsSubtitle}>
                  Estado actual e historial financiero del alumno.
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.paymentsSummaryRow,
                isDesktop ? desktopStyles.paymentsSummaryRow : mobileStyles.paymentsSummaryRow,
              ]}
              testID="components-student-detail-modal-payments-summary"
            >
              <View style={styles.paymentSummaryItem}>
                <Text style={styles.paymentSummaryLabel}>Estatus actual</Text>
                <Text
                  accessibilityLiveRegion="polite"
                  style={[styles.paymentSummaryValue, { color: getStudentPaymentColor(student.payment_status) }]}
                >
                  {formatPaymentStatus(student.payment_status)}
                </Text>
              </View>
              <View style={styles.paymentSummaryItem}>
                <Text style={styles.paymentSummaryLabel}>Próximo pago</Text>
                <Text style={styles.paymentSummaryValue}>{formatDate(student.next_payment_date)}</Text>
              </View>
              <View style={styles.paymentSummaryItem}>
                <Text style={styles.paymentSummaryLabel}>Mensualidad</Text>
                <Text style={styles.paymentSummaryValue}>
                  {formatCurrency(student.monthly_fee, student.currency)}
                </Text>
              </View>
              <View style={styles.paymentSummaryItem}>
                <Text style={styles.paymentSummaryLabel}>Registros</Text>
                <Text style={styles.paymentSummaryValue}>{payments.length}</Text>
              </View>
            </View>

            <View style={styles.paymentsHistorySection} testID="components-student-detail-modal-payments-history">
              <View style={styles.historyHeaderRow}>
                <Text style={styles.historyTitle}>Historial de pagos</Text>
                {payments.length > 0 ? (
                  <Text accessibilityLiveRegion="polite" style={styles.historyMeta}>
                    {paymentsPageStart}-{paymentsPageEnd} de {payments.length}
                  </Text>
                ) : null}
              </View>

              {paymentsQuery.isLoading ? (
                <View style={styles.historyEmpty}>
                  <Text accessibilityLiveRegion="polite" style={styles.historyEmptyText}>
                    Cargando historial...
                  </Text>
                </View>
              ) : paymentsQuery.isError ? (
                <View style={styles.historyEmpty}>
                  <Text accessibilityLiveRegion="assertive" style={styles.historyEmptyText}>
                    No se pudo cargar el historial: {getErrorMessage(paymentsQuery.error)}
                  </Text>
                  <Pressable
                    accessibilityLabel="Reintentar cargar historial de pagos"
                    accessibilityRole="link"
                    hitSlop={TOUCH_HIT_SLOP}
                    onPress={handlePaymentsRetry}
                    style={(state) => {
                      const hovered = (state as typeof state & { hovered?: boolean }).hovered;
                      return [
                        styles.inlineRetryLink,
                        hovered ? styles.inlineLinkHovered : null,
                        state.pressed ? styles.inlineLinkPressed : null,
                      ];
                    }}
                  >
                    <Text style={styles.inlineRetryLinkLabel}>Reintentar</Text>
                  </Pressable>
                </View>
              ) : payments.length === 0 ? (
                <View style={styles.historyEmpty}>
                  <Text style={styles.historyEmptyText}>Sin pagos registrados.</Text>
                </View>
              ) : (
                <>
                  {isDesktop ? (
                    <View style={styles.historyTableHead} pointerEvents="none">
                      <Text style={[styles.historyCell, styles.historyColAmount, styles.historyHeadText]}>Monto</Text>
                      <Text style={[styles.historyCell, styles.historyColDate, styles.historyHeadText]}>Fecha</Text>
                      <Text style={[styles.historyCell, styles.historyColPeriod, styles.historyHeadText]}>Período</Text>
                      <Text style={[styles.historyCell, styles.historyColMethod, styles.historyHeadText]}>Método</Text>
                      <Text style={[styles.historyCell, styles.historyColStatus, styles.historyHeadText]}>Estado</Text>
                    </View>
                  ) : null}

                  {paginatedPayments.map((payment, index) => (
                    <PaymentHistoryRow
                      key={payment.id}
                      index={index}
                      payment={payment}
                      isDesktop={isDesktop}
                      idPrefix={`components-student-detail-modal-payment-${payment.id}`}
                    />
                  ))}

                  {totalPaymentsPages > 1 ? (
                    <View
                      style={[
                        styles.paymentsPagination,
                        isDesktop ? desktopStyles.paymentsPagination : mobileStyles.paymentsPagination,
                      ]}
                      testID="components-student-detail-modal-payments-pagination"
                    >
                      <Pressable
                        accessibilityLabel="Página anterior de pagos"
                        accessibilityRole="link"
                        disabled={paymentsPage === 1}
                        hitSlop={TOUCH_HIT_SLOP}
                        onPress={handlePrevPage}
                        style={(state) => {
                          const hovered = (state as typeof state & { hovered?: boolean }).hovered;
                          const disabled = paymentsPage === 1;
                          return [
                            styles.pagLink,
                            disabled ? styles.pagLinkDisabled : null,
                            hovered && !disabled ? styles.pagLinkHovered : null,
                            state.pressed && !disabled ? styles.pagLinkPressed : null,
                          ];
                        }}
                        testID="components-student-detail-modal-payments-prev"
                      >
                        <Text
                          style={[
                            styles.pagLinkLabel,
                            paymentsPage === 1 ? { color: colors.textMuted, opacity: 0.5 } : null,
                          ]}
                        >
                          Anterior
                        </Text>
                      </Pressable>
                      <Text accessibilityLiveRegion="polite" style={styles.paginationLabel}>
                        {paginationLiveText}
                      </Text>
                      <Pressable
                        accessibilityLabel="Página siguiente de pagos"
                        accessibilityRole="link"
                        disabled={paymentsPage === totalPaymentsPages}
                        hitSlop={TOUCH_HIT_SLOP}
                        onPress={handleNextPage}
                        style={(state) => {
                          const hovered = (state as typeof state & { hovered?: boolean }).hovered;
                          const disabled = paymentsPage === totalPaymentsPages;
                          return [
                            styles.pagLink,
                            disabled ? styles.pagLinkDisabled : null,
                            hovered && !disabled ? styles.pagLinkHovered : null,
                            state.pressed && !disabled ? styles.pagLinkPressed : null,
                          ];
                        }}
                        testID="components-student-detail-modal-payments-next"
                      >
                        <Text
                          style={[
                            styles.pagLinkLabel,
                            paymentsPage === totalPaymentsPages
                              ? { color: colors.textMuted, opacity: 0.5 }
                              : null,
                          ]}
                        >
                          Siguiente
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}
                </>
              )}
            </View>
          </View>
        </View>
      )}
    </AppModal>
  );
}

function LoadingState() {
  return (
    <View style={styles.stateBlock} testID="components-student-detail-modal-loading">
      <Text accessibilityLiveRegion="polite" style={styles.stateTitle}>
        Cargando detalle...
      </Text>
      <Text style={styles.stateDescription}>Obteniendo ficha e historial financiero.</Text>
    </View>
  );
}

const ErrorState = memo(function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <View style={styles.stateBlock} testID="components-student-detail-modal-error">
      <Text accessibilityLiveRegion="assertive" style={styles.stateTitle}>
        No pudimos cargar al alumno
      </Text>
      <Text style={styles.stateDescription}>{message}</Text>
      <Pressable
        accessibilityLabel="Reintentar cargar el detalle del alumno"
        accessibilityRole="link"
        hitSlop={TOUCH_HIT_SLOP}
        onPress={onRetry}
        style={(state) => {
          const hovered = (state as typeof state & { hovered?: boolean }).hovered;
          return [
            styles.inlineRetryLink,
            hovered ? styles.inlineLinkHovered : null,
            state.pressed ? styles.inlineLinkPressed : null,
          ];
        }}
      >
        <Text style={styles.inlineRetryLinkLabel}>Reintentar</Text>
      </Pressable>
    </View>
  );
});

const InfoRow = memo(function InfoRow({
  label,
  value,
  valueColor,
  idPrefix,
}: {
  label: string;
  value: string;
  valueColor?: string;
  idPrefix?: string;
}) {
  const baseId =
    idPrefix ?? `components-student-detail-modal-info-row-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <View nativeID={baseId} style={styles.infoRow} testID={baseId}>
      <Text nativeID={`${baseId}-label`} style={styles.infoRowLabel} testID={`${baseId}-label`}>
        {label}
      </Text>
      <Text
        nativeID={`${baseId}-value`}
        style={[styles.infoRowValue, valueColor ? { color: valueColor } : null]}
        testID={`${baseId}-value`}
      >
        {value}
      </Text>
    </View>
  );
});

const PaymentHistoryRow = memo(function PaymentHistoryRow({
  payment,
  index,
  isDesktop,
  idPrefix,
}: {
  payment: Payment;
  index: number;
  isDesktop: boolean;
  idPrefix: string;
}) {
  if (isDesktop) {
    return (
      <View
        nativeID={idPrefix}
        style={[styles.historyRow, index % 2 === 1 ? styles.historyRowAlt : null]}
        testID={idPrefix}
      >
        <Text
          nativeID={`${idPrefix}-amount`}
          style={[styles.historyCell, styles.historyColAmount, styles.historyCellValue]}
          testID={`${idPrefix}-amount`}
        >
          {formatCurrency(payment.amount, payment.currency)}
        </Text>
        <Text
          nativeID={`${idPrefix}-date`}
          style={[styles.historyCell, styles.historyColDate, styles.historyCellText]}
          testID={`${idPrefix}-date`}
        >
          {formatDateTime(payment.paid_at)}
        </Text>
        <View
          nativeID={`${idPrefix}-period`}
          style={[styles.historyCell, styles.historyColPeriod]}
          testID={`${idPrefix}-period`}
        >
          <Text style={styles.historyCellText} numberOfLines={1}>
            {formatDate(payment.period_start)} — {formatDate(payment.period_end)}
          </Text>
        </View>
        <Text
          nativeID={`${idPrefix}-method`}
          style={[styles.historyCell, styles.historyColMethod, styles.historyCellText]}
          testID={`${idPrefix}-method`}
        >
          {formatPaymentMethod(payment.method)}
        </Text>
        <Text
          nativeID={`${idPrefix}-status`}
          style={[
            styles.historyCell,
            styles.historyColStatus,
            styles.historyCellValue,
            { color: getPaymentRecordColor(payment.status) },
          ]}
          testID={`${idPrefix}-status`}
        >
          {formatPaymentRecordStatus(payment.status)}
        </Text>
      </View>
    );
  }

  return (
    <View
      nativeID={idPrefix}
      style={[styles.mobileHistoryRow, index % 2 === 1 ? styles.historyRowAlt : null]}
      testID={idPrefix}
    >
      <View style={styles.mobileHistoryTop}>
        <View style={styles.mobileHistoryAmountBlock}>
          <Text
            nativeID={`${idPrefix}-amount`}
            style={styles.mobileHistoryAmount}
            testID={`${idPrefix}-amount`}
          >
            {formatCurrency(payment.amount, payment.currency)}
          </Text>
          <Text
            nativeID={`${idPrefix}-status`}
            style={[styles.mobileHistoryStatus, { color: getPaymentRecordColor(payment.status) }]}
            testID={`${idPrefix}-status`}
          >
            {formatPaymentRecordStatus(payment.status)}
          </Text>
        </View>
        <Text style={styles.mobileHistoryMeta}>#{payment.id}</Text>
      </View>
      <View style={styles.mobileHistoryGrid}>
        <Text
          nativeID={`${idPrefix}-date`}
          style={[styles.mobileHistoryCellLabel, styles.mobileHistoryCellValue]}
          testID={`${idPrefix}-date`}
        >
          <Text style={styles.mobileHistoryCellLabel}>Fecha: </Text>
          {formatDateTime(payment.paid_at)}
        </Text>
        <Text
          nativeID={`${idPrefix}-method`}
          style={[styles.mobileHistoryCellLabel, styles.mobileHistoryCellValue]}
          testID={`${idPrefix}-method`}
        >
          <Text style={styles.mobileHistoryCellLabel}>Método: </Text>
          {formatPaymentMethod(payment.method)}
        </Text>
        <Text
          nativeID={`${idPrefix}-period`}
          style={[styles.mobileHistoryCellLabel, styles.mobileHistoryCellValue]}
          testID={`${idPrefix}-period`}
        >
          <Text style={styles.mobileHistoryCellLabel}>Período: </Text>
          {formatDate(payment.period_start)} — {formatDate(payment.period_end)}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
  },
  stateBlock: {
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderColor: colors.border,
    borderWidth: 1,
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  stateTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 16,
    fontWeight: "700",
  },
  stateDescription: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  headerSection: {
    gap: spacing.md,
  },
  photoBlock: {
    alignItems: "center",
  },
  photo: {
    borderRadius: 999,
    borderColor: colors.border,
    borderWidth: 1,
    height: 88,
    width: 88,
  },
  photoPlaceholder: {
    alignItems: "center",
    backgroundColor: colors.woodSoft,
    borderRadius: 999,
    borderColor: colors.border,
    borderWidth: 1,
    height: 88,
    justifyContent: "center",
    width: 88,
  },
  photoInitials: {
    color: colors.woodStrong,
    fontFamily: typography.headingFamily,
    fontSize: 28,
    fontWeight: "800",
  },
  headerCopy: {
    flex: 1,
    gap: 6,
  },
  headerName: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 22,
    fontWeight: "800",
  },
  headerCode: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
  },
  headerBeltRow: {
    alignSelf: "flex-start",
  },
  divider: {
    backgroundColor: colors.border,
    height: 1,
    width: "100%",
  },
  twoColGrid: {
    gap: spacing.md,
  },
  infoBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 2,
    textTransform: "uppercase",
  },
  infoRow: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: 3,
    paddingVertical: spacing.xs,
  },
  infoRowLabel: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  infoRowValue: {
    color: colors.text,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  paymentsBlock: {
    gap: spacing.md,
  },
  paymentsHeader: {
    gap: 4,
  },
  paymentsHeaderCopy: {
    gap: 2,
  },
  paymentsTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 18,
    fontWeight: "800",
  },
  paymentsSubtitle: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 18,
  },
  paymentsSummaryRow: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderColor: colors.border,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  paymentSummaryItem: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  paymentSummaryLabel: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  paymentSummaryValue: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 15,
    fontWeight: "800",
  },
  paymentsHistorySection: {
    gap: spacing.sm,
  },
  historyHeaderRow: {
    alignItems: "baseline",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  historyTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 14,
    fontWeight: "800",
  },
  historyMeta: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
  },
  historyEmpty: {
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderColor: colors.border,
    borderWidth: 1,
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  historyEmptyText: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    textAlign: "center",
  },
  inlineRetryLink: {
    alignSelf: "center",
    borderRadius: radius.sm,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  inlineLinkHovered: {
    backgroundColor: colors.primarySoft,
  },
  inlineLinkPressed: {
    opacity: 0.8,
  },
  inlineRetryLinkLabel: {
    color: colors.primary,
    fontFamily: typography.headingFamily,
    fontSize: 12,
    fontWeight: "700",
    textDecorationLine: "underline",
    textTransform: "uppercase",
  },
  historyTableHead: {
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
    flexDirection: "row",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  historyHeadText: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  historyRow: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  historyRowAlt: {
    backgroundColor: colors.surfaceAlt,
  },
  historyCell: {
    minWidth: 0,
  },
  historyColAmount: {
    flex: 1.1,
  },
  historyColDate: {
    flex: 1.4,
  },
  historyColPeriod: {
    flex: 1.6,
  },
  historyColMethod: {
    flex: 1,
  },
  historyColStatus: {
    flex: 0.9,
  },
  historyCellText: {
    color: colors.text,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  historyCellValue: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 13,
    fontWeight: "700",
  },
  mobileHistoryRow: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
  },
  mobileHistoryTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  mobileHistoryAmountBlock: {
    flex: 1,
    gap: 2,
  },
  mobileHistoryAmount: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 17,
    fontWeight: "800",
  },
  mobileHistoryStatus: {
    fontFamily: typography.headingFamily,
    fontSize: 13,
    fontWeight: "700",
  },
  mobileHistoryMeta: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
  },
  mobileHistoryGrid: {
    gap: 6,
  },
  mobileHistoryCellLabel: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
  },
  mobileHistoryCellValue: {
    color: colors.text,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  paymentsPagination: {
    alignItems: "center",
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  paginationLabel: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  pagLink: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  pagLinkDisabled: {
    opacity: 0.45,
  },
  pagLinkHovered: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
  },
  pagLinkPressed: {
    opacity: 0.75,
  },
  pagLinkLabel: {
    color: colors.primary,
    fontFamily: typography.headingFamily,
    fontSize: 12,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});

const mobileStyles = StyleSheet.create({
  headerSection: {
    alignItems: "center",
    flexDirection: "column",
  },
  headerCopy: {
    alignItems: "center",
  },
  headerBeltRow: {
    alignSelf: "center",
  },
  twoColGrid: {
    flexDirection: "column",
  },
  paymentsSummaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  paymentsPagination: {
    flexDirection: "column",
  },
});

const desktopStyles = StyleSheet.create({
  headerSection: {
    alignItems: "flex-start",
    flexDirection: "row",
  },
  twoColGrid: {
    flexDirection: "row",
  },
  paymentsSummaryRow: {
    flexDirection: "row",
  },
  paymentsPagination: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
