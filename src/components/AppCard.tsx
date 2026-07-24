import { PropsWithChildren } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { colors, radius, shadows, spacing } from "@/constants/theme";

interface AppCardProps extends PropsWithChildren {
  style?: StyleProp<ViewStyle>;
  nativeID?: string;
  testID?: string;
}

export function AppCard({ children, style, nativeID, testID }: AppCardProps) {
  return (
    <View nativeID={nativeID} style={[styles.card, style]} testID={testID}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
    ...shadows.card,
  },
});
