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
  AdminHome: {
    section?: AdminDashboardSection;
    focusedStudentId?: number;
    openCreateAttendance?: boolean;
    openAttendanceManager?: boolean;
    openAttendanceManagerTab?: "by-class" | "by-student";
    attendanceManagerPrefillStudentId?: number;
  } | undefined;
  StudentsList: { openCreate?: boolean } | undefined;
  QrCodesList: undefined;
  TrajectoryList: undefined;
  TrajectoryDetail: { studentId: number };
  Home: { initialSection?: HomeInitialSection } | undefined;
  About: undefined;
  Events: undefined;
  Stores: undefined;
};
