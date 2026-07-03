import { AppInput, type AppInputProps } from "@/components/AppInput";

interface AppDateInputProps extends Omit<AppInputProps, "rightAdornment"> {}

export function AppDateInput({ value, onChangeText, placeholder = "YYYY-MM-DD", ...props }: AppDateInputProps) {
  return (
    <AppInput
      autoCapitalize="none"
      keyboardType="numbers-and-punctuation"
      onChangeText={onChangeText}
      placeholder={placeholder}
      value={value}
      {...props}
    />
  );
}
