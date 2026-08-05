export interface SessionHint {
  visitorId: string;
  userId?: string | number;
  userFullName?: string;
  userEmail?: string;
  updatedAt: string;
}

const HINT_COOKIE_NAME = "eldojo_session_hint";
const VISITOR_STORAGE_KEY = "eldojo_visitor_id";

function generateVisitorId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const rnd = (len: number) => {
    let out = "";
    const chars = "abcdef0123456789";
    const arr = new Uint8Array(len);
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      crypto.getRandomValues(arr);
    } else {
      for (let i = 0; i < len; i += 1) arr[i] = Math.floor(Math.random() * 256);
    }
    for (let i = 0; i < len; i += 1) out += chars[arr[i] % chars.length];
    return out;
  };
  return `${rnd(8)}-${rnd(4)}-4${rnd(3)}-${rnd(4)}-${rnd(12)}`;
}

function tryReadCookie(name: string): string | undefined {
  if (typeof document === "undefined" || !document.cookie) return undefined;
  const prefix = `${name}=`;
  const parts = document.cookie.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.indexOf(prefix) === 0) {
      return decodeURIComponent(trimmed.substring(prefix.length));
    }
  }
  return undefined;
}

function tryWriteCookie(name: string, value: string, days: number, domain?: string): void {
  if (typeof document === "undefined") return;
  const ms = days * 24 * 60 * 60 * 1000;
  const expires = new Date(Date.now() + ms).toUTCString();
  const secure = typeof window !== "undefined" && window.location.protocol === "https:";
  const parts: string[] = [
    `${name}=${encodeURIComponent(value)}`,
    `expires=${expires}`,
    "path=/",
    "SameSite=Lax",
  ];
  if (secure) parts.push("Secure");
  if (domain && domain.trim()) parts.push(`Domain=${domain.trim()}`);
  document.cookie = parts.join("; ");
}

function tryDeleteCookie(name: string, domain?: string): void {
  if (typeof document === "undefined") return;
  const parts: string[] = [
    `${name}=`,
    "expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "path=/",
    "SameSite=Lax",
  ];
  if (typeof window !== "undefined" && window.location.protocol === "https:") parts.push("Secure");
  if (domain && domain.trim()) parts.push(`Domain=${domain.trim()}`);
  document.cookie = parts.join("; ");
}

export function getVisitorId(): string {
  if (typeof localStorage !== "undefined") {
    const existing = localStorage.getItem(VISITOR_STORAGE_KEY);
    if (existing && existing.length > 0) return existing;
  }
  const hint = readSessionHint();
  if (hint?.visitorId) {
    if (typeof localStorage !== "undefined") localStorage.setItem(VISITOR_STORAGE_KEY, hint.visitorId);
    return hint.visitorId;
  }
  const fresh = generateVisitorId();
  if (typeof localStorage !== "undefined") localStorage.setItem(VISITOR_STORAGE_KEY, fresh);
  return fresh;
}

export function readSessionHint(): SessionHint | undefined {
  const raw = tryReadCookie(HINT_COOKIE_NAME);
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as SessionHint;
    if (!parsed.visitorId) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

export function isHintAuthenticated(): boolean {
  const hint = readSessionHint();
  if (!hint) return false;
  return Boolean(hint.userId && Number(hint.userId) > 0);
}

export function writeSessionAuthenticated(params: {
  userId: string | number;
  userFullName?: string;
  userEmail?: string;
  cookieDomain?: string;
}): SessionHint {
  const visitorId = getVisitorId();
  const payload: SessionHint = {
    visitorId,
    userId: params.userId,
    userFullName: params.userFullName,
    userEmail: params.userEmail,
    updatedAt: new Date().toISOString(),
  };
  tryWriteCookie(HINT_COOKIE_NAME, JSON.stringify(payload), 30, params.cookieDomain);
  return payload;
}

export function clearSessionAuthenticated(cookieDomain?: string): SessionHint {
  const visitorId = getVisitorId();
  const payload: SessionHint = {
    visitorId,
    updatedAt: new Date().toISOString(),
  };
  tryWriteCookie(HINT_COOKIE_NAME, JSON.stringify(payload), 365, cookieDomain);
  return payload;
}

export function hardClearSessionHint(cookieDomain?: string): void {
  tryDeleteCookie(HINT_COOKIE_NAME, cookieDomain);
}
