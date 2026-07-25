import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

import { colors, radius, shadows, spacing, typography } from "@/constants/theme";

interface AppButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger";
  nativeID?: string;
  testID?: string;
  accessibilityLabel?: string;
}

export function AppButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = "primary",
  nativeID,
  testID,
  accessibilityLabel,
}: AppButtonProps) {
  const isDisabled = disabled || loading;
  const baseId = nativeID ?? testID ?? `components-app-button-${label.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      disabled={isDisabled}
      nativeID={baseId}
      onPress={onPress}
      testID={baseId}
      style={({ pressed }) => [
        styles.base,
        variant === "secondary" ? styles.secondary : variant === "danger" ? styles.danger : styles.primary,
        isDisabled && styles.disabled,
        pressed && !isDisabled ? styles.pressed : null,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === "secondary" ? colors.primary : variant === "danger" ? colors.danger : colors.onPrimary
          }
          nativeID={`${baseId}-spinner`}
          testID={`${baseId}-spinner`}
        />
      ) : (
        <Text
          nativeID={`${baseId}-label`}
          style={[
            styles.label,
            variant === "secondary" ? styles.secondaryLabel : null,
            variant === "danger" ? styles.dangerLabel : null,
          ]}
          testID={`${baseId}-label`}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    borderColor: colors.action,
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: spacing.xl,
    ...shadows.focus,
  },
  primary: {
    backgroundColor: colors.action,
    borderColor: colors.action,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
  },
  danger: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ translateY: 1 }],
  },
  label: {
    color: colors.onPrimary,
    fontFamily: typography.headingFamily,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  secondaryLabel: {
    color: colors.primary,
  },
  dangerLabel: {
    color: colors.danger,
  },
});
