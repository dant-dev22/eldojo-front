import { PropsWithChildren, ReactNode, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AdminUserMenu } from "@/components/AdminUserMenu";
import { AppButton } from "@/components/AppButton";
import { ConfirmActionModal } from "@/components/ConfirmActionModal";
import { colors, spacing, typography } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";

type AdminSection = "dashboard" | "students";

interface AdminShellProps extends PropsWithChildren {
  title: string;
  subtitle: string;
  activeSection: AdminSection;
  onGoDashboard: () => void;
  onGoStudents: () => void;
  headerActions?: ReactNode;
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
  headerActions,
  sidebarSummary,
  children,
}: AdminShellProps) {
  const { user, signOut } = useAuth();
  const { contentMaxWidth, isDesktop } = useResponsiveLayout();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const navItems = useMemo<NavItem[]>(
    () => [
      {
        key: "dashboard",
        label: "Resumen",
        description: "Vista general del gimnasio",
        onPress: onGoDashboard,
      },
      {
        key: "students",
        label: "Alumnos",
        description: "Padrón, altas y seguimiento",
        onPress: onGoStudents,
      },
    ],
    [onGoDashboard, onGoStudents],
  );

  const displayName = useMemo(
    () => formatAdminDisplayName(user?.first_name, user?.last_name, user?.email),
    [user?.email, user?.first_name, user?.last_name]
  );
  const assignmentCount = user?.admin_assignments.length ?? 0;
  const academySummary = useMemo(
    () => [
      { key: "name", label: "Academia", value: sidebarSummary?.organizationName ?? "No disponible" },
      { key: "branch", label: "Sede principal", value: sidebarSummary?.branchName ?? "No disponible" },
      { key: "location", label: "Ubicacion", value: sidebarSummary?.location ?? "No disponible" },
      { key: "schedule", label: "Horario principal", value: sidebarSummary?.mainSchedule ?? "No disponible" },
      { key: "suffix", label: "Sufijo", value: sidebarSummary?.suffix ?? "No disponible" },
    ],
    [sidebarSummary]
  );

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

  return (
    <View
      nativeID="components-admin-shell-shell"
      style={[styles.shell, isDesktop ? desktopStyles.shell : mobileStyles.shell]}
      testID="components-admin-shell-shell"
    >
      {isDesktop ? (
        <View nativeID="components-admin-shell-sidebar" style={desktopStyles.sidebar} testID="components-admin-shell-sidebar">
          <View nativeID="components-admin-shell-sidebar-card" style={styles.sidebarCard} testID="components-admin-shell-sidebar-card">
            <View nativeID="components-admin-shell-brand-block" style={styles.brandBlock} testID="components-admin-shell-brand-block">
              <View nativeID="components-admin-shell-brand-logo" style={styles.logoMark} testID="components-admin-shell-brand-logo">
                <Text nativeID="components-admin-shell-brand-logo-text" style={styles.logoMarkText} testID="components-admin-shell-brand-logo-text">
                  EL
                </Text>
              </View>
              <View nativeID="components-admin-shell-academy-summary" style={styles.summaryBlock} testID="components-admin-shell-academy-summary">
                {academySummary.map((item) => (
                  <View
                    key={item.key}
                    nativeID={`components-admin-shell-academy-summary-${item.key}`}
                    style={styles.summaryRow}
                    testID={`components-admin-shell-academy-summary-${item.key}`}
                  >
                    <Text
                      nativeID={`components-admin-shell-academy-summary-${item.key}-label`}
                      style={styles.summaryLabel}
                      testID={`components-admin-shell-academy-summary-${item.key}-label`}
                    >
                      {item.label}
                    </Text>
                    <Text
                      nativeID={`components-admin-shell-academy-summary-${item.key}-value`}
                      style={styles.summaryValue}
                      testID={`components-admin-shell-academy-summary-${item.key}-value`}
                    >
                      {item.value}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <View nativeID="components-admin-shell-nav-block" style={styles.navBlock} testID="components-admin-shell-nav-block">
              {navItems.map((item) => (
                <Pressable
                  key={item.key}
                  accessibilityRole="button"
                  nativeID={`components-admin-shell-nav-item-${item.key}`}
                  onPress={item.onPress}
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
                  <Text nativeID={`components-admin-shell-nav-item-description-${item.key}`} style={styles.navItemDescription} testID={`components-admin-shell-nav-item-description-${item.key}`}>{item.description}</Text>
                </Pressable>
              ))}
            </View>

            <View nativeID="components-admin-shell-sidebar-footer" style={styles.sidebarFooter} testID="components-admin-shell-sidebar-footer">
              <View nativeID="components-admin-shell-profile-card" style={styles.profileCard} testID="components-admin-shell-profile-card">
                <Text nativeID="components-admin-shell-profile-name" style={styles.profileName} testID="components-admin-shell-profile-name">{displayName}</Text>
                <Text nativeID="components-admin-shell-profile-email" style={styles.profileMeta} testID="components-admin-shell-profile-email">{user?.email ?? "Sin correo disponible"}</Text>
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
        </View>
      ) : null}

      <View nativeID="components-admin-shell-main-column" style={styles.mainColumn} testID="components-admin-shell-main-column">
        <View
          nativeID="components-admin-shell-header"
          style={[styles.header, isDesktop ? desktopStyles.header : mobileStyles.header]}
          testID="components-admin-shell-header"
        >
          <View nativeID="components-admin-shell-header-copy" style={styles.headerCopy} testID="components-admin-shell-header-copy">
            <Text nativeID="components-admin-shell-page-title" style={styles.pageTitle} testID="components-admin-shell-page-title">{title}</Text>
            <Text nativeID="components-admin-shell-page-subtitle" style={styles.pageSubtitle} testID="components-admin-shell-page-subtitle">{subtitle}</Text>
          </View>

          <View
            nativeID="components-admin-shell-header-actions"
            style={[styles.headerActions, isDesktop ? desktopStyles.headerActions : mobileStyles.headerActions]}
            testID="components-admin-shell-header-actions"
          >
            {headerActions}
            {!isDesktop ? (
              <AdminUserMenu
                actions={[{ label: "Cerrar sesion", onPress: requestSignOut, tone: "danger" }]}
                user={user}
              />
            ) : null}
          </View>
        </View>

        <View
          nativeID="components-admin-shell-content-wrap"
          style={[
            styles.contentWrap,
            isDesktop ? { maxWidth: contentMaxWidth } : null,
          ]}
          testID="components-admin-shell-content-wrap"
        >
          {children}
        </View>
      </View>
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
    width: "100%",
  },
  mainColumn: {
    flex: 1,
    gap: spacing.md,
    minWidth: 0,
  },
  sidebarCard: {
    backgroundColor: colors.surface,
    borderBottomWidth: 0,
    borderColor: colors.border,
    borderLeftWidth: 0,
    borderRightWidth: 1,
    borderTopWidth: 0,
    flex: 1,
    gap: spacing.xl,
    padding: spacing.xl,
  },
  brandBlock: {
    gap: spacing.md,
  },
  logoMark: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 0,
    borderWidth: 1,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  logoMarkText: {
    color: colors.ink,
    fontFamily: typography.headingFamily,
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  summaryBlock: {
    gap: spacing.sm,
  },
  summaryRow: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: 4,
    paddingBottom: spacing.sm,
  },
  summaryLabel: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  summaryValue: {
    color: colors.text,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  navBlock: {
    gap: spacing.xs,
  },
  navItem: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 0,
    borderWidth: 1,
    gap: 4,
    padding: spacing.md,
  },
  navItemActive: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
  },
  navItemHovered: {
    backgroundColor: colors.hover,
    borderColor: colors.primary,
  },
  navItemPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.995 }],
  },
  navItemLabel: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  navItemLabelActive: {
    color: colors.ink,
  },
  navItemDescription: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 18,
  },
  sidebarFooter: {
    gap: spacing.sm,
    marginTop: "auto",
  },
  profileCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 0,
    borderWidth: 1,
    gap: 4,
    padding: spacing.sm,
  },
  profileName: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 15,
    fontWeight: "700",
  },
  profileMeta: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 18,
  },
  header: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 0,
    borderWidth: 1,
    gap: spacing.sm,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
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
  },
  contentWrap: {
    alignSelf: "center",
    flex: 1,
    width: "100%",
  },
});

const mobileStyles = StyleSheet.create({
  shell: {
    flexDirection: "column",
  },
  header: {
    flexDirection: "column",
    padding: spacing.xl,
  },
  headerActions: {
    alignItems: "stretch",
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
    width: 280,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.xl,
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
});
