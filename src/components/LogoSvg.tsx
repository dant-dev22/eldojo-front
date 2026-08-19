import React from "react";
import { Platform, StyleSheet, View, Text, ViewStyle } from "react-native";
import { colors, typography } from "../constants/theme";

export type LogoVariant = "primary" | "mark-only" | "mono-dark" | "mono-light" | "brand-red" | "brand-red-solid";

export interface LogoSvgProps {
  size?: number;
  variant?: LogoVariant;
  withWordmark?: boolean;
  animated?: boolean;
  loop?: boolean;
  delayMs?: number;
  style?: ViewStyle;
  testID?: string;
  nativeID?: string;
  noSealGlow?: boolean;
}

const CANVAS = 447;
const center = CANVAS / 2;

const PATH_0_RIGHT_KANJI =
  "M 336.500234 75.000562 L 346.499533 75.000562 L 354.500135 78.000351 L 379.499544 90.999439 L 386.9996 97.499565 L 387.99953 104.500238 L 377.000302 118.500419 L 368.999699 132.499436 L 341.000501 208.499922 C 336.933266 217.100017 331.767156 224.600073 325.499842 231.000089 L 322.500053 232.000019 L 315.500544 222.999486 L 281.499439 227.00037 L 278.000266 230.499542 L 278.000266 276.499805 L 279.499579 277.000352 L 302.500293 269.99968 L 314.49945 267.99982 C 315.366677 269.466539 317.366537 269.799461 320.500193 268.99975 L 326.499772 271.999539 L 332.999898 277.499735 L 333.999828 282.500548 L 330.499491 285.999721 L 323.499983 287.99958 L 276.000407 296.000183 L 276.000407 347.499478 C 276.066758 348.232838 277.900157 348.400463 281.499439 348.000025 L 295.49962 345.000236 L 319.500264 343.000376 L 328.499632 341.000516 L 337.500164 341.000516 L 354.500135 337.999563 L 362.499574 337.999563 L 376.499755 334.999774 L 384.500357 334.999774 C 393.699945 336.532844 400.532992 340.366102 404.999501 346.499548 L 409.000384 353.500221 L 409.000384 358.49987 L 402.500258 362.000207 L 388.500077 362.000207 L 387.500147 361.000277 L 360.499714 361.000277 L 359.499784 362.000207 L 316.500474 362.000207 L 315.500544 363.000136 L 284.500392 364.999996 L 283.500462 365.999926 L 276.49979 365.999926 L 275.49986 366.999856 L 261.499678 367.999785 L 260.499749 368.999715 L 246.499567 369.999645 L 219.500298 375.000458 L 213.499555 375.000458 L 183.500497 381.000037 L 169.500316 381.999967 L 158.499924 380.000107 L 141.00057 370.999575 C 140.533781 368.466575 141.36725 366.799637 143.499812 365.999926 L 153.500274 364.000066 L 175.499894 363.000136 L 176.499824 362.000207 L 182.500567 362.000207 L 183.500497 361.000277 L 189.500076 361.000277 L 195.499655 359.000417 L 218.500368 355.999464 L 224.499947 353.999604 L 247.499497 351.999744 L 259.000436 349.999885 L 259.000436 300.500449 L 258.499889 299.999902 L 250.50045 299.999902 L 249.500521 300.999832 L 226.499807 301.999762 C 218.30015 300.533043 211.800024 297.366792 206.999429 292.499846 L 205.9995 288.99951 L 209.499836 286.99965 L 214.499485 286.99965 L 259.000436 279.000212 L 259.000436 231.499472 L 255.500099 231.000089 L 254.50017 232.000019 L 238.500129 232.999949 L 231.499456 234.999808 L 224.499947 234.999808 L 220.999611 237.500215 L 217.999821 245.499653 L 215.500579 248.00006 L 213.000172 246.499583 L 209.000453 238.500145 L 208.000523 230.499542 L 202.99971 213.499571 L 202.99971 209.499852 L 192.000482 164.499518 L 189.999459 150.500501 L 186.999669 141.499969 L 185.999739 132.499436 L 182.99995 123.500068 L 174.000582 107.500027 L 175.000511 104.99962 L 206.500047 105.99955 L 207.499976 104.99962 L 230.499526 102.999761 L 231.499456 101.999831 L 277.499719 95.000322 L 321.500123 83.000001 Z M 312.000208 99.999971 L 311.000278 100.999901 L 285.999705 103.999691 L 280.000126 105.99955 L 274.000547 105.99955 L 271.999523 108.000574 C 277.333258 112.000293 281.332978 117.66695 283.999845 125.000545 L 283.999845 132.000053 L 281.000056 140.999422 L 280.000126 152.999743 L 296.000167 149.999954 L 310.000348 149.999954 L 314.000068 151.999814 L 315.999927 155.999533 L 314.999997 162.000276 L 304.999535 167.999855 L 284.999775 173.999434 L 280.000126 178.000317 L 281.000056 215.000048 L 320.999576 208.000539 L 322.999436 204.999586 L 326.000389 189.999475 L 328.000249 185.999755 L 337.999547 135.999773 L 337.999547 113.000223 L 335.999687 105.99955 L 331.000038 100.999901 Z M 252.999693 112.000293 L 208.000523 119.999732 L 220.999611 225.00051 L 254.999553 218.999767 L 259.000436 218.999767 L 259.000436 179.000247 L 237.999582 178.000317 C 232.667011 177.333309 228.666127 175.333449 226.000424 171.999574 L 236.999652 166.999925 L 254.999553 162.000276 L 259.000436 159.000486 L 258.000506 114.000153 C 257.333498 112.000293 255.66656 111.333285 252.999693 112.000293 Z M 252.999693 112.000293";
const PATH_1_LEFT_KANJI =
  "M 141.499953 108.000574 L 152.500345 108.000574 L 162.499643 112.000293 L 165.999979 115.499465 C 166.53312 119.366482 165.366729 121.532802 162.499643 121.999591 L 148.499461 129.000264 L 119.999716 138.500179 C 125.932943 141.56632 130.933756 145.567203 134.999827 150.500501 C 136.733116 152.432845 137.400124 155.433798 136.999687 159.499869 L 134.999827 166.500542 L 131.000108 201.999796 L 150.500485 196.000217 L 161.499713 196.000217 L 169.999698 202.500343 L 167.500456 206.999445 L 149.500555 216.999908 L 138.500163 219.999697 L 132.999967 225.499893 C 130.799889 228.63355 130.132881 233.300277 131.000108 239.500074 L 132.000037 240.500004 L 132.49942 291.000534 L 159.499853 279.000212 L 180.000161 274.000563 L 177.499754 278.000282 L 114.49952 318.999733 L 77.499789 347.000095 L 70.50028 349.999885 L 65.499467 349.999885 C 54.766809 346.733525 46.599746 340.900407 40.99944 332.500531 C 40.333597 329.499578 40.832979 327.666179 42.499917 327.000335 L 54.500239 325.000475 L 74.499999 317.999803 L 104.500222 302.999692 L 113.000207 296.499566 L 113.000207 228.499682 L 111.49973 228.0003 L 110.4998 229.000229 L 85.500391 231.000089 C 84.366594 229.200448 81.699727 228.866362 77.499789 230.000159 L 66.000014 224.499963 L 74.499999 219.999697 L 107.500011 209.000469 L 113.000207 204.500203 C 111.333269 199.500554 111.000347 193.166889 112.000277 185.500372 L 111.000347 184.500443 L 111.000347 170.500261 L 110.000418 169.500331 L 110.000418 156.50008 L 109.000488 155.50015 L 109.000488 142.499898 L 108.000558 139.999492 L 78.499718 138.999562 L 66.000014 133.50053 L 71.50021 130.000194 Z M 141.499953 108.000574";
const PATH_2_SEAL_WITH_CUTOUTS =
  "M -0.0000099383 0.00000596 L 447.000045 0.00000596 L 447.000045 447.000061 L -0.0000099383 447.000061 Z M 336.999617 75.000562 L 321.999506 83.000001 L 278.000266 95.000322 L 232.000003 101.999831 L 231.000073 102.999761 L 208.000523 104.99962 L 206.999429 105.99955 L 175.000511 104.99962 L 174.000582 108.000574 L 182.99995 123.999451 L 185.999739 132.999983 L 186.999669 142.000516 L 189.999459 150.999884 L 192.000482 165.000065 L 202.99971 210.000399 L 202.99971 214.000118 L 208.000523 231.000089 L 209.000453 238.999527 L 213.000172 247.00013 L 215.999962 248.00006 L 217.999821 246.0002 L 220.999611 237.999598 L 225.000494 234.999808 L 232.000003 234.999808 L 238.999512 232.999949 L 254.999553 232.000019 L 255.999482 231.000089 L 259.000436 232.000019 L 259.000436 279.000212 L 215.000032 286.99965 L 210.000383 286.99965 L 205.9995 288.99951 L 206.999429 293.000393 C 211.666157 297.667121 218.333907 300.66691 227.000354 301.999762 L 249.999903 300.999832 L 250.999833 299.999902 L 259.000436 299.999902 L 259.000436 349.999885 L 248.000044 351.999744 L 225.000494 353.999604 L 218.999751 355.999464 L 196.000202 359.000417 L 189.999459 361.000277 L 183.99988 361.000277 L 182.99995 362.000207 L 177.000371 362.000207 L 176.000441 363.000136 L 153.999657 364.000066 L 144.000359 365.999926 C 141.333492 366.666934 140.333562 368.333871 141.00057 370.999908 L 159.00047 380.000107 L 169.999698 381.999967 L 183.99988 381.000037 L 214.000102 375.000458 L 219.999681 375.000458 L 247.000114 369.999645 L 261.000295 368.999715 L 262.000225 367.999785 L 276.000407 366.999856 L 277.000336 365.999926 L 283.999845 365.999926 L 284.999775 364.999996 L 315.999927 363.000136 L 316.999857 362.000207 L 360.000331 362.000207 L 361.000261 361.000277 L 387.99953 361.000277 L 388.99946 362.000207 L 402.999641 362.000207 L 409.000384 359.000417 L 409.000384 353.999604 L 404.999501 347.000095 C 400.332773 340.333509 393.666187 336.333789 384.99974 334.999774 L 377.000302 334.999774 L 363.00012 337.999563 L 354.999518 337.999563 L 337.999947 341.000516 L 329.000179 341.000516 L 319.999646 343.000376 L 296.000167 345.000236 L 281.999986 348.000025 C 278.000266 348.667033 276.000407 348.667033 276.000407 348.000025 L 276.000407 296.000183 L 324.00053 287.99958 L 331.000038 285.999721 L 333.999828 282.999931 L 332.999898 278.000282 L 327.000319 271.999539 L 320.999576 268.99975 C 317.666865 269.666758 315.667005 269.333836 314.999997 267.99982 L 302.999676 269.99968 L 280.000126 277.000352 L 278.000266 277.000352 L 278.000266 231.000089 L 281.999986 227.00037 L 315.999927 222.999486 L 322.999436 232.000019 L 326.000389 231.000089 C 331.999968 224.333502 336.999617 216.999908 341.000501 209.000469 L 368.999699 132.999983 L 377.000302 118.999802 L 387.99953 104.99962 L 386.9996 98.000112 L 380.000091 90.999439 L 354.999518 78.000351 L 347.000079 75.000562 Z M 142.0005 108.000574 L 71.999593 130.000194 L 66.000014 133.999913 L 79.000265 138.999562 L 108.000558 139.999492 L 109.000488 143.000445 L 109.000488 155.999533 L 110.000418 156.999463 L 110.000418 169.999714 L 111.000347 170.999644 L 111.000347 184.999825 L 112.000277 185.999755 C 111.333269 193.33335 111.666191 199.667015 113.000207 204.999586 L 108.000558 209.000469 L 75.000546 219.999697 L 66.000014 225.00051 L 78.000336 230.000159 C 82.000055 228.666143 84.666922 229.000229 85.999774 231.000089 L 111.000347 229.000229 L 112.000277 228.0003 L 113.000207 229.000229 L 113.000207 297.000113 L 104.999604 302.999692 L 75.000546 317.999803 L 54.999622 325.000475 L 43.000464 327.000335 C 40.99944 327.666179 40.333597 329.667203 40.99944 332.999914 C 46.333175 341.000516 54.6667 346.667173 66.000014 349.999885 L 70.999663 349.999885 L 78.000336 347.000095 L 115.000067 318.999733 L 178.000301 278.000282 L 180.000161 274.000563 L 160.0004 279.000212 L 132.999967 291.000534 L 132.000037 241.000551 L 131.000108 239.999457 C 130.3331 233.33287 131.000108 228.666143 132.999967 226.00044 L 138.999546 219.999697 L 149.999938 216.999908 L 167.999839 206.999445 L 169.999698 202.999726 L 162.00026 196.000217 L 150.999868 196.000217 L 131.000108 201.999796 L 134.999827 166.999925 L 136.999687 160.000416 C 137.666694 155.333689 136.999687 152.3339 134.999827 150.999884 C 131.000108 145.666149 126.000459 141.66643 119.999716 138.999562 L 149.000008 129.000264 L 163.00019 121.999591 C 165.667057 121.333747 166.666987 119.333888 165.999979 116.000012 L 163.00019 112.000293 L 152.999728 108.000574 Z M 142.0005 108.000574";
const PATH_3_RIGHT_WHITESPACE =
  "M 311.499661 99.999971 L 330.499491 100.999901 L 335.999687 105.500167 L 337.999947 112.499676 L 337.999947 135.50039 L 328.000249 185.500372 L 326.000389 189.500092 L 322.999436 204.500203 L 320.500193 208.000539 L 280.499509 215.000048 L 280.000126 177.49977 L 284.500392 173.999434 L 304.500152 167.999855 L 314.999997 161.499729 L 315.999927 155.50015 L 313.499521 151.999814 L 309.499801 149.999954 L 295.49962 149.999954 L 280.000126 152.999743 L 281.000056 140.500039 L 283.999845 131.499506 L 283.999845 124.499998 C 281.066407 117.767059 277.066688 112.100403 271.999523 107.500027 L 273.5 105.99955 L 279.499579 105.99955 L 285.500322 103.999691 L 310.499731 100.999901 Z M 252.50031 112.000293 C 255.500099 111.333285 257.333498 111.833832 258.000506 113.499606 L 259.000436 158.499939 L 254.50017 162.000276 L 236.500269 166.999925 L 226.000424 171.500191 C 228.599776 174.832902 232.433034 177.000387 237.500199 178.000317 L 259.000436 179.000247 L 259.000436 218.500384 C 259.000436 219.166228 257.499959 219.333853 254.50017 218.999767 L 220.999611 225.00051 L 208.000523 119.999732 Z M 252.50031 112.000293";

const ANIM_DELAY_MS = 1000;
const ANIM_DURATION_S = 3;

function staggerDelay(index: number, total: number, startPct: number, endPct: number) {
  const window = endPct - startPct;
  const step = total > 1 ? window / total : 0;
  const pathStart = startPct + step * index;
  const pathEnd = Math.min(1, pathStart + step * 1.4);
  const drawEnd = Math.min(1, pathStart + Math.min(step * 0.7, 0.18));
  return [
    [0, 0],
    [Math.max(0, pathStart - 0.001), 0],
    [pathStart, 0.02],
    [drawEnd, 1],
    [pathEnd, 1],
    [Math.min(1, pathEnd + 0.002), 0],
    [1, 0],
  ];
}

interface FillsByVariant {
  seal: string;
  kanji: string;
  sealStroke: string;
  kanjiStroke: string;
  wordmarkWord: string;
  wordmarkBorder: string;
  wordmarkDot: string;
}

function getFills(variant: LogoVariant): FillsByVariant {
  if (variant === "mono-dark") {
    return {
      seal: "#111111",
      kanji: "#FFFFFF",
      sealStroke: "#111111",
      kanjiStroke: "#FFFFFF",
      wordmarkWord: "#FFFFFF",
      wordmarkBorder: "rgba(255,255,255,0.35)",
      wordmarkDot: colors.gold,
    };
  }
  if (variant === "brand-red") {
    return {
      seal: colors.primarySoft ?? "rgba(198, 40, 40, 0.12)",
      kanji: colors.primary,
      sealStroke: "rgba(198, 40, 40, 0.35)",
      kanjiStroke: colors.primary,
      wordmarkWord: colors.primary,
      wordmarkBorder: colors.primary,
      wordmarkDot: colors.gold,
    };
  }
  if (variant === "brand-red-solid") {
    return {
      seal: colors.primary,
      kanji: "#FFFFFF",
      sealStroke: colors.primary,
      kanjiStroke: "#FFFFFF",
      wordmarkWord: colors.primary,
      wordmarkBorder: colors.primary,
      wordmarkDot: colors.gold,
    };
  }
  return {
    seal: "#FFFFFF",
    kanji: "#000000",
    sealStroke: "#FFFFFF",
    kanjiStroke: "#000000",
    wordmarkWord: colors.secondary,
    wordmarkBorder: colors.wood,
    wordmarkDot: colors.gold,
  };
}

export const LogoSvg: React.FC<LogoSvgProps> = ({
  size = 96,
  variant = "primary",
  withWordmark = false,
  animated = false,
  loop = false,
  delayMs = 0,
  style,
  testID,
  nativeID,
  noSealGlow = false,
}) => {
  const fills = getFills(variant);

  const pathSeq = [
    { d: PATH_2_SEAL_WITH_CUTOUTS, fill: fills.seal, stroke: fills.sealStroke, rule: "nonzero" as const, start: 0.02, end: 0.38, strokeW: 0.8 },
    { d: PATH_0_RIGHT_KANJI, fill: fills.kanji, stroke: fills.kanjiStroke, rule: "nonzero" as const, start: 0.22, end: 0.72, strokeW: 1 },
    { d: PATH_1_LEFT_KANJI, fill: fills.kanji, stroke: fills.kanjiStroke, rule: "nonzero" as const, start: 0.36, end: 0.82, strokeW: 1 },
    { d: PATH_3_RIGHT_WHITESPACE, fill: fills.seal, stroke: fills.sealStroke, rule: "nonzero" as const, start: 0.64, end: 0.94, strokeW: 0.6 },
  ];

  const showWordmark = withWordmark && variant !== "mark-only";
  const delayS = Math.max(0, delayMs) / 1000;

  if (animated && Platform.OS === "web") {
    try {
      const motion = require("framer-motion");
      const MotionSvg = motion.motion.svg;
      const MotionG = motion.motion.g;
      const MotionPath = motion.motion.path;

      const baseTransition = {
        duration: ANIM_DURATION_S,
        ease: "easeInOut",
        repeat: loop ? Infinity : 0,
        delay: delayS + ANIM_DELAY_MS / 1000,
      };

      return (
        <View nativeID={nativeID} style={[styles.container, style]} testID={testID}>
          <View style={[styles.svgWrap, { width: size, height: size }]}>
            <MotionSvg
              width="100%"
              height="100%"
              viewBox={`0 0 ${CANVAS} ${CANVAS}`}
              preserveAspectRatio="xMidYMid meet"
              initial={{ scale: 0.985 }}
              animate={{
                scale: loop
                  ? [0.985, 1, 1.01, 1, 0.985]
                  : [0.985, 1],
              }}
              transition={{
                ...baseTransition,
                times: loop
                  ? [0, 0.12, 0.55, 0.88, 1]
                  : [0, 1],
              }}
            >
              <MotionG style={{ transformOrigin: `${center}px ${center}px`, transformBox: "fill-box" as any }}>
                {pathSeq.map((p, i) => {
                  const drawT = staggerDelay(i, pathSeq.length, p.start, p.end);
                  const fillTimes = [
                    0,
                    drawT[1][0],
                    drawT[3][0],
                    drawT[4][0],
                    drawT[5][0],
                    1,
                  ];
                  const isSeal = i === 0;
                  const sealFillOpacity = noSealGlow ? 1 : 0.15;
                  const fillKey = isSeal && noSealGlow
                    ? [1, 1, 1, 1, 1, 1]
                    : [0, 0, sealFillOpacity, 1, 0.05, 0];
                  const strokeOpKey = drawT.map((t) => t[1]);
                  const strokeTimes = drawT.map((t) => t[0]);
                  const plKey = drawT.map((t) => t[1]);

                  return (
                    <React.Fragment key={`p-${i}`}>
                      <MotionPath
                        d={p.d}
                        fill="none"
                        stroke={p.stroke}
                        strokeWidth={p.strokeW}
                        strokeLinejoin="miter"
                        strokeLinecap="butt"
                        fillRule={p.rule}
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{
                          pathLength: plKey,
                          opacity: strokeOpKey,
                        }}
                        transition={{
                          duration: ANIM_DURATION_S,
                          ease: "easeInOut",
                          times: strokeTimes,
                          repeat: loop ? Infinity : 0,
                          delay: delayS + ANIM_DELAY_MS / 1000,
                        }}
                      />
                      <MotionPath
                        d={p.d}
                        fill={p.fill}
                        fillRule={p.rule}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: fillKey }}
                        transition={{
                          duration: ANIM_DURATION_S,
                          ease: [0.22, 1, 0.36, 1],
                          times: fillTimes,
                          repeat: loop ? Infinity : 0,
                          delay: delayS + ANIM_DELAY_MS / 1000,
                        }}
                      />
                    </React.Fragment>
                  );
                })}
              </MotionG>
            </MotionSvg>
          </View>

          {showWordmark && (
            <View
              style={[
                styles.wordmarkRow,
                {
                  marginTop: Math.max(4, size * 0.06),
                  paddingHorizontal: Math.max(6, size * 0.1),
                  paddingVertical: Math.max(4, size * 0.05),
                  borderColor: fills.wordmarkBorder,
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
                    color: fills.wordmarkWord,
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
                  backgroundColor: fills.wordmarkDot,
                  marginHorizontal: Math.max(4, size * 0.06),
                }}
              />
              <Text
                style={[
                  styles.wordmarkText,
                  {
                    fontSize: Math.max(10, size * 0.18),
                    letterSpacing: Math.max(1.2, size * 0.04),
                    color: fills.wordmarkWord,
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
    } catch (_) {}
  }

  if (animated && Platform.OS !== "web") {
    try {
      const RNSvg = require("react-native-svg");
      const Animated = require("react-native").Animated;
      const Svg = RNSvg.default;
      const Path = RNSvg.Path;
      const G = RNSvg.G;
      const Defs = RNSvg.Defs;
      const AnimatedPath = Animated.createAnimatedComponent(Path);
      const AnimatedG = Animated.createAnimatedComponent(G);

      const refs = React.useMemo(() => {
        const arr: {
          pl: any;
          strokeOp: any;
          fillOp: any;
        }[] = [];
        for (let i = 0; i < 4; i++) {
          arr.push({
            pl: new Animated.Value(0),
            strokeOp: new Animated.Value(0),
            fillOp: new Animated.Value(0),
          });
        }
        return arr;
      }, []);
      const overallScale = React.useMemo(() => new Animated.Value(0.985), []);

      React.useEffect(() => {
        const durMs = ANIM_DURATION_S * 1000;
        const Easing = require("react-native").Easing;
        const makeSeqForIndex = (i: number) => {
          const total = 4;
          const startPct = pathSeq[i].start;
          const endPct = pathSeq[i].end;
          const window = endPct - startPct;
          const step = total > 1 ? window / total : 0;
          const pathStart = startPct + step * i;
          const drawEnd = Math.min(1, pathStart + Math.min(step * 0.7, 0.18));
          const fillEnd = Math.min(1, drawEnd + 0.04);
          const holdEnd = endPct;

          const startDelay = Math.floor(pathStart * durMs);
          const drawDur = Math.max(120, Math.floor((drawEnd - pathStart) * durMs));
          const fillDur = Math.max(100, Math.floor((fillEnd - drawEnd) * durMs));
          const holdDur = Math.max(100, Math.floor((holdEnd - fillEnd) * durMs));
          const tailDur = Math.max(80, Math.floor((1 - holdEnd) * durMs));

          const isSeal = i === 0;
          const sealSkip = isSeal && noSealGlow;

          return Animated.sequence([
            Animated.delay(startDelay),
            Animated.parallel([
              sealSkip ? Animated.delay(0) : Animated.timing(refs[i].strokeOp, { toValue: 1, duration: 30, easing: Easing.linear, useNativeDriver: false }),
              Animated.timing(refs[i].pl, { toValue: 0.05, duration: 20, easing: Easing.linear, useNativeDriver: false }),
            ]),
            Animated.parallel([
              Animated.timing(refs[i].pl, { toValue: 1, duration: drawDur, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
            ]),
            Animated.parallel([
              sealSkip ? Animated.delay(0) : Animated.timing(refs[i].fillOp, { toValue: 1, duration: fillDur, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
            ]),
            Animated.delay(holdDur),
            Animated.parallel([
              sealSkip ? Animated.delay(0) : Animated.timing(refs[i].strokeOp, { toValue: 0, duration: tailDur, easing: Easing.linear, useNativeDriver: false }),
              sealSkip ? Animated.delay(0) : Animated.timing(refs[i].fillOp, { toValue: 0, duration: tailDur, easing: Easing.linear, useNativeDriver: false }),
            ]),
          ]);
        };

        const animBase = Animated.parallel([
          Animated.parallel([makeSeqForIndex(0), makeSeqForIndex(1), makeSeqForIndex(2), makeSeqForIndex(3)]),
          Animated.sequence([
            Animated.delay(Math.floor(0.02 * durMs)),
            Animated.timing(overallScale, { toValue: 1, duration: Math.floor(0.12 * durMs), easing: Easing.back(1.4), useNativeDriver: false }),
            Animated.delay(Math.floor(0.42 * durMs)),
            Animated.timing(overallScale, { toValue: loop ? 1.01 : 1, duration: Math.floor(0.22 * durMs), easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
            Animated.delay(Math.floor(0.08 * durMs)),
            Animated.timing(overallScale, { toValue: 0.985, duration: Math.floor(0.14 * durMs), easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
          ]),
        ]);

        const total = Animated.sequence([
          Animated.delay(ANIM_DELAY_MS + delayMs),
          loop
            ? Animated.loop(animBase as any, { iterations: -1 })
            : (animBase as any),
        ]);

        if (noSealGlow) {
          refs[0].fillOp.setValue(1);
          refs[0].strokeOp.setValue(0);
        }

        total.start();
        return () => {
          try {
            total.stop();
          } catch (_) {}
        };
      }, [refs, overallScale, loop, delayMs]);

      const scaleI = overallScale.interpolate({ inputRange: [0.9, 1.1], outputRange: [0.9, 1.1] });

      return (
        <View nativeID={nativeID} style={[styles.container, style]} testID={testID}>
          <View style={[styles.svgWrap, { width: size, height: size }]}>
            <Svg width="100%" height="100%" viewBox={`0 0 ${CANVAS} ${CANVAS}`} preserveAspectRatio="xMidYMid meet">
              <Defs />
              <AnimatedG style={{ transform: [{ scale: scaleI }], transformOrigin: `${center} ${center}` }}>
                {pathSeq.map((p, i) => (
                  <React.Fragment key={`np-${i}`}>
                    <AnimatedPath
                      d={p.d}
                      fill="none"
                      stroke={p.stroke}
                      strokeWidth={p.strokeW}
                      strokeLinejoin="miter"
                      strokeLinecap="butt"
                      fillRule={p.rule}
                      strokeDasharray={[CANVAS * 4]}
                      strokeDashoffset={refs[i].pl.interpolate({
                        inputRange: [0, 1],
                        outputRange: [CANVAS * 4, 0],
                      })}
                      opacity={refs[i].strokeOp}
                    />
                    <AnimatedPath
                      d={p.d}
                      fill={p.fill}
                      fillRule={p.rule}
                      opacity={refs[i].fillOp}
                    />
                  </React.Fragment>
                ))}
              </AnimatedG>
            </Svg>
          </View>

          {showWordmark && (
            <View
              style={[
                styles.wordmarkRow,
                {
                  marginTop: Math.max(4, size * 0.06),
                  paddingHorizontal: Math.max(6, size * 0.1),
                  paddingVertical: Math.max(4, size * 0.05),
                  borderColor: fills.wordmarkBorder,
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
                    color: fills.wordmarkWord,
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
                  backgroundColor: fills.wordmarkDot,
                  marginHorizontal: Math.max(4, size * 0.06),
                }}
              />
              <Text
                style={[
                  styles.wordmarkText,
                  {
                    fontSize: Math.max(10, size * 0.18),
                    letterSpacing: Math.max(1.2, size * 0.04),
                    color: fills.wordmarkWord,
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
    } catch (_) {}
  }

  return (
    <View style={[styles.container, style]} testID={testID}>
      <View style={[styles.svgWrap, { width: size, height: size }]}>
        <SvgWrapper width="100%" height="100%" viewBox={`0 0 ${CANVAS} ${CANVAS}`} preserveAspectRatio="xMidYMid meet">
          {pathSeq.map((p, i) => (
            <PathWrapper key={`sp-${i}`} d={p.d} fill={p.fill} fillRule={p.rule} />
          ))}
        </SvgWrapper>
      </View>

      {showWordmark && (
        <View
          style={[
            styles.wordmarkRow,
            {
              marginTop: Math.max(4, size * 0.06),
              paddingHorizontal: Math.max(6, size * 0.1),
              paddingVertical: Math.max(4, size * 0.05),
              borderColor: fills.wordmarkBorder,
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
                color: fills.wordmarkWord,
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
              backgroundColor: fills.wordmarkDot,
              marginHorizontal: Math.max(4, size * 0.06),
            }}
          />
          <Text
            style={[
              styles.wordmarkText,
              {
                fontSize: Math.max(10, size * 0.18),
                letterSpacing: Math.max(1.2, size * 0.04),
                color: fills.wordmarkWord,
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

function SvgWrapper(props: any) {
  try {
    const Svg = require("react-native-svg").default;
    return <Svg {...props} />;
  } catch (_) {
    return <svg {...props}>{props.children}</svg>;
  }
}

function PathWrapper(props: any) {
  try {
    const Path = require("react-native-svg").Path;
    return <Path {...props} />;
  } catch (_) {
    return <path {...props} />;
  }
}

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
