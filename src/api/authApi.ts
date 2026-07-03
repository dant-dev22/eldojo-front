import { http } from "@/api/http";
import type { LoginPayload, LoginResponse, StudentRegisterPayload, User } from "@/types/api";
import { getAccessToken } from "@/utils/storage";

function resolveApiUrl(): string {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL;

  if (!configuredUrl) {
    throw new Error("Define EXPO_PUBLIC_API_URL para apuntar al backend.");
  }

  if (typeof window === "undefined") {
    return configuredUrl;
  }

  try {
    const parsedUrl = new URL(configuredUrl);
    const usesLoopbackHost =
      parsedUrl.hostname === "127.0.0.1" || parsedUrl.hostname === "localhost";

    if (usesLoopbackHost && window.location.hostname) {
      parsedUrl.hostname = window.location.hostname;
    }

    return parsedUrl.toString().replace(/\/$/, "");
  } catch {
    return configuredUrl;
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${resolveApiUrl()}${path}`, init);
  const text = await response.text();
  const data = text ? (JSON.parse(text) as T | { detail?: string }) : null;

  if (!response.ok) {
    const detail =
      data && typeof data === "object" && "detail" in data && typeof data.detail === "string"
        ? data.detail
        : "No fue posible completar la solicitud.";
    throw new Error(detail);
  }

  return data as T;
}

function shouldUseWebFetch(): boolean {
  return typeof window !== "undefined";
}

export const authApi = {
  async login(payload: LoginPayload): Promise<LoginResponse> {
    if (shouldUseWebFetch()) {
      return requestJson<LoginResponse>("/auth/login", {
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
    }

    const { data } = await http.post<LoginResponse>("/auth/login", payload);
    return data;
  },

  async refresh(refreshToken: string): Promise<LoginResponse> {
    if (shouldUseWebFetch()) {
      return requestJson<LoginResponse>("/auth/refresh", {
        body: JSON.stringify({
          refresh_token: refreshToken,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
    }

    const { data } = await http.post<LoginResponse>("/auth/refresh", {
      refresh_token: refreshToken,
    });
    return data;
  },

  async registerStudent(payload: StudentRegisterPayload): Promise<LoginResponse> {
    if (shouldUseWebFetch()) {
      return requestJson<LoginResponse>("/auth/student/register", {
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
    }

    const { data } = await http.post<LoginResponse>("/auth/student/register", payload);
    return data;
  },

  async getCurrentUser(): Promise<User> {
    if (shouldUseWebFetch()) {
      const accessToken = await getAccessToken();

      return requestJson<User>("/auth/me", {
        headers: accessToken
          ? {
              Authorization: `Bearer ${accessToken}`,
            }
          : undefined,
        method: "GET",
      });
    }

    const { data } = await http.get<User>("/auth/me");
    return data;
  },
};
