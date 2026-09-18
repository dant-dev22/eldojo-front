import { useNavigation } from "@react-navigation/native";
import { useEffect } from "react";

import type { AuthStackParamList } from "@/navigation/types";

import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

export function StudentActivateScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  useEffect(() => {
    navigation.replace("ActivateAccount");
  }, [navigation]);
  return null;
}
