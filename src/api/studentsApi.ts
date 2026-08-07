import { http } from "@/api/http";
import type {
  AuthorizedPerson,
  AuthorizedPersonCreatePayload,
  EmergencyContact,
  EmergencyContactCreatePayload,
  MedicalRecord,
  MedicalRecordUpsertPayload,
  MessageResponse,
  Student,
  StudentCreatePayload,
  StudentDocument,
  StudentDocumentCreatePayload,
  StudentProfileCompleteness,
  StudentUpdatePayload,
} from "@/types/api";

export const studentsApi = {
  async list(params?: { search?: string; incompleteOnly?: boolean }): Promise<Student[]> {
    const { data } = await http.get<Student[]>("/students", {
      params: {
        search: params?.search || undefined,
        incomplete_only: params?.incompleteOnly ? true : undefined,
      },
    });
    return data;
  },
  async getById(studentId: number, params?: { includeDetails?: boolean }): Promise<Student> {
    const { data } = await http.get<Student>(`/students/${studentId}`, {
      params: {
        include_details: params?.includeDetails ? true : undefined,
      },
    });
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
  async getProfileCompleteness(studentId: number): Promise<StudentProfileCompleteness> {
    const { data } = await http.get<StudentProfileCompleteness>(`/students/${studentId}/profile-completeness`);
    return data;
  },
  async listEmergencyContacts(studentId: number): Promise<EmergencyContact[]> {
    const { data } = await http.get<EmergencyContact[]>(`/students/${studentId}/emergency-contacts`);
    return data;
  },
  async createEmergencyContact(studentId: number, payload: EmergencyContactCreatePayload): Promise<EmergencyContact> {
    const { data } = await http.post<EmergencyContact>(`/students/${studentId}/emergency-contacts`, payload);
    return data;
  },
  async getMedicalRecord(studentId: number): Promise<MedicalRecord | null> {
    const { data } = await http.get<MedicalRecord | null>(`/students/${studentId}/medical-record`);
    return data;
  },
  async upsertMedicalRecord(studentId: number, payload: MedicalRecordUpsertPayload): Promise<MedicalRecord> {
    const { data } = await http.put<MedicalRecord>(`/students/${studentId}/medical-record`, payload);
    return data;
  },
  async listDocuments(studentId: number, params?: { documentType?: string }): Promise<StudentDocument[]> {
    const { data } = await http.get<StudentDocument[]>(`/students/${studentId}/documents`, {
      params: params?.documentType ? { document_type: params.documentType } : undefined,
    });
    return data;
  },
  async createDocument(studentId: number, payload: StudentDocumentCreatePayload): Promise<StudentDocument> {
    const { data } = await http.post<StudentDocument>(`/students/${studentId}/documents`, payload);
    return data;
  },
  async listAuthorizedPersons(studentId: number, params?: { onlyActive?: boolean }): Promise<AuthorizedPerson[]> {
    const { data } = await http.get<AuthorizedPerson[]>(`/students/${studentId}/authorized-persons`, {
      params: params?.onlyActive === false ? { only_active: false } : undefined,
    });
    return data;
  },
  async createAuthorizedPerson(studentId: number, payload: AuthorizedPersonCreatePayload): Promise<AuthorizedPerson> {
    const { data } = await http.post<AuthorizedPerson>(`/students/${studentId}/authorized-persons`, payload);
    return data;
  },
};
