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
  first_time: boolean;
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

export interface AcademyRegisterResponse {
  status: "pending_confirmation";
  email: string;
  email_sent: boolean;
  message: string;
  verification_expires_in_hours: number;
  pending_session_ticket: string;
  pending_session_expires_in_hours: number;
  polling_interval_seconds: number;
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

export interface AcademyConfirmPayload {
  token: string;
}

export interface AcademyResendConfirmationPayload {
  email: string;
}

export interface AcademyPendingSessionPayload {
  ticket: string;
}

export interface AcademyPendingSessionStatusResponse {
  status: "pending_confirmation" | "ready" | "expired" | "used";
  message: string;
}

export interface PendingAcademyRegistration {
  academyName: string;
  adminFirstName: string;
  adminLastName: string;
  email: string;
  pendingSessionTicket: string;
  pendingSessionExpiresInHours: number;
  pollingIntervalSeconds: number;
  verificationExpiresInHours: number;
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

export interface BeltLevel {
  id: number;
  organization_id: number;
  name: string;
  display_name: string;
  color_hex: string;
  text_color_hex: string;
  order_index: number;
  is_active: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  stripes: BeltStripe[];
}

export interface BeltLevelSummary {
  id: number;
  name: string;
  display_name: string;
  color_hex: string;
  text_color_hex: string;
  order_index: number;
  is_active: boolean;
}

export interface BeltStripe {
  id: number;
  belt_level_id: number;
  name: string;
  display_name: string;
  color_hex: string;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BeltStripeSummary {
  id: number;
  belt_level_id: number;
  name: string;
  display_name: string;
  color_hex: string;
  order_index: number;
  is_active: boolean;
}

export interface StudentBeltHistory {
  id: number;
  student_id: number;
  belt_level_id: number;
  stripe_id: number | null;
  awarded_at: string;
  awarded_by_user_id: number | null;
  notes: string | null;
  created_at: string;
  belt_level: BeltLevelSummary | null;
  stripe: BeltStripeSummary | null;
}

export type FightRecordType = "victoria" | "empate" | "derrota";

export interface StudentFightRecord {
  id: number;
  student_id: number;
  record_type: FightRecordType;
  opponent_name: string;
  fight_date: string;
  created_at: string;
  updated_at: string;
}

export interface StudentFightRecordCreatePayload {
  student_id: number;
  record_type: FightRecordType;
  opponent_name: string;
  fight_date: string;
}

export interface StudentFightRecordUpdatePayload {
  record_type?: FightRecordType;
  opponent_name?: string;
  fight_date?: string;
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
  current_belt_level_id: number | null;
  current_stripe_id: number | null;
  monthly_fee: string | null;
  currency: string;
  next_payment_date: string | null;
  payment_status: PaymentStatus;
  status: StudentStatus;
  guardian_name: string | null;
  guardian_phone: string | null;
  notes: string | null;
  rd_victorias: number;
  rd_empates: number;
  rd_derrotas: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  current_belt_level: BeltLevelSummary | null;
  current_stripe: BeltStripeSummary | null;
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
  current_belt_level_id?: number | null;
  current_stripe_id?: number | null;
  monthly_fee?: string | null;
  currency: string;
  next_payment_date?: string | null;
  payment_status: PaymentStatus;
  status: StudentStatus;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  notes?: string | null;
  rd_victorias?: number;
  rd_empates?: number;
  rd_derrotas?: number;
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
  current_belt_level_id?: number | null;
  current_stripe_id?: number | null;
  monthly_fee?: string | null;
  currency?: string | null;
  next_payment_date?: string | null;
  payment_status?: PaymentStatus;
  status?: StudentStatus;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  notes?: string | null;
  rd_victorias?: number;
  rd_empates?: number;
  rd_derrotas?: number;
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

export interface TrajectoryEvent {
  id: number;
  student_id: number;
  organization_id: number;
  event_date: string;
  content: string;
  created_by_user_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface TrajectoryEventCreatePayload {
  student_id: number;
  event_date: string;
  content: string;
}

export interface TrajectoryEventUpdatePayload {
  event_date?: string;
  content?: string;
}

export interface StudentTrajectorySummary {
  student_id: number;
  total_events: number;
  first_event_date: string | null;
  last_event_date: string | null;
}
