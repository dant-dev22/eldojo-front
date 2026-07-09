import { StyleSheet, Text, View } from "react-native";

import { AppBadge } from "@/components/AppBadge";
import { colors, radius, spacing, typography } from "@/constants/theme";

interface PublicQrScannerProps {
  active: boolean;
  scanning: boolean;
  onDetected: (value: string) => void;
  onError: (message: string) => void;
}

export function PublicQrScanner({ active }: PublicQrScannerProps) {
  return (
    <View style={styles.container}>
      <AppBadge label={active ? "Escaner no disponible" : "Escaner inactivo"} tone="warning" />
      <Text style={styles.title}>Usa la versión web para abrir la cámara</Text>
      <Text style={styles.description}>
        En esta plataforma no se puede abrir el lector QR desde la app actual. Abre la ruta pública en navegador para escanear.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.warningSoft,
    borderColor: "#F3C58C",
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  title: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 18,
    fontWeight: "700",
  },
  description: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 20,
  },
});
