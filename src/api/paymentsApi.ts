import { http } from "@/api/http";
import type { Payment } from "@/types/api";

export const paymentsApi = {
  async list(params?: {
    studentId?: number;
    organizationId?: number;
    branchId?: number;
  }): Promise<Payment[]> {
    const queryParams: Record<string, string> = {};

    if (params?.studentId) {
      queryParams.student_id = String(params.studentId);
    }

    if (params?.organizationId) {
      queryParams.organization_id = String(params.organizationId);
    }

    if (params?.branchId) {
      queryParams.branch_id = String(params.branchId);
    }

    const { data } = await http.get<Payment[]>("/payments", {
      params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
    });

    return data;
  },
};
