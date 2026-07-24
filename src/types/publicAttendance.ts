export interface PublicAttendanceClassSchedule {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface PublicAttendanceClassOption {
  id: number;
  name: string;
  description: string | null;
  instructor_name: string | null;
  schedules: PublicAttendanceClassSchedule[];
}

export interface PublicAttendanceStudentPreview {
  id: number;
  unique_code: string;
  first_name: string;
  last_name: string;
  student_name: string;
}

export interface PublicAttendanceContext {
  organization_name: string;
  organization_slug: string;
  branch_name: string;
  branch_slug: string;
  branch_id: number;
  branch_timezone: string;
  image_url: string | null;
  classes: PublicAttendanceClassOption[];
}

export interface PublicAttendanceCreatePayload {
  student_id: number;
  class_id?: number | null;
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
