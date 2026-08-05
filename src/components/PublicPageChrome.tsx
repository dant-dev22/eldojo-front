import { Feather } from "@expo/vector-icons";
import { PropsWithChildren, useEffect, useMemo, useState } from "react";
import { Platform, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

import { AdminUserMenu } from "@/components/AdminUserMenu";
import { AppButton } from "@/components/AppButton";
import { AppModal } from "@/components/AppModal";
import { Screen } from "@/components/Screen";
import {
  agedWood,
  colors,
  goldenYellow,
  indigoBlueSoft,
  judogiRed,
  judogiRedSoft,
  radius,
  spacing,
  tatamiGreenSoft,
  typography,
} from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { navigateToPublicPageKey } from "@/navigation/publicRoutes";

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
  showAuthControls?: boolean;
  screenScrollable?: boolean;
  screenContentStyle?: StyleProp<ViewStyle>;
  onGoSignIn?: () => void;
  onGoCreateAccount?: () => void;
  onGoDashboard?: () => void;
  onGoSettings?: () => void;
}

function getWebClassNameProps(className?: string) {
  return Platform.OS === "web" && className ? ({ className } as { className: string }) : {};
}

export function PublicPageChrome({
  idPrefix,
  onBrandPress,
  navItems = [],
  actionItems = [],
  children,
  contentContainerStyle,
  contentMaxWidth,
  showAuthControls = true,
  screenScrollable = true,
  screenContentStyle,
  onGoSignIn,
  onGoCreateAccount,
  onGoDashboard,
  onGoSettings,
}: PublicPageChromeProps) {
  const { contentMaxWidth: responsiveContentMaxWidth, isMobile, width } = useResponsiveLayout();
  const { status, user, signOut } = useAuth();
  const [isMobileMenuVisible, setIsMobileMenuVisible] = useState(false);
  const resolvedContentMaxWidth = contentMaxWidth ?? responsiveContentMaxWidth;
  const isAuthenticated = status === "authenticated" && Boolean(user);

  const adminActions = useMemo(() => {
    return [
      {
        label: "Dashboard",
        onPress: () => {
          if (onGoDashboard) {
            onGoDashboard();
            return;
          }
          navigateToPublicPageKey("home");
        },
      },
      ...(onGoSettings
        ? [
            {
              label: "Configuración",
              onPress: onGoSettings,
            },
          ]
        : []),
      {
        label: "Cerrar sesión",
        onPress: () => {
          void signOut();
        },
        tone: "danger" as const,
      },
    ];
  }, [onGoDashboard, onGoSettings, signOut]);

  useEffect(() => {
    if (!isMobile) {
      setIsMobileMenuVisible(false);
    }
  }, [isMobile]);

  function handleSignInPress() {
    if (onGoSignIn) {
      onGoSignIn();
      return;
    }
    navigateToPublicPageKey("signIn");
  }

  function handleCreateAccountPress() {
    if (onGoCreateAccount) {
      onGoCreateAccount();
      return;
    }
    navigateToPublicPageKey("createAccount");
  }

  return (
    <Screen
      scrollable={screenScrollable}
      contentStyle={[styles.screenContent, screenContentStyle]}
      nativeID={`${idPrefix}-screen`}
      testID={`${idPrefix}-screen`}
    >
      <View nativeID={`${idPrefix}-shell`} style={styles.shell} testID={`${idPrefix}-shell`}>
        {!isMobile ? (
          <View
            nativeID={`${idPrefix}-navbar`}
            style={[
              styles.navbar,
              { paddingHorizontal: width >= 1280 ? 32 : spacing.lg },
            ]}
            testID={`${idPrefix}-navbar`}
            {...getWebClassNameProps("public-chrome-navbar eldojo-public-desktop-hover-target")}
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
                  <View nativeID={`${idPrefix}-brand-mark-inner`} style={styles.brandMarkInner} testID={`${idPrefix}-brand-mark-inner`}>
                    <Text nativeID={`${idPrefix}-brand-mark-label`} style={styles.brandMarkLabel} testID={`${idPrefix}-brand-mark-label`}>
                      弐
                    </Text>
                  </View>
                </View>
                <View nativeID={`${idPrefix}-brand-copy`} style={styles.brandCopy} testID={`${idPrefix}-brand-copy`}>
                  <Text nativeID={`${idPrefix}-brand-title`} style={styles.brandTitle} testID={`${idPrefix}-brand-title`}>
                    ElDojo
                  </Text>
                  <Text nativeID={`${idPrefix}-brand-subtitle`} style={styles.brandSubtitle} testID={`${idPrefix}-brand-subtitle`}>
                    Sencillez · Orden · Dojo
                  </Text>
                </View>
              </Pressable>

              <View nativeID={`${idPrefix}-nav-items`} style={styles.navItems} testID={`${idPrefix}-nav-items`}>
                {navItems.map((item) => (
                  <Pressable
                    key={item.key}
                    accessibilityRole="button"
                    nativeID={`${idPrefix}-nav-item-${item.key}`}
                    onPress={item.onPress}
                    style={(state) => {
                      const hovered = (state as unknown as { hovered?: boolean }).hovered;
                      return [
                        styles.navItem,
                        hovered ? styles.navItemHovered : null,
                        state.pressed ? styles.navItemPressed : null,
                      ];
                    }}
                    testID={`${idPrefix}-nav-item-${item.key}`}
                  >
                    {(state) => {
                      const hovered = (state as unknown as { hovered?: boolean }).hovered;
                      return (
                        <Text
                          nativeID={`${idPrefix}-nav-item-${item.key}-label`}
                          style={[styles.navItemLabel, hovered ? styles.navItemLabelActive : null]}
                          testID={`${idPrefix}-nav-item-${item.key}-label`}
                        >
                          {item.label}
                        </Text>
                      );
                    }}
                  </Pressable>
                ))}
              </View>

              {showAuthControls ? (
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

                  {actionItems.length === 0 ? (
                    isAuthenticated ? (
                      <AdminUserMenu actions={adminActions} user={user} />
                    ) : (
                      <View style={styles.publicAuthActionsRow}>
                        <Pressable
                          accessibilityRole="link"
                          nativeID={`${idPrefix}-auth-signin`}
                          onPress={handleSignInPress}
                          style={(state) => {
                            const hovered = (state as unknown as { hovered?: boolean }).hovered;
                            return [
                              styles.authButton,
                              styles.authButtonGhost,
                              hovered ? styles.authButtonGhostHover : null,
                              state.pressed ? styles.authButtonPressed : null,
                            ];
                          }}
                          testID={`${idPrefix}-auth-signin`}
                        >
                          {(state) => {
                            const hovered = (state as unknown as { hovered?: boolean }).hovered;
                            return (
                              <Text
                                nativeID={`${idPrefix}-auth-signin-label`}
                                style={[styles.authButtonLabel, styles.authButtonLabelGhost, hovered ? styles.authButtonLabelGhostHover : null]}
                                testID={`${idPrefix}-auth-signin-label`}
                              >
                                Iniciar sesión
                              </Text>
                            );
                          }}
                        </Pressable>
                        <Pressable
                          accessibilityRole="link"
                          nativeID={`${idPrefix}-auth-create`}
                          onPress={handleCreateAccountPress}
                          style={(state) => {
                            const hovered = (state as unknown as { hovered?: boolean }).hovered;
                            return [
                              styles.authButton,
                              styles.authButtonPrimary,
                              hovered ? styles.authButtonPrimaryHover : null,
                              state.pressed ? styles.authButtonPressed : null,
                            ];
                          }}
                          testID={`${idPrefix}-auth-create`}
                        >
                          {(state) => {
                            const hovered = (state as unknown as { hovered?: boolean }).hovered;
                            return (
                              <>
                                <Feather
                                  color="#FFFFFF"
                                  name="user-plus"
                                  size={15}
                                  style={styles.authPrimaryIcon}
                                />
                                <Text
                                  nativeID={`${idPrefix}-auth-create-label`}
                                  style={[styles.authButtonLabel, styles.authButtonLabelPrimary, hovered ? styles.authButtonLabelPrimaryHover : null]}
                                  testID={`${idPrefix}-auth-create-label`}
                                >
                                  Crear cuenta
                                </Text>
                              </>
                            );
                          }}
                        </Pressable>
                      </View>
                    )
                  ) : null}
                </View>
              ) : null}
            </View>
          </View>
        ) : (
          <View
            nativeID={`${idPrefix}-mobile-floating-bar`}
            style={styles.mobileFloatingBar}
            testID={`${idPrefix}-mobile-floating-bar`}
          >
            {showAuthControls && isAuthenticated ? (
              <View style={styles.mobileMiniAvatar} nativeID={`${idPrefix}-mobile-mini-avatar`} testID={`${idPrefix}-mobile-mini-avatar`}>
                <Text style={styles.mobileMiniAvatarInitial}>
                  {(user?.first_name?.charAt(0) ?? user?.email?.charAt(0) ?? "A").toUpperCase()}
                </Text>
              </View>
            ) : null}
            <Pressable
              accessibilityLabel="Abrir menú"
              accessibilityRole="button"
              nativeID={`${idPrefix}-menu-trigger`}
              onPress={() => setIsMobileMenuVisible(true)}
              style={({ pressed }) => [styles.menuTrigger, pressed ? styles.menuTriggerPressed : null]}
              testID={`${idPrefix}-menu-trigger`}
            >
              <Feather color={colors.text} name="menu" size={20} />
            </Pressable>
          </View>
        )}

        <View
          nativeID={`${idPrefix}-content-wrap`}
          style={[styles.contentWrap, { maxWidth: resolvedContentMaxWidth }, contentContainerStyle]}
          testID={`${idPrefix}-content-wrap`}
        >
          {children}
        </View>

        <View nativeID={`${idPrefix}-footer`} style={styles.footerShell} testID={`${idPrefix}-footer`}>
          <View nativeID={`${idPrefix}-footer-divider-top`} style={styles.footerDividerTop} testID={`${idPrefix}-footer-divider-top`} />
          <View nativeID={`${idPrefix}-footer-inner`} style={[styles.footerInner, { maxWidth: resolvedContentMaxWidth }]} testID={`${idPrefix}-footer-inner`}>
            <View nativeID={`${idPrefix}-footer-grid`} style={[styles.footerGrid, !isMobile ? styles.footerGridDesktop : null]} testID={`${idPrefix}-footer-grid`}>
              <View nativeID={`${idPrefix}-footer-brand-block`} style={styles.footerBrandBlock} testID={`${idPrefix}-footer-brand-block`}>
                <View nativeID={`${idPrefix}-footer-brand-row`} style={styles.footerBrandRow} testID={`${idPrefix}-footer-brand-row`}>
                  <View nativeID={`${idPrefix}-footer-brand-mark`} style={styles.footerBrandMark} testID={`${idPrefix}-footer-brand-mark`}>
                    <Text nativeID={`${idPrefix}-footer-brand-mark-label`} style={styles.footerBrandMarkLabel} testID={`${idPrefix}-footer-brand-mark-label`}>
                      弐
                    </Text>
                  </View>
                  <View>
                    <Text nativeID={`${idPrefix}-footer-brand-title`} style={styles.footerBrandTitle} testID={`${idPrefix}-footer-brand-title`}>
                      ElDojo
                    </Text>
                    <Text nativeID={`${idPrefix}-footer-tagline`} style={styles.footerTagline} testID={`${idPrefix}-footer-tagline`}>
                      Sencillez · Orden · Dojo
                    </Text>
                  </View>
                </View>
                <Text nativeID={`${idPrefix}-footer-brand-description`} style={styles.footerBrandDescription} testID={`${idPrefix}-footer-brand-description`}>
                  Software de administración hecho para academias de artes marciales que prefieren la simplicidad antes que el ruido visual.
                </Text>
                <View nativeID={`${idPrefix}-footer-values-row`} style={styles.footerValuesRow} testID={`${idPrefix}-footer-values-row`}>
                  <View style={[styles.footerValuePill, { backgroundColor: judogiRedSoft }]}>
                    <View style={styles.footerValueDotRed} />
                    <Text style={styles.footerValueLabel}>Disciplina</Text>
                  </View>
                  <View style={[styles.footerValuePill, { backgroundColor: tatamiGreenSoft }]}>
                    <View style={styles.footerValueDotGreen} />
                    <Text style={styles.footerValueLabel}>Respeto</Text>
                  </View>
                  <View style={[styles.footerValuePill, { backgroundColor: indigoBlueSoft }]}>
                    <View style={styles.footerValueDotIndigo} />
                    <Text style={styles.footerValueLabel}>Honor</Text>
                  </View>
                </View>
              </View>

              <View style={styles.footerColumnsWrap}>
                <View nativeID={`${idPrefix}-footer-nav-block`} style={styles.footerBlock} testID={`${idPrefix}-footer-nav-block`}>
                  <Text nativeID={`${idPrefix}-footer-nav-title`} style={styles.footerBlockTitle} testID={`${idPrefix}-footer-nav-title`}>
                    Navegar
                  </Text>
                  {[
                    { key: "home", label: "Inicio" },
                    { key: "about", label: "Acerca de ElDojo" },
                    { key: "events", label: "Eventos" },
                    { key: "stores", label: "Tiendas y aliados" },
                  ].map((item) => (
                    <Pressable
                      key={item.key}
                      nativeID={`${idPrefix}-footer-nav-item-${item.key}`}
                      onPress={() => navigateToPublicPageKey(item.key as Parameters<typeof navigateToPublicPageKey>[0])}
                      style={({ pressed }) => [styles.footerLink, pressed ? styles.footerLinkPressed : null]}
                      testID={`${idPrefix}-footer-nav-item-${item.key}`}
                    >
                      <Feather color={agedWood} name="arrow-right" size={12} style={styles.footerLinkArrow} />
                      <Text style={styles.footerLinkLabel}>{item.label}</Text>
                    </Pressable>
                  ))}
                </View>

                <View nativeID={`${idPrefix}-footer-contact-block`} style={styles.footerBlock} testID={`${idPrefix}-footer-contact-block`}>
                  <Text nativeID={`${idPrefix}-footer-contact-title`} style={styles.footerBlockTitle} testID={`${idPrefix}-footer-contact-title`}>
                    Contacto
                  </Text>
                  <View style={styles.footerContactRow}>
                    <View style={styles.footerContactIconWrap}>
                      <Feather color={judogiRed} name="mail" size={13} />
                    </View>
                    <Text style={styles.footerContactText}>hola@eldojo.tech</Text>
                  </View>
                  <View style={styles.footerContactRow}>
                    <View style={styles.footerContactIconWrap}>
                      <Feather color={judogiRed} name="phone" size={13} />
                    </View>
                    <Text style={styles.footerContactText}>+52 81 0000 0000</Text>
                  </View>
                  <View style={styles.footerContactRow}>
                    <View style={styles.footerContactIconWrap}>
                      <Feather color={judogiRed} name="map-pin" size={13} />
                    </View>
                    <Text style={styles.footerContactText}>Monterrey, N.L. · México</Text>
                  </View>
                </View>
              </View>
            </View>

            <View nativeID={`${idPrefix}-footer-divider`} style={styles.footerDivider} testID={`${idPrefix}-footer-divider`} />

            <View nativeID={`${idPrefix}-footer-bottom`} style={[styles.footerBottom, !isMobile ? styles.footerBottomDesktop : null]} testID={`${idPrefix}-footer-bottom`}>
              <Text nativeID={`${idPrefix}-footer-copyright`} style={styles.footerCopyright} testID={`${idPrefix}-footer-copyright`}>
                © {new Date().getFullYear()} ElDojo. Todos los derechos reservados.
              </Text>
              <View style={styles.footerLegalRow}>
                <Pressable style={({ pressed }) => [styles.footerLegalLink, pressed ? { opacity: 0.7 } : null]}>
                  <Text style={styles.footerLegalLabel}>Términos</Text>
                </Pressable>
                <View style={styles.footerLegalSeparator} />
                <Pressable style={({ pressed }) => [styles.footerLegalLink, pressed ? { opacity: 0.7 } : null]}>
                  <Text style={styles.footerLegalLabel}>Privacidad</Text>
                </Pressable>
                <View style={styles.footerLegalSeparator} />
                <View style={styles.footerMadeIn}>
                  <Text style={styles.footerMadeInLabel}>
                    Hecho con
                  </Text>
                  <Feather color={goldenYellow} name="award" size={12} style={styles.footerMadeInIcon} />
                  <Text style={styles.footerMadeInLabel}>en México</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <AppModal
          nativeID={`${idPrefix}-mobile-menu`}
          visible={isMobileMenuVisible}
          title="Menú"
          description="Navega entre las secciones y tu cuenta."
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
            {showAuthControls && actionItems.length === 0 ? (
              isAuthenticated ? (
                <>
                  <View style={styles.mobileMenuProfileCard}>
                    <View style={styles.mobileMenuAvatar}>
                      <Text style={styles.mobileMenuAvatarInitial}>
                        {(user?.first_name?.charAt(0) ?? user?.email?.charAt(0) ?? "A").toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.mobileMenuProfileCopy}>
                      <Text style={styles.mobileMenuProfileName}>
                        {user?.first_name
                          ? `${user.first_name}${user.last_name ? ` ${user.last_name}` : ""}`
                          : user?.email ?? "Administrador"}
                      </Text>
                      <Text style={styles.mobileMenuProfileEmail}>
                        {user?.email ?? "Sesión iniciada"}
                      </Text>
                    </View>
                  </View>
                  {adminActions.map((action, idx) => (
                    <AppButton
                      key={`mobile-admin-action-${idx}`}
                      label={action.label}
                      onPress={() => {
                        setIsMobileMenuVisible(false);
                        action.onPress();
                      }}
                      variant={action.tone === "danger" ? "danger" : "secondary"}
                    />
                  ))}
                </>
              ) : (
                <>
                  <AppButton
                    label="Crear cuenta"
                    nativeID={`${idPrefix}-mobile-auth-create`}
                    onPress={() => {
                      setIsMobileMenuVisible(false);
                      handleCreateAccountPress();
                    }}
                    testID={`${idPrefix}-mobile-auth-create`}
                    variant="primary"
                  />
                  <AppButton
                    label="Iniciar sesión"
                    nativeID={`${idPrefix}-mobile-auth-signin`}
                    onPress={() => {
                      setIsMobileMenuVisible(false);
                      handleSignInPress();
                    }}
                    testID={`${idPrefix}-mobile-auth-signin`}
                    variant="secondary"
                  />
                </>
              )
            ) : null}
          </View>
        </AppModal>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    flex: 1,
    width: "100%",
  },
  shell: {
    flex: 1,
    width: "100%",
  },
  navbar: {
    position: (Platform.OS === "web" ? "sticky" : "relative") as unknown as ViewStyle["position"],
    top: 0,
    width: "100%",
    zIndex: 50,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(141, 110, 99, 0.14)",
  },
  navbarInner: {
    alignItems: "center",
    alignSelf: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
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
    justifyContent: "center",
    height: 44,
    width: 44,
    borderRadius: radius.md,
    backgroundColor: judogiRedSoft,
    borderWidth: 1,
    borderColor: "rgba(198, 40, 40, 0.28)",
  },
  brandMarkInner: {
    alignItems: "center",
    justifyContent: "center",
  },
  brandMarkLabel: {
    color: judogiRed,
    fontFamily: typography.headingFamily,
    fontSize: 20,
    fontWeight: "800",
  },
  brandCopy: {
    gap: 1,
  },
  brandTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  brandSubtitle: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  navItems: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    justifyContent: "center",
  },
  navItem: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  navItemHovered: {
    backgroundColor: colors.hover,
  },
  navItemPressed: {
    opacity: 0.88,
    backgroundColor: colors.hoverStrong,
  },
  navItemLabel: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  navItemLabelActive: {
    color: colors.text,
  },
  actions: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  publicAuthActionsRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  authButton: {
    alignItems: "center",
    borderRadius: radius.pill,
    flexDirection: "row",
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: spacing.md,
  },
  authButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  authButtonGhost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "transparent",
  },
  authButtonGhostHover: {
    backgroundColor: colors.hover,
    borderColor: "rgba(141, 110, 99, 0.24)",
  },
  authButtonPrimary: {
    backgroundColor: judogiRed,
    borderWidth: 1,
    borderColor: judogiRed,
    shadowColor: judogiRed,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
  },
  authButtonPrimaryHover: {
    backgroundColor: colors.primaryHover,
    borderColor: colors.primaryHover,
    shadowOpacity: 0.26,
  },
  authButtonLabel: {
    fontFamily: typography.headingFamily,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  authButtonLabelGhost: {
    color: colors.text,
  },
  authButtonLabelGhostHover: {
    color: agedWood,
  },
  authButtonLabelPrimary: {
    color: "#FFFFFF",
  },
  authButtonLabelPrimaryHover: {
    color: "#FFFFFF",
  },
  authPrimaryIcon: {
    marginRight: 8,
  },
  mobileRightSlot: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  mobileMiniAvatar: {
    alignItems: "center",
    justifyContent: "center",
    height: 38,
    width: 38,
    borderRadius: radius.pill,
    backgroundColor: judogiRedSoft,
    borderWidth: 1,
    borderColor: "rgba(198, 40, 40, 0.22)",
  },
  mobileMiniAvatarInitial: {
    color: judogiRed,
    fontFamily: typography.headingFamily,
    fontSize: 14,
    fontWeight: "800",
  },
  menuTrigger: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    shadowColor: "#1A1A1A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    width: 42,
  },
  menuTriggerPressed: {
    opacity: 0.82,
    backgroundColor: colors.hover,
  },
  mobileFloatingBar: {
    alignItems: "center",
    alignSelf: "flex-end",
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderBottomColor: colors.border,
    borderBottomLeftRadius: 28,
    borderColor: colors.border,
    borderLeftColor: colors.border,
    borderLeftWidth: 1,
    borderWidth: 0,
    borderBottomWidth: 1,
    elevation: 6,
    flexDirection: "row",
    gap: 8,
    paddingBottom: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    paddingTop: 10,
    position: (Platform.OS === "web" ? "sticky" : "relative") as unknown as ViewStyle["position"],
    right: 0,
    shadowColor: "#1A1A1A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    top: 0,
    zIndex: 60,
  },
  contentWrap: {
    alignSelf: "center",
    flex: 1,
    minHeight: 0,
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
  footerDividerTop: {
    alignSelf: "center",
    width: 64,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: judogiRed,
    marginBottom: spacing.xl,
  },
  footerInner: {
    alignSelf: "center",
    width: "100%",
  },
  footerGrid: {
    gap: spacing.xl,
  },
  footerGridDesktop: {
    flexDirection: "row",
    gap: spacing["2xl"],
    justifyContent: "space-between",
  },
  footerBrandBlock: {
    flex: 1,
    gap: spacing.md,
  },
  footerBrandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  footerBrandMark: {
    alignItems: "center",
    justifyContent: "center",
    height: 40,
    width: 40,
    borderRadius: radius.md,
    backgroundColor: judogiRed,
  },
  footerBrandMarkLabel: {
    color: "#FFFFFF",
    fontFamily: typography.headingFamily,
    fontSize: 18,
    fontWeight: "800",
  },
  footerBrandTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 17,
    fontWeight: "800",
  },
  footerTagline: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
    letterSpacing: 0.3,
  },
  footerBrandDescription: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 22,
    maxWidth: 360,
  },
  footerValuesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  footerValuePill: {
    alignItems: "center",
    borderRadius: radius.pill,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  footerValueDotRed: {
    width: 6,
    height: 6,
    borderRadius: 6,
    backgroundColor: judogiRed,
  },
  footerValueDotGreen: {
    width: 6,
    height: 6,
    borderRadius: 6,
    backgroundColor: "#558B2F",
  },
  footerValueDotIndigo: {
    width: 6,
    height: 6,
    borderRadius: 6,
    backgroundColor: "#1A237E",
  },
  footerValueLabel: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  footerColumnsWrap: {
    flexDirection: "row",
    gap: spacing["2xl"],
    flexWrap: "wrap",
    flex: 1,
    justifyContent: "flex-end",
  },
  footerBlock: {
    gap: spacing.sm,
    minWidth: 160,
  },
  footerBlockTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
  },
  footerLink: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    paddingVertical: 4,
  },
  footerLinkPressed: {
    opacity: 0.72,
  },
  footerLinkArrow: {
    opacity: 0.9,
  },
  footerLinkLabel: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
  },
  footerContactRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    paddingVertical: 3,
  },
  footerContactIconWrap: {
    alignItems: "center",
    justifyContent: "center",
    height: 24,
    width: 24,
    borderRadius: radius.pill,
    backgroundColor: judogiRedSoft,
  },
  footerContactText: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
  },
  footerDivider: {
    backgroundColor: "rgba(141, 110, 99, 0.16)",
    height: 1,
    marginVertical: spacing.lg,
    width: "100%",
  },
  footerBottom: {
    gap: spacing.md,
  },
  footerBottomDesktop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerCopyright: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
  },
  footerLegalRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  footerLegalLink: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  footerLegalLabel: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
  },
  footerLegalSeparator: {
    backgroundColor: "rgba(141, 110, 99, 0.22)",
    height: 12,
    width: 1,
  },
  footerMadeIn: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    marginLeft: spacing.xs,
  },
  footerMadeInLabel: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
  },
  footerMadeInIcon: {
    marginHorizontal: 2,
  },
  mobileMenuContent: {
    gap: spacing.sm,
  },
  mobileMenuProfileCard: {
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.xs,
    padding: spacing.sm,
  },
  mobileMenuAvatar: {
    alignItems: "center",
    backgroundColor: judogiRedSoft,
    borderRadius: radius.pill,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  mobileMenuAvatarInitial: {
    color: judogiRed,
    fontFamily: typography.headingFamily,
    fontSize: 15,
    fontWeight: "800",
  },
  mobileMenuProfileCopy: {
    flex: 1,
    gap: 2,
  },
  mobileMenuProfileName: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 14,
    fontWeight: "700",
  },
  mobileMenuProfileEmail: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
  },
});
