import { useNavigation } from "@react-navigation/native";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";

import { AppButton } from "@/components/AppButton";
import { AppCard } from "@/components/AppCard";
import { AppInput } from "@/components/AppInput";
import { PublicPageChrome } from "@/components/PublicPageChrome";
import { authApi } from "@/api/authApi";
import { getErrorMessage } from "@/api/http";
import { StatusView } from "@/components/StatusView";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { PUBLIC_PAGE_TO_SCREEN, type PublicPageKey } from "@/navigation/publicRoutes";
import type { AuthStackParamList } from "@/navigation/types";
import type { StudentInvitationRedeemPayload } from "@/types/api";
import { isStudentInvitationRedeemableStatus } from "@/types/api";

import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

function getTokenFromUrl(): string {
  if (typeof window === "undefined") {
    return "";
  }
  return new URLSearchParams(window.location.search).get("token")?.trim() ?? "";
}

function formatInvitationError(error: unknown): string {
  const message = getErrorMessage(error).trim();
  const normalized = message.toLowerCase();

  if (normalized.includes("expir") || normalized.includes("vencido")) {
    return "Este enlace ya expiró. Contacta a tu academia para solicitar uno nuevo.";
  }
  if (normalized.includes("usado") || normalized.includes("utilizado")) {
    return "Este enlace ya fue utilizado. Si no puedes entrar, contacta a tu academia.";
  }
  if (normalized.includes("inválido") || normalized.includes("invalido")) {
    return "El enlace de activación no es válido. Verifica que sea el mismo de tu correo.";
  }
  return message.endsWith(".") ? message : `${message}.`;
}

function formatRedeemError(error: unknown): string {
  const message = getErrorMessage(error).trim();
  if (!message) return "No fue posible activar la cuenta. Intenta de nuevo.";
  return message.endsWith(".") ? message : `${message}.`;
}

export function StudentActivateScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { redeemStudentInvitation } = useAuth();
  const token = useMemo(() => getTokenFromUrl(), []);

  const [formEmail, setFormEmail] = useState("");
  const [formFirstName, setFormFirstName] = useState("");
  const [formLastName, setFormLastName] = useState("");
  const [formNewPassword, setFormNewPassword] = useState("");
  const [formConfirmPassword, setFormConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const previewMutation = useMutation({
    mutationFn: authApi.getStudentInvitationPreview,
  });

  const redeemMutation = useMutation({
    mutationFn: redeemStudentInvitation,
  });

  useEffect(() => {
    if (!token) return;
    previewMutation.mutate(token);
  }, [previewMutation, token]);

  useEffect(() => {
    if (!previewMutation.data) return;
    const preview = previewMutation.data;
    if (!isStudentInvitationRedeemableStatus(preview.status)) return;
    if (preview.suggested_email) setFormEmail(preview.suggested_email);
    if (preview.student_first_name) setFormFirstName(preview.student_first_name);
    if (preview.student_last_name) setFormLastName(preview.student_last_name);
  }, [previewMutation.data]);

  const canSubmit = Boolean(
    token &&
      previewMutation.isSuccess &&
      isStudentInvitationRedeemableStatus(previewMutation.data.status) &&
      formEmail.trim() &&
      formFirstName.trim() &&
      formLastName.trim() &&
      formNewPassword &&
      formNewPassword.length >= 8 &&
      formNewPassword === formConfirmPassword &&
      acceptTerms &&
      !redeemMutation.isPending
  );

  const navigateToPage = (page: PublicPageKey) => {
    navigation.navigate(PUBLIC_PAGE_TO_SCREEN[page]);
  };

  if (!token) {
    return (
      <PublicPageChrome
        actionItems={[
          { key: "sign-in", label: "Iniciar sesion", onPress: () => navigateToPage("signIn"), variant: "primary" },
        ]}
        contentContainerStyle={styles.pageContent}
        idPrefix="screens-auth-student-activate"
        navItems={[
          { key: "home", label: "Inicio", onPress: () => navigateToPage("home") },
          { key: "about", label: "Acerca", onPress: () => navigateToPage("about") },
        ]}
        onBrandPress={() => navigateToPage("home")}
      >
        <View style={styles.container}>
          <AppCard style={styles.card}>
            <Text style={styles.eyebrow}>Activación de alumno</Text>
            <Text style={styles.title}>Falta el enlace de activación.</Text>
            <Text style={styles.description}>
              Abre el enlace completo que recibiste por correo. Debe incluir el parámetro{" "}
              <Text style={{ fontFamily: typography.displayFamily, color: colors.text }}>?token=</Text> en la URL.
            </Text>
          </AppCard>
        </View>
      </PublicPageChrome>
    );
  }

  if (previewMutation.isPending) {
    return (
      <PublicPageChrome
        actionItems={[
          { key: "sign-in", label: "Iniciar sesion", onPress: () => navigateToPage("signIn"), variant: "secondary" },
        ]}
        idPrefix="screens-auth-student-activate"
        navItems={[
          { key: "home", label: "Inicio", onPress: () => navigateToPage("home") },
        ]}
        onBrandPress={() => navigateToPage("home")}
      >
        <StatusView
          description="Validando tu enlace de invitación y cargando los datos de tu academia."
          loading
          title="Validando invitación"
        />
      </PublicPageChrome>
    );
  }

  if (redeemMutation.isSuccess) {
    return (
      <PublicPageChrome
        actionItems={[]}
        idPrefix="screens-auth-student-activate"
        navItems={[]}
        onBrandPress={() => navigateToPage("home")}
      >
        <StatusView
          description="Tu cuenta ya fue activada. Estamos entrando al portal del alumno..."
          loading
          title="Cuenta activada"
        />
      </PublicPageChrome>
    );
  }

  const preview = previewMutation.data;
  const redeemable = Boolean(preview && isStudentInvitationRedeemableStatus(preview.status));
  const redeemError = redeemMutation.error ? formatRedeemError(redeemMutation.error) : null;
  const previewError = previewMutation.error ? formatInvitationError(previewMutation.error) : null;

  return (
    <PublicPageChrome
      actionItems={[
        { key: "sign-in", label: "Iniciar sesion", onPress: () => navigateToPage("signIn"), variant: "secondary" },
      ]}
      contentContainerStyle={styles.pageContent}
      idPrefix="screens-auth-student-activate"
      navItems={[
        { key: "home", label: "Inicio", onPress: () => navigateToPage("home") },
        { key: "about", label: "Acerca", onPress: () => navigateToPage("about") },
      ]}
      onBrandPress={() => navigateToPage("home")}
    >
      <View style={styles.container}>
        <AppCard style={styles.card}>
          <Text style={styles.eyebrow}>Activación de alumno</Text>
          <Text style={styles.title}>Activa tu acceso al dojo.</Text>
          {preview ? (
            <View style={styles.previewBlock}>
              <Text style={styles.previewRow}>
                <Text style={styles.previewLabel}>Academia: </Text>
                <Text style={styles.previewValue}>{preview.dojo_name}</Text>
              </Text>
              {preview.branch_name ? (
                <Text style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Sucursal: </Text>
                  <Text style={styles.previewValue}>{preview.branch_name}</Text>
                </Text>
              ) : null}
              {preview.unique_code ? (
                <Text style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Código: </Text>
                  <Text style={styles.previewCode}>{preview.unique_code}</Text>
                </Text>
              ) : null}
              <Text style={styles.previewRow}>
                <Text style={styles.previewLabel}>Estado: </Text>
                <Text style={[styles.previewValue, redeemable ? styles.okText : styles.mutedText]}>
                  {redeemable
                    ? "Enlace válido"
                    : preview.status === "expired"
                      ? "Enlace expirado"
                      : preview.status === "used"
                        ? "Enlace ya utilizado"
                        : "Enlace no válido"}
                </Text>
              </Text>
            </View>
          ) : (
            <Text style={styles.description}>
              {previewError ?? "No pudimos cargar la invitación con ese enlace."}
            </Text>
          )}

          {redeemable ? (
            <View style={styles.formBlock}>
              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <AppInput
                    autoCapitalize="words"
                    autoComplete="name-given"
                    label="Nombre (s)"
                    onChangeText={setFormFirstName}
                    placeholder="Juan"
                    value={formFirstName}
                  />
                </View>
                <View style={styles.formCol}>
                  <AppInput
                    autoCapitalize="words"
                    autoComplete="name-family"
                    label="Apellidos"
                    onChangeText={setFormLastName}
                    placeholder="Pérez Gómez"
                    value={formLastName}
                  />
                </View>
              </View>
              <AppInput
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                label="Correo electrónico"
                onChangeText={setFormEmail}
                placeholder="tu@correo.com"
                value={formEmail}
              />
              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <AppInput
                    autoCapitalize="none"
                    autoComplete="new-password"
                    label="Contraseña nueva (mínimo 8 caracteres)"
                    onChangeText={setFormNewPassword}
                    placeholder="••••••••"
                    secureTextEntry
                    value={formNewPassword}
                  />
                </View>
                <View style={styles.formCol}>
                  <AppInput
                    autoCapitalize="none"
                    autoComplete="new-password"
                    label="Confirmar contraseña"
                    onChangeText={setFormConfirmPassword}
                    placeholder="••••••••"
                    secureTextEntry
                    value={formConfirmPassword}
                  />
                </View>
              </View>
              <View style={styles.termsRow}>
                <Switch
                  onValueChange={setAcceptTerms}
                  testID="student-activate-accept-terms"
                  trackColor={{ false: colors.border, true: colors.primary }}
                  value={acceptTerms}
                />
                <Text style={styles.termsLabel}>
                  Acepto los <Text style={styles.termsBold}>términos y condiciones</Text> y el{" "}
                  <Text style={styles.termsBold}>aviso de privacidad</Text>.
                </Text>
              </View>
              {formNewPassword && formNewPassword.length < 8 ? (
                <Text style={styles.fieldHint}>La contraseña debe tener al menos 8 caracteres.</Text>
              ) : null}
              {formNewPassword && formConfirmPassword && formNewPassword !== formConfirmPassword ? (
                <Text style={styles.fieldHint}>Las contraseñas no coinciden.</Text>
              ) : null}
              {!acceptTerms && feedbackMessage === "terms" ? (
                <Text style={styles.fieldHint}>Debes aceptar los términos para continuar.</Text>
              ) : null}
              {(redeemError || feedbackMessage) && feedbackMessage !== "terms" ? (
                <Text style={styles.feedback}>{redeemError ?? feedbackMessage}</Text>
              ) : null}
              <AppButton
                label="Activar mi cuenta"
                loading={redeemMutation.isPending}
                onPress={() => {
                  setFeedbackMessage(null);
                  if (!canSubmit) {
                    if (!acceptTerms) {
                      setFeedbackMessage("terms");
                    }
                    return;
                  }
                  const payload: StudentInvitationRedeemPayload = {
                    token,
                    new_password: formNewPassword,
                    accept_terms: true,
                  };
                  if (formEmail.trim()) payload.email = formEmail.trim().toLowerCase();
                  if (formFirstName.trim()) payload.first_name = formFirstName.trim();
                  if (formLastName.trim()) payload.last_name = formLastName.trim();
                  redeemMutation.mutate(payload);
                }}
              />
            </View>
          ) : null}
        </AppCard>
      </View>
    </PublicPageChrome>
  );
}

const styles = StyleSheet.create({
  pageContent: {
    minHeight: "60%",
  },
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    gap: spacing.md,
    maxWidth: 640,
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
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 36,
  },
  description: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 15,
    lineHeight: 23,
  },
  previewBlock: {
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  previewRow: {
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 21,
  },
  previewLabel: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontWeight: "600",
  },
  previewValue: {
    color: colors.text,
    fontFamily: typography.bodyFamily,
  },
  previewCode: {
    color: colors.primary,
    fontFamily: typography.displayFamily,
    fontWeight: "700",
    letterSpacing: 1,
  },
  okText: {
    color: colors.success ?? colors.primary,
  },
  mutedText: {
    color: colors.textMuted,
  },
  formBlock: {
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  formRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  formCol: {
    flex: 1,
  },
  termsRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
  },
  termsLabel: {
    color: colors.textMuted,
    flex: 1,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 21,
    paddingTop: 2,
  },
  termsBold: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontWeight: "600",
  },
  fieldHint: {
    color: colors.danger ?? "#b91c1c",
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 19,
  },
  feedback: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 21,
  },
});
