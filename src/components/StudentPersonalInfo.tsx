import { Feather } from "@expo/vector-icons";
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AppBadge } from "@/components/AppBadge";
import { AppCard } from "@/components/AppCard";
import { BeltIndicator } from "@/components/BeltIndicator";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import type {
  BeltLevelSummary,
  BeltStripeSummary,
  MedicalRecord,
  MyProfile,
  PaymentStatus,
  Student,
  StudentStatus,
} from "@/types/api";
import {
  formatCurrency,
  formatDate,
  formatPaymentStatus,
  formatStudentStatus,
} from "@/utils/format";

export interface StudentPersonalInfoData {
  first_name: string;
  last_name: string;
  full_name?: string;
  birth_date: string;
  current_belt_level?: BeltLevelSummary | null | undefined;
  current_stripe?: BeltStripeSummary | null | undefined;
  payment_status: PaymentStatus;
  status: StudentStatus;
  next_payment_date?: string | null | undefined;
  monthly_fee?: string | number | null | undefined;
  currency?: string;
  medical_record?: MedicalRecord | null | undefined;
}

export interface StudentPersonalInfoProps {
  student: StudentPersonalInfoData;
  idPrefix?: string;
  testID?: string;
}

function getPaymentTone(status: PaymentStatus): "success" | "warning" | "danger" | "neutral" {
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

interface InfoRowProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  valueColor?: string;
  isLast?: boolean;
  idPrefix?: string;
}

const InfoRow = memo(function InfoRow({
  icon,
  label,
  value,
  valueColor,
  isLast = false,
  idPrefix,
}: InfoRowProps) {
  return (
    <View
      nativeID={idPrefix}
      style={[styles.infoRow, isLast ? styles.infoRowLast : styles.infoRowBorder]}
      testID={idPrefix}
    >
      <View style={styles.infoRowLabelBlock}>
        <Feather name={icon} size={14} color={colors.wood} style={styles.infoRowIcon} />
        <Text
          nativeID={idPrefix ? `${idPrefix}-label` : undefined}
          style={styles.infoRowLabel}
          testID={idPrefix ? `${idPrefix}-label` : undefined}
        >
          {label}
        </Text>
      </View>
      <Text
        nativeID={idPrefix ? `${idPrefix}-value` : undefined}
        style={[styles.infoRowValue, valueColor ? { color: valueColor } : null]}
        testID={idPrefix ? `${idPrefix}-value` : undefined}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
});

export function StudentPersonalInfo({
  student,
  idPrefix = "student-personal-info",
  testID,
}: StudentPersonalInfoProps) {
  const { isDesktop } = useResponsiveLayout();

  const displayName =
    student.full_name ?? `${student.first_name} ${student.last_name}`;

  const bloodType = student.medical_record?.blood_type ?? null;
  const paymentColor =
    getPaymentTone(student.payment_status) === "success"
      ? colors.success
      : getPaymentTone(student.payment_status) === "warning"
        ? colors.warning
        : getPaymentTone(student.payment_status) === "danger"
          ? colors.danger
          : colors.textMuted;

  const studentStatusColor =
    getStudentStatusTone(student.status) === "success"
      ? colors.success
      : getStudentStatusTone(student.status) === "warning"
        ? colors.warning
        : colors.textMuted;

  return (
    <AppCard
      nativeID={`${idPrefix}-card`}
      style={[styles.card, isDesktop ? desktopStyles.card : mobileStyles.card]}
      testID={testID ?? idPrefix}
    >
      <View
        nativeID={`${idPrefix}-header`}
        style={[styles.header, isDesktop ? null : mobileStyles.header]}
        testID={`${idPrefix}-header`}
      >
        <View style={styles.headerCopy} testID={`${idPrefix}-header-copy`}>
          <Text
            nativeID={`${idPrefix}-name`}
            style={[styles.name, !isDesktop && { textAlign: "center" }]}
            testID={`${idPrefix}-name`}
          >
            {displayName}
          </Text>
        </View>

        <View
          nativeID={`${idPrefix}-belt-block`}
          style={[styles.beltBlock, !isDesktop && { alignSelf: "center" }]}
          testID={`${idPrefix}-belt-block`}
        >
          <BeltIndicator
            beltLevel={student.current_belt_level}
            stripe={student.current_stripe}
            size="md"
            testID={`${idPrefix}-belt`}
          />
        </View>

        <View
          nativeID={`${idPrefix}-badges`}
          style={[styles.badgesRow, !isDesktop && { justifyContent: "center" }]}
          testID={`${idPrefix}-badges`}
        >
          <AppBadge
            label={formatPaymentStatus(student.payment_status)}
            tone={getPaymentTone(student.payment_status)}
          />
          <AppBadge
            label={formatStudentStatus(student.status)}
            tone={getStudentStatusTone(student.status)}
          />
        </View>
      </View>

      <View
        nativeID={`${idPrefix}-divider`}
        style={styles.divider}
        testID={`${idPrefix}-divider`}
      />

      <View
        nativeID={`${idPrefix}-info-list`}
        style={styles.infoList}
        testID={`${idPrefix}-info-list`}
      >
        <InfoRow
          idPrefix={`${idPrefix}-birth-date`}
          icon="calendar"
          label="Fecha de nacimiento"
          value={formatDate(student.birth_date)}
        />
        <InfoRow
          idPrefix={`${idPrefix}-payment-status`}
          icon="credit-card"
          label="Estado de pago"
          value={formatPaymentStatus(student.payment_status)}
          valueColor={paymentColor}
        />
        <InfoRow
          idPrefix={`${idPrefix}-student-status`}
          icon="user-check"
          label="Estado del alumno"
          value={formatStudentStatus(student.status)}
          valueColor={studentStatusColor}
        />
        <InfoRow
          idPrefix={`${idPrefix}-next-payment`}
          icon="calendar"
          label="Próximo pago"
          value={formatDate(student.next_payment_date ?? null)}
        />
        <InfoRow
          idPrefix={`${idPrefix}-monthly-fee`}
          icon="dollar-sign"
          label="Costo de mensualidad"
          value={formatCurrency(student.monthly_fee, student.currency)}
        />
        {bloodType ? (
          <InfoRow
            idPrefix={`${idPrefix}-blood-type`}
            icon="droplet"
            label="Tipo de sangre"
            value={bloodType}
            isLast
          />
        ) : (
          <View style={styles.infoRowLast} />
        )}
      </View>
    </AppCard>
  );
}

export function studentToPersonalInfo(student: Student): StudentPersonalInfoData {
  return {
    first_name: student.first_name,
    last_name: student.last_name,
    birth_date: student.birth_date,
    current_belt_level: student.current_belt_level,
    current_stripe: student.current_stripe,
    payment_status: student.payment_status,
    status: student.status,
    next_payment_date: student.next_payment_date,
    monthly_fee: student.monthly_fee,
    currency: student.currency,
    medical_record: student.medical_record,
  };
}

export function myProfileToPersonalInfo(profile: MyProfile): StudentPersonalInfoData {
  return {
    first_name: profile.first_name,
    last_name: profile.last_name,
    full_name: profile.full_name,
    birth_date: profile.birth_date,
    payment_status: profile.payment_status,
    status: profile.status,
    next_payment_date: profile.next_payment_date,
  };
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
  },
  header: {
    gap: spacing.md,
  },
  headerCopy: {
    gap: spacing.xs,
  },
  name: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  beltBlock: {
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  divider: {
    backgroundColor: colors.border,
    height: 1,
    width: "100%",
  },
  infoList: {
    gap: 0,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  infoRowBorder: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  infoRowLast: {
    paddingBottom: 0,
  },
  infoRowLabelBlock: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    gap: 6,
  },
  infoRowIcon: {
    marginLeft: 2,
  },
  infoRowLabel: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 12,
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
    flexShrink: 1,
    textAlign: "right",
  },
});

const mobileStyles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  header: {
    alignItems: "center",
  },
  headerCopy: {
    alignItems: "center",
  },
});

const desktopStyles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
});

export default StudentPersonalInfo;
