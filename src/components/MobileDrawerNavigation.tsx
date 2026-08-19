import { Feather } from "@expo/vector-icons";
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useMemo, useRef } from "react";

import { LogoSvg } from "@/components/LogoSvg";
import { activeBorderWidth, colors, radius, spacing, transitions, typography } from "@/constants/theme";

type AdminSection = "dashboard" | "students" | "trajectory" | "branches" | "operations" | "payments" | "qr-codes" | "dojo" | "reports" | "settings";

interface DrawerNavItem {
  key: AdminSection;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
}

interface MobileDrawerNavigationProps {
  visible: boolean;
  onClose: () => void;
  activeSection: AdminSection;
  items: DrawerNavItem[];
  displayName: string;
  email?: string;
  avatarInitial: string;
  onSignOut: () => void;
  organizationName?: string | null;
  branchName?: string | null;
  idPrefix?: string;
}

export function MobileDrawerNavigation({
  visible,
  onClose,
  activeSection,
  items,
  displayName,
  email,
  avatarInitial,
  onSignOut,
  organizationName,
  branchName,
  idPrefix = "mobile-drawer",
}: MobileDrawerNavigationProps) {
  const slideAnim = useRef(new Animated.Value(-320)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: transitions.base,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: transitions.slow,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: transitions.fast,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -320,
          duration: transitions.fast,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim]);

  const handleItemPress = (item: DrawerNavItem) => {
    onClose();
    setTimeout(() => {
      item.onPress();
    }, transitions.fast);
  };

  const contextualInfo = useMemo(() => {
    if (organizationName || branchName) {
      return [
        organizationName ? { label: "Organización", value: organizationName } : null,
        branchName ? { label: "Sucursal", value: branchName } : null,
      ].filter(Boolean) as Array<{ label: string; value: string }>;
    }
    return [];
  }, [branchName, organizationName]);

  return (
    <Modal
      animationType="none"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <Animated.View
        nativeID={`${idPrefix}-overlay`}
        style={[styles.overlay, { opacity: fadeAnim }]}
        testID={`${idPrefix}-overlay`}
      >
        <Pressable
          accessibilityLabel="Cerrar menú"
          accessibilityRole="button"
          nativeID={`${idPrefix}-backdrop`}
          onPress={onClose}
          style={styles.backdrop}
          testID={`${idPrefix}-backdrop`}
        />

        <Animated.View
          nativeID={`${idPrefix}-panel`}
          style={[
            styles.panel,
            { transform: [{ translateX: slideAnim }] },
          ]}
          testID={`${idPrefix}-panel`}
        >
          <SafeAreaView style={styles.panelSafeArea} edges={["top", "left", "bottom"]}>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              nativeID={`${idPrefix}-scroll`}
              showsVerticalScrollIndicator={false}
              testID={`${idPrefix}-scroll`}
            >
              <View nativeID={`${idPrefix}-header`} style={styles.panelHeader} testID={`${idPrefix}-header`}>
                <View nativeID={`${idPrefix}-brand-row`} style={styles.brandRow} testID={`${idPrefix}-brand-row`}>
                  <View nativeID={`${idPrefix}-logo`} style={styles.logoMark} testID={`${idPrefix}-logo`}>
                    <LogoSvg size={44} variant="mark-only" animated loop />
                  </View>
                  <View nativeID={`${idPrefix}-brand-copy`} style={styles.brandCopy} testID={`${idPrefix}-brand-copy`}>
                    <Text nativeID={`${idPrefix}-brand-title`} style={styles.brandTitle} testID={`${idPrefix}-brand-title`}>
                      ElDojo
                    </Text>
                    <Text nativeID={`${idPrefix}-brand-subtitle`} style={styles.brandSubtitle} testID={`${idPrefix}-brand-subtitle`}>
                      Panel de administración
                    </Text>
                  </View>
                </View>
                <Pressable
                  accessibilityLabel="Cerrar menú"
                  accessibilityRole="button"
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  nativeID={`${idPrefix}-close-button`}
                  onPress={onClose}
                  style={({ pressed }) => [styles.closeButton, pressed ? styles.closeButtonPressed : null]}
                  testID={`${idPrefix}-close-button`}
                >
                  <Feather color={colors.text} name="x" size={22} />
                </Pressable>
              </View>

              {contextualInfo.length > 0 ? (
                <View nativeID={`${idPrefix}-context-card`} style={styles.contextCard} testID={`${idPrefix}-context-card`}>
                  {contextualInfo.map((info, idx) => (
                    <View key={info.label} style={idx > 0 ? { marginTop: spacing.xs } : null}>
                      <Text nativeID={`${idPrefix}-context-label-${info.label}`} style={styles.contextLabel} testID={`${idPrefix}-context-label-${info.label}`}>
                        {info.label}
                      </Text>
                      <Text
                        numberOfLines={1}
                        nativeID={`${idPrefix}-context-value-${info.label}`}
                        style={styles.contextValue}
                        testID={`${idPrefix}-context-value-${info.label}`}
                      >
                        {info.value}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <View nativeID={`${idPrefix}-nav-section`} style={styles.navSection} testID={`${idPrefix}-nav-section`}>
                <Text nativeID={`${idPrefix}-nav-heading`} style={styles.navHeading} testID={`${idPrefix}-nav-heading`}>
                  Navegación
                </Text>
                {items.map((item) => {
                  const isActive = item.key === activeSection;
                  return (
                    <Pressable
                      key={item.key}
                      accessibilityLabel={item.label}
                      accessibilityRole="button"
                      nativeID={`${idPrefix}-nav-item-${item.key}`}
                      onPress={() => handleItemPress(item)}
                      style={(state) => {
                        const hovered = (state as typeof state & { hovered?: boolean }).hovered;
                        return [
                          styles.navItem,
                          isActive ? styles.navItemActive : null,
                          hovered ? styles.navItemHovered : null,
                          state.pressed ? styles.navItemPressed : null,
                        ];
                      }}
                      testID={`${idPrefix}-nav-item-${item.key}`}
                    >
                      <View
                        nativeID={`${idPrefix}-nav-item-active-bar-${item.key}`}
                        style={[
                          styles.activeBar,
                          isActive ? styles.activeBarVisible : null,
                        ]}
                        testID={`${idPrefix}-nav-item-active-bar-${item.key}`}
                      />
                      <View
                        nativeID={`${idPrefix}-nav-item-icon-wrap-${item.key}`}
                        style={[
                          styles.iconWrap,
                          isActive ? styles.iconWrapActive : null,
                        ]}
                        testID={`${idPrefix}-nav-item-icon-wrap-${item.key}`}
                      >
                        <Feather
                          color={isActive ? colors.primary : colors.textMuted}
                          name={item.icon}
                          size={18}
                        />
                      </View>
                      <Text
                        nativeID={`${idPrefix}-nav-item-label-${item.key}`}
                        style={[
                          styles.navItemLabel,
                          isActive ? styles.navItemLabelHovered : null,
                        ]}
                        testID={`${idPrefix}-nav-item-label-${item.key}`}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            <View nativeID={`${idPrefix}-footer`} style={styles.footer} testID={`${idPrefix}-footer`}>
              <View nativeID={`${idPrefix}-profile-card`} style={styles.profileCard} testID={`${idPrefix}-profile-card`}>
                <View nativeID={`${idPrefix}-avatar`} style={styles.avatar} testID={`${idPrefix}-avatar`}>
                  <Text nativeID={`${idPrefix}-avatar-label`} style={styles.avatarLabel} testID={`${idPrefix}-avatar-label`}>
                    {avatarInitial}
                  </Text>
                </View>
                <View nativeID={`${idPrefix}-profile-copy`} style={styles.profileCopy} testID={`${idPrefix}-profile-copy`}>
                  <Text numberOfLines={1} nativeID={`${idPrefix}-profile-name`} style={styles.profileName} testID={`${idPrefix}-profile-name`}>
                    {displayName}
                  </Text>
                  {email ? (
                    <Text numberOfLines={1} nativeID={`${idPrefix}-profile-email`} style={styles.profileEmail} testID={`${idPrefix}-profile-email`}>
                      {email}
                    </Text>
                  ) : null}
                </View>
              </View>
              <Pressable
                accessibilityLabel="Cerrar sesión"
                accessibilityRole="button"
                nativeID={`${idPrefix}-signout`}
                onPress={onSignOut}
                style={(state) => {
                  const { pressed } = state;
                  const hovered = (state as unknown as { hovered?: boolean }).hovered;
                  return [
                    styles.signOutButton,
                    (pressed || hovered) ? styles.signOutButtonHovered : null,
                  ];
                }}
                testID={`${idPrefix}-signout`}
              >
                <View style={styles.signOutIconWrap}>
                  <Feather color={colors.primary} name="log-out" size={16} />
                </View>
                <Text nativeID={`${idPrefix}-signout-label`} style={styles.signOutLabel} testID={`${idPrefix}-signout-label`}>
                  Cerrar sesión
                </Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: "row",
  },
  backdrop: {
    backgroundColor: "rgba(10, 10, 10, 0.56)",
    flex: 1,
  },
  panel: {
    backgroundColor: colors.surface,
    borderRightColor: colors.border,
    borderRightWidth: 1,
    flexDirection: "column",
    height: "100%",
    width: 320,
  },
  panelSafeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  panelHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  logoMark: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderRadius: 18,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  logoText: {
    color: colors.onPrimary,
    fontFamily: typography.headingFamily,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  brandCopy: {
    gap: 2,
  },
  brandTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 20,
    fontWeight: "800",
  },
  brandSubtitle: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
    lineHeight: 16,
  },
  closeButton: {
    alignItems: "center",
    borderRadius: radius.pill,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  closeButtonPressed: {
    backgroundColor: colors.hover,
    opacity: 0.92,
  },
  contextCard: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.lg,
    padding: spacing.md,
  },
  contextLabel: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  contextValue: {
    color: colors.text,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    marginTop: 2,
  },
  navSection: {
    gap: spacing.xs,
  },
  navHeading: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
    marginLeft: 2,
    textTransform: "uppercase",
  },
  navItem: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderRadius: radius.md,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 48,
    overflow: "hidden",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  navItemActive: {
    backgroundColor: "#FFF5F0",
  },
  navItemHovered: {
    backgroundColor: colors.hover,
  },
  navItemPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.995 }],
  },
  activeBar: {
    alignSelf: "stretch",
    backgroundColor: "transparent",
    borderRadius: 2,
    height: "100%",
    left: -spacing.md,
    position: "absolute",
    width: activeBorderWidth,
  },
  activeBarVisible: {
    backgroundColor: colors.primary,
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: colors.woodSoft,
    borderRadius: 12,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  iconWrapActive: {
    backgroundColor: colors.primarySoft,
  },
  iconWrapHovered: {
    backgroundColor: colors.primarySoft,
  },
  navItemLabel: {
    color: colors.text,
    fontFamily: typography.bodyFamily,
    fontSize: 15,
    fontWeight: "500",
    letterSpacing: 0.1,
  },
  navItemLabelHovered: {
    color: colors.primary,
    fontFamily: typography.headingFamily,
    fontWeight: "700",
  },
  footer: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  profileCard: {
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.sm,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: colors.secondary,
    borderRadius: radius.pill,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  avatarLabel: {
    color: colors.onPrimary,
    fontFamily: typography.headingFamily,
    fontSize: 15,
    fontWeight: "800",
  },
  profileCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  profileName: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 14,
    fontWeight: "700",
  },
  profileEmail: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
    lineHeight: 16,
  },
  signOutButton: {
    alignItems: "center",
    borderRadius: radius.md,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  signOutButtonHovered: {
    backgroundColor: colors.primarySoft,
  },
  signOutIconWrap: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 10,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  signOutLabel: {
    color: colors.primary,
    fontFamily: typography.headingFamily,
    fontSize: 14,
    fontWeight: "700",
  },
});
