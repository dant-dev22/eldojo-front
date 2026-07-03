import { http } from "@/api/http";
import type { MartialClass } from "@/types/api";

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
};
