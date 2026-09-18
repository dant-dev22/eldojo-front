import { useNavigation } from "@react-navigation/native";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TextInputKeyPressEventData,
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
  StudentInvitationRedeemPayload,
  StudentInvitationVerifyCodeResponse,
} from "@/types/api";
import { isStudentInvitationRedeemableStatus } from "@/types/api";

import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

const OTP_DIGITS = 6;
const RESEND_COOLDOWN_SECONDS = 60;

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

function formatVerifyCodeError(error: unknown): {
  status?: string;
  message: string;
  cooldown_seconds?: number;
} {
  const message = getErrorMessage(error).trim();
  const normalized = message.toLowerCase();
  const tooManyMatch = message.match(/Espera\s+(\d+)\s+segundos/i);
  if (tooManyMatch) {
    return {
      status: "cooldown",
      message,
      cooldown_seconds: parseInt(tooManyMatch[1] ?? "60", 10),
    };
  }
  if (normalized.includes("código incorrecto") || normalized.includes("codigo incorrecto")) {
    return { status: "wrong_code", message: "Código incorrecto. Revísalo o solicita reenvío." };
  }
  if (normalized.includes("venció") || normalized.includes("vencido")) {
    return { status: "expired_code", message: "El código venció. Solicita un reenvío para continuar." };
  }
  if (normalized.includes("verificar el código") || normalized.includes("codigo")) {
    return { status: "verification_required", message };
  }
  return { status: "generic_error", message: message || "No pudimos verificar el código." };
}

function maskEmailIfNeeded(email: string | null | undefined): string | null {
  if (!email) return null;
  if (email.indexOf("@") <= 0) return email;
  const [local, domain] = email.split("@", 2);
  const maskedLocal = local.length <= 1
    ? "*".repeat(local.length)
    : `${local[0]}${"*".repeat(Math.max(1, local.length - 1))}`;
  if (domain.indexOf(".") < 1) {
    return `${maskedLocal}@${"*".repeat(domain.length)}`;
  }
  const [dn, tld] = domain.split(/\.(.*)$/, 2);
  const maskedDn = dn.length <= 1
    ? "*".repeat(dn.length)
    : `${dn[0]}${"*".repeat(Math.max(1, dn.length - 1))}`;
  return `${maskedLocal}@${maskedDn}.${tld}`;
}

type Step = "otp" | "profile";

export function ActivateAccountScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { redeemStudentInvitation } = useAuth();
  const token = useMemo(() => getTokenFromUrl(), []);

  const previewMutation = useMutation({
    mutationFn: authApi.getStudentInvitationPreview,
  });
  const verifyCodeMutation = useMutation({
    mutationFn: authApi.verifyStudentInvitationCode,
  });
  const resendCodeMutation = useMutation({
    mutationFn: authApi.resendStudentInvitationCode,
  });
  const redeemMutation = useMutation({
    mutationFn: redeemStudentInvitation,
  });

  const [currentStep, setCurrentStep] = useState<Step>("profile");
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [otpValues, setOtpValues] = useState<string[]>(() => Array(OTP_DIGITS).fill(""));
  const [verifyInlineError, setVerifyInlineError] = useState<string | null>(null);
  const [verifyInlineStatus, setVerifyInlineStatus] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [resendFeedback, setResendFeedback] = useState<string | null>(null);

  const [formEmail, setFormEmail] = useState("");
  const [formFirstName, setFormFirstName] = useState("");
  const [formLastName, setFormLastName] = useState("");
  const [formNewPassword, setFormNewPassword] = useState("");
  const [formConfirmPassword, setFormConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<string | null>(null);

  const otpRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    if (!token) return;
    previewMutation.mutate(token);
  }, [previewMutation, token]);

  useEffect(() => {
    if (!previewMutation.data) return;
    const preview = previewMutation.data;
    if (!isStudentInvitationRedeemableStatus(preview.status)) return;

    const suggested =
      preview.suggested_email ||
      null;
    const firstName = preview.first_name || preview.student_first_name || "";
    const lastName = preview.last_name || preview.student_last_name || "";

    if (suggested) setFormEmail(suggested);
    if (firstName) setFormFirstName(firstName);
    if (lastName) setFormLastName(lastName);

    const codeRequired =
      preview.verification_code_sent === true &&
      preview.verification_code_verified !== true;
    if (codeRequired) {
      setCurrentStep("otp");
    } else {
      setCurrentStep("profile");
    }
  }, [previewMutation.data]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setTimeout(() => setResendCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(id);
  }, [resendCooldown]);

  const preview = previewMutation.data;
  const redeemable = Boolean(preview && isStudentInvitationRedeemableStatus(preview.status));

  const otpRequiresVerification =
    redeemable &&
    Boolean(preview?.verification_code_sent) &&
    !Boolean(preview?.verification_code_verified) &&
    challengeToken == null;

  const emailForDisplay = useMemo(() => {
    if (preview?.verification_code_masked_email) {
      return preview.verification_code_masked_email;
    }
    return maskEmailIfNeeded(preview?.suggested_email ?? preview?.student_first_name ? null : preview?.suggested_email) ||
      maskEmailIfNeeded(preview?.suggested_email) ||
      maskEmailIfNeeded(formEmail) ||
      "tu correo";
  }, [preview, formEmail]);

  const allOtpFilled = otpValues.every((v) => v.trim().length === 1);

  function navigateToPage(page: PublicPageKey) {
    navigation.navigate(PUBLIC_PAGE_TO_SCREEN[page]);
  }

  function focusOtpCell(index: number) {
    const ref = otpRefs.current[index];
    if (ref && typeof ref.focus === "function") {
      ref.focus();
    }
  }

  function clearOtp() {
    setOtpValues(Array(OTP_DIGITS).fill(""));
    setVerifyInlineError(null);
    setVerifyInlineStatus(null);
    setTimeout(() => focusOtpCell(0), 0);
  }

  function setOtpDigit(index: number, rawValue: string) {
    const digitsOnly = rawValue.replace(/\D/g, "");
    const nextValues = [...otpValues];
    let cursor = index;
    if (digitsOnly.length === 0) {
      nextValues[index] = "";
      setOtpValues(nextValues);
      return;
    }
    for (let i = 0; i < digitsOnly.length && cursor < OTP_DIGITS; i++) {
      nextValues[cursor] = digitsOnly[i];
      cursor++;
    }
    setOtpValues(nextValues);
    setVerifyInlineError(null);
    setVerifyInlineStatus(null);
    const nextFocus = Math.min(OTP_DIGITS - 1, cursor);
    setTimeout(() => focusOtpCell(nextFocus), 0);
  }

  function handleOtpKeyPress(
    index: number,
    ev: NativeSyntheticEvent<TextInputKeyPressEventData>,
  ) {
    const key = ev.nativeEvent.key;
    if (key === "Backspace" && index > 0 && !otpValues[index]) {
      setTimeout(() => focusOtpCell(index - 1), 0);
    }
  }

  async function handleConfirmCode() {
    setVerifyInlineError(null);
    setVerifyInlineStatus(null);
    setResendFeedback(null);
    if (!token || !allOtpFilled) return;

    const code = otpValues.join("");
    try {
      const result: StudentInvitationVerifyCodeResponse = await verifyCodeMutation.mutateAsync({
        token,
        code,
      });
      if (result.status === "ok" || result.status === "already_verified") {
        if (result.challenge_token) {
          setChallengeToken(result.challenge_token);
        }
        setCurrentStep("profile");
        return;
      }
      if (result.status === "code_required") {
        setChallengeToken(null);
        setCurrentStep("profile");
        setResendFeedback(result.message || "No se requiere verificación en este momento.");
        return;
      }
      setVerifyInlineStatus(result.status || "unknown");
      setVerifyInlineError(result.message || "No pudimos confirmar el código.");
      clearOtp();
    } catch (err) {
      const info = formatVerifyCodeError(err);
      setVerifyInlineStatus(info.status || "generic_error");
      setVerifyInlineError(info.message);
      clearOtp();
    }
  }

  async function handleResendCode() {
    if (!token) return;
    if (resendCooldown > 0) return;
    setVerifyInlineError(null);
    setVerifyInlineStatus(null);
    setResendFeedback(null);
    try {
      const result = await resendCodeMutation.mutateAsync({ token, code: "" });
      if (result.status === "ok") {
        setResendFeedback(result.message || "Te reenviamos el código. Revisa tu bandeja.");
        clearOtp();
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
        return;
      }
      if (result.status === "code_required") {
        setChallengeToken(null);
        setCurrentStep("profile");
        setResendFeedback(result.message || "No se requiere verificación en este momento.");
        return;
      }
      setResendFeedback(result.message || "No pudimos reenviar el código. Intenta de nuevo.");
    } catch (err) {
      const info = formatVerifyCodeError(err);
      setResendFeedback(info.message);
      if (info.status === "cooldown" && typeof info.cooldown_seconds === "number" && info.cooldown_seconds > 0) {
        setResendCooldown(Math.min(RESEND_COOLDOWN_SECONDS, Math.max(1, info.cooldown_seconds)));
      }
    }
  }

  const canSubmitProfile = Boolean(
    token &&
      previewMutation.isSuccess &&
      redeemable &&
      formEmail.trim() &&
      formFirstName.trim() &&
      formLastName.trim() &&
      formNewPassword &&
      formNewPassword.length >= 8 &&
      formNewPassword === formConfirmPassword &&
      acceptTerms &&
      !redeemMutation.isPending,
  );

  async function handleActivateAccount() {
    setProfileFeedback(null);
    if (!canSubmitProfile) {
      if (!acceptTerms) setProfileFeedback("terms");
      return;
    }
    const payload: StudentInvitationRedeemPayload = {
      token,
      new_password: formNewPassword,
      confirm_password: formConfirmPassword,
      accept_terms: true,
    };
    if (formEmail.trim()) payload.email = formEmail.trim().toLowerCase();
    if (formFirstName.trim()) payload.first_name = formFirstName.trim();
    if (formLastName.trim()) payload.last_name = formLastName.trim();
    if (challengeToken) payload.challenge_token = challengeToken;
    try {
      await redeemMutation.mutateAsync(payload);
    } catch (err) {
      const msg = formatRedeemError(err);
      setProfileFeedback(msg === "terms" ? null : msg);
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

  if (redeemMutation.isSuccess) {
    return (
      <PublicPageChrome
        actionItems={[]}
        idPrefix="screens-auth-activate-account"
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

  const previewError = previewMutation.error ? formatInvitationError(previewMutation.error) : null;
  const redeemError = redeemMutation.error ? formatRedeemError(redeemMutation.error) : null;

  const showStepOtp =
    currentStep === "otp" && otpRequiresVerification && challengeToken == null;

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
            <Text style={styles.title}>Confirma tu identidad y activa tu cuenta.</Text>
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
            {showStepOtp ? (
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Código enviado a</Text>
                <Text style={styles.previewCodeEmail}>{emailForDisplay}</Text>
              </View>
            ) : null}
          </View>

          {!redeemable ? (
            <Text style={styles.description}>
              {previewError ?? "No pudimos cargar la invitación con ese enlace."}
            </Text>
          ) : null}

          {redeemable && showStepOtp ? (
            <View style={styles.stepBlock}>
              <Text style={styles.stepHeading}>Paso 1 de 2: Confirmar cuenta</Text>
              <Text style={styles.stepSubheading}>
                Ingresa el código de 6 dígitos que enviamos a {emailForDisplay}.
                El código vence en 24 horas.
              </Text>

              <View
                style={styles.otpRow}
                onStartShouldSetResponder={() => {
                  Keyboard.dismiss();
                  return false;
                }}
              >
                {Array.from({ length: OTP_DIGITS }).map((_, i) => {
                  const hasError =
                    verifyInlineStatus === "wrong_code" ||
                    verifyInlineStatus === "expired_code";
                  const value = otpValues[i] || "";
                  const nextRef = (el: TextInput | null) => {
                    otpRefs.current[i] = el;
                  };
                  return (
                    <View
                      key={i}
                      style={[
                        styles.otpCellWrap,
                        value ? styles.otpCellWrapFilled : null,
                        hasError ? styles.otpCellWrapError : null,
                      ]}
                    >
                      <TextInput
                        autoComplete="one-time-code"
                        autoCorrect={false}
                        autoCapitalize="none"
                        caretHidden
                        inputMode="numeric"
                        keyboardType={Platform.OS === "web" ? "numeric" : "number-pad"}
                        maxLength={1}
                        onChangeText={(v) => setOtpDigit(i, v)}
                        onKeyPress={(e) => handleOtpKeyPress(i, e)}
                        placeholder=""
                        ref={nextRef}
                        returnKeyType={i === OTP_DIGITS - 1 ? "done" : "next"}
                        secureTextEntry={false}
                        spellCheck={false}
                        style={styles.otpCellInput}
                        value={value}
                      />
                    </View>
                  );
                })}
              </View>

              {(verifyInlineError || verifyInlineStatus === "wrong_code") && (
                <Text style={styles.fieldHintDanger}>{verifyInlineError}</Text>
              )}
              {resendFeedback ? (
                <Text style={styles.fieldHintNeutral}>{resendFeedback}</Text>
              ) : null}

              <AppButton
                label="Confirmar cuenta"
                loading={verifyCodeMutation.isPending}
                onPress={handleConfirmCode}
                disabled={!allOtpFilled}
              />

              <View style={styles.resendRow}>
                {resendCooldown > 0 ? (
                  <Text style={styles.resendMuted}>
                    Reenvía el código en {resendCooldown}s.
                  </Text>
                ) : (
                  <Pressable
                    onPress={handleResendCode}
                    style={({ pressed }) => [
                      styles.resendLink,
                      pressed ? { opacity: 0.7 } : null,
                    ]}
                    disabled={resendCodeMutation.isPending}
                  >
                    <Text style={styles.resendLinkText}>
                      {resendCodeMutation.isPending
                        ? "Reenviando..."
                        : "No llegó el código? Reenviar"}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          ) : null}

          {redeemable && currentStep === "profile" ? (
            <View style={styles.stepBlock}>
              {preview?.verification_code_sent || challengeToken ? (
                <Text style={styles.stepHeading}>
                  {preview?.verification_code_verified || challengeToken
                    ? "Paso 2 de 2: Personaliza tu acceso"
                    : "Completa tus datos para activar el portal"}
                </Text>
              ) : (
                <Text style={styles.stepHeading}>Personaliza tu acceso al portal</Text>
              )}
              <Text style={styles.stepSubheading}>
                Una vez actives tu cuenta, podrás entrar al portal con tu correo y tu
                nueva contraseña.
              </Text>

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
                  testID="activate-account-accept-terms"
                  trackColor={{ false: colors.border, true: colors.primary }}
                  value={acceptTerms}
                />
                <Text style={styles.termsLabel}>
                  Acepto los <Text style={styles.termsBold}>términos y condiciones</Text> y el{" "}
                  <Text style={styles.termsBold}>aviso de privacidad</Text>.
                </Text>
              </View>

              {formNewPassword && formNewPassword.length < 8 ? (
                <Text style={styles.fieldHintDanger}>
                  La contraseña debe tener al menos 8 caracteres.
                </Text>
              ) : null}
              {formNewPassword &&
              formConfirmPassword &&
              formNewPassword !== formConfirmPassword ? (
                <Text style={styles.fieldHintDanger}>Las contraseñas no coinciden.</Text>
              ) : null}
              {!acceptTerms && profileFeedback === "terms" ? (
                <Text style={styles.fieldHintDanger}>
                  Debes aceptar los términos para continuar.
                </Text>
              ) : null}
              {(redeemError || (profileFeedback && profileFeedback !== "terms")) ? (
                <Text style={styles.feedback}>{redeemError ?? profileFeedback}</Text>
              ) : null}

              <AppButton
                label="Activar mi cuenta"
                loading={redeemMutation.isPending}
                onPress={handleActivateAccount}
              />
            </View>
          ) : null}
        </AppCard>
      </View>
    </PublicPageChrome>
  );
}

const otpCellSize = 52;

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
  previewCodeEmail: {
    color: agedWood,
    fontFamily: typography.headingFamily,
    fontWeight: "700",
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
  otpRow: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  otpCellWrap: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 2,
    height: otpCellSize,
    justifyContent: "center",
    minWidth: otpCellSize,
    overflow: "hidden",
    width: otpCellSize,
  },
  otpCellWrapFilled: {
    borderColor: agedWood,
    backgroundColor: agedWoodSoft,
  },
  otpCellWrapError: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
  },
  otpCellInput: {
    color: colors.text,
    fontFamily: typography.displayFamily,
    fontSize: 22,
    fontWeight: "800",
    height: "100%",
    textAlign: "center",
    width: "100%",
  },
  fieldHintDanger: {
    color: colors.danger ?? "#b91c1c",
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 19,
  },
  fieldHintNeutral: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 19,
  },
  resendRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  resendLink: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  resendLinkText: {
    color: agedWood,
    fontFamily: typography.headingFamily,
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  resendMuted: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
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
  feedback: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 21,
  },
});
