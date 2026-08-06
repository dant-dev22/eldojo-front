import { Feather } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { Platform, StyleSheet, Text, View } from "react-native";

import { colors, spacing, transitions, typography } from "@/constants/theme";

interface SelectItem {
  label: string;
  value: string;
}

interface AppSelectProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  items: SelectItem[];
  placeholder?: string;
  enabled?: boolean;
  error?: string | null;
  nativeID?: string;
  testID?: string;
}

export function AppSelect({
  label,
  value,
  onValueChange,
  items,
  placeholder = "Selecciona una opción",
  enabled = true,
  error,
  nativeID,
  testID,
}: AppSelectProps) {
  const baseId =
    nativeID ?? testID ?? `components-app-select-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  const hasValue = value && value !== "";
  const selectedLabel =
    items.find((i) => i.value === value)?.label ?? (hasValue ? value : "");

  return (
    <View nativeID={`${baseId}-wrapper`} style={styles.wrapper} testID={`${baseId}-wrapper`}>
      {Platform.OS === "web" ? <style>{selectStyles(baseId, error)}</style> : null}

      <Text
        nativeID={`${baseId}-label`}
        style={styles.label}
        testID={`${baseId}-label`}
      >
        {label}
      </Text>

      <View
        accessible
        accessibilityState={{ disabled: !enabled }}
        aria-invalid={error ? "true" : undefined}
        id={baseId}
        nativeID={`${baseId}-container`}
        style={[styles.container, !enabled ? styles.disabled : null]}
        testID={`${baseId}-container`}
      >
        <View
          nativeID={`${baseId}-value-line`}
          pointerEvents="none"
          style={styles.valueLine}
          testID={`${baseId}-value-line`}
        >
          <Text
            numberOfLines={1}
            style={[styles.valueText, !hasValue ? styles.placeholderText : null]}
          >
            {hasValue ? selectedLabel : placeholder}
          </Text>
          <Feather
            color={error ? colors.danger : colors.wood}
            name="chevron-down"
            size={18}
            style={styles.chevron}
          />
        </View>

        <View
          id={`${baseId}-underline`}
          nativeID={`${baseId}-underline`}
          pointerEvents="none"
          style={[
            styles.underline,
            error ? styles.underlineError : null,
          ]}
          testID={`${baseId}-underline`}
        />

        <Picker
          accessibilityLabel={label}
          aria-label={label}
          enabled={enabled}
          id={`${baseId}-picker`}
          nativeID={nativeID}
          onValueChange={(itemValue) => onValueChange(String(itemValue))}
          selectedValue={value}
          style={styles.picker}
          testID={testID}
        >
          <Picker.Item color={colors.textMuted} label={placeholder} value="" />
          {items.map((item) => (
            <Picker.Item key={item.value} label={item.label} value={item.value} />
          ))}
        </Picker>
      </View>

      {error ? (
        <View style={styles.errorRow}>
          <Feather color={colors.danger} name="alert-circle" size={14} />
          <Text nativeID={`${baseId}-error`} style={styles.error} testID={`${baseId}-error`}>
            {error}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

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
  container: {
    minHeight: 52,
    paddingHorizontal: 2,
    position: "relative",
    justifyContent: "center",
  },
  valueLine: {
    alignItems: "center",
    alignSelf: "stretch",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 44,
  },
  valueText: {
    color: colors.text,
    flex: 1,
    fontFamily: typography.bodyFamily,
    fontSize: 16,
    marginRight: spacing.sm,
  },
  placeholderText: {
    color: colors.textMuted,
  },
  chevron: {
    opacity: 0.85,
  },
  underline: {
    alignSelf: "stretch",
    backgroundColor: colors.woodSoft,
    height: 1,
    marginTop: 0,
    transitionDuration: `${transitions.fast}ms`,
    transitionProperty: "background-color, height",
    ...Platform.select({
      web: {
        transitionDuration: `${transitions.fast}ms`,
      } as any,
    }),
  },
  underlineError: {
    backgroundColor: colors.danger,
    height: 2,
  },
  picker: {
    ...StyleSheet.absoluteFill,
    width: "100%",
    height: "100%",
    backgroundColor: "transparent",
    color: "transparent",
    ...Platform.select({
      web: {
        appearance: "none",
        WebkitAppearance: "none",
        MozAppearance: "none",
        border: "none",
        outline: "none",
        opacity: 0.001,
        cursor: "pointer",
      } as any,
      default: {
        opacity: 0.001,
      },
    }),
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

function selectStyles(baseId: string, error?: string | null): string {
  const underlineColor = error ? colors.danger : colors.primary;
  return `
    #${baseId}:has(select:focus) #${baseId}-underline {
      background-color: ${underlineColor} !important;
      height: ${error ? 2 : 2}px !important;
    }

    #${baseId} #${baseId}-underline {
      transition: background-color ${transitions.fast}ms ease, height ${transitions.fast}ms ease;
    }

    #${baseId} #${baseId}-picker {
      z-index: 3;
    }

    #${baseId} #${baseId}-value-line {
      position: relative;
      z-index: 1;
    }

    #${baseId} #${baseId}-underline {
      position: relative;
      z-index: 1;
    }
  `;
}
