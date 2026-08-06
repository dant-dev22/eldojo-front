import { Feather } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ConfirmActionModal } from "@/components/ConfirmActionModal";
import { colors, radius, spacing, transitions, typography } from "@/constants/theme";

type StatusValue = "active" | "inactive";

interface AppStatusSwitchProps {
  label: string;
  value: StatusValue;
  onValueChange: (value: StatusValue) => void;
  entityName?: string;
  entityType?: "dojo" | "sucursal" | "clase" | "custom";
  activeLabel?: string;
  inactiveLabel?: string;
  activateTitle?: string;
  activateMessage?: string;
  activateConfirmLabel?: string;
  deactivateTitle?: string;
  deactivateMessage?: string;
  deactivateConfirmLabel?: string;
  error?: string | null;
  enabled?: boolean;
  nativeID?: string;
  testID?: string;
}

export function AppStatusSwitch({
  label,
  value,
  onValueChange,
  entityName,
  entityType = "custom",
  activeLabel = "Activa",
  inactiveLabel = "Inactiva",
  activateTitle,
  activateMessage,
  activateConfirmLabel,
  deactivateTitle,
  deactivateMessage,
  deactivateConfirmLabel,
  error,
  enabled = true,
  nativeID,
  testID,
}: AppStatusSwitchProps) {
  const baseId =
    nativeID ?? testID ?? `components-app-status-switch-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  const [confirmVisible, setConfirmVisible] = useState(false);
  const [pendingValue, setPendingValue] = useState<StatusValue | null>(null);
  const translateAnim = useRef(new Animated.Value(value === "active" ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(translateAnim, {
      duration: transitions.fast,
      easing: Easing.out(Easing.quad),
      toValue: value === "active" ? 1 : 0,
      useNativeDriver: false,
    }).start();
  }, [value, translateAnim]);

  const isActive = value === "active";

  const entityDisplayName =
    entityName && entityName.trim().length > 0 ? entityName.trim() : defaultEntityName(entityType);

  const defaultActivateTitle = defaultActivateTitles(entityType, entityDisplayName);
  const defaultActivateMessage = defaultActivateMessages(entityType, entityDisplayName);
  const defaultDeactivateTitle = defaultDeactivateTitles(entityType, entityDisplayName);
  const defaultDeactivateMessage = defaultDeactivateMessages(entityType, entityDisplayName);

  const dialogActivateTitle = activateTitle ?? defaultActivateTitle;
  const dialogActivateMessage = activateMessage ?? defaultActivateMessage;
  const dialogActivateConfirm = activateConfirmLabel ?? "Sí, activar";
  const dialogDeactivateTitle = deactivateTitle ?? defaultDeactivateTitle;
  const dialogDeactivateMessage = deactivateMessage ?? defaultDeactivateMessage;
  const dialogDeactivateConfirm = deactivateConfirmLabel ?? "Sí, desactivar";

  function handleToggleRequest() {
    if (!enabled) return;
    const next: StatusValue = isActive ? "inactive" : "active";
    setPendingValue(next);
    setConfirmVisible(true);
  }

  function handleConfirm() {
    if (pendingValue != null) {
      onValueChange(pendingValue);
    }
    setConfirmVisible(false);
    setPendingValue(null);
  }

  function handleCancel() {
    setConfirmVisible(false);
    setPendingValue(null);
  }

  const confirmTitle = pendingValue === "active" ? dialogActivateTitle : dialogDeactivateTitle;
  const confirmMessage = pendingValue === "active" ? dialogActivateMessage : dialogDeactivateMessage;
  const confirmLabel = pendingValue === "active" ? dialogActivateConfirm : dialogDeactivateConfirm;
  const confirmVariant = pendingValue === "active" ? "success" : "danger";

  const thumbTranslateX = Animated.multiply(translateAnim, 22);

  return (
    <View style={styles.wrapper} nativeID={`${baseId}-wrapper`} testID={`${baseId}-wrapper`}>
      <Text style={styles.label} nativeID={`${baseId}-label`} testID={`${baseId}-label`}>
        {label}
      </Text>

      <Pressable
        accessibilityLabel={`${label}, ${isActive ? activeLabel : inactiveLabel}`}
        accessibilityRole="switch"
        accessibilityState={{ checked: isActive, disabled: !enabled }}
        aria-checked={isActive}
        disabled={!enabled}
        nativeID={`${baseId}-control`}
        onPress={handleToggleRequest}
        style={[styles.controlRow, !enabled ? styles.disabled : null]}
        testID={`${baseId}-control`}
      >
        <View
          style={[
            styles.track,
            isActive ? styles.trackActive : styles.trackInactive,
            error ? styles.trackError : null,
          ]}
          nativeID={`${baseId}-track`}
          testID={`${baseId}-track`}
        >
          <Animated.View
            style={[
              styles.thumb,
              { transform: [{ translateX: thumbTranslateX }] },
              isActive ? styles.thumbActive : styles.thumbInactive,
            ]}
            nativeID={`${baseId}-thumb`}
            testID={`${baseId}-thumb`}
          >
            <Feather
              color={isActive ? colors.success : colors.textMuted}
              name={isActive ? "power" : "power"}
              size={14}
            />
          </Animated.View>
        </View>

        <Text
          style={[styles.statusText, isActive ? styles.statusTextActive : styles.statusTextInactive]}
          nativeID={`${baseId}-status`}
          testID={`${baseId}-status`}
        >
          {isActive ? activeLabel : inactiveLabel}
        </Text>
      </Pressable>

      {error ? (
        <View style={styles.errorRow}>
          <Feather color={colors.danger} name="alert-circle" size={14} />
          <Text style={styles.error} nativeID={`${baseId}-error`} testID={`${baseId}-error`}>
            {error}
          </Text>
        </View>
      ) : null}

      <ConfirmActionModal
        cancelLabel="Cancelar"
        confirmLabel={confirmLabel}
        confirmVariant={confirmVariant}
        idPrefix={`${baseId}-confirm`}
        message={confirmMessage}
        onCancel={handleCancel}
        onConfirm={handleConfirm}
        title={confirmTitle}
        visible={confirmVisible}
      />
    </View>
  );
}

function defaultEntityName(entityType: AppStatusSwitchProps["entityType"]): string {
  switch (entityType) {
    case "dojo":
      return "este dojo";
    case "sucursal":
      return "esta sucursal";
    case "clase":
      return "esta clase";
    case "custom":
    default:
      return "este elemento";
  }
}

function defaultActivateTitles(entityType: AppStatusSwitchProps["entityType"], _entityDisplayName: string): string {
  switch (entityType) {
    case "sucursal":
      return "Activar sucursal";
    case "dojo":
      return "Activar dojo";
    case "clase":
      return "Activar clase";
    case "custom":
    default:
      return "Activar";
  }
}

function defaultActivateMessages(entityType: AppStatusSwitchProps["entityType"], entityDisplayName: string): string {
  switch (entityType) {
    case "sucursal":
      return `Vas a activar ${entityDisplayName}. Volverá a estar disponible para operar desde el dashboard. ¿Estás seguro?`;
    case "dojo":
      return `Vas a activar ${entityDisplayName}. Volverá a estar operativo en el panel. ¿Estás seguro?`;
    case "clase":
      return `Vas a activar ${entityDisplayName}. Volverá a aparecer en los listados y podrá recibir asistencias. ¿Estás seguro?`;
    case "custom":
    default:
      return `Vas a activar ${entityDisplayName}. ¿Estás seguro?`;
  }
}

function defaultDeactivateTitles(entityType: AppStatusSwitchProps["entityType"], _entityDisplayName: string): string {
  switch (entityType) {
    case "sucursal":
      return "Desactivar sucursal";
    case "dojo":
      return "Desactivar dojo";
    case "clase":
      return "Desactivar clase";
    case "custom":
    default:
      return "Desactivar";
  }
}

function defaultDeactivateMessages(entityType: AppStatusSwitchProps["entityType"], entityDisplayName: string): string {
  switch (entityType) {
    case "sucursal":
      return `Vas a desactivar ${entityDisplayName}. Dejará de estar disponible para operar desde el dashboard. ¿Estás seguro?`;
    case "dojo":
      return `Vas a desactivar ${entityDisplayName}. Dejará de estar operativo en el panel. ¿Estás seguro?`;
    case "clase":
      return `Vas a desactivar ${entityDisplayName}. Dejará de aparecer en los listados y no podrá recibir asistencias. ¿Estás seguro?`;
    case "custom":
    default:
      return `Vas a desactivar ${entityDisplayName}. ¿Estás seguro?`;
  }
}

const TRACK_HEIGHT = 32;
const THUMB_SIZE = 24;

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    gap: spacing.xs,
  },
  label: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.4,
    paddingHorizontal: 2,
    textTransform: "uppercase",
  },
  controlRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 44,
    paddingHorizontal: 2,
  },
  track: {
    alignItems: "flex-start",
    borderRadius: 999,
    height: TRACK_HEIGHT,
    justifyContent: "center",
    paddingHorizontal: 4,
    width: 52,
    ...Platform.select({
      web: {
        transition: `background-color ${transitions.fast}ms ease`,
      } as any,
    }),
  },
  trackActive: {
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: colors.success,
  },
  trackInactive: {
    backgroundColor: colors.woodSoft,
    borderWidth: 1,
    borderColor: colors.wood,
  },
  trackError: {
    borderColor: colors.danger,
    borderWidth: 2,
  },
  thumb: {
    alignItems: "center",
    borderRadius: 999,
    height: THUMB_SIZE,
    justifyContent: "center",
    width: THUMB_SIZE,
    ...Platform.select({
      web: {
        transition: `background-color ${transitions.fast}ms ease`,
      } as any,
    }),
  },
  thumbActive: {
    backgroundColor: colors.success,
  },
  thumbInactive: {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  statusText: {
    fontFamily: typography.headingFamily,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  statusTextActive: {
    color: colors.success,
  },
  statusTextInactive: {
    color: colors.textMuted,
  },
  disabled: {
    opacity: 0.55,
  },
  errorRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 2,
  },
  error: {
    color: colors.danger,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
  },
});

export type { StatusValue as AppStatusSwitchValue };
export type { AppStatusSwitchProps };
