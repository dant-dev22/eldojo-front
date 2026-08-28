import type { AuthTokens } from "@/types/api";
import { clearSession, getRefreshToken, saveSession } from "@/utils/storage";

type UnauthorizedHandler = () => Promise<void> | void;

let onUnauthorized: UnauthorizedHandler | null = null;
let refreshPromise: Promise<AuthTokens | null> | null = null;
let authOperationInFlight = 0;

export function registerUnauthorizedHandler(handler: UnauthorizedHandler): void {
  onUnauthorized = handler;
}

export function isAuthOperationInFlight(): boolean {
  return authOperationInFlight > 0;
}

export function markAuthOperationStart(): void {
  authOperationInFlight += 1;
}

export function markAuthOperationEnd(): void {
  authOperationInFlight = Math.max(0, authOperationInFlight - 1);
}

export async function withAuthOperationInFlight<T>(fn: () => Promise<T>): Promise<T> {
  markAuthOperationStart();
  try {
    return await fn();
  } finally {
    markAuthOperationEnd();
  }
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
        const { authApi } = await import("./authApi");
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
  if (isAuthOperationInFlight()) {
    return;
  }
  await clearSession();
  await onUnauthorized?.();
}
