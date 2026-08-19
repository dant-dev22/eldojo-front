export type AdminDashboardSection = "overview" | "branches" | "operations" | "payments" | "dojo";

export type HomeInitialSection = "home" | "about" | "events" | "stores";

export type AuthStackParamList = {
  Home: { initialSection?: HomeInitialSection } | undefined;
  About: undefined;
  Events: undefined;
  Stores: undefined;
  CreateAccount: undefined;
  SignIn: undefined;
  ConfirmAccount: undefined;
};

export type AdminStackParamList = {
  AdminHome: { section?: AdminDashboardSection } | undefined;
  StudentsList: { openCreate?: boolean } | undefined;
  StudentDetail: { studentId: number };
  QrCodesList: undefined;
  TrajectoryList: undefined;
  TrajectoryDetail: { studentId: number };
  Home: { initialSection?: HomeInitialSection } | undefined;
  About: undefined;
  Events: undefined;
  Stores: undefined;
};
