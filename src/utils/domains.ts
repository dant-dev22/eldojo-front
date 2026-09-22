export type DeploymentEnvironment = "development" | "staging" | "production";

export interface DomainConfig {
  environment: DeploymentEnvironment;
  apiBaseUrl: string;
  publicWebOrigin: string;
  appWebOrigin: string;
  studentWebOrigin: string;
  sessionCookieDomain: string | undefined;
  isPublicHostname: boolean;
  isAppHostname: boolean;
  isStudentHostname: boolean;
  currentOrigin: string;
}

export const PUBLIC_WEB_ORIGIN: string = (() => {
  try {
    const cfg = getDomainConfig();
    return cfg.publicWebOrigin;
  } catch {
    return process.env.EXPO_PUBLIC_PUBLIC_WEB_ORIGIN ?? "https://eldojo.tech";
  }
})();

export const APP_WEB_ORIGIN: string = (() => {
  try {
    const cfg = getDomainConfig();
    return cfg.appWebOrigin;
  } catch {
    return process.env.EXPO_PUBLIC_APP_WEB_ORIGIN ?? "https://app.eldojo.tech";
  }
})();

export const STUDENT_WEB_ORIGIN: string = (() => {
  try {
    const cfg = getDomainConfig();
    return cfg.studentWebOrigin;
  } catch {
    return process.env.EXPO_PUBLIC_STUDENT_WEB_ORIGIN ?? "https://mi.eldojo.tech";
  }
})();

export const publicHostnames: ReadonlyArray<string> = [
  "eldojo.tech",
  "www.eldojo.tech",
] as const;

export const appHostnames: ReadonlyArray<string> = [
  "app.eldojo.tech",
  "admin.eldojo.tech",
] as const;

export const studentHostnames: ReadonlyArray<string> = [
  "mi.eldojo.tech",
] as const;

export type AppMode = "public" | "admin" | "student";

export function getAppRoleFromHostname(hostname: string): AppMode {
  const normalized = (hostname ?? "").toLowerCase().trim();
  if (studentHostnames.includes(normalized)) return "student";
  if (appHostnames.includes(normalized)) return "admin";
  const envMode = (process.env.EXPO_PUBLIC_APP_MODE ?? "").trim().toLowerCase();
  if (envMode === "admin" || envMode === "student") return envMode;
  return "public";
}

function defaultEnvFromHostname(hostname: string | undefined): DeploymentEnvironment {
  if (!hostname) return "development";
  if (hostname === "localhost" || hostname === "127.0.0.1") return "development";
  if (hostname.endsWith(".eldojo.tech") || hostname === "eldojo.tech") return "production";
  return "staging";
}

function resolveCurrentOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  const configured =
    process.env.EXPO_PUBLIC_PUBLIC_WEB_ORIGIN ||
    process.env.EXPO_PUBLIC_APP_WEB_ORIGIN ||
    "http://localhost:8081";
  return configured;
}

function resolveApiBaseUrl(): string {
  if (typeof window !== "undefined" && window.location?.hostname) {
    const hostname = window.location.hostname.toLowerCase();
    const isProductionHost =
      hostname === "eldojo.tech" || hostname.endsWith(".eldojo.tech");
    if (isProductionHost) {
      return "/api/v1";
    }
  }
  const envValue = process.env.EXPO_PUBLIC_API_URL;
  if (envValue) return envValue.replace(/\/$/, "");
  const origin = resolveCurrentOrigin();
  return `${origin.replace(/\/$/, "")}/api`;
}

function readConfiguredOrigin(kind: "public" | "app" | "student"): string {
  const envValue =
    kind === "public"
      ? process.env.EXPO_PUBLIC_PUBLIC_WEB_ORIGIN
      : kind === "student"
      ? process.env.EXPO_PUBLIC_STUDENT_WEB_ORIGIN
      : process.env.EXPO_PUBLIC_APP_WEB_ORIGIN;
  if (envValue) return envValue.replace(/\/$/, "");
  const current = resolveCurrentOrigin();
  const url = new URL(current);
  const { hostname } = url;
  if (hostname === "app.eldojo.tech") {
    if (kind === "app") return current;
    if (kind === "student") return `https://mi.eldojo.tech`;
    return `https://eldojo.tech`;
  }
  if (hostname === "mi.eldojo.tech") {
    if (kind === "student") return current;
    if (kind === "app") return `https://app.eldojo.tech`;
    return `https://eldojo.tech`;
  }
  if (hostname === "eldojo.tech" || hostname === "www.eldojo.tech") {
    if (kind === "public") return current;
    if (kind === "student") return `https://mi.eldojo.tech`;
    return `https://app.eldojo.tech`;
  }
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    if (kind === "public") return `http://localhost:8081`;
    if (kind === "student") return `http://localhost:8083`;
    return `http://localhost:8082`;
  }
  return current;
}

function hostnameMatchesAny(hostname: string, candidates: Array<string | undefined>): boolean {
  const normalized = hostname.toLowerCase();
  return candidates.some((candidate) => {
    if (!candidate) return false;
    try {
      return new URL(candidate).hostname.toLowerCase() === normalized;
    } catch {
      return false;
    }
  });
}

export function getDomainConfig(): DomainConfig {
  const currentOrigin = resolveCurrentOrigin();
  let currentHostname: string;
  try {
    currentHostname = new URL(currentOrigin).hostname;
  } catch {
    currentHostname = "localhost";
  }

  const publicWebOrigin = readConfiguredOrigin("public");
  const appWebOrigin = readConfiguredOrigin("app");
  const studentWebOrigin = readConfiguredOrigin("student");
  const environment =
    (process.env.EXPO_PUBLIC_ENVIRONMENT as DeploymentEnvironment | undefined) ||
    defaultEnvFromHostname(currentHostname);

  let isAppHostname = false;
  let isPublicHostname = false;
  let isStudentHostname = false;

  if (currentHostname === "localhost" || currentHostname === "127.0.0.1") {
    try {
      const port = new URL(currentOrigin).port;
      if (port === "8082") {
        isAppHostname = true;
      } else if (port === "8083") {
        isStudentHostname = true;
      } else {
        isPublicHostname = true;
      }
    } catch {
      isPublicHostname = true;
    }
  } else if (
    currentHostname.startsWith("app.") ||
    currentHostname === "admin.eldojo.tech" ||
    hostnameMatchesAny(currentHostname, [appWebOrigin])
  ) {
    isAppHostname = true;
  } else if (
    currentHostname === "mi.eldojo.tech" ||
    hostnameMatchesAny(currentHostname, [studentWebOrigin])
  ) {
    isStudentHostname = true;
  } else if (
    currentHostname === "eldojo.tech" ||
    currentHostname === "www.eldojo.tech" ||
    hostnameMatchesAny(currentHostname, [publicWebOrigin])
  ) {
    isPublicHostname = true;
  } else {
    const appMode = (process.env.EXPO_PUBLIC_APP_MODE ?? "").trim().toLowerCase();
    if (appMode === "admin") {
      isAppHostname = true;
    } else if (appMode === "student") {
      isStudentHostname = true;
    } else {
      isPublicHostname = true;
    }
  }

  const cookieDomain = process.env.EXPO_PUBLIC_SESSION_COOKIE_DOMAIN || undefined;

  return {
    environment,
    apiBaseUrl: resolveApiBaseUrl(),
    publicWebOrigin,
    appWebOrigin,
    studentWebOrigin,
    sessionCookieDomain: cookieDomain && cookieDomain.trim() ? cookieDomain : undefined,
    isPublicHostname,
    isAppHostname,
    isStudentHostname,
    currentOrigin,
  };
}

export function buildPublicUrl(pathOrSection?: string, query?: Record<string, string | undefined>): string {
  const cfg = getDomainConfig();
  const base = cfg.publicWebOrigin;
  const path = pathOrSection?.startsWith("/") ? pathOrSection : pathOrSection ? `/${pathOrSection}` : "";
  const searchParams = new URLSearchParams();
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, value);
    }
  });
  const qs = searchParams.toString();
  return `${base}${path}${qs ? `?${qs}` : ""}`;
}

export function buildAppUrl(path?: string, query?: Record<string, string | undefined>): string {
  const cfg = getDomainConfig();
  const base = cfg.appWebOrigin;
  const finalPath = path?.startsWith("/") ? path : path ? `/${path}` : "/";
  const searchParams = new URLSearchParams();
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, value);
    }
  });
  const qs = searchParams.toString();
  return `${base}${finalPath}${qs ? `?${qs}` : ""}`;
}

export function buildStudentUrl(path?: string, query?: Record<string, string | undefined>): string {
  const cfg = getDomainConfig();
  const base = cfg.studentWebOrigin;
  const finalPath = path?.startsWith("/") ? path : path ? `/${path}` : "/";
  const searchParams = new URLSearchParams();
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, value);
    }
  });
  const qs = searchParams.toString();
  return `${base}${finalPath}${qs ? `?${qs}` : ""}`;
}
