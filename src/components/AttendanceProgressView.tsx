import { Feather } from "@expo/vector-icons";
import { useEffect, useMemo } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { AppBadge } from "@/components/AppBadge";
import {
  agedWood as woodAged,
  agedWoodSoft as woodSoftAccent,
  colors,
  goldenYellow as amber,
  goldenYellowSoft as amberSoft,
  indigoBlue as indigo,
  indigoBlueSoft as indigoSoft,
  judogiRed,
  judogiRedSoft as judogiRedSoft,
  radius,
  spacing,
  tatamiGreen as matchaGreen,
  tatamiGreenSoft as matchaGreenSoft,
  typography,
} from "@/constants/theme";

export type AttendanceProcessMode = "qr" | "manual";

export type AttendanceStepStatus = "pending" | "active" | "done" | "error";

export interface AttendanceSuccessPayload {
  attendance_id: number;
  student_name: string;
  class_name: string | null;
  selected_class_name?: string | null;
  check_in_at?: string | null;
}

export interface AttendanceProgressViewProps {
  mode: AttendanceProcessMode;
  lookupStatus: AttendanceStepStatus;
  registerStatus: AttendanceStepStatus;
  overallStatus: "processing" | "success" | "error";
  errorMessage: string | null;
  successPayload: AttendanceSuccessPayload | null;
  successCountdown: number | null;
  onRetry: () => void;
  nativeID?: string;
  testID?: string;
}

const STEP_LABELS_QR = [
  "Código QR detectado",
  "Buscando alumno",
  "Registrando asistencia",
  "Asistencia confirmada",
];

const STEP_LABELS_MANUAL = [
  "Registro iniciado",
  "Alumno confirmado",
  "Registrando asistencia",
  "Asistencia confirmada",
];

export function AttendanceProgressView({
  mode,
  lookupStatus,
  registerStatus,
  overallStatus,
  errorMessage,
  successPayload,
  successCountdown,
  onRetry,
  nativeID,
  testID,
}: AttendanceProgressViewProps) {
  const baseId = nativeID ?? testID ?? "attendance-progress-view";
  const labels = mode === "qr" ? STEP_LABELS_QR : STEP_LABELS_MANUAL;

  const stepStatuses = useMemo<AttendanceStepStatus[]>(() => {
    if (overallStatus === "error") {
      const erroredIndex = lookupStatus === "error" ? 1 : registerStatus === "error" ? 2 : 3;
      return labels.map((_, idx) => {
        if (idx < erroredIndex) return "done";
        if (idx === erroredIndex) return "error";
        return "pending";
      });
    }
    if (overallStatus === "success") {
      return labels.map(() => "done" as AttendanceStepStatus);
    }
    const firstPending = lookupStatus === "active" ? 1 : registerStatus === "active" ? 2 : 1;
    return labels.map((_, idx) => {
      if (idx === 0) return "done";
      if (idx < firstPending) return "done";
      if (idx === firstPending) return "active";
      return "pending";
    });
  }, [labels, lookupStatus, registerStatus, overallStatus]);

  useEffect(() => {
    let mounted = true;
    return () => {
      mounted = false;
    };
  }, []);

  const renderStepIcon = (status: AttendanceStepStatus, index: number) => {
    if (status === "done") {
      return (
        <View style={[styles.stepIconCircle, styles.stepIconDone]}>
          <Feather name="check" size={14} color="#FFFFFF" />
        </View>
      );
    }
    if (status === "error") {
      return (
        <View style={[styles.stepIconCircle, styles.stepIconError]}>
          <Feather name="x" size={14} color="#FFFFFF" />
        </View>
      );
    }
    if (status === "active") {
      return (
        <View style={[styles.stepIconCircle, styles.stepIconActive]}>
          <Feather name="loader" size={14} color="#FFFFFF" />
        </View>
      );
    }
    return (
      <View style={[styles.stepIconCircle, styles.stepIconPending]}>
        <Text style={styles.stepIconNumber}>{index + 1}</Text>
      </View>
    );
  };

  const renderConnector = (status: AttendanceStepStatus, isLast: boolean) => {
    if (isLast) return null;
    return (
      <View
        style={[
          styles.stepConnector,
          status === "done" ? styles.stepConnectorDone : styles.stepConnectorPending,
        ]}
      />
    );
  };

  const isSuccess = overallStatus === "success";
  const isError = overallStatus === "error";

  try {
  return (
    <View nativeID={baseId} style={styles.container} testID={baseId}>
      <View
        nativeID={`${baseId}-stepper`}
        style={styles.stepperColumn}
        testID={`${baseId}-stepper`}
      >
        {labels.map((label, idx) => {
          const status = stepStatuses[idx];
          const isLast = idx === labels.length - 1;
          return (
            <View key={`step-${idx}`} style={styles.stepRow}>
              <View style={styles.stepIconColumn}>
                {renderStepIcon(status, idx)}
                {renderConnector(status, isLast)}
              </View>
              <View style={styles.stepLabelColumn}>
                <Text
                  style={[
                    styles.stepLabel,
                    status === "active" ? styles.stepLabelActive : null,
                    status === "done" ? styles.stepLabelDone : null,
                    status === "error" ? styles.stepLabelError : null,
                    status === "pending" ? styles.stepLabelPending : null,
                  ]}
                >
                  {label}
                </Text>
                {status === "active" ? (
                  <Text style={styles.stepSubActive}>Procesando…</Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>

      {isSuccess && successPayload ? (
        <View
          nativeID={`${baseId}-success-card`}
          style={styles.successCard}
          testID={`${baseId}-success-card`}
        >
          <View style={styles.successTopRow}>
            <View style={styles.successIconWrap}>
              <Feather name="check-circle" size={22} color={matchaGreen} />
            </View>
            <AppBadge label="Asistencia confirmada" tone="success" />
          </View>
          <View style={styles.successDivider} />
          <Text style={styles.successTitle}>¡Registro completado con éxito!</Text>
          <View style={styles.successMetaGrid}>
            <View style={styles.successMetaItem}>
              <Feather name="user" size={14} color={woodAged} />
              <Text style={styles.successTextLabel}>Alumno</Text>
              <Text style={styles.successTextValue}>{successPayload.student_name}</Text>
            </View>
            <View style={styles.successMetaItem}>
              <Feather name="calendar" size={14} color={woodAged} />
              <Text style={styles.successTextLabel}>Clase</Text>
              <Text style={styles.successTextValue}>
                {successPayload.class_name ?? successPayload.selected_class_name ?? "Clase general"}
              </Text>
            </View>
            <View style={styles.successMetaItem}>
              <Feather name="hash" size={14} color={woodAged} />
              <Text style={styles.successTextLabel}>Folio</Text>
              <Text style={styles.successTextValue}>#{successPayload.attendance_id}</Text>
            </View>
          </View>
          {successCountdown !== null && successCountdown > 0 ? (
            <Text style={styles.countdownText}>
              Listo para el siguiente en {successCountdown} segundo
              {successCountdown === 1 ? "" : "s"}…
            </Text>
          ) : null}
        </View>
      ) : null}

      {isError ? (
        <View
          nativeID={`${baseId}-error-card`}
          style={styles.errorCard}
          testID={`${baseId}-error-card`}
        >
          <View style={styles.errorTopRow}>
            <View style={styles.errorIconWrap}>
              <Feather name="alert-triangle" size={22} color={judogiRed} />
            </View>
            <AppBadge label="No se pudo completar" tone="danger" />
          </View>
          <View style={styles.errorDivider} />
          <Text style={styles.errorTitle}>El registro no pudo finalizar</Text>
          <View style={styles.errorMessageRow}>
            <Feather name="info" size={14} color={woodAged} />
            <Text style={styles.errorMessage}>{errorMessage ?? "Error desconocido"}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={onRetry}
            style={({ pressed }) => {
              const hovered = (pressed as unknown as { hovered?: boolean }).hovered;
              return [
                styles.retryButton,
                pressed || hovered ? styles.retryButtonHover : null,
              ];
            }}
          >
            <Feather name="refresh-cw" size={16} color={colors.onPrimary} />
            <Text style={styles.retryButtonLabel}>
              {mode === "qr" ? "Volver a escanear" : "Volver a intentar"}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
  } catch (e) {
    return (
      <View nativeID={`${baseId}-error-fallback`} testID={`${baseId}-error-fallback`} style={{ gap: 12, padding: 20, backgroundColor: judogiRedSoft, borderRadius: 12, borderWidth: 1, borderColor: "rgba(198,40,40,0.28)" }}>
        <Text style={{ fontWeight: "800", color: judogiRed }}>No se pudo mostrar el progreso</Text>
        <Text style={{ fontSize: 12, color: colors.textMuted, lineHeight: 16 }}>Vuelve a intentarlo o usa el ingreso manual. Si el problema persiste, contacta al administrador.</Text>
        <Text style={{ fontFamily: "monospace", fontSize: 10, color: woodAged, lineHeight: 14, opacity: 0.8 }}>Detalle: {String(e)}</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
    width: "100%",
  },
  stepperColumn: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    width: "100%",
  },
  stepRow: {
    flexDirection: "row",
    minHeight: 44,
    width: "100%",
  },
  stepIconColumn: {
    alignItems: "center",
    marginRight: spacing.md,
    width: 28,
  },
  stepIconCircle: {
    alignItems: "center",
    borderRadius: 999,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  stepIconDone: {
    backgroundColor: matchaGreen,
  },
  stepIconActive: {
    backgroundColor: indigo,
  },
  stepIconError: {
    backgroundColor: judogiRed,
  },
  stepIconPending: {
    backgroundColor: woodSoftAccent,
  },
  stepIconNumber: {
    color: woodAged,
    fontFamily: typography.headingFamily,
    fontSize: 12,
    fontWeight: "800",
  },
  stepConnector: {
    borderRadius: 999,
    flex: 1,
    marginTop: spacing.xs,
    width: 3,
  },
  stepConnectorDone: {
    backgroundColor: matchaGreen,
    opacity: 0.55,
  },
  stepConnectorPending: {
    backgroundColor: woodSoftAccent,
  },
  stepLabelColumn: {
    flex: 1,
    gap: 2,
    paddingBottom: spacing.sm,
    paddingTop: 2,
  },
  stepLabel: {
    fontFamily: typography.headingFamily,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.15,
    lineHeight: 20,
  },
  stepLabelActive: {
    color: indigo,
  },
  stepLabelDone: {
    color: matchaGreen,
  },
  stepLabelError: {
    color: judogiRed,
  },
  stepLabelPending: {
    color: colors.textMuted,
    opacity: 0.82,
  },
  stepSubActive: {
    color: indigo,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
    fontWeight: "500",
    opacity: 0.85,
  },
  successCard: {
    backgroundColor: matchaGreenSoft,
    borderColor: "rgba(85, 139, 47, 0.3)",
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
    width: "100%",
    ...Platform.select({
      web: {
        boxShadow: "0 14px 40px rgba(85,139,47,0.12)",
      },
    } as any),
  },
  successTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  successIconWrap: {
    alignItems: "center",
    backgroundColor: matchaGreen,
    borderRadius: 999,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  successDivider: {
    alignSelf: "center",
    backgroundColor: matchaGreen,
    borderRadius: 999,
    height: 3,
    opacity: 0.65,
    width: 40,
  },
  successTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 26,
    textAlign: "center",
  },
  successMetaGrid: {
    gap: spacing.sm,
  },
  successMetaItem: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    width: "100%",
  },
  successTextLabel: {
    color: woodAged,
    fontFamily: typography.headingFamily,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
    width: 60,
  },
  successTextValue: {
    color: colors.text,
    flex: 1,
    fontFamily: typography.headingFamily,
    fontSize: 14,
    fontWeight: "700",
  },
  countdownText: {
    color: matchaGreen,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
    textAlign: "center",
  },
  errorCard: {
    backgroundColor: judogiRedSoft,
    borderColor: "rgba(198, 40, 40, 0.28)",
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
    width: "100%",
  },
  errorTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  errorIconWrap: {
    alignItems: "center",
    backgroundColor: judogiRed,
    borderRadius: 999,
    height: 44,
    justifyContent: "center",
    shadowColor: judogiRed,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    width: 44,
  },
  errorDivider: {
    alignSelf: "center",
    backgroundColor: judogiRed,
    borderRadius: 999,
    height: 3,
    opacity: 0.55,
    width: 40,
  },
  errorTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 19,
    fontWeight: "800",
    lineHeight: 25,
    textAlign: "center",
  },
  errorMessageRow: {
    alignItems: "flex-start",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  errorMessage: {
    color: colors.text,
    flex: 1,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 19,
  },
  retryButton: {
    alignItems: "center",
    backgroundColor: woodAged,
    borderRadius: radius.md,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    width: "100%",
    ...Platform.select({
      web: {
        transition: `background-color 160ms ease, transform 120ms ease`,
      } as any,
    }),
  },
  retryButtonHover: {
    backgroundColor: "#6D4C41",
    transform: [{ translateY: -1 }],
  },
  retryButtonLabel: {
    color: colors.onPrimary,
    fontFamily: typography.headingFamily,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.25,
  },
});
