import { http } from "@/api/http";
import type {
  AcademyConfirmPayload,
  AcademyPendingSessionPayload,
  AcademyPendingSessionStatusResponse,
  AcademyRegisterPayload,
  AcademyRegisterResponse,
  AcademyResendConfirmationPayload,
  LoginPayload,
  LoginResponse,
  StudentRegisterPayload,
  User,
} from "@/types/api";
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

  async registerAcademy(payload: AcademyRegisterPayload): Promise<AcademyRegisterResponse> {
    if (shouldUseWebFetch()) {
      return requestJson<AcademyRegisterResponse>("/auth/academy/register", {
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
    }

    const { data } = await http.post<AcademyRegisterResponse>("/auth/academy/register", payload);
    return data;
  },

  async confirmAcademy(payload: AcademyConfirmPayload): Promise<LoginResponse> {
    if (shouldUseWebFetch()) {
      return requestJson<LoginResponse>("/auth/academy/confirm", {
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
    }

    const { data } = await http.post<LoginResponse>("/auth/academy/confirm", payload);
    return data;
  },

  async resendAcademyConfirmation(
    payload: AcademyResendConfirmationPayload
  ): Promise<AcademyRegisterResponse> {
    if (shouldUseWebFetch()) {
      return requestJson<AcademyRegisterResponse>("/auth/academy/resend-confirmation", {
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
    }

    const { data } = await http.post<AcademyRegisterResponse>(
      "/auth/academy/resend-confirmation",
      payload
    );
    return data;
  },

  async getAcademyPendingSessionStatus(
    payload: AcademyPendingSessionPayload
  ): Promise<AcademyPendingSessionStatusResponse> {
    if (shouldUseWebFetch()) {
      return requestJson<AcademyPendingSessionStatusResponse>("/auth/academy/pending-session/status", {
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
    }

    const { data } = await http.post<AcademyPendingSessionStatusResponse>(
      "/auth/academy/pending-session/status",
      payload
    );
    return data;
  },

  async redeemAcademyPendingSession(payload: AcademyPendingSessionPayload): Promise<LoginResponse> {
    if (shouldUseWebFetch()) {
      return requestJson<LoginResponse>("/auth/academy/pending-session/redeem", {
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
    }

    const { data } = await http.post<LoginResponse>("/auth/academy/pending-session/redeem", payload);
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

  async updateTutorialState(payload: { first_time: boolean }): Promise<User> {
    if (shouldUseWebFetch()) {
      const accessToken = await getAccessToken();

      return requestJson<User>("/auth/me/tutorial-state", {
        body: JSON.stringify(payload),
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });
    }

    const { data } = await http.patch<User>("/auth/me/tutorial-state", payload);
    return data;
  },
};
