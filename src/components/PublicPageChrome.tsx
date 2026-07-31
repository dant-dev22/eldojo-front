import { Feather } from "@expo/vector-icons";
import { PropsWithChildren, useEffect, useState } from "react";
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

import { AppButton } from "@/components/AppButton";
import { AppModal } from "@/components/AppModal";
import { Screen } from "@/components/Screen";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";

type PublicChromeNavItem = {
  key: string;
  label: string;
  onPress: () => void;
};

type PublicChromeActionItem = {
  key: string;
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
};

interface PublicPageChromeProps extends PropsWithChildren {
  idPrefix: string;
  onBrandPress: () => void;
  navItems?: PublicChromeNavItem[];
  actionItems?: PublicChromeActionItem[];
  contentContainerStyle?: StyleProp<ViewStyle>;
  contentMaxWidth?: number;
}

export function PublicPageChrome({
  idPrefix,
  onBrandPress,
  navItems = [],
  actionItems = [],
  children,
  contentContainerStyle,
  contentMaxWidth,
}: PublicPageChromeProps) {
  const { contentMaxWidth: responsiveContentMaxWidth, isMobile, width } = useResponsiveLayout();
  const [isMobileMenuVisible, setIsMobileMenuVisible] = useState(false);
  const resolvedContentMaxWidth = contentMaxWidth ?? responsiveContentMaxWidth;

  useEffect(() => {
    if (!isMobile) {
      setIsMobileMenuVisible(false);
    }
  }, [isMobile]);

  return (
    <Screen
      scrollable
      contentStyle={styles.screenContent}
      nativeID={`${idPrefix}-screen`}
      testID={`${idPrefix}-screen`}
    >
      <View nativeID={`${idPrefix}-shell`} style={styles.shell} testID={`${idPrefix}-shell`}>
        <View
          nativeID={`${idPrefix}-navbar`}
          style={[
            styles.navbar,
            { paddingHorizontal: width >= 1280 ? 32 : spacing.lg },
          ]}
          testID={`${idPrefix}-navbar`}
        >
          <View
            nativeID={`${idPrefix}-navbar-inner`}
            style={[styles.navbarInner, { maxWidth: resolvedContentMaxWidth }]}
            testID={`${idPrefix}-navbar-inner`}
          >
            <Pressable
              accessibilityRole="button"
              nativeID={`${idPrefix}-brand-button`}
              onPress={onBrandPress}
              style={styles.brandButton}
              testID={`${idPrefix}-brand-button`}
            >
              <View nativeID={`${idPrefix}-brand-mark`} style={styles.brandMark} testID={`${idPrefix}-brand-mark`}>
                <Text nativeID={`${idPrefix}-brand-mark-label`} style={styles.brandMarkLabel} testID={`${idPrefix}-brand-mark-label`}>
                  EL
                </Text>
              </View>
              <View nativeID={`${idPrefix}-brand-copy`} style={styles.brandCopy} testID={`${idPrefix}-brand-copy`}>
                <Text nativeID={`${idPrefix}-brand-title`} style={styles.brandTitle} testID={`${idPrefix}-brand-title`}>
                  ElDojo
                </Text>
                <Text nativeID={`${idPrefix}-brand-subtitle`} style={styles.brandSubtitle} testID={`${idPrefix}-brand-subtitle`}>
                  Gestion simple para academias
                </Text>
              </View>
            </Pressable>

            {!isMobile ? (
              <>
                <View nativeID={`${idPrefix}-nav-items`} style={styles.navItems} testID={`${idPrefix}-nav-items`}>
                  {navItems.map((item) => (
                    <Pressable
                      key={item.key}
                      accessibilityRole="button"
                      nativeID={`${idPrefix}-nav-item-${item.key}`}
                      onPress={item.onPress}
                      style={({ pressed }) => [styles.navItem, pressed ? styles.navItemPressed : null]}
                      testID={`${idPrefix}-nav-item-${item.key}`}
                    >
                      <Text nativeID={`${idPrefix}-nav-item-${item.key}-label`} style={styles.navItemLabel} testID={`${idPrefix}-nav-item-${item.key}-label`}>
                        {item.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <View nativeID={`${idPrefix}-actions`} style={styles.actions} testID={`${idPrefix}-actions`}>
                  {actionItems.map((item) => (
                    <AppButton
                      key={item.key}
                      label={item.label}
                      nativeID={`${idPrefix}-action-${item.key}`}
                      onPress={item.onPress}
                      testID={`${idPrefix}-action-${item.key}`}
                      variant={item.variant ?? "secondary"}
                    />
                  ))}
                </View>
              </>
            ) : (
              <Pressable
                accessibilityLabel="Abrir menu"
                accessibilityRole="button"
                nativeID={`${idPrefix}-menu-trigger`}
                onPress={() => setIsMobileMenuVisible(true)}
                style={({ pressed }) => [styles.menuTrigger, pressed ? styles.navItemPressed : null]}
                testID={`${idPrefix}-menu-trigger`}
              >
                <Feather color={colors.text} name="menu" size={18} />
              </Pressable>
            )}
          </View>
        </View>

        <View
          nativeID={`${idPrefix}-content-wrap`}
          style={[styles.contentWrap, { maxWidth: resolvedContentMaxWidth }, contentContainerStyle]}
          testID={`${idPrefix}-content-wrap`}
        >
          {children}
        </View>

        <View nativeID={`${idPrefix}-footer`} style={styles.footerShell} testID={`${idPrefix}-footer`}>
          <View nativeID={`${idPrefix}-footer-inner`} style={[styles.footerInner, { maxWidth: resolvedContentMaxWidth }]} testID={`${idPrefix}-footer-inner`}>
            <View nativeID={`${idPrefix}-footer-top`} style={[styles.footerTop, !isMobile ? styles.footerTopDesktop : null]} testID={`${idPrefix}-footer-top`}>
              <View nativeID={`${idPrefix}-footer-brand`} style={styles.footerBrandBlock} testID={`${idPrefix}-footer-brand`}>
                <Text nativeID={`${idPrefix}-footer-brand-title`} style={styles.footerBrandTitle} testID={`${idPrefix}-footer-brand-title`}>
                  ElDojo
                </Text>
                <Text nativeID={`${idPrefix}-footer-credit`} style={styles.footerCredit} testID={`${idPrefix}-footer-credit`}>
                  Diseñado por rais.com
                </Text>
              </View>

              <View nativeID={`${idPrefix}-footer-content`} style={[styles.footerContent, !isMobile ? styles.footerContentDesktop : null]} testID={`${idPrefix}-footer-content`}>
                <View nativeID={`${idPrefix}-footer-contact`} style={styles.footerBlock} testID={`${idPrefix}-footer-contact`}>
                  <Text nativeID={`${idPrefix}-footer-contact-title`} style={styles.footerTitle} testID={`${idPrefix}-footer-contact-title`}>
                    Contacto
                  </Text>
                  <Text nativeID={`${idPrefix}-footer-contact-email`} style={styles.footerText} testID={`${idPrefix}-footer-contact-email`}>
                    hola@eldojo.tech
                  </Text>
                  <Text nativeID={`${idPrefix}-footer-contact-phone`} style={styles.footerText} testID={`${idPrefix}-footer-contact-phone`}>
                    +52 81 0000 0000
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <AppModal
          nativeID={`${idPrefix}-mobile-menu`}
          visible={isMobileMenuVisible}
          title="Menu"
          description="Navega entre las secciones publicas."
          onClose={() => setIsMobileMenuVisible(false)}
          testID={`${idPrefix}-mobile-menu`}
        >
          <View nativeID={`${idPrefix}-mobile-menu-content`} style={styles.mobileMenuContent} testID={`${idPrefix}-mobile-menu-content`}>
            {navItems.map((item) => (
              <AppButton
                key={item.key}
                label={item.label}
                nativeID={`${idPrefix}-mobile-nav-item-${item.key}`}
                onPress={() => {
                  setIsMobileMenuVisible(false);
                  item.onPress();
                }}
                testID={`${idPrefix}-mobile-nav-item-${item.key}`}
                variant="secondary"
              />
            ))}
            {actionItems.map((item) => (
              <AppButton
                key={item.key}
                label={item.label}
                nativeID={`${idPrefix}-mobile-action-${item.key}`}
                onPress={() => {
                  setIsMobileMenuVisible(false);
                  item.onPress();
                }}
                testID={`${idPrefix}-mobile-action-${item.key}`}
                variant={item.variant ?? "secondary"}
              />
            ))}
          </View>
        </AppModal>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    width: "100%",
  },
  shell: {
    width: "100%",
  },
  navbar: {
    width: "100%",
  },
  navbarInner: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    padding: spacing.md,
    width: "100%",
  },
  brandButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    minWidth: 0,
  },
  brandMark: {
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  brandMarkLabel: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 16,
    fontWeight: "800",
  },
  brandCopy: {
    gap: 2,
  },
  brandTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 18,
    fontWeight: "800",
  },
  brandSubtitle: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
  },
  navItems: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "center",
  },
  navItem: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  navItemPressed: {
    opacity: 0.88,
  },
  navItemLabel: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 13,
    fontWeight: "700",
  },
  actions: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  menuTrigger: {
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  contentWrap: {
    alignSelf: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    width: "100%",
  },
  footerShell: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing["2xl"],
    paddingTop: spacing.xl,
    width: "100%",
  },
  footerInner: {
    alignSelf: "center",
    width: "100%",
  },
  footerTop: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.lg,
  },
  footerTopDesktop: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerBrandBlock: {
    gap: spacing.xs,
  },
  footerBrandTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 18,
    fontWeight: "800",
  },
  footerCredit: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 18,
  },
  footerContent: {
    gap: spacing.lg,
  },
  footerContentDesktop: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  footerBlock: {
    gap: spacing.xs,
  },
  footerTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  footerText: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 20,
  },
  mobileMenuContent: {
    gap: spacing.sm,
  },
});
