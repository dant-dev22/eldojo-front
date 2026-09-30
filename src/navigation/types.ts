export type AdminDashboardSection = "overview" | "attendance" | "attendanceKiosk" | "branches" | "operations" | "payments" | "dojo";

export type HomeInitialSection = "home" | "about" | "events" | "stores";

export type AuthStackParamList = {
  Home: { initialSection?: HomeInitialSection } | undefined;
  About: undefined;
  Events: undefined;
  Stores: undefined;
  CreateAccount: undefined;
  SignIn: undefined;
  ConfirmAccount: undefined;
  ActivateStudent: undefined;
  ActivateAccount: undefined;
  ResetStudentPassword: undefined;
};

export type AdminStackParamList = {
  AdminHome: {
    section?: AdminDashboardSection;
    focusedStudentId?: number;
    openCreateAttendance?: boolean;
    openAttendanceManager?: boolean;
    openAttendanceManagerTab?: "by-class" | "by-student";
    attendanceManagerPrefillStudentId?: number;
    attendanceKioskClassId?: number;
    attendanceKioskBranchId?: number;
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

export type StudentStackParamList = {
  StudentHome: undefined;
  StudentProfile: undefined;
  AttendanceHistory: undefined;
  SecuritySettings: undefined;
  SelfAttendance: {
    organizationSlug?: string;
    branchSlug?: string;
    classId?: number;
    source?: "qr" | "manual";
  } | undefined;
};
