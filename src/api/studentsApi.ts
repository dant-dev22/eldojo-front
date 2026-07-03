import { http } from "@/api/http";
import type { MessageResponse, Student, StudentCreatePayload, StudentUpdatePayload } from "@/types/api";

export const studentsApi = {
  async list(params?: { search?: string }): Promise<Student[]> {
    const { data } = await http.get<Student[]>("/students", {
      params: params?.search ? { search: params.search } : undefined,
    });
    return data;
  },
  async getById(studentId: number): Promise<Student> {
    const { data } = await http.get<Student>(`/students/${studentId}`);
    return data;
  },
  async create(payload: StudentCreatePayload): Promise<Student> {
    const { data } = await http.post<Student>("/students", payload);
    return data;
  },
  async update(studentId: number, payload: StudentUpdatePayload): Promise<Student> {
    const { data } = await http.patch<Student>(`/students/${studentId}`, payload);
    return data;
  },
  async remove(studentId: number): Promise<MessageResponse> {
    const { data } = await http.delete<MessageResponse>(`/students/${studentId}`);
    return data;
  },
};
