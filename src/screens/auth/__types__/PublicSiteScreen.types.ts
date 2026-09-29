import type { AuthMode } from "@/components/PublicAuthModal";
import type { PublicPageKey } from "@/navigation/publicRoutes";

export type PublicSiteSectionKey = "home" | "about" | "events" | "stores";

export type SectionKey = "about";
export type DesktopNavKey = "home" | "about";

export type PublicSiteScrollControls = {
  scrollToSection: (section: PublicSiteSectionKey) => void;
};

export type PublicSiteScreenRef = {
  setAuthMode: (mode: AuthMode) => void;
};

export type PublicSiteScreenProps = {
  page: PublicPageKey;
  onReadyScrollControls?: (controls: PublicSiteScrollControls) => void;
  initialAuthMode?: AuthMode;
  disableAuthNavigation?: boolean;
  disableInternalScroll?: boolean;
};

export type HomeScreenProps = {
  initialSection?: PublicSiteSectionKey;
};

export type DesktopNavItem = {
  key: DesktopNavKey;
  label: string;
  page: PublicPageKey;
  section: SectionKey | null;
};

export type MobileSectionNavItem = {
  key: SectionKey | "home";
  label: string;
  page: PublicPageKey;
};

export type PublicPageCopy = {
  description: string;
  eyebrow: string;
  title: string;
};

export type HomeDisciplineEditorial = {
  id: string;
  name: string;
  tagline: string;
};

export type HomePricingPlan = {
  id: string;
  name: string;
  price: string;
  bullets: string[];
  cta: string;
  highlight: boolean;
};

export type LandingFeature = {
  id: string;
  title: string;
  description: string;
  icon: string;
};

export type LandingDiscipline = {
  id: string;
  name: string;
  shortName: string;
  color: string;
  softColor: string;
  tagline: string;
};
