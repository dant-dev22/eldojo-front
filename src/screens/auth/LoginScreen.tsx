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
    <Screen scrollable contentStyle={[styles.screenContent, { alignItems: "center" }]}>
      <View
        style={[
          styles.layout,
          { maxWidth: Math.min(contentMaxWidth, 560) },
          isDesktop ? desktopStyles.layout : mobileStyles.layout,
        ]}
      >
        <View style={styles.brandBlock}>
          <View style={styles.logoMark}>
            <Text style={styles.logoMarkText}>EL</Text>
          </View>
          <Text style={[styles.title, isDesktop ? desktopStyles.title : mobileStyles.title]}>ElDojo</Text>
          <Text style={[styles.subtitle, isDesktop ? desktopStyles.subtitle : mobileStyles.subtitle]}>
            El administrador de gimnasios de mma-bjj-judo
          </Text>
        </View>

        <AppCard style={[styles.formCard, isDesktop ? desktopStyles.formCard : mobileStyles.formCard]}>
          <View style={styles.tabs}>
            <Pressable
              accessibilityRole="button"
              onPress={() => handleModeChange("academy")}
              style={({ pressed }) => [
                styles.tabButton,
                mode === "academy" ? styles.tabButtonActive : null,
                pressed ? styles.tabButtonPressed : null,
              ]}
            >
              <Text style={[styles.tabLabel, mode === "academy" ? styles.tabLabelActive : null]}>
                Crea tu academia
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => handleModeChange("login")}
              style={({ pressed }) => [
                styles.tabButton,
                mode === "login" ? styles.tabButtonActive : null,
                pressed ? styles.tabButtonPressed : null,
              ]}
            >
              <Text style={[styles.tabLabel, mode === "login" ? styles.tabLabelActive : null]}>
                Inicia sesión
              </Text>
            </Pressable>
          </View>

          {mode === "academy" ? (
            <>
              <Text style={styles.formTitle}>Crea tu academia</Text>
              <Text style={styles.formSubtitle}>
                Registra tu academia y crea la cuenta administradora inicial. Si todo sale bien, entrarás al panel automáticamente.
              </Text>
              <AppInput
                label="Academia"
                onChangeText={setAcademyName}
                placeholder="Union MMA"
                value={academyName}
              />
              <AppInput
                label="Nombre"
                onChangeText={setAdminFirstName}
                placeholder="Tu nombre"
                value={adminFirstName}
              />
              <AppInput
                label="Apellidos"
                onChangeText={setAdminLastName}
                placeholder="Tus apellidos"
                value={adminLastName}
              />
              <AppInput
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                label="Correo"
                onChangeText={setEmail}
                placeholder="admin@tuacademia.com"
                value={email}
              />
              <AppInput
                autoComplete="new-password"
                label="Contraseña"
                onChangeText={setPassword}
                placeholder="Crea una contraseña"
                rightAdornment={
                  <Pressable
                    accessibilityLabel={showRegisterPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    accessibilityRole="button"
                    onPress={() => setShowRegisterPassword((current) => !current)}
                    style={({ pressed }) => [styles.passwordToggle, pressed ? styles.passwordTogglePressed : null]}
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
              <Text style={styles.helper}>
                El código interno de la academia se genera con las primeras 3 letras útiles del nombre, ignorando espacios.
              </Text>
              {formError ? <Text style={styles.error}>{formError}</Text> : null}
              <AppButton
                label="Crear academia"
                loading={registerMutation.isPending}
                onPress={handleAcademySubmit}
              />
            </>
          ) : (
            <>
              <Text style={styles.formTitle}>Inicia sesión</Text>
              <Text style={styles.formSubtitle}>
                Usa el correo y la contraseña de la cuenta administradora que ya creaste para tu academia.
              </Text>
              <AppInput
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                label="Correo"
                onChangeText={setEmail}
                placeholder="admin@tuacademia.com"
                value={email}
              />
              <AppInput
                autoComplete="password"
                label="Contraseña"
                onChangeText={setPassword}
                placeholder="Tu contraseña"
                rightAdornment={
                  <Pressable
                    accessibilityLabel={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    accessibilityRole="button"
                    onPress={() => setShowPassword((current) => !current)}
                    style={({ pressed }) => [styles.passwordToggle, pressed ? styles.passwordTogglePressed : null]}
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
              {formError ? <Text style={styles.error}>{formError}</Text> : null}
              <AppButton
                label="Entrar"
                loading={loginMutation.isPending}
                onPress={handleLoginSubmit}
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
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  logoMark: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  logoMarkText: {
    color: colors.accent,
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
    textAlign: "center",
  },
  formCard: {
    gap: spacing.md,
  },
  tabs: {
    backgroundColor: colors.primarySoft,
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
    borderColor: colors.border,
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
    color: colors.accent,
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
