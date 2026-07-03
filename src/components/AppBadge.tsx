import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "@/constants/theme";

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
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
  },
  neutralContainer: {
    backgroundColor: colors.surface,
  },
  neutralLabel: {
    color: colors.primary,
  },
  successContainer: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },
  successLabel: {
    color: colors.success,
  },
  warningContainer: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },
  warningLabel: {
    color: colors.warning,
  },
  dangerContainer: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  dangerLabel: {
    color: colors.danger,
  },
  infoContainer: {
    backgroundColor: "#F8FAFC",
    borderColor: colors.border,
  },
  infoLabel: {
    color: colors.accent,
  },
});
