import { useEffect, useRef, ReactElement } from "react";
import { Animated, DimensionValue, StyleSheet, View, ViewStyle } from "react-native";

import { colors, radius } from "@/constants/theme";

type SkeletonVariant = "text" | "circle" | "rect" | "card";

interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: DimensionValue;
  height?: number;
  style?: ViewStyle;
  lines?: number;
  lineSpacing?: number;
  idPrefix?: string;
}

export function SkeletonLoader({
  variant = "rect",
  width,
  height,
  style,
  lines = 1,
  lineSpacing = 8,
  idPrefix = "skeleton",
}: SkeletonProps) {
  const opacityAnim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.65,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.35,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacityAnim]);

  const getBaseStyle = (): ViewStyle => {
    switch (variant) {
      case "circle":
        const size = height ?? 40;
        return {
          width: size as DimensionValue,
          height: size,
          borderRadius: size / 2,
        };
      case "text":
        return {
          width: (width ?? "80%") as DimensionValue,
          height: height ?? 14,
          borderRadius: radius.sm,
        };
      case "card":
        return {
          width: (width ?? "100%") as DimensionValue,
          height: height ?? 120,
          borderRadius: radius.lg,
        };
      case "rect":
      default:
        return {
          width: (width ?? "100%") as DimensionValue,
          height: height ?? 48,
          borderRadius: radius.md,
        };
    }
  };

  if (lines > 1) {
    return (
      <View
        nativeID={`${idPrefix}-multiline-wrap`}
        style={{ gap: lineSpacing }}
        testID={`${idPrefix}-multiline-wrap`}
      >
        {Array.from({ length: lines }).map((_, idx) => (
          <Animated.View
            key={idx}
            nativeID={`${idPrefix}-line-${idx}`}
            style={[
              styles.skeleton,
              {
                width: idx === lines - 1 ? "55%" : typeof width === "number" ? width : "100%",
                height: height ?? 14,
                borderRadius: radius.sm,
                opacity: opacityAnim,
              },
              style,
            ]}
            testID={`${idPrefix}-line-${idx}`}
          />
        ))}
      </View>
    );
  }

  return (
    <Animated.View
      nativeID={`${idPrefix}-root`}
      style={[
        styles.skeleton,
        getBaseStyle(),
        { opacity: opacityAnim },
        style,
      ]}
      testID={`${idPrefix}-root`}
    />
  );
}

interface SkeletonListProps {
  count?: number;
  itemHeight?: number;
  gap?: number;
  idPrefix?: string;
}

export function SkeletonList({
  count = 5,
  itemHeight = 88,
  gap = 12,
  idPrefix = "skeleton-list",
}: SkeletonListProps) {
  return (
    <View
      nativeID={`${idPrefix}-wrap`}
      style={{ gap }}
      testID={`${idPrefix}-wrap`}
    >
      {Array.from({ length: count }).map((_, idx) => (
        <View key={idx} style={{ flexDirection: "row", gap: 12 }}>
          <SkeletonLoader
            height={52}
            idPrefix={`${idPrefix}-avatar-${idx}`}
            variant="circle"
            width={52}
          />
          <View style={{ flex: 1, gap: 8, justifyContent: "center" }}>
            <SkeletonLoader
              height={14}
              idPrefix={`${idPrefix}-title-${idx}`}
              variant="text"
              width="70%"
            />
            <SkeletonLoader
              height={12}
              idPrefix={`${idPrefix}-meta-${idx}`}
              lines={2}
              variant="text"
              width="100%"
            />
          </View>
        </View>
      ))}
    </View>
  );
}

interface SkeletonCardGridProps {
  count?: number;
  columns?: number;
  gap?: number;
  cardHeight?: number;
  idPrefix?: string;
}

export function SkeletonCardGrid({
  count = 4,
  columns = 2,
  gap = 12,
  cardHeight = 140,
  idPrefix = "skeleton-grid",
}: SkeletonCardGridProps) {
  const items = Array.from({ length: count });
  const rows: ReactElement[] = [];
  for (let i = 0; i < items.length; i += columns) {
    const row = items.slice(i, i + columns);
    rows.push(
      <View key={i} style={{ flexDirection: "row", gap }}>
        {row.map((_, idx) => (
          <View key={idx} style={{ flex: 1 }}>
            <SkeletonLoader
              height={cardHeight}
              idPrefix={`${idPrefix}-card-${i + idx}`}
              variant="card"
            />
          </View>
        ))}
        {row.length < columns
          ? Array.from({ length: columns - row.length }).map((_, e) => (
              <View key={`filler-${e}`} style={{ flex: 1 }} />
            ))
          : null}
      </View>
    );
  }
  return (
    <View
      nativeID={`${idPrefix}-wrap`}
      style={{ gap }}
      testID={`${idPrefix}-wrap`}
    >
      {rows}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderWidth: 1,
    overflow: "hidden",
  },
});
