import { Feather } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useMemo, useState } from "react";

import { colors, radius, shadows, spacing, typography } from "@/constants/theme";

import type { User } from "@/types/api";

interface AdminUserMenuAction {
  label: string;
  onPress: () => void;
  tone?: "default" | "danger";
}

interface AdminUserMenuProps {
  user: User | null;
  actions: AdminUserMenuAction[];
}

function formatAdminRole(role: User["role"] | undefined): string {
  switch (role) {
    case "org_admin":
      return "Administrador de organización";
    case "branch_admin":
      return "Administrador de sucursal";
    case "super_admin":
      return "Super admin";
    case "student":
      return "Alumno";
    default:
      return "Perfil administrativo";
  }
}

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

export function AdminUserMenu({ user, actions }: AdminUserMenuProps) {
  const [open, setOpen] = useState(false);
  const displayName = useMemo(
    () => formatAdminDisplayName(user?.first_name, user?.last_name, user?.email),
    [user?.email, user?.first_name, user?.last_name]
  );
  const displayInitial = useMemo(() => displayName.charAt(0).toUpperCase() || "A", [displayName]);
  const assignmentCount = user?.admin_assignments.length ?? 0;

  function handleActionPress(action: AdminUserMenuAction) {
    setOpen(false);
    action.onPress();
  }

  return (
    <>
      <Pressable
        accessibilityLabel="Abrir menú del administrador"
        accessibilityRole="button"
        nativeID="components-admin-user-menu-trigger"
        onPress={() => setOpen(true)}
        testID="components-admin-user-menu-trigger"
        style={({ pressed }) => [styles.trigger, pressed ? styles.triggerPressed : null]}
      >
        <View nativeID="components-admin-user-menu-trigger-avatar" style={styles.avatar} testID="components-admin-user-menu-trigger-avatar">
          <Text nativeID="components-admin-user-menu-trigger-avatar-label" style={styles.avatarLabel} testID="components-admin-user-menu-trigger-avatar-label">{displayInitial}</Text>
        </View>
        <View nativeID="components-admin-user-menu-trigger-copy" style={styles.triggerCopy} testID="components-admin-user-menu-trigger-copy">
          <Text nativeID="components-admin-user-menu-trigger-name" style={styles.triggerName} testID="components-admin-user-menu-trigger-name">
            {displayName}
          </Text>
          <Text nativeID="components-admin-user-menu-trigger-role" style={styles.triggerRole} testID="components-admin-user-menu-trigger-role">
            {formatAdminRole(user?.role)}
          </Text>
        </View>
        <View nativeID="components-admin-user-menu-trigger-glyph" style={styles.triggerGlyph} testID="components-admin-user-menu-trigger-glyph">
          <Feather color={colors.textMuted} name="chevron-down" size={16} />
        </View>
      </Pressable>

      <Modal animationType="fade" onRequestClose={() => setOpen(false)} transparent visible={open}>
        <View nativeID="components-admin-user-menu-overlay" style={styles.overlay} testID="components-admin-user-menu-overlay">
          <Pressable
            nativeID="components-admin-user-menu-backdrop"
            onPress={() => setOpen(false)}
            style={styles.backdrop}
            testID="components-admin-user-menu-backdrop"
          />
          <View nativeID="components-admin-user-menu-sheet-wrapper" style={styles.sheetWrapper} testID="components-admin-user-menu-sheet-wrapper">
            <View nativeID="components-admin-user-menu-sheet" style={styles.sheet} testID="components-admin-user-menu-sheet">
              <View nativeID="components-admin-user-menu-profile-block" style={styles.profileBlock} testID="components-admin-user-menu-profile-block">
                <View nativeID="components-admin-user-menu-profile-row" style={styles.profileRow} testID="components-admin-user-menu-profile-row">
                  <View nativeID="components-admin-user-menu-profile-avatar" style={styles.profileAvatar} testID="components-admin-user-menu-profile-avatar">
                    <Text nativeID="components-admin-user-menu-profile-avatar-label" style={styles.profileAvatarLabel} testID="components-admin-user-menu-profile-avatar-label">{displayInitial}</Text>
                  </View>
                  <View nativeID="components-admin-user-menu-profile-copy" style={styles.profileCopy} testID="components-admin-user-menu-profile-copy">
                    <Text nativeID="components-admin-user-menu-profile-name" style={styles.profileName} testID="components-admin-user-menu-profile-name">{displayName}</Text>
                    <Text nativeID="components-admin-user-menu-profile-role" style={styles.profileRole} testID="components-admin-user-menu-profile-role">{formatAdminRole(user?.role)}</Text>
                  </View>
                </View>
                <Text nativeID="components-admin-user-menu-profile-email" style={styles.profileEmail} testID="components-admin-user-menu-profile-email">{user?.email ?? "Sin correo disponible"}</Text>
              </View>

              <View nativeID="components-admin-user-menu-meta-block" style={styles.metaBlock} testID="components-admin-user-menu-meta-block">
                <View nativeID="components-admin-user-menu-meta-row-role" style={styles.metaRow} testID="components-admin-user-menu-meta-row-role">
                  <Text nativeID="components-admin-user-menu-meta-role-label" style={styles.metaLabel} testID="components-admin-user-menu-meta-role-label">Rol</Text>
                  <Text nativeID="components-admin-user-menu-meta-role-value" style={styles.metaValue} testID="components-admin-user-menu-meta-role-value">{formatAdminRole(user?.role)}</Text>
                </View>
                <View nativeID="components-admin-user-menu-meta-row-assignments" style={styles.metaRow} testID="components-admin-user-menu-meta-row-assignments">
                  <Text nativeID="components-admin-user-menu-meta-assignments-label" style={styles.metaLabel} testID="components-admin-user-menu-meta-assignments-label">Asignaciones</Text>
                  <Text nativeID="components-admin-user-menu-meta-assignments-value" style={styles.metaValue} testID="components-admin-user-menu-meta-assignments-value">{assignmentCount}</Text>
                </View>
              </View>

              <View nativeID="components-admin-user-menu-actions-block" style={styles.actionsBlock} testID="components-admin-user-menu-actions-block">
                {actions.map((action) => (
                  <Pressable
                    key={action.label}
                    accessibilityRole="button"
                    nativeID={`components-admin-user-menu-action-${action.label.toLowerCase().replace(/\s+/g, "-")}`}
                    onPress={() => handleActionPress(action)}
                    testID={`components-admin-user-menu-action-${action.label.toLowerCase().replace(/\s+/g, "-")}`}
                    style={({ pressed }) => [
                      styles.actionButton,
                      pressed ? styles.actionPressed : null,
                    ]}
                  >
                    <Text
                      nativeID={`components-admin-user-menu-action-label-${action.label.toLowerCase().replace(/\s+/g, "-")}`}
                      style={[
                        styles.actionLabel,
                        action.tone === "danger" ? styles.actionLabelDanger : null,
                      ]}
                      testID={`components-admin-user-menu-action-label-${action.label.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {action.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  triggerPressed: {
    opacity: 0.82,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: colors.actionSoft,
    borderRadius: radius.pill,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  avatarLabel: {
    color: colors.action,
    fontFamily: typography.headingFamily,
    fontSize: 13,
    fontWeight: "700",
  },
  triggerCopy: {
    gap: 1,
    minWidth: 0,
  },
  triggerName: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 13,
    fontWeight: "700",
  },
  triggerRole: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 11,
  },
  triggerGlyph: {
    justifyContent: "center",
    paddingRight: 2,
  },
  overlay: {
    backgroundColor: colors.overlay,
    flex: 1,
    padding: spacing.md,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheetWrapper: {
    alignItems: "flex-end",
    paddingTop: spacing.xl,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    maxWidth: 320,
    padding: spacing.md,
    width: "100%",
    ...shadows.card,
  },
  profileBlock: {
    gap: spacing.xs,
  },
  profileRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  profileAvatar: {
    alignItems: "center",
    backgroundColor: colors.actionSoft,
    borderRadius: radius.pill,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  profileAvatarLabel: {
    color: colors.action,
    fontFamily: typography.headingFamily,
    fontSize: 18,
    fontWeight: "700",
  },
  profileCopy: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 16,
    fontWeight: "700",
  },
  profileRole: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
  },
  profileEmail: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
  },
  metaBlock: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.sm,
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaLabel: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  metaValue: {
    color: colors.text,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "right",
  },
  actionsBlock: {
    gap: spacing.xs,
  },
  actionButton: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  actionPressed: {
    opacity: 0.8,
  },
  actionLabel: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  actionLabelDanger: {
    color: colors.danger,
  },
});
