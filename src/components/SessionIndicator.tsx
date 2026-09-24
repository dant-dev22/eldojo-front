import { Feather } from "@expo/vector-icons";
import { useCallback, useMemo } from "react";
import { Linking, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, shadows, spacing, typography } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import type { User } from "@/types/api";
import { APP_WEB_ORIGIN, STUDENT_WEB_ORIGIN, buildAppUrl, buildStudentUrl } from "@/utils/domains";
import { isGymAdminUser, isStudentUser } from "@/utils/roles";
import { readSessionHint, type SessionHint } from "@/utils/sessionHint";
import { useState } from "react";

interface SessionIndicatorProps {
  idPrefix?: string;
}

type SessionKind = "admin" | "student" | "unknown";

function getSessionKind(user: User | null): SessionKind {
  if (user) {
    const isSuperAdmin = (user as User).role === "super_admin";
    if (isGymAdminUser(user) || isSuperAdmin) return "admin";
  }
  if (isStudentUser(user)) return "student";
  return "unknown";
}

function buildHintUser(hintSnapshot: SessionHint | undefined): User | null {
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
}

function formatDisplayName(user: User | null): string {
  if (!user) return "Cuenta";
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  if (fullName) return fullName;
  const local = user.email?.split("@")[0] ?? "";
  return local ? local.charAt(0).toUpperCase() + local.slice(1) : "Cuenta";
}

function roleLabel(kind: SessionKind): string {
  if (kind === "admin") return "Panel de administración";
  if (kind === "student") return "Portal del alumno";
  return "Sesión activa";
}

export function SessionIndicator({ idPrefix = "session-indicator" }: SessionIndicatorProps) {
  const { status, user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const locallyAuthenticated = status === "authenticated" && Boolean(user);
  const hintSnapshot = Platform.OS === "web" ? readSessionHint() : undefined;
  const hasAnySession = locallyAuthenticated || Boolean(hintSnapshot?.userId && Number(hintSnapshot.userId) > 0);

  const effectiveUser = useMemo<User | null>(() => {
    if (user) return user;
    return buildHintUser(hintSnapshot);
  }, [user, hintSnapshot]);

  const sessionKind = useMemo<SessionKind>(() => getSessionKind(effectiveUser), [effectiveUser]);
  const displayName = useMemo(() => formatDisplayName(effectiveUser), [effectiveUser]);
  const initial = useMemo(() => displayName.charAt(0).toUpperCase() || "U", [displayName]);

  const goToPortal = useCallback(() => {
    setMenuOpen(false);
    const url =
      sessionKind === "student"
        ? buildStudentUrl("/alumno")
        : buildAppUrl("/admin/overview");
    if (Platform.OS === "web") {
      window.location.assign(url);
    } else {
      void Linking.openURL(url);
    }
  }, [sessionKind]);

  const handleSignOut = useCallback(() => {
    setMenuOpen(false);
    void signOut(true);
  }, [signOut]);

  if (!hasAnySession) return null;

  const portalLabel = sessionKind === "student" ? "Mi portal" : "Ir al panel";
  const accentBg = sessionKind === "student" ? colors.successSoft : colors.accentSoft;
  const accentFg = sessionKind === "student" ? colors.success : colors.accent;

  return (
    <>
      <Pressable
        accessibilityLabel="Sesión activa. Abrir menú de cuenta."
        accessibilityRole="button"
        nativeID={`${idPrefix}-trigger`}
        onPress={() => setMenuOpen(true)}
        style={({ pressed }) => [styles.trigger, pressed ? styles.triggerPressed : null]}
        testID={`${idPrefix}-trigger`}
      >
        <View nativeID={`${idPrefix}-status-pill`} style={[styles.statusPill, { backgroundColor: accentBg }]} testID={`${idPrefix}-status-pill`}>
          <View nativeID={`${idPrefix}-status-dot`} style={[styles.statusDot, { backgroundColor: accentFg }]} testID={`${idPrefix}-status-dot`} />
          <Text nativeID={`${idPrefix}-status-label`} style={[styles.statusLabel, { color: accentFg }]} testID={`${idPrefix}-status-label`}>
            Sesión iniciada
          </Text>
        </View>
        <View nativeID={`${idPrefix}-avatar`} style={styles.avatar} testID={`${idPrefix}-avatar`}>
          <Text nativeID={`${idPrefix}-avatar-initial`} style={styles.avatarLabel} testID={`${idPrefix}-avatar-initial`}>
            {initial}
          </Text>
        </View>
        <View nativeID={`${idPrefix}-copy`} style={styles.copy} testID={`${idPrefix}-copy`}>
          <Text nativeID={`${idPrefix}-name`} style={styles.name} numberOfLines={1} testID={`${idPrefix}-name`}>
            {displayName}
          </Text>
          <Text nativeID={`${idPrefix}-role`} style={styles.roleLabel} numberOfLines={1} testID={`${idPrefix}-role`}>
            {roleLabel(sessionKind)}
          </Text>
        </View>
        <Feather color={colors.textMuted} name="chevron-down" size={14} />
      </Pressable>

      <Modal animationType="fade" onRequestClose={() => setMenuOpen(false)} transparent visible={menuOpen}>
        <View nativeID={`${idPrefix}-overlay`} style={styles.overlay} testID={`${idPrefix}-overlay`}>
          <Pressable
            nativeID={`${idPrefix}-backdrop`}
            onPress={() => setMenuOpen(false)}
            style={styles.backdrop}
            testID={`${idPrefix}-backdrop`}
          />
          <View nativeID={`${idPrefix}-sheet-wrapper`} style={styles.sheetWrapper} testID={`${idPrefix}-sheet-wrapper`}>
            <View nativeID={`${idPrefix}-sheet`} style={styles.sheet} testID={`${idPrefix}-sheet`}>
              <View nativeID={`${idPrefix}-profile`} style={styles.profileBlock} testID={`${idPrefix}-profile`}>
                <View nativeID={`${idPrefix}-profile-row`} style={styles.profileRow} testID={`${idPrefix}-profile-row`}>
                  <View nativeID={`${idPrefix}-profile-avatar`} style={styles.profileAvatar} testID={`${idPrefix}-profile-avatar`}>
                    <Text nativeID={`${idPrefix}-profile-avatar-label`} style={styles.profileAvatarLabel} testID={`${idPrefix}-profile-avatar-label`}>
                      {initial}
                    </Text>
                  </View>
                  <View style={styles.profileCopy}>
                    <Text nativeID={`${idPrefix}-profile-name`} style={styles.profileName} testID={`${idPrefix}-profile-name`}>
                      {displayName}
                    </Text>
                    <Text nativeID={`${idPrefix}-profile-role`} style={styles.profileRole} testID={`${idPrefix}-profile-role`}>
                      {roleLabel(sessionKind)}
                    </Text>
                  </View>
                </View>
                <Text nativeID={`${idPrefix}-profile-email`} style={styles.profileEmail} testID={`${idPrefix}-profile-email`}>
                  {effectiveUser?.email ?? "Sin correo disponible"}
                </Text>
              </View>

              <View style={styles.actionsBlock}>
                <Pressable
                  accessibilityRole="button"
                  nativeID={`${idPrefix}-action-portal`}
                  onPress={goToPortal}
                  style={({ pressed }) => [styles.actionButton, styles.actionPrimary, pressed ? styles.actionPressed : null]}
                  testID={`${idPrefix}-action-portal`}
                >
                  <Feather color={colors.onPrimary} name={sessionKind === "student" ? "user" : "layout"} size={16} />
                  <Text style={[styles.actionLabel, styles.actionLabelPrimary]}>{portalLabel}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  nativeID={`${idPrefix}-action-signout`}
                  onPress={handleSignOut}
                  style={({ pressed }) => [styles.actionButton, pressed ? styles.actionPressed : null]}
                  testID={`${idPrefix}-action-signout`}
                >
                  <Feather color={colors.danger} name="log-out" size={16} />
                  <Text style={[styles.actionLabel, styles.actionLabelDanger]}>Cerrar sesión</Text>
                </Pressable>
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
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  triggerPressed: {
    opacity: 0.82,
  },
  statusPill: {
    alignItems: "center",
    borderRadius: radius.pill,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusDot: {
    borderRadius: 999,
    height: 6,
    width: 6,
  },
  statusLabel: {
    fontFamily: typography.headingFamily,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: colors.actionSoft,
    borderRadius: radius.pill,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  avatarLabel: {
    color: colors.action,
    fontFamily: typography.headingFamily,
    fontSize: 12,
    fontWeight: "700",
  },
  copy: {
    gap: 0,
    maxWidth: 150,
    minWidth: 0,
  },
  name: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 12,
    fontWeight: "700",
  },
  roleLabel: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 10,
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
    alignItems: "flex-start",
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
  actionsBlock: {
    gap: spacing.xs,
  },
  actionButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  actionPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
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
  actionLabelPrimary: {
    color: colors.onPrimary,
  },
  actionLabelDanger: {
    color: colors.danger,
  },
});
