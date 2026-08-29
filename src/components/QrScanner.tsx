import { Feather } from "@expo/vector-icons";
import jsQR, { QRCode } from "jsqr";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { AppModal } from "@/components/AppModal";
import {
  AttendanceProgressView,
  type AttendanceStepStatus,
  type AttendanceSuccessPayload,
} from "@/components/AttendanceProgressView";
import {
  agedWood as woodAged,
  agedWoodHover as woodAgedHover,
  agedWoodSoft as woodSoftAccent,
  colors,
  goldenYellow as amber,
  goldenYellowSoft as amberSoft,
  indigoBlue as indigo,
  indigoBlueSoft as indigoSoft,
  judogiRed,
  judogiRedSoft as judogiRedSoft,
  radius,
  shadows,
  spacing,
  tatamiGreen as matchaGreen,
  tatamiGreenSoft as matchaGreenSoft,
  transitions,
  typography,
} from "@/constants/theme";

type CameraPermissionStatus = "unknown" | "granted" | "denied" | "unavailable";

interface QrScannerAttendanceProcessState {
  lookupStatus: AttendanceStepStatus;
  registerStatus: AttendanceStepStatus;
  overallStatus: "processing" | "success" | "error";
  errorMessage: string | null;
  successPayload: AttendanceSuccessPayload | null;
  successCountdown: number | null;
}

interface QrScannerProps {
  visible: boolean;
  onClose: () => void;
  onCodeScanned: (code: string) => void;
  title?: string;
  description?: string;
  nativeID?: string;
  testID?: string;
  attendanceProcess?: QrScannerAttendanceProcessState | null;
  onAttendanceProcessRetry?: () => void;
}

const SCAN_COOLDOWN_MS = 1500;
const AGED_WOOD_SOFT_FALLBACK = "rgba(141, 110, 99, 0.08)";
const WEB_MOBILE_SCAN_INTERVAL_MS = 120;

function isMobileWebUserAgent(): boolean {
  if (Platform.OS !== "web" || typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Silk|Fennec|Windows Phone/i.test(
    ua
  );
}

export function QrScanner({
  visible,
  onClose,
  onCodeScanned,
  title = "Escanear QR del alumno",
  description = "Apunta la camara al codigo QR. La deteccion es automatica y sin contacto.",
  nativeID,
  testID,
  attendanceProcess = null,
  onAttendanceProcessRetry,
}: QrScannerProps) {
  const baseId = nativeID ?? testID ?? "components-qr-scanner";
  const isMobileWeb = useMemo(() => isMobileWebUserAgent(), []);

  const [permission, setPermission] = useState<CameraPermissionStatus>("unknown");
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [flashMessage, setFlashMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const cooldownRef = useRef(false);
  const scanPausedRef = useRef(false);
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const scanLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  type CameraComponentType = React.ComponentType<{
    style?: unknown;
    facing?: unknown;
    enableTorch?: unknown;
    barcodeScannerSettings?: unknown;
    onBarcodeScanned?: (event: { data: string }) => void;
  }>;

  const requestPermissionFnRef = useRef<null | (() => Promise<{ status: string }>)>(null);
  const permissionStatusMapRef = useRef<Record<string, CameraPermissionStatus>>({});
  const [DynamicCameraView, setDynamicCameraView] = useState<null | CameraComponentType>(null);
  const [qrBarcodeType, setQrBarcodeType] = useState<unknown>("qr");

  const webVideoContainerRef = useRef<HTMLElement | null>(null);
  const webVideoRef = useRef<HTMLVideoElement | null>(null);
  const webCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const webMediaStreamRef = useRef<MediaStream | null>(null);
  const webScanIntervalRef = useRef<number | null>(null);

  const disposeWebCamera = () => {
    try {
      if (webScanIntervalRef.current !== null) {
        window.clearInterval(webScanIntervalRef.current);
        webScanIntervalRef.current = null;
      }
    } catch {
      /* noop */
    }
    try {
      if (webMediaStreamRef.current) {
        webMediaStreamRef.current.getTracks().forEach((t) => t.stop());
        webMediaStreamRef.current = null;
      }
    } catch {
      /* noop */
    }
    try {
      if (webVideoRef.current) {
        webVideoRef.current.pause();
        webVideoRef.current.srcObject = null;
        webVideoRef.current.removeAttribute("src");
        webVideoRef.current.load();
      }
    } catch {
      /* noop */
    }
  };

  const requestWebMobileCamera = async (): Promise<{ status: string }> => {
    disposeWebCamera();
    if (typeof window === "undefined" || typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return { status: "UNAVAILABLE" };
    }
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facing === "front" ? ("user" as const) : ("environment" as const),
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      webMediaStreamRef.current = stream;

      if (webVideoRef.current) {
        webVideoRef.current.srcObject = stream;
        webVideoRef.current.setAttribute("playsinline", "true");
        webVideoRef.current.setAttribute("muted", "true");
        await webVideoRef.current.play().catch(() => {});
      }

      startWebMobileScanLoop();
      return { status: "GRANTED" };
    } catch (err) {
      const name = err instanceof Error ? err.name : String(err);
      if (/NotAllowed|Permission|Security/i.test(name)) return { status: "DENIED" };
      if (/NotFound|Overconstrained|NotReadable|Devices|Unavailable/i.test(name)) return { status: "UNAVAILABLE" };
      return { status: "DENIED" };
    }
  };

  const startWebMobileScanLoop = () => {
    try {
      if (webScanIntervalRef.current !== null) window.clearInterval(webScanIntervalRef.current);
    } catch {
      /* noop */
    }
    webScanIntervalRef.current = window.setInterval(() => {
      if (scanPausedRef.current) return;
      if (cooldownRef.current) return;
      const video = webVideoRef.current;
      const canvas = webCanvasRef.current;
      if (!video || !canvas) return;
      if (video.readyState < 2) return;
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h) return;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      canvas.width = w;
      canvas.height = h;
      try {
        ctx.drawImage(video, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);
        const code: QRCode | null = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });
        if (code && code.data) {
          handleBarcodeScanned({ data: code.data });
        }
      } catch {
        /* noop */
      }
    }, WEB_MOBILE_SCAN_INTERVAL_MS);
  };

  const pauseAllScanning = () => {
    scanPausedRef.current = true;
    try {
      if (webScanIntervalRef.current !== null) {
        window.clearInterval(webScanIntervalRef.current);
        webScanIntervalRef.current = null;
      }
    } catch {
      /* noop */
    }
  };

  const resumeAllScanning = () => {
    scanPausedRef.current = false;
    if (Platform.OS === "web" && isMobileWeb && permission === "granted" && webMediaStreamRef.current) {
      startWebMobileScanLoop();
    }
  };

  useEffect(() => {
    if (!visible) return;

    let mounted = true;

    if (Platform.OS === "web" && isMobileWeb) {
      setPermission("unknown");
      permissionStatusMapRef.current = {
        GRANTED: "granted",
        DENIED: "denied",
        UNAVAILABLE: "unavailable",
        UNDETERMINED: "unknown",
      };
      requestPermissionFnRef.current = requestWebMobileCamera;
      setQrBarcodeType("qr");
      const requestFn = requestPermissionFnRef.current;
      if (requestFn) {
        Promise.resolve()
          .then(() => requestFn())
          .then((permissionResult) => {
            if (!mounted) return;
            const mappedStatus =
              permissionStatusMapRef.current[String(permissionResult.status ?? "UNDETERMINED").toUpperCase()] ??
              "unknown";
            setPermission(mappedStatus);
          });
      }
      return () => {
        mounted = false;
        pauseAllScanning();
        disposeWebCamera();
      };
    }

    let loadedCameraModule: null | typeof import("expo-camera") = null;

    Promise.resolve()
      .then(async () => {
        const expoCameraModule = await import("expo-camera");
        if (!mounted) {
          loadedCameraModule = expoCameraModule;
          return expoCameraModule;
        }
        loadedCameraModule = expoCameraModule;
        const { CameraView } = expoCameraModule;
        return { CameraView, fullModule: expoCameraModule };
      })
      .then((loaded) => {
        if (!mounted) return;
        if (!loaded) return;
        const { CameraView, fullModule } = loaded as {
          CameraView: React.ComponentType<{
            style?: unknown;
            facing?: unknown;
            enableTorch?: unknown;
            barcodeScannerSettings?: unknown;
            onBarcodeScanned?: (event: { data: string }) => void;
          }>;
          fullModule: typeof import("expo-camera");
        };
        permissionStatusMapRef.current = {
          GRANTED: "granted",
          DENIED: "denied",
          UNAVAILABLE: "unavailable",
          UNDETERMINED: "unknown",
        };
        const expoCameraAny = fullModule as unknown as {
          requestCameraPermissionsAsync?: () => Promise<{ status: string }>;
          getCameraPermissionsAsync?: () => Promise<{ status: string }>;
        };
        requestPermissionFnRef.current = async () => {
          if (typeof expoCameraAny.requestCameraPermissionsAsync === "function") {
            return expoCameraAny.requestCameraPermissionsAsync();
          }
          if (typeof expoCameraAny.getCameraPermissionsAsync === "function") {
            return expoCameraAny.getCameraPermissionsAsync();
          }
          return { status: "GRANTED" };
        };
        setDynamicCameraView(CameraView as CameraComponentType);
        setQrBarcodeType("qr");
        const requestFn = requestPermissionFnRef.current;
        if (!requestFn) return;
        return requestFn();
      })
      .then((permissionResult) => {
        if (!mounted) return;
        if (!permissionResult) return;
        const mappedStatus =
          permissionStatusMapRef.current[String(permissionResult.status ?? "UNDETERMINED").toUpperCase()] ??
          "unknown";
        setPermission(mappedStatus);
      });

    return () => {
      mounted = false;
      pauseAllScanning();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (Platform.OS !== "web" || !isMobileWeb) return;
    if (!visible || permission !== "granted") return;
    const fn = requestPermissionFnRef.current;
    if (!fn) return;
    let cancelled = false;
    fn().then((res) => {
      if (cancelled) return;
      const mapped =
        permissionStatusMapRef.current[String(res.status ?? "UNDETERMINED").toUpperCase()] ?? "unknown";
      setPermission(mapped);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing]);

  useEffect(() => {
    if (Platform.OS !== "web" || !isMobileWeb) return;
    if (!visible || permission !== "granted") {
      disposeWebCamera();
      return;
    }
    const container = webVideoContainerRef.current;
    if (!container) return;

    let video = webVideoRef.current;
    if (!video) {
      video = document.createElement("video");
      video.setAttribute("autoplay", "true");
      video.setAttribute("playsinline", "true");
      video.setAttribute("muted", "true");
      video.setAttribute("webkit-playsinline", "true");
      (video.style as unknown as Record<string, string>).position = "absolute";
      (video.style as unknown as Record<string, string>).top = "0";
      (video.style as unknown as Record<string, string>).left = "0";
      (video.style as unknown as Record<string, string>).width = "100%";
      (video.style as unknown as Record<string, string>).height = "100%";
      (video.style as unknown as Record<string, string>).objectFit = "cover";
      (video.style as unknown as Record<string, string>).display = "block";
      container.appendChild(video);
      webVideoRef.current = video;
    }

    let canvas = webCanvasRef.current;
    if (!canvas) {
      canvas = document.createElement("canvas");
      (canvas.style as unknown as Record<string, string>).display = "none";
      container.appendChild(canvas);
      webCanvasRef.current = canvas;
    }

    if (webMediaStreamRef.current && webVideoRef.current && !webVideoRef.current.srcObject) {
      webVideoRef.current.srcObject = webMediaStreamRef.current;
      webVideoRef.current.play().catch(() => {});
    }

    if (webMediaStreamRef.current) {
      startWebMobileScanLoop();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, permission, isMobileWeb]);

  useEffect(() => {
    if (Platform.OS !== "web" || !isMobileWeb) return;
    if (visible) return;
    disposeWebCamera();
    try {
      const video = webVideoRef.current;
      if (video && video.parentNode) video.parentNode.removeChild(video);
      const canvas = webCanvasRef.current;
      if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
    } catch {
      /* noop */
    }
    webVideoRef.current = null;
    webCanvasRef.current = null;
    webVideoContainerRef.current = null;
  }, [visible, isMobileWeb]);

  useEffect(() => {
    if (!visible || !flashMessage) return;
    const timeoutId = window.setTimeout(() => setFlashMessage(null), 1800);
    return () => window.clearTimeout(timeoutId);
  }, [flashMessage, visible]);

  useEffect(() => {
    if (visible) {
      setLastScannedCode(null);
      setFlashMessage(null);
      cooldownRef.current = false;
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    if (attendanceProcess !== null) {
      pauseAllScanning();
    } else {
      resumeAllScanning();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, attendanceProcess]);

  useEffect(() => {
    if (!visible || permission !== "granted") {
      scanLoopRef.current?.stop();
      return undefined;
    }

    scanLineAnim.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          toValue: 1,
          useNativeDriver: false,
        }),
        Animated.timing(scanLineAnim, {
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          toValue: 0,
          useNativeDriver: false,
        }),
      ])
    );
    scanLoopRef.current = loop;
    loop.start();

    return () => {
      scanLoopRef.current?.stop();
    };
  }, [visible, permission, scanLineAnim]);

  const handleRequestPermission = async () => {
    const requestFn = requestPermissionFnRef.current;
    if (!requestFn) return;
    const permissionResult = await requestFn();
    const mappedStatus =
      permissionStatusMapRef.current[String(permissionResult.status ?? "UNDETERMINED").toUpperCase()] ?? "unknown";
    setPermission(mappedStatus);
  };

  const handleBarcodeScanned = (event: { data: string }) => {
    const rawCode = event.data?.trim();
    if (!rawCode) return;
    if (scanPausedRef.current) return;
    if (cooldownRef.current) return;
    if (lastScannedCode === rawCode) return;

    pauseAllScanning();
    cooldownRef.current = true;
    setLastScannedCode(rawCode);
    setFlashMessage({ type: "success", text: "Codigo detectado · Procesando…" });

    window.setTimeout(() => {
      onCodeScanned(rawCode);
    }, 0);

    window.setTimeout(() => {
      cooldownRef.current = false;
    }, SCAN_COOLDOWN_MS);
  };

  const toggleFacing = () => {
    setFacing((current) => (current === "back" ? "front" : "back"));
  };

  const toggleTorch = () => {
    setTorchOn((current) => !current);
  };

  const renderPermissionState = () => {
    if (Platform.OS === "web" && !isMobileWeb) {
      return (
        <View style={styles.permissionCard}>
          <View style={[styles.permissionIconWrap, { backgroundColor: amberSoft }]}>
            <Feather name="info" size={22} color={amber} />
          </View>
          <Text style={styles.permissionTitle}>Escribe el codigo manualmente</Text>
          <Text style={styles.permissionDescription}>
            El escaneo QR con camara en escritorio no esta disponible. Desde tu celu podras escanear directamente, o escribe el codigo ELD-XXXX del alumno en el formulario.
          </Text>
          <Pressable
            onPress={onClose}
            style={(state) => {
              const hovered = (state as unknown as { hovered?: boolean }).hovered;
              return [styles.permissionButton, hovered ? styles.permissionButtonHover : null];
            }}
          >
            <Feather name="edit-3" size={14} color={colors.onPrimary} />
            <Text style={styles.permissionButtonLabel}>Continuar con ingreso manual</Text>
          </Pressable>
        </View>
      );
    }

    if (permission === "unknown") {
      return (
        <View style={styles.permissionCard}>
          <View style={[styles.permissionIconWrap, { backgroundColor: indigoSoft }]}>
            <Feather name="loader" size={22} color={indigo} />
          </View>
          <Text style={styles.permissionTitle}>Preparando camara…</Text>
          <Text style={styles.permissionDescription}>
            El sistema esta solicitando acceso a la camara del dispositivo para escanear codigos QR.
          </Text>
        </View>
      );
    }

    if (permission === "granted") {
      return null;
    }

    return (
      <View style={styles.permissionCard}>
        <View style={[styles.permissionIconWrap, { backgroundColor: judogiRedSoft }]}>
          <Feather name="camera-off" size={22} color={judogiRed} />
        </View>
        <Text style={styles.permissionTitle}>Acceso a camara no disponible</Text>
        <Text style={styles.permissionDescription}>
          Sin permiso de camara no es posible leer el QR. Puedes ingresar el codigo ELD-XXXX del alumno manualmente desde el formulario.
        </Text>
        <View style={styles.permissionActions}>
          <Pressable
            onPress={handleRequestPermission}
            style={(state) => {
              const hovered = (state as unknown as { hovered?: boolean }).hovered;
              return [styles.permissionButton, hovered ? styles.permissionButtonHover : null];
            }}
          >
            <Feather name="refresh-cw" size={14} color={colors.onPrimary} />
            <Text style={styles.permissionButtonLabel}>Solicitar permiso</Text>
          </Pressable>
          <Pressable
            onPress={onClose}
            style={(state) => {
              const hovered = (state as unknown as { hovered?: boolean }).hovered;
              return [
                styles.permissionSecondaryButton,
                hovered ? styles.permissionSecondaryButtonHover : null,
              ];
            }}
          >
            <Feather name="x" size={14} color={woodAged} />
            <Text style={styles.permissionSecondaryLabel}>Cancelar</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const permissionView = renderPermissionState();

  const showNativeCameraPreview = permission === "granted" && !!DynamicCameraView && !(Platform.OS === "web");
  const showWebMobileCameraPreview = Platform.OS === "web" && isMobileWeb && permission === "granted";
  const showAttendanceProgressView = attendanceProcess !== null;

  const inProcess = showAttendanceProgressView && attendanceProcess?.overallStatus === "processing";
  const allowClose = !inProcess;

  return (
    <AppModal
      backdropClosable={allowClose}
      closeButtonEnabled={allowClose}
      description={showAttendanceProgressView ? undefined : description}
      onClose={() => {
        if (!allowClose) return;
        onClose?.();
      }}
      testID={baseId}
      title={showAttendanceProgressView ? "Registro de asistencia" : title}
      visible={visible}
    >
      <View style={styles.container}>
        {showAttendanceProgressView ? (
          <AttendanceProgressView
            mode="qr"
            lookupStatus={attendanceProcess.lookupStatus}
            registerStatus={attendanceProcess.registerStatus}
            overallStatus={attendanceProcess.overallStatus}
            errorMessage={attendanceProcess.errorMessage}
            successPayload={attendanceProcess.successPayload}
            successCountdown={attendanceProcess.successCountdown}
            onRetry={() => onAttendanceProcessRetry?.()}
            nativeID={`${baseId}-attendance-progress`}
            testID={`${baseId}-attendance-progress`}
          />
        ) : (
          <>
            <View style={styles.cameraFrame}>
          {showNativeCameraPreview ? (
            <>
              <DynamicCameraView
                barcodeScannerSettings={{
                  barcodeTypes: [qrBarcodeType],
                }}
                enableTorch={torchOn}
                facing={facing}
                onBarcodeScanned={handleBarcodeScanned}
                style={styles.cameraPreview}
              />
              <View pointerEvents="none" style={styles.viewfinderOverlay}>
                <View style={[styles.dimLayer, styles.dimTop]} />
                <View style={[styles.dimLayer, styles.dimBottom]} />
                <View style={[styles.dimLayer, styles.dimLeft]} />
                <View style={[styles.dimLayer, styles.dimRight]} />

                <View style={styles.viewfinderFrame}>
                  <Animated.View
                    style={[
                      styles.scanLine,
                      {
                        transform: [
                          {
                            translateY: scanLineAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [2, 230],
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                  <View style={[styles.viewfinderCorner, styles.viewfinderCornerTopLeft]} />
                  <View style={[styles.viewfinderCorner, styles.viewfinderCornerTopRight]} />
                  <View style={[styles.viewfinderCorner, styles.viewfinderCornerBottomLeft]} />
                  <View style={[styles.viewfinderCorner, styles.viewfinderCornerBottomRight]} />
                </View>
                <View style={styles.viewfinderHintWrap}>
                  <Feather name="maximize-2" size={14} color={amber} />
                  <Text style={styles.viewfinderHint}>Ajusta el QR dentro del marco · Deteccion automatica</Text>
                </View>
              </View>
            </>
          ) : null}

          {showWebMobileCameraPreview ? (
            <>
              <View
                collapsable={false}
                style={styles.cameraPreview}
                ref={(node) => {
                  if (Platform.OS !== "web") return;
                  if (!node) return;
                  const anyNode = node as unknown as { _nativeTag?: unknown };
                  try {
                    const domEl = (node as unknown) as HTMLElement | null;
                    if (domEl && typeof domEl.appendChild === "function") {
                      webVideoContainerRef.current = domEl;
                    }
                  } catch {
                    /* noop */
                    void anyNode;
                  }
                }}
              />
              <View pointerEvents="none" style={styles.viewfinderOverlay}>
                <View style={[styles.dimLayer, styles.dimTop]} />
                <View style={[styles.dimLayer, styles.dimBottom]} />
                <View style={[styles.dimLayer, styles.dimLeft]} />
                <View style={[styles.dimLayer, styles.dimRight]} />

                <View style={styles.viewfinderFrame}>
                  <Animated.View
                    style={[
                      styles.scanLine,
                      {
                        transform: [
                          {
                            translateY: scanLineAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [2, 230],
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                  <View style={[styles.viewfinderCorner, styles.viewfinderCornerTopLeft]} />
                  <View style={[styles.viewfinderCorner, styles.viewfinderCornerTopRight]} />
                  <View style={[styles.viewfinderCorner, styles.viewfinderCornerBottomLeft]} />
                  <View style={[styles.viewfinderCorner, styles.viewfinderCornerBottomRight]} />
                </View>
                <View style={styles.viewfinderHintWrap}>
                  <Feather name="maximize-2" size={14} color={amber} />
                  <Text style={styles.viewfinderHint}>Ajusta el QR dentro del marco · Deteccion automatica</Text>
                </View>
              </View>
            </>
          ) : null}

          {permissionView ? permissionView : null}

          {flashMessage ? (
            <View
              style={[
                styles.flashBanner,
                flashMessage.type === "success"
                  ? { backgroundColor: matchaGreenSoft, borderColor: "rgba(85, 139, 47, 0.25)" }
                  : { backgroundColor: judogiRedSoft, borderColor: "rgba(198, 40, 40, 0.25)" },
              ]}
            >
              <Feather
                name={flashMessage.type === "success" ? "check-circle" : "alert-triangle"}
                size={16}
                color={flashMessage.type === "success" ? matchaGreen : judogiRed}
              />
              <Text
                style={[
                  styles.flashText,
                  { color: flashMessage.type === "success" ? matchaGreen : judogiRed },
                ]}
              >
                {flashMessage.text}
              </Text>
            </View>
          ) : null}
        </View>

        {permission === "granted" ? (
          <View style={styles.controlsRow}>
            <Pressable
              onPress={toggleTorch}
              style={(state) => {
                const hovered = (state as unknown as { hovered?: boolean }).hovered;
                return [
                  styles.controlButton,
                  torchOn ? styles.controlButtonActive : null,
                  hovered ? styles.controlButtonHover : null,
                ];
              }}
            >
              <Feather name={torchOn ? "zap" : "zap-off"} size={16} color={torchOn ? amber : woodAged} />
              <Text style={[styles.controlLabel, torchOn ? { color: amber } : null]}>
                {torchOn ? "Linterna encendida" : "Linterna"}
              </Text>
            </Pressable>

            <Pressable
              onPress={toggleFacing}
              style={(state) => {
                const hovered = (state as unknown as { hovered?: boolean }).hovered;
                return [styles.controlButton, hovered ? styles.controlButtonHover : null];
              }}
            >
              <Feather name="refresh-cw" size={16} color={woodAged} />
              <Text style={styles.controlLabel}>
                {facing === "back" ? "Camara frontal" : "Camara trasera"}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {lastScannedCode ? (
          <View style={styles.lastCodeCard}>
            <View style={styles.lastCodeHeader}>
              <View style={[styles.lastCodeIconWrap, { backgroundColor: indigoSoft }]}>
                <Feather name="maximize" size={14} color={indigo} />
              </View>
              <Text style={styles.lastCodeLabel}>Ultimo codigo leido</Text>
            </View>
            <Text style={styles.lastCodeValue}>{lastScannedCode}</Text>
          </View>
        ) : null}
          </>
        )}
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  cameraFrame: {
    alignSelf: "center",
    aspectRatio: 3 / 4,
    backgroundColor: "#0F0F0F",
    borderColor: "rgba(26,35,126,0.35)",
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: "hidden",
    width: "100%",
    ...Platform.select({
      web: {
        boxShadow: "0 18px 60px rgba(26,35,126,0.22)",
      } as any,
    }),
  },
  cameraPreview: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#000",
  },
  viewfinderOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  dimLayer: {
    backgroundColor: "rgba(10,10,10,0.58)",
    position: "absolute",
  },
  dimTop: {
    left: 0,
    right: 0,
    top: 0,
    bottom: "68%",
  },
  dimBottom: {
    left: 0,
    right: 0,
    bottom: 0,
    top: "68%",
  },
  dimLeft: {
    left: 0,
    top: "15%",
    bottom: "32%",
    width: "15%",
  },
  dimRight: {
    right: 0,
    top: "15%",
    bottom: "32%",
    width: "15%",
  },
  viewfinderFrame: {
    aspectRatio: 1,
    width: "70%",
  },
  scanLine: {
    alignSelf: "center",
    backgroundColor: amber,
    borderRadius: 999,
    height: 3,
    left: "8%",
    position: "absolute",
    right: "8%",
    shadowColor: amber,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
    top: 4,
  },
  viewfinderCorner: {
    borderColor: amber,
    height: 36,
    position: "absolute",
    width: 36,
  },
  viewfinderCornerTopLeft: {
    borderLeftWidth: 5,
    borderTopWidth: 5,
    left: -2,
    top: -2,
  },
  viewfinderCornerTopRight: {
    borderRightWidth: 5,
    borderTopWidth: 5,
    right: -2,
    top: -2,
  },
  viewfinderCornerBottomLeft: {
    borderBottomWidth: 5,
    borderLeftWidth: 5,
    bottom: -2,
    left: -2,
  },
  viewfinderCornerBottomRight: {
    borderBottomWidth: 5,
    borderRightWidth: 5,
    bottom: -2,
    right: -2,
  },
  viewfinderHintWrap: {
    alignItems: "center",
    backgroundColor: "rgba(10,10,10,0.62)",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(249,168,37,0.35)",
    bottom: spacing.lg,
    flexDirection: "row",
    gap: 8,
    left: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    position: "absolute",
    right: spacing.md,
    justifyContent: "center",
    ...Platform.select({
      web: {
        backdropFilter: "blur(6px)",
      } as any,
    }),
  },
  viewfinderHint: {
    color: "#FFFFFF",
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.15,
    textAlign: "center",
  },
  permissionCard: {
    alignSelf: "center",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    justifyContent: "center",
    padding: spacing.xl,
    width: "100%",
  },
  permissionIconWrap: {
    alignItems: "center",
    borderRadius: 999,
    height: 56,
    justifyContent: "center",
    marginBottom: spacing.sm,
    width: 56,
  },
  permissionTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.2,
    textAlign: "center",
  },
  permissionDescription: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
  permissionActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "center",
    marginTop: spacing.sm,
  },
  permissionButton: {
    alignItems: "center",
    backgroundColor: woodAged,
    borderColor: woodAged,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  permissionButtonHover: {
    backgroundColor: woodAgedHover,
    borderColor: woodAgedHover,
    ...shadows.cardElevated,
  },
  permissionButtonLabel: {
    color: colors.onPrimary,
    fontFamily: typography.headingFamily,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  permissionSecondaryButton: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderColor: "transparent",
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  permissionSecondaryButtonHover: {
    backgroundColor: AGED_WOOD_SOFT_FALLBACK,
  },
  permissionSecondaryLabel: {
    color: woodAged,
    fontFamily: typography.headingFamily,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  controlsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  controlButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...Platform.select({
      web: {
        transition: `background-color ${transitions.base}ms ease, border-color ${transitions.base}ms ease, transform ${transitions.fast}ms ease`,
      } as any,
    }),
  },
  controlButtonActive: {
    backgroundColor: amberSoft,
    borderColor: "rgba(249, 168, 37, 0.42)",
  },
  controlButtonHover: {
    backgroundColor: colors.hoverStrong,
    transform: [{ translateY: -1 }],
  },
  controlLabel: {
    color: woodAged,
    fontFamily: typography.headingFamily,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  lastCodeCard: {
    backgroundColor: indigoSoft,
    borderColor: "rgba(26,35,126,0.22)",
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  lastCodeHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  lastCodeIconWrap: {
    alignItems: "center",
    borderRadius: 999,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  lastCodeLabel: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  lastCodeValue: {
    color: indigo,
    fontFamily: typography.headingFamily,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  flashBanner: {
    alignItems: "center",
    alignSelf: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    bottom: spacing.xl,
    flexDirection: "row",
    gap: 10,
    left: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    position: "absolute",
    right: spacing.md,
    ...Platform.select({
      web: {
        backdropFilter: "blur(8px)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
      } as any,
    }),
  },
  flashText: {
    fontFamily: typography.headingFamily,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
});
