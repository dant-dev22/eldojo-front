import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

import { refreshSessionTokens } from "@/api/sessionManager";
import type { ApiErrorResponse } from "@/types/api";
import { getAccessToken } from "@/utils/storage";

function resolveApiUrl(): string | undefined {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL;

  if (!configuredUrl) {
    return configuredUrl;
  }

  if (typeof window === "undefined") {
    return configuredUrl;
  }

  try {
    const parsedUrl = new URL(configuredUrl);
    const usesLoopbackHost =
      parsedUrl.hostname === "127.0.0.1" || parsedUrl.hostname === "localhost";

    if (!usesLoopbackHost || !window.location.hostname) {
      return configuredUrl;
    }

    parsedUrl.hostname = window.location.hostname;
    return parsedUrl.toString().replace(/\/$/, "");
  } catch {
    return configuredUrl;
  }
}

const apiUrl = resolveApiUrl();

if (!apiUrl) {
  throw new Error("Define EXPO_PUBLIC_API_URL para apuntar al backend.");
}

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export const http = axios.create({
  baseURL: apiUrl,
  timeout: 15_000,
});

http.interceptors.request.use(async (config) => {
  const token = await getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/login") &&
      !originalRequest.url?.includes("/auth/refresh")
    ) {
      originalRequest._retry = true;
      const refreshedTokens = await refreshSessionTokens();

      if (refreshedTokens) {
        originalRequest.headers.Authorization = `Bearer ${refreshedTokens.accessToken}`;
        return http(originalRequest);
      }
    }

    return Promise.reject(error);
  }
);

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    return error.response?.data?.detail ?? "No fue posible completar la solicitud.";
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Ocurrió un error inesperado.";
}
