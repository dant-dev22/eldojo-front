import { Feather } from "@expo/vector-icons";
import { ReactNode } from "react";
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useRef } from "react";

import { colors, radius, spacing, transitions, typography } from "@/constants/theme";

export interface BottomSheetAction {
  key: string;
  label: string;
  icon?: keyof typeof Feather.glyphMap | ReactNode;
  onPress: () => void;
  tone?: "default" | "primary" | "success" | "warning" | "danger";
  destructive?: boolean;
  disabled?: boolean;
}

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  subtitle?: string;
  actions?: BottomSheetAction[];
  children?: ReactNode;
  showCloseButton?: boolean;
  idPrefix?: string;
  nativeID?: string;
  testID?: string;
}

export function BottomSheet({
  visible,
  onClose,
  title,
  description,
  subtitle,
  actions,
  children,
  showCloseButton = true,
  idPrefix = "bottom-sheet",
  nativeID,
  testID,
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(400)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: transitions.base,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: transitions.slow,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: transitions.fast,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 400,
          duration: transitions.fast,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim]);

  const handleActionPress = (action: BottomSheetAction) => {
    if (action.disabled) return;
    onClose();
    setTimeout(() => {
      action.onPress();
    }, transitions.fast);
  };

  const getToneColor = (tone?: BottomSheetAction["tone"], destructive?: boolean) => {
    if (destructive) return colors.danger;
    switch (tone) {
      case "primary":
        return colors.primary;
      case "success":
        return colors.success;
      case "warning":
        return colors.warning;
      case "danger":
        return colors.danger;
      default:
        return colors.text;
    }
  };

  return (
    <Modal
      animationType="none"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <Animated.View
        nativeID={nativeID ?? `${idPrefix}-overlay`}
        style={[styles.overlay, { opacity: fadeAnim }]}
        testID={testID ?? `${idPrefix}-overlay`}
      >
        <Pressable
          accessibilityLabel="Cerrar hoja de acciones"
          accessibilityRole="button"
          nativeID={`${idPrefix}-backdrop`}
          onPress={onClose}
          style={styles.backdrop}
          testID={`${idPrefix}-backdrop`}
        />

        <Animated.View
          nativeID={`${idPrefix}-sheet`}
          style={[
            styles.sheet,
            {
              paddingBottom: insets.bottom + spacing.md,
              transform: [{ translateY: slideAnim }],
            },
          ]}
          testID={`${idPrefix}-sheet`}
        >
          <View nativeID={`${idPrefix}-handle-wrap`} style={styles.handleWrap} testID={`${idPrefix}-handle-wrap`}>
            <View nativeID={`${idPrefix}-handle`} style={styles.handle} testID={`${idPrefix}-handle`} />
          </View>

          {title || subtitle || showCloseButton ? (
            <View nativeID={`${idPrefix}-header`} style={styles.header} testID={`${idPrefix}-header`}>
              <View style={styles.headerTitleSlot}>
                {title ? (
                  <Text nativeID={`${idPrefix}-title`} style={styles.title} testID={`${idPrefix}-title`}>
                    {title}
                  </Text>
                ) : null}
                {subtitle ? (
                  <Text nativeID={`${idPrefix}-subtitle`} style={styles.subtitle} testID={`${idPrefix}-subtitle`}>
                    {subtitle}
                  </Text>
                ) : null}
              </View>
              {showCloseButton ? (
                <Pressable
                  accessibilityLabel="Cerrar"
                  accessibilityRole="button"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  nativeID={`${idPrefix}-close`}
                  onPress={onClose}
                  style={({ pressed }) => [styles.closeButton, pressed ? styles.closeButtonPressed : null]}
                  testID={`${idPrefix}-close`}
                >
                  <Feather color={colors.textMuted} name="x" size={20} />
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {description ? (
            <Text
              nativeID={`${idPrefix}-description`}
              style={styles.description}
              testID={`${idPrefix}-description`}
            >
              {description}
            </Text>
          ) : null}

          {children ? (
            <ScrollView
              contentContainerStyle={styles.childrenContent}
              nativeID={`${idPrefix}-children-scroll`}
              showsVerticalScrollIndicator={false}
              testID={`${idPrefix}-children-scroll`}
            >
              {children}
            </ScrollView>
          ) : null}

          {actions && actions.length > 0 ? (
            <View
              nativeID={`${idPrefix}-actions`}
              style={styles.actionsList}
              testID={`${idPrefix}-actions`}
            >
              {actions.map((action, idx) => (
                <View key={action.key}>
                  {idx > 0 ? <View style={styles.actionDivider} /> : null}
                  <Pressable
                    accessibilityLabel={action.label}
                    accessibilityRole="button"
                    disabled={action.disabled}
                    hitSlop={{ top: 8, bottom: 8 }}
                    nativeID={`${idPrefix}-action-${action.key}`}
                    onPress={() => handleActionPress(action)}
                    style={(state) => {
                      const { pressed } = state;
                      const hovered = (state as unknown as { hovered?: boolean }).hovered;
                      return [
                        styles.actionItem,
                        action.disabled ? styles.actionItemDisabled : null,
                        (!action.disabled && (pressed || hovered)) ? styles.actionItemPressed : null,
                      ];
                    }}
                    testID={`${idPrefix}-action-${action.key}`}
                  >
                    {action.icon ? (
                      <View
                        nativeID={`${idPrefix}-action-icon-wrap-${action.key}`}
                        style={[
                          styles.actionIconWrap,
                          { backgroundColor: `${getToneColor(action.tone, action.destructive)}15` },
                          action.disabled ? { opacity: 0.4 } : null,
                        ]}
                        testID={`${idPrefix}-action-icon-wrap-${action.key}`}
                      >
                        {typeof action.icon === "string" ? (
                          <Feather
                            color={getToneColor(action.tone, action.destructive)}
                            name={action.icon as keyof typeof Feather.glyphMap}
                            size={18}
                          />
                        ) : (
                          action.icon
                        )}
                      </View>
                    ) : null}
                    <Text
                      nativeID={`${idPrefix}-action-label-${action.key}`}
                      style={[
                        styles.actionLabel,
                        { color: getToneColor(action.tone, action.destructive) },
                        action.destructive ? { fontWeight: "700" } : null,
                        action.disabled ? { opacity: 0.5 } : null,
                      ]}
                      testID={`${idPrefix}-action-label-${action.key}`}
                    >
                      {action.label}
                    </Text>
                    <View style={{ marginLeft: "auto" }}>
                      <Feather color={action.disabled ? colors.textMuted : colors.textMuted} name="chevron-right" size={18} />
                    </View>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    backgroundColor: "rgba(10, 10, 10, 0.48)",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    elevation: 8,
    shadowColor: "#1A1A1A",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  handleWrap: {
    alignItems: "center",
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  handle: {
    backgroundColor: colors.borderStrong,
    borderRadius: 3,
    height: 4,
    width: 40,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  headerTitleSlot: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 18,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    fontWeight: "400",
    marginTop: 2,
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
  description: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  childrenContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  actionsList: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    overflow: "hidden",
  },
  actionDivider: {
    backgroundColor: colors.border,
    height: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.md,
  },
  actionItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  actionItemPressed: {
    backgroundColor: colors.hover,
  },
  actionItemDisabled: {
    opacity: 0.55,
  },
  actionIconWrap: {
    alignItems: "center",
    borderRadius: 12,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  actionLabel: {
    color: colors.text,
    fontFamily: typography.bodyFamily,
    fontSize: 15,
    fontWeight: "500",
  },
});
