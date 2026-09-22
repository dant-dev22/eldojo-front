import React, { useEffect } from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";

import { useSimpleAuth } from "@/context/SimpleAuthProvider";
import { judogiRed } from "@/constants/theme";
import { PUBLIC_WEB_ORIGIN, STUDENT_WEB_ORIGIN, buildStudentUrl, buildPublicUrl } from "@/utils/domains";
import { isGymAdminRole, isStudentRole } from "@/utils/roles";
import type { UserRole } from "@/types/api";

interface AuthGateProps {
  children: React.ReactNode;
  requiredRole: "gym_admin" | "student" | "any";
  loadingComponent?: React.ReactNode;
}

function defaultRedirectUrl(role: UserRole, desiredRole: "gym_admin" | "student" | "any"): string {
  const publicOrigin = PUBLIC_WEB_ORIGIN ?? "/";
  if (desiredRole === "gym_admin") {
    const target = publicOrigin + "/iniciar-sesion";
    const query = new URLSearchParams({ redirect_reason: "no_auth_admin" }).toString();
    return target + "?" + query;
  }
  if (desiredRole === "student") {
    const target = publicOrigin + "/iniciar-sesion";
    const query = new URLSearchParams({ redirect_reason: "no_auth_student" }).toString();
    return target + "?" + query;
  }
  const target = publicOrigin + "/iniciar-sesion";
  const query = new URLSearchParams({ redirect_reason: "no_auth" }).toString();
  return target + "?" + query;
}

export function SimpleAuthGate({ children, requiredRole, loadingComponent }: AuthGateProps) {
  const { ready, user, appMode, logout } = useSimpleAuth();

  useEffect(() => {
    if (!ready) return;
    if (Platform.OS !== "web" || typeof window === "undefined") return;

    if (!user) {
      const redirectUrl = defaultRedirectUrl("student", requiredRole);
      window.location.replace(redirectUrl);
      return;
    }

    const userIsAdmin = isGymAdminRole(user.role);
    const userIsStudent = isStudentRole(user.role);

    if (requiredRole === "gym_admin" && !userIsAdmin) {
      if (userIsStudent) {
        const studentOrigin = STUDENT_WEB_ORIGIN ?? buildStudentUrl("/alumno");
        const redirectTo = buildStudentUrl("/alumno", { redirect_reason: "admin_gate_student_role" });
        void logout(false);
        window.location.replace(redirectTo);
        return;
      }
      const redirectTo = buildPublicUrl("/iniciar-sesion", { redirect_reason: "not_admin" });
      void logout(false);
      window.location.replace(redirectTo);
      return;
    }

    if (requiredRole === "student" && !userIsStudent) {
      if (userIsAdmin) {
        const redirectTo = (PUBLIC_WEB_ORIGIN ?? "") + "/admin/overview?redirect_reason=student_gate_admin_role";
        void logout(false);
        window.location.replace(redirectTo);
        return;
      }
      const redirectTo = buildPublicUrl("/iniciar-sesion", { redirect_reason: "not_student" });
      void logout(false);
      window.location.replace(redirectTo);
      return;
    }

    if (appMode === "admin" && !userIsAdmin) {
      const redirectTo = buildPublicUrl("/iniciar-sesion", { redirect_reason: "app_mode_mismatch" });
      window.location.replace(redirectTo);
      return;
    }
    if (appMode === "student" && !userIsStudent) {
      const redirectTo = buildPublicUrl("/iniciar-sesion", { redirect_reason: "student_mode_mismatch" });
      window.location.replace(redirectTo);
      return;
    }
  }, [ready, user, requiredRole, appMode, logout]);

  if (!ready) {
    return (
      <View style={styles.loadingWrapper}>
        {loadingComponent ?? <ActivityIndicator size="large" color={judogiRed} />}
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.loadingWrapper}>
        <ActivityIndicator size="small" color={judogiRed} />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
