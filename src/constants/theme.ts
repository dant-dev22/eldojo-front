import { Platform } from "react-native";

/* =========================================================================
 * THEME FLEXIBLE — Sistema de resolución con overrides en runtime
 *
 *   Orden de precedencia (mayor a menor):
 *     1. localStorage / AsyncStorage  (clave: "eldojo_theme_overrides")
 *     2. Variables de entorno EXPO_PUBLIC_THEME_*
 *     3. Valores por defecto (DEFAULTS_*)
 *
 *   Para cambiar colores/spacing/typography en caliente NO necesitas editar
 *   este archivo. Usa cualquiera de estos caminos:
 *
 *   A) Consola del navegador (F12):
 *        localStorage.setItem("eldojo_theme_overrides", JSON.stringify({
 *          colors: { primary: "#FF0066", primaryHover: "#CC0052" },
 *          radius: { lg: 32 },
 *          typography: { displayFamily: '"Space Grotesk", sans-serif' }
 *        }))
 *        location.reload()
 *
 *   B) Variables de entorno (en .env.public / .env.admin / .env.student):
 *        EXPO_PUBLIC_THEME_PRIMARY=#2563EB
 *        EXPO_PUBLIC_THEME_PRIMARY_HOVER=#1D4ED8
 *        EXPO_PUBLIC_THEME_RADIUS_LG=32
 *        EXPO_PUBLIC_THEME_BODY_FONT='"DM Sans", sans-serif'
 *
 *   C) AsyncStorage (mobile):
 *        await AsyncStorage.setItem("eldojo_theme_overrides", JSON.stringify({...}))
 *
 * ========================================================================= */

/* ---------- 1. FALLBACKS (puedes seguir importándolos directamente) ------ */
export const judogiRed = "#C62828";
export const judogiRedHover = "#A81F1F";
export const judogiRedSoft = "rgba(198, 40, 40, 0.10)";

export const indigoBlue = "#1A237E";
export const indigoBlueHover = "#151C66";
export const indigoBlueSoft = "rgba(26, 35, 126, 0.10)";

export const tatamiGreen = "#558B2F";
export const tatamiGreenHover = "#456E25";
export const tatamiGreenSoft = "rgba(85, 139, 47, 0.12)";

export const goldenYellow = "#F9A825";
export const goldenYellowHover = "#D98E1A";
export const goldenYellowSoft = "rgba(249, 168, 37, 0.14)";

export const agedWood = "#8D6E63";
export const agedWoodHover = "#6D4C41";
export const agedWoodLight = "#A1887F";
export const agedWoodSoft = "rgba(141, 110, 99, 0.12)";
export const agedWoodStrong = "#6D4C41";

export const bgLight = "#FFFFFF";
export const bgDark = "#0A0A0A";

export const textPrimaryLight = "#1A1A1A";
export const textPrimaryDark = "#E8E0D8";

export const textSecondaryLight = "#6D6D6D";
export const textSecondaryDark = "#999999";

export const borderLight = "rgba(141, 110, 99, 0.22)";
export const borderStrongLight = "rgba(141, 110, 99, 0.42)";

export const EDITORIAL_BG = "#000000";
export const EDITORIAL_FG = "#FFFFFF";
export const EDITORIAL_BORDER = "rgba(255, 255, 255, 1)";
export const EDITORIAL_BORDER_SOFT = "rgba(255, 255, 255, 0.14)";
export const EDITORIAL_SURFACE = "rgba(255, 255, 255, 0.05)";
export const EDITORIAL_SURFACE_HOVER = "rgba(255, 255, 255, 0.10)";
export const EDITORIAL_FG_MUTED = "rgba(255, 255, 255, 0.68)";
export const EDITORIAL_FG_SUBTLE = "rgba(255, 255, 255, 0.44)";
export const EDITORIAL_ACCENT_SUCCESS = "#22C55E";
export const EDITORIAL_ACCENT_WARNING = "#F59E0B";
export const EDITORIAL_ACCENT_DANGER = "#EF4444";
export const EDITORIAL_RING = "rgba(255, 255, 255, 1)";
export const EDITORIAL_OVERLAY = "rgba(0, 0, 0, 0.78)";

/* ---------- 2. FUENTES POR DEFECTO (web + native) ----------------------- */
const DEFAULT_WEB_BODY =
  '"Manrope", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const DEFAULT_WEB_DISPLAY =
  '"Teko", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const DEFAULT_WEB_HEADING =
  '"Rajdhani", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const DEFAULT_WEB_MONO = '"IBM Plex Mono", "SFMono-Regular", Consolas, monospace';

/* ---------- 3. VALORES POR DEFECTO (layer 3, menor precedencia) --------- */
const DEFAULTS_COLORS = {
  background: "#000000",
  surface: EDITORIAL_SURFACE,
  surfaceAlt: EDITORIAL_SURFACE,
  surfaceStrong: "rgba(255, 255, 255, 0.08)",
  panel: "#000000",
  panelSoft: EDITORIAL_SURFACE,

  primary: "#FF7C39",
  primaryHover: "#FF6B1F",
  primarySoft: "rgba(255, 124, 57, 0.14)",

  accent: "#FF7C39",
  accentSoft: "rgba(255, 124, 57, 0.14)",

  action: "#FF7C39",
  actionHover: "#FF6B1F",
  actionSoft: "rgba(255, 124, 57, 0.14)",

  secondary: "#FFFFFF",
  secondaryHover: "rgba(255, 255, 255, 0.90)",
  secondarySoft: EDITORIAL_BORDER_SOFT,

  gold: EDITORIAL_ACCENT_WARNING,
  goldSoft: "rgba(245, 158, 11, 0.14)",

  text: "#FFFFFF",
  textMuted: EDITORIAL_FG_MUTED,

  onPrimary: "#FFFFFF",
  onPrimaryMuted: "rgba(255, 255, 255, 0.82)",

  border: EDITORIAL_BORDER_SOFT,
  borderStrong: "#FFFFFF",

  wood: EDITORIAL_FG,
  woodLight: EDITORIAL_FG_MUTED,
  woodSoft: EDITORIAL_BORDER_SOFT,
  woodStrong: EDITORIAL_BORDER,

  danger: EDITORIAL_ACCENT_DANGER,
  dangerHover: "#DC2626",
  dangerSoft: "rgba(239, 68, 68, 0.12)",

  success: EDITORIAL_ACCENT_SUCCESS,
  successHover: "#16A34A",
  successSoft: "rgba(34, 197, 94, 0.12)",

  warning: EDITORIAL_ACCENT_WARNING,
  warningHover: "#D97706",
  warningSoft: "rgba(245, 158, 11, 0.14)",

  info: EDITORIAL_FG,
  infoHover: "rgba(255, 255, 255, 0.92)",
  infoSoft: EDITORIAL_BORDER_SOFT,

  overlay: EDITORIAL_OVERLAY,
  ink: EDITORIAL_FG,

  hover: EDITORIAL_SURFACE,
  hoverStrong: EDITORIAL_SURFACE_HOVER,

  sidebar: "#000000",
  sidebarSoft: EDITORIAL_SURFACE,
  sidebarBorder: EDITORIAL_BORDER_SOFT,
  sidebarText: "#FFFFFF",
  sidebarMuted: EDITORIAL_FG_MUTED,

  activeIndicator: "#FF7C39",
  focusRing: "#FF7C39",

  metricLavender: EDITORIAL_BORDER_SOFT,
  metricWood: EDITORIAL_BORDER_SOFT,
  metricAmber: "rgba(245, 158, 11, 0.14)",
  metricBlue: EDITORIAL_BORDER_SOFT,
  metricSuccess: "rgba(34, 197, 94, 0.12)",
};

const DEFAULTS_SPACING = {
  xs: 10,
  sm: 16,
  md: 24,
  lg: 32,
  xl: 48,
  "2xl": 72,
  "3xl": 96,
};

const DEFAULTS_RADIUS = {
  sm: 0,
  md: 2,
  lg: 4,
  pill: 999,
};

const DEFAULTS_TRANSITIONS = {
  fast: 120,
  base: 200,
  slow: 320,
};

const DEFAULTS_SHADOW_COLOR = "#1A1A1A";
const DEFAULTS_ACTIVE_BORDER_WIDTH = 3;

/* ---------- 4. HELPERS: merge profundo + leer storage/env ---------------- */
type NestedRecord = Record<string, any>;

function deepMerge<T extends NestedRecord>(base: T, overrides: NestedRecord | undefined): T {
  if (!overrides || typeof overrides !== "object") return base;
  const out: NestedRecord = { ...(base as NestedRecord) };
  for (const key of Object.keys(overrides)) {
    const baseVal = (base as NestedRecord)[key];
    const ovVal = overrides[key];
    if (
      baseVal &&
      ovVal &&
      typeof baseVal === "object" &&
      typeof ovVal === "object" &&
      !Array.isArray(baseVal) &&
      !Array.isArray(ovVal)
    ) {
      out[key] = deepMerge(baseVal as NestedRecord, ovVal as NestedRecord);
    } else if (ovVal !== undefined && ovVal !== null) {
      out[key] = ovVal;
    }
  }
  return out as T;
}

function readStorageOverrides(): NestedRecord {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const raw = window.localStorage.getItem("eldojo_theme_overrides");
      if (raw) return JSON.parse(raw) || {};
    }
  } catch {
    /* noop */
  }
  return {};
}

function hexToRgba(hex: string | undefined, alpha: number): string | undefined {
  if (!hex) return undefined;
  const clean = hex.trim().replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  if (full.length !== 6) return undefined;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function readEnvOverrides(): NestedRecord {
  const env = ((typeof process !== "undefined" && process.env) || {}) as Record<string, string | undefined>;
  const out: NestedRecord = {
    colors: {},
    spacing: {},
    radius: {},
    transitions: {},
  };
  const mapKeyToPath: Record<string, [string, string]> = {
    EXPO_PUBLIC_THEME_PRIMARY: ["colors", "primary"],
    EXPO_PUBLIC_THEME_PRIMARY_HOVER: ["colors", "primaryHover"],
    EXPO_PUBLIC_THEME_PRIMARY_SOFT: ["colors", "primarySoft"],
    EXPO_PUBLIC_THEME_ACCENT: ["colors", "accent"],
    EXPO_PUBLIC_THEME_ACCENT_SOFT: ["colors", "accentSoft"],
    EXPO_PUBLIC_THEME_SECONDARY: ["colors", "secondary"],
    EXPO_PUBLIC_THEME_SECONDARY_HOVER: ["colors", "secondaryHover"],
    EXPO_PUBLIC_THEME_ACTION: ["colors", "action"],
    EXPO_PUBLIC_THEME_ACTION_HOVER: ["colors", "actionHover"],
    EXPO_PUBLIC_THEME_DANGER: ["colors", "danger"],
    EXPO_PUBLIC_THEME_DANGER_HOVER: ["colors", "dangerHover"],
    EXPO_PUBLIC_THEME_SUCCESS: ["colors", "success"],
    EXPO_PUBLIC_THEME_SUCCESS_HOVER: ["colors", "successHover"],
    EXPO_PUBLIC_THEME_WARNING: ["colors", "warning"],
    EXPO_PUBLIC_THEME_WARNING_HOVER: ["colors", "warningHover"],
    EXPO_PUBLIC_THEME_INFO: ["colors", "info"],
    EXPO_PUBLIC_THEME_INFO_HOVER: ["colors", "infoHover"],
    EXPO_PUBLIC_THEME_BG: ["colors", "background"],
    EXPO_PUBLIC_THEME_SURFACE: ["colors", "surface"],
    EXPO_PUBLIC_THEME_TEXT: ["colors", "text"],
    EXPO_PUBLIC_THEME_TEXT_MUTED: ["colors", "textMuted"],
    EXPO_PUBLIC_THEME_BORDER: ["colors", "border"],
    EXPO_PUBLIC_THEME_BORDER_STRONG: ["colors", "borderStrong"],
    EXPO_PUBLIC_THEME_SIDEBAR: ["colors", "sidebar"],
    EXPO_PUBLIC_THEME_FOCUS_RING: ["colors", "focusRing"],
    EXPO_PUBLIC_THEME_ACTIVE_INDICATOR: ["colors", "activeIndicator"],
    EXPO_PUBLIC_THEME_OVERLAY: ["colors", "overlay"],
  };
  for (const [envKey, [group, key]] of Object.entries(mapKeyToPath)) {
    const val = env[envKey];
    if (val) (out as any)[group][key] = val;
  }
  if (env.EXPO_PUBLIC_THEME_SPACING_XS) out.spacing.xs = Number(env.EXPO_PUBLIC_THEME_SPACING_XS);
  if (env.EXPO_PUBLIC_THEME_SPACING_SM) out.spacing.sm = Number(env.EXPO_PUBLIC_THEME_SPACING_SM);
  if (env.EXPO_PUBLIC_THEME_SPACING_MD) out.spacing.md = Number(env.EXPO_PUBLIC_THEME_SPACING_MD);
  if (env.EXPO_PUBLIC_THEME_SPACING_LG) out.spacing.lg = Number(env.EXPO_PUBLIC_THEME_SPACING_LG);
  if (env.EXPO_PUBLIC_THEME_SPACING_XL) out.spacing.xl = Number(env.EXPO_PUBLIC_THEME_SPACING_XL);
  if (env.EXPO_PUBLIC_THEME_SPACING_2XL) out.spacing["2xl"] = Number(env.EXPO_PUBLIC_THEME_SPACING_2XL);
  if (env.EXPO_PUBLIC_THEME_RADIUS_SM) out.radius.sm = Number(env.EXPO_PUBLIC_THEME_RADIUS_SM);
  if (env.EXPO_PUBLIC_THEME_RADIUS_MD) out.radius.md = Number(env.EXPO_PUBLIC_THEME_RADIUS_MD);
  if (env.EXPO_PUBLIC_THEME_RADIUS_LG) out.radius.lg = Number(env.EXPO_PUBLIC_THEME_RADIUS_LG);
  if (env.EXPO_PUBLIC_THEME_RADIUS_PILL) out.radius.pill = Number(env.EXPO_PUBLIC_THEME_RADIUS_PILL);
  if (env.EXPO_PUBLIC_THEME_TRANSITION_FAST)
    out.transitions.fast = Number(env.EXPO_PUBLIC_THEME_TRANSITION_FAST);
  if (env.EXPO_PUBLIC_THEME_TRANSITION_BASE)
    out.transitions.base = Number(env.EXPO_PUBLIC_THEME_TRANSITION_BASE);
  if (env.EXPO_PUBLIC_THEME_TRANSITION_SLOW)
    out.transitions.slow = Number(env.EXPO_PUBLIC_THEME_TRANSITION_SLOW);
  return out;
}

/* ---------- 5. RESOLVER FINAL (storage > env > defaults) ---------------- */
const envOvr = readEnvOverrides();
const storageOvr = readStorageOverrides();

const envWithAutoSoft = (() => {
  const c = { ...((envOvr.colors || {}) as NestedRecord) };
  if (c.primary && !c.primarySoft) c.primarySoft = hexToRgba(String(c.primary), 0.1);
  if (c.accent && !c.accentSoft) c.accentSoft = hexToRgba(String(c.accent), 0.1);
  if (c.secondary && !c.secondarySoft) c.secondarySoft = hexToRgba(String(c.secondary), 0.1);
  if (c.action && !c.actionSoft) c.actionSoft = hexToRgba(String(c.action), 0.1);
  if (c.danger && !c.dangerSoft) c.dangerSoft = hexToRgba(String(c.danger), 0.1);
  if (c.success && !c.successSoft) c.successSoft = hexToRgba(String(c.success), 0.12);
  if (c.warning && !c.warningSoft) c.warningSoft = hexToRgba(String(c.warning), 0.14);
  if (c.info && !c.infoSoft) c.infoSoft = hexToRgba(String(c.info), 0.1);
  return { ...envOvr, colors: c };
})();

const mergedColors = deepMerge(
  DEFAULTS_COLORS,
  deepMerge(envWithAutoSoft.colors || {}, (storageOvr.colors || {}) as NestedRecord),
);
const mergedSpacing = deepMerge(
  DEFAULTS_SPACING,
  deepMerge(envOvr.spacing || {}, (storageOvr.spacing || {}) as NestedRecord),
);
const mergedRadius = deepMerge(
  DEFAULTS_RADIUS,
  deepMerge(envOvr.radius || {}, (storageOvr.radius || {}) as NestedRecord),
);
const mergedTransitions = deepMerge(
  DEFAULTS_TRANSITIONS,
  deepMerge(envOvr.transitions || {}, (storageOvr.transitions || {}) as NestedRecord),
);

/* ---------- 6. Tipografía (soporta override por env + storage) ---------- */
const DISPLAY_FONT_ENV =
  (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_THEME_DISPLAY_FONT) || undefined;
const HEADING_FONT_ENV =
  (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_THEME_HEADING_FONT) || undefined;
const BODY_FONT_ENV =
  (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_THEME_BODY_FONT) || undefined;
const MONO_FONT_ENV =
  (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_THEME_MONO_FONT) || undefined;

const storageTypography = (storageOvr.typography || {}) as Record<string, any>;

const resolvedWebDisplay =
  storageTypography.displayFamilyWeb ||
  DISPLAY_FONT_ENV ||
  (storageTypography.displayFamily as string) ||
  DEFAULT_WEB_DISPLAY;
const resolvedWebHeading =
  storageTypography.headingFamilyWeb ||
  HEADING_FONT_ENV ||
  (storageTypography.headingFamily as string) ||
  DEFAULT_WEB_HEADING;
const resolvedWebBody =
  storageTypography.bodyFamilyWeb ||
  BODY_FONT_ENV ||
  (storageTypography.bodyFamily as string) ||
  DEFAULT_WEB_BODY;
const resolvedWebMono =
  storageTypography.monoFamilyWeb ||
  MONO_FONT_ENV ||
  (storageTypography.monoFamily as string) ||
  DEFAULT_WEB_MONO;

const resolvedNativeDisplay =
  (storageTypography.displayFamilyNative as string) ||
  (storageTypography.displayFamily as string) ||
  "Teko_700Bold";
const resolvedNativeHeading =
  (storageTypography.headingFamilyNative as string) ||
  (storageTypography.headingFamily as string) ||
  "Rajdhani_700Bold";
const resolvedNativeBody =
  (storageTypography.bodyFamilyNative as string) ||
  (storageTypography.bodyFamily as string) ||
  "Manrope_400Regular";
const resolvedNativeMono =
  (storageTypography.monoFamilyNative as string) ||
  (storageTypography.monoFamily as string) ||
  undefined;

const env = ((typeof process !== "undefined" && process.env) || {}) as Record<string, string | undefined>;
const _num = (v: string | undefined, fallback: number) =>
  v && !isNaN(Number(v)) ? Number(v) : fallback;

const mergedTypography = {
  displayFamily: Platform.select({
    web: resolvedWebDisplay,
    default: resolvedNativeDisplay,
  }),
  headingFamily: Platform.select({
    web: resolvedWebHeading,
    default: resolvedNativeHeading,
  }),
  bodyFamily: Platform.select({
    web: resolvedWebBody,
    default: resolvedNativeBody,
  }),
  monoFamily: Platform.select({
    web: resolvedWebMono,
    default: resolvedNativeMono,
  }),
  displaySize:
    (storageTypography.displaySize as number) ??
    _num(env.EXPO_PUBLIC_THEME_DISPLAY_SIZE, 56),
  titleSize:
    (storageTypography.titleSize as number) ?? _num(env.EXPO_PUBLIC_THEME_TITLE_SIZE, 36),
  subtitleSize:
    (storageTypography.subtitleSize as number) ?? _num(env.EXPO_PUBLIC_THEME_SUBTITLE_SIZE, 20),
  bodySize:
    (storageTypography.bodySize as number) ?? _num(env.EXPO_PUBLIC_THEME_BODY_SIZE, 16),
  captionSize:
    (storageTypography.captionSize as number) ?? _num(env.EXPO_PUBLIC_THEME_CAPTION_SIZE, 13),
};

/* ---------- 7. Sombras + ancho activo ------------------------------------ */
const storageShadows = (storageOvr.shadows || {}) as Record<string, any>;
const focusShadowColor = String(
  (storageShadows.focus?.shadowColor as string) ?? mergedColors.focusRing ?? DEFAULTS_SHADOW_COLOR,
);
const cardShadowColor = String(
  (storageShadows.card?.shadowColor as string) ?? DEFAULTS_SHADOW_COLOR,
);
const cardElevatedShadowColor = String(
  (storageShadows.cardElevated?.shadowColor as string) ?? DEFAULTS_SHADOW_COLOR,
);
const _shadow = (partial: any, fallback: any) => ({
  ...fallback,
  ...(partial || {}),
  shadowColor: partial?.shadowColor ?? fallback.shadowColor,
});

export const shadows = {
  card: _shadow(storageShadows.card, {
    elevation: 0,
    shadowColor: cardShadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
  }),
  cardElevated: _shadow(storageShadows.cardElevated, {
    elevation: 0,
    shadowColor: cardElevatedShadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
  }),
  focus: _shadow(storageShadows.focus, {
    elevation: 0,
    shadowColor: focusShadowColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.0,
    shadowRadius: 0,
  }),
};

export const activeBorderWidth =
  (storageOvr.activeBorderWidth as number) ?? DEFAULTS_ACTIVE_BORDER_WIDTH;

/* ---------- 8. EXPORTACIONES RESUELTAS (usa estos valores en componentes) */
export const colors = mergedColors;
export const spacing = mergedSpacing;
export const radius = mergedRadius;
export const transitions = mergedTransitions;
export const typography = mergedTypography;

/* ---------- 9. Modo claro/oscuro (mantiene compatibilidad) --------------- */
const LIGHT_MODE = false;
export const themeMode: "light" | "dark" = LIGHT_MODE ? "light" : "dark";
