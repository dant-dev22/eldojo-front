import { http } from "@/api/http";
import type { Attendance, MessageResponse } from "@/types/api";

export interface StudentSelfRegisterAttendancePayload {
  class_id: number;
  branch_id?: number;
  source?: "qr" | "manual";
}

export const studentAttendanceApi = {
  async selfRegister(
    payload: StudentSelfRegisterAttendancePayload,
  ): Promise<Attendance> {
    const headers: Record<string, string> = {
      "X-Attendance-Source": payload.source ?? "qr",
    };

    const { data } = await http.post<Attendance>(
      "/students/me/attendance/register",
      {
        class_id: payload.class_id,
        branch_id: payload.branch_id,
      },
      { headers },
    );

    return data;
  },
};
