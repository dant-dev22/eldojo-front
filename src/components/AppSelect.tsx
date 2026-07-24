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
  return (
    <View nativeID={nativeID} style={styles.wrapper} testID={testID}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.container, error ? styles.containerError : null, !enabled ? styles.disabled : null]}>
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
      {error ? <Text style={styles.error}>{error}</Text> : null}
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
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  container: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 54,
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
