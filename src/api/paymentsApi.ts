import { http } from "@/api/http";
import type { Payment, PaymentCreatePayload, PaymentMethod, PaymentRecordStatus, PaymentUpdatePayload, MessageResponse } from "@/types/api";

export const paymentsApi = {
  async list(params?: {
    studentId?: number;
    organizationId?: number;
    branchId?: number;
    method?: PaymentMethod;
    status?: PaymentRecordStatus;
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

    if (params?.method) {
      queryParams.method = params.method;
    }

    if (params?.status) {
      queryParams.status = params.status;
    }

    const { data } = await http.get<Payment[]>("/payments", {
      params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
    });

    return data;
  },
  async create(payload: PaymentCreatePayload): Promise<Payment> {
    const { data } = await http.post<Payment>("/payments", payload);
    return data;
  },
  async update(paymentId: number, payload: PaymentUpdatePayload): Promise<Payment> {
    const { data } = await http.patch<Payment>(`/payments/${paymentId}`, payload);
    return data;
  },
  async remove(paymentId: number): Promise<MessageResponse> {
    const { data } = await http.delete<MessageResponse>(`/payments/${paymentId}`);
    return data;
  },
};
