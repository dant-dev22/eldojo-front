import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";

import { AppButton } from "@/components/AppButton";
import { AppCard } from "@/components/AppCard";
import { AppInput } from "@/components/AppInput";
import { getErrorMessage } from "@/api/http";
import { StatusView } from "@/components/StatusView";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";

function getTokenFromUrl(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return new URLSearchParams(window.location.search).get("token")?.trim() ?? "";
}

function formatConfirmationError(error: unknown): string {
  const message = getErrorMessage(error).trim();
  const normalized = message.toLowerCase();

  if (normalized.includes("ha expirado")) {
    return "Este enlace ya expiró. Puedes solicitar uno nuevo más abajo.";
  }

  if (normalized.includes("ya fue utilizado")) {
    return "Este enlace ya fue utilizado. Si todavía no puedes entrar, solicita uno nuevo.";
  }

  if (normalized.includes("inválido") || normalized.includes("invalido")) {
    return "El enlace de confirmación no es válido.";
  }

  return message.endsWith(".") ? message : `${message}.`;
}

export function ConfirmAccountScreen() {
  const { confirmAcademyAccount, resendAcademyConfirmation } = useAuth();
  const token = useMemo(() => getTokenFromUrl(), []);
  const [hasAttemptedConfirmation, setHasAttemptedConfirmation] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const confirmMutation = useMutation({
    mutationFn: confirmAcademyAccount,
  });

  const resendMutation = useMutation({
    mutationFn: resendAcademyConfirmation,
    onSuccess: (response) => {
      setFeedbackMessage(response.message);
    },
    onError: (error) => {
      setFeedbackMessage(formatConfirmationError(error));
    },
  });

  useEffect(() => {
    if (!token || hasAttemptedConfirmation) {
      return;
    }

    setHasAttemptedConfirmation(true);
    confirmMutation.mutate(token);
  }, [confirmMutation, hasAttemptedConfirmation, token]);

  const confirmationError = confirmMutation.error
    ? formatConfirmationError(confirmMutation.error)
    : null;

  if (token && confirmMutation.isPending) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusView
          description="Estamos validando tu enlace y activando tu cuenta."
          loading
          title="Confirmando cuenta"
        />
      </SafeAreaView>
    );
  }

  if (token && confirmMutation.isSuccess) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusView
          description="Tu cuenta ya fue activada. Te estamos llevando al panel."
          loading
          title="Cuenta confirmada"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <AppCard style={styles.card}>
          <Text style={styles.eyebrow}>Confirmación de cuenta</Text>
          <Text style={styles.title}>Vamos a activar tu academia.</Text>
          <Text style={styles.description}>
            {token
              ? confirmationError ?? "No pudimos completar la confirmación con ese enlace."
              : "Falta el token de confirmación en la URL. Abre el enlace completo que recibiste por correo."}
          </Text>

          <View style={styles.formBlock}>
            <AppInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              label="Correo de la cuenta"
              onChangeText={setResendEmail}
              placeholder="admin@tuacademia.com"
              value={resendEmail}
            />
            {feedbackMessage ? <Text style={styles.feedback}>{feedbackMessage}</Text> : null}
            <AppButton
              label="Reenviar enlace"
              loading={resendMutation.isPending}
              onPress={() => {
                if (!resendEmail.trim()) {
                  setFeedbackMessage("Escribe el correo de la cuenta para reenviar el enlace.");
                  return;
                }
                setFeedbackMessage(null);
                resendMutation.mutate(resendEmail.trim().toLowerCase());
              }}
            />
          </View>
        </AppCard>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  container: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    gap: spacing.md,
    maxWidth: 560,
    width: "100%",
  },
  eyebrow: {
    color: colors.primary,
    fontFamily: typography.headingFamily,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  title: {
    color: colors.text,
    fontFamily: typography.displayFamily,
    fontSize: 32,
    fontWeight: "800",
    lineHeight: 38,
  },
  description: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 15,
    lineHeight: 23,
  },
  formBlock: {
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  feedback: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 21,
  },
});
