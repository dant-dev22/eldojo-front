import { Platform } from "react-native";

export function slugifyRouteSegment(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const PUBLIC_ROUTE_SEGMENTS = {
  home: slugifyRouteSegment("home"),
  about: slugifyRouteSegment("acerca de eldojo"),
  events: slugifyRouteSegment("eventos para academias"),
  stores: slugifyRouteSegment("tiendas de equipo de combate"),
  createAccount: slugifyRouteSegment("crear cuenta"),
  signIn: slugifyRouteSegment("iniciar sesion"),
  confirmAccount: slugifyRouteSegment("confirmar cuenta"),
} as const;

export const PUBLIC_SCREEN_PATHS = {
  Home: PUBLIC_ROUTE_SEGMENTS.home,
  About: PUBLIC_ROUTE_SEGMENTS.about,
  Events: PUBLIC_ROUTE_SEGMENTS.events,
  Stores: PUBLIC_ROUTE_SEGMENTS.stores,
  CreateAccount: PUBLIC_ROUTE_SEGMENTS.createAccount,
  SignIn: PUBLIC_ROUTE_SEGMENTS.signIn,
  ConfirmAccount: PUBLIC_ROUTE_SEGMENTS.confirmAccount,
} as const;

export type PublicScreenName = keyof typeof PUBLIC_SCREEN_PATHS;
export type PublicPageKey = "home" | "about" | "events" | "stores" | "createAccount" | "signIn";

export const PUBLIC_PAGE_TO_SCREEN: Record<PublicPageKey, PublicScreenName> = {
  about: "About",
  createAccount: "CreateAccount",
  events: "Events",
  home: "Home",
  signIn: "SignIn",
  stores: "Stores",
};

export const PUBLIC_PAGE_META: Record<
  PublicPageKey,
  {
    description: string;
    path: string;
    title: string;
  }
> = {
  home: {
    description: "Software para academias de artes marciales con control de alumnos, pagos, clases, sucursales y asistencia desde una sola plataforma.",
    path: `/${PUBLIC_SCREEN_PATHS.Home}`,
    title: "ElDojo | Software para academias de artes marciales",
  },
  about: {
    description: "Conoce como ElDojo ayuda a academias de MMA, BJJ y judo a ordenar su operacion diaria con una interfaz clara y profesional.",
    path: `/${PUBLIC_SCREEN_PATHS.About}`,
    title: "Acerca de ElDojo | Gestion para academias",
  },
  events: {
    description: "Explora la seccion de eventos de ElDojo para opens, seminarios y funciones destacadas de academias de artes marciales.",
    path: `/${PUBLIC_SCREEN_PATHS.Events}`,
    title: "Eventos para academias | ElDojo",
  },
  stores: {
    description: "Descubre la vitrina de tiendas, aliados y equipo de combate para academias dentro de la experiencia publica de ElDojo.",
    path: `/${PUBLIC_SCREEN_PATHS.Stores}`,
    title: "Tiendas y aliados | ElDojo",
  },
  createAccount: {
    description: "Crea tu cuenta en ElDojo y registra tu academia para empezar a operar alumnos, pagos, clases y asistencia en minutos.",
    path: `/${PUBLIC_SCREEN_PATHS.CreateAccount}`,
    title: "Crear cuenta | ElDojo",
  },
  signIn: {
    description: "Inicia sesion en ElDojo para entrar al panel operativo de tu academia y gestionar alumnos, pagos y asistencia.",
    path: `/${PUBLIC_SCREEN_PATHS.SignIn}`,
    title: "Iniciar sesion | ElDojo",
  },
};

export function navigateToPublicPageKey(page: PublicPageKey): void {
  const meta = PUBLIC_PAGE_META[page];
  if (!meta) {
    return;
  }

  if (Platform.OS === "web" && typeof window !== "undefined") {
    const currentPath = window.location.pathname;
    const targetPath = meta.path;

    if (currentPath !== targetPath) {
      window.location.assign(targetPath);
      return;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
}
