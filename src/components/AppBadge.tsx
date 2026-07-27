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
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    borderWidth: 1,
    minHeight: 26,
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  label: {
    fontFamily: typography.headingFamily,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  neutralContainer: {
    backgroundColor: colors.goldSoft,
    borderColor: colors.borderStrong,
  },
  neutralLabel: {
    color: colors.textMuted,
  },
  successContainer: {
    backgroundColor: colors.successSoft,
    borderColor: "#BFE9D9",
  },
  successLabel: {
    color: colors.success,
  },
  warningContainer: {
    backgroundColor: colors.warningSoft,
    borderColor: "#F0D89B",
  },
  warningLabel: {
    color: colors.warning,
  },
  dangerContainer: {
    backgroundColor: colors.dangerSoft,
    borderColor: "#F2BCC5",
  },
  dangerLabel: {
    color: colors.danger,
  },
  infoContainer: {
    backgroundColor: colors.infoSoft,
    borderColor: "#C6D7FF",
  },
  infoLabel: {
    color: colors.info,
  },
});
