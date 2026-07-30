import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";

import { authApi } from "@/api/authApi";
import { handleUnauthorized, registerUnauthorizedHandler } from "@/api/sessionManager";
import type {
  AcademyRegisterPayload,
  AcademyRegisterResponse,
  AuthTokens,
  LoginPayload,
  User,
} from "@/types/api";
import { clearSession, getAccessToken, getRefreshToken, getStoredUser, saveSession } from "@/utils/storage";
import { getGymAdminAccessMessage, isGymAdminUser } from "@/utils/roles";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  signIn: (payload: LoginPayload) => Promise<void>;
  registerAcademy: (payload: AcademyRegisterPayload) => Promise<AcademyRegisterResponse>;
  confirmAcademyAccount: (token: string) => Promise<void>;
  resendAcademyConfirmation: (email: string) => Promise<AcademyRegisterResponse>;
  signOut: () => Promise<void>;
  completeFirstTimeTutorial: () => Promise<void>;
  refreshUser: () => Promise<void>;
  showPostConfirmation: boolean;
  dismissPostConfirmation: () => void;
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

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [showPostConfirmation, setShowPostConfirmation] = useState(false);

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
          return;
        }
        const [accessToken, refreshToken] = await Promise.all([getAccessToken(), getRefreshToken()]);
        if (accessToken && refreshToken) {
          await persistAuthenticatedUser(freshUser);
        }
        setUser(freshUser);
        setStatus("authenticated");
      } catch {
        await handleUnauthorized();
      }
    };

    void restoreSession();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      signIn: async (payload) => {
        const response = await authApi.login(payload);
        if (!isGymAdminUser(response.user)) {
          await clearSession();
          throw new Error(getGymAdminAccessMessage());
        }
        await saveSession(mapTokens(response), response.user);
        setUser(response.user);
        setShowPostConfirmation(false);
        setStatus("authenticated");
      },
      registerAcademy: async (payload) => {
        return authApi.registerAcademy(payload);
      },
      confirmAcademyAccount: async (token) => {
        const response = await authApi.confirmAcademy({ token });
        if (!isGymAdminUser(response.user)) {
          await clearSession();
          throw new Error(getGymAdminAccessMessage());
        }
        await saveSession(mapTokens(response), response.user);
        setUser(response.user);
        setShowPostConfirmation(true);
        setStatus("authenticated");
      },
      resendAcademyConfirmation: async (email) =>
        authApi.resendAcademyConfirmation({ email: email.trim().toLowerCase() }),
      signOut: async () => {
        if (user?.first_time) {
          try {
            await authApi.updateTutorialState({ first_time: false });
          } catch {
            // El cierre de sesión no debe bloquearse si la sincronización falla.
          }
        }
        await clearSession();
        setUser(null);
        setShowPostConfirmation(false);
        setStatus("unauthenticated");
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
          return;
        }
        const [accessToken, storedRefreshToken] = await Promise.all([
          getAccessToken(),
          getRefreshToken(),
        ]);

        if (accessToken && storedRefreshToken) {
          await persistAuthenticatedUser(freshUser);
        }

        setUser(freshUser);
        setStatus("authenticated");
      },
      showPostConfirmation,
      dismissPostConfirmation: () => setShowPostConfirmation(false),
    }),
    [showPostConfirmation, status, user]
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
