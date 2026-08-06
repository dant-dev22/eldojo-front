import { Feather } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import {
  Image,
  LayoutChangeEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { authApi } from "@/api/authApi";
import { getErrorMessage } from "@/api/http";
import { AppButton } from "@/components/AppButton";
import { AppCard } from "@/components/AppCard";
import { AppInput } from "@/components/AppInput";
import { PublicPageChrome } from "@/components/PublicPageChrome";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import {
  PUBLIC_PAGE_META,
  PUBLIC_PAGE_TO_SCREEN,
  PUBLIC_SCROLL_TARGET_KEY,
  navigateToPublicPageKey,
  registerHomeScrollControls,
  type PublicPageKey,
} from "@/navigation/publicRoutes";
import type { AdminStackParamList, AuthStackParamList } from "@/navigation/types";
import type { PendingAcademyRegistration } from "@/types/api";
import {
  clearPendingAcademyRegistration,
  getPendingAcademyRegistration,
  savePendingAcademyRegistration,
} from "@/utils/storage";

type AuthMode = "login" | "academy";
export type PublicSiteSectionKey = "home" | "about" | "events" | "stores";
type SectionKey = "about";
type DesktopNavKey = "home" | "about";

export type PublicSiteScrollControls = {
  scrollToSection: (section: PublicSiteSectionKey) => void;
};

type PublicSiteScreenProps = {
  page: PublicPageKey;
  onReadyScrollControls?: (controls: PublicSiteScrollControls) => void;
};

function buildWebsiteImage(prompt: string, imageSize: string): string {
  return `https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=${encodeURIComponent(prompt)}&image_size=${imageSize}`;
}

function getWebClassNameProps(className?: string) {
  return Platform.OS === "web" && className ? ({ className } as { className: string }) : {};
}

function joinWebClassNames(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

function isSectionKey(value: string): value is SectionKey {
  return value === "about";
}

const PUBLIC_WEB_STYLE_TAG_ID = "eldojo-public-web-desktop-styles";
const MASKED_REGISTERED_PASSWORD = "********";

function updateDocumentMeta(name: string, content: string, property?: boolean) {
  if (Platform.OS !== "web" || typeof document === "undefined") {
    return;
  }

  const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
  let meta = document.head.querySelector(selector) as HTMLMetaElement | null;

  if (!meta) {
    meta = document.createElement("meta");
    if (property) {
      meta.setAttribute("property", name);
    } else {
      meta.setAttribute("name", name);
    }
    document.head.appendChild(meta);
  }

  meta.setAttribute("content", content);
}

function useWebSeo(page: PublicPageKey) {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined" || typeof window === "undefined") {
      return;
    }

    const meta = PUBLIC_PAGE_META[page];

    if (page === "home" && window.location.pathname === "/") {
      window.history.replaceState(window.history.state, "", meta.path);
    }

    document.title = meta.title;

    updateDocumentMeta("description", meta.description);
    updateDocumentMeta("robots", "index,follow");
    updateDocumentMeta("og:title", meta.title, true);
    updateDocumentMeta("og:description", meta.description, true);
    updateDocumentMeta("og:type", "website", true);
    updateDocumentMeta("og:url", `${window.location.origin}${meta.path}`, true);

    let canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", `${window.location.origin}${meta.path}`);
  }, [page]);
}

const heroBackground = require("../../img/fondos.jpg");

const aboutImage = buildWebsiteImage(
  "dojo owner reviewing student schedule and payments on a laptop inside a clean martial arts academy, warm neutral palette, premium realistic website illustration",
  "landscape_4_3"
);

const HOME_HIGHLIGHTS = [
  "Controla alumnos, pagos y asistencia en una sola vista.",
  "Arranca rapido desde navegador y celular sin perder legibilidad.",
  "Configura tu academia y entra al panel en pocos pasos.",
];

const DESKTOP_NAV_ITEMS: Array<{ key: DesktopNavKey; label: string; page: PublicPageKey; section: SectionKey | null }> = [
  { key: "home", label: "Inicio", page: "home", section: null },
  { key: "about", label: "Acerca de nosotros", page: "about", section: "about" },
];

const MOBILE_SECTION_NAV_ITEMS: Array<{ key: SectionKey | "home"; label: string; page: PublicPageKey }> = [
  { key: "home", label: "Inicio", page: "home" },
  { key: "about", label: "Acerca de nosotros", page: "about" },
];

const PAGE_SECTIONS: Record<PublicPageKey, SectionKey[]> = {
  about: ["about"],
  createAccount: ["about"],
  events: [],
  home: ["about"],
  signIn: ["about"],
  stores: [],
};

const PAGE_COPY: Record<
  PublicPageKey,
  {
    description: string;
    eyebrow: string;
    title: string;
  }
> = {
  home: {
    description: "Centraliza alumnos, clases, pagos, sucursales y asistencia en una sola plataforma lista para la operacion diaria.",
    eyebrow: "Software de administracion",
    title: "La administracion de un club de pelea nunca fue tan sencilla.",
  },
  about: {
    description: "Conoce como ElDojo ayuda a academias de MMA, BJJ y judo a ordenar la operacion diaria sin hojas sueltas ni mensajes perdidos.",
    eyebrow: "Acerca de ElDojo",
    title: "Menos caos operativo, mas tiempo para entrenar y dirigir tu academia.",
  },
  events: {
    description: "",
    eyebrow: "",
    title: "",
  },
  stores: {
    description: "",
    eyebrow: "",
    title: "",
  },
  createAccount: {
    description: "Registra tu academia y crea la cuenta para administrarla hoy mismo.",
    eyebrow: "Crear cuenta",
    title: "Registra tu academia y activa tu panel operativo.",
  },
  signIn: {
    description: "Inicia sesion con la cuenta administradora de tu academia para entrar al panel operativo.",
    eyebrow: "Iniciar sesion",
    title: "Entra de nuevo y sigue operando tu academia.",
  },
};

function countAcademyLetters(value: string): number {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/gi, "").length;
}

function formatAuthError(error: unknown): string {
  const message = getErrorMessage(error).trim();
  const normalized = message.toLowerCase();

  if (normalized.includes("ese usuario ya existe") || normalized.includes("already exists")) {
    return "Ese usuario ya existe.";
  }

  if (normalized.includes("esa academia ya existe")) {
    return "Esa academia ya existe.";
  }

  if (normalized.includes("al menos 3 letras")) {
    return "El nombre de la academia debe tener al menos 3 letras utiles.";
  }

  if (normalized.includes("no existe una cuenta con ese correo")) {
    return "No existe una cuenta con ese correo.";
  }

  if (normalized.includes("la contraseña no es correcta")) {
    return "La contraseña no es correcta.";
  }

  if (normalized.includes("no ha sido confirmada")) {
    return "Tu cuenta aún no ha sido confirmada. Revisa tu correo o solicita un nuevo enlace.";
  }

  return message.endsWith(".") ? message : `${message}.`;
}

function isPendingSessionBlockingError(message: string): boolean {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("ya no es válida") ||
    normalized.includes("ya no es valida") ||
    normalized.includes("expiró") ||
    normalized.includes("expiro") ||
    normalized.includes("consumida")
  );
}

function isConfirmationPendingMessage(message: string | null): boolean {
  return (message ?? "").toLowerCase().includes("confirm");
}

function renderAboutSection(isDesktop: boolean, onLayout?: (event: LayoutChangeEvent) => void) {
  return (
    <View
      nativeID="screens-auth-public-about-section"
      onLayout={onLayout}
      style={[styles.infoSection, isDesktop ? styles.infoSectionDesktop : null]}
      testID="screens-auth-public-about-section"
      {...getWebClassNameProps("screens-auth-public-about-section")}
    >
      <Image
        nativeID="screens-auth-public-about-image"
        source={{ uri: aboutImage }}
        style={[styles.sectionImage, isDesktop ? styles.sectionImageDesktop : null]}
        testID="screens-auth-public-about-image"
      />
      <View nativeID="screens-auth-public-about-copy" style={styles.aboutCopy} testID="screens-auth-public-about-copy">
        <Text nativeID="screens-auth-public-about-eyebrow" style={styles.sectionEyebrow} testID="screens-auth-public-about-eyebrow">
          Acerca de nosotros
        </Text>
        <Text nativeID="screens-auth-public-about-title" style={styles.sectionTitle} testID="screens-auth-public-about-title">
          ElDojo ayuda a academias a ordenar la operacion diaria.
        </Text>
        <Text nativeID="screens-auth-public-about-description" style={styles.sectionDescription} testID="screens-auth-public-about-description">
          ElDojo ayuda a dueños de academias de MMA, BJJ y judo a ordenar su operacion diaria sin hojas sueltas ni mensajes perdidos. Lleva control de alumnos, pagos, asistencia, clases y sucursales desde una interfaz clara para recepcion, coordinacion y direccion.
        </Text>
        <View nativeID="screens-auth-public-about-highlights" style={styles.highlightsList} testID="screens-auth-public-about-highlights">
          {[
            "Cobro y seguimiento de mensualidades en un solo lugar.",
            "Control de asistencia y clases para todo tu equipo.",
            "Panel limpio para operar sedes, alumnos y eventos.",
          ].map((item, index) => (
            <View
              key={item}
              nativeID={`screens-auth-public-about-highlight-${index + 1}`}
              style={styles.highlightItem}
              testID={`screens-auth-public-about-highlight-${index + 1}`}
            >
              <View
                nativeID={`screens-auth-public-about-highlight-dot-${index + 1}`}
                style={styles.highlightDot}
                testID={`screens-auth-public-about-highlight-dot-${index + 1}`}
              />
              <Text
                nativeID={`screens-auth-public-about-highlight-text-${index + 1}`}
                style={styles.highlightText}
                testID={`screens-auth-public-about-highlight-text-${index + 1}`}
              >
                {item}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

export function PublicSiteScreen({ page, onReadyScrollControls }: PublicSiteScreenProps) {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { redeemPendingAcademySession, resendAcademyConfirmation, signIn, registerAcademy } = useAuth();
  const { contentMaxWidth, isDesktop, isMobile, isTablet, width } = useResponsiveLayout();
  const scrollRef = useRef<ScrollView>(null);
  const pendingScrollTargetRef = useRef<SectionKey | null>(null);

  useWebSeo(page);

  const [landingAuthMode, setLandingAuthMode] = useState<AuthMode | null>(null);
  const [desktopNavSelection, setDesktopNavSelection] = useState<DesktopNavKey>(
    page === "about" ? "about" : "home"
  );
  const [sectionOffsets, setSectionOffsets] = useState<Record<SectionKey, number>>({
    about: 0,
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [academyName, setAcademyName] = useState("");
  const [adminFirstName, setAdminFirstName] = useState("");
  const [adminLastName, setAdminLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formFeedback, setFormFeedback] = useState<string | null>(null);
  const [pendingRegistration, setPendingRegistration] = useState<PendingAcademyRegistration | null>(null);

  const loginMutation = useMutation({
    mutationFn: signIn,
    onError: (error) => {
      setFormFeedback(null);
      setFormError(formatAuthError(error));
    },
  });

  const registerMutation = useMutation({
    mutationFn: registerAcademy,
    onError: (error) => {
      setFormFeedback(null);
      setFormError(formatAuthError(error));
    },
    onSuccess: async (response) => {
      const nextPendingRegistration: PendingAcademyRegistration = {
        academyName: academyName.trim(),
        adminFirstName: adminFirstName.trim(),
        adminLastName: adminLastName.trim(),
        email: response.email,
        pendingSessionTicket: response.pending_session_ticket,
        pendingSessionExpiresInHours: response.pending_session_expires_in_hours,
        pollingIntervalSeconds: response.polling_interval_seconds,
        verificationExpiresInHours: response.verification_expires_in_hours,
      };

      await savePendingAcademyRegistration(nextPendingRegistration);
      setPendingRegistration(nextPendingRegistration);
      setFormError(null);
      setFormFeedback(response.message);
      setPassword("");
      setShowRegisterPassword(false);
    },
  });

  const resendMutation = useMutation({
    mutationFn: resendAcademyConfirmation,
    onError: (error) => {
      setFormFeedback(null);
      setFormError(formatAuthError(error));
    },
    onSuccess: (response) => {
      setFormError(null);
      setFormFeedback(response.message);
    },
  });

  const redeemPendingSessionMutation = useMutation({
    mutationFn: redeemPendingAcademySession,
    onError: async (error) => {
      await clearPendingAcademyRegistration();
      setPendingRegistration(null);
      setFormFeedback(null);
      setFormError(formatAuthError(error));
    },
  });

  const content = PAGE_COPY[page];
  const isAuthPage = page === "createAccount" || page === "signIn";
  const isLandingAuthInline = page === "home" && landingAuthMode !== null;
  const effectiveShowAuthCard = isAuthPage || isLandingAuthInline;
  const isWebDesktop = Platform.OS === "web" && isDesktop;
  const showHeroCopy = !isWebDesktop || !effectiveShowAuthCard;
  const mode: AuthMode = landingAuthMode ?? (page === "createAccount" ? "academy" : "login");
  const isAwaitingConfirmation = mode === "academy" && pendingRegistration !== null;

  useEffect(() => {
    setLandingAuthMode(null);
  }, [page]);

  useEffect(() => {
    let isMounted = true;

    if (Platform.OS !== "web" || page !== "createAccount") {
      setPendingRegistration(null);
      return () => {
        isMounted = false;
      };
    }

    const restorePendingRegistration = async () => {
      const storedPendingRegistration = await getPendingAcademyRegistration();
      if (!isMounted || !storedPendingRegistration) {
        return;
      }

      setPendingRegistration(storedPendingRegistration);
      setAcademyName(storedPendingRegistration.academyName);
      setAdminFirstName(storedPendingRegistration.adminFirstName);
      setAdminLastName(storedPendingRegistration.adminLastName);
      setEmail(storedPendingRegistration.email);
      setPassword("");
      setShowRegisterPassword(false);
      setFormError(null);
      setFormFeedback("Seguimos esperando que confirmes tu correo para activar tu cuenta.");
    };

    void restorePendingRegistration();

    return () => {
      isMounted = false;
    };
  }, [page]);

  useEffect(() => {
    if (
      Platform.OS !== "web" ||
      page !== "createAccount" ||
      !pendingRegistration ||
      redeemPendingSessionMutation.isPending ||
      redeemPendingSessionMutation.isSuccess
    ) {
      return;
    }

    let isCancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const scheduleNextPoll = () => {
      timeoutId = setTimeout(() => {
        void pollPendingRegistration();
      }, pendingRegistration.pollingIntervalSeconds * 1000);
    };

    const clearPendingRegistrationState = async (message: string) => {
      await clearPendingAcademyRegistration();
      if (isCancelled) {
        return;
      }

      setPendingRegistration(null);
      setFormFeedback(null);
      setFormError(message);
    };

    const pollPendingRegistration = async () => {
      try {
        const response = await authApi.getAcademyPendingSessionStatus({
          ticket: pendingRegistration.pendingSessionTicket,
        });
        if (isCancelled) {
          return;
        }

        if (response.status === "ready") {
          redeemPendingSessionMutation.mutate(pendingRegistration);
          return;
        }

        if (response.status === "expired" || response.status === "used") {
          await clearPendingRegistrationState(response.message);
          return;
        }

        setFormError(null);
        setFormFeedback(response.message);
      } catch (error) {
        const message = formatAuthError(error);
        if (isCancelled) {
          return;
        }

        if (isPendingSessionBlockingError(message)) {
          await clearPendingRegistrationState(message);
          return;
        }

        setFormError(null);
        setFormFeedback("Seguimos esperando la confirmación del correo. Reintentaremos en unos segundos.");
      }

      if (!isCancelled) {
        scheduleNextPoll();
      }
    };

    void pollPendingRegistration();

    return () => {
      isCancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [
    page,
    pendingRegistration,
    redeemPendingSessionMutation.isPending,
    redeemPendingSessionMutation.isSuccess,
    redeemPendingSessionMutation.mutate,
  ]);

  useEffect(() => {
    if (page === "about") {
      setDesktopNavSelection("about");
      return;
    }

    setDesktopNavSelection("home");
  }, [page]);

  useEffect(() => {
    if (!isWebDesktop || typeof document === "undefined") {
      return;
    }

    if (document.getElementById(PUBLIC_WEB_STYLE_TAG_ID)) {
      return;
    }

    const styleTag = document.createElement("style");
    styleTag.id = PUBLIC_WEB_STYLE_TAG_ID;
    styleTag.textContent = `
      .eldojo-public-desktop-scroll-root {
        scroll-behavior: smooth;
      }

      .eldojo-public-desktop-hover-target {
        transition: background-color 180ms ease, border-color 180ms ease, color 180ms ease, transform 180ms ease, box-shadow 220ms ease, opacity 180ms ease;
      }

      .eldojo-public-desktop-fade-in {
        animation: eldojoPublicDesktopFadeIn 460ms cubic-bezier(0.22, 1, 0.36, 1) both;
      }

      .eldojo-public-desktop-fade-in-delay-1 {
        animation-delay: 70ms;
      }

      .eldojo-public-desktop-fade-in-delay-2 {
        animation-delay: 120ms;
      }

      .eldojo-public-desktop-fade-in-delay-3 {
        animation-delay: 180ms;
      }

      .eldojo-public-desktop-fade-in-delay-4 {
        animation-delay: 240ms;
      }

      .eldojo-public-desktop-form-fade-in {
        animation: eldojoPublicDesktopFormFadeIn 1500ms ease both;
      }

      @keyframes eldojoPublicDesktopFadeIn {
        from {
          opacity: 0;
          transform: translateY(18px);
        }

        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes eldojoPublicDesktopFormFadeIn {
        from {
          opacity: 0;
        }

        to {
          opacity: 1;
        }
      }
    `;

    document.head.appendChild(styleTag);
  }, [isWebDesktop]);

  const heroHeight = useMemo(() => {
    if (effectiveShowAuthCard && isDesktop) {
      return 860;
    }
    if (isDesktop) {
      return 760;
    }
    if (isTablet) {
      return 720;
    }
    return effectiveShowAuthCard ? 980 : 700;
  }, [effectiveShowAuthCard, isDesktop, isTablet]);

  const layoutWidth = Math.min(contentMaxWidth, 1200);

  const registerSectionOffset = (section: SectionKey) => (event: LayoutChangeEvent) => {
    const nextOffset = event.nativeEvent.layout.y;

    setSectionOffsets((current) => {
      if (current[section] === nextOffset) {
        return current;
      }

      return {
        ...current,
        [section]: nextOffset,
      };
    });
  };

  const navigateToPage = (nextPage: PublicPageKey) => {
    setFormError(null);
    setFormFeedback(null);
    if (nextPage === "createAccount" && page === "home") {
      setLandingAuthMode("academy");
      return;
    }
    if (nextPage === "signIn" && page === "home") {
      setLandingAuthMode("login");
      return;
    }
    navigation.navigate(PUBLIC_PAGE_TO_SCREEN[nextPage]);
  };

  const updateBrowserPath = (nextPath: string) => {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      return;
    }

    window.history.replaceState(window.history.state, "", nextPath);
  };

  const scrollToTop = (nextPath = PUBLIC_PAGE_META[page].path) => {
    pendingScrollTargetRef.current = null;
    scrollRef.current?.scrollTo({ animated: true, y: 0 });

    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.sessionStorage.removeItem(PUBLIC_SCROLL_TARGET_KEY);
      updateBrowserPath(nextPath);
    }
  };

  const scrollToSection = (section: SectionKey, nextPath = PUBLIC_PAGE_META[page].path) => {
    const nextOffset = Math.max(sectionOffsets[section] - (isDesktop ? 104 : 88), 0);

    pendingScrollTargetRef.current = null;
    scrollRef.current?.scrollTo({ animated: true, y: nextOffset });

    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.sessionStorage.removeItem(PUBLIC_SCROLL_TARGET_KEY);
      updateBrowserPath(`${nextPath}#${section}`);
    }
  };

  const scrollToSectionExternal = useCallback(
    (target: PublicSiteSectionKey) => {
      if (target === "home") {
        scrollToTop(PUBLIC_PAGE_META.home.path);
        return;
      }

      if (target === "events" || target === "stores") {
        if (PAGE_SECTIONS[page].includes("about")) {
          scrollToSection("about");
          return;
        }
        scrollToTop(PUBLIC_PAGE_META.home.path);
        return;
      }

      if (PAGE_SECTIONS[page].includes(target)) {
        scrollToSection(target);
      }
    },
    [page]
  );

  useEffect(() => {
    if (!onReadyScrollControls) {
      return;
    }

    onReadyScrollControls({ scrollToSection: scrollToSectionExternal });
  }, [onReadyScrollControls, scrollToSectionExternal]);

  useEffect(() => {
    registerHomeScrollControls(scrollToSectionExternal);
    return () => {
      registerHomeScrollControls(null);
    };
  }, [scrollToSectionExternal]);

  const handleDesktopNavbarPress = (target: DesktopNavKey, section: SectionKey | null) => {
    setDesktopNavSelection(target);

    if (target === "home") {
      if (page === "home") {
        scrollToTop(PUBLIC_PAGE_META.home.path);
        return;
      }

      navigateToPage("home");
      return;
    }

    if (section && PAGE_SECTIONS[page].includes(section)) {
      scrollToSection(section);
      return;
    }

    pendingScrollTargetRef.current = section;

    if (section && Platform.OS === "web" && typeof window !== "undefined") {
      window.sessionStorage.setItem(PUBLIC_SCROLL_TARGET_KEY, section);
    }

    navigateToPage("home");
  };

  useEffect(() => {
    if (Platform.OS !== "web" || page !== "home" || typeof window === "undefined") {
      return;
    }

    const storedTarget = window.sessionStorage.getItem(PUBLIC_SCROLL_TARGET_KEY);
    const hashTarget = window.location.hash.replace("#", "");
    const nextTargetFromStorage = isSectionKey(storedTarget ?? "") ? (storedTarget ?? null) as SectionKey : null;
    const nextTargetFromHash = isSectionKey(hashTarget) ? hashTarget : null;
    const nextTarget: SectionKey | null = nextTargetFromStorage ?? nextTargetFromHash ?? pendingScrollTargetRef.current;

    if (!nextTarget || sectionOffsets[nextTarget] <= 0) {
      return;
    }

    pendingScrollTargetRef.current = nextTarget;

    const animationFrame = window.requestAnimationFrame(() => {
      scrollToSection(nextTarget, PUBLIC_PAGE_META.home.path);
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [page, sectionOffsets]);

  const handleLoginSubmit = () => {
    if (!email.trim() || !password.trim()) {
      setFormError("Completa correo y contraseña.");
      return;
    }

    setFormError(null);
    setFormFeedback(null);
    loginMutation.mutate({
      email: email.trim().toLowerCase(),
      password,
    });
  };

  const handleAcademySubmit = () => {
    if (pendingRegistration) {
      return;
    }

    if (
      !academyName.trim() ||
      !adminFirstName.trim() ||
      !adminLastName.trim() ||
      !email.trim() ||
      !password.trim()
    ) {
      setFormError("Completa academia, nombre, apellidos, correo y contraseña.");
      return;
    }

    if (countAcademyLetters(academyName) < 3) {
      setFormError("El nombre de la academia debe tener al menos 3 letras utiles.");
      return;
    }

    if (password.trim().length < 8) {
      setFormError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setFormError(null);
    setFormFeedback(null);
    registerMutation.mutate({
      academy_name: academyName.trim(),
      admin_first_name: adminFirstName.trim(),
      admin_last_name: adminLastName.trim(),
      email: email.trim().toLowerCase(),
      password,
    });
  };

  const handleResendConfirmation = () => {
    if (!email.trim()) {
      setFormFeedback(null);
      setFormError("Escribe el correo de la cuenta para reenviar el enlace.");
      return;
    }

    setFormError(null);
    setFormFeedback(null);
    resendMutation.mutate(email.trim().toLowerCase());
  };

  const handleResetPendingRegistration = () => {
    void clearPendingAcademyRegistration();
    setPendingRegistration(null);
    setFormError(null);
    setFormFeedback(null);
    setPassword("");
    setShowRegisterPassword(false);
  };

  return (
    <View
      nativeID="screens-auth-public-root"
      style={[styles.publicRoot, page === "home" ? styles.publicRootStatic : null]}
      testID="screens-auth-public-root"
      {...getWebClassNameProps("screens-auth-public-root")}
    >
        <ScrollView
          style={[styles.mainScroll, page === "home" ? styles.mainScrollStatic : null]}
          contentContainerStyle={[styles.scrollContent, page === "home" ? styles.scrollContentStatic : null]}
          keyboardShouldPersistTaps="handled"
          nativeID="screens-auth-public-scroll-view"
          nestedScrollEnabled={true}
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          testID="screens-auth-public-scroll-view"
          {...getWebClassNameProps("screens-auth-public-scroll-view eldojo-public-desktop-scroll-root")}
        >
          <View
            nativeID="screens-auth-public-hero-section"
            style={[
              styles.heroSection,
              isMobile ? styles.heroSectionMobile : null,
              { minHeight: heroHeight, paddingTop: isDesktop ? 120 : isTablet ? 112 : spacing.xl },
            ]}
            testID="screens-auth-public-hero-section"
            {...getWebClassNameProps("screens-auth-public-hero-section")}
          >
            <View
              nativeID="screens-auth-public-hero-media"
              style={styles.heroMedia}
              testID="screens-auth-public-hero-media"
              {...getWebClassNameProps("screens-auth-public-hero-media")}
            >
              <Image
                nativeID="screens-auth-public-hero-image"
                resizeMode="stretch"
                source={heroBackground}
                style={styles.heroSectionImage}
                testID="screens-auth-public-hero-image"
              />
            </View>
            <View
              nativeID="screens-auth-public-hero-background-overlay"
              style={styles.heroBackgroundOverlay}
              testID="screens-auth-public-hero-background-overlay"
              {...getWebClassNameProps("screens-auth-public-hero-background-overlay")}
            />
            <View
              nativeID="screens-auth-public-hero-content"
              style={[
                styles.heroContent,
                isMobile ? styles.heroContentMobile : null,
                { maxWidth: effectiveShowAuthCard ? layoutWidth : 860 },
                isDesktop && !effectiveShowAuthCard ? styles.heroContentDesktop : null,
                effectiveShowAuthCard && isDesktop ? styles.heroContentAuthDesktop : null,
              ]}
              testID="screens-auth-public-hero-content"
              {...getWebClassNameProps("screens-auth-public-hero-content")}
            >
              {showHeroCopy ? (
                <View
                  nativeID="screens-auth-public-hero-copy"
                  style={[
                    styles.heroCopy,
                    isMobile ? styles.heroCopyMobile : null,
                    effectiveShowAuthCard ? styles.heroCopyAuth : null,
                    effectiveShowAuthCard && isDesktop ? styles.heroCopyAuthDesktop : null,
                  ]}
                  testID="screens-auth-public-hero-copy"
                  {...getWebClassNameProps(
                    joinWebClassNames(
                      "screens-auth-public-hero-copy",
                      isWebDesktop && !effectiveShowAuthCard ? "eldojo-public-desktop-fade-in eldojo-public-desktop-fade-in-delay-1" : null
                    )
                  )}
                >
                  <Text
                    nativeID="screens-auth-public-hero-eyebrow"
                    style={styles.heroEyebrow}
                    testID="screens-auth-public-hero-eyebrow"
                    {...getWebClassNameProps("screens-auth-public-hero-eyebrow")}
                  >
                    {content.eyebrow}
                  </Text>
                  <Text
                    nativeID="screens-auth-public-hero-title"
                    style={[styles.heroTitle, isMobile ? styles.heroTitleMobile : null]}
                    testID="screens-auth-public-hero-title"
                    {...getWebClassNameProps("screens-auth-public-hero-title")}
                  >
                    {content.title}
                  </Text>
                  <Text
                    nativeID="screens-auth-public-hero-description"
                    style={[styles.heroDescription, isMobile ? styles.heroDescriptionMobile : null]}
                    testID="screens-auth-public-hero-description"
                    {...getWebClassNameProps("screens-auth-public-hero-description")}
                  >
                    {content.description}
                  </Text>

                  {page === "home" ? (
                    <View style={styles.heroHighlights} {...getWebClassNameProps("screens-auth-public-hero-highlights")}>
                      {HOME_HIGHLIGHTS.map((item, index) => (
                        <View
                          key={item}
                          style={styles.heroHighlightItem}
                          {...getWebClassNameProps(`screens-auth-public-hero-highlight-${index + 1}`)}
                        >
                          <View
                            style={styles.heroHighlightDot}
                            {...getWebClassNameProps(`screens-auth-public-hero-highlight-dot-${index + 1}`)}
                          />
                          <Text
                            style={styles.heroHighlightText}
                            {...getWebClassNameProps(`screens-auth-public-hero-highlight-text-${index + 1}`)}
                          >
                            {item}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  {!effectiveShowAuthCard ? (
                    <View style={styles.heroActions} {...getWebClassNameProps("screens-auth-public-hero-actions")}>
                      <AppButton
                        label="Crear una cuenta"
                        nativeID="screens-auth-public-open-register-button"
                        onPress={() => navigateToPage("createAccount")}
                        testID="screens-auth-public-open-register-button"
                      />
                      <AppButton
                        label={page === "home" ? "Iniciar sesion" : "Ver panel de acceso"}
                        nativeID="screens-auth-public-open-login-button"
                        onPress={() => navigateToPage("signIn")}
                        testID="screens-auth-public-open-login-button"
                        variant="secondary"
                      />
                    </View>
                  ) : null}

                  {isLandingAuthInline ? (
                    <Pressable
                      accessibilityRole="button"
                      nativeID="screens-auth-public-close-auth-inline"
                      onPress={() => setLandingAuthMode(null)}
                      style={({ pressed }) => [styles.heroBackLink, pressed ? { opacity: 0.8 } : null]}
                      testID="screens-auth-public-close-auth-inline"
                    >
                      <Feather color={colors.onPrimaryMuted} name="arrow-left" size={14} />
                      <Text style={styles.heroBackLinkLabel}>Volver a la portada</Text>
                    </Pressable>
                  ) : null}

                  {isMobile ? (
                    <ScrollView
                      contentContainerStyle={styles.mobileSectionNavContent}
                      horizontal
                      nativeID="screens-auth-public-mobile-section-nav"
                      showsHorizontalScrollIndicator={false}
                      testID="screens-auth-public-mobile-section-nav"
                    >
                      {MOBILE_SECTION_NAV_ITEMS.map((item) => {
                        const isActive =
                          page === item.page ||
                          (page === "home" && item.key !== "home" && PAGE_SECTIONS.home.includes(item.key as SectionKey));
                        return (
                          <Pressable
                            key={item.page}
                            accessibilityRole="link"
                            nativeID={`screens-auth-public-mobile-section-chip-${item.key}`}
                            onPress={() => {
                              if (page === "home") {
                                if (item.key === "home") {
                                  scrollToTop();
                                } else if (PAGE_SECTIONS.home.includes(item.key as SectionKey)) {
                                  scrollToSection(item.key as SectionKey);
                                } else {
                                  navigateToPage(item.page);
                                }
                              } else if (item.key === "home") {
                                navigateToPage("home");
                              } else {
                                navigation.navigate("Home", {
                                  initialSection: item.key as PublicSiteSectionKey,
                                });
                              }
                            }}
                            style={({ pressed }) => [
                              styles.mobileSectionChip,
                              isActive ? styles.mobileSectionChipActive : null,
                              pressed ? styles.mobileSectionChipPressed : null,
                            ]}
                            testID={`screens-auth-public-mobile-section-chip-${item.key}`}
                          >
                            <Text
                              nativeID={`screens-auth-public-mobile-section-chip-${item.key}-label`}
                              style={styles.mobileSectionChipLabel}
                              testID={`screens-auth-public-mobile-section-chip-${item.key}-label`}
                            >
                              {item.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  ) : null}
                </View>
              ) : null}

              {effectiveShowAuthCard ? (
                <AppCard
                  nativeID="screens-auth-public-form-card"
                  className={joinWebClassNames(
                    "screens-auth-public-form-card",
                    isWebDesktop ? "eldojo-public-desktop-form-fade-in" : null
                  )}
                  style={[
                    styles.formCard,
                    isDesktop ? styles.formCardDesktop : null,
                    isMobile ? styles.formCardMobile : null,
                  ]}
                  testID="screens-auth-public-form-card"
                >
                  <View nativeID="screens-auth-public-form-tabs" style={styles.tabs} testID="screens-auth-public-form-tabs">
                    <Pressable
                      accessibilityRole="link"
                      nativeID="screens-auth-public-form-tab-create-account"
                      onPress={() => {
                        if (isLandingAuthInline) {
                          setLandingAuthMode("academy");
                        } else {
                          navigateToPage("createAccount");
                        }
                      }}
                      style={({ pressed }) => [
                        styles.tabButton,
                        mode === "academy" ? styles.tabButtonActive : null,
                        pressed ? styles.tabButtonPressed : null,
                      ]}
                      testID="screens-auth-public-form-tab-create-account"
                    >
                      <Text
                        nativeID="screens-auth-public-form-tab-create-account-label"
                        style={[styles.tabLabel, mode === "academy" ? styles.tabLabelActive : null]}
                        testID="screens-auth-public-form-tab-create-account-label"
                      >
                        Crear cuenta
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="link"
                      nativeID="screens-auth-public-form-tab-signin"
                      onPress={() => {
                        if (isLandingAuthInline) {
                          setLandingAuthMode("login");
                        } else {
                          navigateToPage("signIn");
                        }
                      }}
                      style={({ pressed }) => [
                        styles.tabButton,
                        mode === "login" ? styles.tabButtonActive : null,
                        pressed ? styles.tabButtonPressed : null,
                      ]}
                      testID="screens-auth-public-form-tab-signin"
                    >
                      <Text
                        nativeID="screens-auth-public-form-tab-signin-label"
                        style={[styles.tabLabel, mode === "login" ? styles.tabLabelActive : null]}
                        testID="screens-auth-public-form-tab-signin-label"
                      >
                        Iniciar sesion
                      </Text>
                    </Pressable>
                  </View>

                  {mode === "academy" ? (
                    <>
                      <Text nativeID="screens-auth-public-register-form-title" style={styles.formTitle} testID="screens-auth-public-register-form-title">
                        {isAwaitingConfirmation ? "Esperando confirmación" : "Registra tu academia"}
                      </Text>
                      <Text nativeID="screens-auth-public-register-form-subtitle" style={styles.formSubtitle} testID="screens-auth-public-register-form-subtitle">
                        {isAwaitingConfirmation
                          ? "Tu cuenta quedó pendiente de confirmación. Puedes abrir el enlace desde cualquier navegador o dispositivo y esta página entrará sola en cuanto detecte la confirmación."
                          : "Registra tu academia y crea la cuenta para administrarla hoy mismo."}
                      </Text>
                      {isAwaitingConfirmation ? (
                        <View nativeID="screens-auth-public-register-pending-state" style={styles.pendingConfirmationCard} testID="screens-auth-public-register-pending-state">
                          <View nativeID="screens-auth-public-register-pending-indicator" style={styles.pendingConfirmationIndicator} testID="screens-auth-public-register-pending-indicator" />
                          <View
                            nativeID="screens-auth-public-register-pending-copy"
                            style={styles.pendingConfirmationCopy}
                            testID="screens-auth-public-register-pending-copy"
                          >
                            <Text
                              nativeID="screens-auth-public-register-pending-title"
                              style={styles.pendingConfirmationTitle}
                              testID="screens-auth-public-register-pending-title"
                            >
                              {redeemPendingSessionMutation.isPending
                                ? "Correo confirmado. Entrando a tu panel..."
                                : "Esperando confirmación de correo"}
                            </Text>
                            <Text
                              nativeID="screens-auth-public-register-pending-description"
                              style={styles.pendingConfirmationDescription}
                              testID="screens-auth-public-register-pending-description"
                            >
                              {redeemPendingSessionMutation.isPending
                                ? "Ya detectamos la confirmación y estamos abriendo tu sesión."
                                : "Mantén esta página abierta. El sistema revisará automáticamente el estado de tu cuenta."}
                            </Text>
                          </View>
                        </View>
                      ) : null}
                      <AppInput
                        editable={!isAwaitingConfirmation}
                        label="Academia"
                        nativeID="screens-auth-public-register-academy-input"
                        onChangeText={setAcademyName}
                        placeholder="Union MMA"
                        testID="screens-auth-public-register-academy-input"
                        value={academyName}
                      />
                      <AppInput
                        editable={!isAwaitingConfirmation}
                        label="Nombre"
                        nativeID="screens-auth-public-register-first-name-input"
                        onChangeText={setAdminFirstName}
                        placeholder="Tu nombre"
                        testID="screens-auth-public-register-first-name-input"
                        value={adminFirstName}
                      />
                      <AppInput
                        editable={!isAwaitingConfirmation}
                        label="Apellidos"
                        nativeID="screens-auth-public-register-last-name-input"
                        onChangeText={setAdminLastName}
                        placeholder="Tus apellidos"
                        testID="screens-auth-public-register-last-name-input"
                        value={adminLastName}
                      />
                      <AppInput
                        autoCapitalize="none"
                        autoComplete="email"
                        editable={!isAwaitingConfirmation}
                        keyboardType="email-address"
                        label="Correo"
                        nativeID="screens-auth-public-register-email-input"
                        onChangeText={setEmail}
                        placeholder="admin@tuacademia.com"
                        testID="screens-auth-public-register-email-input"
                        value={email}
                      />
                      {!isAwaitingConfirmation ? (
                        <AppInput
                          autoComplete="new-password"
                          label="Contrasena"
                          nativeID="screens-auth-public-register-password-input"
                          onChangeText={setPassword}
                          placeholder="Crea una contraseña"
                          rightAdornment={
                            <Pressable
                              accessibilityLabel={showRegisterPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
                              accessibilityRole="button"
                              nativeID="screens-auth-public-register-password-toggle"
                              onPress={() => setShowRegisterPassword((current) => !current)}
                              style={({ pressed }) => [styles.passwordToggle, pressed ? styles.passwordTogglePressed : null]}
                              testID="screens-auth-public-register-password-toggle"
                            >
                              <Feather color={colors.textMuted} name={showRegisterPassword ? "eye-off" : "eye"} size={18} />
                            </Pressable>
                          }
                          secureTextEntry={!showRegisterPassword}
                          testID="screens-auth-public-register-password-input"
                          value={password}
                        />
                      ) : (
                        <AppInput
                          editable={false}
                          label="Contrasena"
                          nativeID="screens-auth-public-register-password-input"
                          secureTextEntry
                          testID="screens-auth-public-register-password-input"
                          value={MASKED_REGISTERED_PASSWORD}
                        />
                      )}
                      <Text nativeID="screens-auth-public-register-helper" style={styles.helper} testID="screens-auth-public-register-helper">
                        {isAwaitingConfirmation
                          ? "Los datos quedaron bloqueados para evitar cambios mientras esperamos la confirmación. Si necesitas corregir algo, usa otro correo."
                          : "El sufijo interno de la academia se genera con las primeras tres letras utiles del nombre."}
                      </Text>
                      {formError ? <Text nativeID="screens-auth-public-register-error" style={styles.error} testID="screens-auth-public-register-error">{formError}</Text> : null}
                      {formFeedback ? <Text nativeID="screens-auth-public-register-feedback" style={styles.success} testID="screens-auth-public-register-feedback">{formFeedback}</Text> : null}
                      {isAwaitingConfirmation ? (
                        <View nativeID="screens-auth-public-register-actions" style={styles.formActions} testID="screens-auth-public-register-actions">
                          <AppButton
                            label="Reenviar enlace"
                            loading={resendMutation.isPending}
                            nativeID="screens-auth-public-register-resend-button"
                            onPress={handleResendConfirmation}
                            testID="screens-auth-public-register-resend-button"
                          />
                          <AppButton
                            label="Usar otro correo"
                            nativeID="screens-auth-public-register-reset-feedback-button"
                            onPress={handleResetPendingRegistration}
                            testID="screens-auth-public-register-reset-feedback-button"
                            variant="secondary"
                          />
                        </View>
                      ) : (
                        <AppButton
                          label="Crear academia"
                          disabled={isAwaitingConfirmation}
                          loading={registerMutation.isPending}
                          nativeID="screens-auth-public-register-submit-button"
                          onPress={handleAcademySubmit}
                          testID="screens-auth-public-register-submit-button"
                        />
                      )}
                    </>
                  ) : (
                    <>
                      <Text nativeID="screens-auth-public-signin-form-title" style={styles.formTitle} testID="screens-auth-public-signin-form-title">Bienvenido de vuelta</Text>
                      <Text nativeID="screens-auth-public-signin-form-subtitle" style={styles.formSubtitle} testID="screens-auth-public-signin-form-subtitle">
                        Inicia sesion con la cuenta administradora de tu academia para entrar al panel operativo.
                      </Text>
                      <AppInput
                        autoCapitalize="none"
                        autoComplete="email"
                        keyboardType="email-address"
                        label="Correo"
                        nativeID="screens-auth-public-signin-email-input"
                        onChangeText={setEmail}
                        placeholder="admin@tuacademia.com"
                        testID="screens-auth-public-signin-email-input"
                        value={email}
                      />
                      <AppInput
                        autoComplete="password"
                        label="Contrasena"
                        nativeID="screens-auth-public-signin-password-input"
                        onChangeText={setPassword}
                        placeholder="Tu contraseña"
                        rightAdornment={
                          <Pressable
                            accessibilityLabel={showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
                            accessibilityRole="button"
                            nativeID="screens-auth-public-signin-password-toggle"
                            onPress={() => setShowPassword((current) => !current)}
                            style={({ pressed }) => [styles.passwordToggle, pressed ? styles.passwordTogglePressed : null]}
                            testID="screens-auth-public-signin-password-toggle"
                          >
                            <Feather color={colors.textMuted} name={showPassword ? "eye-off" : "eye"} size={18} />
                          </Pressable>
                        }
                        secureTextEntry={!showPassword}
                        testID="screens-auth-public-signin-password-input"
                        value={password}
                      />
                      {formError ? <Text nativeID="screens-auth-public-signin-error" style={styles.error} testID="screens-auth-public-signin-error">{formError}</Text> : null}
                      {formFeedback ? <Text nativeID="screens-auth-public-signin-feedback" style={styles.success} testID="screens-auth-public-signin-feedback">{formFeedback}</Text> : null}
                      {isConfirmationPendingMessage(formError) ? (
                        <AppButton
                          label="Reenviar enlace de confirmación"
                          loading={resendMutation.isPending}
                          nativeID="screens-auth-public-signin-resend-button"
                          onPress={handleResendConfirmation}
                          testID="screens-auth-public-signin-resend-button"
                          variant="secondary"
                        />
                      ) : null}
                      <AppButton
                        label="Entrar"
                        loading={loginMutation.isPending}
                        nativeID="screens-auth-public-signin-submit-button"
                        onPress={handleLoginSubmit}
                        testID="screens-auth-public-signin-submit-button"
                      />
                    </>
                  )}
                </AppCard>
              ) : null}
            </View>
          </View>

          <View
            nativeID="screens-auth-public-page-content"
            style={[
              styles.pageContent,
              page === "home" ? styles.pageContentHome : null,
              { maxWidth: layoutWidth },
            ]}
            testID="screens-auth-public-page-content"
            {...getWebClassNameProps("screens-auth-public-page-content")}
          >
            {PAGE_SECTIONS[page].includes("about") ? renderAboutSection(isDesktop, registerSectionOffset("about")) : null}
          </View>
        </ScrollView>
    </View>
  );
}

function buildChromeNavItems(
  navigation: ReturnType<typeof useNavigation<NativeStackNavigationProp<AuthStackParamList>>>,
  currentPage: PublicPageKey
) {
  const pages: Array<{ key: PublicPageKey; label: string }> = [
    { key: "home", label: "Inicio" },
    { key: "about", label: "Acerca de" },
  ];

  return pages.map((page) => ({
    key: page.key,
    label: page.label,
    onPress: () => {
      if (page.key === currentPage) {
        return;
      }
      navigation.navigate(PUBLIC_PAGE_TO_SCREEN[page.key]);
    },
  }));
}

function buildHomeSpaNavItems(
  scrollRef: MutableRefObject<PublicSiteScrollControls | null>,
  navigation: ReturnType<typeof useNavigation<NativeStackNavigationProp<AuthStackParamList & AdminStackParamList>>>
) {
  const pages: Array<{ key: PublicSiteSectionKey; label: string; fallbackNavigate?: PublicPageKey }> = [
    { key: "home", label: "Inicio" },
    { key: "about", label: "Acerca de", fallbackNavigate: "about" },
  ];

  return pages.map((page) => ({
    key: page.key,
    label: page.label,
    onPress: () => {
      if (scrollRef.current) {
        scrollRef.current.scrollToSection(page.key);
        return;
      }
      if (page.fallbackNavigate) {
        navigation.navigate(PUBLIC_PAGE_TO_SCREEN[page.fallbackNavigate]);
      }
    },
  }));
}

type HomeScreenProps = {
  initialSection?: PublicSiteSectionKey;
};

export function HomeScreen({ initialSection: initialSectionProp }: HomeScreenProps = {}) {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList & AdminStackParamList>>();
  const route = useRoute();
  const { user, status } = useAuth();
  const routeParams = (route.params as { initialSection?: PublicSiteSectionKey } | undefined) ?? {};
  const initialSection = initialSectionProp ?? routeParams.initialSection;

  const scrollControlsRef = useRef<PublicSiteScrollControls | null>(null);
  const [readyTick, setReadyTick] = useState(0);
  const initialSectionAppliedRef = useRef(false);

  const handleReady = useCallback((controls: PublicSiteScrollControls) => {
    scrollControlsRef.current = controls;
    setReadyTick((tick) => (tick + 1) % 10_000);

    if (initialSection && !initialSectionAppliedRef.current) {
      initialSectionAppliedRef.current = true;
      requestAnimationFrame(() => {
        controls.scrollToSection(initialSection);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const spaNavItems = useMemo(() => {
    return buildHomeSpaNavItems(scrollControlsRef, navigation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readyTick]);

  const handleGoDashboard = useCallback(() => {
    const isAdmin =
      status === "authenticated" &&
      user !== null &&
      user !== undefined &&
      ["org_admin", "branch_admin"].includes(user.role);
    if (isAdmin) {
      navigation.navigate("AdminHome");
      return;
    }
    scrollControlsRef.current?.scrollToSection("home") ?? navigateToPublicPageKey("home");
  }, [navigation, status, user]);

  return (
    <PublicPageChrome
      idPrefix="screens-auth-public-home"
      navItems={spaNavItems}
      onBrandPress={() => scrollControlsRef.current?.scrollToSection("home") ?? navigateToPublicPageKey("home")}
      onGoCreateAccount={() => navigation.navigate(PUBLIC_PAGE_TO_SCREEN.createAccount)}
      onGoDashboard={handleGoDashboard}
      onGoSignIn={() => navigation.navigate(PUBLIC_PAGE_TO_SCREEN.signIn)}
      screenScrollable={true}
    >
      <PublicSiteScreen onReadyScrollControls={handleReady} page="home" />
    </PublicPageChrome>
  );
}

export function AboutScreen() {
  return <HomeScreen initialSection="about" />;
}

export function EventsScreen() {
  return <HomeScreen initialSection="about" />;
}

export function StoresScreen() {
  return <HomeScreen initialSection="about" />;
}

export function CreateAccountScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();

  const spaNavItems = useMemo(() => {
    return [
      { key: "home", label: "Inicio", onPress: () => navigation.navigate("Home") },
      {
        key: "about",
        label: "Acerca de",
        onPress: () => navigation.navigate("Home", { initialSection: "about" }),
      },
    ];
  }, [navigation]);

  return (
    <PublicPageChrome
      idPrefix="screens-auth-public-create-account"
      navItems={spaNavItems}
      onBrandPress={() => navigation.navigate("Home")}
      onGoCreateAccount={() => {}}
      onGoSignIn={() => navigation.navigate(PUBLIC_PAGE_TO_SCREEN.signIn)}
      screenScrollable={false}
    >
      <PublicSiteScreen page="createAccount" />
    </PublicPageChrome>
  );
}

export function SignInScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();

  const spaNavItems = useMemo(() => {
    return [
      { key: "home", label: "Inicio", onPress: () => navigation.navigate("Home") },
      {
        key: "about",
        label: "Acerca de",
        onPress: () => navigation.navigate("Home", { initialSection: "about" }),
      },
    ];
  }, [navigation]);

  return (
    <PublicPageChrome
      idPrefix="screens-auth-public-signin"
      navItems={spaNavItems}
      onBrandPress={() => navigation.navigate("Home")}
      onGoCreateAccount={() => navigation.navigate(PUBLIC_PAGE_TO_SCREEN.createAccount)}
      onGoSignIn={() => {}}
      screenScrollable={false}
    >
      <PublicSiteScreen page="signIn" />
    </PublicPageChrome>
  );
}

const styles = StyleSheet.create({
  publicRoot: {
    backgroundColor: colors.background,
    flex: 1,
    minHeight: 0,
    width: "100%",
  },
  publicRootStatic: {
    flex: 0,
    flexGrow: 0,
    minHeight: 0,
    width: "100%",
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
    minHeight: 0,
  },
  navbar: {
    backgroundColor: "rgba(23, 22, 18, 0.88)",
    borderBottomColor: "rgba(255, 255, 255, 0.12)",
    borderBottomWidth: 1,
    elevation: 3,
    shadowColor: "#8C96A3",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    zIndex: 20,
  },
  navbarDesktop: {
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  navbarMobile: {
    position: "relative",
  },
  navbarInner: {
    alignItems: "center",
    alignSelf: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    width: "100%",
  },
  navbarInnerMobile: {
    alignItems: "stretch",
    flexDirection: "column",
    gap: spacing.sm,
  },
  navbarBrand: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  navbarLogoButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  navbarLogo: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 56,
    width: 56,
  },
  navbarBrandCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  navbarBrandTitle: {
    color: colors.onPrimary,
    fontFamily: typography.headingFamily,
    fontSize: 18,
    fontWeight: "800",
  },
  navbarBrandSubtitle: {
    color: colors.onPrimaryMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 18,
  },
  navbarLinks: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "center",
  },
  navbarLinkButton: {
    alignItems: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "transparent",
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: spacing.sm,
  },
  navbarLinkButtonActive: {
    backgroundColor: colors.surface,
    borderColor: colors.surface,
  },
  navbarLinkPressed: {
    opacity: 0.75,
  },
  navbarLinkLabel: {
    color: colors.onPrimary,
    fontFamily: typography.headingFamily,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  navbarLinkLabelActive: {
    color: colors.text,
  },
  navbarLinkLabelSelected: {
    fontSize: 15,
  },
  navbarAuthActions: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "flex-end",
  },
  mobileMenuTrigger: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  mobileMenuContent: {
    gap: spacing.sm,
  },
  navbarAuthActionsMobile: {
    width: "100%",
  },
  navbarAuthButton: {
    alignItems: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: spacing.md,
  },
  navbarAuthButtonMobile: {
    flex: 1,
    minHeight: 48,
  },
  navbarAuthButtonPrimary: {
    backgroundColor: colors.action,
    borderColor: colors.action,
  },
  navbarAuthButtonPrimaryHover: {
    backgroundColor: colors.surface,
    borderColor: colors.surface,
  },
  navbarAuthButtonSecondary: {
    backgroundColor: "transparent",
    borderColor: "rgba(255, 255, 255, 0.28)",
  },
  navbarAuthButtonSecondaryHover: {
    backgroundColor: colors.surface,
    borderColor: colors.surface,
  },
  navbarAuthButtonLabel: {
    color: colors.onPrimary,
    fontFamily: typography.headingFamily,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  navbarAuthButtonLabelPrimary: {
    color: colors.onPrimary,
  },
  navbarAuthButtonLabelPrimaryHover: {
    color: colors.text,
  },
  navbarAuthButtonLabelSecondaryHover: {
    color: colors.text,
  },
  mainScroll: {
    flex: 1,
  },
  mainScrollStatic: {
    flex: 0,
    flexGrow: 0,
  },
  scrollContent: {
    flexGrow: 1,
  },
  scrollContentStatic: {
    flexGrow: 0,
  },
  heroSection: {
    backgroundColor: "#151410",
    justifyContent: "center",
    overflow: "hidden",
    paddingHorizontal: spacing.lg,
    position: "relative",
    width: "100%",
  },
  heroSectionMobile: {
    justifyContent: "flex-start",
    paddingBottom: spacing["2xl"],
  },
  heroMedia: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    backgroundColor: "#E8DDC7",
    justifyContent: "flex-start",
    overflow: "hidden",
  },
  heroSectionImage: {
    height: "100%",
    width: "100%",
  },
  heroBackgroundOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(23, 22, 18, 0.38)",
  },
  heroContent: {
    alignSelf: "center",
    gap: spacing.xl,
    width: "100%",
    zIndex: 1,
  },
  heroContentMobile: {
    gap: spacing.lg,
  },
  heroContentDesktop: {
    paddingLeft: spacing["2xl"],
  },
  heroContentAuthDesktop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    maxWidth: 1040,
  },
  heroCopy: {
    gap: spacing.md,
    maxWidth: 620,
  },
  heroCopyMobile: {
    backgroundColor: "rgba(23, 22, 18, 0.58)",
    borderColor: "rgba(255, 255, 255, 0.18)",
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  heroCopyAuth: {
    maxWidth: 560,
  },
  heroCopyAuthDesktop: {
    maxWidth: 420,
    minHeight: 360,
    justifyContent: "center",
  },
  heroEyebrow: {
    color: colors.onPrimaryMuted,
    fontFamily: typography.headingFamily,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: colors.onPrimary,
    fontFamily: typography.displayFamily,
    fontSize: 56,
    fontWeight: "800",
    letterSpacing: 0.4,
    lineHeight: 62,
  },
  heroTitleMobile: {
    fontSize: 38,
    lineHeight: 44,
  },
  heroDescription: {
    color: colors.onPrimaryMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 18,
    lineHeight: 28,
    maxWidth: 580,
  },
  heroDescriptionMobile: {
    fontSize: 16,
    lineHeight: 24,
  },
  heroHighlights: {
    gap: spacing.sm,
  },
  heroHighlightItem: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
  },
  heroHighlightDot: {
    backgroundColor: colors.actionSoft,
    borderRadius: radius.pill,
    height: 8,
    marginTop: 8,
    width: 8,
  },
  heroHighlightText: {
    color: colors.onPrimary,
    flex: 1,
    fontFamily: typography.bodyFamily,
    fontSize: 16,
    lineHeight: 24,
  },
  heroActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  heroBackLink: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  heroBackLinkLabel: {
    color: colors.onPrimaryMuted,
    fontFamily: typography.headingFamily,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  mobileSectionNavContent: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  mobileSectionChip: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    borderColor: "rgba(255, 255, 255, 0.22)",
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  mobileSectionChipActive: {
    backgroundColor: "rgba(255, 255, 255, 0.26)",
  },
  mobileSectionChipPressed: {
    opacity: 0.8,
  },
  mobileSectionChipLabel: {
    color: colors.onPrimary,
    fontFamily: typography.headingFamily,
    fontSize: 14,
    fontWeight: "700",
  },
  pageContent: {
    alignSelf: "center",
    alignItems: "stretch",
    gap: spacing["2xl"],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing["2xl"],
    width: "100%",
  },
  pageContentHome: {
    backgroundColor: "#faf7f0",
  },
  formCard: {
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    gap: spacing.md,
    marginBottom: 32,
    maxWidth: 520,
    padding: spacing.md,
  },
  formCardMobile: {
    maxWidth: "100%",
    width: "100%",
  },
  formCardDesktop: {
    alignSelf: "center",
    marginLeft: 0,
    width: "100%",
  },
  tabs: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    padding: 6,
  },
  tabButton: {
    alignItems: "center",
    borderRadius: radius.pill,
    flex: 1,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: spacing.sm,
  },
  tabButtonActive: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderWidth: 1,
  },
  tabButtonPressed: {
    opacity: 0.85,
  },
  tabLabel: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    color: colors.primary,
  },
  formTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  formSubtitle: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 20,
  },
  helper: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
    lineHeight: 16,
  },
  error: {
    color: colors.danger,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
  },
  success: {
    color: colors.primary,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 20,
  },
  pendingConfirmationCard: {
    alignItems: "flex-start",
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  pendingConfirmationIndicator: {
    backgroundColor: colors.action,
    borderRadius: radius.pill,
    height: 12,
    marginTop: 4,
    width: 12,
  },
  pendingConfirmationCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  pendingConfirmationTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  pendingConfirmationDescription: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 19,
  },
  formActions: {
    gap: spacing.xs,
  },
  passwordToggle: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 28,
    minWidth: 28,
  },
  passwordTogglePressed: {
    opacity: 0.65,
  },
  infoSection: {
    alignItems: "stretch",
    gap: spacing.lg,
    width: "100%",
  },
  infoSectionDesktop: {
    alignItems: "stretch",
    flexDirection: "row",
    gap: spacing.xl,
  },
  sectionImage: {
    borderColor: colors.borderStrong,
    borderRadius: radius.lg,
    borderWidth: 1,
    height: 280,
    width: "100%",
  },
  sectionImageDesktop: {
    flex: 1,
    height: 420,
    maxWidth: 560,
  },
  aboutCopy: {
    flex: 1,
    gap: spacing.md,
    justifyContent: "center",
    maxWidth: 560,
    paddingVertical: spacing.md,
  },
  sectionCopyBlock: {
    alignSelf: "stretch",
    gap: spacing.sm,
    maxWidth: 720,
  },
  sectionEyebrow: {
    color: colors.primary,
    fontFamily: typography.headingFamily,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: typography.displayFamily,
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 40,
  },
  sectionDescription: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 16,
    lineHeight: 26,
  },
  highlightsList: {
    gap: spacing.sm,
    maxWidth: 560,
  },
  highlightItem: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    width: "100%",
  },
  highlightDot: {
    backgroundColor: colors.action,
    borderRadius: radius.pill,
    height: 8,
    marginTop: 8,
    width: 8,
  },
  highlightText: {
    color: colors.text,
    flex: 1,
    fontFamily: typography.bodyFamily,
    fontSize: 15,
    lineHeight: 22,
  },
  footerShell: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    width: "100%",
  },
  footerShellDesktop: {
    minHeight: 120,
  },
  footerInner: {
    alignSelf: "center",
    width: "100%",
  },
  footerTop: {
    gap: spacing.lg,
    justifyContent: "space-between",
    paddingVertical: spacing.lg,
  },
  footerTopDesktop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  footerBrandBlock: {
    alignItems: "center",
    gap: 4,
    minWidth: 220,
  },
  footerBrandTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 20,
    fontWeight: "800",
  },
  footerCredit: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 20,
  },
  footerContent: {
    gap: spacing.lg,
  },
  footerContentDesktop: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
  },
  footerBlock: {
    alignItems: "center",
    flex: 1,
    gap: spacing.xs,
    minWidth: 180,
  },
  footerTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    textTransform: "uppercase",
  },
  footerText: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
});
