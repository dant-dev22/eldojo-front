import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "@/constants/theme";

interface AppBadgeProps {
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}

export function AppBadge({ label, tone = "neutral" }: AppBadgeProps) {
  return (
    <View style={[styles.base, styles[`${tone}Container`]]}>
      <Text style={[styles.label, styles[`${tone}Label`]]}>{label}</Text>
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
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.borderStrong,
  },
  neutralLabel: {
    color: colors.accent,
  },
  successContainer: {
    backgroundColor: colors.successSoft,
    borderColor: "#B7E4C7",
  },
  successLabel: {
    color: colors.success,
  },
  warningContainer: {
    backgroundColor: colors.warningSoft,
    borderColor: "#F3C58C",
  },
  warningLabel: {
    color: colors.warning,
  },
  dangerContainer: {
    backgroundColor: colors.dangerSoft,
    borderColor: "#F0B6B6",
  },
  dangerLabel: {
    color: colors.danger,
  },
  infoContainer: {
    backgroundColor: colors.primarySoft,
    borderColor: "#F7B37D",
  },
  infoLabel: {
    color: colors.primary,
  },
});
