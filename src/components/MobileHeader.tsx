import { Feather } from "@expo/vector-icons";
import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { activeBorderWidth, colors, radius, spacing, typography } from "@/constants/theme";

type MenuPosition = "left" | "right";

interface MobileHeaderProps {
  title: string;
  onOpenMenu: () => void;
  menuPosition?: MenuPosition;
  rightActions?: ReactNode;
  showBackButton?: boolean;
  onBack?: () => void;
  style?: ViewStyle;
  idPrefix?: string;
}

export function MobileHeader({
  title,
  onOpenMenu,
  menuPosition = "right",
  rightActions,
  showBackButton = false,
  onBack,
  style,
  idPrefix = "mobile-header",
}: MobileHeaderProps) {
  const insets = useSafeAreaInsets();

  const renderHamburger = () => (
    <Pressable
      accessibilityLabel="Abrir menú principal"
      accessibilityRole="button"
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      nativeID={`${idPrefix}-menu-button`}
      onPress={onOpenMenu}
      style={({ pressed }) => [
        styles.menuButton,
        pressed ? styles.menuButtonPressed : null,
      ]}
      testID={`${idPrefix}-menu-button`}
    >
      <View nativeID={`${idPrefix}-menu-icon-wrap`} style={styles.menuIconWrap} testID={`${idPrefix}-menu-icon-wrap`}>
        <Feather color={colors.text} name="menu" size={22} />
      </View>
    </Pressable>
  );

  const renderBackButton = () =>
    showBackButton ? (
      <Pressable
        accessibilityLabel="Volver atrás"
        accessibilityRole="button"
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        nativeID={`${idPrefix}-back-button`}
        onPress={onBack}
        style={({ pressed }) => [
          styles.menuButton,
          pressed ? styles.menuButtonPressed : null,
        ]}
        testID={`${idPrefix}-back-button`}
      >
        <View nativeID={`${idPrefix}-back-icon-wrap`} style={styles.menuIconWrap} testID={`${idPrefix}-back-icon-wrap`}>
          <Feather color={colors.text} name="arrow-left" size={22} />
        </View>
      </Pressable>
    ) : null;

  return (
    <View
      nativeID={`${idPrefix}-root`}
      style={[
        styles.root,
        { paddingTop: insets.top + spacing.sm },
        style,
      ]}
      testID={`${idPrefix}-root`}
    >
      <View nativeID={`${idPrefix}-row`} style={styles.row} testID={`${idPrefix}-row`}>
        <View nativeID={`${idPrefix}-left-slot`} style={styles.sideSlot} testID={`${idPrefix}-left-slot`}>
          {menuPosition === "left" ? renderHamburger() : renderBackButton()}
          {menuPosition === "left" && showBackButton ? (
            <View style={{ width: spacing.sm }} />
          ) : null}
          {menuPosition === "left" ? null : renderBackButton()}
          {menuPosition === "right" ? (
            <View nativeID={`${idPrefix}-brand-mark`} style={styles.brandMark} testID={`${idPrefix}-brand-mark`}>
              <Text nativeID={`${idPrefix}-brand-mark-text`} style={styles.brandMarkText} testID={`${idPrefix}-brand-mark-text`}>
                EL
              </Text>
            </View>
          ) : null}
        </View>

        <View
          nativeID={`${idPrefix}-title-wrap`}
          style={styles.titleWrap}
          testID={`${idPrefix}-title-wrap`}
        >
          <Text
            numberOfLines={1}
            nativeID={`${idPrefix}-title`}
            style={styles.title}
            testID={`${idPrefix}-title`}
          >
            {title}
          </Text>
        </View>

        <View nativeID={`${idPrefix}-right-slot`} style={styles.sideSlot} testID={`${idPrefix}-right-slot`}>
          {menuPosition === "right" ? (
            <>
              {rightActions}
              {rightActions ? <View style={{ width: spacing.sm }} /> : null}
              {renderHamburger()}
            </>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end" }}>
              {rightActions}
            </View>
          )}
          {menuPosition === "left" ? (
            <View nativeID={`${idPrefix}-brand-mark`} style={styles.brandMark} testID={`${idPrefix}-brand-mark`}>
              <Text nativeID={`${idPrefix}-brand-mark-text`} style={styles.brandMarkText} testID={`${idPrefix}-brand-mark-text`}>
                EL
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    shadowColor: "#1A1A1A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 48,
  },
  sideSlot: {
    alignItems: "center",
    flex: 1,
    flexBasis: 0,
  },
  titleWrap: {
    alignItems: "center",
    flex: 2,
    justifyContent: "center",
  },
  title: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.3,
    textAlign: "center",
  },
  menuButton: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderRadius: radius.pill,
    height: 44,
    justifyContent: "center",
    minWidth: 44,
    width: 44,
  },
  menuButtonPressed: {
    backgroundColor: colors.hover,
    opacity: 0.92,
  },
  menuIconWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  brandMark: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  brandMarkText: {
    color: colors.onPrimary,
    fontFamily: typography.headingFamily,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
