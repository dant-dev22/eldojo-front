import { Feather } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  DimensionValue,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getErrorMessage } from "@/api/http";
import { AppButton } from "@/components/AppButton";
import { AppCard } from "@/components/AppCard";
import { AppInput } from "@/components/AppInput";
import { AppModal } from "@/components/AppModal";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { PUBLIC_PAGE_META, PUBLIC_PAGE_TO_SCREEN, type PublicPageKey } from "@/navigation/publicRoutes";
import type { AuthStackParamList } from "@/navigation/types";

type AuthMode = "login" | "academy";
type SectionKey = "about" | "events" | "stores";

type ShowcaseItem = {
  id: string;
  title: string;
  image: string;
};

type PublicSiteScreenProps = {
  page: PublicPageKey;
};

function buildWebsiteImage(prompt: string, imageSize: string): string {
  return `https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=${encodeURIComponent(prompt)}&image_size=${imageSize}`;
}

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

const logoPlaceholder = buildWebsiteImage(
  "minimal premium martial arts brand logo mark on light cream background, circular emblem, elegant typography, high contrast, website header asset",
  "square"
);

const heroBackground = require("../../img/fondos.jpg");

const aboutImage = buildWebsiteImage(
  "dojo owner reviewing student schedule and payments on a laptop inside a clean martial arts academy, warm neutral palette, premium realistic website illustration",
  "landscape_4_3"
);

const eventFlyers: ShowcaseItem[] = [
  {
    id: "summer-open",
    title: "Summer Open 2026",
    image: buildWebsiteImage(
      "martial arts event flyer, brazilian jiu-jitsu open championship, premium poster design, cream and olive palette, realistic print texture, clean typography space",
      "portrait_16_9"
    ),
  },
  {
    id: "fight-night",
    title: "Fight Night Amateur Series",
    image: buildWebsiteImage(
      "mma fight night event flyer, premium promotional poster, warm cream and muted green tones, modern layout, realistic poster mockup",
      "portrait_16_9"
    ),
  },
  {
    id: "judo-clinic",
    title: "Judo Weekend Clinic",
    image: buildWebsiteImage(
      "judo seminar flyer, premium martial arts clinic poster, soft cream and olive palette, elegant modern composition, realistic poster mockup",
      "portrait_16_9"
    ),
  },
];

const storeCards: ShowcaseItem[] = [
  "Guantes",
  "Kimonos",
  "Protectores",
  "Rashguards",
  "Cintas",
  "Tenis",
  "Mochilas",
  "Uniformes",
  "Accesorios",
].map((title, index) => ({
  id: `store-${index + 1}`,
  title,
  image: buildWebsiteImage(
    `${title} for martial arts retail catalog, premium ecommerce product tile, warm cream background, soft shadows, realistic product photography`,
    "square"
  ),
}));

const HOME_HIGHLIGHTS = [
  "Controla alumnos, pagos y asistencia en una sola vista.",
  "Arranca rapido desde navegador y celular sin perder legibilidad.",
  "Configura tu academia y entra al panel en pocos pasos.",
];

const SECTION_NAV_ITEMS: Array<{ key: SectionKey | "home"; label: string; page: PublicPageKey }> = [
  { key: "home", label: "Inicio", page: "home" },
  { key: "about", label: "Acerca", page: "about" },
  { key: "events", label: "Eventos", page: "events" },
  { key: "stores", label: "Tiendas", page: "stores" },
];

const PAGE_SECTIONS: Record<PublicPageKey, SectionKey[]> = {
  about: ["about"],
  createAccount: ["about"],
  events: ["events"],
  home: ["about", "events", "stores"],
  signIn: ["about"],
  stores: ["stores"],
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
    eyebrow: "Software operativo para dojos",
    title: "La administracion de un club de pelea nunca fue tan sencilla.",
  },
  about: {
    description: "Conoce como ElDojo ayuda a academias de MMA, BJJ y judo a ordenar la operacion diaria sin hojas sueltas ni mensajes perdidos.",
    eyebrow: "Acerca de ElDojo",
    title: "Menos caos operativo, mas tiempo para entrenar y dirigir tu academia.",
  },
  events: {
    description: "Destaca opens, seminarios y funciones proximas con una ruta propia que puedes compartir y posicionar mejor en buscadores.",
    eyebrow: "Eventos",
    title: "Una URL dedicada para tus eventos relevantes de academia.",
  },
  stores: {
    description: "Presenta aliados, patrocinadores y productos de combate dentro de una pagina publica clara, limpia y facil de compartir.",
    eyebrow: "Tiendas y aliados",
    title: "Muestra a tus tiendas y marcas con una ruta pensada para SEO.",
  },
  createAccount: {
    description: "Registra tu academia y crea la cuenta administradora principal para empezar a operar hoy mismo.",
    eyebrow: "Crear cuenta",
    title: "Abre tu academia y activa tu panel operativo.",
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

  return message.endsWith(".") ? message : `${message}.`;
}

function renderAboutSection(isDesktop: boolean) {
  return (
    <View
      nativeID="screens-auth-public-about-section"
      style={[styles.infoSection, isDesktop ? styles.infoSectionDesktop : null]}
      testID="screens-auth-public-about-section"
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
              <View style={styles.highlightDot} />
              <Text style={styles.highlightText}>{item}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function renderEventsSection(
  showcaseCardWidth: number,
  setSelectedShowcaseItem: (item: ShowcaseItem) => void
) {
  return (
    <View nativeID="screens-auth-public-events-section" style={styles.stackedSection} testID="screens-auth-public-events-section">
      <View nativeID="screens-auth-public-events-copy" style={styles.sectionCopyBlock} testID="screens-auth-public-events-copy">
        <Text nativeID="screens-auth-public-events-eyebrow" style={styles.sectionEyebrow} testID="screens-auth-public-events-eyebrow">
          Eventos
        </Text>
        <Text nativeID="screens-auth-public-events-title" style={styles.sectionTitle} testID="screens-auth-public-events-title">
          Proximos eventos de tu comunidad.
        </Text>
        <Text nativeID="screens-auth-public-events-description" style={styles.sectionDescription} testID="screens-auth-public-events-description">
          Usa este espacio para destacar opens, seminarios y funciones proximas con una URL dedicada. Dejamos flyers de ejemplo listos para presentacion.
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.eventsCarousel}
        horizontal
        nativeID="screens-auth-public-events-carousel"
        showsHorizontalScrollIndicator={false}
        testID="screens-auth-public-events-carousel"
      >
        {eventFlyers.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            nativeID={`screens-auth-public-event-card-${item.id}`}
            onPress={() => setSelectedShowcaseItem(item)}
            style={({ pressed }) => [
              styles.cardPressable,
              styles.showcaseCard,
              { width: showcaseCardWidth },
              pressed ? styles.showcaseCardPressed : null,
            ]}
            testID={`screens-auth-public-event-card-${item.id}`}
          >
            <AppCard style={styles.marketingCard}>
              <Image source={{ uri: item.image }} style={styles.showcaseImage} />
              <View style={styles.cardBody}>
                <Text style={styles.cardEyebrow}>Evento destacado</Text>
                <Text style={styles.showcaseTitle}>{item.title}</Text>
                <Text style={styles.cardCaption}>Vista previa con formato promocional y jerarquia visual estandar.</Text>
              </View>
            </AppCard>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function renderStoresSection(
  isDesktop: boolean,
  isTablet: boolean,
  storeCardWidthStyle: { width: DimensionValue },
  setSelectedShowcaseItem: (item: ShowcaseItem) => void
) {
  return (
    <View nativeID="screens-auth-public-stores-section" style={styles.stackedSection} testID="screens-auth-public-stores-section">
      <View nativeID="screens-auth-public-stores-copy" style={styles.sectionCopyBlock} testID="screens-auth-public-stores-copy">
        <Text nativeID="screens-auth-public-stores-eyebrow" style={styles.sectionEyebrow} testID="screens-auth-public-stores-eyebrow">
          Tiendas
        </Text>
        <Text nativeID="screens-auth-public-stores-title" style={styles.sectionTitle} testID="screens-auth-public-stores-title">
          Una vitrina simple para tus aliados comerciales.
        </Text>
        <Text nativeID="screens-auth-public-stores-description" style={styles.sectionDescription} testID="screens-auth-public-stores-description">
          Aqui puedes mostrar patrocinadores, tiendas de equipo o espacios afiliados con una ruta propia y facil de indexar.
        </Text>
      </View>

      <View
        nativeID="screens-auth-public-stores-grid"
        style={[
          styles.storeGrid,
          isDesktop ? styles.storeGridDesktop : isTablet ? styles.storeGridTablet : styles.storeGridMobile,
        ]}
        testID="screens-auth-public-stores-grid"
      >
        {storeCards.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            nativeID={`screens-auth-public-store-card-${item.id}`}
            onPress={() => setSelectedShowcaseItem(item)}
            style={({ pressed }) => [styles.cardPressable, styles.storeCard, storeCardWidthStyle, pressed ? styles.showcaseCardPressed : null]}
            testID={`screens-auth-public-store-card-${item.id}`}
          >
            <AppCard style={styles.marketingCard}>
              <Image source={{ uri: item.image }} style={styles.storeImage} />
              <View style={styles.cardBody}>
                <Text style={styles.cardEyebrow}>Catalogo</Text>
                <Text style={styles.storeTitle}>{item.title}</Text>
                <Text style={styles.cardCaption}>Tarjeta limpia para producto, aliado o patrocinador.</Text>
              </View>
            </AppCard>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function PublicSiteScreen({ page }: PublicSiteScreenProps) {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { signIn, registerAcademy } = useAuth();
  const { contentMaxWidth, isDesktop, isMobile, isTablet, width } = useResponsiveLayout();

  useWebSeo(page);

  const [selectedShowcaseItem, setSelectedShowcaseItem] = useState<ShowcaseItem | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [academyName, setAcademyName] = useState("");
  const [adminFirstName, setAdminFirstName] = useState("");
  const [adminLastName, setAdminLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loginMutation = useMutation({
    mutationFn: signIn,
    onError: (error) => setFormError(formatAuthError(error)),
  });

  const registerMutation = useMutation({
    mutationFn: registerAcademy,
    onError: (error) => setFormError(formatAuthError(error)),
  });

  const content = PAGE_COPY[page];
  const isAuthPage = page === "createAccount" || page === "signIn";
  const mode: AuthMode = page === "createAccount" ? "academy" : "login";

  const heroHeight = useMemo(() => {
    if (isAuthPage && isDesktop) {
      return 860;
    }
    if (isDesktop) {
      return 760;
    }
    if (isTablet) {
      return 720;
    }
    return isAuthPage ? 980 : 700;
  }, [isAuthPage, isDesktop, isTablet]);

  const layoutWidth = Math.min(contentMaxWidth, 1200);
  const showcaseCardWidth = useMemo<number>(() => {
    if (isDesktop) {
      return 260;
    }

    if (isTablet) {
      return 280;
    }

    return Math.max(Math.min(width - spacing.lg * 2 - spacing.md, 320), 252);
  }, [isDesktop, isTablet, width]);

  const storeCardWidthStyle = useMemo<{ width: DimensionValue }>(
    () => ({
      width: isDesktop ? "31.8%" : isTablet ? "48%" : "100%",
    }),
    [isDesktop, isTablet]
  );

  const navigateToPage = (nextPage: PublicPageKey) => {
    setFormError(null);
    navigation.navigate(PUBLIC_PAGE_TO_SCREEN[nextPage]);
  };

  const handleLoginSubmit = () => {
    if (!email.trim() || !password.trim()) {
      setFormError("Completa correo y contraseña.");
      return;
    }

    setFormError(null);
    loginMutation.mutate({
      email: email.trim().toLowerCase(),
      password,
    });
  };

  const handleAcademySubmit = () => {
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
    registerMutation.mutate({
      academy_name: academyName.trim(),
      admin_first_name: adminFirstName.trim(),
      admin_last_name: adminLastName.trim(),
      email: email.trim().toLowerCase(),
      password,
    });
  };

  return (
    <SafeAreaView nativeID="screens-auth-public-safe-area" style={styles.safeArea} testID="screens-auth-public-safe-area">
      <View nativeID="screens-auth-public-screen" style={styles.screen} testID="screens-auth-public-screen">
        <View
          nativeID="screens-auth-public-navbar"
          style={[
            styles.navbar,
            isMobile ? styles.navbarMobile : styles.navbarDesktop,
            { paddingHorizontal: width >= 1280 ? 32 : spacing.lg },
          ]}
          testID="screens-auth-public-navbar"
        >
          <View
            nativeID="screens-auth-public-navbar-inner"
            style={[
              styles.navbarInner,
              isMobile ? styles.navbarInnerMobile : null,
              { maxWidth: layoutWidth },
            ]}
            testID="screens-auth-public-navbar-inner"
          >
            <View nativeID="screens-auth-public-brand" style={styles.navbarBrand} testID="screens-auth-public-brand">
              <Pressable
                accessibilityRole="link"
                nativeID="screens-auth-public-home-link"
                onPress={() => navigateToPage("home")}
                style={styles.navbarLogoButton}
                testID="screens-auth-public-home-link"
              >
                <Image source={{ uri: logoPlaceholder }} style={styles.navbarLogo} />
              </Pressable>
              <View style={styles.navbarBrandCopy}>
                <Text style={styles.navbarBrandTitle}>ElDojo</Text>
                <Text style={styles.navbarBrandSubtitle}>Gestion simple para academias</Text>
              </View>
            </View>

            {!isMobile ? (
              <View style={styles.navbarLinks}>
                {SECTION_NAV_ITEMS.map((item) => {
                  const isActive = page === item.page;
                  return (
                    <Pressable
                      key={item.page}
                      accessibilityRole="link"
                      onPress={() => navigateToPage(item.page)}
                      style={({ pressed }) => [
                        styles.navbarLinkButton,
                        isActive ? styles.navbarLinkButtonActive : null,
                        pressed ? styles.navbarLinkPressed : null,
                      ]}
                    >
                      <Text style={[styles.navbarLinkLabel, isActive ? styles.navbarLinkLabelActive : null]}>{item.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            <View style={[styles.navbarAuthActions, isMobile ? styles.navbarAuthActionsMobile : null]}>
              <Pressable
                accessibilityRole="link"
                onPress={() => navigateToPage("createAccount")}
                style={({ pressed }) => [
                  styles.navbarAuthButton,
                  styles.navbarAuthButtonPrimary,
                  isMobile ? styles.navbarAuthButtonMobile : null,
                  page === "createAccount" ? styles.navbarLinkButtonActive : null,
                  pressed ? styles.navbarLinkPressed : null,
                ]}
              >
                <Text style={[styles.navbarAuthButtonLabel, styles.navbarAuthButtonLabelPrimary]}>Crear cuenta</Text>
              </Pressable>
              <Pressable
                accessibilityRole="link"
                onPress={() => navigateToPage("signIn")}
                style={({ pressed }) => [
                  styles.navbarAuthButton,
                  styles.navbarAuthButtonSecondary,
                  isMobile ? styles.navbarAuthButtonMobile : null,
                  page === "signIn" ? styles.navbarLinkButtonActive : null,
                  pressed ? styles.navbarLinkPressed : null,
                ]}
              >
                <Text style={styles.navbarAuthButtonLabel}>Iniciar sesion</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.mainScroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          nativeID="screens-auth-public-scroll-view"
          showsVerticalScrollIndicator={false}
          testID="screens-auth-public-scroll-view"
        >
          <View
            nativeID="screens-auth-public-hero-section"
            style={[
              styles.heroSection,
              isMobile ? styles.heroSectionMobile : null,
              { minHeight: heroHeight, paddingTop: isDesktop ? 120 : isTablet ? 112 : spacing.xl },
            ]}
            testID="screens-auth-public-hero-section"
          >
            <View style={styles.heroMedia}>
              <Image resizeMode="stretch" source={heroBackground} style={styles.heroSectionImage} />
            </View>
            <View style={styles.heroBackgroundOverlay} />
            <View
              style={[
                styles.heroContent,
                isMobile ? styles.heroContentMobile : null,
                { maxWidth: isAuthPage ? layoutWidth : 860 },
                isDesktop && !isAuthPage ? styles.heroContentDesktop : null,
              ]}
            >
              <View style={[styles.heroCopy, isMobile ? styles.heroCopyMobile : null, isAuthPage ? styles.heroCopyAuth : null]}>
                <Text style={styles.heroEyebrow}>{content.eyebrow}</Text>
                <Text style={[styles.heroTitle, isMobile ? styles.heroTitleMobile : null]}>{content.title}</Text>
                <Text style={[styles.heroDescription, isMobile ? styles.heroDescriptionMobile : null]}>{content.description}</Text>

                {page === "home" ? (
                  <View style={styles.heroHighlights}>
                    {HOME_HIGHLIGHTS.map((item, index) => (
                      <View key={item} style={styles.heroHighlightItem}>
                        <View style={styles.heroHighlightDot} />
                        <Text style={styles.heroHighlightText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {!isAuthPage ? (
                  <View style={styles.heroActions}>
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

                {isMobile ? (
                  <ScrollView contentContainerStyle={styles.mobileSectionNavContent} horizontal showsHorizontalScrollIndicator={false}>
                    {SECTION_NAV_ITEMS.map((item) => {
                      const isActive = page === item.page;
                      return (
                        <Pressable
                          key={item.page}
                          accessibilityRole="link"
                          onPress={() => navigateToPage(item.page)}
                          style={({ pressed }) => [
                            styles.mobileSectionChip,
                            isActive ? styles.mobileSectionChipActive : null,
                            pressed ? styles.mobileSectionChipPressed : null,
                          ]}
                        >
                          <Text style={styles.mobileSectionChipLabel}>{item.label}</Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                ) : null}
              </View>

              {isAuthPage ? (
                <AppCard
                  nativeID="screens-auth-public-form-card"
                  style={[
                    styles.formCard,
                    isDesktop ? styles.formCardDesktop : null,
                    isMobile ? styles.formCardMobile : null,
                  ]}
                  testID="screens-auth-public-form-card"
                >
                  <View style={styles.tabs}>
                    <Pressable
                      accessibilityRole="link"
                      onPress={() => navigateToPage("createAccount")}
                      style={({ pressed }) => [
                        styles.tabButton,
                        mode === "academy" ? styles.tabButtonActive : null,
                        pressed ? styles.tabButtonPressed : null,
                      ]}
                    >
                      <Text style={[styles.tabLabel, mode === "academy" ? styles.tabLabelActive : null]}>Crear cuenta</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="link"
                      onPress={() => navigateToPage("signIn")}
                      style={({ pressed }) => [
                        styles.tabButton,
                        mode === "login" ? styles.tabButtonActive : null,
                        pressed ? styles.tabButtonPressed : null,
                      ]}
                    >
                      <Text style={[styles.tabLabel, mode === "login" ? styles.tabLabelActive : null]}>Iniciar sesion</Text>
                    </Pressable>
                  </View>

                  {mode === "academy" ? (
                    <>
                      <Text style={styles.formTitle}>Abre tu academia</Text>
                      <Text style={styles.formSubtitle}>
                        Registra tu academia y crea la cuenta administradora principal para empezar a operar hoy mismo.
                      </Text>
                      <AppInput label="Academia" onChangeText={setAcademyName} placeholder="Union MMA" value={academyName} />
                      <AppInput label="Nombre" onChangeText={setAdminFirstName} placeholder="Tu nombre" value={adminFirstName} />
                      <AppInput label="Apellidos" onChangeText={setAdminLastName} placeholder="Tus apellidos" value={adminLastName} />
                      <AppInput
                        autoCapitalize="none"
                        autoComplete="email"
                        keyboardType="email-address"
                        label="Correo"
                        onChangeText={setEmail}
                        placeholder="admin@tuacademia.com"
                        value={email}
                      />
                      <AppInput
                        autoComplete="new-password"
                        label="Contrasena"
                        onChangeText={setPassword}
                        placeholder="Crea una contraseña"
                        rightAdornment={
                          <Pressable
                            accessibilityLabel={showRegisterPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
                            accessibilityRole="button"
                            onPress={() => setShowRegisterPassword((current) => !current)}
                            style={({ pressed }) => [styles.passwordToggle, pressed ? styles.passwordTogglePressed : null]}
                          >
                            <Feather color={colors.textMuted} name={showRegisterPassword ? "eye-off" : "eye"} size={18} />
                          </Pressable>
                        }
                        secureTextEntry={!showRegisterPassword}
                        value={password}
                      />
                      <Text style={styles.helper}>El sufijo interno de la academia se genera con las primeras tres letras utiles del nombre.</Text>
                      {formError ? <Text style={styles.error}>{formError}</Text> : null}
                      <AppButton label="Crear academia" loading={registerMutation.isPending} onPress={handleAcademySubmit} />
                    </>
                  ) : (
                    <>
                      <Text style={styles.formTitle}>Bienvenido de vuelta</Text>
                      <Text style={styles.formSubtitle}>
                        Inicia sesion con la cuenta administradora de tu academia para entrar al panel operativo.
                      </Text>
                      <AppInput
                        autoCapitalize="none"
                        autoComplete="email"
                        keyboardType="email-address"
                        label="Correo"
                        onChangeText={setEmail}
                        placeholder="admin@tuacademia.com"
                        value={email}
                      />
                      <AppInput
                        autoComplete="password"
                        label="Contrasena"
                        onChangeText={setPassword}
                        placeholder="Tu contraseña"
                        rightAdornment={
                          <Pressable
                            accessibilityLabel={showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
                            accessibilityRole="button"
                            onPress={() => setShowPassword((current) => !current)}
                            style={({ pressed }) => [styles.passwordToggle, pressed ? styles.passwordTogglePressed : null]}
                          >
                            <Feather color={colors.textMuted} name={showPassword ? "eye-off" : "eye"} size={18} />
                          </Pressable>
                        }
                        secureTextEntry={!showPassword}
                        value={password}
                      />
                      {formError ? <Text style={styles.error}>{formError}</Text> : null}
                      <AppButton label="Entrar" loading={loginMutation.isPending} onPress={handleLoginSubmit} />
                    </>
                  )}
                </AppCard>
              ) : null}
            </View>
          </View>

          <View style={[styles.pageContent, { maxWidth: layoutWidth }]}>
            {PAGE_SECTIONS[page].includes("about") ? renderAboutSection(isDesktop) : null}
            {PAGE_SECTIONS[page].includes("events")
              ? renderEventsSection(showcaseCardWidth, (item) => setSelectedShowcaseItem(item))
              : null}
            {PAGE_SECTIONS[page].includes("stores")
              ? renderStoresSection(isDesktop, isTablet, storeCardWidthStyle, (item) => setSelectedShowcaseItem(item))
              : null}

            <AppCard style={styles.ctaCard}>
              <Text style={styles.ctaEyebrow}>Listo para probar</Text>
              <Text style={styles.ctaTitle}>Cada seccion importante ya tiene su propia URL publica.</Text>
              <Text style={styles.ctaDescription}>
                Ahora puedes compartir rutas limpias como home, crear cuenta, eventos o tiendas y dar una base mejor al SEO de la parte publica.
              </Text>
              <View style={styles.heroActions}>
                <AppButton label="Crear cuenta" onPress={() => navigateToPage("createAccount")} />
                <AppButton label="Ir a home" onPress={() => navigateToPage("home")} variant="secondary" />
              </View>
            </AppCard>

            <View nativeID="screens-auth-public-footer" style={styles.footerShell} testID="screens-auth-public-footer">
              <View style={[styles.footerInner, { maxWidth: layoutWidth }]}>
                <View style={[styles.footerTop, isDesktop ? styles.footerTopDesktop : null]}>
                  <View style={styles.footerBrandBlock}>
                    <Text style={styles.footerBrandTitle}>ElDojo</Text>
                    <Text style={styles.footerCredit}>Diseñado por rais.com</Text>
                  </View>

                  <View style={[styles.footerContent, isDesktop ? styles.footerContentDesktop : null]}>
                    <View style={styles.footerBlock}>
                      <Text style={styles.footerTitle}>Rutas publicas</Text>
                      <Pressable accessibilityRole="link" onPress={() => navigateToPage("home")}><Text style={styles.footerText}>{PUBLIC_PAGE_META.home.path}</Text></Pressable>
                      <Pressable accessibilityRole="link" onPress={() => navigateToPage("createAccount")}><Text style={styles.footerText}>{PUBLIC_PAGE_META.createAccount.path}</Text></Pressable>
                      <Pressable accessibilityRole="link" onPress={() => navigateToPage("signIn")}><Text style={styles.footerText}>{PUBLIC_PAGE_META.signIn.path}</Text></Pressable>
                    </View>
                    <View style={styles.footerBlock}>
                      <Text style={styles.footerTitle}>Contacto</Text>
                      <Text style={styles.footerText}>hola@eldojo.tech</Text>
                      <Text style={styles.footerText}>+52 81 0000 0000</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        <AppModal
          description={selectedShowcaseItem?.title}
          nativeID="screens-auth-public-showcase-modal"
          onClose={() => setSelectedShowcaseItem(null)}
          testID="screens-auth-public-showcase-modal"
          title={selectedShowcaseItem?.title ?? "Vista previa"}
          visible={Boolean(selectedShowcaseItem)}
        >
          {selectedShowcaseItem ? <Image source={{ uri: selectedShowcaseItem.image }} style={styles.modalImage} /> : null}
        </AppModal>
      </View>
    </SafeAreaView>
  );
}

export function HomeScreen() {
  return <PublicSiteScreen page="home" />;
}

export function AboutScreen() {
  return <PublicSiteScreen page="about" />;
}

export function EventsScreen() {
  return <PublicSiteScreen page="events" />;
}

export function StoresScreen() {
  return <PublicSiteScreen page="stores" />;
}

export function CreateAccountScreen() {
  return <PublicSiteScreen page="createAccount" />;
}

export function SignInScreen() {
  return <PublicSiteScreen page="signIn" />;
}

const styles = StyleSheet.create({
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
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: spacing.sm,
  },
  navbarLinkButtonActive: {
    backgroundColor: "rgba(255, 255, 255, 0.14)",
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
    color: colors.primarySoft,
  },
  navbarAuthActions: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "flex-end",
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
    backgroundColor: colors.primarySoft,
    borderColor: colors.primarySoft,
  },
  navbarAuthButtonSecondary: {
    backgroundColor: "transparent",
    borderColor: "rgba(255, 255, 255, 0.28)",
  },
  navbarAuthButtonLabel: {
    color: colors.onPrimary,
    fontFamily: typography.headingFamily,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  navbarAuthButtonLabelPrimary: {
    color: colors.text,
  },
  mainScroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
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
  formCard: {
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    gap: spacing.lg,
    maxWidth: 520,
  },
  formCardMobile: {
    maxWidth: "100%",
    width: "100%",
  },
  formCardDesktop: {
    marginLeft: "auto",
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
    minHeight: 44,
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
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  formSubtitle: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 22,
  },
  helper: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
    lineHeight: 18,
  },
  error: {
    color: colors.danger,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
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
  stackedSection: {
    alignSelf: "stretch",
    gap: spacing.lg,
    width: "100%",
  },
  eventsCarousel: {
    gap: spacing.md,
    paddingRight: spacing.lg,
  },
  cardPressable: {
    borderRadius: radius.lg,
  },
  showcaseCard: {
    borderRadius: radius.lg,
  },
  showcaseCardPressed: {
    opacity: 0.88,
  },
  marketingCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    gap: 0,
    overflow: "hidden",
    padding: 0,
  },
  cardBody: {
    gap: spacing.xs,
    padding: spacing.md,
  },
  cardEyebrow: {
    color: colors.primary,
    fontFamily: typography.headingFamily,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  cardCaption: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 20,
  },
  showcaseImage: {
    height: 340,
    width: "100%",
  },
  showcaseTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 16,
    fontWeight: "700",
  },
  storeGrid: {
    alignItems: "stretch",
    gap: spacing.md,
    width: "100%",
  },
  storeGridDesktop: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  storeGridTablet: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  storeGridMobile: {
    flexDirection: "column",
  },
  storeCard: {
    borderRadius: radius.md,
  },
  storeImage: {
    height: 180,
    width: "100%",
  },
  storeTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 15,
    fontWeight: "700",
  },
  ctaCard: {
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  ctaEyebrow: {
    color: colors.primary,
    fontFamily: typography.headingFamily,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  ctaTitle: {
    color: colors.text,
    fontFamily: typography.displayFamily,
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 34,
  },
  ctaDescription: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 15,
    lineHeight: 24,
  },
  footerShell: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  footerInner: {
    alignSelf: "center",
    width: "100%",
  },
  footerTop: {
    gap: spacing.lg,
    paddingVertical: spacing.lg,
  },
  footerTopDesktop: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerBrandBlock: {
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
    justifyContent: "flex-end",
  },
  footerBlock: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 180,
  },
  footerTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  footerText: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 20,
  },
  modalImage: {
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 460,
    width: "100%",
  },
});
