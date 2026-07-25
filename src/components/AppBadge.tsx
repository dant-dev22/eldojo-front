import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "@/constants/theme";

interface AppBadgeProps {
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
  nativeID?: string;
  testID?: string;
}

export function AppBadge({ label, tone = "neutral", nativeID, testID }: AppBadgeProps) {
  const baseId =
    nativeID ?? testID ?? `components-app-badge-${tone}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <View nativeID={baseId} style={[styles.base, styles[`${tone}Container`]]} testID={baseId}>
      <Text nativeID={`${baseId}-label`} style={[styles.label, styles[`${tone}Label`]]} testID={`${baseId}-label`}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: "flex-start",
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    minHeight: 28,
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  label: {
    fontFamily: typography.headingFamily,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  neutralContainer: {
    backgroundColor: colors.goldSoft,
    borderColor: colors.gold,
  },
  neutralLabel: {
    color: colors.primary,
  },
  successContainer: {
    backgroundColor: colors.successSoft,
    borderColor: "#AFC675",
  },
  successLabel: {
    color: colors.success,
  },
  warningContainer: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.action,
  },
  warningLabel: {
    color: colors.warning,
  },
  dangerContainer: {
    backgroundColor: colors.dangerSoft,
    borderColor: "#E7A4A4",
  },
  dangerLabel: {
    color: colors.danger,
  },
  infoContainer: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  infoLabel: {
    color: colors.primary,
  },
});
