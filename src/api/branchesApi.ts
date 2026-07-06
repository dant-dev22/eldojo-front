import { http } from "@/api/http";
import type { Branch, BranchCreatePayload, BranchUpdatePayload, MessageResponse } from "@/types/api";

export const branchesApi = {
  async list(params?: { organizationId?: number; isActive?: boolean }): Promise<Branch[]> {
    const queryParams: Record<string, string | boolean> = {};

    if (params?.organizationId) {
      queryParams.organization_id = String(params.organizationId);
    }

    if (typeof params?.isActive === "boolean") {
      queryParams.is_active = params.isActive;
    }

    const { data } = await http.get<Branch[]>("/branches", {
      params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
    });

    return data;
  },
  async create(payload: BranchCreatePayload): Promise<Branch> {
    const { data } = await http.post<Branch>("/branches", payload);
    return data;
  },
  async update(branchId: number, payload: BranchUpdatePayload): Promise<Branch> {
    const { data } = await http.patch<Branch>(`/branches/${branchId}`, payload);
    return data;
  },
  async remove(branchId: number): Promise<MessageResponse> {
    const { data } = await http.delete<MessageResponse>(`/branches/${branchId}`);
    return data;
  },
};
