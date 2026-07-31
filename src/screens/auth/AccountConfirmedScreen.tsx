import { useEffect } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import { AppButton } from "@/components/AppButton";
import { PublicPageChrome } from "@/components/PublicPageChrome";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { PUBLIC_PAGE_META, type PublicPageKey } from "@/navigation/publicRoutes";

export function AccountConfirmedScreen() {
  const { dismissPostConfirmation, user } = useAuth();
  const navigateToPage = (page: PublicPageKey) => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.location.assign(PUBLIC_PAGE_META[page].path);
      return;
    }

    dismissPostConfirmation();
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      dismissPostConfirmation();
    }, 2500);

    return () => clearTimeout(timeoutId);
  }, [dismissPostConfirmation]);

  return (
    <PublicPageChrome
      actionItems={[
        { key: "open-panel", label: "Entrar al panel", onPress: dismissPostConfirmation, variant: "primary" },
      ]}
      contentContainerStyle={styles.pageContent}
      idPrefix="screens-auth-account-confirmed"
      navItems={[
        { key: "home", label: "Inicio", onPress: () => navigateToPage("home") },
        { key: "about", label: "Acerca", onPress: () => navigateToPage("about") },
        { key: "events", label: "Eventos", onPress: () => navigateToPage("events") },
      ]}
      onBrandPress={() => navigateToPage("home")}
    >
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>Cuenta activada</Text>
          <Text style={styles.title}>Felicidades, tu usuario ha sido creado.</Text>
          <Text style={styles.description}>
            {user?.first_name
              ? `${user.first_name}, ya confirmamos tu correo y tu academia está lista para usarse.`
              : "Ya confirmamos tu correo y tu academia está lista para usarse."}
          </Text>
          <AppButton label="Entrar al panel" onPress={dismissPostConfirmation} />
        </View>
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
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    maxWidth: 560,
    padding: spacing.xl,
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
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 40,
  },
  description: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 16,
    lineHeight: 24,
  },
});
