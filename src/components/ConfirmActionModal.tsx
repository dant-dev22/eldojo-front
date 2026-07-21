import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, shadows, spacing, typography } from "@/constants/theme";
import { AppButton } from "@/components/AppButton";

interface ConfirmActionModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  idPrefix: string;
}

export function ConfirmActionModal({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
  idPrefix,
}: ConfirmActionModalProps) {
  const overlayId = `${idPrefix}-overlay`;
  const backdropId = `${idPrefix}-backdrop`;
  const sheetId = `${idPrefix}-sheet`;
  const copyId = `${idPrefix}-copy`;
  const actionsId = `${idPrefix}-actions`;

  return (
    <Modal animationType="fade" onRequestClose={onCancel} transparent visible={visible}>
      <View nativeID={overlayId} style={styles.overlay} testID={overlayId}>
        <Pressable nativeID={backdropId} onPress={onCancel} style={styles.backdrop} testID={backdropId} />
        <View style={styles.sheetWrapper}>
          <View nativeID={sheetId} style={styles.sheet} testID={sheetId}>
            <View nativeID={copyId} style={styles.copyBlock} testID={copyId}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>
            </View>
            <View nativeID={actionsId} style={styles.actions} testID={actionsId}>
              <AppButton
                label={cancelLabel}
                nativeID={`${idPrefix}-cancel-button`}
                onPress={onCancel}
                testID={`${idPrefix}-cancel-button`}
                variant="secondary"
              />
              <AppButton
                label={confirmLabel}
                nativeID={`${idPrefix}-confirm-button`}
                onPress={onConfirm}
                testID={`${idPrefix}-confirm-button`}
                variant="danger"
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: colors.overlay,
    flex: 1,
    padding: spacing.md,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheetWrapper: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    maxWidth: 420,
    padding: spacing.lg,
    width: "100%",
    ...shadows.card,
  },
  copyBlock: {
    gap: spacing.xs,
  },
  title: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 22,
    fontWeight: "800",
  },
  message: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 22,
  },
  actions: {
    gap: spacing.sm,
  },
});
