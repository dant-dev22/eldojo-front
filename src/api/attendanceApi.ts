import { http } from "@/api/http";
import type {
  Attendance,
  AttendanceCreatePayload,
  AttendanceMethod,
  AttendanceUpdatePayload,
  MessageResponse,
  StudentAttendanceSummary,
} from "@/types/api";

export const ATTENDANCE_HISTORY_PAGE_SIZE = 10;

export interface AttendanceListParams {
  studentId?: number;
  branchId?: number;
  classId?: number;
  method?: AttendanceMethod;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export const attendanceApi = {
  async list(params?: AttendanceListParams): Promise<Attendance[]> {
    const queryParams: Record<string, string | number> = {};

    if (params?.studentId) {
      queryParams.student_id = params.studentId;
    }
    if (params?.branchId) {
      queryParams.branch_id = params.branchId;
    }
    if (params?.classId) {
      queryParams.class_id = params.classId;
    }
    if (params?.method) {
      queryParams.method = params.method;
    }
    if (params?.dateFrom) {
      queryParams.date_from = params.dateFrom;
    }
    if (params?.dateTo) {
      queryParams.date_to = params.dateTo;
    }
    if (typeof params?.limit === "number") {
      queryParams.limit = params.limit;
    }
    if (typeof params?.offset === "number") {
      queryParams.offset = params.offset;
    }

    const { data } = await http.get<Attendance[]>("/attendance", {
      params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
    });

    return data;
  },

  async getByStudent(params: {
    studentId: number;
    classId?: number;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<Attendance[]> {
    return attendanceApi.list(params);
  },

  async getSummary(
    studentId: number,
    filters?: {
      classId?: number;
      dateFrom?: string;
      dateTo?: string;
    },
  ): Promise<StudentAttendanceSummary> {
    const queryParams: Record<string, string | number> = {};
    if (filters?.classId) queryParams.class_id = filters.classId;
    if (filters?.dateFrom) queryParams.date_from = filters.dateFrom;
    if (filters?.dateTo) queryParams.date_to = filters.dateTo;
    const { data } = await http.get<StudentAttendanceSummary>(
      `/students/${studentId}/attendance/summary`,
      { params: Object.keys(queryParams).length > 0 ? queryParams : undefined },
    );
    return data;
  },

  async create(payload: AttendanceCreatePayload): Promise<Attendance> {
    const { data } = await http.post<Attendance>("/attendance", payload);
    return data;
  },
  async update(attendanceId: number, payload: AttendanceUpdatePayload): Promise<Attendance> {
    const { data } = await http.patch<Attendance>(`/attendance/${attendanceId}`, payload);
    return data;
  },
  async remove(attendanceId: number): Promise<MessageResponse> {
    const { data } = await http.delete<MessageResponse>(`/attendance/${attendanceId}`);
    return data;
  },
};
