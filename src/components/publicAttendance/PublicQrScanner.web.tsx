import { useEffect, useMemo, useRef } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { AppBadge } from "@/components/AppBadge";
import { colors, radius, spacing, typography } from "@/constants/theme";

interface PublicQrScannerProps {
  active: boolean;
  scanning: boolean;
  onDetected: (value: string) => void;
  onError: (message: string) => void;
}

interface BarcodeDetectorShape {
  detect: (source: ImageBitmapSource | HTMLVideoElement | HTMLCanvasElement | OffscreenCanvas) => Promise<
    Array<{ rawValue?: string }>
  >;
}

interface BarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): BarcodeDetectorShape;
}

type WindowWithBarcodeDetector = typeof window & {
  BarcodeDetector?: BarcodeDetectorConstructor;
};

export function PublicQrScanner({ active, scanning, onDetected, onError }: PublicQrScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const detectorRef = useRef<BarcodeDetectorShape | null>(null);
  const isBarcodeSupported = useMemo(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return Boolean((window as WindowWithBarcodeDetector).BarcodeDetector);
  }, []);

  useEffect(() => {
    if (!active) {
      return undefined;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      onError("Tu navegador no permite abrir la camara desde esta pagina.");
      return undefined;
    }

    const BarcodeDetectorApi = (window as WindowWithBarcodeDetector).BarcodeDetector;
    if (!BarcodeDetectorApi) {
      onError("Tu navegador no soporta lectura QR automatica. Usa Chrome, Edge o pega el codigo manualmente.");
      return undefined;
    }

    let cancelled = false;

    const stopStream = () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };

    const detectFrame = async () => {
      if (cancelled || !videoRef.current || !detectorRef.current) {
        return;
      }

      try {
        const barcodes = await detectorRef.current.detect(videoRef.current);
        const detectedValue = barcodes.find((item) => Boolean(item.rawValue?.trim()))?.rawValue?.trim();

        if (detectedValue) {
          onDetected(detectedValue);
          stopStream();
          return;
        }
      } catch {
        onError("No fue posible leer el QR. Intenta acercar el codigo y mantenerlo estable.");
        stopStream();
        return;
      }

      frameRef.current = window.requestAnimationFrame(() => {
        void detectFrame();
      });
    };

    const start = async () => {
      try {
        detectorRef.current = new BarcodeDetectorApi({ formats: ["qr_code"] });
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
          },
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        frameRef.current = window.requestAnimationFrame(() => {
          void detectFrame();
        });
      } catch {
        onError("No se pudo acceder a la camara. Revisa permisos del navegador e intenta de nuevo.");
        stopStream();
      }
    };

    void start();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [active, onDetected, onError]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <AppBadge label={active ? "Escaneo activo" : "Escaneo en espera"} tone={active ? "success" : "neutral"} />
        {scanning ? <ActivityIndicator color={colors.primary} size="small" /> : null}
      </View>
      <Text style={styles.title}>Escanea el QR de la sucursal</Text>
      <Text style={styles.description}>
        Coloca el codigo dentro del recuadro. Cuando se detecte, registraremos la asistencia automaticamente.
      </Text>
      <View style={styles.videoShell}>
        {active ? (
          <video muted playsInline ref={videoRef} style={styles.video as never} />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Completa tu ID y la clase para abrir la camara.</Text>
          </View>
        )}
        <View pointerEvents="none" style={styles.overlay}>
          <View style={styles.frame} />
        </View>
      </View>
      {!isBarcodeSupported ? (
        <Text style={styles.helper}>Si tu navegador no soporta lectura QR, pega el contenido manualmente.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  title: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 20,
    fontWeight: "800",
  },
  description: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 20,
  },
  videoShell: {
    backgroundColor: "#090909",
    borderRadius: radius.lg,
    minHeight: 320,
    overflow: "hidden",
    position: "relative",
  },
  video: {
    height: "100%",
    objectFit: "cover",
    width: "100%",
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 320,
    padding: spacing.lg,
  },
  placeholderText: {
    color: "#EAEAEA",
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    textAlign: "center",
  },
  overlay: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  frame: {
    borderColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 3,
    height: 220,
    width: 220,
  },
  helper: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
    lineHeight: 18,
  },
});
