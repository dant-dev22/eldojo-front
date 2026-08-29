import { Feather } from "@expo/vector-icons";
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
  nativeID?: string;
  testID?: string;
  backdropClosable?: boolean;
  closeButtonEnabled?: boolean;
}

export function AppModal({
  visible,
  title,
  description,
  onClose,
  children,
  nativeID,
  testID,
  backdropClosable = true,
  closeButtonEnabled = true,
}: AppModalProps) {
  const { height, width } = useWindowDimensions();
  const dialogWidth = width >= 1280 ? 900 : width >= 1024 ? 820 : width >= 768 ? 700 : width - spacing.md * 2;
  const baseId =
    nativeID ?? testID ?? `components-app-modal-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View nativeID={`${baseId}-overlay`} style={styles.overlay} testID={`${baseId}-overlay`}>
        <Pressable
          nativeID={`${baseId}-backdrop`}
          onPress={backdropClosable ? onClose : undefined}
          style={styles.backdrop}
          testID={`${baseId}-backdrop`}
        />
        <View nativeID={`${baseId}-wrapper`} style={styles.dialogWrapper} testID={`${baseId}-wrapper`}>
          <View
            nativeID={baseId}
            style={[
              styles.dialog,
              {
                maxHeight: Math.min(height * 0.9, 860),
                maxWidth: Math.max(320, dialogWidth),
              },
            ]}
            testID={baseId}
          >
            <View nativeID={`${baseId}-header`} style={styles.header} testID={`${baseId}-header`}>
              <View nativeID={`${baseId}-header-copy`} style={styles.headerCopy} testID={`${baseId}-header-copy`}>
                <Text nativeID={`${baseId}-title`} style={styles.title} testID={`${baseId}-title`}>
                  {title}
                </Text>
                {description ? (
                  <Text nativeID={`${baseId}-description`} style={styles.description} testID={`${baseId}-description`}>
                    {description}
                  </Text>
                ) : null}
              </View>
              {closeButtonEnabled ? (
                <Pressable
                  accessibilityLabel="Cerrar"
                  accessibilityRole="button"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  nativeID={`${baseId}-close-button`}
                  onPress={onClose}
                  style={({ pressed }) => [styles.closeButton, pressed ? styles.closeButtonPressed : null]}
                  testID={`${baseId}-close-button`}
                >
                  <Feather color={colors.textMuted} name="x" size={20} />
                </Pressable>
              ) : (
                <View style={[styles.closeButton, { backgroundColor: "transparent", opacity: 0 }]} />
              )}
            </View>
            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              nativeID={`${baseId}-content`}
              showsVerticalScrollIndicator={false}
              testID={`${baseId}-content`}
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
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  closeButtonPressed: {
    backgroundColor: colors.hover,
    opacity: 0.92,
  },
  content: {
    gap: spacing.md,
    paddingTop: spacing.md,
  },
});
