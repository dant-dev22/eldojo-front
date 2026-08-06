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

const staggerDelay = (index: number, total: number, startPct: number, endPct: number) => {
  const windowPct = endPct - startPct;
  const step = windowPct / Math.max(1, total - 1);
  const at = startPct + step * index;
  const before = Math.max(0, at - 0.0001);
  return [
    [0, 0],
    [before, 0],
    [at, 1],
    [Math.min(1, at + windowPct * 0.5), 1],
    [1, 1],
  ];
};

const CANVAS = 447;

const PATH_0_RIGHT_KANJI =
  "M 336.500234 75.000562 L 346.499533 75.000562 L 354.500135 78.000351 L 379.499544 90.999439 L 386.9996 97.499565 L 387.99953 104.500238 L 377.000302 118.500419 L 368.999699 132.499436 L 341.000501 208.499922 C 336.933266 217.100017 331.767156 224.600073 325.499842 231.000089 L 322.500053 232.000019 L 315.500544 222.999486 L 281.499439 227.00037 L 278.000266 230.499542 L 278.000266 276.499805 L 279.499579 277.000352 L 302.500293 269.99968 L 314.49945 267.99982 C 315.366677 269.466539 317.366537 269.799461 320.500193 268.99975 L 326.499772 271.999539 L 332.999898 277.499735 L 333.999828 282.500548 L 330.499491 285.999721 L 323.499983 287.99958 L 276.000407 296.000183 L 276.000407 347.499478 C 276.066758 348.232838 277.900157 348.400463 281.499439 348.000025 L 295.49962 345.000236 L 319.500264 343.000376 L 328.499632 341.000516 L 337.500164 341.000516 L 354.500135 337.999563 L 362.499574 337.999563 L 376.499755 334.999774 L 384.500357 334.999774 C 393.699945 336.532844 400.532992 340.366102 404.999501 346.499548 L 409.000384 353.500221 L 409.000384 358.49987 L 402.500258 362.000207 L 388.500077 362.000207 L 387.500147 361.000277 L 360.499714 361.000277 L 359.499784 362.000207 L 316.500474 362.000207 L 315.500544 363.000136 L 284.500392 364.999996 L 283.500462 365.999926 L 276.49979 365.999926 L 275.49986 366.999856 L 261.499678 367.999785 L 260.499749 368.999715 L 246.499567 369.999645 L 219.500298 375.000458 L 213.499555 375.000458 L 183.500497 381.000037 L 169.500316 381.999967 L 158.499924 380.000107 L 141.00057 370.999575 C 140.533781 368.466575 141.36725 366.799637 143.499812 365.999926 L 153.500274 364.000066 L 175.499894 363.000136 L 176.499824 362.000207 L 182.500567 362.000207 L 183.500497 361.000277 L 189.500076 361.000277 L 195.499655 359.000417 L 218.500368 355.999464 L 224.499947 353.999604 L 247.499497 351.999744 L 259.000436 349.999885 L 259.000436 300.500449 L 258.499889 299.999902 L 250.50045 299.999902 L 249.500521 300.999832 L 226.499807 301.999762 C 218.30015 300.533043 211.800024 297.366792 206.999429 292.499846 L 205.9995 288.99951 L 209.499836 286.99965 L 214.499485 286.99965 L 259.000436 279.000212 L 259.000436 231.499472 L 255.500099 231.000089 L 254.50017 232.000019 L 238.500129 232.999949 L 231.499456 234.999808 L 224.499947 234.999808 L 220.999611 237.500215 L 217.999821 245.499653 L 215.500579 248.00006 L 213.000172 246.499583 L 209.000453 238.500145 L 208.000523 230.499542 L 202.99971 213.499571 L 202.99971 209.499852 L 192.000482 164.499518 L 189.999459 150.500501 L 186.999669 141.499969 L 185.999739 132.499436 L 182.99995 123.500068 L 174.000582 107.500027 L 175.000511 104.99962 L 206.500047 105.99955 L 207.499976 104.99962 L 230.499526 102.999761 L 231.499456 101.999831 L 277.499719 95.000322 L 321.500123 83.000001 Z M 312.000208 99.999971 L 311.000278 100.999901 L 285.999705 103.999691 L 280.000126 105.99955 L 274.000547 105.99955 L 271.999523 108.000574 C 277.333258 112.000293 281.332978 117.66695 283.999845 125.000545 L 283.999845 132.000053 L 281.000056 140.999422 L 280.000126 152.999743 L 296.000167 149.999954 L 310.000348 149.999954 L 314.000068 151.999814 L 315.999927 155.999533 L 314.999997 162.000276 L 304.999535 167.999855 L 284.999775 173.999434 L 280.000126 178.000317 L 281.000056 215.000048 L 320.999576 208.000539 L 322.999436 204.999586 L 326.000389 189.999475 L 328.000249 185.999755 L 337.999547 135.999773 L 337.999547 113.000223 L 335.999687 105.99955 L 331.000038 100.999901 Z M 252.999693 112.000293 L 208.000523 119.999732 L 220.999611 225.00051 L 254.999553 218.999767 L 259.000436 218.999767 L 259.000436 179.000247 L 237.999582 178.000317 C 232.667011 177.333309 228.666127 175.333449 226.000424 171.999574 L 236.999652 166.999925 L 254.999553 162.000276 L 259.000436 159.000486 L 258.000506 114.000153 C 257.333498 112.000293 255.66656 111.333285 252.999693 112.000293 Z";

const PATH_1_LEFT_KANJI =
  "M 141.499953 108.000574 L 152.500345 108.000574 L 162.499643 112.000293 L 165.999979 115.499465 C 166.53312 119.366482 165.366729 121.532802 162.499643 121.999591 L 148.499461 129.000264 L 119.999716 138.500179 C 125.932943 141.56632 130.933756 145.567203 134.999827 150.500501 C 136.733116 152.432845 137.400124 155.433798 136.999687 159.499869 L 134.999827 166.500542 L 131.000108 201.999796 L 150.500485 196.000217 L 161.499713 196.000217 L 169.999698 202.500343 L 167.500456 206.999445 L 149.500555 216.999908 L 138.500163 219.999697 L 132.999967 225.499893 C 130.799889 228.63355 130.132881 233.300277 131.000108 239.500074 L 132.000037 240.500004 L 132.49942 291.000534 L 159.499853 279.000212 L 180.000161 274.000563 L 177.499754 278.000282 L 114.49952 318.999733 L 77.499789 347.000095 L 70.50028 349.999885 L 65.499467 349.999885 C 54.766809 346.733525 46.599746 340.900407 40.99944 332.500531 C 40.333597 329.499578 40.832979 327.666179 42.499917 327.000335 L 54.500239 325.000475 L 74.499999 317.999803 L 104.500222 302.999692 L 113.000207 296.499566 L 113.000207 228.499682 L 111.49973 228.0003 L 110.4998 229.000229 L 85.500391 231.000089 C 84.366594 229.200448 81.699727 228.866362 77.499789 230.000159 L 66.000014 224.499963 L 74.499999 219.999697 L 107.500011 209.000469 L 113.000207 204.500203 C 111.333269 199.500554 111.000347 193.166889 112.000277 185.500372 L 111.000347 184.500443 L 111.000347 170.500261 L 110.000418 169.500331 L 110.000418 156.50008 L 109.000488 155.50015 L 109.000488 142.499898 L 108.000558 139.999492 L 78.499718 138.999562 L 66.000014 133.50053 L 71.50021 130.000194 Z";

const PATH_2_SEAL_SQUARE_WITH_KANJI_CUTOUTS =
  "M -0.0000099383 0.00000596 L 447.000045 0.00000596 L 447.000045 447.000061 L -0.0000099383 447.000061 Z M 336.999617 75.000562 L 321.999506 83.000001 L 278.000266 95.000322 L 232.000003 101.999831 L 231.000073 102.999761 L 208.000523 104.99962 L 206.999429 105.99955 L 175.000511 104.99962 L 174.000582 108.000574 L 182.99995 123.999451 L 185.999739 132.999983 L 186.999669 142.000516 L 189.999459 150.999884 L 192.000482 165.000065 L 202.99971 210.000399 L 202.99971 214.000118 L 208.000523 231.000089 L 209.000453 238.999527 L 213.000172 247.00013 L 215.999962 248.00006 L 217.999821 246.0002 L 220.999611 237.999598 L 225.000494 234.999808 L 232.000003 234.999808 L 238.999512 232.999949 L 254.999553 232.000019 L 255.999482 231.000089 L 259.000436 232.000019 L 259.000436 279.000212 L 215.000032 286.99965 L 210.000383 286.99965 L 205.9995 288.99951 L 206.999429 293.000393 C 211.666157 297.667121 218.333907 300.66691 227.000354 301.999762 L 249.999903 300.999832 L 250.999833 299.999902 L 259.000436 299.999902 L 259.000436 349.999885 L 248.000044 351.999744 L 225.000494 353.999604 L 218.999751 355.999464 L 196.000202 359.000417 L 189.999459 361.000277 L 183.99988 361.000277 L 182.99995 362.000207 L 177.000371 362.000207 L 176.000441 363.000136 L 153.999657 364.000066 L 144.000359 365.999926 C 141.333492 366.666934 140.333562 368.333871 141.00057 370.999575 L 159.00047 380.000107 L 169.999698 381.999967 L 183.99988 381.000037 L 214.000102 375.000458 L 219.999681 375.000458 L 247.000114 369.999645 L 261.000295 368.999715 L 262.000225 367.999785 L 276.000407 366.999856 L 277.000336 365.999926 L 283.999845 365.999926 L 284.999775 364.999996 L 315.999927 363.000136 L 316.999857 362.000207 L 360.000331 362.000207 L 361.000261 361.000277 L 387.99953 361.000277 L 388.99946 362.000207 L 402.999641 362.000207 L 409.000384 359.000417 L 409.000384 353.999604 L 404.999501 347.000095 C 400.332773 340.333509 393.666187 336.333789 384.99974 334.999774 L 377.000302 334.999774 L 363.00012 337.999563 L 354.999518 337.999563 L 337.999547 341.000516 L 329.000179 341.000516 L 319.999646 343.000376 L 296.000167 345.000236 L 281.999986 348.000025 C 278.000266 348.667033 276.000407 348.667033 276.000407 348.000025 L 276.000407 296.000183 L 324.00053 287.99958 L 331.000038 285.999721 L 333.999828 282.999931 L 332.999898 278.000282 L 327.000319 271.999539 L 320.999576 268.99975 C 317.666865 269.666758 315.667005 269.333836 314.999997 267.99982 L 302.999676 269.99968 L 280.000126 277.000352 L 278.000266 277.000352 L 278.000266 231.000089 L 281.999986 227.00037 L 315.999927 222.999486 L 322.999436 232.000019 L 326.000389 231.000089 C 331.999968 224.333502 336.999617 216.999908 341.000501 209.000469 L 368.999699 132.999983 L 377.000302 118.999802 L 387.99953 104.99962 L 386.9996 98.000112 L 380.000091 90.999439 L 354.999518 78.000351 L 347.000079 75.000562 Z M 142.0005 108.000574 L 71.999593 130.000194 L 66.000014 133.999913 L 79.000265 138.999562 L 108.000558 139.999492 L 109.000488 143.000445 L 109.000488 155.999533 L 110.000418 156.999463 L 110.000418 169.999714 L 111.000347 170.999644 L 111.000347 184.999825 L 112.000277 185.999755 C 111.333269 193.33335 111.666191 199.667015 113.000207 204.999586 L 108.000558 209.000469 L 75.000546 219.999697 L 66.000014 225.00051 L 78.000336 230.000159 C 82.000055 228.666143 84.666922 229.000229 85.999774 231.000089 L 111.000347 229.000229 L 112.000277 228.0003 L 113.000207 229.000229 L 113.000207 297.000113 L 104.999604 302.999692 L 75.000546 317.999803 L 54.999622 325.000475 L 43.000464 327.000335 C 40.99944 327.666179 40.333597 329.667203 40.99944 332.999914 C 46.333175 341.000516 54.6667 346.667173 66.000014 349.999885 L 70.999663 349.999885 L 78.000336 347.000095 L 115.000067 318.999733 L 178.000301 278.000282 L 180.000161 274.000563 L 160.0004 279.000212 L 132.999967 291.000534 L 132.000037 241.000551 L 131.000108 239.999457 C 130.3331 233.33287 131.000108 228.666143 132.999967 226.00044 L 138.999546 219.999697 L 149.999938 216.999908 L 167.999839 206.999445 L 169.999698 202.999726 L 162.00026 196.000217 L 150.999868 196.000217 L 131.000108 201.999796 L 134.999827 166.999925 L 136.999687 160.000416 C 137.666694 155.333689 136.999687 152.3339 134.999827 150.999884 C 131.000108 145.666149 126.000459 141.66643 119.999716 138.999562 L 149.000008 129.000264 L 163.00019 121.999591 C 165.667057 121.333747 166.666987 119.333888 165.999979 116.000012 L 163.00019 112.000293 L 152.999728 108.000574 Z";

const PATH_3_RIGHT_KANJI_INNER_WHITESPACE =
  "M 311.499661 99.999971 L 330.499491 100.999901 L 335.999687 105.500167 L 337.999547 112.499676 L 337.999547 135.50039 L 328.000249 185.500372 L 326.000389 189.500092 L 322.999436 204.500203 L 320.500193 208.000539 L 280.499509 215.000048 L 280.000126 177.49977 L 284.500392 173.999434 L 304.500152 167.999855 L 314.999997 161.499729 L 315.999927 155.50015 L 313.499521 151.999814 L 309.499801 149.999954 L 295.49962 149.999954 L 280.000126 152.999743 L 281.000056 140.500039 L 283.999845 131.499506 L 283.999845 124.499998 C 281.066407 117.767059 277.066688 112.100403 271.999523 107.500027 L 273.5 105.99955 L 279.499579 105.99955 L 285.500322 103.999691 L 310.499731 100.999901 Z M 252.50031 112.000293 C 255.500099 111.333285 257.333498 111.833832 258.000506 113.499606 L 259.000436 158.499939 L 254.50017 162.000276 L 236.500269 166.999925 L 226.000424 171.500191 C 228.599776 174.832902 232.433034 177.000387 237.500199 178.000317 L 259.000436 179.000247 L 259.000436 218.500384 C 259.000436 219.166228 257.499959 219.333853 254.50017 218.999767 L 220.999611 225.00051 L 208.000523 119.999732 Z";

const GOLD_CORNER_PATHS = [
  "M 32 16 L 56 16 L 56 40",
  "M 415 16 L 391 16 L 391 40",
  "M 32 431 L 56 431 L 56 407",
  "M 415 431 L 391 431 L 391 407",
];

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

  const center = CANVAS / 2;

  if (Platform.OS === "web") {
    const motion = require("framer-motion");
    const MotionSvg = motion.motion.svg;
    const MotionPath = motion.motion.path;
    const MotionG = motion.motion.g;
    const MotionRect = motion.motion.rect;

    const pathSeq = [
      { d: PATH_2_SEAL_SQUARE_WITH_KANJI_CUTOUTS, fill: "url(#aph-sealGrad)", rule: "nonzero", start: 0.0, end: 0.16 },
      { d: PATH_0_RIGHT_KANJI, fill: "#FFFFFF", rule: "nonzero", start: 0.18, end: 0.50 },
      { d: PATH_1_LEFT_KANJI, fill: "#FFFFFF", rule: "nonzero", start: 0.32, end: 0.60 },
      { d: PATH_3_RIGHT_KANJI_INNER_WHITESPACE, fill: "#FFFFFF", rule: "nonzero", start: 0.56, end: 0.72 },
    ];

    return (
      <View style={styles.root} testID={testID}>
        <View style={[styles.logoFrame, { width: logoSize, height: logoSize }]}>
          <MotionSvg
            viewBox={`0 0 ${CANVAS} ${CANVAS}`}
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
              <radialGradient id="aph-innerShine" cx="30%" cy="25%" r="75%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.18" />
                <stop offset="65%" stopColor="#FFFFFF" stopOpacity="0" />
              </radialGradient>
              <clipPath id="aph-sealRounded">
                <rect x="0" y="0" width={CANVAS} height={CANVAS} rx="58" ry="58" />
              </clipPath>
              <filter id="aph-softShadow" x="-10%" y="-10%" width="120%" height="120%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="3.4" result="blur" />
                <feOffset dx="0" dy="5" result="off" />
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
              style={{
                transformOrigin: `${center}px ${center}px`,
                transformBox: "fill-box",
                filter: "url(#aph-softShadow)",
              }}
              animate={{
                scale: [0.88, 0.88, 1, 1, 1.012, 1.012, 1.028, 1.028, 1],
                y: [0, 0, 0, 0, 0, 0, -3.5, -3.5, 0],
                rotate: [0, 0, 0, 0, 0, 0, -0.25, -0.25, 0],
              }}
              transition={{
                ...BASE_TRANSITION,
                times: [0, 0.05, 0.08, 0.68, 0.76, 0.82, 0.88, 0.94, 1],
              }}
            >
              <MotionG clipPath="url(#aph-sealRounded)">
                {pathSeq.map((p, i) => {
                  const timing = staggerDelay(0, 1, p.start, p.end);
                  return (
                    <MotionPath
                      key={`p-${i}`}
                      d={p.d}
                      fill={p.fill}
                      fillRule={p.rule}
                      initial={{ opacity: 0, scale: 0.97 }}
                      style={{ transformOrigin: `${center}px ${center}px`, transformBox: "fill-box" }}
                      animate={{
                        opacity: timing.map((t) => t[1]),
                        scale: timing.map((t) => 0.97 + t[1] * 0.03),
                      }}
                      transition={{
                        ...BASE_TRANSITION,
                        times: timing.map((t) => t[0]),
                      }}
                    />
                  );
                })}

                <MotionRect
                  x="0"
                  y="0"
                  width={CANVAS}
                  height={CANVAS}
                  fill="url(#aph-innerShine)"
                  rx="58"
                  ry="58"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0, 0.85, 0.95, 0.7] }}
                  transition={{
                    ...BASE_TRANSITION,
                    times: [0, 0.08, 0.22, 0.55, 1],
                  }}
                />
              </MotionG>

              <MotionG opacity={0.9} fill="none" stroke="url(#aph-goldGrad)" strokeWidth={2.5} strokeLinecap="round">
                {GOLD_CORNER_PATHS.map((d, i) => {
                  const timing = staggerDelay(i, 4, 0.12, 0.28);
                  return (
                    <MotionPath
                      key={`corner-${i}`}
                      d={d}
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{
                        pathLength: timing.map((t) => t[1]),
                        opacity: timing.map((t) => t[1]),
                      }}
                      transition={{
                        ...BASE_TRANSITION,
                        times: timing.map((t) => t[0]),
                      }}
                    />
                  );
                })}
              </MotionG>

              <MotionG fill="url(#aph-goldGrad)">
                {[
                  { cx: center, cy: 14 },
                  { cx: center, cy: CANVAS - 14 },
                  { cx: 14, cy: center },
                  { cx: CANVAS - 14, cy: center },
                ].map((c, i) => (
                  <MotionPath
                    key={`dot-${i}`}
                    d={`M ${c.cx} ${c.cy - 5.5} a 5.5 5.5 0 1 0 0 11 a 5.5 5.5 0 1 0 0 -11 Z`}
                    initial={{ opacity: 0, scale: 0 }}
                    style={{ transformOrigin: `${c.cx}px ${c.cy}px`, transformBox: "fill-box" }}
                    animate={{
                      opacity: [0, 0, 0.95, 0.95, 0.95],
                      scale: [0, 0, 1, 1.5, 1],
                    }}
                    transition={{
                      ...BASE_TRANSITION,
                      times: [0, 0.55, 0.64, 0.72, 1],
                      repeatDelay: 0.15,
                      delay: BASE_TRANSITION.delay + i * 0.06,
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
const SvgPath = require("react-native-svg").Path as any;
const SvgG = require("react-native-svg").G as any;
const SvgDefs = require("react-native-svg").Defs as any;
const SvgLinearGradient = require("react-native-svg").LinearGradient as any;
const SvgRadialGradient = require("react-native-svg").RadialGradient as any;
const SvgStop = require("react-native-svg").Stop as any;
const SvgClipPath = require("react-native-svg").ClipPath as any;
const SvgRect = require("react-native-svg").Rect as any;
const SvgCircle = require("react-native-svg").Circle as any;

const AnimatedPath = NativeAnimated.createAnimatedComponent(SvgPath);
const AnimatedG = NativeAnimated.createAnimatedComponent(SvgG);
const AnimatedRect = NativeAnimated.createAnimatedComponent(SvgRect);
const AnimatedCircle = NativeAnimated.createAnimatedComponent(SvgCircle);

const NativeAnimatedLogo: React.FC<NativeProps> = ({ logoSize, headlineSize, viewportWidth, testID }) => {
  const overallScale = useRef(new NativeAnimated.Value(0.88)).current;
  const overallY = useRef(new NativeAnimated.Value(0)).current;
  const overallRot = useRef(new NativeAnimated.Value(0)).current;

  const sealOpacity = useRef(new NativeAnimated.Value(0)).current;
  const sealScale = useRef(new NativeAnimated.Value(0.97)).current;
  const shineOpacity = useRef(new NativeAnimated.Value(0)).current;
  const path0 = useRef(new NativeAnimated.Value(0)).current;
  const path1 = useRef(new NativeAnimated.Value(0)).current;
  const path2 = useRef(new NativeAnimated.Value(0)).current;
  const path3 = useRef(new NativeAnimated.Value(0)).current;

  const corner = useRef([0, 1, 2, 3].map(() => new NativeAnimated.Value(0))).current;
  const dots = useRef([0, 1, 2, 3].map(() => new NativeAnimated.Value(0))).current;
  const dotScale = useRef([0, 1, 2, 3].map(() => new NativeAnimated.Value(0))).current;

  const buildLoop = () => {
    const sealShow = NativeAnimated.parallel([
      NativeAnimated.timing(overallScale, {
        toValue: 1,
        duration: 280,
        easing: NativeEasing.out(NativeEasing.back(1.3)),
        useNativeDriver: false,
      }),
      NativeAnimated.timing(sealOpacity, { toValue: 1, duration: 200, easing: NativeEasing.linear, useNativeDriver: false }),
      NativeAnimated.timing(sealScale, { toValue: 1, duration: 240, easing: NativeEasing.out(NativeEasing.cubic), useNativeDriver: false }),
    ]);
    const shineFade = NativeAnimated.timing(shineOpacity, {
      toValue: 0.9,
      duration: 340,
      easing: NativeEasing.linear,
      useNativeDriver: false,
    });
    const corners = NativeAnimated.parallel(
      corner.map((val, i) =>
        NativeAnimated.sequence([
          NativeAnimated.delay(80 + 60 * i),
          NativeAnimated.timing(val, {
            toValue: 1,
            duration: 280,
            easing: NativeEasing.out(NativeEasing.cubic),
            useNativeDriver: false,
          }),
        ])
      )
    );
    const pathsShow = NativeAnimated.sequence([
      NativeAnimated.timing(path0, { toValue: 1, duration: 480, easing: NativeEasing.out(NativeEasing.cubic), useNativeDriver: false }),
      NativeAnimated.parallel([
        NativeAnimated.timing(path1, { toValue: 1, duration: 480, easing: NativeEasing.out(NativeEasing.cubic), useNativeDriver: false }),
        NativeAnimated.sequence([
          NativeAnimated.delay(160),
          NativeAnimated.timing(path2, { toValue: 1, duration: 480, easing: NativeEasing.out(NativeEasing.cubic), useNativeDriver: false }),
        ]),
        NativeAnimated.sequence([
          NativeAnimated.delay(400),
          NativeAnimated.timing(path3, { toValue: 1, duration: 360, easing: NativeEasing.out(NativeEasing.cubic), useNativeDriver: false }),
        ]),
      ]),
    ]);
    const dotsShow = NativeAnimated.parallel(
      dots.map((val, i) =>
        NativeAnimated.sequence([
          NativeAnimated.delay(30 * i),
          NativeAnimated.parallel([
            NativeAnimated.timing(val, { toValue: 0.95, duration: 220, easing: NativeEasing.linear, useNativeDriver: false }),
            NativeAnimated.sequence([
              NativeAnimated.timing(dotScale[i], { toValue: 1.5, duration: 240, easing: NativeEasing.out(NativeEasing.quad), useNativeDriver: false }),
              NativeAnimated.timing(dotScale[i], { toValue: 1, duration: 300, easing: NativeEasing.inOut(NativeEasing.quad), useNativeDriver: false }),
            ]),
          ]),
        ])
      )
    );
    const breathe = NativeAnimated.sequence([
      NativeAnimated.parallel([
        NativeAnimated.timing(overallScale, { toValue: 1.028, duration: 480, easing: NativeEasing.inOut(NativeEasing.sin), useNativeDriver: false }),
        NativeAnimated.timing(overallY, { toValue: -3.5, duration: 480, easing: NativeEasing.inOut(NativeEasing.sin), useNativeDriver: false }),
        NativeAnimated.timing(overallRot, { toValue: -0.25, duration: 480, easing: NativeEasing.inOut(NativeEasing.sin), useNativeDriver: false }),
      ]),
      NativeAnimated.parallel([
        NativeAnimated.timing(overallScale, { toValue: 1, duration: 480, easing: NativeEasing.inOut(NativeEasing.sin), useNativeDriver: false }),
        NativeAnimated.timing(overallY, { toValue: 0, duration: 480, easing: NativeEasing.inOut(NativeEasing.sin), useNativeDriver: false }),
        NativeAnimated.timing(overallRot, { toValue: 0, duration: 480, easing: NativeEasing.inOut(NativeEasing.sin), useNativeDriver: false }),
      ]),
    ]);
    const reset = NativeAnimated.parallel([
      NativeAnimated.timing(overallScale, { toValue: 0.88, duration: 1, useNativeDriver: false }),
      NativeAnimated.timing(overallY, { toValue: 0, duration: 1, useNativeDriver: false }),
      NativeAnimated.timing(overallRot, { toValue: 0, duration: 1, useNativeDriver: false }),
      NativeAnimated.timing(sealOpacity, { toValue: 0, duration: 1, useNativeDriver: false }),
      NativeAnimated.timing(sealScale, { toValue: 0.97, duration: 1, useNativeDriver: false }),
      NativeAnimated.timing(shineOpacity, { toValue: 0, duration: 1, useNativeDriver: false }),
      NativeAnimated.timing(path0, { toValue: 0, duration: 1, useNativeDriver: false }),
      NativeAnimated.timing(path1, { toValue: 0, duration: 1, useNativeDriver: false }),
      NativeAnimated.timing(path2, { toValue: 0, duration: 1, useNativeDriver: false }),
      NativeAnimated.timing(path3, { toValue: 0, duration: 1, useNativeDriver: false }),
      ...corner.map((v) => NativeAnimated.timing(v, { toValue: 0, duration: 1, useNativeDriver: false })),
      ...dots.map((v) => NativeAnimated.timing(v, { toValue: 0, duration: 1, useNativeDriver: false })),
      ...dotScale.map((v) => NativeAnimated.timing(v, { toValue: 0, duration: 1, useNativeDriver: false })),
    ]);
    return NativeAnimated.sequence([
      NativeAnimated.delay(ANIM_DELAY_MS),
      NativeAnimated.loop(
        NativeAnimated.sequence([
          sealShow,
          shineFade,
          NativeAnimated.parallel([NativeAnimated.delay(80), corners]),
          pathsShow,
          dotsShow,
          breathe,
          NativeAnimated.delay(200),
          reset,
          NativeAnimated.delay(150),
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

  const center = CANVAS / 2;
  const sealScaleInterpolate = (animated: NativeAnimated.Value) =>
    animated.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] });

  return (
    <View style={styles.root} testID={testID}>
      <View style={[styles.logoFrame, { width: logoSize, height: logoSize }]}>
        <AnimatedG
          style={{
            transform: [
              { translateY: overallY },
              {
                rotate: overallRot.interpolate({ inputRange: [-0.25, 0], outputRange: ["-0.25deg", "0deg"] }),
              },
              { scale: overallScale },
            ],
          }}
        >
          <Svg width="100%" height="100%" viewBox={`0 0 ${CANVAS} ${CANVAS}`}>
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
              <SvgRadialGradient id="aph-innerShine-native" cx="30%" cy="25%" r="75%">
                <SvgStop offset="0%" stopColor="#FFFFFF" stopOpacity={NativeAnimated.multiply(shineOpacity, 0.18)} />
                <SvgStop offset="65%" stopColor="#FFFFFF" stopOpacity={0} />
              </SvgRadialGradient>
              <SvgClipPath id="aph-sealRounded-native">
                <SvgRect x="0" y="0" width={CANVAS} height={CANVAS} rx="58" ry="58" />
              </SvgClipPath>
            </SvgDefs>

            <SvgG clipPath="url(#aph-sealRounded-native)">
              <AnimatedG transform={{ scale: sealScaleInterpolate(sealScale) }}>
                <AnimatedPath
                  d={PATH_2_SEAL_SQUARE_WITH_KANJI_CUTOUTS}
                  fill="url(#aph-sealGrad-native)"
                  fillRule="nonzero"
                  opacity={sealOpacity}
                />
              </AnimatedG>
              <AnimatedPath
                d={PATH_0_RIGHT_KANJI}
                fill="#FFFFFF"
                fillRule="nonzero"
                opacity={path0}
                transform={{ scale: sealScaleInterpolate(path0) }}
              />
              <AnimatedPath
                d={PATH_1_LEFT_KANJI}
                fill="#FFFFFF"
                fillRule="nonzero"
                opacity={path1}
                transform={{ scale: sealScaleInterpolate(path1) }}
              />
              <AnimatedPath
                d={PATH_3_RIGHT_KANJI_INNER_WHITESPACE}
                fill="#FFFFFF"
                fillRule="nonzero"
                opacity={path3}
                transform={{ scale: sealScaleInterpolate(path3) }}
              />
              <AnimatedRect
                x="0"
                y="0"
                width={CANVAS}
                height={CANVAS}
                fill="url(#aph-innerShine-native)"
                rx="58"
                ry="58"
                opacity={shineOpacity}
              />
            </SvgG>

            <SvgG opacity={0.9} fill="none" stroke="url(#aph-goldGrad-native)" strokeWidth={2.5} strokeLinecap="round">
              {GOLD_CORNER_PATHS.map((d, i) => (
                <AnimatedPath key={`corner-native-${i}`} d={d} opacity={corner[i]} />
              ))}
            </SvgG>

            <SvgG fill="url(#aph-goldGrad-native)">
              {[
                { cx: center, cy: 14 },
                { cx: center, cy: CANVAS - 14 },
                { cx: 14, cy: center },
                { cx: CANVAS - 14, cy: center },
              ].map((c, i) => (
                <AnimatedG
                  key={`dot-native-${i}`}
                  transform={[{ translateX: c.cx }, { translateY: c.cy }, { scale: dotScale[i] }]}
                >
                  <SvgCircle cx={0} cy={0} r={5.5} opacity={dots[i]} />
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
