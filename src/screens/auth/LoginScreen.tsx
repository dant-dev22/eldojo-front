import { Feather } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  DimensionValue,
  Image,
  LayoutChangeEvent,
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
import { LogoSvg } from "@/components/LogoSvg";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";

type AuthMode = "login" | "academy";
type SectionKey = "events" | "about" | "stores";

type ShowcaseItem = {
  id: string;
  title: string;
  image: string;
};

function buildWebsiteImage(prompt: string, imageSize: string): string {
  return `https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=${encodeURIComponent(prompt)}&image_size=${imageSize}`;
}

const logoPlaceholder = buildWebsiteImage(
  "minimal premium martial arts brand logo mark on light cream background, circular emblem, elegant typography, high contrast, website header asset",
  "square"
);

const heroBackground = require("../../img/fondos.jpg");

const HERO_IMAGE_MAX_WIDTH = 1280;
const HERO_IMAGE_OFFSET_Y = 0;

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

const SECTION_ITEMS: Array<{ key: SectionKey; label: string }> = [
  { key: "events", label: "Eventos" },
  { key: "about", label: "Acerca" },
  { key: "stores", label: "Tiendas" },
];

const HERO_HIGHLIGHTS = [
  "Controla alumnos, pagos y asistencia en una sola vista.",
  "Arranca rapido desde celular sin perder legibilidad.",
  "Configura tu academia y entra al panel en pocos pasos.",
];

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
    return "El nombre de la academia debe tener al menos 3 letras útiles.";
  }

  if (normalized.includes("no existe una cuenta con ese correo")) {
    return "No existe una cuenta con ese correo.";
  }

  if (normalized.includes("la contraseña no es correcta")) {
    return "La contraseña no es correcta.";
  }

  return message.endsWith(".") ? message : `${message}.`;
}

export function LoginScreen() {
  const { signIn, registerAcademy } = useAuth();
  const { contentMaxWidth, isDesktop, isMobile, isTablet, width } = useResponsiveLayout();
  const scrollRef = useRef<ScrollView>(null);
  const [mode, setMode] = useState<AuthMode>("login");
  const [isAuthVisible, setIsAuthVisible] = useState(false);
  const [selectedShowcaseItem, setSelectedShowcaseItem] = useState<ShowcaseItem | null>(null);
  const [sectionOffsets, setSectionOffsets] = useState<Record<SectionKey, number>>({
    about: 0,
    events: 0,
    stores: 0,
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [academyName, setAcademyName] = useState("");
  const [adminFirstName, setAdminFirstName] = useState("");
  const [adminLastName, setAdminLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isMobileMenuVisible, setIsMobileMenuVisible] = useState(false);

  const loginMutation = useMutation({
    mutationFn: signIn,
    onError: (error) => setFormError(formatAuthError(error)),
  });

  const registerMutation = useMutation({
    mutationFn: registerAcademy,
    onError: (error) => setFormError(formatAuthError(error)),
  });

  const handleModeChange = (nextMode: AuthMode) => {
    setMode(nextMode);
    setFormError(null);
    setIsAuthVisible(true);
  };

  useEffect(() => {
    if (!isMobile) {
      setIsMobileMenuVisible(false);
    }
  }, [isMobile]);

  const heroHeight = useMemo(() => {
    if (isDesktop) {
      return 760;
    }

    if (isTablet) {
      return 700;
    }

    return isAuthVisible ? 820 : 720;
  }, [isAuthVisible, isDesktop, isTablet]);

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

  const registerSectionOffset = (section: SectionKey) => (event: LayoutChangeEvent) => {
    setSectionOffsets((current) => ({
      ...current,
      [section]: event.nativeEvent.layout.y,
    }));
  };

  const scrollToSection = (section: SectionKey) => {
    scrollRef.current?.scrollTo({
      animated: true,
      y: Math.max(sectionOffsets[section] - 96, 0),
    });
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
      setFormError("El nombre de la academia debe tener al menos 3 letras útiles.");
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
    <SafeAreaView
      nativeID="screens-auth-login-screen-safe-area"
      style={styles.safeArea}
      testID="screens-auth-login-screen-safe-area"
    >
      <View
        nativeID="screens-auth-login-screen"
        style={styles.screen}
        testID="screens-auth-login-screen"
      >
        <View
          nativeID="screens-auth-login-navbar"
          style={[
            styles.navbar,
            isMobile ? styles.navbarMobile : styles.navbarDesktop,
            { paddingHorizontal: width >= 1280 ? 32 : spacing.lg },
          ]}
          testID="screens-auth-login-navbar"
        >
          <View
            nativeID="screens-auth-login-navbar-inner"
            style={[
              styles.navbarInner,
              isMobile ? styles.navbarInnerMobile : null,
              { maxWidth: layoutWidth },
            ]}
            testID="screens-auth-login-navbar-inner"
          >
            <View nativeID="screens-auth-login-navbar-brand" style={styles.navbarBrand} testID="screens-auth-login-navbar-brand">
              <Pressable
                accessibilityRole="button"
                nativeID="screens-auth-login-navbar-logo-button"
                onPress={() => scrollRef.current?.scrollTo({ animated: true, y: 0 })}
                style={styles.navbarLogoButton}
                testID="screens-auth-login-navbar-logo-button"
              >
                <View
                  nativeID="screens-auth-login-navbar-logo-image"
                  style={styles.navbarLogo}
                  testID="screens-auth-login-navbar-logo-image"
                >
                  <LogoSvg size={52} variant="primary" />
                </View>
              </Pressable>
              <View nativeID="screens-auth-login-navbar-brand-copy" style={styles.navbarBrandCopy} testID="screens-auth-login-navbar-brand-copy">
                <Text nativeID="screens-auth-login-navbar-brand-title" style={styles.navbarBrandTitle} testID="screens-auth-login-navbar-brand-title">
                  ElDojo
                </Text>
                <Text nativeID="screens-auth-login-navbar-brand-subtitle" style={styles.navbarBrandSubtitle} testID="screens-auth-login-navbar-brand-subtitle">
                  Gestion simple para academias
                </Text>
              </View>
            </View>

            {!isMobile ? (
              <View nativeID="screens-auth-login-navbar-links" style={styles.navbarLinks} testID="screens-auth-login-navbar-links">
                {SECTION_ITEMS.map((item) => (
                  <Pressable
                    key={item.key}
                    accessibilityRole="button"
                    nativeID={`screens-auth-login-navbar-link-${item.key}`}
                    onPress={() => scrollToSection(item.key)}
                    style={({ pressed }) => [styles.navbarLinkButton, pressed ? styles.navbarLinkPressed : null]}
                    testID={`screens-auth-login-navbar-link-${item.key}`}
                  >
                    <Text
                      nativeID={`screens-auth-login-navbar-link-${item.key}-label`}
                      style={styles.navbarLinkLabel}
                      testID={`screens-auth-login-navbar-link-${item.key}-label`}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {!isMobile ? (
              <View
                nativeID="screens-auth-login-navbar-auth-actions"
                style={styles.navbarAuthActions}
                testID="screens-auth-login-navbar-auth-actions"
              >
                <Pressable
                  accessibilityRole="button"
                  nativeID="screens-auth-login-navbar-register-button"
                  onPress={() => handleModeChange("academy")}
                  style={({ pressed }) => [
                    styles.navbarAuthButton,
                    styles.navbarAuthButtonPrimary,
                    pressed ? styles.navbarLinkPressed : null,
                  ]}
                  testID="screens-auth-login-navbar-register-button"
                >
                  <Text
                    nativeID="screens-auth-login-navbar-register-label"
                    style={[styles.navbarAuthButtonLabel, styles.navbarAuthButtonLabelPrimary]}
                    testID="screens-auth-login-navbar-register-label"
                  >
                    Crear cuenta
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  nativeID="screens-auth-login-navbar-login-button"
                  onPress={() => handleModeChange("login")}
                  style={({ pressed }) => [
                    styles.navbarAuthButton,
                    styles.navbarAuthButtonSecondary,
                    pressed ? styles.navbarLinkPressed : null,
                  ]}
                  testID="screens-auth-login-navbar-login-button"
                >
                  <Text
                    nativeID="screens-auth-login-navbar-login-label"
                    style={styles.navbarAuthButtonLabel}
                    testID="screens-auth-login-navbar-login-label"
                  >
                    Iniciar sesion
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                accessibilityLabel="Abrir menu"
                accessibilityRole="button"
                nativeID="screens-auth-login-mobile-menu-trigger"
                onPress={() => setIsMobileMenuVisible(true)}
                style={({ pressed }) => [styles.mobileMenuTrigger, pressed ? styles.navbarLinkPressed : null]}
                testID="screens-auth-login-mobile-menu-trigger"
              >
                <Feather color={colors.text} name="menu" size={18} />
              </Pressable>
            )}
          </View>
        </View>

        <ScrollView
          style={styles.mainScroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          nativeID="screens-auth-login-scroll-view"
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          testID="screens-auth-login-scroll-view"
        >
          <View
            nativeID="screens-auth-login-hero-section"
            style={[
              styles.heroSection,
              isMobile ? styles.heroSectionMobile : null,
              { minHeight: heroHeight, paddingTop: isDesktop ? 120 : isTablet ? 112 : spacing.xl },
            ]}
            testID="screens-auth-login-hero-section"
          >
            <View nativeID="screens-auth-login-hero-media" style={styles.heroMedia} testID="screens-auth-login-hero-media">
              <Image
                nativeID="screens-auth-login-hero-image"
                resizeMode="stretch"
                source={heroBackground}
                style={[
                  styles.heroSectionImage,
                  {
                    maxWidth: HERO_IMAGE_MAX_WIDTH,
                    transform: [{ translateY: HERO_IMAGE_OFFSET_Y }],
                  },
                ]}
                testID="screens-auth-login-hero-image"
              />
            </View>
            <View nativeID="screens-auth-login-hero-background-overlay" style={styles.heroBackgroundOverlay} testID="screens-auth-login-hero-background-overlay" />
            <View
              nativeID="screens-auth-login-hero-content"
              style={[
                styles.heroContent,
                isMobile ? styles.heroContentMobile : null,
                { maxWidth: isAuthVisible ? 560 : layoutWidth },
                isDesktop && !isAuthVisible ? styles.heroContentDesktop : null,
                isAuthVisible ? styles.heroContentAuth : null,
              ]}
              testID="screens-auth-login-hero-content"
            >
              {!isAuthVisible ? (
                <View
                  nativeID="screens-auth-login-hero-copy"
                  style={[styles.heroCopy, isMobile ? styles.heroCopyMobile : null]}
                  testID="screens-auth-login-hero-copy"
                >
                  <Text nativeID="screens-auth-login-hero-eyebrow" style={styles.heroEyebrow} testID="screens-auth-login-hero-eyebrow">
                    
                    Software de administracion
                  </Text>
                  <Text
                    nativeID="screens-auth-login-hero-title"
                    style={[styles.heroTitle, isMobile ? styles.heroTitleMobile : null]}
                    testID="screens-auth-login-hero-title"
                  >
                    La administracion de un club de pelea nunca fue tan sencilla.
                  </Text>
                  <Text
                    nativeID="screens-auth-login-hero-description"
                    style={[styles.heroDescription, isMobile ? styles.heroDescriptionMobile : null]}
                    testID="screens-auth-login-hero-description"
                  >
                    Centraliza alumnos, clases, pagos, sucursales y asistencia en una sola plataforma lista para la operacion diaria.
                  </Text>

                  <View nativeID="screens-auth-login-hero-highlights" style={styles.heroHighlights} testID="screens-auth-login-hero-highlights">
                    {HERO_HIGHLIGHTS.map((item, index) => (
                      <View
                        key={item}
                        nativeID={`screens-auth-login-hero-highlight-${index + 1}`}
                        style={styles.heroHighlightItem}
                        testID={`screens-auth-login-hero-highlight-${index + 1}`}
                      >
                        <View
                          nativeID={`screens-auth-login-hero-highlight-dot-${index + 1}`}
                          style={styles.heroHighlightDot}
                          testID={`screens-auth-login-hero-highlight-dot-${index + 1}`}
                        />
                        <Text
                          nativeID={`screens-auth-login-hero-highlight-text-${index + 1}`}
                          style={styles.heroHighlightText}
                          testID={`screens-auth-login-hero-highlight-text-${index + 1}`}
                        >
                          {item}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <View nativeID="screens-auth-login-hero-actions" style={styles.heroActions} testID="screens-auth-login-hero-actions">
                    <AppButton
                      label="Crear una cuenta"
                      nativeID="screens-auth-login-open-register-button"
                      onPress={() => handleModeChange("academy")}
                      testID="screens-auth-login-open-register-button"
                    />
                    <AppButton
                      label="Iniciar sesion"
                      nativeID="screens-auth-login-open-login-button"
                      onPress={() => handleModeChange("login")}
                      testID="screens-auth-login-open-login-button"
                      variant="secondary"
                    />
                  </View>

                  {isMobile ? (
                    <ScrollView
                      contentContainerStyle={styles.mobileSectionNavContent}
                      horizontal
                      nativeID="screens-auth-login-mobile-section-nav"
                      showsHorizontalScrollIndicator={false}
                      testID="screens-auth-login-mobile-section-nav"
                    >
                      {SECTION_ITEMS.map((item) => (
                        <Pressable
                          key={item.key}
                          accessibilityRole="button"
                          nativeID={`screens-auth-login-mobile-section-chip-${item.key}`}
                          onPress={() => scrollToSection(item.key)}
                          style={({ pressed }) => [
                            styles.mobileSectionChip,
                            pressed ? styles.mobileSectionChipPressed : null,
                          ]}
                          testID={`screens-auth-login-mobile-section-chip-${item.key}`}
                        >
                          <Text
                            nativeID={`screens-auth-login-mobile-section-chip-${item.key}-label`}
                            style={styles.mobileSectionChipLabel}
                            testID={`screens-auth-login-mobile-section-chip-${item.key}-label`}
                          >
                            {item.label}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  ) : null}
                </View>
              ) : null}

              {isAuthVisible ? (
                <AppCard
                  nativeID="screens-auth-login-form-card"
                  style={[
                    styles.formCard,
                    isDesktop ? styles.formCardDesktop : null,
                    isMobile ? styles.formCardMobile : null,
                  ]}
                  testID="screens-auth-login-form-card"
                >
                  <View nativeID="screens-auth-login-mode-tabs" style={styles.tabs} testID="screens-auth-login-mode-tabs">
                    <Pressable
                      accessibilityRole="button"
                      nativeID="screens-auth-login-mode-academy-button"
                      onPress={() => handleModeChange("academy")}
                      style={({ pressed }) => [
                        styles.tabButton,
                        mode === "academy" ? styles.tabButtonActive : null,
                        pressed ? styles.tabButtonPressed : null,
                      ]}
                      testID="screens-auth-login-mode-academy-button"
                    >
                      <Text nativeID="screens-auth-login-mode-academy-label" style={[styles.tabLabel, mode === "academy" ? styles.tabLabelActive : null]} testID="screens-auth-login-mode-academy-label">
                        Crear cuenta
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      nativeID="screens-auth-login-mode-signin-button"
                      onPress={() => handleModeChange("login")}
                      style={({ pressed }) => [
                        styles.tabButton,
                        mode === "login" ? styles.tabButtonActive : null,
                        pressed ? styles.tabButtonPressed : null,
                      ]}
                      testID="screens-auth-login-mode-signin-button"
                    >
                      <Text nativeID="screens-auth-login-mode-signin-label" style={[styles.tabLabel, mode === "login" ? styles.tabLabelActive : null]} testID="screens-auth-login-mode-signin-label">
                        Iniciar sesion
                      </Text>
                    </Pressable>
                  </View>

                  {mode === "academy" ? (
                    <>
                      <Text nativeID="screens-auth-login-register-form-title" style={styles.formTitle} testID="screens-auth-login-register-form-title">Registra tu academia</Text>
                      <Text nativeID="screens-auth-login-register-form-subtitle" style={styles.formSubtitle} testID="screens-auth-login-register-form-subtitle">
                        Registra tu academia y crea la cuenta para administrarla hoy mismo.
                      </Text>
                      <AppInput
                        label="Academia"
                        nativeID="screens-auth-login-academy-name-input"
                        onChangeText={setAcademyName}
                        placeholder="Union MMA"
                        testID="screens-auth-login-academy-name-input"
                        value={academyName}
                      />
                      <AppInput
                        label="Nombre"
                        nativeID="screens-auth-login-admin-first-name-input"
                        onChangeText={setAdminFirstName}
                        placeholder="Tu nombre"
                        testID="screens-auth-login-admin-first-name-input"
                        value={adminFirstName}
                      />
                      <AppInput
                        label="Apellidos"
                        nativeID="screens-auth-login-admin-last-name-input"
                        onChangeText={setAdminLastName}
                        placeholder="Tus apellidos"
                        testID="screens-auth-login-admin-last-name-input"
                        value={adminLastName}
                      />
                      <AppInput
                        autoCapitalize="none"
                        autoComplete="email"
                        keyboardType="email-address"
                        label="Correo"
                        nativeID="screens-auth-login-register-email-input"
                        onChangeText={setEmail}
                        placeholder="admin@tuacademia.com"
                        testID="screens-auth-login-register-email-input"
                        value={email}
                      />
                      <AppInput
                        autoComplete="new-password"
                        label="Contrasena"
                        nativeID="screens-auth-login-register-password-input"
                        onChangeText={setPassword}
                        placeholder="Crea una contraseña"
                        rightAdornment={
                          <Pressable
                            accessibilityLabel={showRegisterPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
                            accessibilityRole="button"
                            nativeID="screens-auth-login-register-password-toggle"
                            onPress={() => setShowRegisterPassword((current) => !current)}
                            style={({ pressed }) => [styles.passwordToggle, pressed ? styles.passwordTogglePressed : null]}
                            testID="screens-auth-login-register-password-toggle"
                          >
                            <Feather
                              color={colors.textMuted}
                              name={showRegisterPassword ? "eye-off" : "eye"}
                              size={18}
                            />
                          </Pressable>
                        }
                        secureTextEntry={!showRegisterPassword}
                        testID="screens-auth-login-register-password-input"
                        value={password}
                      />
                      <Text nativeID="screens-auth-login-register-helper" style={styles.helper} testID="screens-auth-login-register-helper">
                        El sufijo interno de la academia se genera con las primeras tres letras utiles del nombre.
                      </Text>
                      {formError ? <Text nativeID="screens-auth-login-register-error" style={styles.error} testID="screens-auth-login-register-error">{formError}</Text> : null}
                      <AppButton
                        label="Crear academia"
                        loading={registerMutation.isPending}
                        nativeID="screens-auth-login-register-submit-button"
                        onPress={handleAcademySubmit}
                        testID="screens-auth-login-register-submit-button"
                      />
                    </>
                  ) : (
                    <>
                      <Text nativeID="screens-auth-login-signin-form-title" style={styles.formTitle} testID="screens-auth-login-signin-form-title">Bienvenido de vuelta</Text>
                      <Text nativeID="screens-auth-login-signin-form-subtitle" style={styles.formSubtitle} testID="screens-auth-login-signin-form-subtitle">
                        Inicia sesion con la cuenta administradora de tu academia para entrar al panel operativo.
                      </Text>
                      <AppInput
                        autoCapitalize="none"
                        autoComplete="email"
                        keyboardType="email-address"
                        label="Correo"
                        nativeID="screens-auth-login-email-input"
                        onChangeText={setEmail}
                        placeholder="admin@tuacademia.com"
                        testID="screens-auth-login-email-input"
                        value={email}
                      />
                      <AppInput
                        autoComplete="password"
                        label="Contrasena"
                        nativeID="screens-auth-login-password-input"
                        onChangeText={setPassword}
                        placeholder="Tu contraseña"
                        rightAdornment={
                          <Pressable
                            accessibilityLabel={showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
                            accessibilityRole="button"
                            nativeID="screens-auth-login-password-toggle"
                            onPress={() => setShowPassword((current) => !current)}
                            style={({ pressed }) => [styles.passwordToggle, pressed ? styles.passwordTogglePressed : null]}
                            testID="screens-auth-login-password-toggle"
                          >
                            <Feather
                              color={colors.textMuted}
                              name={showPassword ? "eye-off" : "eye"}
                              size={18}
                            />
                          </Pressable>
                        }
                        secureTextEntry={!showPassword}
                        testID="screens-auth-login-password-input"
                        value={password}
                      />
                      {formError ? <Text nativeID="screens-auth-login-signin-error" style={styles.error} testID="screens-auth-login-signin-error">{formError}</Text> : null}
                      <AppButton
                        label="Entrar"
                        loading={loginMutation.isPending}
                        nativeID="screens-auth-login-submit-button"
                        onPress={handleLoginSubmit}
                        testID="screens-auth-login-submit-button"
                      />
                    </>
                  )}
                </AppCard>
              ) : null}
            </View>
          </View>

          <View
            nativeID="screens-auth-login-page-content"
            style={[styles.pageContent, { maxWidth: layoutWidth }]}
            testID="screens-auth-login-page-content"
          >
            <View
              nativeID="screens-auth-login-about-section"
              onLayout={registerSectionOffset("about")}
              style={[styles.infoSection, isDesktop ? styles.infoSectionDesktop : null]}
              testID="screens-auth-login-about-section"
            >
              <Image
                nativeID="screens-auth-login-about-image"
                source={{ uri: aboutImage }}
                style={[styles.sectionImage, isDesktop ? styles.sectionImageDesktop : null]}
                testID="screens-auth-login-about-image"
              />
              <View nativeID="screens-auth-login-about-copy" style={styles.aboutCopy} testID="screens-auth-login-about-copy">
                <Text nativeID="screens-auth-login-about-eyebrow" style={styles.sectionEyebrow} testID="screens-auth-login-about-eyebrow">
                  Acerca de nosotros
                </Text>
                <Text
                  nativeID="screens-auth-login-about-title"
                  style={styles.sectionTitle}
                  testID="screens-auth-login-about-title"
                >
                  Menos caos operativo, mas tiempo en el tatami.
                </Text>
                <Text
                  nativeID="screens-auth-login-about-description"
                  style={styles.sectionDescription}
                  testID="screens-auth-login-about-description"
                >
                  ElDojo ayuda a duenos de academias de MMA, BJJ y judo a ordenar su operacion diaria sin hojas sueltas ni mensajes perdidos. Lleva control de alumnos, pagos, asistencia, clases y sucursales desde una interfaz clara para recepcion, coordinacion y direccion.
                </Text>
                <View nativeID="screens-auth-login-about-highlights" style={styles.highlightsList} testID="screens-auth-login-about-highlights">
                  {[
                    "Cobro y seguimiento de mensualidades en un solo lugar.",
                    "Control de asistencia y clases para todo tu equipo.",
                    "Panel limpio para operar sedes, alumnos y eventos.",
                  ].map((item, index) => (
                    <View
                      key={item}
                      nativeID={`screens-auth-login-about-highlight-${index + 1}`}
                      style={styles.highlightItem}
                      testID={`screens-auth-login-about-highlight-${index + 1}`}
                    >
                      <View
                        nativeID={`screens-auth-login-about-highlight-dot-${index + 1}`}
                        style={styles.highlightDot}
                        testID={`screens-auth-login-about-highlight-dot-${index + 1}`}
                      />
                      <Text
                        nativeID={`screens-auth-login-about-highlight-text-${index + 1}`}
                        style={styles.highlightText}
                        testID={`screens-auth-login-about-highlight-text-${index + 1}`}
                      >
                        {item}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            <View
              nativeID="screens-auth-login-events-section"
              onLayout={registerSectionOffset("events")}
              style={styles.stackedSection}
              testID="screens-auth-login-events-section"
            >
              <View nativeID="screens-auth-login-events-copy" style={styles.sectionCopyBlock} testID="screens-auth-login-events-copy">
                <Text nativeID="screens-auth-login-events-eyebrow" style={styles.sectionEyebrow} testID="screens-auth-login-events-eyebrow">
                  Eventos
                </Text>
                <Text nativeID="screens-auth-login-events-title" style={styles.sectionTitle} testID="screens-auth-login-events-title">
                  Proximos eventos de tu comunidad.
                </Text>
                <Text nativeID="screens-auth-login-events-description" style={styles.sectionDescription} testID="screens-auth-login-events-description">
                  Usa este espacio para destacar opens, seminarios y funciones proximas. Por ahora dejamos flyers placeholder listos para presentacion.
                </Text>
              </View>

              <ScrollView
                contentContainerStyle={styles.eventsCarousel}
                horizontal
                nativeID="screens-auth-login-events-carousel"
                showsHorizontalScrollIndicator={false}
                testID="screens-auth-login-events-carousel"
              >
                {eventFlyers.map((item) => (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    nativeID={`screens-auth-login-event-card-${item.id}`}
                    onPress={() => setSelectedShowcaseItem(item)}
                    style={({ pressed }) => [
                      styles.cardPressable,
                      styles.showcaseCard,
                      { width: showcaseCardWidth },
                      pressed ? styles.showcaseCardPressed : null,
                    ]}
                    testID={`screens-auth-login-event-card-${item.id}`}
                  >
                    <AppCard nativeID={`screens-auth-login-event-card-shell-${item.id}`} style={styles.marketingCard} testID={`screens-auth-login-event-card-shell-${item.id}`}>
                      <Image
                        nativeID={`screens-auth-login-event-image-${item.id}`}
                        source={{ uri: item.image }}
                        style={styles.showcaseImage}
                        testID={`screens-auth-login-event-image-${item.id}`}
                      />
                      <View nativeID={`screens-auth-login-event-body-${item.id}`} style={styles.cardBody} testID={`screens-auth-login-event-body-${item.id}`}>
                        <Text nativeID={`screens-auth-login-event-eyebrow-${item.id}`} style={styles.cardEyebrow} testID={`screens-auth-login-event-eyebrow-${item.id}`}>
                          Evento destacado
                        </Text>
                        <Text nativeID={`screens-auth-login-event-title-${item.id}`} style={styles.showcaseTitle} testID={`screens-auth-login-event-title-${item.id}`}>
                          {item.title}
                        </Text>
                        <Text nativeID={`screens-auth-login-event-caption-${item.id}`} style={styles.cardCaption} testID={`screens-auth-login-event-caption-${item.id}`}>
                          Vista previa con formato promocional y jerarquía visual estándar.
                        </Text>
                      </View>
                    </AppCard>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View
              nativeID="screens-auth-login-stores-section"
              onLayout={registerSectionOffset("stores")}
              style={styles.stackedSection}
              testID="screens-auth-login-stores-section"
            >
              <View nativeID="screens-auth-login-stores-copy" style={styles.sectionCopyBlock} testID="screens-auth-login-stores-copy">
                <Text nativeID="screens-auth-login-stores-eyebrow" style={styles.sectionEyebrow} testID="screens-auth-login-stores-eyebrow">
                  Tiendas
                </Text>
                <Text nativeID="screens-auth-login-stores-title" style={styles.sectionTitle} testID="screens-auth-login-stores-title">
                  Una vitrina simple para tus aliados comerciales.
                </Text>
                <Text nativeID="screens-auth-login-stores-description" style={styles.sectionDescription} testID="screens-auth-login-stores-description">
                  Aqui puedes mostrar patrocinadores, tiendas de equipo o espacios afiliados. Dejamos una matriz 3 x 3 con placeholders lista para reemplazar.
                </Text>
              </View>

              <View
                nativeID="screens-auth-login-stores-grid"
                style={[
                  styles.storeGrid,
                  isDesktop ? styles.storeGridDesktop : isTablet ? styles.storeGridTablet : styles.storeGridMobile,
                ]}
                testID="screens-auth-login-stores-grid"
              >
                {storeCards.map((item) => (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    nativeID={`screens-auth-login-store-card-${item.id}`}
                    onPress={() => setSelectedShowcaseItem(item)}
                    style={({ pressed }) => [styles.cardPressable, styles.storeCard, storeCardWidthStyle, pressed ? styles.showcaseCardPressed : null]}
                    testID={`screens-auth-login-store-card-${item.id}`}
                  >
                    <AppCard nativeID={`screens-auth-login-store-card-shell-${item.id}`} style={styles.marketingCard} testID={`screens-auth-login-store-card-shell-${item.id}`}>
                      <Image
                        nativeID={`screens-auth-login-store-image-${item.id}`}
                        source={{ uri: item.image }}
                        style={styles.storeImage}
                        testID={`screens-auth-login-store-image-${item.id}`}
                      />
                      <View nativeID={`screens-auth-login-store-body-${item.id}`} style={styles.cardBody} testID={`screens-auth-login-store-body-${item.id}`}>
                        <Text nativeID={`screens-auth-login-store-eyebrow-${item.id}`} style={styles.cardEyebrow} testID={`screens-auth-login-store-eyebrow-${item.id}`}>
                          Catálogo
                        </Text>
                        <Text nativeID={`screens-auth-login-store-title-${item.id}`} style={styles.storeTitle} testID={`screens-auth-login-store-title-${item.id}`}>
                          {item.title}
                        </Text>
                        <Text nativeID={`screens-auth-login-store-caption-${item.id}`} style={styles.cardCaption} testID={`screens-auth-login-store-caption-${item.id}`}>
                          Tarjeta limpia para producto, aliado o patrocinador.
                        </Text>
                      </View>
                    </AppCard>
                  </Pressable>
                ))}
              </View>
            </View>

            <View nativeID="screens-auth-login-footer" style={styles.footerShell} testID="screens-auth-login-footer">
              <View
                nativeID="screens-auth-login-footer-inner"
                style={[styles.footerInner, { maxWidth: layoutWidth }]}
                testID="screens-auth-login-footer-inner"
              >
                <View
                  nativeID="screens-auth-login-footer-top"
                  style={[styles.footerTop, isDesktop ? styles.footerTopDesktop : null]}
                  testID="screens-auth-login-footer-top"
                >
                  <View nativeID="screens-auth-login-footer-brand" style={styles.footerBrandBlock} testID="screens-auth-login-footer-brand">
                    <Text nativeID="screens-auth-login-footer-brand-title" style={styles.footerBrandTitle} testID="screens-auth-login-footer-brand-title">
                      ElDojo
                    </Text>
                    <Text nativeID="screens-auth-login-footer-credit" style={styles.footerCredit} testID="screens-auth-login-footer-credit">
                      Diseñado por rais.com
                    </Text>
                  </View>

                  <View
                    nativeID="screens-auth-login-footer-content"
                    style={[styles.footerContent, isDesktop ? styles.footerContentDesktop : null]}
                    testID="screens-auth-login-footer-content"
                  >
                    <View nativeID="screens-auth-login-footer-social" style={styles.footerBlock} testID="screens-auth-login-footer-social">
                      <Text nativeID="screens-auth-login-footer-social-title" style={styles.footerTitle} testID="screens-auth-login-footer-social-title">
                        Redes sociales
                      </Text>
                      <Text nativeID="screens-auth-login-footer-social-instagram" style={styles.footerText} testID="screens-auth-login-footer-social-instagram">
                        Instagram: @eldojo.tech
                      </Text>
                      <Text nativeID="screens-auth-login-footer-social-facebook" style={styles.footerText} testID="screens-auth-login-footer-social-facebook">
                        Facebook: ElDojo Tech
                      </Text>
                    </View>
                    <View nativeID="screens-auth-login-footer-contact" style={styles.footerBlock} testID="screens-auth-login-footer-contact">
                      <Text nativeID="screens-auth-login-footer-contact-title" style={styles.footerTitle} testID="screens-auth-login-footer-contact-title">
                        Contacto
                      </Text>
                      <Text nativeID="screens-auth-login-footer-contact-email" style={styles.footerText} testID="screens-auth-login-footer-contact-email">
                        hola@eldojo.tech
                      </Text>
                      <Text nativeID="screens-auth-login-footer-contact-phone" style={styles.footerText} testID="screens-auth-login-footer-contact-phone">
                        +52 81 0000 0000
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        <AppModal
          description="Navega entre las secciones publicas y accesos principales."
          nativeID="screens-auth-login-mobile-menu-modal"
          onClose={() => setIsMobileMenuVisible(false)}
          testID="screens-auth-login-mobile-menu-modal"
          title="Menu"
          visible={isMobileMenuVisible}
        >
          <View nativeID="screens-auth-login-mobile-menu-content" style={styles.mobileMenuContent} testID="screens-auth-login-mobile-menu-content">
            {SECTION_ITEMS.map((item) => (
              <AppButton
                key={item.key}
                label={item.label}
                nativeID={`screens-auth-login-mobile-menu-item-${item.key}`}
                onPress={() => {
                  setIsMobileMenuVisible(false);
                  scrollToSection(item.key);
                }}
                testID={`screens-auth-login-mobile-menu-item-${item.key}`}
                variant="secondary"
              />
            ))}
            <AppButton
              label="Crear cuenta"
              nativeID="screens-auth-login-mobile-menu-register-button"
              onPress={() => {
                setIsMobileMenuVisible(false);
                handleModeChange("academy");
              }}
              testID="screens-auth-login-mobile-menu-register-button"
            />
            <AppButton
              label="Iniciar sesion"
              nativeID="screens-auth-login-mobile-menu-signin-button"
              onPress={() => {
                setIsMobileMenuVisible(false);
                handleModeChange("login");
              }}
              testID="screens-auth-login-mobile-menu-signin-button"
              variant="secondary"
            />
          </View>
        </AppModal>

        <AppModal
          description={selectedShowcaseItem?.title}
          nativeID="screens-auth-login-showcase-modal"
          onClose={() => setSelectedShowcaseItem(null)}
          testID="screens-auth-login-showcase-modal"
          title={selectedShowcaseItem?.title ?? "Vista previa"}
          visible={Boolean(selectedShowcaseItem)}
        >
          {selectedShowcaseItem ? (
            <Image
              nativeID="screens-auth-login-showcase-modal-image"
              source={{ uri: selectedShowcaseItem.image }}
              style={styles.modalImage}
              testID="screens-auth-login-showcase-modal-image"
            />
          ) : null}
        </AppModal>
      </View>
    </SafeAreaView>
  );
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
  heroBackgroundOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(23, 22, 18, 0.38)",
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
    alignItems: "center",
    backgroundColor: "transparent",
    borderColor: "transparent",
    borderRadius: radius.md,
    borderWidth: 0,
    height: 56,
    justifyContent: "center",
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
  navbarLinkButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: spacing.xs,
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
  heroMedia: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    backgroundColor: "#E8DDC7",
    justifyContent: "flex-start",
    overflow: "hidden",
  },
  heroSectionMobile: {
    justifyContent: "flex-start",
    paddingBottom: spacing["2xl"],
  },
  heroSectionImage: {
    height: "100%",
    width: "100%",
  },
  heroContent: {
    alignSelf: "center",
    gap: spacing.xl,
    zIndex: 1,
    width: "100%",
  },
  heroContentMobile: {
    gap: spacing.lg,
  },
  heroContentAuth: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing["2xl"],
  },
  heroContentDesktop: {
    maxWidth: 860,
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
    maxWidth: 560,
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
    width: "100%",
  },
  tabs: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.borderStrong,
    borderWidth: 1,
    borderRadius: radius.pill,
    flexDirection: "row",
    gap: spacing.xs,
    padding: 6,
  },
  tabButton: {
    alignItems: "center",
    borderRadius: radius.pill,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    flex: 1,
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
  mobileSectionChipPressed: {
    opacity: 0.8,
  },
  mobileSectionChipLabel: {
    color: colors.onPrimary,
    fontFamily: typography.headingFamily,
    fontSize: 14,
    fontWeight: "700",
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
  showcaseCard: {
    borderRadius: radius.lg,
  },
  showcaseCardPressed: {
    opacity: 0.88,
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
  footerShell: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    marginTop: spacing["2xl"],
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
    flexDirection: "row",
    flex: 1,
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
