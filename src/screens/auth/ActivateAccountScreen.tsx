import { useNavigation } from "@react-navigation/native";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AppButton } from "@/components/AppButton";
import { AppCard } from "@/components/AppCard";
import { AppInput } from "@/components/AppInput";
import { PublicPageChrome } from "@/components/PublicPageChrome";
import { authApi } from "@/api/authApi";
import { getErrorMessage } from "@/api/http";
import { StatusView } from "@/components/StatusView";
import {
  agedWood,
  agedWoodSoft,
  colors,
  radius,
  shadows,
  spacing,
  typography,
} from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { PUBLIC_PAGE_TO_SCREEN, type PublicPageKey } from "@/navigation/publicRoutes";
import type { AuthStackParamList } from "@/navigation/types";
import type {
  LoginResponse,
  StudentInvitationRedeemPayload,
} from "@/types/api";
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

export function ActivateAccountScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { finalizeStudentActivation } = useAuth();
  const token = useMemo(() => getTokenFromUrl(), []);

  const previewMutation = useMutation({
    mutationFn: authApi.getStudentInvitationPreview,
  });
  const redeemMutation = useMutation({
    mutationFn: authApi.redeemStudentInvitation,
  });

  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formConfirmPassword, setFormConfirmPassword] = useState("");
  const [profileFeedback, setProfileFeedback] = useState<string | null>(null);
  const [activationSuccess, setActivationSuccess] = useState<LoginResponse | null>(null);
  const navigateStartedRef = useRef(false);

  const previewTriedRef = useRef(false);
  useEffect(() => {
    if (!token) return;
    if (previewTriedRef.current) return;
    previewTriedRef.current = true;
    previewMutation.mutate(token);
  }, [previewMutation.mutate, token]);

  useEffect(() => {
    if (!previewMutation.data) return;
    const preview = previewMutation.data;
    if (!isStudentInvitationRedeemableStatus(preview.status)) return;

    const suggested = preview.suggested_email || null;
    if (suggested) setFormEmail(suggested);
  }, [previewMutation.data]);

  useEffect(() => {
    if (formPassword.length === 0 && formConfirmPassword.length > 0) {
      setFormConfirmPassword("");
    }
  }, [formPassword, formConfirmPassword]);

  useEffect(() => {
    if (!activationSuccess) return;
    if (navigateStartedRef.current) return;
    navigateStartedRef.current = true;
    const id = setTimeout(async () => {
      try {
        await finalizeStudentActivation({
          access_token: activationSuccess.access_token,
          refresh_token: activationSuccess.refresh_token,
          expires_in: activationSuccess.expires_in,
          refresh_expires_in: activationSuccess.refresh_expires_in,
          user: activationSuccess.user,
        });
      } catch {
      } finally {
        (navigation as unknown as { navigate: (name: string) => void }).navigate("StudentProfile");
      }
    }, 1500);
    return () => clearTimeout(id);
  }, [activationSuccess, finalizeStudentActivation, navigation]);

  const preview = previewMutation.data;
  const redeemable = Boolean(preview && isStudentInvitationRedeemableStatus(preview.status));

  const confirmPasswordEnabled = formPassword.length >= 1;

  function navigateToPage(page: PublicPageKey) {
    navigation.navigate(PUBLIC_PAGE_TO_SCREEN[page]);
  }

  function handleRetryPreview() {
    previewMutation.reset();
    previewTriedRef.current = false;
    previewMutation.mutate(token);
  }

  const canSubmit = Boolean(
    token &&
      previewMutation.isSuccess &&
      redeemable &&
      formEmail.trim() &&
      formPassword &&
      formPassword.length >= 8 &&
      formPassword === formConfirmPassword &&
      !redeemMutation.isPending &&
      !activationSuccess,
  );

  async function handleActivateAccount() {
    setProfileFeedback(null);
    if (!canSubmit) return;
    const payload: StudentInvitationRedeemPayload = {
      token,
      new_password: formPassword,
      confirm_password: formConfirmPassword,
      accept_terms: true,
    };
    if (formEmail.trim()) payload.email = formEmail.trim().toLowerCase();
    try {
      const response = await redeemMutation.mutateAsync(payload);
      setActivationSuccess(response);
    } catch (err) {
      const msg = formatRedeemError(err);
      setProfileFeedback(msg);
    }
  }

  if (!token) {
    return (
      <PublicPageChrome
        actionItems={[
          {
            key: "sign-in",
            label: "Iniciar sesion",
            onPress: () => navigateToPage("signIn"),
            variant: "primary",
          },
        ]}
        contentContainerStyle={styles.pageContent}
        idPrefix="screens-auth-activate-account"
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
              <Text style={{ fontFamily: typography.displayFamily, color: colors.text }}>
                ?token=
              </Text>{" "}
              en la URL.
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
          {
            key: "sign-in",
            label: "Iniciar sesion",
            onPress: () => navigateToPage("signIn"),
            variant: "secondary",
          },
        ]}
        idPrefix="screens-auth-activate-account"
        navItems={[{ key: "home", label: "Inicio", onPress: () => navigateToPage("home") }]}
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

  if (activationSuccess) {
    return (
      <PublicPageChrome
        actionItems={[]}
        idPrefix="screens-auth-activate-account"
        navItems={[]}
        onBrandPress={() => navigateToPage("home")}
      >
        <View style={styles.container}>
          <AppCard style={[styles.card, styles.heroCard]}>
            <View style={styles.successBanner}>
              <Text style={styles.successCheck}>✓</Text>
              <Text style={styles.successTitle}>¡Cuenta activada correctamente!</Text>
              <Text style={styles.successDescription}>
                Entrando a tu perfil...
              </Text>
            </View>
          </AppCard>
        </View>
      </PublicPageChrome>
    );
  }

  const previewError = previewMutation.error ? formatInvitationError(previewMutation.error) : null;
  const redeemError = redeemMutation.error ? formatRedeemError(redeemMutation.error) : null;

  const dojoLabel = preview?.dojo_name || "tu dojo";
  const fullNamePreview =
    `${preview?.first_name || preview?.student_first_name || ""} ${
      preview?.last_name || preview?.student_last_name || ""
    }`.trim() || null;

  return (
    <PublicPageChrome
      actionItems={[
        {
          key: "sign-in",
          label: "Iniciar sesion",
          onPress: () => navigateToPage("signIn"),
          variant: "secondary",
        },
      ]}
      contentContainerStyle={styles.pageContent}
      idPrefix="screens-auth-activate-account"
      navItems={[
        { key: "home", label: "Inicio", onPress: () => navigateToPage("home") },
        { key: "about", label: "Acerca", onPress: () => navigateToPage("about") },
      ]}
      onBrandPress={() => navigateToPage("home")}
    >
      <View style={styles.container}>
        <AppCard style={[styles.card, styles.heroCard]}>
          <View style={styles.heroHead}>
            <Text style={styles.eyebrow}>Activación de alumno</Text>
            <Text style={styles.title}>Activa tu cuenta del portal.</Text>
            <Text style={styles.description}>
              Hola {fullNamePreview ? `${fullNamePreview}, ` : ""}
              {dojoLabel} te invitó a activar tu acceso al portal del alumno.
            </Text>
          </View>

          <View style={styles.previewBlock}>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Academia</Text>
              <Text style={styles.previewValue}>{dojoLabel}</Text>
            </View>
            {preview?.unique_code ? (
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Código</Text>
                <Text style={styles.previewCode}>{preview.unique_code}</Text>
              </View>
            ) : null}
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Estado</Text>
              <Text
                style={[
                  styles.previewValue,
                  redeemable ? styles.okText : styles.mutedText,
                ]}
              >
                {redeemable
                  ? "Enlace válido"
                  : preview?.status === "expired"
                    ? "Enlace expirado"
                    : preview?.status === "used"
                      ? "Enlace ya utilizado"
                      : "Enlace no válido"}
              </Text>
            </View>
          </View>

          {!redeemable ? (
            <View style={{ gap: spacing.md }}>
              <Text style={styles.description}>
                {previewError ?? "No pudimos cargar la invitación con ese enlace."}
              </Text>
              {previewMutation.isError ? (
                <AppButton
                  label="Reintentar validación"
                  onPress={handleRetryPreview}
                  variant="secondary"
                />
              ) : null}
            </View>
          ) : null}

          {redeemable ? (
            <View style={styles.stepBlock}>
              <Text style={styles.stepHeading}>Personaliza tu acceso al portal</Text>
              <Text style={styles.stepSubheading}>
                Una vez actives tu cuenta, podrás entrar al portal con tu correo y tu
                nueva contraseña.
              </Text>

              <AppInput
                autoCapitalize="none"
                autoComplete="email"
                editable={false}
                keyboardType="email-address"
                label="Correo electrónico"
                onChangeText={setFormEmail}
                placeholder="tu@correo.com"
                value={formEmail}
              />

              <AppInput
                autoCapitalize="none"
                autoComplete="new-password"
                label="Contraseña (mínimo 8 caracteres)"
                onChangeText={setFormPassword}
                placeholder="Ingresa la contraseña para activar la cuenta"
                secureTextEntry
                value={formPassword}
              />

              <AppInput
                autoCapitalize="none"
                autoComplete="new-password"
                editable={confirmPasswordEnabled}
                label="Confirmar contraseña"
                onChangeText={setFormConfirmPassword}
                placeholder={confirmPasswordEnabled ? "••••••••" : "Ingresa primero la contraseña"}
                secureTextEntry
                value={formConfirmPassword}
              />

              {formPassword && formPassword.length < 8 ? (
                <Text style={styles.fieldHintDanger}>
                  La contraseña debe tener al menos 8 caracteres.
                </Text>
              ) : null}
              {formPassword &&
              formConfirmPassword &&
              formPassword !== formConfirmPassword ? (
                <Text style={styles.fieldHintDanger}>Las contraseñas no coinciden.</Text>
              ) : null}
              {(redeemError || profileFeedback) ? (
                <Text style={styles.feedback}>{redeemError ?? profileFeedback}</Text>
              ) : null}

              <AppButton
                label="Activar mi cuenta"
                loading={redeemMutation.isPending}
                onPress={handleActivateAccount}
                disabled={!canSubmit}
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
    padding: spacing.xl,
    width: "100%",
  },
  heroCard: {
    ...shadows.cardElevated,
    borderRadius: radius.lg,
  },
  heroHead: {
    gap: spacing.xs,
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
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 34,
  },
  description: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 15,
    lineHeight: 23,
  },
  previewBlock: {
    backgroundColor: agedWoodSoft,
    borderRadius: radius.md,
    gap: spacing.xs,
    padding: spacing.md,
  },
  previewRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  previewLabel: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 13,
    fontWeight: "600",
  },
  previewValue: {
    color: colors.text,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 21,
  },
  previewCode: {
    color: agedWood,
    fontFamily: typography.displayFamily,
    fontWeight: "700",
    letterSpacing: 1,
  },
  okText: {
    color: colors.success ?? agedWood,
  },
  mutedText: {
    color: colors.textMuted,
  },
  stepBlock: {
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  stepHeading: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 16,
    fontWeight: "700",
  },
  stepSubheading: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 21,
  },
  fieldHintDanger: {
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
  successBanner: {
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
  },
  successCheck: {
    color: colors.success ?? agedWood,
    fontFamily: typography.displayFamily,
    fontSize: 56,
    fontWeight: "800",
  },
  successTitle: {
    color: colors.text,
    fontFamily: typography.displayFamily,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  successDescription: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center",
  },
});
