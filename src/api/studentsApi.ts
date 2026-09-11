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
  StudentPortalAccessStatus,
  StudentPortalInvitationStatus,
  StudentProfileCompleteness,
  StudentUpdatePayload,
} from "@/types/api";

export type EnsureInvitationResult = {
  invitation_link: string;
  portal_access: StudentPortalAccessStatus;
  /**
   * true → se creó una nueva invitación porque no había / expiró / era legacy.
   * false → se reutilizó la invitación pendiente existente (mismo link).
   */
  created_new: boolean;
};

export const studentsApi = {
  async list(params?: {
    search?: string;
    incompleteOnly?: boolean;
    organization_id?: number;
    branch_id?: number;
    status?: string;
  }): Promise<Student[]> {
    const { data } = await http.get<Student[]>("/students", {
      params: {
        search: params?.search || undefined,
        incomplete_only: params?.incompleteOnly ? true : undefined,
        include_portal_access: true,
        organization_id:
          typeof params?.organization_id === "number" && params.organization_id > 0
            ? params.organization_id
            : undefined,
        branch_id:
          typeof params?.branch_id === "number" && params.branch_id > 0
            ? params.branch_id
            : undefined,
        status: params?.status || undefined,
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
  async getPortalAccess(studentId: number): Promise<StudentPortalAccessStatus> {
    const { data } = await http.get<StudentPortalAccessStatus>(`/students/${studentId}/portal-access`);
    return data;
  },
  async resendInvitation(studentId: number): Promise<Student> {
    const { data } = await http.post<Student>(`/students/${studentId}/resend-invitation`);
    return data;
  },
  /**
   * Semántica ensure-and-get del link de invitación.
   *
   * Orden de resolución:
   *   1. Usa el `portal_access` ya cargado en el alumno si trae invitation_link
   *      + invitation_status = "pending".
   *   2. Hace GET /portal-access para refrescar y (posiblemente) traer el link
   *      reconstruido si la invitación es del tipo determinístico.
   *   3. Si aún no hay link (legacy sin nonce, expirado, usado, sin invitación),
   *      llama a POST /resend-invitation para generar uno nuevo.
   */
  async ensureAndGetInvitation(
    studentId: number,
    cachedPortalAccess?: StudentPortalAccessStatus | null,
  ): Promise<EnsureInvitationResult> {
    const canReuseCached =
      cachedPortalAccess &&
      cachedPortalAccess.invitation_status === "pending" &&
      typeof cachedPortalAccess.invitation_link === "string" &&
      cachedPortalAccess.invitation_link.length > 0;

    if (canReuseCached) {
      return {
        invitation_link: cachedPortalAccess!.invitation_link!,
        portal_access: cachedPortalAccess!,
        created_new: false,
      };
    }

    const refreshedStatus = await this.getPortalAccess(studentId);
    if (
      refreshedStatus.invitation_status === "pending" &&
      typeof refreshedStatus.invitation_link === "string" &&
      refreshedStatus.invitation_link.length > 0
    ) {
      return {
        invitation_link: refreshedStatus.invitation_link,
        portal_access: refreshedStatus,
        created_new: false,
      };
    }

    const updatedStudent = await this.resendInvitation(studentId);
    const nextStatus = updatedStudent.portal_access ?? refreshedStatus;
    const nextLink = nextStatus?.invitation_link ?? null;
    if (!nextLink) {
      throw new Error("invitation_link_missing_after_resend");
    }
    return {
      invitation_link: nextLink,
      portal_access: nextStatus,
      created_new: true,
    };
  },
};
