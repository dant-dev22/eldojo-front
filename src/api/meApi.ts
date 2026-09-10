import { http } from "@/api/http";
import type {
  Attendance,
  MessageResponse,
  MyEmailChangePayload,
  MyPasswordChangePayload,
  MyProfile,
  StudentAttendanceSummary,
} from "@/types/api";

export interface MyAttendanceQuery {
  limit?: number;
  offset?: number;
  class_id?: number;
  date_from?: string;
  date_to?: string;
}

export interface MyAttendanceSummaryQuery {
  class_id?: number;
  date_from?: string;
  date_to?: string;
}

export const meApi = {
  async getProfile(): Promise<MyProfile> {
    const { data } = await http.get<MyProfile>("/me");
    return data;
  },

  async updateProfile(input: { primaryClassId?: number | null; photoUri?: string | null }): Promise<MyProfile> {
    const formData = new FormData();

    if (typeof input.primaryClassId === "number") {
      formData.append("primary_class_id", String(input.primaryClassId));
    }

    if (input.photoUri) {
      const extension = input.photoUri.split(".").pop() ?? "jpg";
      formData.append("photo", {
        uri: input.photoUri,
        name: `perfil.${extension}`,
        type: `image/${extension === "jpg" ? "jpeg" : extension}`,
      } as never);
    }

    const { data } = await http.patch<MyProfile>("/me", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return data;
  },

  async changeMyPassword(payload: MyPasswordChangePayload): Promise<MessageResponse> {
    const { data } = await http.patch<MessageResponse>("/me/password", payload);
    return data;
  },

  async changeMyEmail(payload: MyEmailChangePayload): Promise<MyProfile> {
    const { data } = await http.patch<MyProfile>("/me/email", payload);
    return data;
  },

  async getMyAttendance(query: MyAttendanceQuery = {}): Promise<Attendance[]> {
    const params: Record<string, unknown> = {};
    if (typeof query.limit === "number") params.limit = query.limit;
    if (typeof query.offset === "number") params.offset = query.offset;
    if (typeof query.class_id === "number") params.class_id = query.class_id;
    if (query.date_from) params.date_from = query.date_from;
    if (query.date_to) params.date_to = query.date_to;

    const { data } = await http.get<Attendance[]>("/me/attendance", { params });
    return data;
  },

  async getMyAttendanceSummary(query: MyAttendanceSummaryQuery = {}): Promise<StudentAttendanceSummary> {
    const params: Record<string, unknown> = {};
    if (typeof query.class_id === "number") params.class_id = query.class_id;
    if (query.date_from) params.date_from = query.date_from;
    if (query.date_to) params.date_to = query.date_to;

    const { data } = await http.get<StudentAttendanceSummary>("/me/attendance/summary", { params });
    return data;
  },
};
