import { http } from "@/api/http";
import type {
  Attendance,
  AttendanceCreatePayload,
  AttendanceMethod,
  AttendanceUpdatePayload,
  MessageResponse,
} from "@/types/api";

export const attendanceApi = {
  async list(params?: {
    studentId?: number;
    branchId?: number;
    classId?: number;
    method?: AttendanceMethod;
  }): Promise<Attendance[]> {
    const queryParams: Record<string, string> = {};

    if (params?.studentId) {
      queryParams.student_id = String(params.studentId);
    }
    if (params?.branchId) {
      queryParams.branch_id = String(params.branchId);
    }
    if (params?.classId) {
      queryParams.class_id = String(params.classId);
    }
    if (params?.method) {
      queryParams.method = params.method;
    }

    const { data } = await http.get<Attendance[]>("/attendance", {
      params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
    });

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
