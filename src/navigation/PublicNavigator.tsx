import { NavigationContainer, DefaultTheme, LinkingOptions } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Platform } from "react-native";

import { AccountConfirmedScreen } from "@/screens/auth/AccountConfirmedScreen";
import { ActivateAccountScreen } from "@/screens/auth/ActivateAccountScreen";
import { ConfirmAccountScreen } from "@/screens/auth/ConfirmAccountScreen";
import { StudentActivateScreen } from "@/screens/auth/StudentActivateScreen";
import { StudentPasswordResetScreen } from "@/screens/auth/StudentPasswordResetScreen";
import {
  AboutScreen,
  CreateAccountScreen,
  EventsScreen,
  HomeScreen,
  SignInScreen,
  StoresScreen,
} from "@/screens/auth/PublicSiteScreen";
import { PUBLIC_SCREEN_PATHS } from "@/navigation/publicRoutes";
import { getDomainConfig } from "@/utils/domains";

import type { AuthStackParamList } from "./types";

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const PUBLIC_NAVIGATOR_LINKING_SCREENS = {
  About: PUBLIC_SCREEN_PATHS.About,
  ConfirmAccount: PUBLIC_SCREEN_PATHS.ConfirmAccount,
  ActivateAccount: PUBLIC_SCREEN_PATHS.ActivateStudent,
  ResetStudentPassword: PUBLIC_SCREEN_PATHS.ResetStudentPassword,
  CreateAccount: PUBLIC_SCREEN_PATHS.CreateAccount,
  Events: PUBLIC_SCREEN_PATHS.Events,
  Home: PUBLIC_SCREEN_PATHS.Home,
  SignIn: PUBLIC_SCREEN_PATHS.SignIn,
  Stores: PUBLIC_SCREEN_PATHS.Stores,
} as const;

function buildPublicLinkingPrefixes(): string[] {
  const prefixes: string[] = [];
  try {
    const cfg = getDomainConfig();
    if (cfg.publicWebOrigin) prefixes.push(cfg.publicWebOrigin);
  } catch {
    /* noop */
  }
  if (Platform.OS === "web") {
    prefixes.push("/");
  }
  return prefixes;
}

const publicLinkingTheme = {
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

interface PublicNavigatorProps {
  showPostConfirmation?: boolean;
}

export function PublicNavigator({ showPostConfirmation = false }: PublicNavigatorProps) {
  const linking: LinkingOptions<AuthStackParamList> = {
    prefixes: buildPublicLinkingPrefixes(),
    config: {
      screens: PUBLIC_NAVIGATOR_LINKING_SCREENS,
    },
  };

  if (showPostConfirmation) {
    return (
      <NavigationContainer linking={linking} theme={publicLinkingTheme}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Home" component={AccountConfirmedScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer linking={linking} theme={publicLinkingTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="About" component={AboutScreen} />
        <Stack.Screen name="Events" component={EventsScreen} />
        <Stack.Screen name="Stores" component={StoresScreen} />
        <Stack.Screen name="CreateAccount" component={CreateAccountScreen} />
        <Stack.Screen name="SignIn" component={SignInScreen} />
        <Stack.Screen name="ConfirmAccount" component={ConfirmAccountScreen} />
        <Stack.Screen name="ActivateStudent" component={StudentActivateScreen} />
        <Stack.Screen name="ActivateAccount" component={ActivateAccountScreen} />
        <Stack.Screen name="ResetStudentPassword" component={StudentPasswordResetScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
