export type UserRole = "super_admin" | "org_admin" | "branch_admin" | "student";

export type PaymentStatus =
  | "up_to_date"
  | "late"
  | "partial"
  | "waived"
  | "due_soon"
  | "overdue";
export type StudentStatus = "active" | "frozen" | "inactive";
export type AttendanceMethod = "qr" | "manual";
export type PaymentMethod = "cash" | "transfer" | "card" | "other";
export type PaymentRecordStatus = "paid" | "pending" | "void";

export interface AdminAssignment {
  id: number;
  organization_id: number;
  branch_id: number | null;
  created_at: string;
}

export interface User {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string;
  role: UserRole;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  admin_assignments: AdminAssignment[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  expires_in: number;
  refresh_expires_in: number;
  user: User;
}

export interface StudentRegisterPayload {
  unique_code: string;
  email: string;
  password: string;
}

export interface AcademyRegisterPayload {
  academy_name: string;
  admin_first_name: string;
  admin_last_name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AvailableClass {
  id: number;
  name: string;
  description: string | null;
  instructor_name: string | null;
  is_active: boolean;
}

export interface MyProfile {
  user_id: number;
  student_id: number;
  email: string;
  role: UserRole;
  unique_code: string;
  first_name: string;
  last_name: string;
  full_name: string;
  birth_date: string;
  photo_url: string | null;
  current_class_id: number | null;
  payment_status: PaymentStatus;
  next_payment_date: string | null;
  status: StudentStatus;
  available_classes: AvailableClass[];
}

export interface Student {
  id: number;
  organization_id: number;
  branch_id: number;
  unique_code: string;
  user_id: number | null;
  first_name: string;
  last_name: string;
  birth_date: string;
  birth_place: string;
  height_cm: number | null;
  photo_url: string | null;
  enrollment_date: string;
  primary_class_id: number | null;
  monthly_fee: string | null;
  currency: string;
  next_payment_date: string | null;
  payment_status: PaymentStatus;
  status: StudentStatus;
  guardian_name: string | null;
  guardian_phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface StudentCreatePayload {
  organization_id: number;
  branch_id: number;
  user_id?: number | null;
  first_name: string;
  last_name: string;
  birth_date: string;
  birth_place: string;
  height_cm?: number | null;
  photo_url?: string | null;
  enrollment_date: string;
  primary_class_id?: number | null;
  monthly_fee?: string | null;
  currency: string;
  next_payment_date?: string | null;
  payment_status: PaymentStatus;
  status: StudentStatus;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  notes?: string | null;
}

export interface StudentUpdatePayload {
  organization_id?: number;
  branch_id?: number;
  user_id?: number | null;
  first_name?: string;
  last_name?: string;
  birth_date?: string;
  birth_place?: string;
  height_cm?: number | null;
  photo_url?: string | null;
  enrollment_date?: string;
  primary_class_id?: number | null;
  monthly_fee?: string | null;
  currency?: string | null;
  next_payment_date?: string | null;
  payment_status?: PaymentStatus;
  status?: StudentStatus;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  notes?: string | null;
}

export interface Organization {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrganizationUpdatePayload {
  name?: string;
  slug?: string;
  is_active?: boolean;
}

export interface Branch {
  id: number;
  organization_id: number;
  name: string;
  country: string;
  state: string;
  city: string;
  address: string;
  timezone: string;
  qr_secret: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BranchCreatePayload {
  organization_id: number;
  name: string;
  country: string;
  state: string;
  city: string;
  address: string;
  timezone: string;
  qr_secret: string;
  is_active?: boolean;
}

export interface BranchUpdatePayload {
  name?: string;
  country?: string;
  state?: string;
  city?: string;
  address?: string;
  timezone?: string;
  qr_secret?: string;
  is_active?: boolean;
}

export interface Discipline {
  id: number;
  organization_id: number;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface MartialClass {
  id: number;
  organization_id: number;
  branch_id: number;
  discipline_id: number;
  discipline_name: string | null;
  name: string;
  description: string | null;
  instructor_name: string | null;
  capacity: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MartialClassCreatePayload {
  organization_id: number;
  branch_id: number;
  discipline_id: number;
  name: string;
  description?: string | null;
  instructor_name?: string | null;
  capacity?: number | null;
  is_active?: boolean;
}

export interface MartialClassUpdatePayload {
  organization_id?: number;
  branch_id?: number;
  discipline_id?: number;
  name?: string;
  description?: string | null;
  instructor_name?: string | null;
  capacity?: number | null;
  is_active?: boolean;
}

export interface Payment {
  id: number;
  student_id: number;
  organization_id: number;
  branch_id: number;
  amount: string;
  currency: string;
  period_start: string;
  period_end: string;
  paid_at: string;
  method: PaymentMethod;
  status: PaymentRecordStatus;
  recorded_by: number;
  notes: string | null;
  created_at: string;
}

export interface PaymentCreatePayload {
  student_id: number;
  organization_id: number;
  branch_id: number;
  amount: string;
  currency: string;
  period_start: string;
  period_end: string;
  paid_at: string;
  method: PaymentMethod;
  status: PaymentRecordStatus;
  recorded_by: number;
  notes?: string | null;
}

export interface PaymentUpdatePayload {
  student_id?: number;
  organization_id?: number;
  branch_id?: number;
  amount?: string;
  currency?: string;
  period_start?: string;
  period_end?: string;
  paid_at?: string;
  method?: PaymentMethod;
  status?: PaymentRecordStatus;
  recorded_by?: number;
  notes?: string | null;
}

export interface Attendance {
  id: number;
  student_id: number;
  class_id: number | null;
  branch_id: number;
  check_in_at: string;
  method: AttendanceMethod;
  registered_by: number | null;
  created_at: string;
}

export interface AttendanceCreatePayload {
  student_id: number;
  class_id?: number | null;
  branch_id: number;
  check_in_at: string;
  method: AttendanceMethod;
  registered_by?: number | null;
}

export interface AttendanceUpdatePayload {
  student_id?: number;
  class_id?: number | null;
  branch_id?: number;
  check_in_at?: string;
  method?: AttendanceMethod;
  registered_by?: number | null;
}

export interface ApiErrorResponse {
  detail?: string;
}

export interface MessageResponse {
  message: string;
}
