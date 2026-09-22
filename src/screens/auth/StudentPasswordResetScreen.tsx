import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AppButton } from "@/components/AppButton";
import { AppCard } from "@/components/AppCard";
import { AppInput } from "@/components/AppInput";
import { LogoSvg } from "@/components/LogoSvg";
import { Screen } from "@/components/Screen";
import { StatusView } from "@/components/StatusView";
import { authApi } from "@/api/authApi";
import { getErrorMessage } from "@/api/http";
import { redirectToPublicLogin } from "@/utils/redirectByRole";
import {
  agedWood,
  colors,
  radius,
  shadows,
  spacing,
  typography,
} from "@/constants/theme";
import type {
  StudentPasswordResetConfirmPayload,
  StudentPasswordResetPreviewResponse,
  StudentPasswordResetStatus,
} from "@/types/api";
import { isStudentPasswordResetRedeemableStatus } from "@/types/api";

const SCREEN_ID = "screens-auth-student-password-reset";
const HOME_URL = "https://eldojo.tech/home";

function getTokenFromUrl(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("token")?.trim() ?? "";
}

function formatResetError(error: unknown): string {
  const message = getErrorMessage(error).trim();
  const normalized = message.toLowerCase();
  if (normalized.includes("expir") || normalized.includes("vencido")) {
    return "Este enlace ya expiró. Contacta a tu dojo para solicitar uno nuevo.";
  }
  if (normalized.includes("usado") || normalized.includes("utilizado")) {
    return "Este enlace ya fue utilizado. Solicita uno nuevo a tu dojo.";
  }
  if (normalized.includes("inválido") || normalized.includes("invalido")) {
    return "El enlace no es válido. Verifica que sea el mismo que recibiste por correo.";
  }
  return message.endsWith(".") ? message : `${message}.`;
}

function computeInitials(firstName: string | null, lastName: string | null): string {
  const parts = [firstName, lastName]
    .map((s) => (s ?? "").trim())
    .filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .map((p) => p.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
}

function getStatusCopy(status: StudentPasswordResetStatus, message: string | null | undefined): {
  title: string;
  description: string;
} {
  switch (status) {
    case "valid":
      return {
        title: "Enlace válido",
        description: message ?? "Ya puedes cambiar tu contraseña.",
      };
    case "used":
      return {
        title: "Enlace ya utilizado",
        description:
          message ?? "Este enlace ya fue usado. Si olvidaste tu contraseña, contacta a tu dojo.",
      };
    case "expired":
      return {
        title: "Enlace expirado",
        description:
          message ?? "Este enlace ya expiró. Contacta a tu dojo para solicitar uno nuevo.",
      };
    default:
      return {
        title: "Enlace no válido",
        description:
          message ?? "El enlace no es válido. Verifica que sea el mismo de tu correo.",
      };
  }
}

export function StudentPasswordResetScreen() {
  const token = useMemo(() => getTokenFromUrl(), []);

  const previewMutation = useMutation({
    mutationFn: authApi.getStudentPasswordResetPreview,
  });
  const confirmMutation = useMutation({
    mutationFn: authApi.confirmStudentPasswordReset,
  });

  const [formEmail] = useState<string>("");
  const [resolvedEmail, setResolvedEmail] = useState<string | null>(null);
  const [formPassword, setFormPassword] = useState("");
  const [formConfirmPassword, setFormConfirmPassword] = useState("");
  const [activated, setActivated] = useState<{ user_email: string } | null>(null);

  useEffect(() => {
    if (!token) return;
    if (previewMutation.isSuccess || previewMutation.isPending) return;
    previewMutation.mutate(token);
  }, [previewMutation, token]);

  const preview: StudentPasswordResetPreviewResponse | null = previewMutation.data ?? null;
  const canRedeem = Boolean(preview && isStudentPasswordResetRedeemableStatus(preview.status));
  const displayEmail = (resolvedEmail ?? preview?.suggested_email ?? formEmail ?? "").trim();

  useEffect(() => {
    const suggested = preview?.suggested_email ?? null;
    if (suggested && !resolvedEmail) {
      setResolvedEmail(suggested);
    }
  }, [preview?.suggested_email, resolvedEmail]);

  useEffect(() => {
    if (formPassword.length === 0 && formConfirmPassword.length > 0) {
      setFormConfirmPassword("");
    }
  }, [formPassword, formConfirmPassword]);

  const passwordOk = formPassword.length >= 8;
  const confirmEnabled = formPassword.length >= 1;
  const passwordsMatch = passwordOk && formPassword === formConfirmPassword;
  const canSubmit = Boolean(
    token &&
      preview &&
      canRedeem &&
      passwordsMatch &&
      !confirmMutation.isPending &&
      !activated,
  );

  async function handleActivate() {
    if (!canSubmit || !token) return;
    const payload: StudentPasswordResetConfirmPayload = {
      token,
      new_password: formPassword,
      confirm_password: formConfirmPassword,
      accept_terms: true,
    };
    try {
      const response = await confirmMutation.mutateAsync(payload);
      setActivated({ user_email: response.user_email });
    } catch {
      /* confirmMutation.error holds readable error via getErrorMessage + formatResetError */
    }
  }

  async function handleGoHome() {
    redirectToPublicLogin({ passwordReset: true });
    if (Platform.OS !== "web" || typeof window === "undefined") {
      try {
        await Linking.openURL(HOME_URL);
      } catch {
        /* noop */
      }
    }
  }

  const profileInitials = computeInitials(
    preview?.first_name ?? null,
    preview?.last_name ?? null,
  );

  const profilePhotoUrl = preview?.photo_url ?? null;

  const dojoName = preview?.dojo_name ?? null;
  const fullName = [preview?.first_name, preview?.last_name]
    .map((s) => (s ?? "").trim())
    .filter(Boolean)
    .join(" ")
    .trim();

  if (!token) {
    return (
      <Screen nativeID={`${SCREEN_ID}-screen`} testID={`${SCREEN_ID}-screen`}>
        <View style={styles.shell}>
          <View style={styles.container}>
            <AppCard style={[styles.card, styles.cardHero]}>
              <Text style={styles.eyebrow}>Cambiar contraseña</Text>
              <Text style={styles.title}>Falta el enlace</Text>
              <Text style={styles.description}>
                Abre el enlace completo que recibiste por correo. Debe incluir el parámetro{" "}
                <Text style={styles.monospace}>?token=</Text> en la URL.
              </Text>
            </AppCard>
          </View>
          <View style={styles.footer}>
            <View style={styles.footerBrand}>
              <LogoSvg size={24} variant="brand-red" />
              <Text style={styles.footerBrandText}>ElDojo</Text>
            </View>
            <Text style={styles.footerCopy}>Sencillez · Orden · Dojo</Text>
          </View>
        </View>
      </Screen>
    );
  }

  if (previewMutation.isPending) {
    return (
      <Screen nativeID={`${SCREEN_ID}-screen`} testID={`${SCREEN_ID}-screen`}>
        <View style={styles.shell}>
          <View style={styles.container}>
            <StatusView
              loading
              title="Validando enlace"
              description="Estamos verificando que el enlace siga vigente."
            />
          </View>
          <View style={styles.footer}>
            <View style={styles.footerBrand}>
              <LogoSvg size={24} variant="brand-red" />
              <Text style={styles.footerBrandText}>ElDojo</Text>
            </View>
            <Text style={styles.footerCopy}>Sencillez · Orden · Dojo</Text>
          </View>
        </View>
      </Screen>
    );
  }

  if (activated) {
    const successEmail = activated.user_email || displayEmail;
    return (
      <Screen nativeID={`${SCREEN_ID}-screen`} testID={`${SCREEN_ID}-screen`}>
        <View style={styles.shell}>
          <View style={styles.container}>
            <AppCard style={[styles.card, styles.cardHero]}>
              <View style={styles.successBanner}>
                <Text style={styles.successCheck}>✓</Text>
                <Text style={styles.successTitle}>Cuenta Activada</Text>
                <Text style={styles.successDescription}>
                  Ya puedes iniciar sesión con tu correo
                  {successEmail ? ` (${successEmail})` : ""} y tu nueva contraseña.
                </Text>
              </View>
              <View style={styles.successActions}>
                <Pressable
                  accessibilityRole="link"
                  hitSlop={8}
                  nativeID={`${SCREEN_ID}-go-home-link`}
                  onPress={handleGoHome}
                  style={(state) => {
                    const pressed = Boolean((state as { pressed?: boolean }).pressed);
                    const hovered = Boolean(
                      (state as { hovered?: boolean }).hovered
                    );
                    return [
                      styles.goHomeLink,
                      pressed ? styles.goHomeLinkPressed : null,
                      hovered ? styles.goHomeLinkHovered : null,
                    ];
                  }}
                  testID={`${SCREEN_ID}-go-home-link`}
                >
                  <Text style={styles.goHomeLinkText}>
                    Ve a eldojo.tech e inicia sesión
                  </Text>
                </Pressable>
              </View>
            </AppCard>
          </View>
          <View style={styles.footer}>
            <View style={styles.footerBrand}>
              <LogoSvg size={24} variant="brand-red" />
              <Text style={styles.footerBrandText}>ElDojo</Text>
            </View>
            <Text style={styles.footerCopy}>Sencillez · Orden · Dojo</Text>
          </View>
        </View>
      </Screen>
    );
  }

  const previewStatus = preview?.status ?? "invalid";
  const statusCopy = getStatusCopy(previewStatus, preview?.message);
  const previewError = previewMutation.error ? formatResetError(previewMutation.error) : null;
  const confirmError = confirmMutation.error ? formatResetError(confirmMutation.error) : null;

  return (
    <Screen nativeID={`${SCREEN_ID}-screen`} testID={`${SCREEN_ID}-screen`}>
      <View style={styles.shell}>
        <View style={styles.container}>
          <AppCard style={[styles.card, styles.cardHero]}>
            <View style={styles.heroHead}>
              <Text style={styles.eyebrow}>Activar cuenta</Text>
              <Text style={styles.title}>Establece tu contraseña</Text>
              <Text style={styles.description}>
                {fullName ? `${fullName}, ` : ""}
                {dojoName ? `${dojoName} te ` : "Tu dojo te "}
                dio acceso al portal. Crea una contraseña segura para activar tu cuenta.
              </Text>
            </View>

            <View style={styles.profileBlock}>
              <View style={styles.profilePicture}>
                {profilePhotoUrl ? (
                  // eslint-disable-next-line @typescript-eslint/no-require-imports
                  null
                ) : (
                  <Text style={styles.profileInitials}>{profileInitials}</Text>
                )}
              </View>
              <View style={styles.profileData}>
                {fullName ? (
                  <Text style={styles.profileName}>{fullName}</Text>
                ) : null}
                {displayEmail ? (
                  <Text style={styles.profileEmail}>{displayEmail}</Text>
                ) : null}
                {dojoName ? (
                  <Text style={styles.profileDojo}>{dojoName}</Text>
                ) : null}
              </View>
            </View>

            {preview ? (
              <View style={styles.statusBlock}>
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Estado del enlace</Text>
                  <Text
                    style={[
                      styles.statusValue,
                      canRedeem ? styles.statusValueOk : styles.statusValueMuted,
                    ]}
                  >
                    {statusCopy.title}
                  </Text>
                </View>
                <Text style={styles.statusDescription}>{statusCopy.description}</Text>
              </View>
            ) : null}

            {previewError ? (
              <View style={styles.feedbackBlock}>
                <Text style={styles.feedbackText}>{previewError}</Text>
              </View>
            ) : null}

            {canRedeem ? (
              <View style={styles.stepBlock}>
                <AppInput
                  editable={false}
                  label="Correo electrónico"
                  placeholder="tu@correo.com"
                  value={displayEmail}
                />

                <AppInput
                  autoCapitalize="none"
                  label="Contraseña (mínimo 8 caracteres)"
                  onChangeText={setFormPassword}
                  placeholder="Ingresa una contraseña segura"
                  secureTextEntry
                  value={formPassword}
                />

                <AppInput
                  autoCapitalize="none"
                  editable={confirmEnabled}
                  label="Confirmar contraseña"
                  onChangeText={setFormConfirmPassword}
                  placeholder={
                    confirmEnabled ? "Repite la misma contraseña" : "Ingresa primero la contraseña"
                  }
                  secureTextEntry
                  value={formConfirmPassword}
                />

                {formPassword && !passwordOk ? (
                  <Text style={styles.hintDanger}>
                    La contraseña debe tener al menos 8 caracteres.
                  </Text>
                ) : null}
                {passwordOk && formConfirmPassword && !passwordsMatch ? (
                  <Text style={styles.hintDanger}>Las contraseñas no coinciden.</Text>
                ) : null}
                {confirmError ? (
                  <Text style={styles.hintDanger}>{confirmError}</Text>
                ) : null}

                <AppButton
                  disabled={!canSubmit}
                  label={activated ? "Cuenta Activada" : "Activar cuenta"}
                  loading={confirmMutation.isPending}
                  onPress={handleActivate}
                />
              </View>
            ) : null}
          </AppCard>
        </View>

        <View style={styles.footer}>
          <View style={styles.footerBrand}>
            <LogoSvg size={24} variant="brand-red" />
            <Text style={styles.footerBrandText}>ElDojo</Text>
          </View>
          <Text style={styles.footerCopy}>Sencillez · Orden · Dojo</Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  shell: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: colors.surface,
    gap: spacing.md,
    maxWidth: 640,
    padding: spacing.xl,
    width: "100%",
  },
  cardHero: {
    ...shadows.cardElevated,
    borderRadius: radius.lg,
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
  heroHead: {
    gap: spacing.xs,
  },
  monospace: {
    color: colors.text,
    fontFamily: typography.displayFamily,
  },
  profileBlock: {
    alignItems: "center",
    borderRadius: radius.md,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceAlt,
  },
  profilePicture: {
    alignItems: "center",
    backgroundColor: agedWood,
    borderRadius: 999,
    height: 56,
    justifyContent: "center",
    overflow: "hidden",
    width: 56,
  },
  profileInitials: {
    color: "#FFFFFF",
    fontFamily: typography.displayFamily,
    fontSize: 20,
    fontWeight: "700",
  },
  profileData: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 16,
    fontWeight: "700",
  },
  profileEmail: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
  },
  profileDojo: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
  },
  statusBlock: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    gap: spacing.xs,
    padding: spacing.md,
  },
  statusRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  statusLabel: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 13,
    fontWeight: "600",
  },
  statusValue: {
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 21,
  },
  statusValueOk: {
    color: colors.success ?? agedWood,
  },
  statusValueMuted: {
    color: colors.textMuted,
  },
  statusDescription: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 19,
  },
  feedbackBlock: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.danger ? `${colors.danger}14` : "#fee2e2",
  },
  feedbackText: {
    color: colors.danger ?? "#b91c1c",
    fontFamily: typography.bodyFamily,
    fontSize: 13,
  },
  stepBlock: {
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  hintDanger: {
    color: colors.danger ?? "#b91c1c",
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 19,
  },
  footer: {
    alignItems: "center",
    gap: spacing.sm,
    paddingTop: spacing.xl,
  },
  footerBrand: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  footerBrandText: {
    color: colors.text,
    fontFamily: typography.displayFamily,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  footerCopy: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
    letterSpacing: 0.4,
  },
  successBanner: {
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
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
  successActions: {
    alignItems: "center",
    paddingTop: spacing.md,
  },
  goHomeLink: {
    alignItems: "center",
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  goHomeLinkHovered: {
    backgroundColor: colors.surfaceAlt,
  },
  goHomeLinkPressed: {
    backgroundColor: colors.border,
    opacity: 0.9,
  },
  goHomeLinkText: {
    color: colors.primary,
    fontFamily: typography.headingFamily,
    fontSize: 15,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});
