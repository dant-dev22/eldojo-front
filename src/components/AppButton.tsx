import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

import { colors, radius, shadows, spacing, typography } from "@/constants/theme";

interface AppButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger";
}

export function AppButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = "primary",
}: AppButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
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
            variant === "secondary" ? colors.primary : variant === "danger" ? colors.danger : colors.surface
          }
        />
      ) : (
        <Text
          style={[
            styles.label,
            variant === "secondary" ? styles.secondaryLabel : null,
            variant === "danger" ? styles.dangerLabel : null,
          ]}
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
    borderColor: colors.primary,
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    ...shadows.focus,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
  },
  danger: {
    backgroundColor: colors.dangerSoft,
    borderColor: "#F0B6B6",
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ translateY: 1 }],
  },
  label: {
    color: colors.surface,
    fontFamily: typography.headingFamily,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  secondaryLabel: {
    color: colors.accent,
  },
  dangerLabel: {
    color: colors.danger,
  },
});
