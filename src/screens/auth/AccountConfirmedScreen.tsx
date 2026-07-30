import { useEffect } from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";

import { AppButton } from "@/components/AppButton";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";

export function AccountConfirmedScreen() {
  const { dismissPostConfirmation, user } = useAuth();

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      dismissPostConfirmation();
    }, 2500);

    return () => clearTimeout(timeoutId);
  }, [dismissPostConfirmation]);

  return (
    <SafeAreaView style={styles.safeArea}>
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
