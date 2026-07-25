import { Platform } from "react-native";

const webBodyStack = '"Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const webDisplayStack = '"Montserrat", "Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const webMonoStack = '"IBM Plex Mono", "SFMono-Regular", Consolas, monospace';

export const colors = {
  background: "#F7F8FA",
  surface: "#FFFFFF",
  surfaceAlt: "#F1F3F6",
  surfaceStrong: "#EAEDF1",
  panel: "#F5F6F8",
  panelSoft: "#EEF1F4",
  primary: "#8A6748",
  primarySoft: "#F6F4D2",
  accent: "#A07A57",
  action: "#8A6748",
  actionSoft: "#F6F4D2",
  gold: "#BCC3CC",
  goldSoft: "#F3F5F7",
  text: "#17181A",
  textMuted: "#626974",
  onPrimary: "#FFFFFF",
  onPrimaryMuted: "#F5F7F9",
  border: "#C9CFD6",
  borderStrong: "#AAB2BD",
  danger: "#9A5F4B",
  dangerSoft: "#F2E4DE",
  success: "#7C8452",
  successSoft: "#F6F4D2",
  warning: "#A07A57",
  warningSoft: "#F5ECD8",
  info: "#7A838E",
  infoSoft: "#EEF2F6",
  overlay: "rgba(23, 24, 26, 0.32)",
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
  sm: 12,
  md: 18,
  lg: 28,
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
    elevation: 3,
    shadowColor: "#8C96A3",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
  },
  focus: {
    elevation: 1,
    shadowColor: "#8A6748",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
  },
};
