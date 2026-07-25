import { Platform } from "react-native";

const webBodyStack = '"Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const webDisplayStack = '"Montserrat", "Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const webMonoStack = '"IBM Plex Mono", "SFMono-Regular", Consolas, monospace';

export const colors = {
  background: "#D4E0C8",
  surface: "#F7F4EF",
  surfaceAlt: "#F1EBE2",
  surfaceStrong: "#E8DED1",
  panel: "#EFE7DD",
  panelSoft: "#E4D8CB",
  primary: "#8A715E",
  primarySoft: "#ECE3D8",
  accent: "#D4876A",
  action: "#D4876A",
  actionSoft: "#F1DDD4",
  gold: "#C6B09A",
  goldSoft: "#EEE4D8",
  text: "#171311",
  textMuted: "#4B4039",
  onPrimary: "#171311",
  onPrimaryMuted: "#5B4D44",
  border: "#D7C8B8",
  borderStrong: "#C5AE97",
  danger: "#B85D4A",
  dangerSoft: "#F4E1DA",
  success: "#6C7C57",
  successSoft: "#DEE7D5",
  warning: "#D4876A",
  warningSoft: "#F1DDD4",
  info: "#8E6F54",
  infoSoft: "#E8DED0",
  overlay: "rgba(51, 38, 31, 0.34)",
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
    shadowColor: "#5B4D44",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  focus: {
    elevation: 1,
    shadowColor: "#D4876A",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
};
