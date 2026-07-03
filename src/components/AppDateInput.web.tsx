import { Feather } from "@expo/vector-icons";
import { format, isValid, parse } from "date-fns";
import { es } from "date-fns/locale";
import type React from "react";
import { useEffect, useState } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import { StyleSheet, Text, View } from "react-native";

import type { AppInputProps } from "@/components/AppInput";
import { colors, radius, spacing } from "@/constants/theme";
import "react-datepicker/dist/react-datepicker.css";

interface AppDateInputProps extends Omit<AppInputProps, "rightAdornment"> {}

registerLocale("es", es);

function parseDateText(value: string | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = parse(value, "yyyy-MM-dd", new Date());
  return isValid(parsed) && format(parsed, "yyyy-MM-dd") === value ? parsed : undefined;
}

export function AppDateInput({
  value,
  onChangeText,
  placeholder = "YYYY-MM-DD",
  label,
  error,
  editable,
  autoFocus,
  onBlur,
  onFocus,
}: AppDateInputProps) {
  const [draftValue, setDraftValue] = useState(typeof value === "string" ? value : "");
  const selectedDate = parseDateText(draftValue) ?? null;

  useEffect(() => {
    setDraftValue(typeof value === "string" ? value : "");
  }, [value]);

  function handleInputChange(nextValue: string) {
    setDraftValue(nextValue);
    onChangeText?.(nextValue);
  }

  function handleSelect(date: Date | null) {
    const nextValue = date ? format(date, "yyyy-MM-dd") : "";
    setDraftValue(nextValue);
    onChangeText?.(nextValue);
  }

  return (
    <View style={styles.wrapper}>
      <style>{datePickerStyles}</style>
      <Text style={styles.label}>{label}</Text>
      <div style={webStyles.fieldWrapper}>
        <div style={webStyles.icon}>
          <Feather color={colors.textMuted} name="calendar" size={18} />
        </div>
        <DatePicker
          ariaInvalid={error ? "true" : undefined}
          autoFocus={autoFocus}
          calendarClassName="app-datepicker-calendar"
          calendarStartDay={1}
          className={`app-datepicker-input${error ? " is-error" : ""}`}
          closeOnScroll
          dateFormat="yyyy-MM-dd"
          disabled={editable === false}
          dropdownMode="select"
          locale="es"
          onBlur={onBlur as never}
          onChange={handleSelect}
          onChangeRaw={(event) => {
            const target = event?.target as HTMLInputElement | null;
            handleInputChange(target?.value ?? "");
          }}
          onFocus={onFocus as never}
          placeholderText={placeholder}
          popperClassName="app-datepicker-popper"
          popperProps={{ strategy: "fixed" }}
          popperPlacement="bottom-start"
          portalId="app-datepicker-portal"
          selected={selectedDate}
          shouldCloseOnSelect
          showMonthDropdown
          showPopperArrow={false}
          showYearDropdown
          value={draftValue}
        />
      </div>

      <Text style={styles.helper}>Escribe la fecha manualmente o elige un dia desde el calendario.</Text>
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
    fontSize: 13,
    fontWeight: "600",
  },
  helper: {
    color: colors.textMuted,
    fontSize: 12,
  },
  error: {
    color: colors.danger,
    fontSize: 12,
  },
});

const webStyles: Record<string, React.CSSProperties> = {
  fieldWrapper: {
    position: "relative",
    width: "100%",
  },
  icon: {
    left: "calc(100% - 40px)",
    pointerEvents: "none",
    position: "absolute",
    top: "15px",
    zIndex: 2,
  },
};

const datePickerStyles = `
#app-datepicker-portal {
  position: relative;
  z-index: 9999;
}

.app-datepicker-popper {
  z-index: 9999 !important;
}

#app-datepicker-portal .app-datepicker-popper {
  z-index: 9999 !important;
}

.app-datepicker-popper .react-datepicker {
  background: ${colors.surface};
  border: 1px solid ${colors.border};
  border-radius: ${radius.lg}px;
  box-shadow: 0 16px 40px rgba(17, 24, 39, 0.14);
  font-family: inherit;
  overflow: hidden;
}

.app-datepicker-popper .react-datepicker__triangle {
  display: none;
}

.app-datepicker-popper .react-datepicker__header {
  background: ${colors.surface};
  border-bottom: 1px solid ${colors.border};
  padding: 12px 12px 8px;
}

.app-datepicker-popper .react-datepicker__current-month,
.app-datepicker-popper .react-datepicker-time__header,
.app-datepicker-popper .react-datepicker-year-header {
  color: ${colors.text};
  font-size: 15px;
  font-weight: 700;
}

.app-datepicker-popper .react-datepicker__day-name {
  color: ${colors.textMuted};
  font-size: 12px;
  font-weight: 700;
  margin: 0.2rem;
  width: 2.2rem;
}

.app-datepicker-popper .react-datepicker__month {
  margin: 0.5rem 0.75rem 0.75rem;
}

.app-datepicker-popper .react-datepicker__day {
  border-radius: ${radius.md}px;
  color: ${colors.text};
  line-height: 2.2rem;
  margin: 0.2rem;
  width: 2.2rem;
}

.app-datepicker-popper .react-datepicker__day:hover,
.app-datepicker-popper .react-datepicker__day--keyboard-selected {
  background: ${colors.primarySoft ?? "#F8FAFC"};
  color: ${colors.text};
}

.app-datepicker-popper .react-datepicker__day--selected,
.app-datepicker-popper .react-datepicker__day--selected:hover {
  background: ${colors.primary};
  color: ${colors.surface};
}

.app-datepicker-popper .react-datepicker__day--today {
  font-weight: 700;
}

.app-datepicker-popper .react-datepicker__day--outside-month {
  color: #9CA3AF;
}

.app-datepicker-popper .react-datepicker__navigation {
  top: 14px;
}

.app-datepicker-popper .react-datepicker__navigation-icon::before {
  border-color: ${colors.textMuted};
}

.app-datepicker-popper .react-datepicker__month-select,
.app-datepicker-popper .react-datepicker__year-select {
  background: ${colors.surface};
  border: 1px solid ${colors.border};
  border-radius: ${radius.sm}px;
  color: ${colors.text};
  font-size: 14px;
  height: 34px;
  margin: 0 4px;
  padding: 0 8px;
}

.app-datepicker-input {
  background: ${colors.background};
  border: 1px solid ${colors.border};
  border-radius: ${radius.md}px;
  color: ${colors.text};
  font-family: inherit;
  font-size: 15px;
  min-height: 48px;
  outline: none;
  padding: 0 ${spacing.xl + 8}px 0 ${spacing.md}px;
  width: 100%;
}

.app-datepicker-input:focus {
  border-color: ${colors.primary};
  box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.08);
}

.app-datepicker-input.is-error {
  border-color: ${colors.danger};
}

.react-datepicker-wrapper,
.react-datepicker__input-container {
  display: block;
  width: 100%;
}
`;
