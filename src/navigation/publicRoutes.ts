import { Platform } from "react-native";

export const PUBLIC_SCROLL_TARGET_KEY = "eldojo-public-scroll-target";

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

export const ADMIN_ROUTE_SEGMENTS = {
  root: slugifyRouteSegment("admin"),
  branches: slugifyRouteSegment("sucursales"),
  operations: slugifyRouteSegment("operaciones"),
  payments: slugifyRouteSegment("pagos"),
  dojo: slugifyRouteSegment("mi dojo"),
} as const;

export const ADMIN_DASHBOARD_SECTION_TO_PATH_SEGMENT: Record<
  Exclude<import("./types").AdminDashboardSection, "overview">,
  string
> = {
  branches: ADMIN_ROUTE_SEGMENTS.branches,
  operations: ADMIN_ROUTE_SEGMENTS.operations,
  payments: ADMIN_ROUTE_SEGMENTS.payments,
  dojo: ADMIN_ROUTE_SEGMENTS.dojo,
} as const;

export const ADMIN_PATH_SEGMENT_TO_DASHBOARD_SECTION: Record<
  string,
  import("./types").AdminDashboardSection
> = Object.fromEntries(
  Object.entries(ADMIN_DASHBOARD_SECTION_TO_PATH_SEGMENT).map(([section, segment]) => [
    segment,
    section as import("./types").AdminDashboardSection,
  ])
) as Record<string, import("./types").AdminDashboardSection>;

export const PUBLIC_SCREEN_PATHS = {
  Home: PUBLIC_ROUTE_SEGMENTS.home,
  About: PUBLIC_ROUTE_SEGMENTS.about,
  Events: PUBLIC_ROUTE_SEGMENTS.events,
  Stores: PUBLIC_ROUTE_SEGMENTS.stores,
  CreateAccount: PUBLIC_ROUTE_SEGMENTS.createAccount,
  SignIn: PUBLIC_ROUTE_SEGMENTS.signIn,
  ConfirmAccount: PUBLIC_ROUTE_SEGMENTS.confirmAccount,
} as const;

export const PUBLIC_HOME_ALIAS_PATHS: readonly string[] = [
  "",
  "/",
  `/${PUBLIC_ROUTE_SEGMENTS.home}`,
  `/${PUBLIC_ROUTE_SEGMENTS.home}/`,
] as const;

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
    path: "/",
    title: "ElDojo | Software para academias de artes marciales",
  },
  about: {
    description: "Conoce como ElDojo ayuda a academias de MMA, BJJ y judo a ordenar su operacion diaria con una interfaz clara y profesional.",
    path: `/${PUBLIC_ROUTE_SEGMENTS.about}`,
    title: "Acerca de ElDojo | Gestion para academias",
  },
  events: {
    description: "Explora la seccion de eventos de ElDojo para opens, seminarios y funciones destacadas de academias de artes marciales.",
    path: `/${PUBLIC_ROUTE_SEGMENTS.events}`,
    title: "Eventos para academias | ElDojo",
  },
  stores: {
    description: "Descubre la vitrina de tiendas, aliados y equipo de combate para academias dentro de la experiencia publica de ElDojo.",
    path: `/${PUBLIC_ROUTE_SEGMENTS.stores}`,
    title: "Tiendas y aliados | ElDojo",
  },
  createAccount: {
    description: "Crea tu cuenta en ElDojo y registra tu academia para empezar a operar alumnos, pagos, clases y asistencia en minutos.",
    path: `/${PUBLIC_ROUTE_SEGMENTS.createAccount}`,
    title: "Crear cuenta | ElDojo",
  },
  signIn: {
    description: "Inicia sesion en ElDojo para entrar al panel operativo de tu academia y gestionar alumnos, pagos y asistencia.",
    path: `/${PUBLIC_ROUTE_SEGMENTS.signIn}`,
    title: "Iniciar sesion | ElDojo",
  },
};

type SectionScrollFn = (target: "home" | "about" | "events" | "stores") => void;

let _registeredHomeScrollControls: SectionScrollFn | null = null;

export function registerHomeScrollControls(fn: SectionScrollFn | null): void {
  _registeredHomeScrollControls = fn ?? null;
}

export function navigateToPublicPageKey(page: PublicPageKey): void {
  const meta = PUBLIC_PAGE_META[page];
  if (!meta) {
    return;
  }

  if (Platform.OS === "web" && typeof window !== "undefined") {
    const isSectionPage = page === "about" || page === "events" || page === "stores";
    const currentPath = window.location.pathname.replace(/\/+$/, "") || "/";
    const homePath = PUBLIC_PAGE_META.home.path;
    const onHomeLikePath =
      PUBLIC_HOME_ALIAS_PATHS.some(
        (alias) => (alias.replace(/\/+$/, "") || "/") === currentPath
      );

    if (page === "home") {
      window.sessionStorage.removeItem(PUBLIC_SCROLL_TARGET_KEY);
      if (!onHomeLikePath) {
        window.location.assign(homePath);
        return;
      }
      if (_registeredHomeScrollControls) {
        _registeredHomeScrollControls("home");
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      window.history.replaceState(window.history.state, "", homePath);
      return;
    }

    if (isSectionPage) {
      window.sessionStorage.removeItem(PUBLIC_SCROLL_TARGET_KEY);
      window.location.assign(meta.path);
      return;
    }

    window.sessionStorage.removeItem(PUBLIC_SCROLL_TARGET_KEY);
    window.location.assign(meta.path);
    return;
  }
}
