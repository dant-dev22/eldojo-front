import React, { useEffect, useRef } from "react";
import {
  Animated as NativeAnimated,
  Easing as NativeEasing,
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { colors, spacing, typography } from "@/constants/theme";

const ANIM_DELAY_MS = 1000;
const ANIM_DURATION_MS = 3000;

type HeroProps = {
  testID?: string;
};

const BASE_TRANSITION = {
  duration: ANIM_DURATION_MS / 1000,
  repeat: Infinity,
  repeatDelay: 0.15,
  ease: "easeInOut" as const,
  delay: ANIM_DELAY_MS / 1000,
};

const KANJI_PATHS = [
  "M -152 -128 Q -156 -134 -148 -140 L -88 -148 Q -80 -150 -72 -144 Q -68 -138 -74 -132 L -134 -124 Q -146 -122 -152 -128 Z",
  "M -140 -38 Q -146 -44 -138 -50 L -92 -56 Q -82 -58 -76 -50 Q -72 -44 -78 -38 L -124 -30 Q -136 -28 -140 -38 Z",
  "M -40 86 Q -28 92 -18 86 L 30 78 Q 40 76 46 70 Q 42 62 30 60 L -30 68 Q -40 70 -40 86 Z",
  "M -110 -140 L -106 -144 Q -100 -148 -94 -144 L -90 -140 L -98 -52 Q -100 -44 -96 -36 L -92 -28 L -88 62 Q -86 70 -90 76 Q -96 80 -102 76 Q -106 70 -104 62 L -108 -32 Q -110 -40 -108 -48 L -112 -132 Q -114 -138 -110 -140 Z",
  "M 10 -168 Q 4 -174 10 -180 L 128 -168 Q 136 -166 140 -158 Q 138 -150 130 -148 L 28 -158 Q 16 -160 10 -168 Z",
  "M 10 -176 L 4 -180 Q -2 -184 -6 -178 L -8 -170 L -4 -48 Q -2 -40 -6 -32 L -10 -24 Q -14 -18 -8 -14 Q -2 -12 2 -18 L 6 -26 L 10 -168 Q 10 -174 10 -176 Z",
  "M 134 -166 L 140 -170 Q 146 -174 148 -166 L 150 -158 L 146 -30 Q 144 -22 148 -14 L 152 -6 Q 156 0 150 4 Q 144 6 140 0 L 136 -8 L 132 -158 Q 132 -164 134 -166 Z",
  "M -4 -30 Q -10 -36 -4 -42 L 140 -28 Q 148 -26 150 -18 Q 148 -10 140 -8 L 12 -20 Q 0 -22 -4 -30 Z",
  "M -2 -100 Q -8 -106 -2 -112 L 144 -98 Q 152 -96 152 -88 Q 150 -80 142 -78 L 4 -90 Q -4 -92 -2 -100 Z",
  "M 66 -170 L 60 -174 Q 54 -178 52 -170 L 50 -162 L 56 -88 Q 58 -80 54 -72 L 50 -64 Q 46 -58 52 -54 Q 58 -52 62 -58 L 66 -66 L 70 -162 Q 72 -170 66 -170 Z",
  "M 28 68 Q 22 74 30 80 L 160 62 Q 170 60 176 52 Q 172 44 162 42 L 48 58 Q 36 60 28 68 Z",
  "M 20 206 Q 8 216 4 228 Q 0 240 12 246 Q 24 248 32 240 L 46 222 L 180 206 Q 194 204 206 210 Q 210 218 204 224 Q 194 228 182 226 L 50 242 Q 38 244 28 236 Q 24 228 28 220 L 40 206 Q 32 204 20 206 Z",
  "M 66 -34 L 60 -38 Q 54 -42 52 -34 L 50 -26 L 58 50 Q 60 58 56 66 L 52 74 Q 48 80 54 84 Q 60 86 64 80 L 68 72 L 74 204 Q 76 212 72 218 Q 66 222 60 218 Q 56 212 58 204 L 62 72 Q 64 64 62 56 L 66 -34 Z",
];

const staggerDelay = (index: number, total: number, startPct: number, endPct: number) => {
  const windowPct = endPct - startPct;
  const step = windowPct / Math.max(1, total - 1);
  const at = startPct + step * index;
  const before = Math.max(0, at - 0.0001);
  return [
    [0, 0],
    [before, 0],
    [at, 1],
    [Math.min(1, at + windowPct * 0.45), 1],
    [1, 1],
  ];
};

export const AnimatedPublicHero: React.FC<HeroProps> = ({ testID }) => {
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

  const kanjiCy = 440;
  const outerCy = 460;
  const outer = 380;
  const outerCx = 500;

  if (Platform.OS === "web") {
    const motion = require("framer-motion");
    const MotionSvg = motion.motion.svg;
    const MotionCircle = motion.motion.circle;
    const MotionPath = motion.motion.path;
    const MotionG = motion.motion.g;

    return (
      <View style={styles.root} testID={testID}>
        <View
          style={[
            styles.logoFrame,
            {
              width: logoSize,
              height: logoSize,
            },
          ]}
        >
          <MotionSvg
            viewBox="0 0 1000 1000"
            style={{ width: "100%", height: "100%", overflow: "visible" }}
          >
            <defs>
              <linearGradient id="aph-sealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#C62828" />
                <stop offset="45%" stopColor="#A81F1F" />
                <stop offset="100%" stopColor="#8B1717" />
              </linearGradient>
              <linearGradient id="aph-goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F9A825" />
                <stop offset="55%" stopColor="#FBC02D" />
                <stop offset="100%" stopColor="#D98E1A" />
              </linearGradient>
              <radialGradient id="aph-innerShine" cx="35%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.12" />
                <stop offset="60%" stopColor="#FFFFFF" stopOpacity="0" />
              </radialGradient>
              <filter id="aph-softShadow" x="-10%" y="-10%" width="120%" height="120%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
                <feOffset dx="0" dy="4" result="off" />
                <feComponentTransfer>
                  <feFuncA type="linear" slope="0.22" />
                </feComponentTransfer>
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <MotionG
              style={{ transformOrigin: "500px 460px", transformBox: "fill-box", filter: "url(#aph-softShadow)" }}
              animate={{
                scale: [0.86, 0.86, 1, 1, 1.01, 1.01, 1.025, 1.025, 1],
                y: [0, 0, 0, 0, 0, 0, -3, -3, 0],
              }}
              transition={{
                ...BASE_TRANSITION,
                times: [0, 0.05, 0.07, 0.68, 0.76, 0.82, 0.88, 0.94, 1],
              }}
            >
              <MotionCircle
                cx={outerCx}
                cy={outerCy}
                r={outer}
                fill="url(#aph-sealGrad)"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0, 1, 1, 1] }}
                transition={{
                  ...BASE_TRANSITION,
                  times: [0, 0.01, 0.06, 0.94, 1],
                }}
              />

              <MotionCircle
                cx={outerCx}
                cy={outerCy}
                r={outer}
                fill="url(#aph-innerShine)"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0, 0.7, 0.9, 0.7] }}
                transition={{
                  ...BASE_TRANSITION,
                  times: [0, 0.05, 0.12, 0.5, 1],
                }}
              />

              <MotionCircle
                cx={outerCx}
                cy={outerCy}
                r={outer - 22}
                fill="none"
                stroke="url(#aph-goldGrad)"
                strokeWidth={4}
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * (outer - 22)}
                initial={{ strokeDashoffset: 2 * Math.PI * (outer - 22), opacity: 0 }}
                animate={{
                  strokeDashoffset: [2 * Math.PI * (outer - 22), 2 * Math.PI * (outer - 22), 0, 0, 0],
                  opacity: [0, 0, 0.95, 0.95, 0.95],
                }}
                transition={{
                  ...BASE_TRANSITION,
                  times: [0, 0.05, 0.15, 0.92, 1],
                }}
              />

              <MotionCircle
                cx={outerCx}
                cy={outerCy}
                r={outer - 40}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * (outer - 40)}
                initial={{ strokeDashoffset: 2 * Math.PI * (outer - 40), opacity: 0 }}
                animate={{
                  strokeDashoffset: [2 * Math.PI * (outer - 40), 2 * Math.PI * (outer - 40), 0, 0, 0],
                  opacity: [0, 0, 0.26, 0.26, 0.26],
                }}
                transition={{
                  ...BASE_TRANSITION,
                  times: [0, 0.08, 0.18, 0.92, 1],
                }}
              />

              <MotionG opacity={0.85}>
                {[
                  "M260 220 L278 220 L278 238",
                  "M740 220 L722 220 L722 238",
                  "M260 700 L278 700 L278 682",
                  "M740 700 L722 700 L722 682",
                ].map((d, i) => {
                  const pct = staggerDelay(i, 4, 0.13, 0.22);
                  return (
                    <MotionPath
                      key={`corner-${i}`}
                      d={d}
                      stroke="url(#aph-goldGrad)"
                      strokeWidth={3}
                      strokeLinecap="round"
                      fill="none"
                      initial={{
                        pathLength: 0,
                        opacity: 0,
                        x: i % 2 === 0 ? -10 : 10,
                        y: i < 2 ? -10 : 10,
                      }}
                      animate={{
                        pathLength: pct.map((p) => p[1]),
                        opacity: pct.map((p) => p[1]),
                        x: pct.map((p) => (1 - p[1]) * (i % 2 === 0 ? -10 : 10)),
                        y: pct.map((p) => (1 - p[1]) * (i < 2 ? -10 : 10)),
                      }}
                      transition={{
                        ...BASE_TRANSITION,
                        times: pct.map((p) => p[0]),
                      }}
                    />
                  );
                })}
              </MotionG>

              <MotionG
                transform={`translate(${500}, ${kanjiCy})`}
                style={{ transformOrigin: "0px 0px", transformBox: "fill-box" }}
                animate={{ scale: [1, 1, 1, 1.01, 1] }}
                transition={{
                  ...BASE_TRANSITION,
                  times: [0, 0.2, 0.68, 0.85, 1],
                }}
              >
                {KANJI_PATHS.map((d, i) => {
                  const pct = staggerDelay(i, KANJI_PATHS.length, 0.2, 0.6);
                  return (
                    <MotionPath
                      key={`kanji-${i}`}
                      d={d}
                      fill="#FFFFFF"
                      initial={{ opacity: 0, scale: 0.94 }}
                      style={{ transformOrigin: "center", transformBox: "fill-box" }}
                      animate={{
                        opacity: pct.map((p) => p[1]),
                        scale: pct.map((p) => 0.94 + p[1] * 0.06),
                      }}
                      transition={{
                        ...BASE_TRANSITION,
                        times: pct.map((p) => p[0]),
                      }}
                    />
                  );
                })}
              </MotionG>

              <MotionG fill="url(#aph-goldGrad)">
                {[
                  { cx: 500, cy: outerCy - outer + 8 },
                  { cx: 500, cy: outerCy + outer - 8 },
                  { cx: outerCx - outer + 8, cy: outerCy },
                  { cx: outerCx + outer - 8, cy: outerCy },
                ].map((c, i) => (
                  <MotionCircle
                    key={`dot-${i}`}
                    cx={c.cx}
                    cy={c.cy}
                    r={6}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{
                      opacity: [0, 0, 0.95, 0.95, 0.95, 0.95],
                      scale: [0, 0, 1, 1.4, 1, 1],
                    }}
                    transition={{
                      ...BASE_TRANSITION,
                      times: [0, 0.55, 0.64, 0.7, 0.78, 1],
                    }}
                  />
                ))}
              </MotionG>
            </MotionG>
          </MotionSvg>
        </View>

        <Text
          style={[
            styles.headline,
            {
              fontSize: headlineSize,
              lineHeight: headlineSize * 1.15,
              maxWidth: viewportWidth < 768 ? viewportWidth - spacing.lg * 2 : 960,
              marginTop: viewportWidth < 768 ? spacing.lg : spacing.xl,
            },
          ]}
        >
          La mejor forma de administrar tu academia de combate.
        </Text>
      </View>
    );
  }

  return (
    <NativeAnimatedLogo
      logoSize={logoSize}
      headlineSize={headlineSize}
      viewportWidth={viewportWidth}
      testID={testID}
    />
  );
};

type NativeProps = {
  logoSize: number;
  headlineSize: number;
  viewportWidth: number;
  testID?: string;
};

const Svg = require("react-native-svg").default as any;
const SvgCircle = require("react-native-svg").Circle as any;
const SvgPath = require("react-native-svg").Path as any;
const SvgG = require("react-native-svg").G as any;
const SvgDefs = require("react-native-svg").Defs as any;
const SvgLinearGradient = require("react-native-svg").LinearGradient as any;
const SvgRadialGradient = require("react-native-svg").RadialGradient as any;
const SvgStop = require("react-native-svg").Stop as any;

const AnimatedCircle = NativeAnimated.createAnimatedComponent(SvgCircle);
const AnimatedPath = NativeAnimated.createAnimatedComponent(SvgPath);
const AnimatedG = NativeAnimated.createAnimatedComponent(SvgG);
const AnimatedRadial = NativeAnimated.createAnimatedComponent(SvgRadialGradient);

const NativeAnimatedLogo: React.FC<NativeProps> = ({ logoSize, headlineSize, viewportWidth, testID }) => {
  const overallScale = useRef(new NativeAnimated.Value(0.86)).current;
  const overallY = useRef(new NativeAnimated.Value(0)).current;
  const sealOpacity = useRef(new NativeAnimated.Value(0)).current;
  const shineOpacity = useRef(new NativeAnimated.Value(0)).current;
  const borderOffset = useRef(new NativeAnimated.Value(2 * Math.PI * 358)).current;
  const borderOpacity = useRef(new NativeAnimated.Value(0)).current;
  const innerOffset = useRef(new NativeAnimated.Value(2 * Math.PI * 340)).current;
  const innerOpacity = useRef(new NativeAnimated.Value(0)).current;

  const corner = useRef([0, 1, 2, 3].map(() => new NativeAnimated.Value(0))).current;
  const cornerTransl = useRef([0, 1, 2, 3].map(() => new NativeAnimated.Value(10))).current;
  const kanji = useRef(KANJI_PATHS.map(() => new NativeAnimated.Value(0))).current;
  const dots = useRef([0, 1, 2, 3].map(() => new NativeAnimated.Value(0))).current;
  const dotScale = useRef([0, 1, 2, 3].map(() => new NativeAnimated.Value(0))).current;

  const buildLoop = () => {
    const pct = (ms: number) => ms;
    const sealShow = NativeAnimated.timing(sealOpacity, {
      toValue: 1,
      duration: pct(180),
      easing: NativeEasing.out(NativeEasing.cubic),
      useNativeDriver: false,
    });
    const scaleSettle = NativeAnimated.parallel([
      NativeAnimated.timing(overallScale, {
        toValue: 1,
        duration: pct(240),
        easing: NativeEasing.out(NativeEasing.back(1.4)),
        useNativeDriver: false,
      }),
      NativeAnimated.timing(overallY, {
        toValue: 0,
        duration: pct(240),
        easing: NativeEasing.linear,
        useNativeDriver: false,
      }),
    ]);
    const shineFade = NativeAnimated.timing(shineOpacity, {
      toValue: 0.85,
      duration: pct(300),
      easing: NativeEasing.linear,
      useNativeDriver: false,
    });
    const borderDraw = NativeAnimated.parallel([
      NativeAnimated.timing(borderOffset, {
        toValue: 0,
        duration: pct(330),
        easing: NativeEasing.out(NativeEasing.cubic),
        useNativeDriver: false,
      }),
      NativeAnimated.timing(borderOpacity, {
        toValue: 0.95,
        duration: pct(180),
        easing: NativeEasing.linear,
        useNativeDriver: false,
      }),
    ]);
    const innerDraw = NativeAnimated.parallel([
      NativeAnimated.timing(innerOffset, {
        toValue: 0,
        duration: pct(300),
        easing: NativeEasing.out(NativeEasing.cubic),
        useNativeDriver: false,
      }),
      NativeAnimated.timing(innerOpacity, {
        toValue: 0.26,
        duration: pct(180),
        easing: NativeEasing.linear,
        useNativeDriver: false,
      }),
    ]);

    const corners = NativeAnimated.parallel(
      corner.map((val, i) =>
        NativeAnimated.sequence([
          NativeAnimated.delay(40 * i),
          NativeAnimated.parallel([
            NativeAnimated.timing(val, {
              toValue: 1,
              duration: 240,
              easing: NativeEasing.out(NativeEasing.cubic),
              useNativeDriver: false,
            }),
            NativeAnimated.timing(cornerTransl[i], {
              toValue: 0,
              duration: 240,
              easing: NativeEasing.out(NativeEasing.cubic),
              useNativeDriver: false,
            }),
          ]),
        ])
      )
    );

    const kanjiDraw = NativeAnimated.parallel(
      kanji.map((val, i) =>
        NativeAnimated.sequence([
          NativeAnimated.delay(44 * i),
          NativeAnimated.timing(val, {
            toValue: 1,
            duration: 360,
            easing: NativeEasing.out(NativeEasing.cubic),
            useNativeDriver: false,
          }),
        ])
      )
    );

    const dotsShow = NativeAnimated.parallel(
      dots.map((val, i) =>
        NativeAnimated.sequence([
          NativeAnimated.delay(20 * i),
          NativeAnimated.parallel([
            NativeAnimated.timing(val, {
              toValue: 0.95,
              duration: 180,
              easing: NativeEasing.linear,
              useNativeDriver: false,
            }),
            NativeAnimated.sequence([
              NativeAnimated.timing(dotScale[i], {
                toValue: 1.4,
                duration: 220,
                easing: NativeEasing.out(NativeEasing.quad),
                useNativeDriver: false,
              }),
              NativeAnimated.timing(dotScale[i], {
                toValue: 1,
                duration: 320,
                easing: NativeEasing.inOut(NativeEasing.quad),
                useNativeDriver: false,
              }),
            ]),
          ]),
        ])
      )
    );

    const breathe = NativeAnimated.sequence([
      NativeAnimated.parallel([
        NativeAnimated.timing(overallScale, {
          toValue: 1.025,
          duration: 480,
          easing: NativeEasing.inOut(NativeEasing.sin),
          useNativeDriver: false,
        }),
        NativeAnimated.timing(overallY, {
          toValue: -3,
          duration: 480,
          easing: NativeEasing.inOut(NativeEasing.sin),
          useNativeDriver: false,
        }),
      ]),
      NativeAnimated.parallel([
        NativeAnimated.timing(overallScale, {
          toValue: 1,
          duration: 480,
          easing: NativeEasing.inOut(NativeEasing.sin),
          useNativeDriver: false,
        }),
        NativeAnimated.timing(overallY, {
          toValue: 0,
          duration: 480,
          easing: NativeEasing.inOut(NativeEasing.sin),
          useNativeDriver: false,
        }),
      ]),
    ]);

    const reset = NativeAnimated.parallel([
      NativeAnimated.timing(overallScale, { toValue: 0.86, duration: 1, useNativeDriver: false }),
      NativeAnimated.timing(overallY, { toValue: 0, duration: 1, useNativeDriver: false }),
      NativeAnimated.timing(sealOpacity, { toValue: 0, duration: 1, useNativeDriver: false }),
      NativeAnimated.timing(shineOpacity, { toValue: 0, duration: 1, useNativeDriver: false }),
      NativeAnimated.timing(borderOffset, { toValue: 2 * Math.PI * 358, duration: 1, useNativeDriver: false }),
      NativeAnimated.timing(borderOpacity, { toValue: 0, duration: 1, useNativeDriver: false }),
      NativeAnimated.timing(innerOffset, { toValue: 2 * Math.PI * 340, duration: 1, useNativeDriver: false }),
      NativeAnimated.timing(innerOpacity, { toValue: 0, duration: 1, useNativeDriver: false }),
      ...corner.map((v) => NativeAnimated.timing(v, { toValue: 0, duration: 1, useNativeDriver: false })),
      ...cornerTransl.map((v) => NativeAnimated.timing(v, { toValue: 10, duration: 1, useNativeDriver: false })),
      ...kanji.map((v) => NativeAnimated.timing(v, { toValue: 0, duration: 1, useNativeDriver: false })),
      ...dots.map((v) => NativeAnimated.timing(v, { toValue: 0, duration: 1, useNativeDriver: false })),
      ...dotScale.map((v) => NativeAnimated.timing(v, { toValue: 0, duration: 1, useNativeDriver: false })),
    ]);

    return NativeAnimated.sequence([
      NativeAnimated.delay(ANIM_DELAY_MS),
      NativeAnimated.loop(
        NativeAnimated.sequence([
          NativeAnimated.parallel([sealShow, scaleSettle]),
          shineFade,
          NativeAnimated.parallel([borderDraw, NativeAnimated.delay(80), innerDraw]),
          corners,
          kanjiDraw,
          dotsShow,
          breathe,
          NativeAnimated.delay(180),
          reset,
          NativeAnimated.delay(120),
        ]),
        { iterations: -1 }
      ),
    ]);
  };

  useEffect(() => {
    const anim = buildLoop();
    anim.start();
    return () => anim.stop();
  }, []);

  const outerCy = 460;
  const outer = 380;
  const outerCx = 500;
  const kanjiCy = 440;

  const cornerTranslate = (i: number) => {
    const dx = i % 2 === 0 ? -1 : 1;
    const dy = i < 2 ? -1 : 1;
    return {
      translateX: NativeAnimated.multiply(cornerTransl[i], dx),
      translateY: NativeAnimated.multiply(cornerTransl[i], dy),
    };
  };

  return (
    <View style={styles.root} testID={testID}>
      <View style={[styles.logoFrame, { width: logoSize, height: logoSize }]}>
        <AnimatedG style={{ transform: [{ translateY: overallY }, { scale: overallScale }] }}>
          <Svg width="100%" height="100%" viewBox="0 0 1000 1000">
            <SvgDefs>
              <SvgLinearGradient id="aph-sealGrad-native" x1="0%" y1="0%" x2="100%" y2="100%">
                <SvgStop offset="0%" stopColor="#C62828" />
                <SvgStop offset="45%" stopColor="#A81F1F" />
                <SvgStop offset="100%" stopColor="#8B1717" />
              </SvgLinearGradient>
              <SvgLinearGradient id="aph-goldGrad-native" x1="0%" y1="0%" x2="100%" y2="100%">
                <SvgStop offset="0%" stopColor="#F9A825" />
                <SvgStop offset="55%" stopColor="#FBC02D" />
                <SvgStop offset="100%" stopColor="#D98E1A" />
              </SvgLinearGradient>
              <AnimatedRadial id="aph-innerShine-native" cx="35%" cy="30%" r="70%">
                <SvgStop offset="0%" stopColor="#FFFFFF" stopOpacity={NativeAnimated.multiply(shineOpacity, 0.12)} />
                <SvgStop offset="60%" stopColor="#FFFFFF" stopOpacity={0} />
              </AnimatedRadial>
            </SvgDefs>

            <AnimatedCircle cx={outerCx} cy={outerCy} r={outer} fill="url(#aph-sealGrad-native)" opacity={sealOpacity} />
            <AnimatedCircle cx={outerCx} cy={outerCy} r={outer} fill="url(#aph-innerShine-native)" opacity={shineOpacity} />
            <AnimatedCircle
              cx={outerCx}
              cy={outerCy}
              r={outer - 22}
              fill="none"
              stroke="url(#aph-goldGrad-native)"
              strokeWidth={4}
              strokeDasharray={2 * Math.PI * (outer - 22)}
              strokeDashoffset={borderOffset}
              opacity={borderOpacity}
            />
            <AnimatedCircle
              cx={outerCx}
              cy={outerCy}
              r={outer - 40}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={1.5}
              strokeDasharray={2 * Math.PI * (outer - 40)}
              strokeDashoffset={innerOffset}
              opacity={innerOpacity}
            />

            <SvgG opacity={0.85}>
              {[
                "M260 220 L278 220 L278 238",
                "M740 220 L722 220 L722 238",
                "M260 700 L278 700 L278 682",
                "M740 700 L722 700 L722 682",
              ].map((d, i) => (
                <AnimatedPath
                  key={`corner-native-${i}`}
                  d={d}
                  stroke="url(#aph-goldGrad-native)"
                  strokeWidth={3}
                  strokeLinecap="round"
                  fill="none"
                  opacity={corner[i]}
                  transform={cornerTranslate(i)}
                />
              ))}
            </SvgG>

            <SvgG transform={`translate(${500}, ${kanjiCy})`}>
              {KANJI_PATHS.map((d, i) => (
                <AnimatedPath
                  key={`kanji-native-${i}`}
                  d={d}
                  fill="#FFFFFF"
                  opacity={kanji[i]}
                  transform={[{ scale: kanji[i].interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }]}
                />
              ))}
            </SvgG>

            <SvgG fill="url(#aph-goldGrad-native)">
              {[
                { cx: 500, cy: outerCy - outer + 8 },
                { cx: 500, cy: outerCy + outer - 8 },
                { cx: outerCx - outer + 8, cy: outerCy },
                { cx: outerCx + outer - 8, cy: outerCy },
              ].map((c, i) => (
                <AnimatedG
                  key={`dot-native-${i}`}
                  transform={[{ translateX: c.cx }, { translateY: c.cy }, { scale: dotScale[i] }]}
                >
                  <SvgCircle cx={0} cy={0} r={6} opacity={dots[i]} />
                </AnimatedG>
              ))}
            </SvgG>
          </Svg>
        </AnimatedG>
      </View>

      <Text
        style={[
          styles.headline,
          {
            fontSize: headlineSize,
            lineHeight: headlineSize * 1.15,
            maxWidth: viewportWidth < 768 ? viewportWidth - spacing.lg * 2 : 960,
            marginTop: viewportWidth < 768 ? spacing.lg : spacing.xl,
          },
        ]}
      >
        La mejor forma de administrar tu academia de combate.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  logoFrame: {
    alignItems: "center",
    justifyContent: "center",
  },
  headline: {
    fontFamily: typography.displayFamily,
    fontWeight: "800",
    color: colors.secondary,
    textAlign: "center",
    letterSpacing: -0.4,
  },
});

export default AnimatedPublicHero;
