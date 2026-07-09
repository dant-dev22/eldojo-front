import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { StatusView } from "@/components/StatusView";
import { colors } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { AdminDashboardScreen } from "@/screens/admin/AdminDashboardScreen";
import { StudentDetailScreen } from "@/screens/admin/StudentDetailScreen";
import { LoginScreen } from "@/screens/auth/LoginScreen";
import { PublicAttendanceScreen } from "@/screens/public/PublicAttendanceScreen";
import { StudentsListScreen } from "@/screens/admin/StudentsListScreen";
import { getPublicAttendanceRoute } from "@/utils/publicAttendanceRoute";
import { isGymAdminUser } from "@/utils/roles";

import type { AdminStackParamList, AuthStackParamList } from "./types";

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AdminStack = createNativeStackNavigator<AdminStackParamList>();

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

function AuthFlow() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen
        component={LoginScreen}
        name="Login"
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
    <NavigationContainer theme={navigationTheme}>
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
