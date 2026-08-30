import { Feather } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { createElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { colors, radius, spacing, transitions, typography } from "@/constants/theme";

interface SelectItem {
  label: string;
  value: string;
}

export interface AppSelectProps {
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
        hasValue={!!hasValue}
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

const NONE_MENU_VALUE = "__appselect_none__";

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
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const menuHostRef = useRef<HTMLDivElement | null>(null);
  const menuContainerElRef = useRef<HTMLDivElement | null>(null);
  const animatedOpacity = useRef(new Animated.Value(0)).current;
  const animatedTranslate = useRef(new Animated.Value(-6)).current;
  const overlayAnimatedOpacity = useRef(new Animated.Value(0)).current;
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number; width: number } | null>(
    null,
  );
  const menuCoordsRef = useRef(menuCoords);
  useEffect(() => {
    menuCoordsRef.current = menuCoords;
  }, [menuCoords]);
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);
  const onValueChangeRef = useRef(onValueChange);
  useEffect(() => {
    onValueChangeRef.current = onValueChange;
  }, [onValueChange]);

  useEffect(() => {
    if (!enabled) setOpen(false);
  }, [enabled]);

  const readMenuPosition = useCallback(
    (): { top: number; left: number; width: number } | null => {
      const triggerNode = triggerRef.current;
      if (!triggerNode) return null;
      try {
        const rect = triggerNode.getBoundingClientRect();
        const win = typeof window !== "undefined" ? window : null;
        return {
          top: rect.bottom + 8 + (win ? win.scrollY : 0),
          left: rect.left + (win ? win.scrollX : 0),
          width: Math.max(rect.width, 200),
        };
      } catch {
        return null;
      }
    },
    [],
  );

  const updateMenuPosition = useCallback(() => {
    const coords = readMenuPosition();
    if (!coords) {
      setMenuCoords(null);
      menuCoordsRef.current = null;
      return;
    }
    menuCoordsRef.current = coords;
    // Si el menú ya está pintado en el DOM, actualizar posición directamente sin tocar state
    // (así evitamos re-ejecutar el efecto de renderizado completo del menú)
    const containerEl = menuContainerElRef.current;
    if (containerEl) {
      try {
        containerEl.style.top = `${coords.top}px`;
        containerEl.style.left = `${coords.left}px`;
        containerEl.style.width = `${coords.width}px`;
        containerEl.style.maxWidth = `calc(100vw - ${coords.left + 24}px)`;
      } catch {
        /* ignore */
      }
    } else {
      // Aún no existe el container: actualizar state para el primer pintado
      setMenuCoords(coords);
    }
  }, [readMenuPosition]);

  useEffect(() => {
    if (!open) return;
    updateMenuPosition();
    if (Platform.OS !== "web") return;
    const win = typeof window !== "undefined" ? window : null;
    if (!win) return;
    const handler = () => updateMenuPosition();
    win.addEventListener("resize", handler);
    win.addEventListener("scroll", handler, true);
    return () => {
      win.removeEventListener("resize", handler);
      win.removeEventListener("scroll", handler, true);
    };
  }, [open, updateMenuPosition]);

  // ===== Portal host setup (DOM directo para el menú) =====
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const doc = typeof document !== "undefined" ? document : null;
    if (!doc) return;
    let host = doc.getElementById("app-select-portal-host") as HTMLDivElement | null;
    if (!host) {
      host = doc.createElement("div");
      host.id = "app-select-portal-host";
      host.setAttribute("data-app-select-portal-root", "true");
      Object.assign(host.style, {
        position: "absolute",
        top: "0px",
        left: "0px",
        width: "0px",
        height: "0px",
        pointerEvents: "none",
        zIndex: "99999",
        overflow: "visible",
      });
      doc.body.appendChild(host);
    }
    const inner = doc.createElement("div");
    Object.assign(inner.style, {
      position: "absolute",
      top: "0px",
      left: "0px",
      pointerEvents: "auto",
      overflow: "visible",
      width: "0px",
      height: "0px",
    });
    host.appendChild(inner);
    menuHostRef.current = inner;
    return () => {
      try {
        if (inner && host && host.contains(inner)) host.removeChild(inner);
      } catch {
        /* ignore */
      }
    };
  }, []);

  // ===== Click outside + choose option handlers (native DOM listeners) =====
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const doc = typeof document !== "undefined" ? document : null;
    if (!doc) return;

    function handlePointerDown(evt: MouseEvent) {
      if (!openRef.current) return;
      const wrap = wrapRef.current;
      const menuHost = menuHostRef.current;
      if (!(evt.target instanceof Node)) return;
      const insideWrap = wrap && wrap.contains(evt.target);
      const insideMenu = menuHost && menuHost.contains(evt.target);
      if (insideWrap || insideMenu) return;
      setOpen(false);
    }
    function handleKey(evt: KeyboardEvent) {
      if (evt.key === "Escape") setOpen(false);
    }

    doc.addEventListener("mousedown", handlePointerDown as any);
    doc.addEventListener("keydown", handleKey as any);
    return () => {
      doc.removeEventListener("mousedown", handlePointerDown as any);
      doc.removeEventListener("keydown", handleKey as any);
    };
  }, []);

  // ===== Open/close animations (fade + slide) =====
  useEffect(() => {
    const duration = transitions.fast;
    Animated.parallel([
      Animated.timing(animatedOpacity, {
        duration,
        easing: Easing.out(Easing.quad),
        toValue: open ? 1 : 0,
        useNativeDriver: false,
      }),
      Animated.timing(animatedTranslate, {
        duration,
        easing: Easing.out(Easing.quad),
        toValue: open ? 0 : -6,
        useNativeDriver: false,
      }),
      Animated.timing(overlayAnimatedOpacity, {
        duration,
        easing: Easing.out(Easing.quad),
        toValue: open ? 1 : 0,
        useNativeDriver: false,
      }),
    ]).start();
  }, [open, animatedOpacity, animatedTranslate, overlayAnimatedOpacity]);

  function toggle() {
    if (!enabled) return;
    if (!open && typeof Keyboard !== "undefined") Keyboard.dismiss();
    if (!open) updateMenuPosition();
    setOpen((prev) => !prev);
  }

  function choose(nextRaw: string) {
    const nextValue = nextRaw === NONE_MENU_VALUE ? "" : nextRaw;
    onValueChangeRef.current(nextValue);
    setOpen(false);
  }

  const totalOptions = items.length + 1;
  const estimatedHeight = Math.min(totalOptions * 44 + 12, 300);

  const containerWebProps = useMemo(
    () => (Platform.OS === "web" ? { ref: wrapRef as any } : {}),
    [],
  );

  const triggerWebProps =
    Platform.OS === "web"
      ? ({
          ref: (el: any) => {
            try {
              (triggerRef as any).current = el ? (el as HTMLElement) : null;
            } catch {
              /* ignore */
            }
          },
        } as any)
      : undefined;

  // ===== Build menu as native DOM elements (web) so clicks work inside portal =====
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const host = menuHostRef.current;
    if (!host) return;
    const doc = host.ownerDocument ?? document;

    // Clear previous content
    while (host.firstChild) host.removeChild(host.firstChild);
    // Reset container ref on every rebuild / cleanup
    menuContainerElRef.current = null;

    if (!open) {
      host.style.display = "none";
      return;
    }
    host.style.display = "block";

    // Leer coords desde la última lectura disponible (ref) o recalcular
    let coords = menuCoordsRef.current ?? null;
    if (!coords) {
      try {
        const triggerNode = triggerRef.current;
        if (triggerNode) {
          const rect = triggerNode.getBoundingClientRect();
          const win = typeof window !== "undefined" ? window : null;
          coords = {
            top: rect.bottom + 8 + (win ? win.scrollY : 0),
            left: rect.left + (win ? win.scrollX : 0),
            width: Math.max(rect.width, 200),
          };
        }
      } catch {
        /* ignore */
      }
    }

    const topPx = coords ? `${coords.top}px` : "0px";
    const leftPx = coords ? `${coords.left}px` : "0px";
    const widthPx = coords ? `${coords.width}px` : "220px";

    const container = doc.createElement("div");
    container.id = `${baseId}-menu`;
    container.setAttribute("role", "listbox");
    container.setAttribute("data-testid", `${baseId}-menu`);
    container.setAttribute("native-id", `${baseId}-menu`);
    // Copy styles.menu + styles.menuPortalled CSS
    Object.assign(container.style, {
      position: "absolute" as const,
      top: topPx,
      left: leftPx,
      width: widthPx,
      minWidth: "220px",
      maxWidth: `calc(100vw - ${coords ? coords.left + 24 : 24}px)`,
      backgroundColor: "#FFFFFF",
      borderRadius: "12px",
      border: "1px solid rgba(26, 26, 26, 0.08)",
      boxShadow: "0 10px 30px rgba(26, 26, 26, 0.12)",
      padding: "6px",
      zIndex: 99999,
      pointerEvents: "auto",
      overflow: "hidden",
      backdropFilter: "blur(4px)",
      // animate opacity / maxHeight with CSS transition
      opacity: 0,
      transform: "translateY(-6px)",
      transition: `opacity ${transitions.fast}ms ease, transform ${transitions.fast}ms ease, max-height ${transitions.fast}ms ease, min-height ${transitions.fast}ms ease`,
      minHeight: 0,
      maxHeight: 0,
    });

    // Expose the container for direct style updates (position) without state changes
    menuContainerElRef.current = container;

    // Force reflow so transition triggers
    requestAnimationFrame(() => {
      if (menuContainerElRef.current === container) {
        container.style.opacity = "1";
        container.style.transform = "translateY(0)";
        container.style.minHeight = "56px";
        container.style.maxHeight = `${estimatedHeight}px`;
      }
    });

    const scroll = doc.createElement("div");
    Object.assign(scroll.style, {
      overflowY: "auto" as const,
      overflowX: "hidden" as const,
      width: "100%",
      maxHeight: `${estimatedHeight - 12}px`,
      height: "auto",
      padding: "0px",
      display: "flex",
      flexDirection: "column" as const,
      gap: "2px",
      overscrollBehavior: "contain" as const,
      touchAction: "pan-y" as const,
      position: "relative" as const,
    });

    const stopScrollPropagation = (e: Event) => {
      e.stopPropagation();
    };
    scroll.addEventListener("wheel", stopScrollPropagation, true);
    scroll.addEventListener("touchmove", stopScrollPropagation, true);
    scroll.addEventListener("scroll", stopScrollPropagation, true);
    container.addEventListener("wheel", (e) => e.stopPropagation(), true);
    container.addEventListener("touchmove", (e) => e.stopPropagation(), true);

    const optionRows: Array<{ __placeholder: boolean; label: string; value: string }> = [
      { __placeholder: true, label: placeholder, value: NONE_MENU_VALUE },
      ...items.map((i) => ({ __placeholder: false, label: i.label, value: i.value })),
    ];

    optionRows.forEach((row, idx) => {
      const selected = row.__placeholder ? !hasValue : value === row.value;
      const rowEl = doc.createElement("div");
      rowEl.setAttribute("role", "option");
      rowEl.setAttribute("aria-selected", selected ? "true" : "false");
      rowEl.setAttribute(
        "data-testid",
        row.__placeholder ? `${baseId}-option-placeholder` : `${baseId}-option-${row.value}`,
      );
      rowEl.setAttribute(
        "native-id",
        row.__placeholder ? `${baseId}-option-placeholder` : `${baseId}-option-${idx}`,
      );
      Object.assign(rowEl.style, {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: spacing.sm,
        minHeight: "44px",
        padding: "10px 12px",
        width: "100%",
        boxSizing: "border-box",
        borderRadius: "8px",
        cursor: "pointer",
        userSelect: "none",
        backgroundColor: selected ? colors.successSoft : "transparent",
        transition: `background-color ${transitions.fast}ms ease`,
      });

      const labelEl = doc.createElement("div");
      Object.assign(labelEl.style, {
        flex: "1 1 auto",
        fontFamily: typography.bodyFamily,
        fontSize: "15px",
        color: row.__placeholder && !selected ? colors.textMuted : colors.text,
        fontWeight: selected ? "600" : "400",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      });
      labelEl.textContent = row.label;

      const checkWrapper = doc.createElement("div");
      Object.assign(checkWrapper.style, {
        flex: "0 0 auto",
        width: "20px",
        height: "20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: colors.success,
      });
      if (selected) {
        // Feather "check" SVG inline
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = doc.createElementNS(svgNS, "svg");
        svg.setAttribute("xmlns", svgNS);
        svg.setAttribute("width", "16");
        svg.setAttribute("height", "16");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("fill", "none");
        svg.setAttribute("stroke", "currentColor");
        svg.setAttribute("stroke-width", "2.5");
        svg.setAttribute("stroke-linecap", "round");
        svg.setAttribute("stroke-linejoin", "round");
        svg.setAttribute("aria-hidden", "true");
        const path = doc.createElementNS(svgNS, "polyline");
        path.setAttribute("points", "20 6 9 17 4 12");
        svg.appendChild(path);
        checkWrapper.appendChild(svg);
      }

      rowEl.appendChild(labelEl);
      rowEl.appendChild(checkWrapper);

      // Hover style
      const applyHover = (hovered: boolean, pressed: boolean) => {
        if (pressed || hovered) {
          rowEl.style.backgroundColor = colors.success;
          labelEl.style.color = "#FFFFFF";
          checkWrapper.style.color = "#FFFFFF";
        } else if (selected) {
          rowEl.style.backgroundColor = colors.successSoft;
          labelEl.style.color = row.__placeholder && !selected ? colors.textMuted : colors.text;
          labelEl.style.fontWeight = "600";
          checkWrapper.style.color = colors.success;
        } else {
          rowEl.style.backgroundColor = "transparent";
          labelEl.style.color = row.__placeholder ? colors.textMuted : colors.text;
          labelEl.style.fontWeight = "400";
          checkWrapper.style.color = colors.success;
        }
      };

      rowEl.addEventListener("mouseenter", () => applyHover(true, false));
      rowEl.addEventListener("mouseleave", () => applyHover(false, false));
      rowEl.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        applyHover(true, true);
      });
      rowEl.addEventListener("mouseup", (e) => {
        e.stopPropagation();
        applyHover(true, false);
      });
      // Click handler — PRIMARY: must stopPropagation so outside click listener won't fire before this
      rowEl.addEventListener(
        "click",
        (e) => {
          e.stopPropagation();
          e.preventDefault();
          choose(row.value);
        },
        true,
      );

      scroll.appendChild(rowEl);
    });

    container.appendChild(scroll);
    host.appendChild(container);

    // Safety: if host still has no pointer-events auto for whatever reason, force it:
    host.style.pointerEvents = "auto";

    return () => {
      // Limpiar ref si este container es el que sigue vigente
      if (menuContainerElRef.current === container) {
        menuContainerElRef.current = null;
      }
    };
  }, [
    baseId,
    estimatedHeight,
    hasValue,
    items,
    open,
    placeholder,
    transitions.fast,
    value,
  ]);

  return (
    <View
      nativeID={`${baseId}-wrapper`}
      style={[styles.wrapper, open ? styles.wrapperOpen : null]}
      testID={`${baseId}-wrapper`}
    >
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
          disabled={!enabled}
          nativeID={`${baseId}-trigger`}
          onPress={toggle}
          role="combobox"
          style={styles.trigger}
          testID={`${baseId}-trigger`}
          {...triggerWebProps}
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

        {enabled && Platform.OS === "web" ? (
          <PortalLayer
            pointerEvents="none"
            animatedStyle={{ opacity: overlayAnimatedOpacity }}
            onPress={() => {}}
          />
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

interface PortalLayerProps {
  pointerEvents: "auto" | "none";
  animatedStyle: { opacity: Animated.Value };
  onPress: () => void;
}

function PortalLayer({ pointerEvents, animatedStyle, onPress }: PortalLayerProps) {
  if (Platform.OS !== "web") return null;
  return (
    <Animated.View
      id="app-select-portal-layer"
      nativeID="app-select-portal-layer"
      onStartShouldSetResponder={() => true}
      onResponderRelease={onPress}
      pointerEvents={pointerEvents}
      style={[styles.portalOverlay, animatedStyle] as any}
      testID="components-app-select-overlay"
    />
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

      [data-app-select-portal-root] {
        pointer-events: none !important;
      }
      [data-app-select-portal-root] > * {
        pointer-events: auto;
      }

      #app-select-portal-layer {
        position: fixed !important;
        inset: 0 !important;
        z-index: 99998 !important;
      }

      #app-select-portal-host {
        pointer-events: none !important;
      }
      #app-select-portal-host > * {
        pointer-events: auto !important;
      }
    `}</style>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    gap: spacing.xs,
    position: "relative",
  },
  wrapperOpen: {
    zIndex: 60,
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
  portalOverlay: {
    backgroundColor: "rgba(0, 0, 0, 0.01)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 55,
  },
  menu: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    elevation: 12,
    left: 0,
    minWidth: 200,
    overflow: Platform.OS === "web" ? ("hidden" as any) : "hidden",
    paddingVertical: 6,
    paddingHorizontal: 6,
    position: "absolute",
    right: 0,
    shadowColor: "#1A1A1A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    top: "100%",
    width: "100%",
    zIndex: 70,
    marginTop: 8,
    ...Platform.select({
      web: {
        backdropFilter: "blur(4px)",
        backfaceVisibility: "hidden",
      } as any,
    }),
  },
  menuPortalled: {
    ...Platform.select({
      web: {
        position: "absolute" as any,
        top: "auto",
        left: "auto",
        right: "auto",
        zIndex: 99999 as any,
        minWidth: 220,
      } as any,
    }),
  },
  menuScrollContent: {
    gap: 2,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  option: {
    alignItems: "center",
    borderRadius: radius.md,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    width: "100%",
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
