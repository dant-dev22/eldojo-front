import { Picker } from "@react-native-picker/picker";
import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "@/constants/theme";

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

  return (
    <View nativeID={`${baseId}-wrapper`} style={styles.wrapper} testID={`${baseId}-wrapper`}>
      <Text nativeID={`${baseId}-label`} style={styles.label} testID={`${baseId}-label`}>
        {label}
      </Text>
      <View
        nativeID={`${baseId}-container`}
        style={[styles.container, error ? styles.containerError : null, !enabled ? styles.disabled : null]}
        testID={`${baseId}-container`}
      >
        <Picker
          enabled={enabled}
          nativeID={nativeID}
          onValueChange={(itemValue) => onValueChange(String(itemValue))}
          selectedValue={value}
          testID={testID}
        >
          <Picker.Item color={colors.textMuted} label={placeholder} value="" />
          {items.map((item) => (
            <Picker.Item key={item.value} label={item.label} value={item.value} />
          ))}
        </Picker>
      </View>
      {error ? (
        <Text nativeID={`${baseId}-error`} style={styles.error} testID={`${baseId}-error`}>
          {error}
        </Text>
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
    color: colors.primary,
    fontFamily: typography.headingFamily,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  container: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 56,
    overflow: "hidden",
  },
  containerError: {
    borderColor: colors.danger,
  },
  disabled: {
    opacity: 0.65,
  },
  error: {
    color: colors.danger,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
  },
});
