import axios from "axios";

import type { AuthTokens } from "@/types/api";
import { clearSession, getRefreshToken, saveSession } from "@/utils/storage";

type UnauthorizedHandler = () => Promise<void> | void;

let onUnauthorized: UnauthorizedHandler | null = null;
let refreshPromise: Promise<AuthTokens | null> | null = null;

export function registerUnauthorizedHandler(handler: UnauthorizedHandler): void {
  onUnauthorized = handler;
}

function isRefreshTokenInvalidError(error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    return status === 401;
  }

  if (error instanceof Error) {
    const message = error.message || "";
    const lower = message.toLowerCase();
    return (
      lower.includes("refresh token") &&
      (lower.includes("inválido") || lower.includes("invalido") || lower.includes("expirado"))
    );
  }

  return false;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function refreshWithRetry(refreshToken: string): Promise<AuthTokens | "transient_failure" | "invalid_token"> {
  const maxAttempts = 3;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
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
    } catch (error) {
      if (isRefreshTokenInvalidError(error)) {
        return "invalid_token";
      }

      if (attempt < maxAttempts - 1) {
        await sleep((attempt + 1) * 500);
        continue;
      }

      return "transient_failure";
    }
  }

  return "transient_failure";
}

export async function refreshSessionTokens(): Promise<AuthTokens | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) {
        await handleUnauthorized();
        return null;
      }

      const result = await refreshWithRetry(refreshToken);

      if (result === "invalid_token") {
        await handleUnauthorized();
        return null;
      }

      if (result === "transient_failure") {
        return null;
      }

      return result;
    })();
  }

  return refreshPromise;
}

export async function handleUnauthorized(): Promise<void> {
  await clearSession();
  await onUnauthorized?.();
}
