import { Feather } from "@expo/vector-icons";
import { ReactNode } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radius, spacing, typography } from "@/constants/theme";

type FABVariant = "default" | "extended" | "mini";

interface FloatingActionButtonProps {
  onPress: () => void;
  label?: string;
  icon?: keyof typeof Feather.glyphMap;
  variant?: FABVariant;
  disabled?: boolean;
  style?: any;
  idPrefix?: string;
  accessibilityLabel?: string;
  nativeID?: string;
  testID?: string;
}

export function FloatingActionButton({
  onPress,
  label,
  icon = "plus",
  variant = "default",
  disabled = false,
  style,
  idPrefix = "fab",
  accessibilityLabel,
  nativeID,
  testID,
}: FloatingActionButtonProps) {
  const insets = useSafeAreaInsets();
  const scaleAnim = new Animated.Value(1);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      friction: 8,
      tension: 300,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 6,
      tension: 250,
    }).start();
  };

  const isExtended = variant === "extended" || (label && variant !== "mini");
  const size = variant === "mini" ? 44 : isExtended ? 56 : 56;

  return (
    <Animated.View
      nativeID={`${idPrefix}-wrap`}
      style={[
        styles.wrap,
        {
          marginBottom: insets.bottom + spacing.md,
          transform: [{ scale: scaleAnim }],
        },
        style,
      ]}
      testID={`${idPrefix}-wrap`}
    >
      <Pressable
        accessibilityLabel={accessibilityLabel ?? label ?? "Acción principal"}
        accessibilityRole="button"
        disabled={disabled}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        nativeID={nativeID ?? `${idPrefix}-button`}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={(state) => {
          const { pressed } = state;
          const hovered = (state as unknown as { hovered?: boolean }).hovered;
          return [
            styles.button,
            isExtended ? styles.buttonExtended : null,
            !isExtended ? { width: size, height: size, borderRadius: size / 2 } : null,
            disabled ? styles.buttonDisabled : null,
            pressed || hovered ? styles.buttonPressed : null,
          ];
        }}
        testID={testID ?? `${idPrefix}-button`}
      >
        <View nativeID={`${idPrefix}-icon-wrap`} style={styles.iconWrap} testID={`${idPrefix}-icon-wrap`}>
          <Feather color={colors.onPrimary} name={icon} size={variant === "mini" ? 18 : 22} />
        </View>
        {isExtended && label ? (
          <Text nativeID={`${idPrefix}-label`} style={styles.label} testID={`${idPrefix}-label`}>
            {label}
          </Text>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "flex-end",
    marginRight: spacing.md,
  },
  button: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 28,
    elevation: 6,
    flexDirection: "row",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonExtended: {
    borderRadius: 28,
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  buttonPressed: {
    backgroundColor: colors.primaryHover,
    elevation: 8,
    shadowOpacity: 0.38,
  },
  buttonDisabled: {
    backgroundColor: colors.woodLight,
    elevation: 2,
    shadowOpacity: 0.12,
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: colors.onPrimary,
    fontFamily: typography.headingFamily,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
