import { useEffect, useState } from "react";
import { Platform } from "react-native";

type CameraAvailability = "checking" | "available" | "unavailable";

function isNativeMobile(): boolean {
  return Platform.OS === "ios" || Platform.OS === "android";
}

async function checkWebCameraDevices(): Promise<boolean> {
  if (Platform.OS !== "web") {
    return true;
  }

  if (typeof navigator === "undefined" || !navigator.mediaDevices || typeof navigator.mediaDevices.enumerateDevices !== "function") {
    return false;
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const hasVideoInput = devices.some((device) => device.kind === "videoinput");
    return hasVideoInput;
  } catch {
    return false;
  }
}

export function useCameraAvailability(): { status: CameraAvailability; isEnabled: boolean } {
  const [status, setStatus] = useState<CameraAvailability>(() => {
    if (isNativeMobile()) {
      return "available";
    }
    return "checking";
  });

  useEffect(() => {
    if (isNativeMobile()) {
      return;
    }

    let mounted = true;

    checkWebCameraDevices()
      .then((hasCamera) => {
        if (!mounted) return;
        setStatus(hasCamera ? "available" : "unavailable");
      })
      .catch(() => {
        if (!mounted) return;
        setStatus("unavailable");
      });

    return () => {
      mounted = false;
    };
  }, []);

  return {
    status,
    isEnabled: status === "available",
  };
}
