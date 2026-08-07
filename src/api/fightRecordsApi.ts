import { http } from "@/api/http";
import type {
  FightRecordType,
  MessageResponse,
  StudentFightRecord,
  StudentFightRecordCreatePayload,
  StudentFightRecordUpdatePayload,
} from "@/types/api";

export const fightRecordsApi = {
  async create(
    payload: StudentFightRecordCreatePayload,
  ): Promise<StudentFightRecord> {
    const { data } = await http.post<StudentFightRecord>("/fight-records", payload);
    return data;
  },

  async list(params: {
    student_id: number;
    record_type?: FightRecordType;
    date_from?: string;
    date_to?: string;
  }): Promise<StudentFightRecord[]> {
    const { data } = await http.get<StudentFightRecord[]>("/fight-records", {
      params,
    });
    return data;
  },

  async get(recordId: number): Promise<StudentFightRecord> {
    const { data } = await http.get<StudentFightRecord>(`/fight-records/${recordId}`);
    return data;
  },

  async update(
    recordId: number,
    payload: StudentFightRecordUpdatePayload,
  ): Promise<StudentFightRecord> {
    const { data } = await http.patch<StudentFightRecord>(
      `/fight-records/${recordId}`,
      payload,
    );
    return data;
  },

  async remove(recordId: number): Promise<MessageResponse> {
    const { data } = await http.delete<MessageResponse>(`/fight-records/${recordId}`);
    return data;
  },
};
