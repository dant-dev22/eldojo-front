import React from "react";
import { StyleSheet, View, Text, ViewStyle } from "react-native";
import Svg, {
  Circle,
  Path,
  Rect,
  G,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
} from "react-native-svg";
import { colors, typography } from "../constants/theme";

export type LogoVariant = "primary" | "mark-only" | "mono-dark" | "mono-light";

export interface LogoSvgProps {
  size?: number;
  variant?: LogoVariant;
  withWordmark?: boolean;
  style?: ViewStyle;
  testID?: string;
}

const VIEWBOX = 1000;

const KanjiRiPaths = ({ fill = "#FFFFFF" }: { fill?: string }) => (
  <G>
    <Path
      d="M -152 -128 Q -156 -134 -148 -140 L -88 -148 Q -80 -150 -72 -144 Q -68 -138 -74 -132 L -134 -124 Q -146 -122 -152 -128 Z"
      fill={fill}
    />
    <Path
      d="M -140 -38 Q -146 -44 -138 -50 L -92 -56 Q -82 -58 -76 -50 Q -72 -44 -78 -38 L -124 -30 Q -136 -28 -140 -38 Z"
      fill={fill}
    />
    <Path
      d="M -40 86 Q -28 92 -18 86 L 30 78 Q 40 76 46 70 Q 42 62 30 60 L -30 68 Q -40 70 -40 86 Z"
      fill={fill}
    />
    <Path
      d="M -110 -140 L -106 -144 Q -100 -148 -94 -144 L -90 -140 L -98 -52 Q -100 -44 -96 -36 L -92 -28 L -88 62 Q -86 70 -90 76 Q -96 80 -102 76 Q -106 70 -104 62 L -108 -32 Q -110 -40 -108 -48 L -112 -132 Q -114 -138 -110 -140 Z"
      fill={fill}
    />
    <Path
      d="M 10 -168 Q 4 -174 10 -180 L 128 -168 Q 136 -166 140 -158 Q 138 -150 130 -148 L 28 -158 Q 16 -160 10 -168 Z"
      fill={fill}
    />
    <Path
      d="M 10 -176 L 4 -180 Q -2 -184 -6 -178 L -8 -170 L -4 -48 Q -2 -40 -6 -32 L -10 -24 Q -14 -18 -8 -14 Q -2 -12 2 -18 L 6 -26 L 10 -168 Q 10 -174 10 -176 Z"
      fill={fill}
    />
    <Path
      d="M 134 -166 L 140 -170 Q 146 -174 148 -166 L 150 -158 L 146 -30 Q 144 -22 148 -14 L 152 -6 Q 156 0 150 4 Q 144 6 140 0 L 136 -8 L 132 -158 Q 132 -164 134 -166 Z"
      fill={fill}
    />
    <Path
      d="M -4 -30 Q -10 -36 -4 -42 L 140 -28 Q 148 -26 150 -18 Q 148 -10 140 -8 L 12 -20 Q 0 -22 -4 -30 Z"
      fill={fill}
    />
    <Path
      d="M -2 -100 Q -8 -106 -2 -112 L 144 -98 Q 152 -96 152 -88 Q 150 -80 142 -78 L 4 -90 Q -4 -92 -2 -100 Z"
      fill={fill}
    />
    <Path
      d="M 66 -170 L 60 -174 Q 54 -178 52 -170 L 50 -162 L 56 -88 Q 58 -80 54 -72 L 50 -64 Q 46 -58 52 -54 Q 58 -52 62 -58 L 66 -66 L 70 -162 Q 72 -170 66 -170 Z"
      fill={fill}
    />
    <Path
      d="M 28 68 Q 22 74 30 80 L 160 62 Q 170 60 176 52 Q 172 44 162 42 L 48 58 Q 36 60 28 68 Z"
      fill={fill}
    />
    <Path
      d="M 20 206 Q 8 216 4 228 Q 0 240 12 246 Q 24 248 32 240 L 46 222 L 180 206 Q 194 204 206 210 Q 210 218 204 224 Q 194 228 182 226 L 50 242 Q 38 244 28 236 Q 24 228 28 220 L 40 206 Q 32 204 20 206 Z"
      fill={fill}
    />
    <Path
      d="M 66 -34 L 60 -38 Q 54 -42 52 -34 L 50 -26 L 58 50 Q 60 58 56 66 L 52 74 Q 48 80 54 84 Q 60 86 64 80 L 68 72 L 74 204 Q 76 212 72 218 Q 66 222 60 218 Q 56 212 58 204 L 62 72 Q 64 64 62 56 L 66 -34 Z"
      fill={fill}
    />
  </G>
);

export const LogoSvg: React.FC<LogoSvgProps> = ({
  size = 96,
  variant = "primary",
  withWordmark = false,
  style,
  testID,
}) => {
  const isMonoDark = variant === "mono-dark";
  const isMonoLight = variant === "mono-light";
  const isMono = isMonoDark || isMonoLight;

  const sealFill = isMonoDark
    ? "#1A1A1A"
    : isMonoLight
    ? "#FFFFFF"
    : "url(#sealGrad)";
  const kanjiFill = isMonoLight ? "#1A1A1A" : "#FFFFFF";
  const borderStroke = isMono
    ? isMonoLight
      ? "#1A1A1A"
      : "#FFFFFF"
    : "url(#goldGrad)";
  const innerBorderStroke = isMonoLight
    ? "rgba(26,26,26,0.25)"
    : "rgba(255,255,255,0.22)";
  const accentFill = isMono
    ? isMonoLight
      ? "#1A1A1A"
      : "#FFFFFF"
    : "url(#goldGrad)";
  const dotOpacity = isMono ? 0.5 : 0.9;

  const outer = variant === "mark-only" ? 450 : 380;
  const outerCx = 500;
  const outerCy = variant === "mark-only" ? 500 : 460;
  const kanjiScale = variant === "mark-only" ? 1.18 : 1;
  const kanjiCy = variant === "mark-only" ? 500 : 440;

  const wordmarkWordColor = isMono
    ? isMonoLight
      ? "#1A1A1A"
      : "#FFFFFF"
    : colors.secondary;
  const wordmarkBg = isMono
    ? isMonoLight
      ? "transparent"
      : "transparent"
    : "#FFFFFF";
  const wordmarkBorder = isMono
    ? isMonoLight
      ? "#1A1A1A"
      : "#FFFFFF"
    : colors.wood;
  const wordmarkDotFill = isMono
    ? isMonoLight
      ? "#1A1A1A"
      : "#FFFFFF"
    : colors.gold;

  return (
    <View style={[styles.container, style]} testID={testID}>
      <View
        style={[
          styles.svgWrap,
          { width: size, height: size },
          withWordmark ? null : null,
        ]}
      >
        <Svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <Defs>
            <LinearGradient
              id="sealGrad"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <Stop offset="0%" stopColor="#C62828" />
              <Stop offset="45%" stopColor="#A81F1F" />
              <Stop offset="100%" stopColor="#8B1717" />
            </LinearGradient>
            <LinearGradient
              id="goldGrad"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <Stop offset="0%" stopColor="#F9A825" />
              <Stop offset="55%" stopColor="#FBC02D" />
              <Stop offset="100%" stopColor="#D98E1A" />
            </LinearGradient>
            <RadialGradient
              id="innerShine"
              cx="35%"
              cy="30%"
              rx="70%"
              ry="70%"
            >
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.10" />
              <Stop offset="60%" stopColor="#FFFFFF" stopOpacity="0" />
            </RadialGradient>
          </Defs>

          <Circle cx={outerCx} cy={outerCy} r={outer} fill={sealFill} />
          {!isMono && (
            <Circle cx={outerCx} cy={outerCy} r={outer} fill="url(#innerShine)" />
          )}
          <Circle
            cx={outerCx}
            cy={outerCy}
            r={outer - 22}
            fill="none"
            stroke={borderStroke}
            strokeWidth={variant === "mark-only" ? 4 : 3.5}
            opacity={isMono ? 0.55 : 0.9}
          />
          <Circle
            cx={outerCx}
            cy={outerCy}
            r={outer - 40}
            fill="none"
            stroke={innerBorderStroke}
            strokeWidth={1.5}
          />

          {!isMono && variant !== "mark-only" && (
            <G opacity={0.75}>
              <Path
                d="M260 220 L278 220 L278 238"
                stroke="url(#goldGrad)"
                strokeWidth={3}
                strokeLinecap="round"
              />
              <Path
                d="M740 220 L722 220 L722 238"
                stroke="url(#goldGrad)"
                strokeWidth={3}
                strokeLinecap="round"
              />
              <Path
                d="M260 700 L278 700 L278 682"
                stroke="url(#goldGrad)"
                strokeWidth={3}
                strokeLinecap="round"
              />
              <Path
                d="M740 700 L722 700 L722 682"
                stroke="url(#goldGrad)"
                strokeWidth={3}
                strokeLinecap="round"
              />
            </G>
          )}

          <G
            transform={`translate(${500}, ${kanjiCy}) scale(${kanjiScale})`}
          >
            <KanjiRiPaths fill={kanjiFill} />
          </G>

          {variant !== "mark-only" && (
            <G fill={accentFill} opacity={dotOpacity}>
              <Circle cx={500} cy={outerCy - outer + 8} r={6} />
              <Circle cx={500} cy={outerCy + outer - 8} r={6} />
              <Circle cx={outerCx - outer + 8} cy={outerCy} r={6} />
              <Circle cx={outerCx + outer - 8} cy={outerCy} r={6} />
            </G>
          )}
        </Svg>
      </View>

      {withWordmark && (
        <View
          style={[
            styles.wordmarkRow,
            {
              marginTop: Math.max(4, size * 0.06),
              paddingHorizontal: Math.max(6, size * 0.10),
              paddingVertical: Math.max(4, size * 0.05),
              backgroundColor: wordmarkBg,
              borderColor: wordmarkBorder,
              borderRadius: 999,
              borderWidth: 1.5,
            },
          ]}
        >
          <Text
            style={[
              styles.wordmarkText,
              {
                fontSize: Math.max(10, size * 0.18),
                letterSpacing: Math.max(1.2, size * 0.04),
                color: wordmarkWordColor,
                fontFamily: typography.headingFamily,
              },
            ]}
          >
            EL
          </Text>
          <View
            style={{
              width: Math.max(3, size * 0.06),
              height: Math.max(3, size * 0.06),
              borderRadius: 999,
              backgroundColor: wordmarkDotFill,
              marginHorizontal: Math.max(4, size * 0.06),
            }}
          />
          <Text
            style={[
              styles.wordmarkText,
              {
                fontSize: Math.max(10, size * 0.18),
                letterSpacing: Math.max(1.2, size * 0.04),
                color: wordmarkWordColor,
                fontFamily: typography.headingFamily,
              },
            ]}
          >
            DOJO
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  svgWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  wordmarkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  wordmarkText: {
    fontWeight: "800",
  },
});

export default LogoSvg;
