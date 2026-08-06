import React from "react";
import { Platform, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { colors, spacing, typography } from "../constants/theme";
import { LogoSvg } from "./LogoSvg";

export interface AnimatedPublicHeroProps {
  testID?: string;
}

export const AnimatedPublicHero: React.FC<AnimatedPublicHeroProps> = ({ testID }) => {
  const { width: viewportWidth } = useWindowDimensions();

  const logoSize =
    viewportWidth < 400
      ? 120
      : viewportWidth < 520
      ? 140
      : viewportWidth < 768
      ? 170
      : viewportWidth < 1100
      ? 210
      : 250;

  const headlineSize =
    viewportWidth < 400
      ? 26
      : viewportWidth < 520
      ? 30
      : viewportWidth < 768
      ? 36
      : viewportWidth < 1100
      ? 48
      : 62;

  const headlineMaxWidth = viewportWidth < 768 ? viewportWidth - 2 * spacing.lg : 960;

  return (
    <View
      nativeID="screens-auth-public-hero-section"
      testID={testID || "screens-auth-public-animated-logo-hero"}
      style={styles.wrapper}
      accessibilityRole="image"
      accessibilityLabel="Logo El Dojo animado"
    >
      <View style={[styles.logoWrap, { width: logoSize, height: logoSize }]}>
        <LogoSvg
          size={logoSize}
          variant="mark-only"
          animated
          loop
          testID="screens-auth-public-hero-logo"
        />
      </View>

      <Text
        style={[
          styles.headline,
          {
            fontSize: headlineSize,
            lineHeight: Math.ceil(headlineSize * 1.1),
            letterSpacing: Math.max(-0.4, headlineSize * -0.008),
            maxWidth: headlineMaxWidth,
          },
        ]}
        numberOfLines={Platform.OS === "web" ? undefined : 3}
      >
        {`La mejor forma de administrar tu academia de combate.`}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    width: "100%",
  },
  logoWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  headline: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    textAlign: "center",
    color: colors.secondary,
    fontFamily: typography.displayFamily,
    fontWeight: "800",
  },
});

export default AnimatedPublicHero;
