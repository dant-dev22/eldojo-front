import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

import type { AuthTokens, PendingAcademyRegistration, User } from "@/types/api";

const ACCESS_TOKEN_KEY = "eldojo.access_token";
const REFRESH_TOKEN_KEY = "eldojo.refresh_token";
const USER_KEY = "eldojo.user";
const PENDING_ACADEMY_REGISTRATION_KEY = "eldojo.pending_academy_registration";

function isWebPlatform(): boolean {
  return Platform.OS === "web";
}

function getWebStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

async function setItem(key: string, value: string): Promise<void> {
  if (isWebPlatform()) {
    getWebStorage()?.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string): Promise<string | null> {
  if (isWebPlatform()) {
    return getWebStorage()?.getItem(key) ?? null;
  }

  return SecureStore.getItemAsync(key);
}

async function deleteItem(key: string): Promise<void> {
  if (isWebPlatform()) {
    getWebStorage()?.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
}

export async function saveSession(tokens: AuthTokens, user: User): Promise<void> {
  await Promise.all([
    setItem(ACCESS_TOKEN_KEY, tokens.accessToken),
    setItem(REFRESH_TOKEN_KEY, tokens.refreshToken),
    setItem(USER_KEY, JSON.stringify(user)),
  ]);
}

export async function getAccessToken(): Promise<string | null> {
  return getItem(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return getItem(REFRESH_TOKEN_KEY);
}

export async function getStoredUser(): Promise<User | null> {
  const rawUser = await getItem(USER_KEY);
  return rawUser ? (JSON.parse(rawUser) as User) : null;
}

export async function clearSession(): Promise<void> {
  await Promise.all([
    deleteItem(ACCESS_TOKEN_KEY),
    deleteItem(REFRESH_TOKEN_KEY),
    deleteItem(USER_KEY),
  ]);
}

export async function savePendingAcademyRegistration(
  pendingRegistration: PendingAcademyRegistration
): Promise<void> {
  if (!isWebPlatform()) {
    return;
  }

  await setItem(PENDING_ACADEMY_REGISTRATION_KEY, JSON.stringify(pendingRegistration));
}

export async function getPendingAcademyRegistration(): Promise<PendingAcademyRegistration | null> {
  if (!isWebPlatform()) {
    return null;
  }

  const rawPendingRegistration = await getItem(PENDING_ACADEMY_REGISTRATION_KEY);
  return rawPendingRegistration
    ? (JSON.parse(rawPendingRegistration) as PendingAcademyRegistration)
    : null;
}

export async function clearPendingAcademyRegistration(): Promise<void> {
  if (!isWebPlatform()) {
    return;
  }

  await deleteItem(PENDING_ACADEMY_REGISTRATION_KEY);
}
