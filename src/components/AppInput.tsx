import { ReactNode } from "react";
import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";

import { colors, radius, spacing, typography } from "@/constants/theme";

export interface AppInputProps extends TextInputProps {
  label: string;
  error?: string | null;
  rightAdornment?: ReactNode;
}

export function AppInput({ label, error, rightAdornment, style, nativeID, testID, ...props }: AppInputProps) {
  const baseId =
    nativeID ?? testID ?? `components-app-input-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <View nativeID={`${baseId}-wrapper`} style={styles.wrapper} testID={`${baseId}-wrapper`}>
      <Text nativeID={`${baseId}-label`} style={styles.label} testID={`${baseId}-label`}>
        {label}
      </Text>
      <View
        nativeID={`${baseId}-container`}
        style={[styles.inputContainer, error ? styles.inputError : null]}
        testID={`${baseId}-container`}
      >
        <TextInput
          nativeID={nativeID}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, style]}
          testID={testID}
          {...props}
        />
        {rightAdornment ? (
          <View nativeID={`${baseId}-adornment`} style={styles.adornment} testID={`${baseId}-adornment`}>
            {rightAdornment}
          </View>
        ) : null}
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
  inputContainer: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
  },
  input: {
    color: colors.text,
    flex: 1,
    fontFamily: typography.bodyFamily,
    fontSize: 15,
    minHeight: 56,
    paddingHorizontal: spacing.md,
  },
  inputError: {
    borderColor: colors.danger,
  },
  adornment: {
    paddingRight: spacing.md,
  },
  error: {
    color: colors.danger,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
  },
});
