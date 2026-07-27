import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { colors, spacing, typography } from "@/constants/theme";

interface StatusViewProps {
  title: string;
  description?: string;
  loading?: boolean;
  nativeID?: string;
  testID?: string;
}

export function StatusView({ title, description, loading = false, nativeID, testID }: StatusViewProps) {
  const baseId =
    nativeID ?? testID ?? `components-status-view-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <View nativeID={baseId} style={styles.container} testID={baseId}>
      {loading ? (
        <ActivityIndicator
          color={colors.accent}
          nativeID={`${baseId}-spinner`}
          size="large"
          testID={`${baseId}-spinner`}
        />
      ) : null}
      <Text nativeID={`${baseId}-title`} style={styles.title} testID={`${baseId}-title`}>
        {title}
      </Text>
      {description ? (
        <Text nativeID={`${baseId}-description`} style={styles.description} testID={`${baseId}-description`}>
          {description}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    flex: 1,
    gap: spacing.sm,
    justifyContent: "center",
    padding: spacing.lg,
  },
  title: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.2,
    textAlign: "center",
  },
  description: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
});
