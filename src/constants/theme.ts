import { Platform } from "react-native";

const webBodyStack = '"Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const webDisplayStack = '"Montserrat", "Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const webMonoStack = '"IBM Plex Mono", "SFMono-Regular", Consolas, monospace';

const LIGHT_MODE = true;

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

export const colors = {
  background: bgLight,
  surface: "#FFFFFF",
  surfaceAlt: "#FAFAFA",
  surfaceStrong: "#FFFFFF",
  panel: "#FFFFFF",
  panelSoft: "#FAFAFA",

  primary: agedWood,
  primaryHover: agedWoodHover,
  primarySoft: agedWoodSoft,

  accent: indigoBlue,
  accentSoft: indigoBlueSoft,

  action: agedWood,
  actionHover: agedWoodHover,
  actionSoft: agedWoodSoft,

  secondary: indigoBlue,
  secondaryHover: indigoBlueHover,
  secondarySoft: indigoBlueSoft,

  gold: goldenYellow,
  goldSoft: goldenYellowSoft,

  text: LIGHT_MODE ? textPrimaryLight : textPrimaryDark,
  textMuted: LIGHT_MODE ? textSecondaryLight : textSecondaryDark,

  onPrimary: "#FFFFFF",
  onPrimaryMuted: "rgba(255, 255, 255, 0.88)",

  border: borderLight,
  borderStrong: borderStrongLight,

  wood: agedWood,
  woodLight: agedWoodLight,
  woodSoft: agedWoodSoft,
  woodStrong: agedWoodStrong,

  danger: judogiRed,
  dangerHover: judogiRedHover,
  dangerSoft: judogiRedSoft,

  success: tatamiGreen,
  successHover: tatamiGreenHover,
  successSoft: tatamiGreenSoft,

  warning: goldenYellow,
  warningHover: goldenYellowHover,
  warningSoft: goldenYellowSoft,

  info: indigoBlue,
  infoHover: indigoBlueHover,
  infoSoft: indigoBlueSoft,

  overlay: "rgba(26, 26, 26, 0.32)",
  ink: textPrimaryLight,

  hover: agedWoodSoft,
  hoverStrong: "rgba(141, 110, 99, 0.20)",

  sidebar: "#FFFFFF",
  sidebarSoft: "#FAFAFA",
  sidebarBorder: borderLight,
  sidebarText: textPrimaryLight,
  sidebarMuted: textSecondaryLight,

  activeIndicator: agedWood,
  focusRing: agedWood,

  metricLavender: indigoBlueSoft,
  metricWood: agedWoodSoft,
  metricAmber: goldenYellowSoft,
  metricBlue: indigoBlueSoft,
  metricSuccess: tatamiGreenSoft,
};

export const spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  "2xl": 36,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  pill: 999,
};

export const typography = {
  displayFamily: Platform.select({
    web: webDisplayStack,
    default: "Montserrat_800ExtraBold",
  }),
  headingFamily: Platform.select({
    web: webDisplayStack,
    default: "Montserrat_700Bold",
  }),
  bodyFamily: Platform.select({
    web: webBodyStack,
    default: "Inter_400Regular",
  }),
  monoFamily: Platform.select({
    web: webMonoStack,
    default: undefined,
  }),
  displaySize: 40,
  titleSize: 30,
  subtitleSize: 18,
  bodySize: 15,
  captionSize: 13,
};

export const shadows = {
  card: {
    elevation: 0,
    shadowColor: "#1A1A1A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
  },
  cardElevated: {
    elevation: 0,
    shadowColor: "#1A1A1A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
  },
  focus: {
    elevation: 0,
    shadowColor: agedWood,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.0,
    shadowRadius: 0,
  },
};

export const transitions = {
  fast: 150,
  base: 200,
  slow: 250,
};

export const activeBorderWidth = 3;
