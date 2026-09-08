import { Feather } from "@expo/vector-icons";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "@/constants/theme";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";

import { AppButton } from "./AppButton";
import { AppModal } from "./AppModal";

export type QuickActionTone = "default" | "primary" | "success" | "warning" | "danger";

export interface QuickActionItem {
  key: string;
  label: string;
  icon?: keyof typeof Feather.glyphMap | ReactNode;
  onPress: () => void;
  tone?: QuickActionTone;
  destructive?: boolean;
  disabled?: boolean;
}

export interface DashboardQuickActionsModalProps {
  idPrefix: string;
  visible: boolean;
  onClose: () => void;
  actions: QuickActionItem[];
  title?: string;
  description?: string;
  closeOnAction?: boolean;
}

export function DashboardQuickActionsModal({
  idPrefix,
  visible,
  onClose,
  actions,
  title = "Acciones rápidas",
  description = "Operaciones diarias del dojo: altas, cobros y registro de asistencias.",
  closeOnAction = true,
}: DashboardQuickActionsModalProps) {
  const { isDesktop, isTablet } = useResponsiveLayout();
  const PAGE_SIZE = 12;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(actions.length / PAGE_SIZE));
  const paginatedActions = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return actions.slice(start, start + PAGE_SIZE);
  }, [actions, page]);

  useEffect(() => {
    setPage(1);
  }, [visible, actions.length]);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const toneDecor = (tone?: QuickActionTone, destructive?: boolean) => {
    if (tone === "primary") {
      return {
        wrap: styles.modalActionPrimary,
        iconWrap: styles.modalActionIconWrapPrimary,
        iconColor: colors.onPrimary,
        title: colors.text,
      };
    }
    if (tone === "success") {
      return {
        wrap: styles.modalActionSuccess,
        iconWrap: styles.modalActionIconWrapSuccess,
        iconColor: colors.onPrimary,
        title: colors.text,
      };
    }
    if (tone === "warning") {
      return {
        wrap: styles.modalActionWarning,
        iconWrap: styles.modalActionIconWrapWarning,
        iconColor: colors.onPrimary,
        title: colors.text,
      };
    }
    if (tone === "danger" || destructive) {
      return {
        wrap: styles.modalActionDanger,
        iconWrap: styles.modalActionIconWrapDanger,
        iconColor: colors.onPrimary,
        title: colors.danger,
      };
    }
    return {
      wrap: null,
      iconWrap: styles.modalActionIconWrapDefault,
      iconColor: colors.text,
      title: colors.text,
    };
  };

  const renderActionIcon = (
    action: { icon?: keyof typeof Feather.glyphMap | ReactNode; label?: string },
    color: string
  ) => {
    if (!action.icon) {
      return <Feather name="arrow-up-right" size={16} color={color} />;
    }
    if (typeof action.icon === "string") {
      return <Feather name={action.icon as keyof typeof Feather.glyphMap} size={16} color={color} />;
    }
    return action.icon as ReactNode;
  };

  const desktopCard = isDesktop || isTablet;

  return (
    <AppModal
      visible={visible}
      nativeID={idPrefix}
      testID={idPrefix}
      title={title}
      description={description}
      onClose={onClose}
    >
      <View nativeID={`${idPrefix}-modal-actions-list`} style={styles.modalQuickActionsGrid} testID={`${idPrefix}-modal-actions-list`}>
        {paginatedActions.map((action) => {
          const decor = toneDecor(action.tone, action.destructive);
          return (
            <Pressable
              key={action.key}
              accessibilityRole="button"
              disabled={action.disabled}
              nativeID={`${idPrefix}-${action.key}-button`}
              onPress={() => {
                if (closeOnAction) {
                  onClose();
                  setTimeout(() => action.onPress(), 200);
                } else {
                  action.onPress();
                }
              }}
              style={(state) => {
                const hovered = (state as typeof state & { hovered?: boolean }).hovered;
                return [
                  styles.modalQuickActionCard,
                  decor.wrap,
                  desktopCard ? styles.modalQuickActionCardDesktop : null,
                  hovered && !action.disabled ? styles.modalQuickActionCardHovered : null,
                  state.pressed && !action.disabled ? styles.modalQuickActionCardPressed : null,
                  action.disabled ? styles.modalQuickActionCardDisabled : null,
                ];
              }}
              testID={`${idPrefix}-${action.key}-button`}
            >
              <View
                nativeID={`${idPrefix}-${action.key}-icon-wrap`}
                style={[styles.modalActionIconWrap, decor.iconWrap]}
                testID={`${idPrefix}-${action.key}-icon-wrap`}
              >
                {renderActionIcon(action, decor.iconColor)}
              </View>
              <Text
                nativeID={`${idPrefix}-${action.key}-label`}
                style={[styles.modalQuickActionTitle, { color: decor.title }]}
                testID={`${idPrefix}-${action.key}-label`}
              >
                {action.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {actions.length > PAGE_SIZE ? (
        <View nativeID={`${idPrefix}-pagination-controls`} style={styles.paginationControls} testID={`${idPrefix}-pagination-controls`}>
          <AppButton
            label="Anterior"
            variant="secondary"
            nativeID={`${idPrefix}-pagination-prev-button`}
            testID={`${idPrefix}-pagination-prev-button`}
            onPress={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page === 1}
          />
          <Text nativeID={`${idPrefix}-pagination-label`} style={styles.paginationLabel} testID={`${idPrefix}-pagination-label`}>
            {`Página ${page} de ${totalPages} · ${actions.length} acciones`}
          </Text>
          <AppButton
            label="Siguiente"
            variant="secondary"
            nativeID={`${idPrefix}-pagination-next-button`}
            testID={`${idPrefix}-pagination-next-button`}
            onPress={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={page === totalPages}
          />
        </View>
      ) : null}
    </AppModal>
  );
}

const styles = StyleSheet.create({
  modalQuickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    width: "100%",
  },
  modalQuickActionCard: {
    alignItems: "flex-start",
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: "100%",
    flexGrow: 0,
    flexShrink: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  modalQuickActionCardDesktop: {
    flexBasis: "48.5%",
  },
  modalQuickActionCardHovered: {
    backgroundColor: "rgba(120, 78, 46, 0.05)",
    borderColor: "rgba(120, 78, 46, 0.25)",
    transform: [{ translateY: -1 }],
  },
  modalQuickActionCardPressed: {
    backgroundColor: "rgba(120, 78, 46, 0.12)",
    transform: [{ scale: 0.985 }],
  },
  modalQuickActionCardDisabled: {
    opacity: 0.55,
  },
  paginationControls: {
    alignItems: "center",
    alignSelf: "stretch",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    marginTop: spacing.md,
    width: "100%",
  },
  paginationLabel: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
  },
  modalActionIconWrap: {
    alignItems: "center",
    borderRadius: radius.md,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  modalActionIconWrapDefault: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  modalActionPrimary: {
    borderColor: "rgba(46, 125, 50, 0.3)",
  },
  modalActionIconWrapPrimary: {
    backgroundColor: colors.info,
  },
  modalActionSuccess: {
    borderColor: "rgba(46, 125, 50, 0.3)",
  },
  modalActionIconWrapSuccess: {
    backgroundColor: colors.success,
  },
  modalActionWarning: {
    borderColor: "rgba(249, 168, 37, 0.3)",
  },
  modalActionIconWrapWarning: {
    backgroundColor: colors.warning,
  },
  modalActionDanger: {
    borderColor: "rgba(198, 40, 40, 0.25)",
  },
  modalActionIconWrapDanger: {
    backgroundColor: colors.danger,
  },
  modalQuickActionTitle: {
    fontFamily: typography.headingFamily,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 18,
  },
});
