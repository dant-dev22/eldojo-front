import { Platform } from "react-native";

const webBodyStack = '"Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const webDisplayStack = '"Montserrat", "Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const webMonoStack = '"IBM Plex Mono", "SFMono-Regular", Consolas, monospace';

export const colors = {
  background: "#F7F7F5",
  surface: "#FFFFFF",
  surfaceAlt: "#F7F7F7",
  surfaceStrong: "#FFFFFF",
  panel: "#FFFFFF",
  panelSoft: "#F7F7F7",
  primary: "#8A6748",
  primarySoft: "rgba(138, 103, 72, 0.08)",
  accent: "#A07A57",
  action: "#2563EB",
  actionHover: "#1D4ED8",
  actionSoft: "#DBEAFE",
  gold: "#111111",
  goldSoft: "#F7F7F7",
  text: "#17181A",
  textMuted: "#626974",
  onPrimary: "#FFFFFF",
  onPrimaryMuted: "#F5F7F9",
  border: "#111111",
  borderStrong: "#111111",
  danger: "#B42318",
  dangerHover: "#912018",
  dangerSoft: "#FEE4E2",
  success: "#15803D",
  successHover: "#166534",
  successSoft: "#DCFCE7",
  warning: "#A16207",
  warningSoft: "#FEF3C7",
  info: "#1D4ED8",
  infoSoft: "#E8F0FF",
  overlay: "rgba(17, 17, 17, 0.22)",
  ink: "#111827",
  hover: "rgba(138, 103, 72, 0.08)",
  hoverStrong: "rgba(138, 103, 72, 0.14)",
  sidebar: "#111111",
  sidebarSoft: "#17181A",
  sidebarBorder: "rgba(255, 255, 255, 0.08)",
  sidebarText: "#F5F7F9",
  sidebarMuted: "#A1A7B3",
  metricLavender: "#F5EEE7",
  metricMint: "#EEF6EE",
  metricAmber: "#FBF1DA",
  metricBlue: "#EDF3FB",
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
  sm: 14,
  md: 20,
  lg: 26,
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
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 28,
  },
  focus: {
    elevation: 0,
    shadowColor: "#4F73D9",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 0,
  },
};
