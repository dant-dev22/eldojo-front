import { PropsWithChildren } from "react";
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { colors, radius, shadows, spacing } from "@/constants/theme";

interface AppCardProps extends PropsWithChildren {
  style?: StyleProp<ViewStyle>;
  nativeID?: string;
  testID?: string;
  className?: string;
}

function getWebClassNameProps(className?: string) {
  return Platform.OS === "web" && className ? ({ className } as { className: string }) : {};
}

export function AppCard({ children, style, nativeID, testID, className }: AppCardProps) {
  const baseId = nativeID ?? testID;

  return (
    <View
      nativeID={nativeID}
      style={[styles.card, style]}
      testID={testID}
      {...getWebClassNameProps(className ?? baseId)}
    >
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
    gap: spacing.md,
    padding: spacing.lg,
    overflow: "hidden",
    ...shadows.card,
  },
});
