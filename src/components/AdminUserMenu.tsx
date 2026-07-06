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

export function AdminUserMenu({ user, actions }: AdminUserMenuProps) {
  const [open, setOpen] = useState(false);
  const displayName = useMemo(() => formatDisplayName(user?.email), [user?.email]);
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
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.trigger, pressed ? styles.triggerPressed : null]}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarLabel}>{displayInitial}</Text>
        </View>
        <View style={styles.triggerGlyph}>
          <View style={styles.triggerLine} />
          <View style={styles.triggerLine} />
          <View style={styles.triggerLine} />
        </View>
      </Pressable>

      <Modal animationType="fade" onRequestClose={() => setOpen(false)} transparent visible={open}>
        <View style={styles.overlay}>
          <Pressable onPress={() => setOpen(false)} style={styles.backdrop} />
          <View style={styles.sheetWrapper}>
            <View style={styles.sheet}>
              <View style={styles.profileBlock}>
                <View style={styles.profileRow}>
                  <View style={styles.profileAvatar}>
                    <Text style={styles.profileAvatarLabel}>{displayInitial}</Text>
                  </View>
                  <View style={styles.profileCopy}>
                    <Text style={styles.profileName}>{displayName}</Text>
                    <Text style={styles.profileRole}>{formatAdminRole(user?.role)}</Text>
                  </View>
                </View>
                <Text style={styles.profileEmail}>{user?.email ?? "Sin correo disponible"}</Text>
              </View>

              <View style={styles.metaBlock}>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Rol</Text>
                  <Text style={styles.metaValue}>{formatAdminRole(user?.role)}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Asignaciones</Text>
                  <Text style={styles.metaValue}>{assignmentCount}</Text>
                </View>
              </View>

              <View style={styles.actionsBlock}>
                {actions.map((action) => (
                  <Pressable
                    key={action.label}
                    accessibilityRole="button"
                    onPress={() => handleActionPress(action)}
                    style={({ pressed }) => [
                      styles.actionButton,
                      pressed ? styles.actionPressed : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.actionLabel,
                        action.tone === "danger" ? styles.actionLabelDanger : null,
                      ]}
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
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  triggerPressed: {
    opacity: 0.82,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  avatarLabel: {
    color: colors.surface,
    fontFamily: typography.headingFamily,
    fontSize: 13,
    fontWeight: "700",
  },
  triggerGlyph: {
    gap: 3,
    justifyContent: "center",
    paddingRight: 2,
  },
  triggerLine: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: 2,
    width: 12,
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
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  profileAvatarLabel: {
    color: colors.primary,
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
    borderRadius: radius.md,
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
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    backgroundColor: colors.surface,
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
