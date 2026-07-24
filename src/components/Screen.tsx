import { PropsWithChildren, ReactElement } from "react";
import { RefreshControlProps, ScrollView, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, spacing } from "@/constants/theme";

interface ScreenProps extends PropsWithChildren {
  scrollable?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  refreshControl?: ReactElement<RefreshControlProps>;
  nativeID?: string;
  testID?: string;
}

export function Screen({ children, scrollable = false, contentStyle, refreshControl, nativeID, testID }: ScreenProps) {
  if (scrollable) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={[styles.content, contentStyle]}
          keyboardShouldPersistTaps="handled"
          nativeID={nativeID}
          refreshControl={refreshControl}
          showsVerticalScrollIndicator={false}
          testID={testID}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View nativeID={nativeID} style={[styles.content, contentStyle]} testID={testID}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    backgroundColor: colors.background,
    flexGrow: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
});
