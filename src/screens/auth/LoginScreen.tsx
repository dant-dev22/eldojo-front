import { Feather } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { getErrorMessage } from "@/api/http";
import { AppButton } from "@/components/AppButton";
import { AppCard } from "@/components/AppCard";
import { AppInput } from "@/components/AppInput";
import { Screen } from "@/components/Screen";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";

type AuthMode = "login" | "academy";

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

  return message.endsWith(".") ? message : `${message}.`;
}

export function LoginScreen() {
  const { signIn, registerAcademy } = useAuth();
  const { contentMaxWidth, isDesktop } = useResponsiveLayout();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [academyName, setAcademyName] = useState("");
  const [adminFirstName, setAdminFirstName] = useState("");
  const [adminLastName, setAdminLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loginMutation = useMutation({
    mutationFn: signIn,
    onError: (error) => setFormError(formatAuthError(error)),
  });

  const registerMutation = useMutation({
    mutationFn: registerAcademy,
    onError: (error) => setFormError(formatAuthError(error)),
  });

  const handleModeChange = (nextMode: AuthMode) => {
    setMode(nextMode);
    setFormError(null);
  };

  const handleLoginSubmit = () => {
    if (!email.trim() || !password.trim()) {
      setFormError("Completa correo y contraseña.");
      return;
    }

    setFormError(null);
    loginMutation.mutate({
      email: email.trim().toLowerCase(),
      password,
    });
  };

  const handleAcademySubmit = () => {
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
    registerMutation.mutate({
      academy_name: academyName.trim(),
      admin_first_name: adminFirstName.trim(),
      admin_last_name: adminLastName.trim(),
      email: email.trim().toLowerCase(),
      password,
    });
  };

  return (
    <Screen
      scrollable
      contentStyle={[styles.screenContent, { alignItems: "center" }]}
      nativeID="screens-auth-login-screen"
      testID="screens-auth-login-screen"
    >
      <View
        nativeID="screens-auth-login-layout"
        style={[
          styles.layout,
          { maxWidth: Math.min(contentMaxWidth, 560) },
          isDesktop ? desktopStyles.layout : mobileStyles.layout,
        ]}
        testID="screens-auth-login-layout"
      >
        <View nativeID="screens-auth-login-brand-section" style={styles.brandBlock} testID="screens-auth-login-brand-section">
          <View nativeID="screens-auth-login-logo-mark" style={styles.logoMark} testID="screens-auth-login-logo-mark">
            <Text nativeID="screens-auth-login-logo-mark-text" style={styles.logoMarkText} testID="screens-auth-login-logo-mark-text">EL</Text>
          </View>
          <Text nativeID="screens-auth-login-title" style={[styles.title, isDesktop ? desktopStyles.title : mobileStyles.title]} testID="screens-auth-login-title">ElDojo</Text>
          <Text nativeID="screens-auth-login-subtitle" style={[styles.subtitle, isDesktop ? desktopStyles.subtitle : mobileStyles.subtitle]} testID="screens-auth-login-subtitle">
            El administrador de gimnasios de mma-bjj-judo
          </Text>
        </View>

        <AppCard
          nativeID="screens-auth-login-form-card"
          style={[styles.formCard, isDesktop ? desktopStyles.formCard : mobileStyles.formCard]}
          testID="screens-auth-login-form-card"
        >
          <View nativeID="screens-auth-login-mode-tabs" style={styles.tabs} testID="screens-auth-login-mode-tabs">
            <Pressable
              accessibilityRole="button"
              nativeID="screens-auth-login-mode-academy-button"
              onPress={() => handleModeChange("academy")}
              style={({ pressed }) => [
                styles.tabButton,
                mode === "academy" ? styles.tabButtonActive : null,
                pressed ? styles.tabButtonPressed : null,
              ]}
              testID="screens-auth-login-mode-academy-button"
            >
              <Text nativeID="screens-auth-login-mode-academy-label" style={[styles.tabLabel, mode === "academy" ? styles.tabLabelActive : null]} testID="screens-auth-login-mode-academy-label">
                Crea tu academia
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              nativeID="screens-auth-login-mode-signin-button"
              onPress={() => handleModeChange("login")}
              style={({ pressed }) => [
                styles.tabButton,
                mode === "login" ? styles.tabButtonActive : null,
                pressed ? styles.tabButtonPressed : null,
              ]}
              testID="screens-auth-login-mode-signin-button"
            >
              <Text nativeID="screens-auth-login-mode-signin-label" style={[styles.tabLabel, mode === "login" ? styles.tabLabelActive : null]} testID="screens-auth-login-mode-signin-label">
                Inicia sesión
              </Text>
            </Pressable>
          </View>

          {mode === "academy" ? (
            <>
              <Text nativeID="screens-auth-login-register-form-title" style={styles.formTitle} testID="screens-auth-login-register-form-title">Crea tu academia</Text>
              <Text nativeID="screens-auth-login-register-form-subtitle" style={styles.formSubtitle} testID="screens-auth-login-register-form-subtitle">
                Registra tu academia y crea la cuenta administradora inicial. Si todo sale bien, entrarás al panel automáticamente.
              </Text>
              <AppInput
                label="Academia"
                nativeID="screens-auth-login-academy-name-input"
                onChangeText={setAcademyName}
                placeholder="Union MMA"
                testID="screens-auth-login-academy-name-input"
                value={academyName}
              />
              <AppInput
                label="Nombre"
                nativeID="screens-auth-login-admin-first-name-input"
                onChangeText={setAdminFirstName}
                placeholder="Tu nombre"
                testID="screens-auth-login-admin-first-name-input"
                value={adminFirstName}
              />
              <AppInput
                label="Apellidos"
                nativeID="screens-auth-login-admin-last-name-input"
                onChangeText={setAdminLastName}
                placeholder="Tus apellidos"
                testID="screens-auth-login-admin-last-name-input"
                value={adminLastName}
              />
              <AppInput
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                label="Correo"
                nativeID="screens-auth-login-register-email-input"
                onChangeText={setEmail}
                placeholder="admin@tuacademia.com"
                testID="screens-auth-login-register-email-input"
                value={email}
              />
              <AppInput
                autoComplete="new-password"
                label="Contraseña"
                nativeID="screens-auth-login-register-password-input"
                onChangeText={setPassword}
                placeholder="Crea una contraseña"
                rightAdornment={
                  <Pressable
                    accessibilityLabel={showRegisterPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    accessibilityRole="button"
                    nativeID="screens-auth-login-register-password-toggle"
                    onPress={() => setShowRegisterPassword((current) => !current)}
                    style={({ pressed }) => [styles.passwordToggle, pressed ? styles.passwordTogglePressed : null]}
                    testID="screens-auth-login-register-password-toggle"
                  >
                    <Feather
                      color={colors.textMuted}
                      name={showRegisterPassword ? "eye-off" : "eye"}
                      size={18}
                    />
                  </Pressable>
                }
                secureTextEntry={!showRegisterPassword}
                value={password}
              />
              <Text nativeID="screens-auth-login-register-helper" style={styles.helper} testID="screens-auth-login-register-helper">
                El código interno de la academia se genera con las primeras 3 letras útiles del nombre, ignorando espacios.
              </Text>
              {formError ? <Text nativeID="screens-auth-login-register-error" style={styles.error} testID="screens-auth-login-register-error">{formError}</Text> : null}
              <AppButton
                label="Crear academia"
                loading={registerMutation.isPending}
                nativeID="screens-auth-login-register-submit-button"
                onPress={handleAcademySubmit}
                testID="screens-auth-login-register-submit-button"
              />
            </>
          ) : (
            <>
              <Text nativeID="screens-auth-login-signin-form-title" style={styles.formTitle} testID="screens-auth-login-signin-form-title">Inicia sesión</Text>
              <Text nativeID="screens-auth-login-signin-form-subtitle" style={styles.formSubtitle} testID="screens-auth-login-signin-form-subtitle">
                Usa el correo y la contraseña de la cuenta administradora que ya creaste para tu academia.
              </Text>
              <AppInput
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                label="Correo"
                nativeID="screens-auth-login-email-input"
                onChangeText={setEmail}
                placeholder="admin@tuacademia.com"
                testID="screens-auth-login-email-input"
                value={email}
              />
              <AppInput
                autoComplete="password"
                label="Contraseña"
                nativeID="screens-auth-login-password-input"
                onChangeText={setPassword}
                placeholder="Tu contraseña"
                rightAdornment={
                  <Pressable
                    accessibilityLabel={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    accessibilityRole="button"
                    nativeID="screens-auth-login-password-toggle"
                    onPress={() => setShowPassword((current) => !current)}
                    style={({ pressed }) => [styles.passwordToggle, pressed ? styles.passwordTogglePressed : null]}
                    testID="screens-auth-login-password-toggle"
                  >
                    <Feather
                      color={colors.textMuted}
                      name={showPassword ? "eye-off" : "eye"}
                      size={18}
                    />
                  </Pressable>
                }
                secureTextEntry={!showPassword}
                value={password}
              />
              {formError ? <Text nativeID="screens-auth-login-signin-error" style={styles.error} testID="screens-auth-login-signin-error">{formError}</Text> : null}
              <AppButton
                label="Entrar"
                loading={loginMutation.isPending}
                nativeID="screens-auth-login-submit-button"
                onPress={handleLoginSubmit}
                testID="screens-auth-login-submit-button"
              />
            </>
          )}
        </AppCard>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    justifyContent: "center",
  },
  layout: {
    gap: spacing.xl,
    width: "100%",
  },
  brandBlock: {
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
  },
  logoMark: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderColor: colors.gold,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  logoMarkText: {
    color: colors.text,
    fontFamily: typography.displayFamily,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  title: {
    color: colors.text,
    fontFamily: typography.displayFamily,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    lineHeight: 22,
    maxWidth: 420,
    textAlign: "center",
  },
  formCard: {
    gap: spacing.lg,
  },
  tabs: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.borderStrong,
    borderWidth: 1,
    borderRadius: radius.pill,
    flexDirection: "row",
    gap: spacing.xs,
    padding: 6,
  },
  tabButton: {
    alignItems: "center",
    borderRadius: radius.pill,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing.sm,
  },
  tabButtonActive: {
    backgroundColor: colors.surface,
    borderColor: colors.gold,
    borderWidth: 1,
  },
  tabButtonPressed: {
    opacity: 0.85,
  },
  tabLabel: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    color: colors.primary,
  },
  formTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  formSubtitle: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 22,
  },
  error: {
    color: colors.danger,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
  },
  helper: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
    lineHeight: 18,
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
});

const mobileStyles = StyleSheet.create({
  layout: {
    paddingVertical: spacing.xl,
  },
  formCard: {
    width: "100%",
  },
  title: {
    fontSize: 42,
  },
  subtitle: {
    fontSize: 15,
  },
});

const desktopStyles = StyleSheet.create({
  layout: {
    paddingVertical: spacing["2xl"],
  },
  formCard: {
    alignSelf: "center",
    width: "100%",
    padding: 32,
  },
  title: {
    fontSize: 56,
  },
  subtitle: {
    fontSize: 16,
  },
});
