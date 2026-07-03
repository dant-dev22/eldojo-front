import { http } from "@/api/http";
import type { Branch } from "@/types/api";

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
};
