import { PropsWithChildren, ReactNode, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AdminUserMenu } from "@/components/AdminUserMenu";
import { AppBadge } from "@/components/AppBadge";
import { AppButton } from "@/components/AppButton";
import { colors, radius, spacing } from "@/constants/theme";
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

  const displayName = useMemo(() => formatDisplayName(user?.email), [user?.email]);
  const assignmentCount = user?.admin_assignments.length ?? 0;

  return (
    <View style={[styles.shell, isDesktop ? desktopStyles.shell : mobileStyles.shell]}>
      {isDesktop ? (
        <View style={desktopStyles.sidebar}>
          <View style={styles.sidebarCard}>
            <View style={styles.brandBlock}>
              <AppBadge label="Portal web" tone="info" />
              <Text style={styles.brandTitle}>ElDojo Admin</Text>
              <Text style={styles.brandDescription}>
                Opera el gimnasio desde una interfaz responsive enfocada en escritorio y tablet.
              </Text>
            </View>

            <View style={styles.navBlock}>
              {navItems.map((item) => (
                <Pressable
                  key={item.key}
                  accessibilityRole="button"
                  onPress={item.onPress}
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

            <View style={styles.sidebarFooter}>
              <View style={styles.profileCard}>
                <Text style={styles.profileName}>{displayName}</Text>
                <Text style={styles.profileMeta}>{user?.email ?? "Sin correo disponible"}</Text>
                <Text style={styles.profileMeta}>
                  {assignmentCount} {assignmentCount === 1 ? "asignacion activa" : "asignaciones activas"}
                </Text>
              </View>
              <AppButton label="Cerrar sesion" onPress={() => void signOut()} variant="secondary" />
            </View>
          </View>
        </View>
      ) : null}

      <View style={styles.mainColumn}>
        <View style={[styles.header, isDesktop ? desktopStyles.header : mobileStyles.header]}>
          <View style={styles.headerCopy}>
            <AppBadge label={isDesktop ? "Portal responsive" : "Vista compacta"} tone="info" />
            <Text style={styles.pageTitle}>{title}</Text>
            <Text style={styles.pageSubtitle}>{subtitle}</Text>
          </View>

          <View style={[styles.headerActions, isDesktop ? desktopStyles.headerActions : mobileStyles.headerActions]}>
            {headerActions}
            {!isDesktop ? (
              <AdminUserMenu
                actions={[{ label: "Cerrar sesion", onPress: () => void signOut(), tone: "danger" }]}
                user={user}
              />
            ) : null}
          </View>
        </View>

        <View
          style={[
            styles.contentWrap,
            isDesktop ? { maxWidth: contentMaxWidth } : null,
          ]}
        >
          {children}
        </View>
      </View>
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
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flex: 1,
    gap: spacing.lg,
    padding: spacing.md,
  },
  brandBlock: {
    gap: spacing.xs,
  },
  brandTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
  },
  brandDescription: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  navBlock: {
    gap: spacing.xs,
  },
  navItem: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 4,
    padding: spacing.md,
  },
  navItemActive: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
  },
  navItemPressed: {
    opacity: 0.85,
  },
  navItemLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  navItemLabelActive: {
    color: colors.primary,
  },
  navItemDescription: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  sidebarFooter: {
    gap: spacing.sm,
    marginTop: "auto",
  },
  profileCard: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    gap: 4,
    padding: spacing.sm,
  },
  profileName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  profileMeta: {
    color: colors.textMuted,
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
    fontSize: 28,
    fontWeight: "800",
  },
  pageSubtitle: {
    color: colors.textMuted,
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
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
});
