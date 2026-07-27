import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

import { colors, radius, spacing, typography } from "@/constants/theme";

interface AppButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger" | "success";
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
      style={(state) => {
        const hovered = (state as typeof state & { hovered?: boolean }).hovered;

        return [
          styles.base,
          variant === "secondary"
            ? styles.secondary
            : variant === "danger"
              ? styles.danger
              : variant === "success"
                ? styles.success
                : styles.primary,
          hovered && !isDisabled
            ? variant === "secondary"
              ? styles.secondaryHovered
              : variant === "danger"
                ? styles.dangerHovered
                : variant === "success"
                  ? styles.successHovered
                  : styles.primaryHovered
            : null,
          isDisabled && styles.disabled,
          state.pressed && !isDisabled ? styles.pressed : null,
        ];
      }}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === "secondary" ? colors.ink : variant === "danger" ? colors.danger : colors.onPrimary
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
            variant === "success" ? styles.successLabel : null,
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
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  primary: {
    backgroundColor: colors.action,
    borderColor: colors.action,
  },
  primaryHovered: {
    backgroundColor: colors.actionHover,
    borderColor: colors.actionHover,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
  },
  secondaryHovered: {
    backgroundColor: colors.hoverStrong,
    borderColor: colors.action,
  },
  danger: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
  },
  dangerHovered: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.dangerHover,
  },
  success: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  successHovered: {
    backgroundColor: colors.successHover,
    borderColor: colors.successHover,
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.96,
    transform: [{ scale: 0.985 }, { translateY: 1 }],
  },
  label: {
    color: colors.onPrimary,
    fontFamily: typography.headingFamily,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.15,
  },
  secondaryLabel: {
    color: colors.text,
  },
  dangerLabel: {
    color: colors.danger,
  },
  successLabel: {
    color: colors.onPrimary,
  },
});
