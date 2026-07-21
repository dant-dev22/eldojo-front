import { PropsWithChildren, ReactNode, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AdminUserMenu } from "@/components/AdminUserMenu";
import { AppBadge } from "@/components/AppBadge";
import { AppButton } from "@/components/AppButton";
import { ConfirmActionModal } from "@/components/ConfirmActionModal";
import { colors, radius, shadows, spacing, typography } from "@/constants/theme";
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
              <AppBadge label="Portal web" tone="info" />
              <Text style={styles.brandTitle}>ElDojo Admin</Text>
              <Text style={styles.brandDescription}>
                Opera el gimnasio desde una interfaz responsive enfocada en escritorio y tablet.
              </Text>
            </View>

            <View nativeID="components-admin-shell-nav-block" style={styles.navBlock} testID="components-admin-shell-nav-block">
              {navItems.map((item) => (
                <Pressable
                  key={item.key}
                  accessibilityRole="button"
                  nativeID={`components-admin-shell-nav-item-${item.key}`}
                  onPress={item.onPress}
                  testID={`components-admin-shell-nav-item-${item.key}`}
                  style={({ pressed }) => [
                    styles.navItem,
                    item.key === activeSection ? styles.navItemActive : null,
                    pressed ? styles.navItemPressed : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.navItemLabel,
                      item.key === activeSection ? styles.navItemLabelActive : null,
                    ]}
                  >
                    {item.label}
                  </Text>
                  <Text style={styles.navItemDescription}>{item.description}</Text>
                </Pressable>
              ))}
            </View>

            <View nativeID="components-admin-shell-sidebar-footer" style={styles.sidebarFooter} testID="components-admin-shell-sidebar-footer">
              <View nativeID="components-admin-shell-profile-card" style={styles.profileCard} testID="components-admin-shell-profile-card">
                <Text style={styles.profileName}>{displayName}</Text>
                <Text style={styles.profileMeta}>{user?.email ?? "Sin correo disponible"}</Text>
                <Text style={styles.profileMeta}>
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
            <AppBadge label={isDesktop ? "Portal responsive" : "Vista compacta"} tone="info" />
            <Text style={styles.pageTitle}>{title}</Text>
            <Text style={styles.pageSubtitle}>{subtitle}</Text>
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
    backgroundColor: colors.surfaceStrong,
    borderColor: "#2E241D",
    borderRadius: radius.lg,
    borderWidth: 1,
    flex: 1,
    gap: spacing.lg,
    padding: spacing.lg,
    ...shadows.card,
  },
  brandBlock: {
    gap: spacing.xs,
  },
  brandTitle: {
    color: colors.surface,
    fontFamily: typography.headingFamily,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  brandDescription: {
    color: "#C8B8A9",
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 20,
  },
  navBlock: {
    gap: spacing.xs,
  },
  navItem: {
    backgroundColor: "#211812",
    borderColor: "#30251D",
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 4,
    padding: spacing.md,
  },
  navItemActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  navItemPressed: {
    opacity: 0.85,
  },
  navItemLabel: {
    color: colors.surface,
    fontFamily: typography.headingFamily,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  navItemLabelActive: {
    color: colors.primary,
  },
  navItemDescription: {
    color: "#BCAEA2",
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 18,
  },
  sidebarFooter: {
    gap: spacing.sm,
    marginTop: "auto",
  },
  profileCard: {
    backgroundColor: "#211812",
    borderRadius: radius.md,
    borderColor: "#30251D",
    borderWidth: 1,
    gap: 4,
    padding: spacing.sm,
  },
  profileName: {
    color: colors.surface,
    fontFamily: typography.headingFamily,
    fontSize: 15,
    fontWeight: "700",
  },
  profileMeta: {
    color: "#BCAEA2",
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 18,
  },
  header: {
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
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "column",
    padding: spacing.lg,
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
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.lg,
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
});
