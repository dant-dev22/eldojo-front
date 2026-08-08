// src/hooks/useVersionCheck.ts
// Hook para detectar nuevas versiones del frontend desplegadas en el servidor.
//
// Estrategia:
//   - La version actual del cliente esta embebida en el build (APP_VERSION).
//   - Cada N segundos se consulta /version.json con un query param cache-buster
//     para asegurarse de traer la version fresca del servidor.
//   - Si la version remota difiere de la local, se marca como update disponible.
//   - Como fallback, tambien se consulta /api/v1/version (backend).
//   - Cuando hay update, se puede llamar forceReload() para borrar cache SW
//     y recargar la pagina sin cache.

import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";

import { APP_VERSION } from "@/generated/appVersion";

export interface RemoteVersionInfo {
  version: string;
  buildTimestamp?: string;
  shortHash?: string;
  backendVersion?: string;
}

const DEFAULT_POLL_INTERVAL_MS = 60_000; // 1 minuto
const INITIAL_DELAY_MS = 5_000; // 5 segundos despues de montar

function cacheBuster(): string {
  return `_t=${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function fetchJsonSafe(url: string): Promise<unknown | null> {
  try {
    const response = await fetch(url, {
      method: "GET",
      // No queremos que el navegador cachee esta peticion de ningun modo.
      cache: "no-store",
      headers: {
        Pragma: "no-cache",
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function fetchStaticVersion(): Promise<RemoteVersionInfo | null> {
  const raw = await fetchJsonSafe(`/version.json?${cacheBuster()}`);
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.version !== "string") return null;
  return {
    version: r.version,
    buildTimestamp: typeof r.buildTimestamp === "string" ? r.buildTimestamp : undefined,
    shortHash: typeof r.shortHash === "string" ? r.shortHash : undefined,
  };
}

async function fetchBackendVersion(): Promise<RemoteVersionInfo | null> {
  const raw = await fetchJsonSafe(`/api/v1/version?${cacheBuster()}`);
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.version !== "string") return null;
  return {
    version: r.version,
    backendVersion:
      typeof r.backend_version === "string"
        ? (r.backend_version as string)
        : undefined,
  };
}

export function useVersionCheck(options?: {
  pollIntervalMs?: number;
  enabled?: boolean;
}) {
  const pollIntervalMs = options?.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const enabled = options?.enabled ?? Platform.OS === "web";

  const [currentVersion] = useState<string>(APP_VERSION);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);

  const mountedRef = useRef(true);

  const checkNow = useCallback(async (): Promise<{
    current: string;
    latest: RemoteVersionInfo | null;
    hasUpdate: boolean;
  }> => {
    if (!enabled || Platform.OS !== "web") {
      return { current: APP_VERSION, latest: null, hasUpdate: false };
    }

    const staticInfo = await fetchStaticVersion();
    // Como fallback (por si version.json no se genero), comparamos contra
    // backend_version. Nota: backend y frontend versiones pueden diferir,
    // asi que solo usamos staticVersion como fuente de verdad para frontend.
    let latestInfo: RemoteVersionInfo | null = staticInfo;
    if (!latestInfo) {
      latestInfo = await fetchBackendVersion();
    }

    const latest = latestInfo?.version ?? null;
    const hasUpdate = Boolean(latest && latest !== APP_VERSION);

    if (mountedRef.current) {
      if (latest) setLatestVersion(latest);
      setLastCheckedAt(new Date());
      if (hasUpdate) {
        setIsUpdateAvailable(true);
      }
    }

    return { current: APP_VERSION, latest: latestInfo, hasUpdate };
  }, [enabled]);

  const forceReload = useCallback(async (): Promise<never> => {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      // En plataformas nativas no hay reload de navegador.
      return undefined as never;
    }

    // 1. Desregistra service workers existentes (si los hay).
    try {
      if ("serviceWorker" in navigator && navigator.serviceWorker) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          try {
            await reg.unregister();
          } catch {
            /* noop */
          }
        }
      }
    } catch {
      /* noop */
    }

    // 2. Intenta borrar cache de navegador (Cache API).
    try {
      if ("caches" in window && typeof window.caches?.keys === "function") {
        const keys = await window.caches.keys();
        await Promise.all(keys.map((k) => window.caches.delete(k).catch(() => null)));
      }
    } catch {
      /* noop */
    }

    // 3. Recarga la pagina SIN usar la cache HTTP del navegador.
    //    En navegadores modernos, true = bypass cache.
    try {
      const reloadAny = window.location.reload as unknown as (forced?: boolean) => void;
      reloadAny(true);
    } catch {
      window.location.reload();
    }

    // Nunca deberia llegar aqui, el reload mata el proceso.
    return undefined as never;
  }, []);

  const dismissUpdate = useCallback(() => {
    setIsUpdateAvailable(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    if (!enabled || Platform.OS !== "web") {
      return () => {
        mountedRef.current = false;
      };
    }

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const initialTimer = setTimeout(() => {
      if (!cancelled && mountedRef.current) {
        void checkNow();
      }
    }, INITIAL_DELAY_MS);

    intervalId = setInterval(() => {
      if (!cancelled && mountedRef.current) {
        void checkNow();
      }
    }, pollIntervalMs);

    // Tambien revisamos cuando la app vuelve a primer plano.
    const subscription = AppState.addEventListener?.("change", (nextAppState) => {
      if (nextAppState === "active" && mountedRef.current) {
        void checkNow();
      }
    });

    return () => {
      cancelled = true;
      mountedRef.current = false;
      clearTimeout(initialTimer);
      if (intervalId) clearInterval(intervalId);
      if (subscription?.remove) subscription.remove();
    };
  }, [enabled, pollIntervalMs, checkNow]);

  return {
    currentVersion,
    latestVersion,
    isUpdateAvailable,
    lastCheckedAt,
    checkNow,
    forceReload,
    dismissUpdate,
  };
}
