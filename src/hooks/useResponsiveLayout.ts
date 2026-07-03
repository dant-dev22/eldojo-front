import { useWindowDimensions } from "react-native";

const DESKTOP_BREAKPOINT = 1024;
const TABLET_BREAKPOINT = 768;

export function useResponsiveLayout() {
  const { width } = useWindowDimensions();

  const isDesktop = width >= DESKTOP_BREAKPOINT;
  const isTablet = width >= TABLET_BREAKPOINT && width < DESKTOP_BREAKPOINT;
  const isMobile = width < TABLET_BREAKPOINT;

  return {
    width,
    isDesktop,
    isTablet,
    isMobile,
    contentMaxWidth: isDesktop ? 1200 : isTablet ? 900 : 640,
  };
}
