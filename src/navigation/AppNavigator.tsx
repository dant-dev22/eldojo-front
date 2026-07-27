import { NavigationContainer, DefaultTheme, LinkingOptions } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { StatusView } from "@/components/StatusView";
import { colors } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { AdminDashboardScreen } from "@/screens/admin/AdminDashboardScreen";
import { StudentDetailScreen } from "@/screens/admin/StudentDetailScreen";
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
    </AdminStack.Navigator>
  );
}

export function AppNavigator() {
  const { status, user } = useAuth();
  const publicAttendanceRoute = getPublicAttendanceRoute();

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
      ) : (
        <AdminFlow />
      )}
    </NavigationContainer>
  );
}
