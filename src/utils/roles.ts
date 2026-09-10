import type { User, UserRole } from "@/types/api";

export const GYM_ADMIN_ROLES: UserRole[] = ["org_admin", "branch_admin"];
export const STUDENT_ROLES: UserRole[] = ["student"];

export function isGymAdminRole(role: UserRole): boolean {
  return GYM_ADMIN_ROLES.includes(role);
}

export function isGymAdminUser(user: User | null | undefined): user is User {
  return Boolean(user && isGymAdminRole(user.role));
}

export function getGymAdminAccessMessage(): string {
  return "Este acceso está reservado para administradores de dojo. Los accesos de alumnos y super admins llegarán en interfaces separadas.";
}

export function isStudentRole(role: UserRole): boolean {
  return STUDENT_ROLES.includes(role);
}

export function isStudentUser(user: User | null | undefined): user is User {
  return Boolean(user && isStudentRole(user.role));
}

export function getStudentAccessMessage(): string {
  return "Este acceso está reservado para alumnos. Los administradores deben ingresar desde el panel administrativo.";
}
