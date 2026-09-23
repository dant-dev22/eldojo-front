import { NavigationContainer, DefaultTheme, LinkingOptions } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Platform } from "react-native";

import { AttendanceHistoryScreen } from "@/screens/student/AttendanceHistoryScreen";
import { SecuritySettingsScreen } from "@/screens/student/SecuritySettingsScreen";
import { StudentHomeScreen } from "@/screens/student/StudentHomeScreen";
import { StudentProfileScreen } from "@/screens/student/StudentProfileScreen";
import { getDomainConfig } from "@/utils/domains";

import type { StudentStackParamList } from "./types";

const Stack = createNativeStackNavigator<StudentStackParamList>();

function buildStudentLinkingPrefixes(): string[] {
  const prefixes: string[] = [];
  try {
    const cfg = getDomainConfig();
    if (cfg.studentWebOrigin) prefixes.push(cfg.studentWebOrigin);
  } catch {
    /* noop */
  }
  if (Platform.OS === "web") {
    prefixes.push("/");
  }
  return prefixes;
}

const studentLinkingTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: "transparent",
    card: "transparent",
    border: "transparent",
    primary: "transparent",
    text: "transparent",
  },
};

export function StudentNavigator() {
  const linking: LinkingOptions<StudentStackParamList> = {
    prefixes: buildStudentLinkingPrefixes(),
    config: {
      screens: {
        StudentHome: "alumno",
        StudentProfile: "alumno/perfil",
        AttendanceHistory: "alumno/asistencia",
        SecuritySettings: "alumno/seguridad",
      },
    },
  };

  return (
    <NavigationContainer linking={linking} theme={studentLinkingTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="StudentHome" component={StudentHomeScreen} />
        <Stack.Screen name="StudentProfile" component={StudentProfileScreen} />
        <Stack.Screen name="SecuritySettings" component={SecuritySettingsScreen} />
        <Stack.Screen name="AttendanceHistory" component={AttendanceHistoryScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
