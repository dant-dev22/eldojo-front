export type AuthStackParamList = {
  Login: undefined;
};

export type AdminStackParamList = {
  AdminHome: undefined;
  StudentsList: { openCreate?: boolean } | undefined;
  StudentDetail: { studentId: number };
};
