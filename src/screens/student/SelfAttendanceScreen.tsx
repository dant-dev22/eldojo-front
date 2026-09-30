import { Feather } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";

import { studentAttendanceApi } from "@/api/studentAttendanceApi";
import { getErrorMessage } from "@/api/http";
import { AppButton } from "@/components/AppButton";
import {
  colors,
  judogiRed,
  judogiRedSoft,
  radius,
  spacing,
  tatamiGreen as matchaGreen,
  tatamiGreenSoft as matchaGreenSoft,
  transitions,
  typography,
} from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { formatDateTime } from "@/utils/format";

import type { Attendance } from "@/types/api";
import type { StudentStackParamList } from "@/navigation/types";

type SelfAttendanceStatus = "loading" | "awaiting-class" | "success" | "error";

export function SelfAttendanceScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const queryClient = useQueryClient();
  const { isDesktop } = useResponsiveLayout();
  const { width: windowWidth } = useWindowDimensions();
  const { user } = useAuth();

  const routeParams = (route.params ?? {}) as StudentStackParamList["SelfAttendance"];
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<Attendance | null>(null);
  const [countdownToHome, setCountdownToHome] = useState<number | null>(null);

  const resolvedParams = useMemo(() => {
    let classId = routeParams?.classId;
    let source = routeParams?.source;

    if (Platform.OS === "web" && typeof window !== "undefined") {
      try {
        const url = new URL(window.location.href);
        const rawClass = url.searchParams.get("class");
        if (rawClass) {
          const parsed = Number(rawClass);
          if (Number.isFinite(parsed) && parsed > 0) classId = parsed;
        }
        const rawSource = url.searchParams.get("source");
        if (rawSource === "qr" || rawSource === "manual") source = rawSource;
      } catch {
        /* noop */
      }
    }

    return { classId, source: source ?? "qr" };
  }, [routeParams]);

  const containerMaxWidth = isDesktop ? 680 : Math.min(windowWidth - spacing.xl * 2, 560);

  const registerMutation = useMutation<
    Attendance,
    Error,
    { classId: number; source?: "qr" | "manual" }
  >({
    mutationFn: async ({ classId, source }) => {
      return studentAttendanceApi.selfRegister({
        class_id: classId,
        source: source ?? "qr",
      });
    },
    onSuccess: async (attendance) => {
      setResult(attendance);
      setErrorMessage(null);
      setCountdownToHome(5);
      try {
        await queryClient.invalidateQueries({ queryKey: ["student-attendance-history"] });
        await queryClient.invalidateQueries({ queryKey: ["student-dashboard"] });
      } catch {
        /* noop */
      }
    },
    onError: (err) => {
      setErrorMessage(getErrorMessage(err) ?? "No fue posible registrar tu asistencia.");
      setResult(null);
    },
  });

  useEffect(() => {
    if (!resolvedParams.classId) return;
    if (registerMutation.isPending || registerMutation.isSuccess) return;
    setErrorMessage(null);
    setResult(null);
    registerMutation.mutate({
      classId: resolvedParams.classId,
      source: resolvedParams.source as any,
    });
    return () => {
      registerMutation.reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedParams.classId, resolvedParams.source]);

  useEffect(() => {
    if (countdownToHome == null) return;
    if (countdownToHome <= 0) {
      navigation.navigate("StudentHome");
      return;
    }
    const id = setTimeout(() => setCountdownToHome((prev) => (prev == null ? prev : prev - 1)), 1000);
    return () => clearTimeout(id);
  }, [countdownToHome, navigation]);

  const currentStatus: SelfAttendanceStatus = useMemo(() => {
    if (!resolvedParams.classId) return "awaiting-class";
    if (registerMutation.isPending) return "loading";
    if (registerMutation.isSuccess) return "success";
    if (registerMutation.isError || errorMessage) return "error";
    return "loading";
  }, [errorMessage, registerMutation.isError, registerMutation.isPending, registerMutation.isSuccess, resolvedParams.classId]);

  const retryRegister = useCallback(() => {
    if (!resolvedParams.classId) return;
    setErrorMessage(null);
    setResult(null);
    registerMutation.reset();
    registerMutation.mutate({
      classId: resolvedParams.classId,
      source: resolvedParams.source as any,
    });
  }, [registerMutation, resolvedParams.classId, resolvedParams.source]);

  return (
    <View style={styles.root} testID="screens-student-self-attendance-root">
      <View style={[styles.container, { maxWidth: containerMaxWidth }]}>
        <View style={styles.brandRow}>
          <View style={styles.brandMark} />
          <Text style={styles.brandLabel}>El Dojo · Asistencia</Text>
        </View>

        {currentStatus === "loading" ? (
          <View style={styles.statusCard}>
            <ActivityIndicator size="large" color={colors.text} style={styles.statusSpinner} />
            <Text style={styles.statusTitle}>Registrando tu asistencia…</Text>
            <Text style={styles.statusSubtitle}>Estamos validando tu token con la clase seleccionada.</Text>
          </View>
        ) : null}

        {currentStatus === "awaiting-class" ? (
          <View style={styles.statusCard}>
            <View style={[styles.statusIcon, styles.statusIconNeutral]}>
              <Feather name="alert-circle" size={36} color={colors.text} />
            </View>
            <Text style={styles.statusTitle}>Falta el código de clase</Text>
            <Text style={styles.statusSubtitle}>
              Escanea el código QR que aparece en la tablet de recepción para registrar tu asistencia automáticamente.
            </Text>
            <AppButton
              label="Volver a inicio"
              onPress={() => navigation.navigate("StudentHome")}
              style={styles.actionButton}
              variant="secondary"
            />
          </View>
        ) : null}

        {currentStatus === "success" && result ? (
          <View style={[styles.statusCard, styles.statusCardSuccess]}>
            <View style={[styles.statusIcon, styles.statusIconSuccess]}>
              <Feather name="check" size={42} color={matchaGreen} />
            </View>
            <Text style={styles.statusTitleSuccess}>¡Asistencia registrada con éxito!</Text>
            <Text style={styles.statusSubtitleSuccess}>
              {user ? `${user.first_name} ${user.last_name ?? ""}` : "Tu registro"} quedó confirmado en el sistema.
            </Text>
            <View style={styles.resultMetaGrid}>
              <View style={styles.resultMetaRow}>
                <Text style={styles.resultMetaLabel}>Clase</Text>
                <Text style={styles.resultMetaValue}>
                  {(result as any).class_name ?? `Clase #${result.class_id}`}
                </Text>
              </View>
              <View style={styles.resultMetaRow}>
                <Text style={styles.resultMetaLabel}>Fecha y hora</Text>
                <Text style={styles.resultMetaValue}>{formatDateTime(result.created_at)}</Text>
              </View>
              <View style={styles.resultMetaRow}>
                <Text style={styles.resultMetaLabel}>Origen</Text>
                <Text style={styles.resultMetaValue}>
                  {result.method === "qr" ? "Código QR" : "Registro manual"}
                </Text>
              </View>
            </View>
            <View style={styles.successCountdownRow}>
              <Text style={styles.successCountdownLabel}>
                {countdownToHome == null
                  ? "Volviendo al inicio…"
                  : countdownToHome > 0
                    ? `Volviendo al inicio en ${countdownToHome}s…`
                    : "Redirigiendo…"}
              </Text>
            </View>
            <View style={styles.successActions}>
              <AppButton
                label="Ver mi historial"
                onPress={() => navigation.navigate("AttendanceHistory")}
                style={styles.actionButton}
                variant="secondary"
              />
              <AppButton
                label="Volver ahora"
                onPress={() => navigation.navigate("StudentHome")}
                style={styles.actionButton}
              />
            </View>
          </View>
        ) : null}

        {currentStatus === "error" ? (
          <View style={[styles.statusCard, styles.statusCardError]}>
            <View style={[styles.statusIcon, styles.statusIconError]}>
              <Feather name="x-circle" size={42} color={judogiRed} />
            </View>
            <Text style={styles.statusTitleError}>No pudimos registrar tu asistencia</Text>
            <Text style={styles.statusSubtitleError}>
              {errorMessage ?? "Inténtalo nuevamente o avísale al personal de recepción."}
            </Text>
            <View style={styles.successActions}>
              <AppButton
                label="Reintentar"
                onPress={retryRegister}
                style={styles.actionButton}
                loading={registerMutation.isPending}
              />
              <AppButton
                label="Volver a inicio"
                onPress={() => navigation.navigate("StudentHome")}
                style={styles.actionButton}
                variant="secondary"
              />
            </View>
            <Text style={styles.errorFooterHint}>
              Si el problema persiste, utiliza el botón de registro manual en la tablet de recepción.
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actionButton: { flex: 1, minHeight: 52 },
  brandLabel: {
    color: colors.textMuted ?? "#6b7280",
    fontSize: typography.fontSizeSm,
    fontWeight: typography.fontWeightMedium ?? "500",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  brandMark: {
    backgroundColor: colors.text,
    borderRadius: 6,
    height: 10,
    width: 10,
  },
  brandRow: {
    alignItems: "center",
    columnGap: spacing.sm,
    flexDirection: "row",
    marginBottom: spacing.xl * 1.5,
    width: "100%",
  },
  container: {
    alignItems: "center",
    alignSelf: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl ?? spacing.xl * 2,
    width: "100%",
  },
  errorFooterHint: {
    color: colors.textMuted ?? "#6b7280",
    fontSize: typography.fontSizeSm,
    lineHeight: typography.lineHeightRelaxed ?? 20,
    marginTop: spacing.lg,
    textAlign: "center",
  },
  resultMetaGrid: {
    backgroundColor: colors.background,
    borderCurve: "continuous",
    borderRadius: radius.lg ?? 16,
    borderWidth: 1,
    borderColor: colors.border ?? "#e5e7eb",
    marginTop: spacing.lg,
    overflow: "hidden",
    padding: spacing.md,
    rowGap: spacing.md,
    width: "100%",
  },
  resultMetaLabel: {
    color: colors.textMuted ?? "#6b7280",
    fontSize: typography.fontSizeSm,
    fontWeight: typography.fontWeightMedium ?? "500",
    width: 100,
  },
  resultMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  resultMetaValue: {
    color: colors.text,
    flex: 1,
    fontSize: typography.fontSizeBase,
    fontWeight: typography.fontWeightSemibold ?? "600",
    textAlign: "right",
  },
  root: {
    backgroundColor: colors.surface,
    flex: 1,
    minHeight: "100%",
    width: "100%",
  },
  statusCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderCurve: "continuous",
    borderRadius: radius.xl ?? 24,
    borderWidth: 1,
    borderColor: colors.border ?? "#e5e7eb",
    padding: spacing.xxl ?? spacing.xl * 2,
    rowGap: spacing.sm,
    width: "100%",
  },
  statusCardError: {
    borderColor: judogiRedSoft ?? judogiRed,
  },
  statusCardSuccess: {
    borderColor: matchaGreenSoft ?? matchaGreen,
  },
  statusIcon: {
    alignItems: "center",
    borderRadius: 999,
    height: 80,
    justifyContent: "center",
    marginBottom: spacing.lg,
    width: 80,
  },
  statusIconError: {
    backgroundColor: judogiRedSoft ?? "rgba(220, 38, 38, 0.12)",
  },
  statusIconNeutral: {
    backgroundColor: colors.surfaceVariant ?? "#f3f4f6",
  },
  statusIconSuccess: {
    backgroundColor: matchaGreenSoft ?? "rgba(22, 163, 74, 0.12)",
  },
  statusSpinner: {
    marginBottom: spacing.lg,
  },
  statusSubtitle: {
    color: colors.textMuted ?? "#6b7280",
    fontSize: typography.fontSizeBase,
    lineHeight: typography.lineHeightRelaxed ?? 22,
    marginBottom: spacing.lg,
    textAlign: "center",
    width: "100%",
  },
  statusSubtitleError: {
    color: judogiRed,
    fontSize: typography.fontSizeBase,
    lineHeight: typography.lineHeightRelaxed ?? 22,
    marginBottom: spacing.lg,
    textAlign: "center",
    width: "100%",
  },
  statusSubtitleSuccess: {
    color: colors.textMuted ?? "#6b7280",
    fontSize: typography.fontSizeBase,
    lineHeight: typography.lineHeightRelaxed ?? 22,
    textAlign: "center",
    width: "100%",
  },
  statusTitle: {
    color: colors.text,
    fontSize: typography.fontSizeXl,
    fontWeight: typography.fontWeightBold ?? "700",
    textAlign: "center",
    width: "100%",
  },
  statusTitleError: {
    color: judogiRed,
    fontSize: typography.fontSizeXl,
    fontWeight: typography.fontWeightBold ?? "700",
    textAlign: "center",
    width: "100%",
  },
  statusTitleSuccess: {
    color: matchaGreen,
    fontSize: typography.fontSizeXl,
    fontWeight: typography.fontWeightBold ?? "700",
    textAlign: "center",
    width: "100%",
  },
  successActions: {
    columnGap: spacing.md,
    flexDirection: "row",
    marginTop: spacing.lg,
    width: "100%",
  },
  successCountdownLabel: {
    color: colors.textMuted ?? "#6b7280",
    fontSize: typography.fontSizeSm,
    fontWeight: typography.fontWeightMedium ?? "500",
  },
  successCountdownRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.lg,
    width: "100%",
  },
});
