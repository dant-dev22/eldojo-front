import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";

import { authApi } from "@/api/authApi";
import type { AuthTokens, LoginResponse, User, UserRole } from "@/types/api";
import {
  clearSession as storageClearSession,
  getAccessToken as storageGetAccessToken,
  getStoredUser as storageGetStoredUser,
  saveSession as storageSaveSession,
} from "@/utils/storage";
import {
  appHostnames,
  publicHostnames,
  getAppRoleFromHostname,
  PUBLIC_WEB_ORIGIN,
  APP_WEB_ORIGIN,
  STUDENT_WEB_ORIGIN,
} from "@/utils/domains";
import { isGymAdminRole, isStudentRole } from "@/utils/roles";

export type AppMode = "public" | "admin" | "student";

export interface SimpleAuthContextValue {
  ready: boolean;
  loading: boolean;
  user: User | null;
  accessToken: string | null;
  error: string | null;
  appMode: AppMode;
  loginWithCredentials: (payload: { email: string; password: string }) => Promise<LoginResponse>;
  setSessionFromResponse: (response: LoginResponse) => Promise<void>;
  restoreSession: () => Promise<User | null>;
  logout: (redirectToPublic?: boolean) => Promise<void>;
  refreshUser: () => Promise<User | null>;
  navigateToPublicOrigin: (path?: string, queryParams?: Record<string, string>) => void;
  redirectAfterLoginByRole: (role: UserRole, options?: { fresh?: boolean; welcome?: boolean }) => Promise<void>;
}

const SimpleAuthContext = createContext<SimpleAuthContextValue | null>(null);

export function useSimpleAuth(): SimpleAuthContextValue {
  const ctx = useContext(SimpleAuthContext);
  if (!ctx) {
    throw new Error("useSimpleAuth must be used within SimpleAuthProvider");
  }
  return ctx;
}

function readEnvAppMode(): AppMode {
  const raw = String(process.env.EXPO_PUBLIC_APP_MODE ?? "").toLowerCase().trim();
  if (raw === "admin" || raw === "student") return raw;
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return getAppRoleFromHostname(window.location.hostname);
  }
  return "public";
}

function buildPublicOriginUrl(path: string = "/", queryParams?: Record<string, string>): string {
  const base = PUBLIC_WEB_ORIGIN ?? "/";
  const qs = queryParams && Object.keys(queryParams).length
    ? "?" + new URLSearchParams(queryParams).toString()
    : "";
  const normalizedPath = path.startsWith("/") ? path : "/" + path;
  if (base.startsWith("http")) {
    return base + normalizedPath + qs;
  }
  return normalizedPath + qs;
}

function buildAppOriginUrl(path: string = "/", queryParams?: Record<string, string>): string {
  const base = APP_WEB_ORIGIN ?? PUBLIC_WEB_ORIGIN ?? "/";
  const qs = queryParams && Object.keys(queryParams).length
    ? "?" + new URLSearchParams(queryParams).toString()
    : "";
  const normalizedPath = path.startsWith("/") ? path : "/" + path;
  if (base.startsWith("http")) {
    return base + normalizedPath + qs;
  }
  return normalizedPath + qs;
}

function buildStudentOriginUrl(path: string = "/", queryParams?: Record<string, string>): string {
  const base = STUDENT_WEB_ORIGIN ?? PUBLIC_WEB_ORIGIN ?? "/";
  const qs = queryParams && Object.keys(queryParams).length
    ? "?" + new URLSearchParams(queryParams).toString()
    : "";
  const normalizedPath = path.startsWith("/") ? path : "/" + path;
  if (base.startsWith("http")) {
    return base + normalizedPath + qs;
  }
  return normalizedPath + qs;
}

function responseToTokens(response: LoginResponse): AuthTokens {
  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    expiresIn: response.expires_in,
    refreshExpiresIn: response.refresh_expires_in,
  };
}

function redirectBrowserTo(url: string): void {
  if (Platform.OS !== "web" || typeof window === "undefined") return;
  window.location.href = url;
}

function isOnPublicHostname(): boolean {
  if (Platform.OS !== "web" || typeof window === "undefined") return true;
  return publicHostnames.some((h) => window.location.hostname === h);
}

function isOnAppHostname(): boolean {
  if (Platform.OS !== "web" || typeof window === "undefined") return false;
  return appHostnames.some((h) => window.location.hostname === h);
}

interface SimpleAuthProviderProps {
  children: React.ReactNode;
  forceAppMode?: AppMode;
}

export function SimpleAuthProvider({ children, forceAppMode }: SimpleAuthProviderProps) {
  const appModeFromEnv = useMemo<AppMode>(() => forceAppMode ?? readEnvAppMode(), [forceAppMode]);
  const [ready, setReady] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const restoreStarted = useRef<boolean>(false);

  const appMode = appModeFromEnv;

  const setSessionFromResponse = useCallback(async (response: LoginResponse) => {
    const tokens = responseToTokens(response);
    await storageSaveSession(tokens, response.user);
    setAccessToken(tokens.accessToken);
    setUser(response.user);
    setError(null);
  }, []);

  const restoreSession = useCallback(async (): Promise<User | null> => {
    setLoading(true);
    try {
      if (Platform.OS === "web" && typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const ticket = params.get("ticket");
        if (ticket) {
          try {
            const redeemed = await authApi.redeemSessionSyncTicket(ticket);
            const tokens = responseToTokens(redeemed);
            await storageSaveSession(tokens, redeemed.user);
            setAccessToken(tokens.accessToken);
            setUser(redeemed.user);
            setError(null);
            params.delete("ticket");
            const cleanSearch = params.toString();
            const newUrl = cleanSearch
              ? `${window.location.pathname}?${cleanSearch}${window.location.hash}`
              : `${window.location.pathname}${window.location.hash}`;
            window.history.replaceState({}, "", newUrl);
            setReady(true);
            return redeemed.user;
          } catch (err) {
            console.warn("[session-ticket] No se pudo canjear ticket:", err instanceof Error ? err.message : err);
          }
          params.delete("ticket");
          const cleanSearch = params.toString();
          const newUrl = cleanSearch
            ? `${window.location.pathname}?${cleanSearch}${window.location.hash}`
            : `${window.location.pathname}${window.location.hash}`;
          window.history.replaceState({}, "", newUrl);
        }
      }

      const [token, storedUser] = await Promise.all([
        storageGetAccessToken(),
        storageGetStoredUser(),
      ]);
      if (!token) {
        setUser(null);
        setAccessToken(null);
        setReady(true);
        return null;
      }
      setAccessToken(token);
      let lastUser: User | null = null;
      if (storedUser) {
        setUser(storedUser);
        lastUser = storedUser;
      }
      try {
        const refreshed = await authApi.getCurrentUser();
        if (refreshed) {
          setUser(refreshed);
          lastUser = refreshed;
        }
      } catch {
        /* keep cached user if /me fails transiently; auth gate will enforce later */
      }
      setReady(true);
      return lastUser;
    } catch (err) {
      setError(err instanceof Error ? err.message : "restore_session_failed");
      setReady(true);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const loginWithCredentials = useCallback(
    async (payload: { email: string; password: string }): Promise<LoginResponse> => {
      setLoading(true);
      setError(null);
      try {
        const response = await authApi.login(payload);
        await setSessionFromResponse(response);
        return response;
      } catch (err) {
        const message = err instanceof Error ? err.message : "login_failed";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setSessionFromResponse]
  );

  const logout = useCallback(async (redirectToPublic = true) => {
    setLoading(true);
    try {
      await storageClearSession();
      setAccessToken(null);
      setUser(null);
      setError(null);
    } finally {
      setLoading(false);
      if (redirectToPublic && Platform.OS === "web" && typeof window !== "undefined") {
        redirectBrowserTo(buildPublicOriginUrl("/", { signed_out: "1" }));
      }
    }
  }, []);

  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      const refreshed = await authApi.getCurrentUser();
      if (refreshed) {
        setUser(refreshed);
        return refreshed;
      }
      return null;
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        await logout(true);
      }
      return null;
    }
  }, [logout]);

  const navigateToPublicOrigin = useCallback((path = "/", queryParams?: Record<string, string>) => {
    redirectBrowserTo(buildPublicOriginUrl(path, queryParams));
  }, []);

  const redirectAfterLoginByRole = useCallback(
    async (role: UserRole, options: { fresh?: boolean; welcome?: boolean } = {}) => {
      const query: Record<string, string> = {};
      if (options?.fresh) query.login_fresh = "1";
      if (options?.welcome) query.welcome = "1";
      try {
        const ticketResult = await authApi.createSessionSyncTicket();
        if (ticketResult?.ticket) query.ticket = ticketResult.ticket;
      } catch {
        // fall through sin ticket
      }

      if (isGymAdminRole(role)) {
        const url = buildAppOriginUrl("/admin/overview", query);
        redirectBrowserTo(url);
        return;
      }
      if (isStudentRole(role)) {
        const url = buildStudentOriginUrl("/alumno", query);
        redirectBrowserTo(url);
        return;
      }
      if (role === "super_admin") {
        const url = buildAppOriginUrl("/admin/overview", query);
        redirectBrowserTo(url);
        return;
      }
      redirectBrowserTo(buildPublicOriginUrl("/", query));
    },
    []
  );

  useEffect(() => {
    if (restoreStarted.current) return;
    restoreStarted.current = true;
    void restoreSession();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  const value: SimpleAuthContextValue = useMemo<SimpleAuthContextValue>(
    () => ({
      ready,
      loading,
      user,
      accessToken,
      error,
      appMode,
      loginWithCredentials,
      setSessionFromResponse,
      restoreSession,
      logout,
      refreshUser,
      navigateToPublicOrigin,
      redirectAfterLoginByRole,
    }),
    [
      ready,
      loading,
      user,
      accessToken,
      error,
      appMode,
      loginWithCredentials,
      setSessionFromResponse,
      restoreSession,
      logout,
      refreshUser,
      navigateToPublicOrigin,
      redirectAfterLoginByRole,
    ]
  );

  return <SimpleAuthContext.Provider value={value}>{children}</SimpleAuthContext.Provider>;
}

export function getAppMode(): AppMode {
  return readEnvAppMode();
}
