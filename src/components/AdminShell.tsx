import { Feather } from "@expo/vector-icons";
import { PropsWithChildren, ReactNode, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AdminUserMenu } from "@/components/AdminUserMenu";
import { AppButton } from "@/components/AppButton";
import { ConfirmActionModal } from "@/components/ConfirmActionModal";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";

type AdminSection = "dashboard" | "students" | "branches" | "operations" | "payments" | "dojo";

interface AdminShellProps extends PropsWithChildren {
  title: string;
  subtitle: string;
  activeSection: AdminSection;
  onGoDashboard: () => void;
  onGoStudents: () => void;
  onGoBranches: () => void;
  onGoOperations: () => void;
  onGoPayments: () => void;
  onGoDojo: () => void;
  headerActions?: ReactNode;
  headerBottomContent?: ReactNode;
  headerSearch?: ReactNode;
  headerMainContent?: ReactNode;
  sidebarSummary?: {
    organizationName?: string | null;
    suffix?: string | null;
    branchName?: string | null;
    location?: string | null;
    mainSchedule?: string | null;
  };
}

type NavItem = {
  key: AdminSection;
  label: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
};

function formatDisplayName(email: string | undefined): string {
  if (!email) {
    return "Administrador";
  }

  const localPart = email.split("@")[0] ?? "";
  const normalized = localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");

  return normalized || "Administrador";
}

function formatAdminDisplayName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  email: string | undefined
): string {
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  return fullName || formatDisplayName(email);
}

export function AdminShell({
  title,
  subtitle,
  activeSection,
  onGoDashboard,
  onGoStudents,
  onGoBranches,
  onGoOperations,
  onGoPayments,
  onGoDojo,
  headerActions,
  headerBottomContent,
  headerSearch,
  headerMainContent,
  sidebarSummary,
  children,
}: AdminShellProps) {
  const { user, signOut } = useAuth();
  const { contentMaxWidth, isDesktop, isTablet } = useResponsiveLayout();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const navItems = useMemo<NavItem[]>(
    () => [
      {
        key: "dashboard",
        label: "Resumen general",
        description: "Vista global y gráficas de tu academia",
        icon: "grid",
        onPress: onGoDashboard,
      },
      {
        key: "students",
        label: "Alumnos",
        description: "Padrón, altas y seguimiento",
        icon: "users",
        onPress: onGoStudents,
      },
      {
        key: "branches",
        label: "Sucursales",
        description: "Alta y edición de sedes",
        icon: "map-pin",
        onPress: onGoBranches,
      },
      {
        key: "operations",
        label: "Asistencia y clases",
        description: "Registro diario y operación de clases",
        icon: "clipboard",
        onPress: onGoOperations,
      },
      {
        key: "payments",
        label: "Pagos",
        description: "Cobranza, historial y movimientos",
        icon: "credit-card",
        onPress: onGoPayments,
      },
      {
        key: "dojo",
        label: "Mi Dojo",
        description: "Datos de tu dojo y ajustes rápidos",
        icon: "home",
        onPress: onGoDojo,
      },
    ],
    [onGoBranches, onGoDashboard, onGoDojo, onGoOperations, onGoPayments, onGoStudents],
  );

  const displayName = useMemo(
    () => formatAdminDisplayName(user?.first_name, user?.last_name, user?.email),
    [user?.email, user?.first_name, user?.last_name]
  );
  const assignmentCount = user?.admin_assignments.length ?? 0;

  const requestSignOut = () => {
    setShowSignOutConfirm(true);
  };

  const cancelSignOut = () => {
    setShowSignOutConfirm(false);
  };

  const confirmSignOut = () => {
    setShowSignOutConfirm(false);
    void signOut();
  };

  const handleMobileNavigation = (item: NavItem) => {
    setShowMobileMenu(false);
    item.onPress();
  };

  const renderSidebarContent = (mode: "desktop" | "mobile") => (
    <View
      nativeID={mode === "desktop" ? "components-admin-shell-sidebar-card" : "components-admin-shell-mobile-menu-card"}
      style={styles.sidebarCard}
      testID={mode === "desktop" ? "components-admin-shell-sidebar-card" : "components-admin-shell-mobile-menu-card"}
    >
      <View nativeID="components-admin-shell-brand-block" style={styles.brandBlock} testID="components-admin-shell-brand-block">
        <View nativeID="components-admin-shell-brand-row" style={styles.brandRow} testID="components-admin-shell-brand-row">
          <View nativeID="components-admin-shell-brand-logo" style={styles.logoMark} testID="components-admin-shell-brand-logo">
            <Text nativeID="components-admin-shell-brand-logo-text" style={styles.logoMarkText} testID="components-admin-shell-brand-logo-text">
              EL
            </Text>
          </View>
          <View nativeID="components-admin-shell-brand-copy" style={styles.brandCopy} testID="components-admin-shell-brand-copy">
            <Text nativeID="components-admin-shell-brand-title" style={styles.brandTitle} testID="components-admin-shell-brand-title">
              ElDojo Admin
            </Text>
            <Text nativeID="components-admin-shell-brand-subtitle" style={styles.brandSubtitle} testID="components-admin-shell-brand-subtitle">
              Operación diaria del dojo
            </Text>
          </View>
        </View>
      </View>

      <View nativeID="components-admin-shell-nav-block" style={styles.navBlock} testID="components-admin-shell-nav-block">
        {navItems.map((item) => (
          <Pressable
            key={item.key}
            accessibilityRole="button"
            nativeID={`components-admin-shell-nav-item-${item.key}`}
            onPress={() => (mode === "desktop" ? item.onPress() : handleMobileNavigation(item))}
            testID={`components-admin-shell-nav-item-${item.key}`}
            style={(state) => {
              const hovered = (state as typeof state & { hovered?: boolean }).hovered;

              return [
                styles.navItem,
                item.key === activeSection ? styles.navItemActive : null,
                hovered ? styles.navItemHovered : null,
                state.pressed ? styles.navItemPressed : null,
              ];
            }}
          >
            <View nativeID={`components-admin-shell-nav-item-icon-wrap-${item.key}`} style={[styles.navItemIconWrap, item.key === activeSection ? styles.navItemIconWrapActive : null]} testID={`components-admin-shell-nav-item-icon-wrap-${item.key}`}>
              <Feather color={item.key === activeSection ? colors.text : colors.sidebarMuted} name={item.icon} size={16} />
            </View>
            <View nativeID={`components-admin-shell-nav-item-copy-${item.key}`} style={styles.navItemCopy} testID={`components-admin-shell-nav-item-copy-${item.key}`}>
              <Text
                nativeID={`components-admin-shell-nav-item-label-${item.key}`}
                style={[
                  styles.navItemLabel,
                  item.key === activeSection ? styles.navItemLabelActive : null,
                ]}
                testID={`components-admin-shell-nav-item-label-${item.key}`}
              >
                {item.label}
              </Text>
              <Text
                nativeID={`components-admin-shell-nav-item-description-${item.key}`}
                style={[
                  styles.navItemDescription,
                  item.key === activeSection ? styles.navItemDescriptionActive : null,
                ]}
                testID={`components-admin-shell-nav-item-description-${item.key}`}
              >
                {item.description}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>

      <View nativeID="components-admin-shell-sidebar-footer" style={styles.sidebarFooter} testID="components-admin-shell-sidebar-footer">
        <View nativeID="components-admin-shell-profile-card" style={styles.profileCard} testID="components-admin-shell-profile-card">
          <View nativeID="components-admin-shell-profile-top" style={styles.profileTop} testID="components-admin-shell-profile-top">
            <View nativeID="components-admin-shell-profile-avatar" style={styles.profileAvatar} testID="components-admin-shell-profile-avatar">
              <Text nativeID="components-admin-shell-profile-avatar-label" style={styles.profileAvatarLabel} testID="components-admin-shell-profile-avatar-label">
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View nativeID="components-admin-shell-profile-copy" style={styles.profileCopy} testID="components-admin-shell-profile-copy">
              <Text nativeID="components-admin-shell-profile-name" style={styles.profileName} testID="components-admin-shell-profile-name">{displayName}</Text>
              <Text nativeID="components-admin-shell-profile-email" style={styles.profileMeta} testID="components-admin-shell-profile-email">{user?.email ?? "Sin correo disponible"}</Text>
            </View>
          </View>
          <Text nativeID="components-admin-shell-profile-assignments" style={styles.profileMeta} testID="components-admin-shell-profile-assignments">
            {assignmentCount} {assignmentCount === 1 ? "asignacion activa" : "asignaciones activas"}
          </Text>
        </View>
        <AppButton
          label="Cerrar sesion"
          nativeID="components-admin-shell-logout-button"
          onPress={requestSignOut}
          testID="components-admin-shell-logout-button"
          variant="secondary"
        />
      </View>
    </View>
  );

  return (
    <View
      nativeID="components-admin-shell-shell"
      style={[styles.shell, isDesktop ? desktopStyles.shell : mobileStyles.shell]}
      testID="components-admin-shell-shell"
    >
      {isDesktop ? (
        <View nativeID="components-admin-shell-sidebar" style={desktopStyles.sidebar} testID="components-admin-shell-sidebar">
          {renderSidebarContent("desktop")}
        </View>
      ) : null}

      <View nativeID="components-admin-shell-main-column" style={styles.mainColumn} testID="components-admin-shell-main-column">
        <View
          nativeID="components-admin-shell-header"
          style={[
            styles.header,
            isDesktop ? desktopStyles.header : isTablet ? tabletStyles.header : mobileStyles.header,
          ]}
          testID="components-admin-shell-header"
        >
          <View nativeID="components-admin-shell-header-top-row" style={[styles.headerTopRow, isDesktop ? desktopStyles.headerTopRow : mobileStyles.headerTopRow]} testID="components-admin-shell-header-top-row">
            <View nativeID="components-admin-shell-header-copy" style={styles.headerCopy} testID="components-admin-shell-header-copy">
              <View nativeID="components-admin-shell-page-kicker" style={styles.pageKicker} testID="components-admin-shell-page-kicker">
                <Text nativeID="components-admin-shell-page-kicker-label" style={styles.pageKickerLabel} testID="components-admin-shell-page-kicker-label">
                  Centro de Operaciones
                </Text>
              </View>
              <Text
                nativeID="components-admin-shell-page-title"
                style={[
                  styles.pageTitle,
                  isDesktop ? desktopStyles.pageTitle : isTablet ? tabletStyles.pageTitle : mobileStyles.pageTitle,
                ]}
                testID="components-admin-shell-page-title"
              >
                {title}
              </Text>
              <Text nativeID="components-admin-shell-page-subtitle" style={styles.pageSubtitle} testID="components-admin-shell-page-subtitle">{subtitle}</Text>
            </View>

            <View
              nativeID="components-admin-shell-header-actions"
              style={[
                styles.headerActions,
                isDesktop ? desktopStyles.headerActions : isTablet ? tabletStyles.headerActions : mobileStyles.headerActions,
              ]}
              testID="components-admin-shell-header-actions"
            >
              {!isDesktop ? (
                <View nativeID="components-admin-shell-mobile-header-topbar" style={styles.mobileHeaderTopBar} testID="components-admin-shell-mobile-header-topbar">
                  <Pressable
                    accessibilityLabel="Abrir secciones del administrador"
                    accessibilityRole="button"
                    nativeID="components-admin-shell-mobile-menu-trigger"
                    onPress={() => setShowMobileMenu(true)}
                    testID="components-admin-shell-mobile-menu-trigger"
                    style={({ pressed }) => [styles.mobileMenuTrigger, pressed ? styles.mobileMenuTriggerPressed : null]}
                  >
                    <View nativeID="components-admin-shell-mobile-menu-trigger-icon" style={styles.mobileMenuTriggerIconWrap} testID="components-admin-shell-mobile-menu-trigger-icon">
                      <Feather color={colors.text} name="menu" size={18} />
                    </View>
                    <Text nativeID="components-admin-shell-mobile-menu-trigger-label" style={styles.mobileMenuTriggerLabel} testID="components-admin-shell-mobile-menu-trigger-label">
                      Secciones
                    </Text>
                  </Pressable>
                  <AdminUserMenu
                    actions={[{ label: "Cerrar sesion", onPress: requestSignOut, tone: "danger" }]}
                    user={user}
                  />
                </View>
              ) : null}
              {headerActions}
            </View>
          </View>
          {headerBottomContent ? (
            <View nativeID="components-admin-shell-header-bottom-content" style={styles.headerBottomContent} testID="components-admin-shell-header-bottom-content">
              {headerBottomContent}
            </View>
          ) : null}
          {headerSearch || headerMainContent ? (
            <View
              nativeID="components-admin-shell-content-wrap"
              style={[styles.headerContentWrap, { maxWidth: contentMaxWidth }]}
              testID="components-admin-shell-content-wrap"
            >
              {headerSearch ? (
                <View nativeID="components-admin-shell-header-search" style={styles.headerSearch} testID="components-admin-shell-header-search">
                  {headerSearch}
                </View>
              ) : null}
              {headerMainContent ? (
                <View nativeID="components-admin-shell-header-main-content" style={styles.headerMainContent} testID="components-admin-shell-header-main-content">
                  {headerMainContent}
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        <View
          nativeID="components-admin-shell-body-wrap"
          style={[
            styles.contentWrap,
            { maxWidth: contentMaxWidth },
          ]}
          testID="components-admin-shell-body-wrap"
        >
          {children}
        </View>
      </View>
      <Modal animationType="slide" onRequestClose={() => setShowMobileMenu(false)} transparent visible={showMobileMenu}>
        <View nativeID="components-admin-shell-mobile-menu-overlay" style={styles.mobileMenuOverlay} testID="components-admin-shell-mobile-menu-overlay">
          <Pressable
            nativeID="components-admin-shell-mobile-menu-backdrop"
            onPress={() => setShowMobileMenu(false)}
            style={styles.mobileMenuBackdrop}
            testID="components-admin-shell-mobile-menu-backdrop"
          />
          <View nativeID="components-admin-shell-mobile-menu-sheet-wrap" style={styles.mobileMenuSheetWrap} testID="components-admin-shell-mobile-menu-sheet-wrap">
            <ScrollView
              contentContainerStyle={styles.mobileMenuScrollContent}
              nativeID="components-admin-shell-mobile-menu-scroll"
              showsVerticalScrollIndicator={false}
              testID="components-admin-shell-mobile-menu-scroll"
            >
              {renderSidebarContent("mobile")}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <ConfirmActionModal
        confirmLabel="Si, cerrar sesion"
        idPrefix="components-admin-shell-signout-confirm"
        message="Se cerrará tu sesión actual y tendrás que volver a iniciar sesión para continuar."
        onCancel={cancelSignOut}
        onConfirm={confirmSignOut}
        title="Confirmar cierre de sesión"
        visible={showSignOutConfirm}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: colors.background,
    flex: 1,
    gap: spacing.md,
    padding: spacing.md,
    width: "100%",
  },
  mainColumn: {
    flex: 1,
    gap: spacing.md,
    minWidth: 0,
  },
  sidebarCard: {
    backgroundColor: colors.sidebar,
    borderColor: colors.sidebarBorder,
    borderRadius: 30,
    borderWidth: 1,
    flex: 1,
    gap: spacing.xl,
    padding: spacing.xl,
  },
  brandBlock: {
    gap: spacing.lg,
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  brandCopy: {
    flex: 1,
    gap: 2,
  },
  logoMark: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderColor: colors.sidebarBorder,
    borderRadius: 20,
    borderWidth: 1,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  logoMarkText: {
    color: colors.sidebarText,
    fontFamily: typography.headingFamily,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  brandTitle: {
    color: colors.sidebarText,
    fontFamily: typography.headingFamily,
    fontSize: 18,
    fontWeight: "800",
  },
  brandSubtitle: {
    color: colors.sidebarMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 18,
  },
  navBlock: {
    gap: spacing.xs,
  },
  navItem: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderColor: "transparent",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  navItemActive: {
    backgroundColor: "#D9DEE5",
    borderColor: "#C4CBD4",
  },
  navItemHovered: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderColor: colors.sidebarBorder,
  },
  navItemPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.995 }],
  },
  navItemLabel: {
    color: colors.sidebarText,
    fontFamily: typography.headingFamily,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  navItemLabelActive: {
    color: colors.text,
  },
  navItemDescription: {
    color: colors.sidebarMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 18,
  },
  navItemDescriptionActive: {
    color: colors.text,
  },
  navItemIconWrap: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 12,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  navItemIconWrapActive: {
    backgroundColor: "rgba(17, 24, 26, 0.08)",
  },
  navItemCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  sidebarFooter: {
    gap: spacing.sm,
    marginTop: "auto",
  },
  profileCard: {
    backgroundColor: colors.sidebarSoft,
    borderColor: colors.sidebarBorder,
    borderRadius: 24,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  profileTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  profileAvatar: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: radius.pill,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  profileAvatarLabel: {
    color: colors.sidebarText,
    fontFamily: typography.headingFamily,
    fontSize: 16,
    fontWeight: "800",
  },
  profileCopy: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    color: colors.sidebarText,
    fontFamily: typography.headingFamily,
    fontSize: 15,
    fontWeight: "700",
  },
  profileMeta: {
    color: colors.sidebarMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 18,
  },
  mobileHeaderTopBar: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    width: "100%",
  },
  mobileMenuTrigger: {
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
  },
  mobileMenuTriggerPressed: {
    opacity: 0.84,
  },
  mobileMenuTriggerIconWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  mobileMenuTriggerLabel: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 13,
    fontWeight: "700",
  },
  header: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  headerTopRow: {
    gap: spacing.md,
    width: "100%",
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  pageKicker: {
    alignSelf: "flex-start",
    backgroundColor: colors.infoSoft,
    borderColor: "#CBD9FF",
    borderRadius: radius.pill,
    borderWidth: 1,
    marginBottom: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  pageKickerLabel: {
    color: colors.info,
    fontFamily: typography.headingFamily,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  pageTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  pageSubtitle: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 20,
  },
  headerActions: {
    gap: spacing.sm,
    minWidth: 0,
  },
  headerBottomContent: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingTop: spacing.md,
    width: "100%",
  },
  headerContentWrap: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.md,
    paddingTop: spacing.md,
    width: "100%",
  },
  headerSearch: {
    width: "100%",
  },
  headerMainContent: {
    width: "100%",
  },
  contentWrap: {
    alignSelf: "center",
    flex: 1,
    width: "100%",
  },
  mobileMenuOverlay: {
    backgroundColor: colors.overlay,
    flex: 1,
    flexDirection: "row",
  },
  mobileMenuBackdrop: {
    flex: 1,
  },
  mobileMenuSheetWrap: {
    maxWidth: 360,
    padding: spacing.sm,
    width: "88%",
  },
  mobileMenuScrollContent: {
    flexGrow: 1,
  },
  utilityStack: {
    gap: spacing.md,
  },
  compactCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  compactCardTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  compactNavGrid: {
    gap: spacing.sm,
  },
  compactNavItem: {
    minWidth: 0,
  },
  compactSummaryGrid: {
    gap: spacing.sm,
  },
  compactSummaryItem: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 4,
    minWidth: 0,
    padding: spacing.sm,
  },
  compactSummaryLabel: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  compactSummaryValue: {
    color: colors.text,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
});

const mobileStyles = StyleSheet.create({
  shell: {
    flexDirection: "column",
    padding: spacing.sm,
  },
  header: {
    flexDirection: "column",
    padding: spacing.md,
  },
  headerTopRow: {
    flexDirection: "column",
  },
  pageTitle: {
    fontSize: 26,
  },
  headerActions: {
    alignItems: "stretch",
    flexDirection: "column",
    width: "100%",
  },
  utilityStack: {
    flexDirection: "column",
  },
  compactNavGrid: {
    flexDirection: "column",
  },
  compactSummaryGrid: {
    flexDirection: "column",
  },
  compactSummaryItemCompact: {
    padding: spacing.xs,
  },
});

const tabletStyles = StyleSheet.create({
  header: {
    flexDirection: "column",
    padding: spacing.xl,
  },
  headerTopRow: {
    flexDirection: "column",
  },
  pageTitle: {
    fontSize: 30,
  },
  headerActions: {
    alignItems: "stretch",
    flexDirection: "row",
    flexWrap: "wrap",
    width: "100%",
  },
  utilityStack: {
    flexDirection: "column",
  },
  compactNavGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  compactSummaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
});

const desktopStyles = StyleSheet.create({
  shell: {
    alignItems: "stretch",
    flexDirection: "row",
  },
  sidebar: {
    alignSelf: "stretch",
    flexShrink: 0,
    width: 300,
  },
  header: {
    padding: spacing.xl,
  },
  headerTopRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  pageTitle: {
    fontSize: 34,
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
});
