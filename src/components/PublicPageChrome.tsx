import { Feather } from "@expo/vector-icons";
import { PropsWithChildren, useCallback, useEffect, useMemo, useState } from "react";
import { Linking, Platform, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

import { AdminUserMenu } from "@/components/AdminUserMenu";
import { AppButton } from "@/components/AppButton";
import { AppModal } from "@/components/AppModal";
import { LogoSvg } from "@/components/LogoSvg";
import { Screen } from "@/components/Screen";
import { SessionIndicator } from "@/components/SessionIndicator";
import {
  EDITORIAL_BG,
  EDITORIAL_BORDER,
  EDITORIAL_BORDER_SOFT,
  EDITORIAL_FG,
  EDITORIAL_FG_MUTED,
  EDITORIAL_FG_SUBTLE,
  EDITORIAL_SURFACE,
  EDITORIAL_SURFACE_HOVER,
  colors,
  radius,
  spacing,
  typography,
} from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { navigateToPublicPageKey } from "@/navigation/publicRoutes";
import type { User } from "@/types/api";
import { buildAppUrl } from "@/utils/domains";
import { readSessionHint, type SessionHint } from "@/utils/sessionHint";

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
  showFooter?: boolean;
  showFooterTopDivider?: boolean;
  screenScrollable?: boolean;
  screenContentStyle?: StyleProp<ViewStyle>;
  onGoSignIn?: () => void;
  onGoCreateAccount?: () => void;
  onGoDashboard?: () => void;
}

function getWebClassNameProps(className?: string) {
  return Platform.OS === "web" && className ? ({ className } as { className: string }) : {};
}

function joinWebClassNames(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(" ");
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
  showFooter = true,
  showFooterTopDivider = true,
  screenScrollable = true,
  screenContentStyle,
  onGoSignIn,
  onGoCreateAccount,
  onGoDashboard,
}: PublicPageChromeProps) {
  const { contentMaxWidth: responsiveContentMaxWidth, isMobile, width } = useResponsiveLayout();
  const { status, user, signOut } = useAuth();
  const [isMobileMenuVisible, setIsMobileMenuVisible] = useState(false);
  const [hintSnapshot, setHintSnapshot] = useState<SessionHint | undefined>(() =>
    Platform.OS === "web" ? readSessionHint() : undefined
  );
  const resolvedContentMaxWidth = contentMaxWidth ?? responsiveContentMaxWidth;
  const locallyAuthenticated = status === "authenticated" && Boolean(user);
  const outerPaddingHorizontal = width >= 1280 ? 32 : spacing.lg;

  const hintShowsAuth = useMemo(() => {
    if (locallyAuthenticated) return true;
    if (!hintSnapshot) return false;
    return Boolean(hintSnapshot.userId && Number(hintSnapshot.userId) > 0);
  }, [hintSnapshot, locallyAuthenticated]);

  const displayUser = useMemo<User | null>(() => {
    if (user) return user;
    if (!hintSnapshot?.userId) return null;
    return {
      id: Number(hintSnapshot.userId),
      first_name: hintSnapshot.userFullName?.split(" ")[0] ?? null,
      last_name:
        hintSnapshot.userFullName && hintSnapshot.userFullName.includes(" ")
          ? (hintSnapshot.userFullName.split(" ").slice(1).join(" ") as string)
          : null,
      email: hintSnapshot.userEmail ?? "",
      role: "org_admin",
      is_active: true,
      first_time: false,
      email_verified_at: hintSnapshot.updatedAt ?? null,
      last_login_at: hintSnapshot.updatedAt,
      created_at: hintSnapshot.updatedAt,
      updated_at: hintSnapshot.updatedAt,
      admin_assignments: [],
    } satisfies User;
  }, [user, hintSnapshot]);

  const handleGoDashboard = useCallback(() => {
    if (onGoDashboard) {
      onGoDashboard();
      return;
    }
    const destination = buildAppUrl("admin");
    if (Platform.OS === "web") {
      window.location.assign(destination);
    } else {
      void Linking.openURL(destination);
    }
  }, [onGoDashboard]);

  useEffect(() => {
    if (!showAuthControls) return;
    if (Platform.OS !== "web") return;
    const refresh = () => setHintSnapshot(readSessionHint());
    refresh();
    const interval = setInterval(refresh, 2500);
    const storageListener = () => refresh();
    window.addEventListener("storage", storageListener);
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", storageListener);
    };
  }, [showAuthControls]);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const { pathname, search, origin } = window.location;
    if (pathname !== "/") return;

    const effectiveUserId = displayUser?.id ?? (hintSnapshot?.userId ? Number(hintSnapshot.userId) : null);
    const expected = hintShowsAuth && effectiveUserId && effectiveUserId > 0 ? String(effectiveUserId) : null;

    const params = new URLSearchParams(search);
    const current = params.get("u");

    if (current === expected) return;

    if (expected) {
      params.set("u", expected);
    } else {
      params.delete("u");
    }
    const nextQuery = params.toString();
    const nextUrl = nextQuery
      ? `${pathname}?${nextQuery}${window.location.hash}`
      : `${pathname}${window.location.hash}`;
    window.history.replaceState(window.history.state, "", nextUrl);
  }, [hintShowsAuth, displayUser, hintSnapshot]);

  const adminActions = useMemo(() => {
    return [
      {
        label: "Ir al panel",
        onPress: handleGoDashboard,
      },
      {
        label: "Cerrar sesión",
        onPress: () => {
          void signOut(true);
        },
        tone: "danger" as const,
      },
    ];
  }, [handleGoDashboard, signOut]);

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
      contentStyle={[styles.screenContent, screenScrollable ? styles.screenContentStatic : null, screenContentStyle]}
      nativeID={`${idPrefix}-screen`}
      testID={`${idPrefix}-screen`}
    >
      <View
        nativeID={`${idPrefix}-shell`}
        style={[styles.shell, screenScrollable ? styles.shellStatic : null]}
        testID={`${idPrefix}-shell`}
      >
        {!isMobile ? (
          <View
            nativeID={`${idPrefix}-navbar`}
            style={[
              styles.navbar,
              { paddingHorizontal: outerPaddingHorizontal },
            ]}
            testID={`${idPrefix}-navbar`}
            {...getWebClassNameProps(
              joinWebClassNames(
                "public-chrome-navbar",
                "eldojo-public-desktop-hover-target"
              )
            )}
          >
            <View
              nativeID={`${idPrefix}-navbar-inner`}
              style={[styles.navbarInner, { maxWidth: resolvedContentMaxWidth }]}
              testID={`${idPrefix}-navbar-inner`}
              {...getWebClassNameProps("public-chrome-navbar-inner")}
            >
              <View style={styles.navbarLeftGroup}>
                <Pressable
                  accessibilityRole="button"
                  nativeID={`${idPrefix}-brand-button`}
                  onPress={onBrandPress}
                  style={styles.brandButton}
                  testID={`${idPrefix}-brand-button`}
                  {...getWebClassNameProps("public-chrome-navbar-brand-button")}
                >
                  <View
                    nativeID={`${idPrefix}-brand-mark`}
                    style={styles.brandMark}
                    testID={`${idPrefix}-brand-mark`}
                    {...getWebClassNameProps("public-chrome-navbar-brand-mark")}
                  >
                    <View
                      nativeID={`${idPrefix}-brand-mark-inner`}
                      style={styles.brandMarkInner}
                      testID={`${idPrefix}-brand-mark-inner`}
                      {...getWebClassNameProps("public-chrome-navbar-brand-mark-inner")}
                    >
                      <LogoSvg
                        nativeID={`${idPrefix}-brand-mark-label`}
                        size={20}
                        variant="brand-orange"
                        testID={`${idPrefix}-brand-mark-label`}
                      />
                    </View>
                  </View>
                  <View
                    nativeID={`${idPrefix}-brand-copy`}
                    style={styles.brandCopy}
                    testID={`${idPrefix}-brand-copy`}
                    {...getWebClassNameProps("public-chrome-navbar-brand-copy")}
                  >
                    <Text
                      nativeID={`${idPrefix}-brand-title`}
                      style={styles.brandTitle}
                      testID={`${idPrefix}-brand-title`}
                      {...getWebClassNameProps("public-chrome-navbar-brand-title")}
                    >
                      El Dojo
                    </Text>
                  </View>
                </Pressable>
              </View>

              <View style={{ flex: 1 }} />

              {showAuthControls ? (
                <View
                  nativeID={`${idPrefix}-actions`}
                  style={styles.actions}
                  testID={`${idPrefix}-actions`}
                  {...getWebClassNameProps("public-chrome-navbar-actions")}
                >
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
                    hintShowsAuth ? (
                      <SessionIndicator idPrefix={idPrefix} />
                    ) : (
                      <View
                        style={styles.publicAuthActionsRow}
                        {...getWebClassNameProps("public-chrome-navbar-auth-actions-row")}
                      >
                        <Pressable
                          accessibilityRole="link"
                          nativeID={`${idPrefix}-auth-signin`}
                          onPress={handleSignInPress}
                          style={(state) => {
                            const hovered = (state as unknown as { hovered?: boolean }).hovered;
                            return [
                              styles.authButton,
                              styles.authButtonPrimary,
                              hovered ? styles.authButtonPrimaryHover : null,
                              state.pressed ? styles.authButtonPressed : null,
                            ];
                          }}
                          testID={`${idPrefix}-auth-signin`}
                          {...getWebClassNameProps(
                            joinWebClassNames(
                              "public-chrome-navbar-auth-button",
                              "public-chrome-navbar-auth-button--primary"
                            )
                          )}
                        >
                          {(state) => {
                            const hovered = (state as unknown as { hovered?: boolean }).hovered;
                            return (
                              <Text
                                nativeID={`${idPrefix}-auth-signin-label`}
                                style={[
                                  styles.authButtonLabel,
                                  styles.authButtonLabelPrimary,
                                  hovered ? styles.authButtonLabelPrimaryHover : null,
                                ]}
                                testID={`${idPrefix}-auth-signin-label`}
                                {...getWebClassNameProps(
                                  joinWebClassNames(
                                    "public-chrome-navbar-auth-button-label",
                                    "public-chrome-navbar-auth-button-label--primary"
                                  )
                                )}
                              >
                                Ingresar
                              </Text>
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
            {...getWebClassNameProps("public-chrome-navbar-mobile-floating-bar")}
          >
            {showAuthControls && hintShowsAuth ? (
              <View
                style={styles.mobileMiniAvatar}
                nativeID={`${idPrefix}-mobile-mini-avatar`}
                testID={`${idPrefix}-mobile-mini-avatar`}
                {...getWebClassNameProps("public-chrome-navbar-mobile-mini-avatar")}
              >
                <Text
                  style={styles.mobileMiniAvatarInitial}
                  {...getWebClassNameProps("public-chrome-navbar-mobile-mini-avatar-initial")}
                >
                  {(displayUser?.first_name?.charAt(0) ?? displayUser?.email?.charAt(0) ?? "A").toUpperCase()}
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
              {...getWebClassNameProps("public-chrome-navbar-menu-trigger")}
            >
              <Feather color={colors.text} name="menu" size={20} />
            </Pressable>
          </View>
        )}

        {screenScrollable ? null : (
          <View
            nativeID={`${idPrefix}-content-wrap`}
            style={[styles.contentWrap, { maxWidth: resolvedContentMaxWidth }, contentContainerStyle]}
            testID={`${idPrefix}-content-wrap`}
          >
            {children}
          </View>
        )}

        {screenScrollable ? (
          <View
            nativeID={`${idPrefix}-content-wrap`}
            style={[styles.contentWrapStatic, { maxWidth: resolvedContentMaxWidth }, contentContainerStyle]}
            testID={`${idPrefix}-content-wrap`}
          >
            {children}
          </View>
        ) : null}

        {showFooter ? (
          <View
            nativeID={`${idPrefix}-footer`}
            style={[
              styles.footerShell,
              screenScrollable ? styles.footerShellStatic : null,
              { paddingHorizontal: outerPaddingHorizontal },
            ]}
            testID={`${idPrefix}-footer`}
            {...getWebClassNameProps(
              joinWebClassNames(
                "public-chrome-footer-shell",
                `${idPrefix}-footer`
              )
            )}
          >
            {showFooterTopDivider ? (
              <View
                nativeID={`${idPrefix}-footer-divider-top`}
                style={styles.footerDividerTop}
                testID={`${idPrefix}-footer-divider-top`}
                {...getWebClassNameProps("public-chrome-footer-divider-top")}
              />
            ) : null}
            <View
              nativeID={`${idPrefix}-footer-inner`}
              style={[styles.footerInner, { maxWidth: resolvedContentMaxWidth }]}
              testID={`${idPrefix}-footer-inner`}
              {...getWebClassNameProps("public-chrome-footer-inner")}
            >
              <View
                nativeID={`${idPrefix}-footer-grid`}
                style={[styles.footerGrid, !isMobile ? styles.footerGridDesktop : null]}
                testID={`${idPrefix}-footer-grid`}
                {...getWebClassNameProps("public-chrome-footer-grid")}
              >
                <View
                  nativeID={`${idPrefix}-footer-brand-block`}
                  style={styles.footerBrandBlock}
                  testID={`${idPrefix}-footer-brand-block`}
                  {...getWebClassNameProps("public-chrome-footer-brand-block")}
                >
                  <View
                    nativeID={`${idPrefix}-footer-brand-row`}
                    style={styles.footerBrandRow}
                    testID={`${idPrefix}-footer-brand-row`}
                    {...getWebClassNameProps("public-chrome-footer-brand-row")}
                  >
                    <View
                      nativeID={`${idPrefix}-footer-brand-mark`}
                      style={styles.footerBrandMark}
                      testID={`${idPrefix}-footer-brand-mark`}
                      {...getWebClassNameProps("public-chrome-footer-brand-mark")}
                    >
                      <LogoSvg
                        nativeID={`${idPrefix}-footer-brand-mark-label`}
                        size={20}
                        variant="brand-orange"
                        testID={`${idPrefix}-footer-brand-mark-label`}
                      />
                    </View>
                    <Text
                      nativeID={`${idPrefix}-footer-brand-title`}
                      style={styles.footerBrandTitle}
                      testID={`${idPrefix}-footer-brand-title`}
                      {...getWebClassNameProps("public-chrome-footer-brand-title")}
                    >
                      El Dojo
                    </Text>
                  </View>
                  <Text
                    nativeID={`${idPrefix}-footer-brand-description`}
                    style={styles.footerBrandDescription}
                    testID={`${idPrefix}-footer-brand-description`}
                    {...getWebClassNameProps("public-chrome-footer-brand-description")}
                  >
                    Software de gestión para academias de BJJ, MMA y Judo.
                  </Text>
                </View>
              </View>

              <View
                nativeID={`${idPrefix}-footer-divider`}
                style={styles.footerDivider}
                testID={`${idPrefix}-footer-divider`}
                {...getWebClassNameProps("public-chrome-footer-divider")}
              />

              <View
                nativeID={`${idPrefix}-footer-bottom`}
                style={[styles.footerBottom, !isMobile ? styles.footerBottomDesktop : null]}
                testID={`${idPrefix}-footer-bottom`}
                {...getWebClassNameProps("public-chrome-footer-bottom")}
              >
                <Text
                  nativeID={`${idPrefix}-footer-copyright`}
                  style={styles.footerCopyright}
                  testID={`${idPrefix}-footer-copyright`}
                  {...getWebClassNameProps("public-chrome-footer-copyright")}
                >
                  © 2026 El Dojo
                </Text>
                <View
                  style={styles.footerLegalRow}
                  {...getWebClassNameProps("public-chrome-footer-legal-row")}
                >
                  <Pressable
                    style={({ pressed, hovered }: any) => [
                      styles.footerLegalLink,
                      pressed ? { opacity: 0.7 } : null,
                      hovered ? { borderBottomColor: EDITORIAL_BORDER } : null,
                    ]}
                    {...getWebClassNameProps("public-chrome-footer-legal-link")}
                  >
                    <Text
                      style={styles.footerLegalLabel}
                      {...getWebClassNameProps("public-chrome-footer-legal-label")}
                    >
                      Términos
                    </Text>
                  </Pressable>
                  <View
                    style={styles.footerLegalSeparator}
                    {...getWebClassNameProps("public-chrome-footer-legal-separator")}
                  />
                  <Pressable
                    style={({ pressed, hovered }: any) => [
                      styles.footerLegalLink,
                      pressed ? { opacity: 0.7 } : null,
                      hovered ? { borderBottomColor: EDITORIAL_BORDER } : null,
                    ]}
                    {...getWebClassNameProps("public-chrome-footer-legal-link")}
                  >
                    <Text
                      style={styles.footerLegalLabel}
                      {...getWebClassNameProps("public-chrome-footer-legal-label")}
                    >
                      Privacidad
                    </Text>
                  </Pressable>
                  <View
                    style={styles.footerLegalSeparator}
                    {...getWebClassNameProps("public-chrome-footer-legal-separator")}
                  />
                  <Pressable
                    style={({ pressed, hovered }: any) => [
                      styles.footerLegalLink,
                      pressed ? { opacity: 0.7 } : null,
                      hovered ? { borderBottomColor: EDITORIAL_BORDER } : null,
                    ]}
                    {...getWebClassNameProps("public-chrome-footer-legal-link")}
                  >
                    <Text
                      style={styles.footerLegalLabel}
                      {...getWebClassNameProps("public-chrome-footer-legal-label")}
                    >
                      Contacto
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        ) : null}

        <AppModal
          nativeID={`${idPrefix}-mobile-menu`}
          visible={isMobileMenuVisible}
          title="Menú"
          description="Navega entre las secciones y tu cuenta."
          onClose={() => setIsMobileMenuVisible(false)}
          testID={`${idPrefix}-mobile-menu`}
        >
          <View
            nativeID={`${idPrefix}-mobile-menu-content`}
            style={styles.mobileMenuContent}
            testID={`${idPrefix}-mobile-menu-content`}
            {...getWebClassNameProps("public-chrome-mobile-menu-content")}
          >
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
              hintShowsAuth ? (
                <>
                  <View
                    style={styles.mobileMenuProfileCard}
                    {...getWebClassNameProps("public-chrome-mobile-menu-profile-card")}
                  >
                    <View
                      style={styles.mobileMenuAvatar}
                      {...getWebClassNameProps("public-chrome-mobile-menu-avatar")}
                    >
                      <Text
                        style={styles.mobileMenuAvatarInitial}
                        {...getWebClassNameProps("public-chrome-mobile-menu-avatar-initial")}
                      >
                        {(displayUser?.first_name?.charAt(0) ?? displayUser?.email?.charAt(0) ?? "A").toUpperCase()}
                      </Text>
                    </View>
                    <View
                      style={styles.mobileMenuProfileCopy}
                      {...getWebClassNameProps("public-chrome-mobile-menu-profile-copy")}
                    >
                      <Text
                        style={styles.mobileMenuProfileName}
                        {...getWebClassNameProps("public-chrome-mobile-menu-profile-name")}
                      >
                        {displayUser?.first_name
                          ? `${displayUser.first_name}${displayUser.last_name ? ` ${displayUser.last_name}` : ""}`
                          : displayUser?.email ?? "Administrador"}
                      </Text>
                      <Text
                        style={styles.mobileMenuProfileEmail}
                        {...getWebClassNameProps("public-chrome-mobile-menu-profile-email")}
                      >
                        {displayUser?.email ?? "Sesión iniciada"}
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
  screenContentStatic: {
    flexGrow: 1,
    flexShrink: 0,
    flexBasis: "auto",
    minHeight: "100%",
  },
  shell: {
    flex: 1,
    width: "100%",
  },
  shellStatic: {
    minHeight: "100%",
    width: "100%",
    flexDirection: "column",
  },
  navbar: {
    position: (Platform.OS === "web" ? "sticky" : "relative") as unknown as ViewStyle["position"],
    top: 0,
    width: "100%",
    zIndex: 50,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: EDITORIAL_BG,
    borderBottomWidth: 1,
    borderBottomColor: EDITORIAL_BORDER_SOFT,
  },
  navbarInner: {
    alignItems: "center",
    alignSelf: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    width: "100%",
  },
  navbarLeftGroup: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
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
    height: 40,
    width: 40,
    borderRadius: 0,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: EDITORIAL_BORDER,
  },
  brandMarkInner: {
    alignItems: "center",
    justifyContent: "center",
  },
  brandMarkLabel: {
    color: EDITORIAL_FG,
    fontFamily: typography.headingFamily,
    fontSize: 18,
    fontWeight: "800",
  },
  brandCopy: {
    gap: 0,
  },
  brandTitle: {
    color: EDITORIAL_FG,
    fontFamily: typography.headingFamily,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  navItems: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.lg,
    justifyContent: "center",
  },
  navItem: {
    borderRadius: 0,
    paddingHorizontal: 0,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "transparent",
  },
  navItemHovered: {
    borderBottomColor: EDITORIAL_BORDER,
  },
  navItemPressed: {
    opacity: 0.75,
  },
  navItemLabel: {
    color: EDITORIAL_FG_MUTED,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0.1,
  },
  navItemLabelActive: {
    color: EDITORIAL_FG,
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
    borderRadius: 0,
    flexDirection: "row",
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: spacing.md,
  },
  authButtonPressed: {
    opacity: 0.82,
  },
  authButtonGhost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: EDITORIAL_BORDER,
  },
  authButtonGhostHover: {
    backgroundColor: EDITORIAL_SURFACE_HOVER,
  },
  authButtonPrimary: {
    backgroundColor: EDITORIAL_FG,
    borderWidth: 1,
    borderColor: EDITORIAL_BORDER,
  },
  authButtonPrimaryHover: {
    backgroundColor: "rgba(255, 255, 255, 0.92)",
  },
  authButtonLabel: {
    fontFamily: typography.headingFamily,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.15,
  },
  authButtonLabelGhost: {
    color: EDITORIAL_FG,
  },
  authButtonLabelGhostHover: {
    color: EDITORIAL_FG,
  },
  authButtonLabelPrimary: {
    color: EDITORIAL_BG,
  },
  authButtonLabelPrimaryHover: {
    color: EDITORIAL_BG,
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
    height: 40,
    width: 40,
    borderRadius: 0,
    backgroundColor: EDITORIAL_SURFACE,
    borderWidth: 1,
    borderColor: EDITORIAL_BORDER,
  },
  mobileMiniAvatarInitial: {
    color: EDITORIAL_FG,
    fontFamily: typography.headingFamily,
    fontSize: 14,
    fontWeight: "800",
  },
  menuTrigger: {
    alignItems: "center",
    backgroundColor: EDITORIAL_BG,
    borderColor: EDITORIAL_BORDER,
    borderRadius: 0,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  menuTriggerPressed: {
    opacity: 0.82,
    backgroundColor: EDITORIAL_SURFACE_HOVER,
  },
  mobileFloatingBar: {
    alignItems: "center",
    alignSelf: "flex-end",
    backgroundColor: EDITORIAL_BG,
    borderBottomColor: EDITORIAL_BORDER_SOFT,
    borderBottomLeftRadius: 0,
    borderColor: EDITORIAL_BORDER_SOFT,
    borderLeftColor: EDITORIAL_BORDER_SOFT,
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
  contentWrapStatic: {
    alignSelf: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    width: "100%",
    flexGrow: 1,
    flexShrink: 0,
    flexBasis: "auto",
  },
  footerShell: {
    borderTopWidth: 1,
    borderTopColor: EDITORIAL_BORDER_SOFT,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing["2xl"],
    paddingTop: spacing["2xl"],
    width: "100%",
    backgroundColor: EDITORIAL_BG,
  },
  footerShellStatic: {
    position: "relative",
    zIndex: 0,
    flexGrow: 0,
    flexShrink: 0,
  },
  footerDividerTop: {
    alignSelf: "flex-start",
    width: 40,
    height: 1,
    backgroundColor: EDITORIAL_BORDER,
    marginBottom: spacing.lg,
  },
  footerInner: {
    alignSelf: "center",
    width: "100%",
  },
  footerGrid: {
    gap: spacing.lg,
  },
  footerGridDesktop: {
    flexDirection: "row",
    gap: spacing["2xl"],
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  footerBrandBlock: {
    flex: 1,
    gap: spacing.sm,
  },
  footerBrandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  footerBrandMark: {
    alignItems: "center",
    justifyContent: "center",
    height: 36,
    width: 36,
    borderRadius: 0,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: EDITORIAL_BORDER,
  },
  footerBrandMarkLabel: {
    color: EDITORIAL_FG,
    fontFamily: typography.headingFamily,
    fontSize: 16,
    fontWeight: "800",
  },
  footerBrandTitle: {
    color: EDITORIAL_FG,
    fontFamily: typography.headingFamily,
    fontSize: 16,
    fontWeight: "800",
  },
  footerBrandDescription: {
    color: EDITORIAL_FG_MUTED,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 22,
    maxWidth: 340,
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
    minWidth: 140,
  },
  footerBlockTitle: {
    color: EDITORIAL_FG,
    fontFamily: typography.headingFamily,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.6,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
  },
  footerLink: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "transparent",
  },
  footerLinkPressed: {
    opacity: 0.72,
    borderBottomColor: EDITORIAL_BORDER,
  },
  footerLinkArrow: {
    opacity: 0.9,
  },
  footerLinkLabel: {
    color: EDITORIAL_FG_MUTED,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
  },
  footerContactRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    paddingVertical: 6,
  },
  footerContactIconWrap: {
    alignItems: "center",
    justifyContent: "center",
    height: 24,
    width: 24,
    borderRadius: 0,
    backgroundColor: EDITORIAL_SURFACE,
    borderWidth: 1,
    borderColor: EDITORIAL_BORDER_SOFT,
  },
  footerContactText: {
    color: EDITORIAL_FG_MUTED,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
  },
  footerDivider: {
    backgroundColor: EDITORIAL_BORDER_SOFT,
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
    color: EDITORIAL_FG_SUBTLE,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
  },
  footerLegalRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  footerLegalLink: {
    paddingHorizontal: 0,
    paddingVertical: 2,
    borderBottomWidth: 1,
    borderBottomColor: "transparent",
  },
  footerLegalLabel: {
    color: EDITORIAL_FG_MUTED,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
  },
  footerLegalSeparator: {
    backgroundColor: EDITORIAL_BORDER_SOFT,
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
    color: EDITORIAL_FG_SUBTLE,
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
    backgroundColor: EDITORIAL_SURFACE,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: EDITORIAL_BORDER,
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.xs,
    padding: spacing.sm,
  },
  mobileMenuAvatar: {
    alignItems: "center",
    backgroundColor: EDITORIAL_SURFACE,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: EDITORIAL_BORDER,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  mobileMenuAvatarInitial: {
    color: EDITORIAL_FG,
    fontFamily: typography.headingFamily,
    fontSize: 15,
    fontWeight: "800",
  },
  mobileMenuProfileCopy: {
    flex: 1,
    gap: 2,
  },
  mobileMenuProfileName: {
    color: EDITORIAL_FG,
    fontFamily: typography.headingFamily,
    fontSize: 14,
    fontWeight: "700",
  },
  mobileMenuProfileEmail: {
    color: EDITORIAL_FG_MUTED,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
  },
});
