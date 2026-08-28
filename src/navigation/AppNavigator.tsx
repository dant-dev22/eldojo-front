import { NavigationContainer, DefaultTheme, LinkingOptions } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";

import { StatusView } from "@/components/StatusView";
import { colors } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { AdminDashboardScreen } from "@/screens/admin/AdminDashboardScreen";
import { QrCodesListScreen } from "@/screens/admin/QrCodesListScreen";
import { StudentDetailScreen } from "@/screens/admin/StudentDetailScreen";
import { StudentsListScreen } from "@/screens/admin/StudentsListScreen";
import { TrajectoryDetailScreen } from "@/screens/admin/TrajectoryDetailScreen";
import { TrajectoryListScreen } from "@/screens/admin/TrajectoryListScreen";
import { AccountConfirmedScreen } from "@/screens/auth/AccountConfirmedScreen";
import { ConfirmAccountScreen } from "@/screens/auth/ConfirmAccountScreen";
import {
  AboutScreen,
  CreateAccountScreen,
  EventsScreen,
  HomeScreen,
  SignInScreen,
  StoresScreen,
} from "@/screens/auth/PublicSiteScreen";
import { PublicAttendanceScreen } from "@/screens/public/PublicAttendanceScreen";
import { PUBLIC_HOME_ALIAS_PATHS, PUBLIC_SCREEN_PATHS } from "@/navigation/publicRoutes";
import { buildAppUrl, getDomainConfig } from "@/utils/domains";
import { getPublicAttendanceRoute } from "@/utils/publicAttendanceRoute";
import { isGymAdminUser } from "@/utils/roles";

import type { AdminStackParamList, AuthStackParamList } from "./types";

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AdminStack = createNativeStackNavigator<AdminStackParamList>();
type RootPathParamList = AuthStackParamList & AdminStackParamList;

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.surface,
    border: colors.border,
    primary: colors.primary,
    text: colors.text,
  },
};

const linking: LinkingOptions<RootPathParamList> = {
  prefixes: [],
  config: {
    screens: {
      About: PUBLIC_SCREEN_PATHS.About,
      AdminHome: "admin",
      ConfirmAccount: PUBLIC_SCREEN_PATHS.ConfirmAccount,
      CreateAccount: PUBLIC_SCREEN_PATHS.CreateAccount,
      Events: PUBLIC_SCREEN_PATHS.Events,
      Home: PUBLIC_SCREEN_PATHS.Home,
      SignIn: PUBLIC_SCREEN_PATHS.SignIn,
      Stores: PUBLIC_SCREEN_PATHS.Stores,
      QrCodesList: "admin/codigos-qr",
      StudentDetail: "admin/alumnos/:studentId",
      StudentsList: "admin/alumnos",
      TrajectoryList: "admin/trayectoria",
      TrajectoryDetail: "admin/trayectoria/:studentId",
    },
  },
};

function readQueryParam(name: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const url = new URL(window.location.href);
    return url.searchParams.get(name) ?? undefined;
  } catch {
    return undefined;
  }
}

function removeQueryParams(params: string[]): void {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    let changed = false;
    params.forEach((p) => {
      if (url.searchParams.has(p)) {
        url.searchParams.delete(p);
        changed = true;
      }
    });
    if (changed) {
      window.history.replaceState(window.history.state, "", url.toString());
    }
  } catch {
    /* noop */
  }
}

function AuthFlow() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen
        component={HomeScreen}
        name="Home"
      />
      <AuthStack.Screen
        component={AboutScreen}
        name="About"
      />
      <AuthStack.Screen
        component={EventsScreen}
        name="Events"
      />
      <AuthStack.Screen
        component={StoresScreen}
        name="Stores"
      />
      <AuthStack.Screen
        component={CreateAccountScreen}
        name="CreateAccount"
      />
      <AuthStack.Screen
        component={SignInScreen}
        name="SignIn"
      />
      <AuthStack.Screen
        component={ConfirmAccountScreen}
        name="ConfirmAccount"
      />
    </AuthStack.Navigator>
  );
}

function AdminFlow() {
  return (
    <AdminStack.Navigator screenOptions={{ headerShown: false }}>
      <AdminStack.Screen
        component={AdminDashboardScreen}
        name="AdminHome"
      />
      <AdminStack.Screen
        component={StudentsListScreen}
        name="StudentsList"
      />
      <AdminStack.Screen
        component={StudentDetailScreen}
        name="StudentDetail"
      />
      <AdminStack.Screen
        component={QrCodesListScreen}
        name="QrCodesList"
      />
      <AdminStack.Screen
        component={TrajectoryListScreen}
        name="TrajectoryList"
      />
      <AdminStack.Screen
        component={TrajectoryDetailScreen}
        name="TrajectoryDetail"
      />
    </AdminStack.Navigator>
  );
}

export function AppNavigator() {
  const {
    showPostConfirmation,
    status,
    user,
    justLoggedIn,
    consumeJustLoggedIn,
    redeemSessionTicket,
    redirectToPublicLogin,
    signOut,
  } = useAuth();
  const publicAttendanceRoute = getPublicAttendanceRoute();
  const domainCfg = useMemo(() => getDomainConfig(), []);
  const [ticketRedeemState, setTicketRedeemState] = useState<
    "idle" | "redeeming" | "success" | "error"
  >("idle");
  const [ticketRedeemError, setTicketRedeemError] = useState<string | undefined>();

  const sessionTicket = readQueryParam("session_ticket");
  const redirectTo = readQueryParam("redirect_to") || readQueryParam("redirect");

  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (!sessionTicket) return;
    if (status !== "unauthenticated" && status !== "loading") return;
    if (ticketRedeemState !== "idle") return;
    if (!domainCfg.isAppHostname) return;

    let cancelled = false;
    setTicketRedeemState("redeeming");
    setTicketRedeemError(undefined);

    (async () => {
      try {
        await redeemSessionTicket(sessionTicket);
        if (cancelled) return;
        setTicketRedeemState("success");
        removeQueryParams(["session_ticket", "redirect", "redirect_to", "welcome"]);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "No fue posible validar el acceso.";
        setTicketRedeemError(message);
        setTicketRedeemState("error");
        removeQueryParams(["session_ticket", "redirect", "redirect_to", "welcome"]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    sessionTicket,
    status,
    ticketRedeemState,
    domainCfg.isAppHostname,
    redeemSessionTicket,
  ]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (!justLoggedIn) return;
    if (status !== "authenticated" || !user) return;
    if (showPostConfirmation) return;

    const adminPath = "/admin";
    if (window.location.pathname !== adminPath) {
      window.history.replaceState(window.history.state, "", adminPath);
    }

    consumeJustLoggedIn();
  }, [justLoggedIn, status, user, showPostConfirmation, consumeJustLoggedIn]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (typeof window === "undefined") return;

    const rawPath = window.location.pathname.replace(/\/+$/, "") || "/";
    const isHomeAlias = PUBLIC_HOME_ALIAS_PATHS.some(
      (alias) => (alias.replace(/\/+$/, "") || "/") === rawPath
    );
    if (!isHomeAlias) return;
    if (window.location.pathname === "/" || window.location.pathname === "") {
      const hash = window.location.hash;
      const search = window.location.search;
      window.history.replaceState(
        window.history.state,
        "",
        `/${PUBLIC_SCREEN_PATHS.Home}${search}${hash}`
      );
    }
  }, []);

  const showSplash =
    status === "loading" ||
    (domainCfg.isAppHostname && !!sessionTicket && ticketRedeemState === "redeeming");

  const showTicketError =
    domainCfg.isAppHostname && ticketRedeemState === "error" && !!ticketRedeemError;

  if (publicAttendanceRoute) {
    return (
      <NavigationContainer linking={linking} theme={navigationTheme}>
        <PublicAttendanceScreen routeParams={publicAttendanceRoute} />
      </NavigationContainer>
    );
  }

  if (Platform.OS === "web") {
    if (domainCfg.isAppHostname) {
      if (showSplash) {
        return (
          <NavigationContainer linking={linking} theme={navigationTheme}>
            <StatusView
              title={ticketRedeemState === "redeeming" ? "Iniciando sesión" : "Cargando sesión"}
              description={
                ticketRedeemState === "redeeming"
                  ? "Validando tu acceso y preparando el panel administrativo."
                  : "Validando tu acceso y restaurando la información local."
              }
              loading
            />
          </NavigationContainer>
        );
      }

      if (status === "unauthenticated" || !user) {
        if (showTicketError) {
          if (typeof window !== "undefined") {
            setTimeout(() => {
              redirectToPublicLogin(redirectTo);
            }, 1400);
          }
          return (
            <NavigationContainer linking={linking} theme={navigationTheme}>
              <StatusView
                title="No fue posible iniciar sesión"
                description={`${ticketRedeemError} Redirigiendo a inicio de sesión en unos segundos...`}
              />
            </NavigationContainer>
          );
        }

        const currentPath = window.location.pathname.replace(/\/+$/, "") || "/";
        const alreadyOnPublicAuthPage =
          currentPath === `/${PUBLIC_SCREEN_PATHS.SignIn}` ||
          currentPath === `/${PUBLIC_SCREEN_PATHS.Home}` ||
          currentPath === `/${PUBLIC_SCREEN_PATHS.CreateAccount}` ||
          currentPath === `/${PUBLIC_SCREEN_PATHS.ConfirmAccount}` ||
          currentPath === `/${PUBLIC_SCREEN_PATHS.About}` ||
          currentPath === `/${PUBLIC_SCREEN_PATHS.Events}` ||
          currentPath === `/${PUBLIC_SCREEN_PATHS.Stores}` ||
          currentPath === "/";

        if (alreadyOnPublicAuthPage) {
          return (
            <NavigationContainer linking={linking} theme={navigationTheme}>
              <AuthFlow />
            </NavigationContainer>
          );
        }

        redirectToPublicLogin(
          redirectTo || `${window.location.pathname}${window.location.search}`
        );
        return (
          <NavigationContainer linking={linking} theme={navigationTheme}>
            <StatusView
              title="Redirigiendo a inicio de sesión"
              description="Para entrar al panel administrativo primero debes validar tu cuenta."
              loading
            />
          </NavigationContainer>
        );
      }

      if (!isGymAdminUser(user)) {
        void signOut(true);
        return (
          <NavigationContainer linking={linking} theme={navigationTheme}>
            <StatusView
              title="Cuenta sin permisos"
              description="Tu cuenta no puede usar el panel administrativo. Redirigiendo al sitio público."
              loading
            />
          </NavigationContainer>
        );
      }

      return (
        <NavigationContainer linking={linking} theme={navigationTheme}>
          {showPostConfirmation ? <AccountConfirmedScreen /> : <AdminFlow />}
        </NavigationContainer>
      );
    }

    if (domainCfg.isPublicHostname) {
      if (status === "authenticated" && user && isGymAdminUser(user)) {
        const path = window.location.pathname;
        if (
          path === "/admin" ||
          path.startsWith("/admin/") ||
          path === "/dashboard" ||
          path.startsWith("/dashboard/")
        ) {
          const destination = buildAppUrl(
            path.startsWith("/") ? path.substring(1) : path
          );
          window.location.assign(destination);
          return (
            <NavigationContainer linking={linking} theme={navigationTheme}>
              <StatusView
                title="Redirigiendo al panel"
                description="Estás autenticado, te llevamos al panel administrativo."
                loading
              />
            </NavigationContainer>
          );
        }
      }

      if (
        window.location.pathname.startsWith("/admin") ||
        window.location.pathname.startsWith("/dashboard")
      ) {
        const destination = buildAppUrl(
          window.location.pathname.startsWith("/")
            ? window.location.pathname.substring(1)
            : window.location.pathname
        );
        window.location.assign(destination);
        return (
          <NavigationContainer linking={linking} theme={navigationTheme}>
            <StatusView
              title="Redirigiendo al panel"
              description="El panel administrativo se encuentra en su propio espacio."
              loading
            />
          </NavigationContainer>
        );
      }

      return (
        <NavigationContainer linking={linking} theme={navigationTheme}>
          {showPostConfirmation ? <AccountConfirmedScreen /> : <AuthFlow />}
        </NavigationContainer>
      );
    }
  }

  if (status === "loading") {
    return (
      <NavigationContainer linking={linking} theme={navigationTheme}>
        <StatusView
          title="Cargando sesión"
          description="Validando tu acceso y restaurando la información local."
          loading
        />
      </NavigationContainer>
    );
  }

  if (status === "unauthenticated" || !user || !isGymAdminUser(user)) {
    return (
      <NavigationContainer linking={linking} theme={navigationTheme}>
        <AuthFlow />
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer linking={linking} theme={navigationTheme}>
      {showPostConfirmation ? <AccountConfirmedScreen /> : <AdminFlow />}
    </NavigationContainer>
  );
}
