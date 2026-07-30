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
  AdminHome: undefined;
  StudentsList: { openCreate?: boolean } | undefined;
  StudentDetail: { studentId: number };
};
