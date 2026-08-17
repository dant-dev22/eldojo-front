import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";

import { authApi } from "@/api/authApi";
import { handleUnauthorized, registerUnauthorizedHandler } from "@/api/sessionManager";
import type {
  AcademyRegisterPayload,
  AcademyRegisterResponse,
  AuthTokens,
  LoginPayload,
  PendingAcademyRegistration,
  User,
} from "@/types/api";
import { buildAppUrl, buildPublicUrl, getDomainConfig } from "@/utils/domains";
import {
  clearSessionAuthenticated,
  writeSessionAuthenticated,
} from "@/utils/sessionHint";
import {
  clearPendingAcademyRegistration,
  clearSession,
  getAccessToken,
  getRefreshToken,
  getStoredUser,
  saveSession,
} from "@/utils/storage";
import { getGymAdminAccessMessage, isGymAdminUser } from "@/utils/roles";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface CrossDomainAuthResult {
  redirectedToApp: boolean;
  appRedirectUrl?: string;
}

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  signIn: (payload: LoginPayload) => Promise<CrossDomainAuthResult>;
  registerAcademy: (payload: AcademyRegisterPayload) => Promise<AcademyRegisterResponse>;
  confirmAcademyAccount: (token: string) => Promise<CrossDomainAuthResult>;
  redeemPendingAcademySession: (
    pendingRegistration: PendingAcademyRegistration
  ) => Promise<CrossDomainAuthResult>;
  resendAcademyConfirmation: (email: string) => Promise<AcademyRegisterResponse>;
  signOut: (redirectToPublic?: boolean) => Promise<void>;
  completeFirstTimeTutorial: () => Promise<void>;
  refreshUser: () => Promise<void>;
  showPostConfirmation: boolean;
  dismissPostConfirmation: () => void;
  justLoggedIn: boolean;
  consumeJustLoggedIn: () => void;
  redeemSessionTicket: (ticket: string) => Promise<User>;
  redirectToPublicLogin: (redirectAfterLogin?: string) => void;
  redirectToAppDashboard: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function mapTokens(response: {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
}): AuthTokens {
  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    expiresIn: response.expires_in,
    refreshExpiresIn: response.refresh_expires_in,
  };
}

function buildFullName(user: User): string | undefined {
  const parts = [user.first_name, user.last_name].filter(Boolean);
  return parts.length ? parts.join(" ") : undefined;
}

function updateHintForUser(user: User | null): void {
  const { sessionCookieDomain } = getDomainConfig();
  if (user) {
    writeSessionAuthenticated({
      userId: user.id,
      userFullName: buildFullName(user),
      userEmail: user.email,
      cookieDomain: sessionCookieDomain,
    });
  } else {
    clearSessionAuthenticated(sessionCookieDomain);
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [showPostConfirmation, setShowPostConfirmation] = useState(false);
  const [justLoggedIn, setJustLoggedIn] = useState(false);

  const persistAuthenticatedUser = async (nextUser: User) => {
    const [accessToken, refreshToken] = await Promise.all([getAccessToken(), getRefreshToken()]);

    if (accessToken && refreshToken) {
      await saveSession(
        {
          accessToken,
          refreshToken,
          expiresIn: 0,
          refreshExpiresIn: 0,
        },
        nextUser
      );
    }
  };

  useEffect(() => {
    registerUnauthorizedHandler(async () => {
      setUser(null);
      setStatus("unauthenticated");
      updateHintForUser(null);
    });
  }, []);

  useEffect(() => {
    const restoreSession = async () => {
      const [token, storedUser] = await Promise.all([getAccessToken(), getStoredUser()]);

      if (!token || !storedUser) {
        setStatus("unauthenticated");
        setUser(null);
        return;
      }

      setUser(storedUser);
      setShowPostConfirmation(false);

      try {
        const freshUser = await authApi.getCurrentUser();
        if (!isGymAdminUser(freshUser)) {
          await clearSession();
          setUser(null);
          setStatus("unauthenticated");
          updateHintForUser(null);
          return;
        }
        const [accessToken, refreshToken] = await Promise.all([getAccessToken(), getRefreshToken()]);
        if (accessToken && refreshToken) {
          await persistAuthenticatedUser(freshUser);
        }
        updateHintForUser(freshUser);
        setUser(freshUser);
        setStatus("authenticated");
      } catch {
        updateHintForUser(null);
        await handleUnauthorized();
      }
    };

    void restoreSession();
  }, []);

  const redirectToPublicLogin: AuthContextValue["redirectToPublicLogin"] = (redirectAfterLogin) => {
    if (typeof window === "undefined") return;
    const cfg = getDomainConfig();
    const redirectQuery = redirectAfterLogin
      ? { redirect_to: redirectAfterLogin }
      : undefined;
    const params = new URLSearchParams();
    Object.entries(redirectQuery || {}).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    const qs = params.toString();
    const path = `/iniciar-sesion${qs ? `?${qs}` : ""}`;
    let destination: string;
    if (cfg.isPublicHostname) {
      destination = path;
    } else {
      destination = buildPublicUrl("iniciar-sesion", redirectQuery);
    }
    const current = `${window.location.pathname}${window.location.search}`;
    const resolvedDest = destination.startsWith("http")
      ? new URL(destination).pathname + new URL(destination).search
      : destination;
    if (resolvedDest === current) {
      return;
    }
    window.location.assign(destination);
  };

  const redirectToAppDashboard: AuthContextValue["redirectToAppDashboard"] = () => {
    if (typeof window === "undefined") return;
    const cfg = getDomainConfig();
    if (cfg.isAppHostname) {
      window.location.assign("/admin");
    } else {
      window.location.assign(buildAppUrl("admin"));
    }
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      signIn: async (payload) => {
        const cfg = getDomainConfig();
        const response = await authApi.login(payload);
        if (!isGymAdminUser(response.user)) {
          await clearSession();
          throw new Error(getGymAdminAccessMessage());
        }
        await clearPendingAcademyRegistration();
        await saveSession(mapTokens(response), response.user);
        setUser(response.user);
        setShowPostConfirmation(false);
        setStatus("authenticated");
        setJustLoggedIn(true);
        updateHintForUser(response.user);

        if (cfg.isAppHostname) {
          return { redirectedToApp: false };
        }

        const ticketResponse = await authApi.createSessionSyncTicket();
        const appRedirectUrl = buildAppUrl("", {
          session_ticket: ticketResponse.ticket,
        });
        if (typeof window !== "undefined") {
          window.location.assign(appRedirectUrl);
        }
        return { redirectedToApp: true, appRedirectUrl };
      },
      registerAcademy: async (payload) => {
        return authApi.registerAcademy(payload);
      },
      confirmAcademyAccount: async (token) => {
        const cfg = getDomainConfig();
        const response = await authApi.confirmAcademy({ token });
        if (!isGymAdminUser(response.user)) {
          await clearSession();
          throw new Error(getGymAdminAccessMessage());
        }
        await clearPendingAcademyRegistration();
        await saveSession(mapTokens(response), response.user);
        setUser(response.user);
        setShowPostConfirmation(true);
        setStatus("authenticated");
        setJustLoggedIn(true);
        updateHintForUser(response.user);

        if (cfg.isAppHostname) {
          return { redirectedToApp: false };
        }

        const ticketResponse = await authApi.createSessionSyncTicket();
        const appRedirectUrl = buildAppUrl("admin", {
          session_ticket: ticketResponse.ticket,
          welcome: "1",
        });
        if (typeof window !== "undefined") {
          window.location.assign(appRedirectUrl);
        }
        return { redirectedToApp: true, appRedirectUrl };
      },
      redeemPendingAcademySession: async (pendingRegistration) => {
        const cfg = getDomainConfig();
        const response = await authApi.redeemAcademyPendingSession({
          ticket: pendingRegistration.pendingSessionTicket,
        });
        if (!isGymAdminUser(response.user)) {
          await clearSession();
          throw new Error(getGymAdminAccessMessage());
        }
        await clearPendingAcademyRegistration();
        await saveSession(mapTokens(response), response.user);
        setUser(response.user);
        setShowPostConfirmation(false);
        setStatus("authenticated");
        setJustLoggedIn(true);
        updateHintForUser(response.user);

        if (cfg.isAppHostname) {
          return { redirectedToApp: false };
        }

        const ticketResponse = await authApi.createSessionSyncTicket();
        const appRedirectUrl = buildAppUrl("admin", {
          session_ticket: ticketResponse.ticket,
        });
        if (typeof window !== "undefined") {
          window.location.assign(appRedirectUrl);
        }
        return { redirectedToApp: true, appRedirectUrl };
      },
      resendAcademyConfirmation: async (email) =>
        authApi.resendAcademyConfirmation({ email: email.trim().toLowerCase() }),
      signOut: async (redirectToPublic = true) => {
        const cfg = getDomainConfig();
        if (user?.first_time) {
          try {
            await authApi.updateTutorialState({ first_time: false });
          } catch {
            // El cierre de sesión no debe bloquearse si la sincronización falla.
          }
        }
        updateHintForUser(null);
        await clearPendingAcademyRegistration();
        await clearSession();
        setUser(null);
        setShowPostConfirmation(false);
        setStatus("unauthenticated");
        setJustLoggedIn(false);

        if (redirectToPublic && typeof window !== "undefined") {
          if (cfg.isAppHostname) {
            window.location.assign(buildPublicUrl(""));
          }
        }
      },
      completeFirstTimeTutorial: async () => {
        const updatedUser = await authApi.updateTutorialState({ first_time: false });
        await persistAuthenticatedUser(updatedUser);
        setUser(updatedUser);
      },
      refreshUser: async () => {
        const freshUser = await authApi.getCurrentUser();
        if (!isGymAdminUser(freshUser)) {
          await clearSession();
          setUser(null);
          setStatus("unauthenticated");
          updateHintForUser(null);
          return;
        }
        const [accessToken, storedRefreshToken] = await Promise.all([
          getAccessToken(),
          getRefreshToken(),
        ]);

        if (accessToken && storedRefreshToken) {
          await persistAuthenticatedUser(freshUser);
        }
        updateHintForUser(freshUser);
        setUser(freshUser);
        setStatus("authenticated");
      },
      showPostConfirmation,
      dismissPostConfirmation: () => setShowPostConfirmation(false),
      justLoggedIn,
      consumeJustLoggedIn: () => setJustLoggedIn(false),
      redeemSessionTicket: async (ticket) => {
        const response = await authApi.redeemSessionSyncTicket(ticket);
        if (!isGymAdminUser(response.user)) {
          await clearSession();
          throw new Error(getGymAdminAccessMessage());
        }
        await clearPendingAcademyRegistration();
        await saveSession(mapTokens(response), response.user);
        updateHintForUser(response.user);
        setUser(response.user);
        setShowPostConfirmation(false);
        setStatus("authenticated");
        setJustLoggedIn(true);
        return response.user;
      },
      redirectToPublicLogin,
      redirectToAppDashboard,
    }),
    [justLoggedIn, showPostConfirmation, status, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider.");
  }

  return context;
}
