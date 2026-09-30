import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";

import { publicAttendanceApi } from "@/api/publicAttendanceApi";
import { getErrorMessage } from "@/api/http";
import { AppButton } from "@/components/AppButton";
import { AppCard } from "@/components/AppCard";
import { AppModal } from "@/components/AppModal";
import { AppSelect } from "@/components/AppSelect";
import { SkeletonList } from "@/components/SkeletonLoader";
import { StatusView } from "@/components/StatusView";
import {
  ADMIN_DASHBOARD_SECTION_TO_PATH_SEGMENT,
  ADMIN_ROUTE_SEGMENTS,
} from "@/navigation/publicRoutes";
import {
  colors,
  radius,
  spacing,
  typography,
} from "@/constants/theme";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { slugifyPublicSegment } from "@/utils/publicAttendanceRoute";
import { getDomainConfig } from "@/utils/domains";

import type { Student } from "@/types/api";
import type { PublicAttendanceClassOption } from "@/types/publicAttendance";

export interface QrKioskLauncherModalBranch {
  id: number;
  name: string;
  organization_id: number;
}

export interface QrKioskLauncherModalAssignment {
  organization_id: number;
  organization_name?: string | null;
  organization_slug?: string | null;
  branches?: Array<{ branch_id: number; branch_name?: string | null }>;
}

export interface QrKioskLauncherModalProps {
  visible: boolean;
  onClose: () => void;
  assignments: QrKioskLauncherModalAssignment[];
  branches: QrKioskLauncherModalBranch[];
  onOpenKiosk: (payload: { branchId: number; classId?: number | null }) => void;
  nativeID?: string;
  testID?: string;
}

type SelectionStep = "branch" | "class" | "qr";
type CopyTarget = "tablet" | "student" | null;

interface ClassOptionCard {
  id: number | "all";
  label: string;
  description: string | null;
}

const NO_CLASS_OPTION: ClassOptionCard = {
  id: "all",
  label: "Sin clase predeterminada",
  description: "El alumno elige la clase en la pantalla de registro",
};

export function QrKioskLauncherModal({
  visible,
  onClose,
  assignments,
  branches,
  onOpenKiosk,
  nativeID,
  testID,
}: QrKioskLauncherModalProps) {
  const baseId = nativeID ?? testID ?? "qr-kiosk-launcher-modal";
  const { isDesktop } = useResponsiveLayout();
  const { width: windowWidth } = useWindowDimensions();

  const primaryAssignment = assignments[0] ?? null;
  const availableBranches = useMemo(() => {
    if (branches.length > 0) return branches;
    if (primaryAssignment?.branches && primaryAssignment.branches.length > 0) {
      return primaryAssignment.branches.map((b) => ({
        id: b.branch_id,
        name: b.branch_name ?? `Sucursal ${b.branch_id}`,
        organization_id: primaryAssignment.organization_id,
      }));
    }
    return [] as QrKioskLauncherModalBranch[];
  }, [branches, primaryAssignment]);

  const [step, setStep] = useState<SelectionStep>(
    availableBranches.length <= 1 ? "class" : "branch"
  );
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(
    availableBranches.length === 1 ? availableBranches[0].id : null
  );
  const [selectedClassId, setSelectedClassId] = useState<number | "all" | null>(
    "all"
  );
  const [copyTarget, setCopyTarget] = useState<CopyTarget>(null);
  const [copyFeedback, setCopyFeedback] = useState<"idle" | "copied" | "error">(
    "idle"
  );

  const selectedBranch = useMemo(
    () => availableBranches.find((b) => b.id === selectedBranchId) ?? null,
    [availableBranches, selectedBranchId]
  );

  const organizationSlug = useMemo(() => {
    if (primaryAssignment?.organization_slug) {
      return primaryAssignment.organization_slug;
    }
    if (primaryAssignment?.organization_name) {
      return slugifyPublicSegment(primaryAssignment.organization_name);
    }
    return "";
  }, [primaryAssignment]);

  const contextQuery = useQuery({
    enabled:
      visible &&
      step === "class" &&
      Boolean(selectedBranch && organizationSlug),
    queryKey: [
      "kiosk-launcher-context",
      organizationSlug,
      selectedBranch?.name ?? "",
    ],
    queryFn: () =>
      publicAttendanceApi.getContext(
        organizationSlug,
        slugifyPublicSegment(selectedBranch!.name)
      ),
    retry: false,
  });

  const classOptions: ClassOptionCard[] = useMemo(() => {
    const opts: ClassOptionCard[] = [NO_CLASS_OPTION];
    if (!contextQuery.data?.classes) return opts;
    for (const c of contextQuery.data.classes) {
      const labelParts = [c.name];
      if (c.instructor_name) {
        labelParts.push(c.instructor_name);
      }
      opts.push({
        id: c.id,
        label: labelParts.join(" · "),
        description: c.description,
      });
    }
    return opts;
  }, [contextQuery.data]);

  const { studentQrValue, adminTabletUrl } = useMemo(() => {
    const empty = { studentQrValue: "", adminTabletUrl: "" };
    if (!selectedBranch || !organizationSlug) return empty;

    const domainCfg = getDomainConfig();
    const classNum = typeof selectedClassId === "number" ? selectedClassId : undefined;

    const studentOrigin =
      domainCfg.studentWebOrigin ||
      (Platform.OS === "web" && typeof window !== "undefined"
        ? window.location.origin
        : "");
    const studentQs = new URLSearchParams();
    if (typeof classNum === "number") studentQs.set("class", String(classNum));
    studentQs.set("source", "qr");
    const studentQsStr = studentQs.toString();
    const studentPath = "/alumno/asistencia/registrar";
    const studentQrValue = studentOrigin
      ? `${studentOrigin.replace(/\/$/, "")}${studentPath}${studentQsStr ? `?${studentQsStr}` : ""}`
      : "";

    const appOrigin =
      domainCfg.appWebOrigin ||
      (Platform.OS === "web" && typeof window !== "undefined"
        ? window.location.origin
        : "");
    const kioskSegment =
      ADMIN_DASHBOARD_SECTION_TO_PATH_SEGMENT.attendanceKiosk ??
      ADMIN_ROUTE_SEGMENTS.attendanceKiosk ??
      "asistencias-kiosk";
    const adminQs = new URLSearchParams();
    if (typeof classNum === "number") adminQs.set("class", String(classNum));
    if (selectedBranch) adminQs.set("branch", String(selectedBranch.id));
    const adminQsStr = adminQs.toString();
    const adminTabletPath = `/${ADMIN_ROUTE_SEGMENTS.root}/${kioskSegment}`;
    const adminTabletUrl = appOrigin
      ? `${appOrigin.replace(/\/$/, "")}${adminTabletPath}${adminQsStr ? `?${adminQsStr}` : ""}`
      : "";

    return { studentQrValue, adminTabletUrl };
  }, [selectedBranch, organizationSlug, selectedClassId]);

  function handleReset() {
    setSelectedClassId("all");
    setCopyFeedback("idle");
    setCopyTarget(null);
    if (availableBranches.length <= 1) {
      setStep("class");
    } else {
      setSelectedBranchId(null);
      setStep("branch");
    }
  }

  async function handleCopyToClipboard(rawValue: string, target: CopyTarget) {
    if (!rawValue) return;
    setCopyTarget(target);
    try {
      if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(rawValue);
        setCopyFeedback("copied");
      } else {
        throw new Error("clipboard unavailable");
      }
    } catch {
      if (Platform.OS === "web" && typeof window !== "undefined") {
        try {
          const ta = window.document.createElement("textarea");
          ta.value = rawValue;
          window.document.body.appendChild(ta);
          ta.select();
          window.document.execCommand("copy");
          window.document.body.removeChild(ta);
          setCopyFeedback("copied");
        } catch {
          setCopyFeedback("error");
          Alert.alert(
            "No pudimos copiar el enlace",
            "Copialo manualmente desde la barra de direcciones o desde el código QR."
          );
        }
      } else {
        setCopyFeedback("error");
      }
    } finally {
      const t = window.setTimeout(() => {
        setCopyFeedback("idle");
        setCopyTarget(null);
        window.clearTimeout(t);
      }, 2200);
    }
  }

  function handleOpenTablet() {
    if (!selectedBranch?.id) return;
    const payloadClassId =
      typeof selectedClassId === "number" ? selectedClassId : null;
    try {
      onOpenKiosk({
        branchId: selectedBranch.id,
        classId: payloadClassId,
      });
    } finally {
      onClose();
    }
  }

  const qrSize = Math.min(
    (isDesktop ? 420 : windowWidth - spacing.xl * 4) | 0,
    420
  );

  const renderBranchStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepHint}>
        Seleccioná la sucursal que querés habilitar para la tablet de
        recepción. Si cerrás la sesión más tarde, la pantalla no será accesible.
      </Text>
      {availableBranches.length === 0 ? (
        <StatusView
          title="No hay sucursales configuradas"
          description="Antes de generar la pantalla de recepción, configura al menos una sucursal para tu organización."
        />
      ) : (
        <View style={styles.optionsGrid}>
          {availableBranches.map((branch) => {
            const active = selectedBranchId === branch.id;
            return (
              <Pressable
                key={branch.id}
                onPress={() => {
                  setSelectedBranchId(branch.id);
                  setSelectedClassId("all");
                  setStep("class");
                }}
                style={(state) => [
                  styles.optionCard,
                  active ? styles.optionCardActive : null,
                  state.pressed ? styles.optionCardPressed : null,
                ]}
              >
                <View style={styles.optionIconWrap}>
                  <Feather
                    name="map-pin"
                    size={18}
                    color={active ? colors.onPrimary : colors.text}
                  />
                </View>
                <View style={styles.optionCopy}>
                  <Text
                    style={[
                      styles.optionTitle,
                      active ? { color: colors.onPrimary } : null,
                    ]}
                  >
                    {branch.name}
                  </Text>
                  <Text
                    style={[
                      styles.optionSubtitle,
                      active ? { opacity: 0.82, color: colors.onPrimary } : null,
                    ]}
                  >
                    ID {branch.id} · Organización {branch.organization_id}
                  </Text>
                </View>
                <Feather
                  name="chevron-right"
                  size={16}
                  color={active ? colors.onPrimary : colors.textMuted}
                />
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );

  const renderClassStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepHint}>
        Elegí una clase para pre-fijar el registro, o seleccioná "Sin clase"
        para que cada alumno elija la suya.
      </Text>
      {contextQuery.isLoading ? (
        <SkeletonList count={4} idPrefix={`${baseId}-classes-skeleton`} />
      ) : contextQuery.isError ? (
        <StatusView
          title="No pudimos cargar las clases"
          description={getErrorMessage(contextQuery.error)}
        />
      ) : (
        <View style={styles.optionsGrid}>
          {classOptions.map((opt) => {
            const active = selectedClassId === opt.id;
            return (
              <Pressable
                key={String(opt.id)}
                onPress={() => {
                  setSelectedClassId(opt.id);
                  setCopyFeedback("idle");
                  setCopyTarget(null);
                  setStep("qr");
                }}
                style={(state) => [
                  styles.optionCard,
                  active ? styles.optionCardActive : null,
                  state.pressed ? styles.optionCardPressed : null,
                ]}
              >
                <View style={styles.optionIconWrap}>
                  <Feather
                    name={opt.id === "all" ? "calendar" : "book-open"}
                    size={18}
                    color={active ? colors.onPrimary : colors.text}
                  />
                </View>
                <View style={styles.optionCopy}>
                  <Text
                    style={[
                      styles.optionTitle,
                      active ? { color: colors.onPrimary } : null,
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {opt.description ? (
                    <Text
                      style={[
                        styles.optionSubtitle,
                        active
                          ? { opacity: 0.82, color: colors.onPrimary }
                          : null,
                      ]}
                    >
                      {opt.description}
                    </Text>
                  ) : null}
                </View>
                <Feather
                  name="chevron-right"
                  size={16}
                  color={active ? colors.onPrimary : colors.textMuted}
                />
              </Pressable>
            );
          })}
        </View>
      )}
      {step !== "branch" && availableBranches.length > 1 ? (
        <View style={styles.footerActionsRow}>
          <AppButton
            label="Volver a sucursales"
            variant="secondary"
            onPress={() => {
              setSelectedBranchId(null);
              setSelectedClassId("all");
              setStep("branch");
            }}
          />
        </View>
      ) : null}
    </View>
  );

  const copyStudentLabel =
    copyTarget === "student"
      ? copyFeedback === "copied"
        ? "¡Enlace alumno copiado!"
        : copyFeedback === "error"
        ? "Reintentar copia"
        : "Copiar enlace QR alumno"
      : "Copiar enlace QR alumno";

  const copyTabletLabel =
    copyTarget === "tablet"
      ? copyFeedback === "copied"
        ? "¡Enlace tablet copiado!"
        : copyFeedback === "error"
        ? "Reintentar copia"
        : "Copiar enlace tablet"
      : "Copiar enlace tablet";

  const renderQrStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.qrHeaderRow}>
        <View style={styles.qrHeaderCopy}>
          <Text style={styles.qrHeaderTitle}>Pantalla de recepción lista</Text>
          <Text style={styles.qrHeaderSubtitle}>
            Sucursal: {selectedBranch?.name ?? ""}
            {typeof selectedClassId === "number"
              ? ` · Clase ID ${selectedClassId}`
              : ""}
          </Text>
          <Text style={styles.qrHeaderWarning}>
            La tablet requiere sesión iniciada. Si cerrás sesión, la pantalla no
            estará accesible.
          </Text>
        </View>
      </View>

      <AppCard nativeID={`${baseId}-qr-card`} style={styles.qrCard}>
        <View style={styles.qrCenterer}>
          {studentQrValue ? (
            <QRCode
              value={studentQrValue}
              size={qrSize}
              color={colors.text}
              backgroundColor={colors.surface}
              quietZone={6}
              logo={undefined}
              logoSize={0}
              logoBackgroundColor="transparent"
              ecl="M"
            />
          ) : (
            <View
              style={[
                styles.qrFallback,
                { width: qrSize, height: qrSize },
              ]}
            >
              <StatusView
                title="No se pudo generar el QR"
                description="Faltan datos de organización o sucursal."
              />
            </View>
          )}
        </View>
        <Text style={styles.qrHintTitle}>Los alumnos escanean con su teléfono</Text>
        <Text style={styles.qrHintSubtitle}>
          Deben iniciar sesión en el portal del alumno. Al escanear el código su
          asistencia se registra automáticamente mediante su token.
        </Text>
        <View style={styles.qrUrlRow}>
          <Text style={styles.qrUrlLabel}>Enlace QR alumno</Text>
          <Text numberOfLines={2} style={styles.qrUrlText}>
            {studentQrValue || "-"}
          </Text>
        </View>
        <View style={styles.qrUrlRow}>
          <Text style={styles.qrUrlLabel}>Enlace tablet (requiere sesión)</Text>
          <Text numberOfLines={2} style={styles.qrUrlText}>
            {adminTabletUrl || "-"}
          </Text>
        </View>
        <View style={styles.qrActionsRow}>
          <AppButton
            label="Abrir modo tablet"
            leftIcon={
              <Feather
                name="smartphone"
                size={16}
                color={colors.onPrimary}
              />
            }
            nativeID={`${baseId}-open-kiosk-button`}
            onPress={handleOpenTablet}
            testID={`${baseId}-open-kiosk-button`}
            variant="primary"
          />
          <AppButton
            label={copyTabletLabel}
            leftIcon={
              copyTarget === "tablet" && copyFeedback === "copied" ? (
                <Feather name="check" size={16} color={colors.text} />
              ) : (
                <Feather name="link" size={16} color={colors.text} />
              )
            }
            nativeID={`${baseId}-copy-tablet-button`}
            onPress={() => handleCopyToClipboard(adminTabletUrl, "tablet")}
            testID={`${baseId}-copy-tablet-button`}
            variant="secondary"
          />
          <AppButton
            label={copyStudentLabel}
            leftIcon={
              copyTarget === "student" && copyFeedback === "copied" ? (
                <Feather name="check" size={16} color={colors.text} />
              ) : (
                <Feather name="qr-code" size={16} color={colors.text} />
              )
            }
            nativeID={`${baseId}-copy-student-button`}
            onPress={() => handleCopyToClipboard(studentQrValue, "student")}
            testID={`${baseId}-copy-student-button`}
            variant="secondary"
          />
        </View>
        {copyFeedback === "copied" && copyTarget ? (
          <Text style={styles.copyFeedbackOk}>
            Listo. El enlace{" "}
            {copyTarget === "tablet"
              ? "de la tablet (requiere sesión)"
              : "QR del alumno"}{" "}
            ya está en el portapapeles.
          </Text>
        ) : null}
      </AppCard>

      <View style={styles.footerActionsRow}>
        <AppButton label="Elegir otra clase" onPress={handleReset} variant="secondary" />
      </View>
    </View>
  );

  const stepTitle =
    step === "branch"
      ? "Pantalla de recepción · Elegir sucursal"
      : step === "class"
      ? "Pantalla de recepción · Elegir clase"
      : "Pantalla de recepción · QR listo";

  const stepDescription =
    step === "branch"
      ? "Elegí la sucursal donde vas a dejar la tablet abierta. La pantalla requiere sesión iniciada."
      : step === "class"
      ? "Pre-seleccioná una clase para fijar el contexto del registro, o permití que cada alumno elija la suya."
      : "Usá el QR para que los alumnos se autoregistren, o abrí directamente el modo tablet para la recepción.";

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title={stepTitle}
      description={stepDescription}
      nativeID={baseId}
      testID={baseId}
      backdropClosable
      closeButtonEnabled
    >
      {step === "branch"
        ? renderBranchStep()
        : step === "class"
        ? renderClassStep()
        : renderQrStep()}
    </AppModal>
  );
}

const styles = StyleSheet.create({
  stepContainer: {
    gap: spacing.md,
  },
  stepHint: {
    ...typography.bodyMd,
    color: colors.textMuted,
  },
  optionsGrid: {
    gap: spacing.sm,
  },
  optionCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  optionCardActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionCardPressed: {
    opacity: 0.92,
  },
  optionIconWrap: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.04)",
    borderRadius: radius.sm,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  optionCopy: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    ...typography.bodyLg,
    color: colors.text,
    fontWeight: "600",
  },
  optionSubtitle: {
    ...typography.bodySm,
    color: colors.textMuted,
  },
  footerActionsRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  qrHeaderRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  qrHeaderCopy: {
    gap: 4,
  },
  qrHeaderTitle: {
    ...typography.titleMd,
    color: colors.text,
    fontWeight: "700",
  },
  qrHeaderSubtitle: {
    ...typography.bodySm,
    color: colors.textMuted,
  },
  qrHeaderWarning: {
    ...typography.bodySm,
    color: colors.text,
    fontWeight: "500",
    marginTop: spacing.xs ?? 4,
  },
  qrCard: {
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
  },
  qrCenterer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
  },
  qrFallback: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  qrHintTitle: {
    ...typography.titleSm,
    color: colors.text,
    fontWeight: "700",
    textAlign: "center",
  },
  qrHintSubtitle: {
    ...typography.bodyMd,
    color: colors.textMuted,
    textAlign: "center",
  },
  qrUrlLabel: {
    ...typography.caption ?? typography.bodySm,
    color: colors.textMuted,
    fontSize: typography.fontSizeXs ?? 11,
    fontWeight: "600",
    marginBottom: 2,
    textTransform: "uppercase",
  },
  qrUrlRow: {
    backgroundColor: "rgba(0,0,0,0.04)",
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    width: "100%",
  },
  qrUrlText: {
    ...typography.bodySm,
    color: colors.text,
    fontFamily: typography.mono?.fontFamily ?? typography.bodySm.fontFamily,
  },
  qrActionsRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "center",
    width: "100%",
  },
  copyFeedbackOk: {
    ...typography.bodyMd,
    color: "#137333",
    fontWeight: "600",
    textAlign: "center",
  },
});
