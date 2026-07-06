import { http } from "@/api/http";
import type { Discipline } from "@/types/api";

export const disciplinesApi = {
  async list(params?: { organizationId?: number; isActive?: boolean }): Promise<Discipline[]> {
    const queryParams: Record<string, string | boolean> = {};

    if (params?.organizationId) {
      queryParams.organization_id = String(params.organizationId);
    }

    if (typeof params?.isActive === "boolean") {
      queryParams.is_active = params.isActive;
    }

    const { data } = await http.get<Discipline[]>("/disciplines", {
      params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
    });

    return data;
  },
  async create(payload: { organization_id: number; name: string; is_active?: boolean }): Promise<Discipline> {
    const { data } = await http.post<Discipline>("/disciplines", payload);
    return data;
  },
};
