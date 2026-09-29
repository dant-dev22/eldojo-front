import { Feather } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { authApi } from "@/api/authApi";
import { getErrorMessage } from "@/api/http";
import { AppButton } from "@/components/AppButton";
import { AppInput } from "@/components/AppInput";
import { AppModal } from "@/components/AppModal";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import type { PendingAcademyRegistration } from "@/types/api";
import {
  clearPendingAcademyRegistration,
  getPendingAcademyRegistration,
  savePendingAcademyRegistration,
} from "@/utils/storage";

export type AuthMode = "login" | "academy";

interface PublicAuthModalProps {
  visible: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
}

function getWebClassNameProps(className?: string) {
  return Platform.OS === "web" && className ? ({ className } as { className: string }) : {};
}

function countAcademyLetters(value: string): number {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/gi, "").length;
}

function formatAuthError(error: unknown): string {
  const message = getErrorMessage(error).trim();
  const normalized = message.toLowerCase();

  if (normalized.includes("ese usuario ya existe") || normalized.includes("already exists")) {
    return "Ese usuario ya existe.";
  }
  if (normalized.includes("esa academia ya existe")) {
    return "Esa academia ya existe.";
  }
  if (normalized.includes("al menos 3 letras")) {
    return "El nombre de la academia debe tener al menos 3 letras útiles.";
  }
  if (normalized.includes("no existe una cuenta con ese correo")) {
    return "No existe una cuenta con ese correo.";
  }
  if (normalized.includes("la contraseña no es correcta")) {
    return "La contraseña no es correcta.";
  }
  if (normalized.includes("no ha sido confirmada")) {
    return "Tu cuenta aún no ha sido confirmada. Revisa tu correo o solicita un nuevo enlace.";
  }
  return message.endsWith(".") ? message : `${message}.`;
}

function isPendingSessionBlockingError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("ya no es válida") ||
    normalized.includes("ya no es valida") ||
    normalized.includes("expiró") ||
    normalized.includes("expiro") ||
    normalized.includes("consumida")
  );
}

function isConfirmationPendingMessage(message: string | null): boolean {
  return (message ?? "").toLowerCase().includes("confirm");
}

const MASKED_REGISTERED_PASSWORD = "********";

export function PublicAuthModal({ visible, onClose, initialMode = "login" }: PublicAuthModalProps) {
  const { redeemPendingAcademySession, resendAcademyConfirmation, signIn, registerAcademy } = useAuth();

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [academyName, setAcademyName] = useState("");
  const [adminFirstName, setAdminFirstName] = useState("");
  const [adminLastName, setAdminLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formFeedback, setFormFeedback] = useState<string | null>(null);
  const [pendingRegistration, setPendingRegistration] = useState<PendingAcademyRegistration | null>(null);

  useEffect(() => {
    if (visible) {
      setMode(initialMode);
      setFormError(null);
      setFormFeedback(null);
      void restorePendingIfAny();
    }
  }, [visible, initialMode]);

  async function restorePendingIfAny() {
    try {
      const stored = await getPendingAcademyRegistration();
      if (stored) {
        setPendingRegistration(stored);
        setAcademyName(stored.academyName);
        setAdminFirstName(stored.adminFirstName);
        setAdminLastName(stored.adminLastName);
        setEmail(stored.email);
        setPassword("");
        setShowRegisterPassword(false);
        setFormFeedback("Seguimos esperando que confirmes tu correo para activar tu cuenta.");
      }
    } catch {
      /* noop */
    }
  }

  const loginMutation = useMutation({
    mutationFn: signIn,
    onError: (error) => {
      setFormFeedback(null);
      setFormError(formatAuthError(error));
    },
  });

  const registerMutation = useMutation({
    mutationFn: registerAcademy,
    onError: (error) => {
      setFormFeedback(null);
      setFormError(formatAuthError(error));
    },
    onSuccess: async (response) => {
      const nextPendingRegistration: PendingAcademyRegistration = {
        academyName: academyName.trim(),
        adminFirstName: adminFirstName.trim(),
        adminLastName: adminLastName.trim(),
        email: response.email,
        pendingSessionTicket: response.pending_session_ticket,
        pendingSessionExpiresInHours: response.pending_session_expires_in_hours,
        pollingIntervalSeconds: response.polling_interval_seconds,
        verificationExpiresInHours: response.verification_expires_in_hours,
      };
      await savePendingAcademyRegistration(nextPendingRegistration);
      setPendingRegistration(nextPendingRegistration);
      setFormError(null);
      setFormFeedback(response.message);
      setPassword("");
      setShowRegisterPassword(false);
    },
  });

  const resendMutation = useMutation({
    mutationFn: resendAcademyConfirmation,
    onError: (error) => {
      setFormFeedback(null);
      setFormError(formatAuthError(error));
    },
    onSuccess: (response) => {
      setFormError(null);
      setFormFeedback(response.message);
    },
  });

  const redeemPendingSessionMutation = useMutation({
    mutationFn: redeemPendingAcademySession,
    onError: async (error) => {
      await clearPendingAcademyRegistration();
      setPendingRegistration(null);
      setFormFeedback(null);
      setFormError(formatAuthError(error));
    },
  });

  useEffect(() => {
    if (!visible || !pendingRegistration || redeemPendingSessionMutation.isPending || redeemPendingSessionMutation.isSuccess) {
      return;
    }

    let isCancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const scheduleNextPoll = () => {
      timeoutId = setTimeout(() => {
        void pollPendingRegistration();
      }, pendingRegistration.pollingIntervalSeconds * 1000);
    };

    const clearPendingRegistrationState = async (message: string) => {
      await clearPendingAcademyRegistration();
      if (isCancelled) return;
      setPendingRegistration(null);
      setFormFeedback(null);
      setFormError(message);
    };

    const pollPendingRegistration = async () => {
      try {
        const response = await authApi.getAcademyPendingSessionStatus({
          ticket: pendingRegistration.pendingSessionTicket,
        });
        if (isCancelled) return;

        if (response.status === "ready") {
          redeemPendingSessionMutation.mutate(pendingRegistration);
          return;
        }
        if (response.status === "expired" || response.status === "used") {
          await clearPendingRegistrationState(response.message);
          return;
        }
        setFormError(null);
        setFormFeedback(response.message);
      } catch (error) {
        const message = formatAuthError(error);
        if (isCancelled) return;
        if (isPendingSessionBlockingError(message)) {
          await clearPendingRegistrationState(message);
          return;
        }
        setFormError(null);
        setFormFeedback("Seguimos esperando la confirmación del correo. Reintentaremos en unos segundos.");
      }
      if (!isCancelled) {
        scheduleNextPoll();
      }
    };

    void pollPendingRegistration();

    return () => {
      isCancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [visible, pendingRegistration, redeemPendingSessionMutation.isPending, redeemPendingSessionMutation.isSuccess, redeemPendingSessionMutation.mutate]);

  const handleModeChange = (nextMode: AuthMode) => {
    setMode(nextMode);
    setFormError(null);
    setFormFeedback(null);
  };

  const handleLoginSubmit = () => {
    if (!email.trim() || !password.trim()) {
      setFormError("Completa correo y contraseña.");
      return;
    }
    setFormError(null);
    setFormFeedback(null);
    loginMutation.mutate({
      email: email.trim().toLowerCase(),
      password,
    });
  };

  const handleAcademySubmit = () => {
    if (pendingRegistration) return;
    if (
      !academyName.trim() ||
      !adminFirstName.trim() ||
      !adminLastName.trim() ||
      !email.trim() ||
      !password.trim()
    ) {
      setFormError("Completa academia, nombre, apellidos, correo y contraseña.");
      return;
    }
    if (countAcademyLetters(academyName) < 3) {
      setFormError("El nombre de la academia debe tener al menos 3 letras útiles.");
      return;
    }
    if (password.trim().length < 8) {
      setFormError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setFormError(null);
    setFormFeedback(null);
    registerMutation.mutate({
      academy_name: academyName.trim(),
      admin_first_name: adminFirstName.trim(),
      admin_last_name: adminLastName.trim(),
      email: email.trim().toLowerCase(),
      password,
    });
  };

  const handleResendConfirmation = () => {
    if (!email.trim()) {
      setFormFeedback(null);
      setFormError("Escribe el correo de la cuenta para reenviar el enlace.");
      return;
    }
    setFormError(null);
    setFormFeedback(null);
    resendMutation.mutate(email.trim().toLowerCase());
  };

  const handleResetPendingRegistration = () => {
    void clearPendingAcademyRegistration();
    setPendingRegistration(null);
    setFormError(null);
    setFormFeedback(null);
    setPassword("");
    setShowRegisterPassword(false);
  };

  const isAwaitingConfirmation = mode === "academy" && pendingRegistration !== null;

  return (
    <AppModal
      nativeID="components-public-auth-modal"
      testID="components-public-auth-modal"
      visible={visible}
      onClose={onClose}
      title={mode === "academy" ? "Crear cuenta" : "Iniciar sesión"}
      description={
        mode === "academy"
          ? "Registra tu academia y accede hoy mismo al panel de administración."
          : "Accede al panel operativo de tu academia con tu cuenta."
      }
    >
      <View
        nativeID="components-public-auth-modal-tabs"
        style={styles.tabs}
        testID="components-public-auth-modal-tabs"
        {...getWebClassNameProps("components-public-auth-modal-tabs")}
      >
        <Pressable
          accessibilityRole="button"
          nativeID="components-public-auth-modal-tab-academy"
          onPress={() => handleModeChange("academy")}
          style={({ pressed }) => [
            styles.tabButton,
            mode === "academy" ? styles.tabButtonActive : null,
            pressed ? styles.tabButtonPressed : null,
          ]}
          testID="components-public-auth-modal-tab-academy"
        >
          <Text
            nativeID="components-public-auth-modal-tab-academy-label"
            style={[styles.tabLabel, mode === "academy" ? styles.tabLabelActive : null]}
            testID="components-public-auth-modal-tab-academy-label"
          >
            Crear cuenta
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          nativeID="components-public-auth-modal-tab-signin"
          onPress={() => handleModeChange("login")}
          style={({ pressed }) => [
            styles.tabButton,
            mode === "login" ? styles.tabButtonActive : null,
            pressed ? styles.tabButtonPressed : null,
          ]}
          testID="components-public-auth-modal-tab-signin"
        >
          <Text
            nativeID="components-public-auth-modal-tab-signin-label"
            style={[styles.tabLabel, mode === "login" ? styles.tabLabelActive : null]}
            testID="components-public-auth-modal-tab-signin-label"
          >
            Iniciar sesión
          </Text>
        </Pressable>
      </View>

      {mode === "academy" ? (
        <View style={styles.formBody} {...getWebClassNameProps("components-public-auth-modal-form-body")}>
          <Text nativeID="components-public-auth-modal-register-title" style={styles.formTitle} testID="components-public-auth-modal-register-title">
            {isAwaitingConfirmation ? "Esperando confirmación" : "Registra tu academia"}
          </Text>
          <Text nativeID="components-public-auth-modal-register-subtitle" style={styles.formSubtitle} testID="components-public-auth-modal-register-subtitle">
            {isAwaitingConfirmation
              ? "Tu cuenta quedó pendiente de confirmación. Puedes abrir el enlace desde cualquier navegador y esta ventana entrará sola en cuanto detecte la confirmación."
              : "Registra tu academia y crea la cuenta para administrarla hoy mismo."}
          </Text>

          {isAwaitingConfirmation ? (
            <View
              nativeID="components-public-auth-modal-register-pending-state"
              style={styles.pendingConfirmationCard}
              testID="components-public-auth-modal-register-pending-state"
            >
              <View
                nativeID="components-public-auth-modal-register-pending-indicator"
                style={styles.pendingConfirmationIndicator}
                testID="components-public-auth-modal-register-pending-indicator"
              />
              <View style={styles.pendingConfirmationCopy}>
                <Text nativeID="components-public-auth-modal-register-pending-title" style={styles.pendingConfirmationTitle} testID="components-public-auth-modal-register-pending-title">
                  {redeemPendingSessionMutation.isPending
                    ? "Correo confirmado. Entrando a tu panel..."
                    : "Esperando confirmación de correo"}
                </Text>
                <Text nativeID="components-public-auth-modal-register-pending-description" style={styles.pendingConfirmationDescription} testID="components-public-auth-modal-register-pending-description">
                  {redeemPendingSessionMutation.isPending
                    ? "Ya detectamos la confirmación y estamos abriendo tu sesión."
                    : "Mantén esta ventana abierta. El sistema revisará automáticamente el estado de tu cuenta."}
                </Text>
              </View>
            </View>
          ) : null}

          <AppInput
            editable={!isAwaitingConfirmation}
            label="Academia"
            nativeID="components-public-auth-modal-academy-input"
            onChangeText={setAcademyName}
            placeholder="Unión MMA"
            testID="components-public-auth-modal-academy-input"
            value={academyName}
          />
          <AppInput
            editable={!isAwaitingConfirmation}
            label="Nombre"
            nativeID="components-public-auth-modal-first-name-input"
            onChangeText={setAdminFirstName}
            placeholder="Tu nombre"
            testID="components-public-auth-modal-first-name-input"
            value={adminFirstName}
          />
          <AppInput
            editable={!isAwaitingConfirmation}
            label="Apellidos"
            nativeID="components-public-auth-modal-last-name-input"
            onChangeText={setAdminLastName}
            placeholder="Tus apellidos"
            testID="components-public-auth-modal-last-name-input"
            value={adminLastName}
          />
          <AppInput
            autoCapitalize="none"
            autoComplete="email"
            editable={!isAwaitingConfirmation}
            keyboardType="email-address"
            label="Correo"
            nativeID="components-public-auth-modal-register-email-input"
            onChangeText={setEmail}
            placeholder="admin@tuacademia.com"
            testID="components-public-auth-modal-register-email-input"
            value={email}
          />
          {!isAwaitingConfirmation ? (
            <AppInput
              autoComplete="new-password"
              label="Contraseña"
              nativeID="components-public-auth-modal-register-password-input"
              onChangeText={setPassword}
              placeholder="Crea una contraseña"
              rightAdornment={
                <Pressable
                  accessibilityLabel={showRegisterPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  accessibilityRole="button"
                  nativeID="components-public-auth-modal-register-password-toggle"
                  onPress={() => setShowRegisterPassword((current) => !current)}
                  style={({ pressed }) => [styles.passwordToggle, pressed ? styles.passwordTogglePressed : null]}
                  testID="components-public-auth-modal-register-password-toggle"
                >
                  <Feather color={colors.textMuted} name={showRegisterPassword ? "eye-off" : "eye"} size={18} />
                </Pressable>
              }
              secureTextEntry={!showRegisterPassword}
              testID="components-public-auth-modal-register-password-input"
              value={password}
            />
          ) : (
            <AppInput
              editable={false}
              label="Contraseña"
              nativeID="components-public-auth-modal-register-password-input"
              secureTextEntry
              testID="components-public-auth-modal-register-password-input"
              value={MASKED_REGISTERED_PASSWORD}
            />
          )}
          <Text nativeID="components-public-auth-modal-register-helper" style={styles.helper} testID="components-public-auth-modal-register-helper">
            {isAwaitingConfirmation
              ? "Los datos quedaron bloqueados para evitar cambios mientras esperamos la confirmación."
              : "El sufijo interno de la academia se genera con las primeras tres letras útiles del nombre."}
          </Text>
          {formError ? <Text style={styles.error}>{formError}</Text> : null}
          {formFeedback ? <Text style={styles.success}>{formFeedback}</Text> : null}

          {isAwaitingConfirmation ? (
            <View style={styles.formActions}>
              <AppButton
                label="Reenviar enlace"
                loading={resendMutation.isPending}
                nativeID="components-public-auth-modal-resend-button"
                onPress={handleResendConfirmation}
                testID="components-public-auth-modal-resend-button"
              />
              <AppButton
                label="Usar otro correo"
                nativeID="components-public-auth-modal-reset-pending-button"
                onPress={handleResetPendingRegistration}
                testID="components-public-auth-modal-reset-pending-button"
                variant="secondary"
              />
            </View>
          ) : (
            <AppButton
              label="Crear academia"
              disabled={isAwaitingConfirmation}
              loading={registerMutation.isPending}
              nativeID="components-public-auth-modal-register-submit-button"
              onPress={handleAcademySubmit}
              testID="components-public-auth-modal-register-submit-button"
            />
          )}
        </View>
      ) : (
        <View style={styles.formBody} {...getWebClassNameProps("components-public-auth-modal-form-body")}>
          <Text nativeID="components-public-auth-modal-signin-title" style={styles.formTitle} testID="components-public-auth-modal-signin-title">
            Bienvenido de vuelta
          </Text>
          <Text nativeID="components-public-auth-modal-signin-subtitle" style={styles.formSubtitle} testID="components-public-auth-modal-signin-subtitle">
            Inicia sesión con la cuenta administradora de tu academia para entrar al panel operativo.
          </Text>
          <AppInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            label="Correo"
            nativeID="components-public-auth-modal-signin-email-input"
            onChangeText={setEmail}
            placeholder="admin@tuacademia.com"
            testID="components-public-auth-modal-signin-email-input"
            value={email}
          />
          <AppInput
            autoComplete="current-password"
            label="Contraseña"
            nativeID="components-public-auth-modal-signin-password-input"
            onChangeText={setPassword}
            placeholder="Tu contraseña"
            rightAdornment={
              <Pressable
                accessibilityLabel={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                accessibilityRole="button"
                nativeID="components-public-auth-modal-signin-password-toggle"
                onPress={() => setShowPassword((current) => !current)}
                style={({ pressed }) => [styles.passwordToggle, pressed ? styles.passwordTogglePressed : null]}
                testID="components-public-auth-modal-signin-password-toggle"
              >
                <Feather color={colors.textMuted} name={showPassword ? "eye-off" : "eye"} size={18} />
              </Pressable>
            }
            secureTextEntry={!showPassword}
            testID="components-public-auth-modal-signin-password-input"
            value={password}
          />
          {formError ? <Text style={styles.error}>{formError}</Text> : null}
          {formFeedback ? <Text style={styles.success}>{formFeedback}</Text> : null}

          {isConfirmationPendingMessage(formError) ? (
            <AppButton
              label="Reenviar enlace de confirmación"
              loading={resendMutation.isPending}
              nativeID="components-public-auth-modal-signin-resend-button"
              onPress={handleResendConfirmation}
              testID="components-public-auth-modal-signin-resend-button"
              variant="secondary"
            />
          ) : null}
          <AppButton
            label="Entrar"
            loading={loginMutation.isPending}
            nativeID="components-public-auth-modal-signin-submit-button"
            onPress={handleLoginSubmit}
            testID="components-public-auth-modal-signin-submit-button"
          />
        </View>
      )}
    </AppModal>
  );
}

const styles = StyleSheet.create({
  formBody: {
    gap: spacing.sm,
  },
  tabs: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    padding: 4,
  },
  tabButton: {
    alignItems: "center",
    borderRadius: radius.pill,
    flex: 1,
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: spacing.sm,
  },
  tabButtonActive: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderWidth: 1,
  },
  tabButtonPressed: {
    opacity: 0.85,
  },
  tabLabel: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    color: colors.primary,
  },
  formTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0.1,
    lineHeight: 26,
  },
  formSubtitle: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 18,
  },
  pendingConfirmationCard: {
    alignItems: "flex-start",
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    padding: spacing.sm,
  },
  pendingConfirmationIndicator: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: 10,
    marginTop: 3,
    width: 10,
  },
  pendingConfirmationCopy: {
    flex: 1,
    gap: 4,
  },
  pendingConfirmationTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  pendingConfirmationDescription: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
    lineHeight: 17,
  },
  helper: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 11,
    lineHeight: 14,
  },
  error: {
    color: colors.danger,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
    lineHeight: 16,
  },
  success: {
    color: colors.primary,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
    lineHeight: 16,
  },
  passwordToggle: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 28,
    minWidth: 28,
  },
  passwordTogglePressed: {
    opacity: 0.65,
  },
  formActions: {
    gap: spacing.xs,
  },
});

export default PublicAuthModal;
