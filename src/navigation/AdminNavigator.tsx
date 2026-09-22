import { NavigationContainer, DefaultTheme, LinkingOptions } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Platform } from "react-native";

import { AdminDashboardScreen } from "@/screens/admin/AdminDashboardScreen";
import { QrCodesListScreen } from "@/screens/admin/QrCodesListScreen";
import { StudentsListScreen } from "@/screens/admin/StudentsListScreen";
import { TrajectoryDetailScreen } from "@/screens/admin/TrajectoryDetailScreen";
import { TrajectoryListScreen } from "@/screens/admin/TrajectoryListScreen";
import {
  ADMIN_DASHBOARD_SECTION_TO_PATH_SEGMENT,
  ADMIN_PATH_SEGMENT_TO_DASHBOARD_SECTION,
  ADMIN_ROUTE_SEGMENTS,
} from "@/navigation/publicRoutes";
import { getDomainConfig } from "@/utils/domains";

import type { AdminStackParamList } from "./types";

const Stack = createNativeStackNavigator<AdminStackParamList>();

function buildAdminLinkingPrefixes(): string[] {
  const prefixes: string[] = [];
  try {
    const cfg = getDomainConfig();
    if (cfg.appWebOrigin) prefixes.push(cfg.appWebOrigin);
  } catch {
    /* noop */
  }
  if (Platform.OS === "web") {
    prefixes.push("/");
  }
  return prefixes;
}

const adminLinkingTheme = {
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

export function AdminNavigator() {
  const linking: LinkingOptions<AdminStackParamList> = {
    prefixes: buildAdminLinkingPrefixes(),
    config: {
      screens: {
        AdminHome: {
          path: `${ADMIN_ROUTE_SEGMENTS.root}/:section?`,
          parse: {
            section: (raw: string | undefined): import("./types").AdminDashboardSection | undefined => {
              if (!raw) return undefined;
              const section = ADMIN_PATH_SEGMENT_TO_DASHBOARD_SECTION[raw];
              return section ?? undefined;
            },
          },
          stringify: {
            section: (
              value: import("./types").AdminDashboardSection | undefined
            ): string => {
              if (!value || value === "overview") return "";
              return ADMIN_DASHBOARD_SECTION_TO_PATH_SEGMENT[value] ?? "";
            },
          },
        },
        QrCodesList: `${ADMIN_ROUTE_SEGMENTS.root}/codigos-qr`,
        StudentsList: `${ADMIN_ROUTE_SEGMENTS.root}/alumnos`,
        TrajectoryList: `${ADMIN_ROUTE_SEGMENTS.root}/trayectoria`,
        TrajectoryDetail: `${ADMIN_ROUTE_SEGMENTS.root}/trayectoria/:studentId`,
      },
    },
  };

  return (
    <NavigationContainer linking={linking} theme={adminLinkingTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="AdminHome" component={AdminDashboardScreen} />
        <Stack.Screen name="StudentsList" component={StudentsListScreen} />
        <Stack.Screen name="QrCodesList" component={QrCodesListScreen} />
        <Stack.Screen name="TrajectoryList" component={TrajectoryListScreen} />
        <Stack.Screen name="TrajectoryDetail" component={TrajectoryDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
