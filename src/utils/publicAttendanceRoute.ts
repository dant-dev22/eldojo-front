import { Platform } from "react-native";

import type { PublicAttendanceRouteParams } from "@/types/publicAttendance";

import { ADMIN_ROUTE_SEGMENTS } from "@/navigation/publicRoutes";

const PUBLIC_ATTENDANCE_PATH = /^\/([^/]+)\/([^/]+)\/asistencia(?:s)?\/?$/i;

/**
 * NOTA: Usado por QrKioskLauncherModal para armar slugs de display.
 * No confundir con armado de URLs de asistencia (hoy privadas vía buildAdminKioskUrl).
 */
export function slugifyPublicSegment(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * @deprecated Ruta pública eliminada por requerimiento de seguridad.
 * Usar buildAdminKioskUrl.
 */
// @ts-ignore - deprecated, kept for reference
function buildPublicAttendancePath(
  _organizationSlug: string,
  _branchName: string,
  _opts?: { classId?: number; kiosk?: boolean }
): string {
  return "";
}

/**
 * @deprecated Ruta pública eliminada por requerimiento de seguridad.
 * Usar buildAdminKioskUrl.
 */
// @ts-ignore - deprecated, kept for reference
function buildPublicAttendanceUrl(
  _origin: string,
  _organizationSlug: string,
  _branchName: string,
  _opts?: { classId?: number; kiosk?: boolean }
): string {
  return "";
}

/**
 * Legacy: PublicAttendanceScreen lo usa como fallback interno para routeParams.
 * El bypass en AppNavigator fue REMOVIDO — esta función ya NO habilita acceso sin sesión.
 */
export function getPublicAttendanceRoute(): PublicAttendanceRouteParams | null {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  const match = window.location.pathname.match(PUBLIC_ATTENDANCE_PATH);
  if (!match) return null;
  return null;
}

export function buildAdminKioskUrl(
  origin: string,
  branchId: number,
  opts?: { classId?: number }
): string {
  const adminRoot = ADMIN_ROUTE_SEGMENTS.root ?? "admin";
  const kioskSegment = ADMIN_ROUTE_SEGMENTS.attendanceKiosk ?? "asistencias-kiosk";
  const path = `/${adminRoot}/${kioskSegment}`;
  const qs = new URLSearchParams();
  if (Number.isFinite(branchId) && branchId > 0) {
    qs.set("branch", String(branchId));
  }
  if (typeof opts?.classId === "number" && opts.classId > 0) {
    qs.set("class", String(opts.classId));
  }
  const qsStr = qs.toString();
  return `${origin.replace(/\/$/, "")}${path}${qsStr ? `?${qsStr}` : ""}`;
}
