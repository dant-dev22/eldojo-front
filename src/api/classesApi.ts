import { http } from "@/api/http";
import type {
  MartialClass,
  MartialClassCreatePayload,
  MartialClassUpdatePayload,
  MessageResponse,
} from "@/types/api";

export const classesApi = {
  async list(params?: {
    isActive?: boolean;
    organizationId?: number;
    branchId?: number;
  }): Promise<MartialClass[]> {
    const queryParams: Record<string, string | boolean> = {};

    if (typeof params?.isActive === "boolean") {
      queryParams.is_active = params.isActive;
    }

    if (params?.organizationId) {
      queryParams.organization_id = String(params.organizationId);
    }

    if (params?.branchId) {
      queryParams.branch_id = String(params.branchId);
    }

    const { data } = await http.get<MartialClass[]>("/classes", {
      params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
    });

    return data;
  },
  async create(payload: MartialClassCreatePayload): Promise<MartialClass> {
    const { data } = await http.post<MartialClass>("/classes", payload);
    return data;
  },
  async update(classId: number, payload: MartialClassUpdatePayload): Promise<MartialClass> {
    const { data } = await http.patch<MartialClass>(`/classes/${classId}`, payload);
    return data;
  },
  async remove(classId: number): Promise<MessageResponse> {
    const { data } = await http.delete<MessageResponse>(`/classes/${classId}`);
    return data;
  },
};
