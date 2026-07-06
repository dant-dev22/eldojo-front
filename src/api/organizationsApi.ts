import { http } from "@/api/http";
import type { Organization, OrganizationUpdatePayload } from "@/types/api";

export const organizationsApi = {
  async getById(organizationId: number): Promise<Organization> {
    const { data } = await http.get<Organization>(`/organizations/${organizationId}`);
    return data;
  },
  async update(organizationId: number, payload: OrganizationUpdatePayload): Promise<Organization> {
    const { data } = await http.patch<Organization>(`/organizations/${organizationId}`, payload);
    return data;
  },
};
