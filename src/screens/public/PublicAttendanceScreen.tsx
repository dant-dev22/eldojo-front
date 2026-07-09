import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { getErrorMessage } from "@/api/http";
import { publicAttendanceApi } from "@/api/publicAttendanceApi";
import { AppBadge } from "@/components/AppBadge";
import { AppButton } from "@/components/AppButton";
import { AppCard } from "@/components/AppCard";
import { AppInput } from "@/components/AppInput";
import { AppSelect } from "@/components/AppSelect";
import { PublicQrScanner } from "@/components/publicAttendance/PublicQrScanner";
import { Screen } from "@/components/Screen";
import { StatusView } from "@/components/StatusView";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { getPublicAttendanceRoute } from "@/utils/publicAttendanceRoute";

import type { PublicAttendanceResult, PublicAttendanceRouteParams } from "@/types/publicAttendance";

interface PublicAttendanceScreenProps {
  routeParams?: PublicAttendanceRouteParams | null;
}

function formatRouteLabel(routeParams: PublicAttendanceRouteParams) {
  return `${routeParams.organizationSlug} / ${routeParams.branchSlug}`;
}

export function PublicAttendanceScreen({ routeParams }: PublicAttendanceScreenProps) {
  const resolvedRoute = routeParams ?? getPublicAttendanceRoute();
  const { contentMaxWidth, isDesktop } = useResponsiveLayout();
  const [studentCode, setStudentCode] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [scannerEnabled, setScannerEnabled] = useState(false);
  const [scannerMessage, setScannerMessage] = useState<string | null>(null);
  const [manualQrToken, setManualQrToken] = useState("");
  const [result, setResult] = useState<PublicAttendanceResult | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const contextQuery = useQuery({
    enabled: Boolean(resolvedRoute),
    queryKey: ["public-attendance-context", resolvedRoute?.organizationSlug, resolvedRoute?.branchSlug],
    queryFn: () =>
      publicAttendanceApi.getContext(resolvedRoute!.organizationSlug, resolvedRoute!.branchSlug),
  });

  const registerMutation = useMutation({
    mutationFn: async (qrToken: string) =>
      publicAttendanceApi.register(resolvedRoute!.organizationSlug, resolvedRoute!.branchSlug, {
        student_code: studentCode.trim().toUpperCase(),
        class_id: selectedClassId ? Number(selectedClassId) : null,
        qr_token: qrToken,
      }),
    onSuccess: (response) => {
      setResult(response);
      setFormError(null);
      setScannerMessage(null);
      setScannerEnabled(false);
      setManualQrToken("");
    },
    onError: (error) => {
      setFormError(getErrorMessage(error));
      setScannerEnabled(false);
    },
  });

  const classItems = useMemo(
    () =>
      (contextQuery.data?.classes ?? []).map((classOption) => ({
        label: classOption.instructor_name
          ? `${classOption.name} · ${classOption.instructor_name}`
          : classOption.name,
        value: String(classOption.id),
      })),
    [contextQuery.data?.classes]
  );

  const selectedClassName = useMemo(
    () => contextQuery.data?.classes.find((item) => item.id === Number(selectedClassId))?.name ?? null,
    [contextQuery.data?.classes, selectedClassId]
  );

  const openScanner = useCallback(() => {
    if (!studentCode.trim()) {
      setFormError("Ingresa el ID o codigo del alumno antes de abrir la camara.");
      return;
    }
    if (!selectedClassId) {
      setFormError("Selecciona la clase disponible para continuar.");
      return;
    }

    setResult(null);
    setManualQrToken("");
    setScannerMessage("Camara lista. Acerca el QR de la sucursal al recuadro.");
    setFormError(null);
    setScannerEnabled(true);
  }, [selectedClassId, studentCode]);

  const resetFlow = useCallback(() => {
    setStudentCode("");
    setSelectedClassId("");
    setManualQrToken("");
    setResult(null);
    setFormError(null);
    setScannerEnabled(false);
    setScannerMessage(null);
  }, []);

  const submitManualQr = useCallback(() => {
    if (!manualQrToken.trim()) {
      setFormError("Pega el contenido del QR para registrar la asistencia.");
      return;
    }

    setFormError(null);
    registerMutation.mutate(manualQrToken.trim());
  }, [manualQrToken, registerMutation]);

  const handleQrDetected = useCallback(
    (qrToken: string) => {
      setScannerMessage("QR detectado. Registrando asistencia...");
      registerMutation.mutate(qrToken);
    },
    [registerMutation]
  );

  const handleScannerError = useCallback((message: string) => {
    setScannerMessage(message);
  }, []);

  if (!resolvedRoute) {
    return (
      <StatusView
        title="Ruta de asistencia no disponible"
        description="Abre esta experiencia desde una URL como /equipo/sucursal/asistencias."
      />
    );
  }

  if (contextQuery.isLoading) {
    return (
      <StatusView
        title="Cargando asistencias"
        description={`Preparando el acceso publico para ${formatRouteLabel(resolvedRoute)}.`}
        loading
      />
    );
  }

  if (contextQuery.isError || !contextQuery.data) {
    return (
      <StatusView
        title="No fue posible abrir la asistencia"
        description={getErrorMessage(contextQuery.error)}
      />
    );
  }

  return (
    <Screen scrollable contentStyle={[styles.screenContent, { alignItems: "center" }]}>
      <View style={[styles.layout, { maxWidth: contentMaxWidth }, isDesktop ? desktopStyles.layout : null]}>
        <AppCard style={[styles.heroCard, isDesktop ? desktopStyles.heroCard : null]}>
          <AppBadge label="Registro publico" tone="info" />
          {contextQuery.data.image_url ? (
            <Image resizeMode="cover" source={{ uri: contextQuery.data.image_url }} style={styles.heroImage} />
          ) : (
            <View style={styles.imageFallback}>
              <Feather color={colors.primary} name="shield" size={36} />
            </View>
          )}
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>{contextQuery.data.organization_name}</Text>
            <Text style={styles.heroSubtitle}>{contextQuery.data.branch_name}</Text>
          </View>
          <View style={styles.heroMeta}>
            <Text style={styles.heroMetaText}>Selecciona tu clase, abre la camara y escanea el QR de la sucursal.</Text>
            <Text style={styles.heroMetaText}>El registro se confirma al instante con un mensaje claro en pantalla.</Text>
          </View>
        </AppCard>

        <View style={[styles.mainColumn, isDesktop ? desktopStyles.mainColumn : null]}>
          <AppCard style={styles.formCard}>
            <Text style={styles.sectionTitle}>Registrar asistencia</Text>
            <Text style={styles.sectionDescription}>
              Escribe el ID del alumno o su codigo, elige la clase activa y continua con el escaneo.
            </Text>
            <AppInput
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!registerMutation.isPending}
              label="ID del alumno"
              onChangeText={setStudentCode}
              placeholder="Ejemplo: 125 o ELD-A1B2"
              value={studentCode}
            />
            <AppSelect
              enabled={!registerMutation.isPending}
              items={classItems}
              label="Clase disponible"
              onValueChange={setSelectedClassId}
              placeholder="Selecciona una clase"
              value={selectedClassId}
            />
            {selectedClassName ? (
              <View style={styles.selectionSummary}>
                <AppBadge label="Clase elegida" tone="success" />
                <Text style={styles.selectionSummaryText}>{selectedClassName}</Text>
              </View>
            ) : null}
            {formError ? <Text style={styles.error}>{formError}</Text> : null}
            {scannerMessage ? <Text style={styles.helper}>{scannerMessage}</Text> : null}
            <AppButton
              disabled={registerMutation.isPending}
              label={scannerEnabled ? "Camara abierta" : "Abrir camara"}
              loading={registerMutation.isPending}
              onPress={openScanner}
            />
          </AppCard>

          <AppCard style={styles.scannerCard}>
            <Text style={styles.sectionTitle}>Escanear QR</Text>
            <PublicQrScanner
              active={scannerEnabled && !registerMutation.isPending}
              onDetected={handleQrDetected}
              onError={handleScannerError}
              scanning={registerMutation.isPending}
            />
            <View style={styles.manualEntry}>
              <Text style={styles.manualTitle}>Alternativa manual</Text>
              <Text style={styles.manualDescription}>
                Si tu navegador no soporta lectura automatica, pega aqui el contenido del QR.
              </Text>
              <AppInput
                autoCapitalize="none"
                autoCorrect={false}
                editable={!registerMutation.isPending}
                label="Contenido del QR"
                onChangeText={setManualQrToken}
                placeholder="Pega aqui el token o URL del QR"
                value={manualQrToken}
              />
              <AppButton
                disabled={registerMutation.isPending}
                label="Registrar con codigo"
                loading={registerMutation.isPending}
                onPress={submitManualQr}
                variant="secondary"
              />
            </View>
          </AppCard>

          {result ? (
            <AppCard style={styles.successCard}>
              <AppBadge label="Asistencia registrada" tone="success" />
              <Text style={styles.successTitle}>{result.message}</Text>
              <Text style={styles.successText}>Alumno: {result.student_name}</Text>
              <Text style={styles.successText}>
                Clase: {result.class_name ?? selectedClassName ?? "Clase general"}
              </Text>
              <Text style={styles.successText}>Folio: #{result.attendance_id}</Text>
              <Pressable accessibilityRole="button" onPress={resetFlow} style={styles.resetLink}>
                <Text style={styles.resetLinkText}>Registrar otra asistencia</Text>
              </Pressable>
            </AppCard>
          ) : null}

          <AppCard style={styles.supportCard}>
            <Text style={styles.supportTitle}>Recomendaciones</Text>
            <Text style={styles.supportText}>Usa buena luz, mantén el QR quieto y permite acceso a la camara.</Text>
            <Text style={styles.supportText}>
              {Platform.OS === "web"
                ? "Para mejor compatibilidad usa Chrome o Edge actualizado."
                : "Abre esta experiencia desde navegador para usar el lector QR."}
            </Text>
          </AppCard>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingBottom: spacing["2xl"],
  },
  layout: {
    gap: spacing.lg,
    width: "100%",
  },
  heroCard: {
    gap: spacing.md,
    backgroundColor: colors.surfaceStrong,
    borderColor: "#2E241D",
    overflow: "hidden",
  },
  heroImage: {
    borderRadius: radius.md,
    height: 220,
    width: "100%",
  },
  imageFallback: {
    alignItems: "center",
    backgroundColor: "#241A13",
    borderColor: "#3C2D23",
    borderRadius: radius.md,
    borderWidth: 1,
    height: 220,
    justifyContent: "center",
    width: "100%",
  },
  heroCopy: {
    gap: spacing.xs,
  },
  heroTitle: {
    color: colors.surface,
    fontFamily: typography.displayFamily,
    fontSize: 38,
    fontWeight: "800",
  },
  heroSubtitle: {
    color: "#F6D2B8",
    fontFamily: typography.headingFamily,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  heroMeta: {
    gap: spacing.xs,
  },
  heroMetaText: {
    color: "#D1C2B5",
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 20,
  },
  mainColumn: {
    gap: spacing.lg,
  },
  formCard: {
    gap: spacing.md,
  },
  scannerCard: {
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 22,
    fontWeight: "800",
  },
  sectionDescription: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 20,
  },
  selectionSummary: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  selectionSummaryText: {
    color: colors.text,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
  },
  helper: {
    color: colors.info,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 18,
  },
  error: {
    color: colors.danger,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
  },
  manualEntry: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  manualTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 17,
    fontWeight: "700",
  },
  manualDescription: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 18,
  },
  successCard: {
    backgroundColor: colors.successSoft,
    borderColor: "#B7E4C7",
    gap: spacing.sm,
  },
  successTitle: {
    color: colors.success,
    fontFamily: typography.headingFamily,
    fontSize: 24,
    fontWeight: "800",
  },
  successText: {
    color: colors.text,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 20,
  },
  resetLink: {
    alignSelf: "flex-start",
    paddingVertical: spacing.xs,
  },
  resetLinkText: {
    color: colors.primary,
    fontFamily: typography.headingFamily,
    fontSize: 14,
    fontWeight: "700",
  },
  supportCard: {
    gap: spacing.xs,
  },
  supportTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 18,
    fontWeight: "700",
  },
  supportText: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 18,
  },
});

const desktopStyles = StyleSheet.create({
  layout: {
    alignItems: "flex-start",
    flexDirection: "row",
  },
  heroCard: {
    flex: 0.95,
    minHeight: 760,
    padding: 28,
    position: "sticky" as never,
    top: 20 as never,
  },
  mainColumn: {
    flex: 1.05,
  },
});
