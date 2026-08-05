import { NavigationContainer, DefaultTheme, LinkingOptions } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect } from "react";
import { Platform } from "react-native";

import { StatusView } from "@/components/StatusView";
import { colors } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { AdminDashboardScreen } from "@/screens/admin/AdminDashboardScreen";
import { StudentDetailScreen } from "@/screens/admin/StudentDetailScreen";
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
import { StudentsListScreen } from "@/screens/admin/StudentsListScreen";
import { PUBLIC_SCREEN_PATHS } from "@/navigation/publicRoutes";
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
      StudentDetail: "admin/alumnos/:studentId",
      StudentsList: "admin/alumnos",
    },
  },
};

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
        component={HomeScreen}
        name="Home"
      />
      <AdminStack.Screen
        component={AboutScreen}
        name="About"
      />
      <AdminStack.Screen
        component={EventsScreen}
        name="Events"
      />
      <AdminStack.Screen
        component={StoresScreen}
        name="Stores"
      />
    </AdminStack.Navigator>
  );
}

export function AppNavigator() {
  const { showPostConfirmation, status, user, justLoggedIn, consumeJustLoggedIn } = useAuth();
  const publicAttendanceRoute = getPublicAttendanceRoute();

  useEffect(() => {
    if (!justLoggedIn) {
      return;
    }
    if (status !== "authenticated" || !user) {
      return;
    }
    if (showPostConfirmation) {
      return;
    }

    if (Platform.OS === "web" && typeof window !== "undefined") {
      const adminPath = "/admin";
      if (window.location.pathname !== adminPath) {
        window.history.replaceState(window.history.state, "", adminPath);
      }
    }

    consumeJustLoggedIn();
  }, [justLoggedIn, status, user, showPostConfirmation, consumeJustLoggedIn]);

  return (
    <NavigationContainer linking={linking} theme={navigationTheme}>
      {publicAttendanceRoute ? (
        <PublicAttendanceScreen routeParams={publicAttendanceRoute} />
      ) : status === "loading" ? (
        <StatusView
          title="Cargando sesión"
          description="Validando tu acceso y restaurando la información local."
          loading
        />
      ) : status === "unauthenticated" || !user ? (
        <AuthFlow />
      ) : !isGymAdminUser(user) ? (
        <AuthFlow />
      ) : showPostConfirmation ? (
        <AccountConfirmedScreen />
      ) : (
        <AdminFlow />
      )}
    </NavigationContainer>
  );
}
