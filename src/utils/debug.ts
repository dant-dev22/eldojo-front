import { Platform } from "react-native";

const ERUDA_FLAG = "eruda";
const ERUDA_CLICK_COUNT = 7;
const ERUDA_CLICK_WINDOW_MS = 3000;

let secretClicks: number[] = [];
let globalClickListenerInstalled = false;

function hasErudaFlag(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get(ERUDA_FLAG) === "1") {
      window.localStorage.setItem(ERUDA_FLAG, "1");
      return true;
    }
    if (url.searchParams.get(ERUDA_FLAG) === "0") {
      window.localStorage.removeItem(ERUDA_FLAG);
      return false;
    }
    return window.localStorage.getItem(ERUDA_FLAG) === "1";
  } catch {
    return false;
  }
}

function shouldInitEruda(): boolean {
  if (Platform.OS !== "web") return false;
  if (typeof window === "undefined") return false;
  return __DEV__ || hasErudaFlag();
}

function mountScript(): void {
  if (typeof window === "undefined") return;
  if (window.eruda) return;

  const existingScript = document.querySelector<HTMLScriptElement>(
    'script[data-eruda="true"]'
  );
  if (existingScript) return;

  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/eruda@2.11.3/eruda.min.js";
  script.async = true;
  script.defer = true;
  script.dataset.eruda = "true";
  script.onload = () => {
    if (window.eruda && typeof window.eruda.init === "function") {
      window.eruda.init();
      console.info(
        `[Eruda] Consola virtual inicializada (${__DEV__ ? "modo desarrollo" : "activado por flag en producción"}).`
      );
    }
  };
  script.onerror = () => {
    console.error("[Eruda] Error al cargar la consola virtual desde CDN.");
  };

  document.head.appendChild(script);
}

function installSecretTrigger(): void {
  if (globalClickListenerInstalled) return;
  if (Platform.OS !== "web") return;
  if (typeof window === "undefined") return;
  globalClickListenerInstalled = true;

  const root =
    document.getElementById("root") ?? document.body ?? document.documentElement;

  root.addEventListener(
    "click",
    () => {
      if (window.eruda) return;
      const now = Date.now();
      secretClicks = secretClicks.filter(
        (t) => now - t <= ERUDA_CLICK_WINDOW_MS
      );
      secretClicks.push(now);
      if (secretClicks.length >= ERUDA_CLICK_COUNT) {
        secretClicks = [];
        window.localStorage.setItem(ERUDA_FLAG, "1");
        console.info(
          `[Eruda] Activación secreta detectada (${ERUDA_CLICK_COUNT} taps). Cargando...`
        );
        mountScript();
      }
    },
    { passive: true }
  );
}

export function initEruda(): void {
  if (Platform.OS !== "web") return;
  if (typeof window === "undefined") return;
  installSecretTrigger();
  if (shouldInitEruda()) mountScript();
}


