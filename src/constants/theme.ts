import { Platform } from "react-native";

const webBodyStack = '"Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const webDisplayStack = '"Barlow Condensed", "Arial Narrow", "Inter", "Segoe UI", sans-serif';
const webMonoStack = '"IBM Plex Mono", "SFMono-Regular", Consolas, monospace';

export const colors = {
  background: "#F6F1EA",
  surface: "#FFFDF9",
  surfaceAlt: "#F1E4D3",
  surfaceStrong: "#17120E",
  primary: "#F97316",
  primarySoft: "#FFF1E6",
  accent: "#17120E",
  text: "#1A1410",
  textMuted: "#6E645C",
  border: "#E7D9C9",
  borderStrong: "#D6B390",
  danger: "#C53434",
  dangerSoft: "#FFF1F1",
  success: "#1F8A4C",
  successSoft: "#EDF9F2",
  warning: "#C76A0A",
  warningSoft: "#FFF6E8",
  info: "#0F766E",
  infoSoft: "#ECFDF5",
  overlay: "rgba(18, 12, 8, 0.58)",
};

export const spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  "2xl": 32,
};

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
};

export const typography = {
  displayFamily: Platform.select({
    web: webDisplayStack,
    default: undefined,
  }),
  headingFamily: Platform.select({
    web: webDisplayStack,
    default: undefined,
  }),
  bodyFamily: Platform.select({
    web: webBodyStack,
    default: undefined,
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
    elevation: 3,
    shadowColor: "#120C08",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
  },
  focus: {
    elevation: 1,
    shadowColor: "#F97316",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
};
