export interface PublicAttendanceClassOption {
  id: number;
  name: string;
  description: string | null;
  instructor_name: string | null;
}

export interface PublicAttendanceContext {
  organization_name: string;
  organization_slug: string;
  branch_name: string;
  branch_slug: string;
  branch_id: number;
  image_url: string | null;
  classes: PublicAttendanceClassOption[];
}

export interface PublicAttendanceCreatePayload {
  student_code: string;
  class_id?: number | null;
  qr_token: string;
}

export interface PublicAttendanceResult {
  message: string;
  attendance_id: number;
  student_id: number;
  student_name: string;
  class_id: number | null;
  class_name: string | null;
  check_in_at: string;
}

export interface PublicAttendanceRouteParams {
  organizationSlug: string;
  branchSlug: string;
}
