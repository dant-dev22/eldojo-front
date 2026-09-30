import { Platform } from "react-native";

import type { PublicAttendanceRouteParams } from "@/types/publicAttendance";

const PUBLIC_ATTENDANCE_PATH = /^\/([^/]+)\/([^/]+)\/asistencia(?:s)?\/?$/i;

function slugifyPublicSegment(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildPublicAttendancePath(
  organizationSlug: string,
  branchName: string,
  opts?: { classId?: number; kiosk?: boolean }
): string {
  const path = `/${encodeURIComponent(organizationSlug.trim())}/${encodeURIComponent(slugifyPublicSegment(branchName))}/asistencia`;
  const qs = new URLSearchParams();
  if (typeof opts?.classId === "number") {
    qs.set("class", String(opts.classId));
  }
  if (opts?.kiosk) {
    qs.set("kiosk", "1");
  }
  const qsStr = qs.toString();
  return qsStr ? `${path}?${qsStr}` : path;
}

export function buildPublicAttendanceUrl(
  origin: string,
  organizationSlug: string,
  branchName: string,
  opts?: { classId?: number; kiosk?: boolean }
): string {
  return `${origin.replace(/\/$/, "")}${buildPublicAttendancePath(organizationSlug, branchName, opts)}`;
}

export function getPublicAttendanceRoute(): PublicAttendanceRouteParams | null {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    return null;
  }

  const match = window.location.pathname.match(PUBLIC_ATTENDANCE_PATH);
  if (!match) {
    return null;
  }

  const [, organizationSlug, branchSlug] = match;

  const params: PublicAttendanceRouteParams = {
    organizationSlug: decodeURIComponent(organizationSlug),
    branchSlug: decodeURIComponent(branchSlug),
  };

  try {
    const url = new URL(window.location.href);
    const rawClass = url.searchParams.get("class");
    if (rawClass) {
      const parsed = Number(rawClass);
      if (Number.isFinite(parsed) && parsed > 0) {
        params.classId = parsed;
      }
    }
    if (url.searchParams.get("kiosk") === "1") {
      params.kiosk = true;
    }
  } catch {
    /* noop */
  }

  return params;
}
