import { ActivityIndicator, Platform, Pressable, StyleSheet, Text } from "react-native";

import { colors, radius, shadows, spacing, typography } from "@/constants/theme";

interface AppButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger" | "success";
  nativeID?: string;
  testID?: string;
  accessibilityLabel?: string;
  className?: string;
  labelClassName?: string;
}

function getWebClassNameProps(className?: string) {
  return Platform.OS === "web" && className ? ({ className } as { className: string }) : {};
}

function joinWebClassNames(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(" ");
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
  className,
  labelClassName,
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
      {...getWebClassNameProps(
        joinWebClassNames(
          `components-app-button`,
          `components-app-button--${variant}`,
          className ?? baseId
        )
      )}
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
            variant === "secondary"
              ? colors.secondary
              : variant === "danger"
                ? colors.danger
                : colors.onPrimary
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
          {...getWebClassNameProps(
            joinWebClassNames(
              `components-app-button-label`,
              labelClassName ?? `${baseId}-label`
            )
          )}
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
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  primaryHovered: {
    backgroundColor: colors.primaryHover,
    borderColor: colors.primaryHover,
    ...shadows.cardElevated,
  },
  secondary: {
    backgroundColor: "transparent",
    borderColor: "transparent",
  },
  secondaryHovered: {
    backgroundColor: colors.secondarySoft,
    borderColor: "transparent",
  },
  danger: {
    backgroundColor: "transparent",
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
    ...shadows.cardElevated,
  },
  disabled: {
    opacity: 0.5,
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
    color: colors.secondary,
  },
  dangerLabel: {
    color: colors.danger,
  },
  successLabel: {
    color: colors.onPrimary,
  },
});
