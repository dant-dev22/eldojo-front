import type { AuthTokens } from "@/types/api";
import { clearSession, getRefreshToken, saveSession } from "@/utils/storage";

import { authApi } from "./authApi";

type UnauthorizedHandler = () => Promise<void> | void;

let onUnauthorized: UnauthorizedHandler | null = null;
let refreshPromise: Promise<AuthTokens | null> | null = null;

export function registerUnauthorizedHandler(handler: UnauthorizedHandler): void {
  onUnauthorized = handler;
}

export async function refreshSessionTokens(): Promise<AuthTokens | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) {
        await handleUnauthorized();
        return null;
      }

      try {
        const response = await authApi.refresh(refreshToken);
        const tokens: AuthTokens = {
          accessToken: response.access_token,
          refreshToken: response.refresh_token,
          expiresIn: response.expires_in,
          refreshExpiresIn: response.refresh_expires_in,
        };

        await saveSession(tokens, response.user);
        return tokens;
      } catch {
        await handleUnauthorized();
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

export async function handleUnauthorized(): Promise<void> {
  await clearSession();
  await onUnauthorized?.();
}
