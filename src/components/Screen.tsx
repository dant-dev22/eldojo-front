import { PropsWithChildren, ReactElement } from "react";
import {
  RefreshControlProps,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
  useWindowDimensions,
} from "react-native";
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
  const baseId = nativeID ?? testID ?? "components-screen";
  const { width } = useWindowDimensions();
  const responsiveContentStyle =
    width < 480 ? styles.contentCompact : width < 768 ? styles.contentMobile : styles.contentDesktop;

  if (scrollable) {
    return (
      <SafeAreaView edges={["top"]} nativeID={`${baseId}-safe-area`} style={styles.safeArea} testID={`${baseId}-safe-area`}>
        <ScrollView
          contentContainerStyle={[styles.content, responsiveContentStyle, contentStyle]}
          keyboardShouldPersistTaps="handled"
          nativeID={baseId}
          refreshControl={refreshControl}
          showsVerticalScrollIndicator={false}
          testID={baseId}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} nativeID={`${baseId}-safe-area`} style={styles.safeArea} testID={`${baseId}-safe-area`}>
      <View nativeID={baseId} style={[styles.content, responsiveContentStyle, contentStyle]} testID={baseId}>
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
  },
  contentCompact: {
    padding: spacing.sm,
  },
  contentMobile: {
    padding: spacing.md,
  },
  contentDesktop: {
    padding: spacing.lg,
  },
});
