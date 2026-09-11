import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { AppButton } from "@/components/AppButton";
import { colors, radius, shadows, spacing, typography } from "@/constants/theme";

interface StudentWelcomeModalProps {
  visible: boolean;
  onDismiss: (save: boolean) => Promise<void> | void;
  nativeID?: string;
  testID?: string;
}

interface WelcomeStep {
  icon: keyof typeof Feather.glyphMap;
  eyebrow: string;
  title: string;
  description: string;
  accentColor: string;
}

const STEPS: WelcomeStep[] = [
  {
    icon: "credit-card",
    eyebrow: "Paso 1 · Tu credencial",
    title: "Tu QR de acceso personal",
    description:
      "Presenta este código en la recepción de tu sucursal para marcar tu asistencia en cada clase. Lo tienes siempre disponible en la pantalla principal.",
    accentColor: colors.primary,
  },
  {
    icon: "bar-chart-2",
    eyebrow: "Paso 2 · Tu progreso",
    title: "Sigue tu evolución en el dojo",
    description:
      "Consulta cuántas clases has tomado este mes, tu racha de días consecutivos y tu historial completo. Cada entrenamiento cuenta.",
    accentColor: colors.success,
  },
  {
    icon: "user",
    eyebrow: "Paso 3 · Tu espacio",
    title: "Gestiona tu perfil y seguridad",
    description:
      "Actualiza tu foto, cambia tu contraseña o tu correo electrónico cuando lo necesites. Todo tu información privada, en un solo lugar.",
    accentColor: colors.info,
  },
];

const TOTAL_STEPS = STEPS.length;

export function StudentWelcomeModal({
  visible,
  onDismiss,
  nativeID,
  testID,
}: StudentWelcomeModalProps) {
  const { width } = useWindowDimensions();
  const [stepIndex, setStepIndex] = useState(0);
  const [dismissing, setDismissing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseId =
    nativeID ?? testID ?? "student-welcome-modal";

  const dialogWidth =
    width >= 768 ? 520 : width - spacing.lg * 2;
  const step = STEPS[stepIndex];
  const isLast = stepIndex === TOTAL_STEPS - 1;

  const advance = () => {
    if (stepIndex < TOTAL_STEPS - 1) {
      setStepIndex((i) => i + 1);
      setError(null);
    }
  };

  const handleDismiss = async (save: boolean) => {
    if (dismissing) return;
    setDismissing(true);
    setError(null);
    try {
      await onDismiss(save);
      setStepIndex(0);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No pudimos guardar tu progreso. Intenta nuevamente."
      );
    } finally {
      setDismissing(false);
    }
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={() => {
        if (!dismissing) void handleDismiss(true);
      }}
      transparent
      visible={visible}
    >
      <View
        nativeID={`${baseId}-overlay`}
        style={styles.overlay}
        testID={`${baseId}-overlay`}
      >
        <Pressable
          nativeID={`${baseId}-backdrop`}
          style={styles.backdrop}
          testID={`${baseId}-backdrop`}
        />
        <View
          nativeID={`${baseId}-wrapper`}
          style={styles.wrapper}
          testID={`${baseId}-wrapper`}
        >
          <View
            nativeID={baseId}
            style={[
              styles.dialog,
              { maxWidth: Math.max(320, dialogWidth) },
            ]}
            testID={baseId}
          >
            <View
              nativeID={`${baseId}-hero`}
              style={[
                styles.hero,
                { backgroundColor: `${step.accentColor}14` },
              ]}
              testID={`${baseId}-hero`}
            >
              <View
                nativeID={`${baseId}-icon`}
                style={[
                  styles.iconBubble,
                  { backgroundColor: `${step.accentColor}1F` },
                ]}
                testID={`${baseId}-icon`}
              >
                <Feather
                  color={step.accentColor}
                  name={step.icon}
                  size={28}
                />
              </View>
              <Text
                nativeID={`${baseId}-eyebrow`}
                style={styles.eyebrow}
                testID={`${baseId}-eyebrow`}
              >
                {step.eyebrow}
              </Text>
              <Text
                nativeID={`${baseId}-title`}
                style={styles.title}
                testID={`${baseId}-title`}
              >
                {step.title}
              </Text>
              <Text
                nativeID={`${baseId}-description`}
                style={styles.description}
                testID={`${baseId}-description`}
              >
                {step.description}
              </Text>
            </View>

            <View
              nativeID={`${baseId}-dots`}
              style={styles.dots}
              testID={`${baseId}-dots`}
            >
              {STEPS.map((s, i) => {
                const active = i === stepIndex;
                const done = i < stepIndex;
                return (
                  <View
                    key={s.eyebrow}
                    nativeID={`${baseId}-dot-${i}`}
                    style={[
                      styles.dot,
                      active && [styles.dotActive, { backgroundColor: step.accentColor }],
                      done && styles.dotDone,
                    ]}
                    testID={`${baseId}-dot-${i}`}
                  />
                );
              })}
            </View>

            {error ? (
              <View
                nativeID={`${baseId}-error`}
                style={styles.error}
                testID={`${baseId}-error`}
              >
                <Feather color={colors.danger} name="alert-circle" size={16} />
                <Text
                  nativeID={`${baseId}-error-text`}
                  style={styles.errorText}
                  testID={`${baseId}-error-text`}
                >
                  {error}
                </Text>
              </View>
            ) : null}

            <View
              nativeID={`${baseId}-actions`}
              style={styles.actions}
              testID={`${baseId}-actions`}
            >
              {!isLast ? (
                <AppButton
                  label="Saltar"
                  loading={dismissing}
                  nativeID={`${baseId}-skip-button`}
                  onPress={() => void handleDismiss(true)}
                  testID={`${baseId}-skip-button`}
                  variant="secondary"
                />
              ) : (
                <View style={{ width: 0 }} />
              )}
              <AppButton
                label={isLast ? "Ir a mi perfil" : "Siguiente"}
                loading={dismissing}
                nativeID={`${baseId}-next-button`}
                onPress={() =>
                  isLast ? void handleDismiss(true) : advance()
                }
                testID={`${baseId}-next-button`}
                variant="primary"
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: colors.overlay,
    flex: 1,
    justifyContent: "center",
    padding: spacing.md,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  dialog: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.xl,
    width: "100%",
    ...shadows.card,
  },
  hero: {
    alignItems: "flex-start",
    borderRadius: radius.md,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  iconBubble: {
    alignItems: "center",
    borderRadius: radius.pill,
    height: 52,
    justifyContent: "center",
    marginBottom: spacing.xs,
    width: 52,
  },
  eyebrow: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  title: {
    color: colors.text,
    fontFamily: typography.displayFamily,
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 30,
  },
  description: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 22,
    marginTop: spacing.xs,
  },
  dots: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
  },
  dot: {
    backgroundColor: colors.border,
    borderRadius: radius.pill,
    height: 8,
    width: 8,
  },
  dotActive: {
    height: 8,
    width: 28,
  },
  dotDone: {
    backgroundColor: colors.textMuted,
  },
  error: {
    alignItems: "center",
    backgroundColor: `${colors.danger}14`,
    borderRadius: radius.md,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  errorText: {
    color: colors.danger,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  actions: {
    columnGap: spacing.sm,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
