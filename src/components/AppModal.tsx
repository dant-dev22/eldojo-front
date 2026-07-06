import { PropsWithChildren } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { colors, radius, shadows, spacing, typography } from "@/constants/theme";

interface AppModalProps extends PropsWithChildren {
  visible: boolean;
  title: string;
  description?: string;
  onClose: () => void;
}

export function AppModal({ visible, title, description, onClose, children }: AppModalProps) {
  const { height, width } = useWindowDimensions();
  const dialogWidth = width >= 1280 ? 900 : width >= 1024 ? 820 : width >= 768 ? 700 : width - spacing.md * 2;

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.overlay}>
        <Pressable onPress={onClose} style={styles.backdrop} />
        <View style={styles.dialogWrapper}>
          <View
            style={[
              styles.dialog,
              {
                maxHeight: Math.min(height * 0.9, 860),
                maxWidth: Math.max(320, dialogWidth),
              },
            ]}
          >
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <Text style={styles.title}>{title}</Text>
                {description ? <Text style={styles.description}>{description}</Text> : null}
              </View>
              <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeLabel}>Cerrar</Text>
              </Pressable>
            </View>
            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
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
    justifyContent: "center",
    padding: spacing.md,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  dialogWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  dialog: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    width: "100%",
    ...shadows.card,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  description: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 20,
  },
  closeButton: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  closeLabel: {
    color: colors.primary,
    fontFamily: typography.headingFamily,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  content: {
    gap: spacing.md,
    paddingTop: spacing.md,
  },
});
