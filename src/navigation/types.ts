export type AdminDashboardSection = "overview" | "branches" | "operations" | "dojo";

export type AuthStackParamList = {
  Home: undefined;
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
};
