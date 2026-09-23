import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";

import { useSimpleAuth } from "@/context/SimpleAuthProvider";
import { judogiRed } from "@/constants/theme";
import { PUBLIC_WEB_ORIGIN, STUDENT_WEB_ORIGIN, buildStudentUrl, buildPublicUrl, buildAppUrl } from "@/utils/domains";
import { isGymAdminRole, isStudentRole } from "@/utils/roles";
import type { UserRole } from "@/types/api";
import { getAccessToken, getStoredUser } from "@/utils/storage";

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
  const redirectArmed = useRef<boolean>(false);
  const [extraWaitingCycles, setExtraWaitingCycles] = useState<number>(0);
  const storageCheckStarted = useRef<boolean>(false);

  useEffect(() => {
    if (!ready) return;
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    if (redirectArmed.current) return;

    if (user) {
      const userIsAdmin = isGymAdminRole(user.role) || user.role === "super_admin";
      const userIsStudent = isStudentRole(user.role);

      if (requiredRole === "gym_admin" && !userIsAdmin) {
        if (userIsStudent) {
          const studentOrigin = STUDENT_WEB_ORIGIN ?? buildStudentUrl("/alumno");
          const redirectTo = buildStudentUrl("/alumno", { redirect_reason: "admin_gate_student_role" });
          redirectArmed.current = true;
          void logout(false);
          window.location.replace(redirectTo);
          return;
        }
        const redirectTo = buildPublicUrl("/iniciar-sesion", { redirect_reason: "not_admin" });
        redirectArmed.current = true;
        void logout(false);
        window.location.replace(redirectTo);
        return;
      }

      if (requiredRole === "student" && !userIsStudent) {
        if (userIsAdmin) {
          const redirectTo = buildAppUrl("/admin/overview", { redirect_reason: "student_gate_admin_role" });
          redirectArmed.current = true;
          void logout(false);
          window.location.replace(redirectTo);
          return;
        }
        const redirectTo = buildPublicUrl("/iniciar-sesion", { redirect_reason: "not_student" });
        redirectArmed.current = true;
        void logout(false);
        window.location.replace(redirectTo);
        return;
      }

      if (appMode === "admin" && !userIsAdmin) {
        const redirectTo = buildPublicUrl("/iniciar-sesion", { redirect_reason: "app_mode_mismatch" });
        redirectArmed.current = true;
        window.location.replace(redirectTo);
        return;
      }
      if (appMode === "student" && !userIsStudent) {
        const redirectTo = buildPublicUrl("/iniciar-sesion", { redirect_reason: "student_mode_mismatch" });
        redirectArmed.current = true;
        window.location.replace(redirectTo);
        return;
      }
      return;
    }

    if (!storageCheckStarted.current) {
      storageCheckStarted.current = true;
      let cancelled = false;
      let cycles = 0;
      const maxCycles = 6;
      const eachMs = 300;

      const poll = async () => {
        while (!cancelled && cycles < maxCycles) {
          cycles += 1;
          const [tok, storedUser] = await Promise.all([getAccessToken(), getStoredUser()]);
          if (tok && storedUser) {
            setExtraWaitingCycles((c) => c + 1);
            await new Promise((r) => setTimeout(r, eachMs));
            return;
          }
          setExtraWaitingCycles(cycles);
          await new Promise((r) => setTimeout(r, eachMs));
        }
        if (cancelled) return;
        const redirectUrl = defaultRedirectUrl("student", requiredRole);
        redirectArmed.current = true;
        window.location.replace(redirectUrl);
      };

      void poll();
      return () => {
        cancelled = true;
      };
    }
  }, [ready, user, requiredRole, appMode, logout, extraWaitingCycles]);

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
