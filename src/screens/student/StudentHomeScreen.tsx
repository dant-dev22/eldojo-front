import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { meApi } from "@/api/meApi";
import { AppBadge } from "@/components/AppBadge";
import { AppCard } from "@/components/AppCard";
import { CredencialQRModal } from "@/components/CredencialQRModal";
import { Screen } from "@/components/Screen";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { StatusView } from "@/components/StatusView";
import { StudentWelcomeModal } from "@/components/StudentWelcomeModal";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import type { StudentStackParamList } from "@/navigation/types";
import { isStudentUser } from "@/utils/roles";

import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

function formatDayRangeText(fromDaysAgo: number): string {
  if (fromDaysAgo <= 1) return "hoy";
  return `últimos ${fromDaysAgo} días`;
}

export function StudentHomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<StudentStackParamList>>();
  const { user, signOut, completeFirstTimeTutorial } = useAuth();
  const [showQR, setShowQR] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [postActivationGoToProfile, setPostActivationGoToProfile] = useState(false);

  useEffect(() => {
    if (isStudentUser(user) && user.first_time === true) {
      setShowWelcome(true);
      setPostActivationGoToProfile(true);
    }
  }, [user]);

  const handleWelcomeDismiss = async (save: boolean) => {
    if (save) {
      await completeFirstTimeTutorial();
    }
    setShowWelcome(false);
    if (save && postActivationGoToProfile) {
      setPostActivationGoToProfile(false);
      try {
        navigation.navigate("StudentProfile");
      } catch {
        /* ignore si el nav aún no está listo */
      }
    }
  };

  const profileQuery = useQuery({
    queryKey: ["my-profile"],
    queryFn: meApi.getProfile,
    staleTime: 60_000,
  });

  const summaryQuery = useQuery({
    queryKey: ["my-attendance-summary"],
    queryFn: () => meApi.getMyAttendanceSummary({}),
    staleTime: 120_000,
  });

  const profile = profileQuery.data;
  const summary = summaryQuery.data;
  const displayName =
    profile?.full_name ??
    (user ? [user.first_name, user.last_name].filter(Boolean).join(" ") : null) ??
    "Alumno";
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.trim().at(0)?.toUpperCase() ?? "")
    .join("") || "A";

  const kpis = [
    {
      label: "Último mes",
      sublabel: formatDayRangeText(30),
      value: summary?.last_30_days ?? 0,
      loading: summaryQuery.isLoading,
    },
    {
      label: "Total asistencias",
      sublabel: "Desde tu inscripción",
      value: summary?.total_attendances ?? 0,
      loading: summaryQuery.isLoading,
    },
    {
      label: "Racha actual",
      sublabel: "días consecutivos",
      value: summary?.streak_days ?? 0,
      loading: summaryQuery.isLoading,
    },
  ];

  const credentialError = profileQuery.error || summaryQuery.error;
  if (profileQuery.isLoading || (profileQuery.isFetching && !profile)) {
    return (
      <Screen scrollable>
        <StatusView
          title="Cargando tu portal"
          description="Estamos cargando tu perfil y el resumen de asistencias."
          loading
        />
      </Screen>
    );
  }

  if (!profile) {
    return (
      <Screen scrollable>
        <StatusView
          title="No pudimos cargar tu perfil"
          description={
            credentialError instanceof Error
              ? credentialError.message
              : "Por favor vuelve a iniciar sesión."
          }
        />
        <View style={{ padding: spacing.md, alignItems: "center" }}>
          <Pressable
            onPress={() => void signOut(true)}
            style={({ pressed }) => [styles.secondaryPressable, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryLabel}>Cerrar sesión</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scrollable>
      <View style={styles.root}>
        <View style={styles.topBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Hola, {profile.first_name ?? "alumno"} 👋</Text>
            <Text style={styles.subGreeting}>
              Bienvenido a tu espacio personal del dojo.
            </Text>
            {profile.payment_status ? (
              <View style={{ marginTop: spacing.xs }}>
                <AppBadge
                  label={
                    profile.payment_status === "up_to_date"
                      ? "Pagos al día"
                      : profile.payment_status === "partial"
                        ? "Pago parcial registrado"
                        : profile.payment_status === "late"
                          ? "Pago pendiente"
                          : "Estatus de pago"
                  }
                  tone={
                    profile.payment_status === "up_to_date"
                      ? "success"
                      : profile.payment_status === "partial"
                        ? "warning"
                        : profile.payment_status === "late"
                          ? "danger"
                          : "neutral"
                  }
                />
              </View>
            ) : null}
          </View>
          <Pressable
            accessibilityLabel="Abrir mi perfil"
            onPress={() => navigation.navigate("StudentProfile")}
            style={({ pressed }) => [
              styles.avatarPressable,
              pressed && styles.avatarPressed,
            ]}
          >
            {profile.photo_url ? (
              <Image
                source={{ uri: profile.photo_url }}
                style={styles.avatarImg}
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
          </Pressable>
        </View>

        <Pressable
          accessibilityLabel="Abrir mi credencial QR"
          onPress={() => setShowQR(true)}
          style={({ pressed }) => [styles.qrPressable, pressed && styles.qrPressed]}
        >
          <View style={styles.qrGlow} pointerEvents="none" />
          <View style={styles.qrInner} pointerEvents="none">
            <View style={styles.qrLabelStack}>
              <Text style={styles.qrEyebrow}>Tu credencial</Text>
              <Text style={styles.qrTitle}>Mostrar QR de acceso</Text>
              <Text style={styles.qrSub}>
                Presenta este código en la recepción de tu sucursal para marcar tu asistencia.
              </Text>
            </View>
            <View style={styles.qrMock}>
              <View style={styles.qrMockPattern}>
                <Text style={styles.qrMockLabel}>QR</Text>
                <Text style={styles.qrMockCode}>{profile.unique_code}</Text>
              </View>
            </View>
          </View>
          <View style={styles.qrTapHint} pointerEvents="none">
            <Text style={styles.qrTapHintLabel}>Toca para abrir</Text>
          </View>
        </Pressable>

        <Text style={styles.sectionTitle}>Resumen de asistencias</Text>
        <View style={styles.kpiGrid}>
          {kpis.map((kpi, idx) => (
            <AppCard key={idx} style={styles.kpiCard}>
              {kpi.loading ? (
                <View style={{ gap: spacing.sm }}>
                  <SkeletonLoader height={12} style={{ borderRadius: radius.sm, width: "70%" }} />
                  <SkeletonLoader height={40} style={{ borderRadius: radius.md, width: "100%" }} />
                  <SkeletonLoader height={12} style={{ borderRadius: radius.sm, width: "85%" }} />
                </View>
              ) : (
                <>
                  <Text style={styles.kpiLabel}>{kpi.label}</Text>
                  <Text style={styles.kpiValue}>{kpi.value}</Text>
                  <Text style={styles.kpiSub}>{kpi.sublabel}</Text>
                </>
              )}
            </AppCard>
          ))}
        </View>

        <View style={styles.quickActions}>
          <Pressable
            onPress={() => navigation.navigate("StudentProfile")}
            style={({ pressed }) => [styles.secondaryPressable, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryLabel}>Ver mi perfil completo</Text>
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate("AttendanceHistory")}
            style={({ pressed }) => [styles.secondaryPressable, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryLabel}>Ver historial completo</Text>
          </Pressable>
        </View>
      </View>

      <StudentWelcomeModal
        nativeID="student-home-welcome-modal"
        onDismiss={handleWelcomeDismiss}
        testID="student-home-welcome-modal"
        visible={showWelcome}
      />
      <CredencialQRModal
        branchName={null}
        enrollmentDateText={null}
        nativeID="student-home-credential-qr-modal"
        onClose={() => setShowQR(false)}
        organizationName={null}
        studentFullName={profile.full_name}
        studentPhotoUrl={profile.photo_url}
        testID="student-home-credential-qr-modal"
        uniqueCode={profile.unique_code}
        visible={showQR}
      />
    </Screen>
  );
}

const AVATAR_SIZE = 56;

const styles = StyleSheet.create({
  root: {
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  greeting: {
    color: colors.text,
    fontFamily: typography.displayFamily,
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 32,
  },
  subGreeting: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.xs,
  },
  avatarPressable: {
    borderRadius: AVATAR_SIZE / 2,
    height: AVATAR_SIZE,
    overflow: "hidden",
    width: AVATAR_SIZE,
  },
  avatarPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  avatarImg: {
    height: "100%",
    width: "100%",
  },
  avatarFallback: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: AVATAR_SIZE / 2,
    height: "100%",
    justifyContent: "center",
    width: "100%",
  },
  avatarInitials: {
    color: colors.surface,
    fontFamily: typography.displayFamily,
    fontSize: 20,
    fontWeight: "800",
  },
  qrPressable: {
    alignItems: "center",
    borderRadius: radius.lg,
    height: 280,
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  qrPressed: {
    transform: [{ scale: 0.99 }],
  },
  qrGlow: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    opacity: 0.92,
  },
  qrInner: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xl,
    paddingHorizontal: spacing.xl,
    width: "100%",
  },
  qrLabelStack: {
    flex: 1.1,
    gap: spacing.sm,
  },
  qrEyebrow: {
    color: "rgba(255,255,255,0.75)",
    fontFamily: typography.headingFamily,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  qrTitle: {
    color: "#fff",
    fontFamily: typography.displayFamily,
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 32,
  },
  qrSub: {
    color: "rgba(255,255,255,0.86)",
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 21,
  },
  qrMock: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    height: 180,
    justifyContent: "center",
    padding: spacing.md,
    width: 180,
  },
  qrMockPattern: {
    alignItems: "center",
    gap: spacing.sm,
    height: "100%",
    justifyContent: "center",
    width: "100%",
  },
  qrMockLabel: {
    color: colors.primary,
    fontFamily: typography.displayFamily,
    fontSize: 20,
    fontWeight: "800",
  },
  qrMockCode: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 1,
    textAlign: "center",
  },
  qrTapHint: {
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.18)",
    borderCurve: "continuous",
    borderRadius: radius.lg,
    bottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    position: "absolute",
  },
  qrTapHintLabel: {
    color: "#fff",
    fontFamily: typography.headingFamily,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 17,
    fontWeight: "700",
    marginTop: spacing.sm,
  },
  kpiGrid: {
    columnGap: spacing.md,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: spacing.md,
  },
  kpiCard: {
    flexBasis: "31%",
    flexGrow: 1,
    gap: spacing.sm,
    maxWidth: "33%",
    minWidth: 148,
    padding: spacing.md,
  },
  kpiLabel: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
  kpiValue: {
    color: colors.text,
    fontFamily: typography.displayFamily,
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 36,
  },
  kpiSub: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
    lineHeight: 18,
  },
  quickActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  secondaryPressable: {
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  secondaryLabel: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 14,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
});
