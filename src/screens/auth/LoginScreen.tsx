import { Feather } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { getErrorMessage } from "@/api/http";
import { AppBadge } from "@/components/AppBadge";
import { AppButton } from "@/components/AppButton";
import { AppCard } from "@/components/AppCard";
import { AppInput } from "@/components/AppInput";
import { Screen } from "@/components/Screen";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";

export function LoginScreen() {
  const { signIn } = useAuth();
  const { contentMaxWidth, isDesktop } = useResponsiveLayout();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loginMutation = useMutation({
    mutationFn: signIn,
    onError: (error) => setFormError(getErrorMessage(error)),
  });

  const handleSubmit = () => {
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

  return (
    <Screen scrollable contentStyle={[styles.screenContent, { alignItems: "center" }]}>
      <View
        style={[
          styles.layout,
          { maxWidth: contentMaxWidth },
          isDesktop ? desktopStyles.layout : mobileStyles.layout,
        ]}
      >
        <AppCard style={[styles.heroCard, isDesktop ? desktopStyles.heroCard : mobileStyles.heroCard]}>
          <AppBadge label={isDesktop ? "Portal web" : "Portal responsive"} tone="info" />
          <View style={styles.hero}>
            <Text style={[styles.title, isDesktop ? desktopStyles.title : mobileStyles.title]}>
              ElDojo Admin
            </Text>
            <Text style={[styles.subtitle, isDesktop ? desktopStyles.subtitle : mobileStyles.subtitle]}>
              Accede al panel del gimnasio para consultar alumnos, seguir clases y operar el dia a dia desde navegador, tablet o escritorio.
            </Text>
          </View>
          <View style={styles.heroHighlights}>
            <View style={styles.highlightPill}>
              <Text style={styles.highlight}>Control diario de alumnos, pagos y clases</Text>
            </View>
            <View style={styles.highlightPill}>
              <Text style={styles.highlight}>Experiencia clara para dueños y staff operativo</Text>
            </View>
            <View style={styles.highlightPill}>
              <Text style={styles.highlight}>Lenguaje visual moderno para academias de combate</Text>
            </View>
          </View>
        </AppCard>

        <AppCard style={[styles.formCard, isDesktop ? desktopStyles.formCard : mobileStyles.formCard]}>
          <Text style={styles.formTitle}>Entrar al portal</Text>
          <Text style={styles.formSubtitle}>
            Usa tus credenciales de administrador de gimnasio. Los accesos de alumnos y super admins se publicarán en interfaces distintas.
          </Text>
          <AppInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            label="Correo"
            onChangeText={setEmail}
            placeholder="admin@gimnasio.com"
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
            label="Entrar al panel"
            loading={loginMutation.isPending}
            onPress={handleSubmit}
          />
          <Text style={styles.helper}>
            Si tu sesión expira, la app intentará renovarla automáticamente mientras mantengas acceso válido.
          </Text>
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
    gap: spacing.lg,
    width: "100%",
  },
  heroCard: {
    gap: spacing.md,
    backgroundColor: colors.surfaceStrong,
    borderColor: "#2E241D",
  },
  hero: {
    gap: spacing.xs,
  },
  heroHighlights: {
    gap: spacing.xs,
  },
  highlightPill: {
    alignSelf: "flex-start",
    backgroundColor: "#241A13",
    borderColor: "#413127",
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  title: {
    color: colors.surface,
    fontFamily: typography.displayFamily,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  subtitle: {
    color: "#D1C2B5",
    fontFamily: typography.bodyFamily,
    lineHeight: 22,
  },
  highlight: {
    color: "#F7D2B4",
    fontFamily: typography.headingFamily,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  formCard: {
    gap: spacing.md,
  },
  formTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  formSubtitle: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 20,
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
    flexDirection: "column",
  },
  heroCard: {
    minHeight: 0,
  },
  formCard: {
    minHeight: 0,
  },
  title: {
    fontSize: 34,
  },
  subtitle: {
    fontSize: 15,
  },
});

const desktopStyles = StyleSheet.create({
  layout: {
    alignItems: "stretch",
    flexDirection: "row",
  },
  heroCard: {
    flex: 1.15,
    minHeight: 520,
    justifyContent: "space-between",
    padding: 32,
  },
  formCard: {
    alignSelf: "center",
    flex: 0.85,
    maxWidth: 440,
    padding: 32,
  },
  title: {
    fontSize: 52,
  },
  subtitle: {
    fontSize: 16,
  },
});
