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

export function buildPublicAttendancePath(organizationSlug: string, branchName: string): string {
  return `/${encodeURIComponent(organizationSlug.trim())}/${encodeURIComponent(slugifyPublicSegment(branchName))}/asistencia`;
}

export function buildPublicAttendanceUrl(origin: string, organizationSlug: string, branchName: string): string {
  return `${origin.replace(/\/$/, "")}${buildPublicAttendancePath(organizationSlug, branchName)}`;
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

  return {
    organizationSlug: decodeURIComponent(organizationSlug),
    branchSlug: decodeURIComponent(branchSlug),
  };
}
