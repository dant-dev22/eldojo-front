import { ReactNode } from "react";
import { Platform, StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";

import { colors, radius, spacing, typography } from "@/constants/theme";

export interface AppInputProps extends TextInputProps {
  label: string;
  error?: string | null;
  rightAdornment?: ReactNode;
  wrapperClassName?: string;
  labelClassName?: string;
  containerClassName?: string;
  inputClassName?: string;
  adornmentClassName?: string;
  errorClassName?: string;
}

function getWebClassNameProps(className?: string) {
  return Platform.OS === "web" && className ? ({ className } as { className: string }) : {};
}

export function AppInput({
  label,
  error,
  rightAdornment,
  style,
  nativeID,
  testID,
  wrapperClassName,
  labelClassName,
  containerClassName,
  inputClassName,
  adornmentClassName,
  errorClassName,
  ...props
}: AppInputProps) {
  const baseId =
    nativeID ?? testID ?? `components-app-input-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <View
      nativeID={`${baseId}-wrapper`}
      style={styles.wrapper}
      testID={`${baseId}-wrapper`}
      {...getWebClassNameProps(wrapperClassName ?? `${baseId}-wrapper`)}
    >
      <Text
        nativeID={`${baseId}-label`}
        style={styles.label}
        testID={`${baseId}-label`}
        {...getWebClassNameProps(labelClassName ?? `${baseId}-label`)}
      >
        {label}
      </Text>
      <View
        nativeID={`${baseId}-container`}
        style={[styles.inputContainer, error ? styles.inputError : null]}
        testID={`${baseId}-container`}
        {...getWebClassNameProps(containerClassName ?? `${baseId}-container`)}
      >
        <TextInput
          nativeID={nativeID}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, style]}
          testID={testID}
          {...getWebClassNameProps(inputClassName ?? baseId)}
          {...props}
        />
        {rightAdornment ? (
          <View
            nativeID={`${baseId}-adornment`}
            style={styles.adornment}
            testID={`${baseId}-adornment`}
            {...getWebClassNameProps(adornmentClassName ?? `${baseId}-adornment`)}
          >
            {rightAdornment}
          </View>
        ) : null}
      </View>
      {error ? (
        <Text
          nativeID={`${baseId}-error`}
          style={styles.error}
          testID={`${baseId}-error`}
          {...getWebClassNameProps(errorClassName ?? `${baseId}-error`)}
        >
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
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.35,
    textTransform: "uppercase",
  },
  inputContainer: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
  },
  input: {
    color: colors.text,
    flex: 1,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    minHeight: 48,
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
    fontSize: 11,
  },
});
