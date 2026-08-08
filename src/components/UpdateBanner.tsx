// src/components/UpdateBanner.tsx
// Banner/modal que se muestra cuando hay una nueva version del SPA
// desplegada en el servidor. Ofrece recargar inmediatamente.

import React from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useVersionCheck } from "@/hooks/useVersionCheck";
import { APP_VERSION } from "@/generated/appVersion";

export function UpdateBanner() {
  const { isUpdateAvailable, latestVersion, forceReload, dismissUpdate } =
    useVersionCheck({
      pollIntervalMs: 60_000,
    });

  const [reloading, setReloading] = React.useState(false);

  // Solo mostramos en web.
  if (Platform.OS !== "web") return null;
  if (!isUpdateAvailable) return null;

  const handleReload = async () => {
    setReloading(true);
    // Despues de forzar reload, el browser mata este proceso, asi que el
    // timeout de abajo es solo un fallback.
    setTimeout(() => {
      void forceReload();
    }, 300);
    void forceReload();
  };

  return (
    <Modal
      transparent
      visible
      animationType="fade"
      onRequestClose={dismissUpdate}
    >
      <View style={styles.overlay} pointerEvents="auto">
        <View style={styles.card}>
          <Text style={styles.title}>Nueva actualizacion disponible</Text>
          <Text style={styles.subtitle}>
            Hay una nueva version de ElDojo lista para usar.
          </Text>

          <View style={styles.versionsRow}>
            <View style={styles.versionChip}>
              <Text style={styles.versionChipLabel}>Actual</Text>
              <Text style={styles.versionChipValue} numberOfLines={1}>
                {APP_VERSION}
              </Text>
            </View>
            <Text style={styles.arrow}>→</Text>
            <View style={[styles.versionChip, styles.versionChipNew]}>
              <Text style={[styles.versionChipLabel, { color: "#fff" }]}>
                Nueva
              </Text>
              <Text
                style={[styles.versionChipValue, { color: "#fff" }]}
                numberOfLines={1}
              >
                {latestVersion ?? "desconocida"}
              </Text>
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable
              onPress={dismissUpdate}
              style={styles.secondaryBtn}
              hitSlop={8}
            >
              <Text style={styles.secondaryBtnText}>Ahora no</Text>
            </Pressable>
            <Pressable
              onPress={handleReload}
              style={styles.primaryBtn}
              hitSlop={8}
              disabled={reloading}
            >
              {reloading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>Actualizar ahora</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    zIndex: 9999,
  },
  card: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1a1a1a",
    marginBottom: 8,
    includeFontPadding: false,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
    lineHeight: 20,
  },
  versionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 24,
  },
  versionChip: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  versionChipNew: {
    backgroundColor: "#1f8a4c",
  },
  versionChipLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  versionChipValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
    fontFamily: Platform.OS === "web" ? "ui-monospace, Menlo, monospace" : undefined,
  },
  arrow: {
    fontSize: 20,
    color: "#9ca3af",
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "flex-end",
  },
  secondaryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4b5563",
  },
  primaryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: "#1f8a4c",
    minWidth: 140,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#fff",
  },
});
