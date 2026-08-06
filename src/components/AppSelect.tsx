import { Feather } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { colors, radius, spacing, transitions, typography } from "@/constants/theme";

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

  if (Platform.OS === "web") {
    return (
      <WebDropdown
        baseId={baseId}
        enabled={enabled}
        error={error}
        hasValue={hasValue as boolean}
        items={items}
        label={label}
        onValueChange={onValueChange}
        placeholder={placeholder}
        selectedLabel={selectedLabel}
        value={value}
      />
    );
  }

  return (
    <View nativeID={`${baseId}-wrapper`} style={styles.wrapper} testID={`${baseId}-wrapper`}>
      <Text nativeID={`${baseId}-label`} style={styles.label} testID={`${baseId}-label`}>
        {label}
      </Text>

      <View
        accessible
        accessibilityState={{ disabled: !enabled }}
        aria-invalid={error ? "true" : undefined}
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
          nativeID={`${baseId}-underline`}
          pointerEvents="none"
          style={[styles.underline, error ? styles.underlineError : null]}
          testID={`${baseId}-underline`}
        />

        <Picker
          accessibilityLabel={label}
          aria-label={label}
          enabled={enabled}
          nativeID={nativeID}
          onValueChange={(itemValue) => onValueChange(String(itemValue))}
          selectedValue={value}
          style={styles.pickerNative}
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

interface WebDropdownProps extends Required<Pick<AppSelectProps, "label" | "value" | "onValueChange" | "items">> {
  baseId: string;
  enabled: boolean;
  error: string | null | undefined;
  hasValue: boolean;
  placeholder: string;
  selectedLabel: string;
}

function WebDropdown({
  baseId,
  enabled,
  error,
  hasValue,
  items,
  label,
  onValueChange,
  placeholder,
  selectedLabel,
  value,
}: WebDropdownProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const animatedOpacity = useRef(new Animated.Value(0)).current;
  const animatedTranslate = useRef(new Animated.Value(-6)).current;

  useEffect(() => {
    if (!enabled) {
      setOpen(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!Platform.OS || Platform.OS !== "web") return;
    const root = typeof document !== "undefined" ? document : null;
    if (!root) return;

    function handlePointerDown(evt: MouseEvent) {
      const node = wrapRef.current;
      if (!node) return;
      if (evt.target instanceof Node && !node.contains(evt.target)) {
        setOpen(false);
      }
    }
    function handleKey(evt: KeyboardEvent) {
      if (evt.key === "Escape") {
        setOpen(false);
      }
    }
    function handleResize() {
      setOpen(false);
    }
    function handleScroll(evt: Event) {
      const target = evt.target;
      const node = wrapRef.current;
      if (target instanceof Node && node && !node.contains(target)) {
        setOpen(false);
      }
    }

    root.addEventListener("mousedown", handlePointerDown as any);
    root.addEventListener("keydown", handleKey as any);
    root.addEventListener("scroll", handleScroll as any, true);
    if (typeof window !== "undefined") {
      window.addEventListener("resize", handleResize);
    }
    return () => {
      root.removeEventListener("mousedown", handlePointerDown as any);
      root.removeEventListener("keydown", handleKey as any);
      root.removeEventListener("scroll", handleScroll as any, true);
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", handleResize);
      }
    };
  }, []);

  useEffect(() => {
    Animated.timing(animatedOpacity, {
      duration: transitions.fast,
      easing: Easing.out(Easing.quad),
      toValue: open ? 1 : 0,
      useNativeDriver: false,
    }).start();
    Animated.timing(animatedTranslate, {
      duration: transitions.fast,
      easing: Easing.out(Easing.quad),
      toValue: open ? 0 : -6,
      useNativeDriver: false,
    }).start();
  }, [open, animatedOpacity, animatedTranslate]);

  function toggle() {
    if (!enabled) return;
    if (!open && typeof Keyboard !== "undefined") {
      Keyboard.dismiss();
    }
    setOpen((prev) => !prev);
  }

  function choose(nextValue: string) {
    onValueChange(nextValue);
    setOpen(false);
  }

  const containerWebProps = useMemo(
    () =>
      Platform.OS === "web"
        ? ({
            ref: wrapRef as any,
          } as { ref: React.MutableRefObject<HTMLDivElement | null> })
        : {},
    [],
  );

  return (
    <View nativeID={`${baseId}-wrapper`} style={styles.wrapper} testID={`${baseId}-wrapper`}>
      <WebGlobalStyles />

      <Text nativeID={`${baseId}-label`} style={styles.label} testID={`${baseId}-label`}>
        {label}
      </Text>

      <View
        {...containerWebProps}
        accessible
        accessibilityState={{ disabled: !enabled, expanded: open }}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-invalid={error ? "true" : undefined}
        id={baseId}
        nativeID={`${baseId}-container`}
        style={[styles.container, !enabled ? styles.disabled : null]}
        testID={`${baseId}-container`}
      >
        <Pressable
          accessibilityLabel={label}
          aria-label={label}
          disabled={!enabled}
          nativeID={`${baseId}-trigger`}
          onPress={toggle}
          role="combobox"
          style={styles.trigger}
          testID={`${baseId}-trigger`}
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
            <View
              style={[
                styles.chevronWrap,
                open ? { transform: [{ rotate: "180deg" }] } : null,
              ]}
            >
              <Feather
                color={error ? colors.danger : colors.wood}
                name="chevron-down"
                size={18}
                style={styles.chevron}
              />
            </View>
          </View>

          <View
            id={`${baseId}-underline`}
            nativeID={`${baseId}-underline`}
            pointerEvents="none"
            style={[
              styles.underline,
              error ? styles.underlineError : open ? styles.underlineFocus : null,
            ]}
            testID={`${baseId}-underline`}
          />
        </Pressable>

        {enabled ? (
          <Animated.View
            aria-hidden={!open}
            id={`${baseId}-menu`}
            nativeID={`${baseId}-menu`}
            pointerEvents={open ? "auto" : "none"}
            role={"listbox" as any}
            style={[
              styles.menu,
              {
                opacity: animatedOpacity,
                transform: [{ translateY: animatedTranslate }],
              },
            ]}
            testID={`${baseId}-menu`}
          >
            {[
              { __placeholder: true as const, label: placeholder, value: "" },
              ...items.map((i) => ({ __placeholder: false as const, label: i.label, value: i.value })),
            ].map((row, idx) => {
              const selected = row.__placeholder ? !hasValue : value === row.value;
              return (
                <Pressable
                  key={row.__placeholder ? "__placeholder" : row.value}
                  aria-selected={selected}
                  nativeID={row.__placeholder ? `${baseId}-option-placeholder` : `${baseId}-option-${idx}`}
                  onPress={() => choose(row.value)}
                  role="option"
                  style={(state: any) => [
                    styles.option,
                    selected ? styles.optionSelected : null,
                    state.hovered || state.pressed ? styles.optionHover : null,
                  ]}
                  testID={row.__placeholder ? `${baseId}-option-placeholder` : `${baseId}-option-${row.value}`}
                >
                  {(state: any) => {
                    const isHover = state.hovered || state.pressed;
                    return (
                      <>
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.optionText,
                            row.__placeholder && !selected ? styles.placeholderText : null,
                            selected ? styles.optionTextSelected : null,
                            isHover ? styles.optionTextHover : null,
                          ]}
                        >
                          {row.label}
                        </Text>
                        {selected ? (
                          <Feather
                            color={isHover ? "#FFFFFF" : colors.success}
                            name="check"
                            size={16}
                          />
                        ) : null}
                      </>
                    );
                  }}
                </Pressable>
              );
            })}
          </Animated.View>
        ) : null}
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

function WebGlobalStyles() {
  if (Platform.OS !== "web") return null;
  return (
    <style>{`
      @keyframes app-select-menu-in {
        from { opacity: 0; transform: translateY(-6px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `}</style>
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
  trigger: {
    alignSelf: "stretch",
    minHeight: 44,
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
  chevronWrap: {
    alignItems: "center",
    height: 20,
    justifyContent: "center",
    width: 20,
    ...Platform.select({
      web: {
        transition: `transform ${transitions.fast}ms ease`,
      } as any,
    }),
  },
  chevron: {
    opacity: 0.85,
  },
  underline: {
    alignSelf: "stretch",
    backgroundColor: colors.woodSoft,
    height: 1,
    marginTop: 0,
  },
  underlineFocus: {
    backgroundColor: colors.primary,
    height: 2,
  },
  underlineError: {
    backgroundColor: colors.danger,
    height: 2,
  },
  menu: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    elevation: 12,
    left: -8,
    maxHeight: 288,
    minWidth: 220,
    overflow: "hidden",
    padding: 6,
    position: "absolute",
    right: -8,
    shadowColor: "#1A1A1A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    top: "100%",
    width: "auto",
    zIndex: 50,
  },
  option: {
    alignItems: "center",
    borderRadius: radius.md,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    minHeight: 40,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  optionHover: {
    backgroundColor: colors.success,
  },
  optionSelected: {
    backgroundColor: colors.successSoft,
  },
  optionText: {
    color: colors.text,
    flex: 1,
    fontFamily: typography.bodyFamily,
    fontSize: 15,
  },
  optionTextHover: {
    color: "#FFFFFF",
  },
  optionTextSelected: {
    color: colors.text,
    fontWeight: "600",
  },
  pickerNative: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "transparent",
    height: "100%",
    opacity: 0.001,
    width: "100%",
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
