import { Feather } from "@expo/vector-icons";
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AppBadge } from "@/components/AppBadge";
import { AppModal } from "@/components/AppModal";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { formatCurrency, formatDate, formatDateTime, formatPaymentMethod, formatPaymentRecordStatus } from "@/utils/format";

import type { Payment, PaymentRecordStatus } from "@/types/api";

const TOUCH_HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

export interface PaymentsListModalProps {
  visible: boolean;
  onClose: () => void;
  payments: Payment[];
  studentFullName: string;
  nativeID?: string;
  testID?: string;
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

function PaymentRowDesktop({
  payment,
  index,
  idPrefix,
}: {
  payment: Payment;
  index: number;
  idPrefix: string;
}) {
  const baseId = `${idPrefix}-${payment.id}`;
  return (
    <View
      nativeID={baseId}
      style={[
        styles.desktopPaymentRow,
        index % 2 === 1 ? styles.desktopPaymentRowAlt : null,
      ]}
      testID={baseId}
    >
      <View style={[styles.paymentCell, styles.paymentColAmount]}>
        <Text style={styles.paymentAmount}>
          {formatCurrency(payment.amount, payment.currency)}
        </Text>
        <Text style={styles.paymentMeta}>Pago #{payment.id}</Text>
      </View>
      <Text style={[styles.paymentCell, styles.paymentColDate, styles.paymentText]}>
        {formatDateTime(payment.paid_at)}
      </Text>
      <View style={[styles.paymentCell, styles.paymentColPeriod]}>
        <Text style={styles.paymentText} numberOfLines={1}>
          {formatDate(payment.period_start)} — {formatDate(payment.period_end)}
        </Text>
      </View>
      <Text style={[styles.paymentCell, styles.paymentColMethod, styles.paymentText]}>
        {formatPaymentMethod(payment.method)}
      </Text>
      <View style={[styles.paymentCell, styles.paymentColStatus]}>
        <AppBadge
          label={formatPaymentRecordStatus(payment.status)}
          tone={getPaymentRecordTone(payment.status)}
        />
      </View>
    </View>
  );
}

function PaymentRowMobile({
  payment,
  index,
  idPrefix,
}: {
  payment: Payment;
  index: number;
  idPrefix: string;
}) {
  const baseId = `${idPrefix}-${payment.id}`;
  void index;
  return (
    <View nativeID={baseId} style={styles.mobilePaymentRow} testID={baseId}>
      <View style={styles.mobilePaymentTop}>
        <View style={styles.mobilePaymentAmountBlock}>
          <Text style={styles.mobilePaymentAmount}>
            {formatCurrency(payment.amount, payment.currency)}
          </Text>
          <Text style={styles.paymentMeta}>Pago #{payment.id}</Text>
        </View>
        <AppBadge
          label={formatPaymentRecordStatus(payment.status)}
          tone={getPaymentRecordTone(payment.status)}
        />
      </View>
      <View style={styles.mobilePaymentFields}>
        <View style={styles.mobilePaymentField}>
          <Feather name="calendar" size={12} color={colors.textMuted} />
          <Text style={styles.mobilePaymentFieldLabel}>Fecha de pago</Text>
          <Text style={styles.mobilePaymentFieldValue}>{formatDateTime(payment.paid_at)}</Text>
        </View>
        <View style={styles.mobilePaymentField}>
          <Feather name="dollar-sign" size={12} color={colors.textMuted} />
          <Text style={styles.mobilePaymentFieldLabel}>Método</Text>
          <Text style={styles.mobilePaymentFieldValue}>{formatPaymentMethod(payment.method)}</Text>
        </View>
        <View style={styles.mobilePaymentField}>
          <Feather name="clock" size={12} color={colors.textMuted} />
          <Text style={styles.mobilePaymentFieldLabel}>Período</Text>
          <Text style={styles.mobilePaymentFieldValue}>
            {formatDate(payment.period_start)} al {formatDate(payment.period_end)}
          </Text>
        </View>
        {payment.notes ? (
          <View style={styles.mobilePaymentField}>
            <Feather name="info" size={12} color={colors.textMuted} />
            <Text style={styles.mobilePaymentFieldLabel}>Notas</Text>
            <Text style={styles.mobilePaymentFieldValue}>{payment.notes}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const DesktopPaymentHead = memo(function DesktopPaymentHead({ idPrefix }: { idPrefix: string }) {
  return (
    <View nativeID={`${idPrefix}-head`} style={styles.desktopPaymentHead} testID={`${idPrefix}-head`}>
      <Text style={[styles.desktopPaymentHeadText, styles.paymentColAmount]}>Monto</Text>
      <Text style={[styles.desktopPaymentHeadText, styles.paymentColDate]}>Fecha de pago</Text>
      <Text style={[styles.desktopPaymentHeadText, styles.paymentColPeriod]}>Período</Text>
      <Text style={[styles.desktopPaymentHeadText, styles.paymentColMethod]}>Método</Text>
      <Text style={[styles.desktopPaymentHeadText, styles.paymentColStatus]}>Estatus</Text>
    </View>
  );
});

const EmptyPaymentsState = memo(function EmptyPaymentsState({
  idPrefix,
}: {
  idPrefix: string;
}) {
  return (
    <View
      nativeID={`${idPrefix}-empty`}
      style={styles.emptyContainer}
      testID={`${idPrefix}-empty`}
    >
      <View style={styles.emptyIcon}>
        <Feather name="credit-card" size={22} color={colors.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>Sin pagos registrados</Text>
      <Text style={styles.emptyDescription}>
        Todavía no hay movimientos financieros asociados a este alumno. El primer pago se
        registra desde el módulo de cobranza.
      </Text>
    </View>
  );
});

export function PaymentsListModal({
  visible,
  onClose,
  payments,
  studentFullName,
  nativeID,
  testID,
}: PaymentsListModalProps) {
  const { isDesktop } = useResponsiveLayout();
  const baseId = nativeID ?? testID ?? "payments-list-modal";

  const totalPaid = payments.reduce((sum, p) => {
    if (p.status !== "paid") return sum;
    const n = Number(p.amount);
    return Number.isFinite(n) ? sum + n : sum;
  }, 0);
  const anyPaid = payments.some((p) => p.status === "paid");
  const primaryCurrency = payments.find((p) => p.status === "paid")?.currency ?? "MXN";

  return (
    <AppModal
      visible={visible}
      title={`Historial de pagos · ${studentFullName}`}
      description={`${payments.length} ${payments.length === 1 ? "registro" : "registros"} ${anyPaid ? `· Total cobrado: ${formatCurrency(totalPaid, primaryCurrency)}` : ""}`}
      onClose={onClose}
      nativeID={baseId}
      testID={baseId}
    >
      {payments.length === 0 ? (
        <EmptyPaymentsState idPrefix={baseId} />
      ) : isDesktop ? (
        <View
          nativeID={`${baseId}-list`}
          style={styles.paymentsDesktopWrap}
          testID={`${baseId}-list`}
        >
          <DesktopPaymentHead idPrefix={baseId} />
          {payments.map((payment, index) => (
            <PaymentRowDesktop
              key={`${baseId}-row-${payment.id}`}
              idPrefix={`${baseId}-row`}
              index={index}
              payment={payment}
            />
          ))}
        </View>
      ) : (
        <View
          nativeID={`${baseId}-list`}
          style={styles.paymentsMobileList}
          testID={`${baseId}-list`}
        >
          {payments.map((payment, index) => (
            <PaymentRowMobile
              key={`${baseId}-row-${payment.id}`}
              idPrefix={`${baseId}-row`}
              index={index}
              payment={payment}
            />
          ))}
        </View>
      )}
    </AppModal>
  );
}

void TOUCH_HIT_SLOP;

const styles = StyleSheet.create({
  paymentsDesktopWrap: {
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  paymentsMobileList: {
    gap: spacing.sm,
    width: "100%",
  },
  desktopPaymentHead: {
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  desktopPaymentHeadText: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  desktopPaymentRow: {
    alignItems: "center",
    backgroundColor: colors.surface,
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  desktopPaymentRowAlt: {
    backgroundColor: colors.surfaceAlt,
  },
  paymentCell: {
    paddingHorizontal: 2,
  },
  paymentColAmount: { flex: 1.3 },
  paymentColDate: { flex: 1.6 },
  paymentColPeriod: { flex: 2 },
  paymentColMethod: { flex: 1.2 },
  paymentColStatus: { flex: 1, alignItems: "flex-end" },
  paymentText: {
    color: colors.text,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 18,
  },
  paymentAmount: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 20,
  },
  paymentMeta: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 11,
    letterSpacing: 0.2,
    marginTop: 2,
  },
  mobilePaymentRow: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
    width: "100%",
  },
  mobilePaymentTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  mobilePaymentAmountBlock: { gap: 2 },
  mobilePaymentAmount: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 22,
  },
  mobilePaymentFields: {
    gap: spacing.sm,
  },
  mobilePaymentField: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    paddingTop: 2,
  },
  mobilePaymentFieldLabel: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
    fontWeight: "600",
    width: 92,
  },
  mobilePaymentFieldValue: {
    color: colors.text,
    flex: 1,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 18,
  },
  emptyContainer: {
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    width: "100%",
  },
  emptyIcon: {
    alignItems: "center",
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: "center",
    marginBottom: spacing.xs,
    width: 56,
  },
  emptyTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 15,
    fontWeight: "700",
  },
  emptyDescription: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 20,
    maxWidth: 440,
    textAlign: "center",
  },
});
