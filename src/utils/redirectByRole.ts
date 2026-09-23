import { Platform } from "react-native";

import { buildAppUrl, buildPublicUrl, buildStudentUrl, APP_WEB_ORIGIN, PUBLIC_WEB_ORIGIN, STUDENT_WEB_ORIGIN } from "@/utils/domains";
import { isGymAdminRole, isStudentRole } from "@/utils/roles";
import type { UserRole } from "@/types/api";

export interface RedirectOptions {
  fresh?: boolean;
  welcome?: boolean;
  signedOut?: boolean;
  passwordReset?: boolean;
  reason?: string;
  fromApp?: boolean;
  fromStudent?: boolean;
  fromSite?: boolean;
  sessionTicket?: string;
  extra?: Record<string, string>;
}

function buildQuery(options: RedirectOptions = {}): Record<string, string> {
  const query: Record<string, string> = {};
  if (options.fresh) query.login_fresh = "1";
  if (options.welcome) query.welcome = "1";
  if (options.signedOut) query.signed_out = "1";
  if (options.passwordReset) query.password_reset = "1";
  if (options.reason) query.redirect_reason = options.reason;
  if (options.fromApp) query.from_app = "1";
  if (options.fromStudent) query.from_student = "1";
  if (options.fromSite) query.from_site = "1";
  if (options.sessionTicket) query.ticket = options.sessionTicket;
  if (options.extra) {
    Object.entries(options.extra).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") query[k] = String(v);
    });
  }
  return query;
}

export function isWebBrowser(): boolean {
  return Platform.OS === "web" && typeof window !== "undefined";
}

export function browserReplace(url: string): void {
  if (!isWebBrowser()) return;
  window.location.replace(url);
}

export function browserAssign(url: string): void {
  if (!isWebBrowser()) return;
  window.location.assign(url);
}

export function readUrlQueryParam(key: string): string | null {
  if (!isWebBrowser()) return null;
  const params = new URLSearchParams(window.location.search);
  return params.get(key);
}

export function clearUrlQueryParam(key: string): void {
  if (!isWebBrowser()) return;
  const url = new URL(window.location.href);
  if (url.searchParams.has(key)) {
    url.searchParams.delete(key);
    window.history.replaceState({}, "", url.toString());
  }
}

export function redirectAfterLoginByRole(role: UserRole, options: RedirectOptions = {}): void {
  const query = buildQuery(options);
  if (isGymAdminRole(role) || role === "super_admin") {
    browserAssign(buildAppUrl("/admin/overview", query));
    return;
  }
  if (isStudentRole(role)) {
    browserAssign(buildStudentUrl("/alumno", query));
    return;
  }
  browserAssign(buildPublicUrl("/", query));
}

export function redirectToPublicLogin(options: RedirectOptions = {}): void {
  const query = buildQuery(options);
  browserReplace(buildPublicUrl("/iniciar-sesion", query));
}

export function redirectToPublicHome(options: RedirectOptions = {}): void {
  const query = buildQuery(options);
  browserReplace(buildPublicUrl("/", query));
}

export function redirectToAdminDashboard(options: RedirectOptions = {}): void {
  const query = buildQuery(options);
  browserAssign(buildAppUrl("/admin/overview", query));
}

export function redirectToStudentPortal(options: RedirectOptions = {}): void {
  const query = buildQuery(options);
  browserAssign(buildStudentUrl("/alumno", query));
}

export function logoutGlobal(): void {
  redirectToPublicHome({ signedOut: true });
}

export function buildLogoutUrl(): string {
  return buildPublicUrl("/", { signed_out: "1" });
}

export function getInterDomainLinks(): {
  publicHome: string;
  publicLogin: string;
  adminDashboard: string;
  studentPortal: string;
} {
  return {
    publicHome: buildPublicUrl("/"),
    publicLogin: buildPublicUrl("/iniciar-sesion"),
    adminDashboard: buildAppUrl("/admin/overview"),
    studentPortal: buildStudentUrl("/alumno"),
  };
}
