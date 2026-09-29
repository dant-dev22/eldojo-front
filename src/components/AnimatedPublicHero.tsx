import React, { useEffect, useState } from "react";
import { Platform, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { spacing, typography } from "../constants/theme";
import { LogoSvg } from "./LogoSvg";

export interface AnimatedPublicHeroProps {
  testID?: string;
}

function getWebClassNameProps(className?: string) {
  return Platform.OS === "web" && className ? ({ className } as { className: string }) : {};
}

export const AnimatedPublicHero: React.FC<AnimatedPublicHeroProps> = ({ testID }) => {
  const { width: viewportWidth } = useWindowDimensions();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const logoSize =
    viewportWidth < 400
      ? 110
      : viewportWidth < 520
      ? 130
      : viewportWidth < 768
      ? 160
      : viewportWidth < 1100
      ? 200
      : 240;

  const eyebrowSize =
    viewportWidth < 520 ? 11 : viewportWidth < 768 ? 12 : viewportWidth < 1100 ? 13 : 14;

  const headlineSize =
    viewportWidth < 400
      ? 32
      : viewportWidth < 520
      ? 38
      : viewportWidth < 768
      ? 46
      : viewportWidth < 1100
      ? 60
      : 76;

  const subheadSize =
    viewportWidth < 520 ? 15 : viewportWidth < 768 ? 17 : viewportWidth < 1100 ? 18 : 20;

  const headlineMaxWidth = viewportWidth < 768 ? viewportWidth - 2 * spacing.lg : 900;
  const subheadMaxWidth = viewportWidth < 768 ? viewportWidth - 2 * spacing.lg : 640;

  const motionWrap = Platform.OS === "web" && mounted;

  const webTransitionStyles: { logo: any; eyebrow: any; headline: any; subhead: any } = {
    logo: Platform.OS === "web"
      ? {
          transitionDuration: "520ms",
          transitionProperty: "opacity, transform",
          transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
          transitionDelay: "80ms",
        }
      : {},
    eyebrow: Platform.OS === "web"
      ? {
          transitionDuration: "560ms",
          transitionProperty: "opacity, transform",
          transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
          transitionDelay: "220ms",
        }
      : {},
    headline: Platform.OS === "web"
      ? {
          transitionDuration: "640ms",
          transitionProperty: "opacity, transform",
          transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
          transitionDelay: "360ms",
        }
      : {},
    subhead: Platform.OS === "web"
      ? {
          transitionDuration: "640ms",
          transitionProperty: "opacity, transform",
          transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
          transitionDelay: "500ms",
        }
      : {},
  };

  return (
    <View
      nativeID="screens-auth-public-hero-section"
      testID={testID || "screens-auth-public-animated-logo-hero"}
      style={styles.wrapper}
      accessibilityRole="image"
      accessibilityLabel="Logo El Dojo animado"
      {...getWebClassNameProps("screens-auth-public-animated-logo-hero")}
    >
      <View
        style={[
          styles.logoWrap,
          { width: logoSize, height: logoSize },
          webTransitionStyles.logo,
          motionWrap ? { opacity: 1, transform: [{ translateY: 0 }] } : { opacity: 0, transform: [{ translateY: 8 }] },
        ]}
        {...getWebClassNameProps("screens-auth-public-hero-logo-wrap")}
      >
        <LogoSvg
          size={logoSize}
          variant="brand-orange"
          animated
          loop={false}
          noSealGlow
          testID="screens-auth-public-hero-logo"
        />
      </View>

      <View
        style={[
          styles.eyebrowRow,
          webTransitionStyles.eyebrow,
          motionWrap ? { opacity: 1, transform: [{ translateY: 0 }] } : { opacity: 0, transform: [{ translateY: 6 }] },
        ]}
      >
        <View style={styles.eyebrowRule} />
        <Text
          style={[
            styles.eyebrow,
            {
              fontSize: eyebrowSize,
              letterSpacing: eyebrowSize * 0.22,
            },
          ]}
          {...getWebClassNameProps("screens-auth-public-hero-eyebrow")}
        >
          GESTIÓN DE ACADEMIAS · BJJ · MMA · JUDO
        </Text>
        <View style={styles.eyebrowRule} />
      </View>

      <Text
        style={[
          styles.headline,
          {
            fontSize: headlineSize,
            lineHeight: Math.ceil(headlineSize * 1.04),
            letterSpacing: Math.max(-0.6, headlineSize * -0.012),
            maxWidth: headlineMaxWidth,
          },
          webTransitionStyles.headline,
          motionWrap ? { opacity: 1, transform: [{ translateY: 0 }] } : { opacity: 0, transform: [{ translateY: 10 }] },
        ]}
        numberOfLines={Platform.OS === "web" ? undefined : 4}
        {...getWebClassNameProps("screens-auth-public-hero-headline")}
      >
        {`Tu academia de combate,`}
        {"\n"}
        {`bajo control.`}
      </Text>

      <Text
        style={[
          styles.subhead,
          {
            fontSize: subheadSize,
            lineHeight: Math.ceil(subheadSize * 1.55),
            maxWidth: subheadMaxWidth,
          },
          webTransitionStyles.subhead,
          motionWrap ? { opacity: 1, transform: [{ translateY: 0 }] } : { opacity: 0, transform: [{ translateY: 8 }] },
        ]}
        {...getWebClassNameProps("screens-auth-public-hero-subhead")}
      >
        Software para administrar alumnos, pagos y asistencia en academias de Brazilian Jiu-Jitsu, Artes Marciales Mixtas y Judo Olímpico. Menos planillas, más tiempo en el tatami.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    width: "100%",
    gap: spacing.md,
  },
  logoWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  eyebrowRule: {
    width: 28,
    height: 1,
    backgroundColor: "#FF7C39",
  },
  eyebrow: {
    color: "#FF7C39",
    fontFamily: typography.headingFamily,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  headline: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    textAlign: "center",
    color: "#FFFFFF",
    fontFamily: typography.displayFamily,
    fontWeight: "800",
  },
  subhead: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    textAlign: "center",
    color: "rgba(255, 255, 255, 0.66)",
    fontFamily: typography.bodyFamily,
    fontWeight: "400",
  },
});

export default AnimatedPublicHero;
