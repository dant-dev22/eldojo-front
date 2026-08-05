import { Feather } from "@expo/vector-icons";
import { PropsWithChildren, ReactNode, useMemo, useState } from "react";
import { Dimensions, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AdminUserMenu } from "@/components/AdminUserMenu";
import { AppButton } from "@/components/AppButton";
import { BottomSheet, type BottomSheetAction } from "@/components/BottomSheet";
import { ConfirmActionModal } from "@/components/ConfirmActionModal";
import { MobileDrawerNavigation } from "@/components/MobileDrawerNavigation";
import { MobileHeader } from "@/components/MobileHeader";
import { activeBorderWidth, colors, radius, spacing, typography } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";

export type AdminSection =
  | "dashboard"
  | "students"
  | "branches"
  | "operations"
  | "payments"
  | "dojo"
  | "reports"
  | "settings";

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
  onGoReports?: () => void;
  onGoSettings?: () => void;
  headerActions?: ReactNode;
  headerBottomContent?: ReactNode;
  headerSearch?: ReactNode;
  headerMainContent?: ReactNode;
  onBack?: () => void;
  showBackButton?: boolean;
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
  onGoReports,
  onGoSettings,
  headerActions,
  headerBottomContent,
  headerSearch,
  headerMainContent,
  onBack,
  showBackButton = false,
  sidebarSummary,
  children,
}: AdminShellProps) {
  const { user, signOut } = useAuth();
  const { contentMaxWidth, isDesktop, isMobile, isTablet } = useResponsiveLayout();
  const insets = useSafeAreaInsets();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showQuickActionsSheet, setShowQuickActionsSheet] = useState(false);

  const viewportHeight = Dimensions.get("window").height;
  const shellPadding = spacing.md;
  const desktopSidebarWidth = 300;
  const tabletSidebarWidth = 272;

  const navItems = useMemo<NavItem[]>(
    () => {
      const base: NavItem[] = [
        {
          key: "dashboard",
          label: "Resumen general",
          description: "Vista global y gráficas de tu academia",
          icon: "grid",
          onPress: onGoDashboard,
        },
        {
          key: "students",
          label: "Miembros",
          description: "Padrón, altas y seguimiento",
          icon: "users",
          onPress: onGoStudents,
        },
        {
          key: "operations",
          label: "Clases",
          description: "Registro diario y operación",
          icon: "clipboard",
          onPress: onGoOperations,
        },
        {
          key: "branches",
          label: "Sucursales",
          description: "Alta y edición de sedes",
          icon: "map-pin",
          onPress: onGoBranches,
        },
      ];
      if (onGoReports) {
        base.push({
          key: "reports",
          label: "Reportes",
          description: "Métricas, análisis y exportación",
          icon: "bar-chart-2",
          onPress: onGoReports,
        });
      }
      base.push({
        key: "payments",
        label: "Pagos",
        description: "Cobranza, historial y movimientos",
        icon: "credit-card",
        onPress: onGoPayments,
      });
      if (onGoSettings) {
        base.push({
          key: "settings",
          label: "Configuración",
          description: "Preferencias y ajustes del sistema",
          icon: "settings",
          onPress: onGoSettings,
        });
      }
      base.push({
        key: "dojo",
        label: "Mi Dojo",
        description: "Datos de tu dojo y ajustes rápidos",
        icon: "home",
        onPress: onGoDojo,
      });
      return base;
    },
    [onGoBranches, onGoDashboard, onGoDojo, onGoOperations, onGoPayments, onGoReports, onGoSettings, onGoStudents],
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

  const drawerNavItems = useMemo(
    () =>
      navItems.map((item) => ({
        key: item.key as AdminSection,
        label: item.label,
        icon: item.icon,
        onPress: item.onPress,
      })),
    [navItems],
  );

  const quickActions = useMemo<BottomSheetAction[]>(
    () => [
      { key: "new-student", label: "Nuevo alumno", icon: "user-plus", tone: "primary", onPress: onGoStudents },
      { key: "new-class", label: "Registrar clase", icon: "calendar", tone: "success", onPress: onGoOperations },
      { key: "new-payment", label: "Registrar pago", icon: "dollar-sign", tone: "warning", onPress: onGoPayments },
      { key: "view-reports", label: "Ver reportes", icon: "bar-chart-2", onPress: () => onGoReports?.() },
    ],
    [onGoOperations, onGoPayments, onGoReports, onGoStudents],
  );

  const renderTabletSidebar = () => (
    <View nativeID="components-admin-shell-sidebar" style={tabletStyles.sidebar} testID="components-admin-shell-sidebar">
      {renderSidebarContent("desktop")}
    </View>
  );

  const renderMainHeader = () => (
    <View
      nativeID="components-admin-shell-header"
      style={[
        styles.header,
        isDesktop ? desktopStyles.header : isTablet ? tabletStyles.header : null,
      ]}
      testID="components-admin-shell-header"
    >
      <View nativeID="components-admin-shell-header-top-row" style={[styles.headerTopRow, isDesktop ? desktopStyles.headerTopRow : tabletStyles.headerTopRow]} testID="components-admin-shell-header-top-row">
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
              isDesktop ? desktopStyles.pageTitle : isTablet ? tabletStyles.pageTitle : null,
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
            isDesktop ? desktopStyles.headerActions : isTablet ? tabletStyles.headerActions : null,
          ]}
          testID="components-admin-shell-header-actions"
        >
          {isTablet ? (
            <Pressable
              accessibilityLabel="Acciones rápidas"
              accessibilityRole="button"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              nativeID="components-admin-shell-quick-actions-btn"
              onPress={() => setShowQuickActionsSheet(true)}
              style={({ pressed }) => [
                styles.mobileMenuTrigger,
                pressed ? styles.mobileMenuTriggerPressed : null,
              ]}
              testID="components-admin-shell-quick-actions-btn"
            >
              <View style={styles.mobileMenuTriggerIconWrap}>
                <Feather color={colors.text} name="plus" size={18} />
              </View>
              <Text style={styles.mobileMenuTriggerLabel}>Acciones</Text>
            </Pressable>
          ) : null}
          <AdminUserMenu
            actions={[{ label: "Cerrar sesion", onPress: requestSignOut, tone: "danger" }]}
            user={user}
          />
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
  );

  const renderMobileContent = () => (
    <View nativeID="components-admin-shell-mobile-main" style={mobileStyles.mainColumn} testID="components-admin-shell-mobile-main">
      {headerSearch || headerMainContent || headerBottomContent ? (
        <View
          nativeID="components-admin-shell-mobile-header-extra"
          style={mobileStyles.headerExtraBlock}
          testID="components-admin-shell-mobile-header-extra"
        >
          <View style={[mobileStyles.headerExtraInner, { maxWidth: contentMaxWidth }]}>
            {headerBottomContent ? (
              <View nativeID="components-admin-shell-mobile-header-bottom" style={styles.headerBottomContent} testID="components-admin-shell-mobile-header-bottom">
                {headerBottomContent}
              </View>
            ) : null}
            {headerSearch ? (
              <View nativeID="components-admin-shell-mobile-search" style={styles.headerSearch} testID="components-admin-shell-mobile-search">
                {headerSearch}
              </View>
            ) : null}
            {headerMainContent ? (
              <View nativeID="components-admin-shell-mobile-main-content" style={styles.headerMainContent} testID="components-admin-shell-mobile-main-content">
                {headerMainContent}
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      <View
        nativeID="components-admin-shell-mobile-page-copy"
        style={[mobileStyles.pageCopyBlock, { maxWidth: contentMaxWidth }]}
        testID="components-admin-shell-mobile-page-copy"
      >
        <Text
          nativeID="components-admin-shell-mobile-page-title"
          style={mobileStyles.pageTitle}
          testID="components-admin-shell-mobile-page-title"
        >
          {title}
        </Text>
        <Text
          nativeID="components-admin-shell-mobile-page-subtitle"
          style={mobileStyles.pageSubtitle}
          testID="components-admin-shell-mobile-page-subtitle"
        >
          {subtitle}
        </Text>
      </View>

      <View
        nativeID="components-admin-shell-body-wrap"
        style={[
          styles.contentWrap,
          { maxWidth: contentMaxWidth, paddingBottom: insets.bottom + spacing.md },
        ]}
        testID="components-admin-shell-body-wrap"
      >
        {children}
      </View>
    </View>
  );

  const renderDesktopContent = () => (
    <View nativeID="components-admin-shell-main-column" style={styles.mainColumn} testID="components-admin-shell-main-column">
      {renderMainHeader()}
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
  );

  return (
    <View
      nativeID="components-admin-shell-shell"
      style={[
        styles.shell,
        isDesktop ? desktopStyles.shell : isTablet ? tabletStyles.shell : mobileStyles.shell,
        isMobile ? { padding: 0, gap: 0 } : null,
      ]}
      testID="components-admin-shell-shell"
    >
      {isDesktop ? (
        <View
          nativeID="components-admin-shell-sidebar"
          style={{
            left: shellPadding,
            position: "absolute",
            top: shellPadding,
            width: desktopSidebarWidth,
            zIndex: 10,
          }}
          testID="components-admin-shell-sidebar"
        >
          <View style={{ height: viewportHeight - shellPadding * 2 - insets.top - insets.bottom }}>
            {renderSidebarContent("desktop")}
          </View>
        </View>
      ) : isTablet ? (
        <View
          nativeID="components-admin-shell-sidebar"
          style={{
            left: shellPadding,
            position: "absolute",
            top: shellPadding,
            width: tabletSidebarWidth,
            zIndex: 10,
          }}
          testID="components-admin-shell-sidebar"
        >
          <View style={{ height: viewportHeight - shellPadding * 2 - insets.top - insets.bottom }}>
            {renderSidebarContent("desktop")}
          </View>
        </View>
      ) : null}

      {isMobile ? (
        <>
          <MobileHeader
            idPrefix="mobile-admin-header"
            menuPosition="right"
            onBack={onBack}
            onOpenMenu={() => setShowMobileMenu(true)}
            rightActions={
              <Pressable
                accessibilityLabel="Acciones rápidas"
                accessibilityRole="button"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                nativeID="mobile-admin-quick-actions-btn"
                onPress={() => setShowQuickActionsSheet(true)}
                style={({ pressed }) => [
                  {
                    alignItems: "center",
                    backgroundColor: pressed ? colors.primarySoft : "transparent",
                    borderRadius: radius.pill,
                    height: 44,
                    justifyContent: "center",
                    minWidth: 44,
                    width: 44,
                  },
                  pressed ? { opacity: 0.92 } : null,
                ]}
                testID="mobile-admin-quick-actions-btn"
              >
                <Feather color={colors.primary} name="plus" size={20} />
              </Pressable>
            }
            showBackButton={showBackButton}
            title={title}
          />
          {renderMobileContent()}
        </>
      ) : (
        <View style={{ flex: 1, paddingLeft: (isDesktop ? desktopSidebarWidth : tabletSidebarWidth) + spacing.md }}>
          {renderDesktopContent()}
        </View>
      )}

      <MobileDrawerNavigation
        activeSection={activeSection}
        avatarInitial={displayName.charAt(0).toUpperCase()}
        branchName={sidebarSummary?.branchName}
        displayName={displayName}
        email={user?.email}
        idPrefix="admin-mobile-drawer"
        items={drawerNavItems}
        onClose={() => setShowMobileMenu(false)}
        onSignOut={requestSignOut}
        organizationName={sidebarSummary?.organizationName}
        visible={showMobileMenu}
      />

      <BottomSheet
        actions={quickActions}
        description="Acceso directo a las operaciones más frecuentes"
        idPrefix="admin-quick-actions"
        onClose={() => setShowQuickActionsSheet(false)}
        title="Acciones rápidas"
        visible={showQuickActionsSheet}
      />

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
    flexGrow: 0,
    flexShrink: 0,
    gap: spacing.xl,
    height: "100%",
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
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    borderRadius: 20,
    borderWidth: 1,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  logoMarkText: {
    color: colors.onPrimary,
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
    backgroundColor: colors.primarySoft,
    borderLeftColor: colors.activeIndicator,
    borderLeftWidth: activeBorderWidth,
  },
  navItemHovered: {
    backgroundColor: colors.hover,
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
    backgroundColor: colors.woodSoft,
    borderRadius: 12,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  navItemIconWrapActive: {
    backgroundColor: colors.primarySoft,
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
    backgroundColor: colors.surfaceAlt,
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
    backgroundColor: colors.secondary,
    borderRadius: radius.pill,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  profileAvatarLabel: {
    color: colors.onPrimary,
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
    borderColor: colors.info,
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
    backgroundColor: colors.background,
    flexDirection: "column",
    flex: 1,
  },
  mainColumn: {
    flex: 1,
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  headerExtraBlock: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    marginHorizontal: -spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerExtraInner: {
    alignSelf: "center",
    gap: spacing.md,
    width: "100%",
  },
  pageCopyBlock: {
    alignSelf: "center",
    gap: 4,
    width: "100%",
  },
  pageTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  pageSubtitle: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 18,
  },
  header: {
    flexDirection: "column",
    padding: spacing.md,
  },
  headerTopRow: {
    flexDirection: "column",
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
  shell: {
    alignItems: "stretch",
    backgroundColor: colors.background,
    flex: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    width: "100%",
  },
  sidebar: {
    alignSelf: "stretch",
    flexShrink: 0,
    height: "100%",
    width: 272,
  },
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
    height: "100%",
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
