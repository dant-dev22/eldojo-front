export type DeploymentEnvironment = "development" | "staging" | "production";

export interface DomainConfig {
  environment: DeploymentEnvironment;
  apiBaseUrl: string;
  publicWebOrigin: string;
  appWebOrigin: string;
  sessionCookieDomain: string | undefined;
  isPublicHostname: boolean;
  isAppHostname: boolean;
  currentOrigin: string;
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
  const envValue = process.env.EXPO_PUBLIC_API_URL;
  if (envValue) return envValue.replace(/\/$/, "");
  const origin = resolveCurrentOrigin();
  return `${origin.replace(/\/$/, "")}/api`;
}

function readConfiguredOrigin(kind: "public" | "app"): string {
  const envValue =
    kind === "public"
      ? process.env.EXPO_PUBLIC_PUBLIC_WEB_ORIGIN
      : process.env.EXPO_PUBLIC_APP_WEB_ORIGIN;
  if (envValue) return envValue.replace(/\/$/, "");
  const current = resolveCurrentOrigin();
  const url = new URL(current);
  const { hostname } = url;
  if (hostname === "app.eldojo.tech") {
    return kind === "app" ? current : `https://eldojo.tech`;
  }
  if (hostname === "eldojo.tech" || hostname === "www.eldojo.tech") {
    return kind === "public" ? current : `https://app.eldojo.tech`;
  }
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return kind === "public" ? `http://localhost:8081` : `http://localhost:8082`;
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
  const environment =
    (process.env.EXPO_PUBLIC_ENVIRONMENT as DeploymentEnvironment | undefined) ||
    defaultEnvFromHostname(currentHostname);

  let isAppHostname = false;
  let isPublicHostname = false;

  if (currentHostname === "localhost" || currentHostname === "127.0.0.1") {
    try {
      const port = new URL(currentOrigin).port;
      if (port === "8082") {
        isAppHostname = true;
      } else {
        isPublicHostname = true;
      }
    } catch {
      isPublicHostname = true;
    }
  } else if (currentHostname.startsWith("app.") || hostnameMatchesAny(currentHostname, [appWebOrigin])) {
    isAppHostname = true;
  } else if (
    currentHostname === "eldojo.tech" ||
    currentHostname === "www.eldojo.tech" ||
    hostnameMatchesAny(currentHostname, [publicWebOrigin])
  ) {
    isPublicHostname = true;
  } else {
    isPublicHostname = true;
  }

  const cookieDomain = process.env.EXPO_PUBLIC_SESSION_COOKIE_DOMAIN || undefined;

  return {
    environment,
    apiBaseUrl: resolveApiBaseUrl(),
    publicWebOrigin,
    appWebOrigin,
    sessionCookieDomain: cookieDomain && cookieDomain.trim() ? cookieDomain : undefined,
    isPublicHostname,
    isAppHostname,
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
