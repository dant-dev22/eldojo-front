import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import type { BeltLevelSummary, BeltStripeSummary } from "@/types/api";
import { colors, spacing, typography } from "@/constants/theme";
import { getWebClassNameProps } from "@/utils/webClassNames";

export type BeltIndicatorSize = "xs" | "sm" | "md" | "lg";

export interface BeltIndicatorProps {
  beltLevel: BeltLevelSummary | null | undefined;
  stripe?: BeltStripeSummary | null | undefined;
  size?: BeltIndicatorSize;
  showLabel?: boolean;
  onPress?: () => void;
  testID?: string;
}

const SIZE_CONFIG: Record<
  BeltIndicatorSize,
  {
    barHeight: number;
    barWidth: number;
    stripeSize: number;
    labelSize: number;
    barRadius: number;
    gap: number;
  }
> = {
  xs: { barHeight: 8, barWidth: 46, stripeSize: 10, labelSize: 11, barRadius: 3, gap: 4 },
  sm: { barHeight: 10, barWidth: 56, stripeSize: 12, labelSize: 12, barRadius: 4, gap: 6 },
  md: { barHeight: 14, barWidth: 72, stripeSize: 16, labelSize: 13, barRadius: 5, gap: 8 },
  lg: { barHeight: 18, barWidth: 92, stripeSize: 20, labelSize: 15, barRadius: 6, gap: 10 },
};

function buildLabel(
  beltLevel: BeltLevelSummary | null | undefined,
  stripe: BeltStripeSummary | null | undefined,
): string {
  if (!beltLevel) return "Sin cinta asignada";
  const base = `Cinta ${beltLevel.display_name.toLowerCase()}`;
  if (!stripe) return base;
  return `${base} (punto ${stripe.display_name.toLowerCase()})`;
}

export const BeltIndicator: React.FC<BeltIndicatorProps> = ({
  beltLevel,
  stripe,
  size = "sm",
  showLabel = true,
  onPress,
  testID,
}) => {
  const cfg = SIZE_CONFIG[size];
  const hasBelt = !!beltLevel;
  const beltBg = hasBelt ? beltLevel!.color_hex : "#E0E0E0";
  const beltTextColor = hasBelt ? beltLevel!.text_color_hex : "#757575";
  const label = buildLabel(beltLevel, stripe ?? null);

  const Wrapper = onPress ? Pressable : View;
  const wrapperProps = onPress
    ? ({
        onPress,
        android_ripple: { color: colors.hoverStrong, borderless: false },
        style: ({ pressed }: { pressed: boolean }) => [
          styles.wrapperBase,
          pressed && Platform.OS === "ios" ? { opacity: 0.85 } : null,
        ],
      } as const)
    : { style: styles.wrapperBase };

  return (
    <Wrapper
      {...wrapperProps}
      {...getWebClassNameProps(
        onPress
          ? `belt-indicator belt-indicator--clickable belt-indicator--${size}`
          : `belt-indicator belt-indicator--${size}`,
      )}
      testID={testID ?? "belt-indicator"}
      accessibilityLabel={label}
    >
      <View
        style={[
          styles.row,
          { gap: cfg.gap },
        ]}
        {...getWebClassNameProps("belt-indicator__row")}
      >
        <View
          style={[
            styles.barContainer,
            {
              width: cfg.barWidth,
              height: cfg.barHeight,
              borderRadius: cfg.barRadius,
              backgroundColor: beltBg,
            },
          ]}
          {...getWebClassNameProps("belt-indicator__bar")}
        >
          {stripe ? (
            <View
              style={[
                styles.stripeDot,
                {
                  width: cfg.stripeSize,
                  height: cfg.stripeSize,
                  borderRadius: cfg.stripeSize / 2,
                  backgroundColor: stripe.color_hex,
                  borderColor: beltTextColor,
                  borderWidth: size === "xs" ? 1 : 2,
                },
              ]}
              {...getWebClassNameProps("belt-indicator__stripe-dot")}
            />
          ) : null}
        </View>
        {showLabel ? (
          <Text
            style={[
              styles.label,
              {
                fontSize: cfg.labelSize,
                color: hasBelt ? colors.text : colors.textMuted,
                fontFamily: typography.bodyFamily,
              },
            ]}
            {...getWebClassNameProps("belt-indicator__label")}
            numberOfLines={1}
          >
            {label}
          </Text>
        ) : null}
      </View>
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  wrapperBase: {
    minWidth: 44,
    minHeight: 28,
    paddingVertical: spacing.xs / 2,
    paddingHorizontal: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  barContainer: {
    width: "100%",
    position: "relative",
    overflow: "visible",
    shadowColor: "rgba(26, 26, 26, 0.06)",
    shadowOpacity: 0.8,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 0.5,
  },
  stripeDot: {
    position: "absolute",
    top: "50%",
    right: 6,
    transform: [{ translateY: "-50%" }],
  },
  label: {
    flexShrink: 1,
    lineHeight: undefined,
  },
});

export default BeltIndicator;
