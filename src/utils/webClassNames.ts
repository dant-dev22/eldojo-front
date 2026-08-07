import { Platform } from "react-native";

export function getWebClassNameProps(className?: string) {
  return Platform.OS === "web" && className ? ({ className } as { className: string }) : {};
}

export function joinWebClassNames(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(" ");
}
