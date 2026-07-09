import { Platform } from "react-native";

import type { PublicAttendanceRouteParams } from "@/types/publicAttendance";

const PUBLIC_ATTENDANCE_PATH = /^\/([^/]+)\/([^/]+)\/asistencias\/?$/i;

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
