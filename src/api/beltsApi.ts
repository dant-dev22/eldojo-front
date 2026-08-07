import { http } from "@/api/http";
import type {
  BeltLevel,
  BeltStripe,
  MessageResponse,
  StudentBeltHistory,
} from "@/types/api";

export const beltsApi = {
  async listLevels(params?: {
    organization_id?: number;
    is_active?: boolean;
    include_stripes?: boolean;
  }): Promise<BeltLevel[]> {
    const { data } = await http.get<BeltLevel[]>("/belts/levels", {
      params: params ?? undefined,
    });
    return data;
  },
  async getLevel(levelId: number): Promise<BeltLevel> {
    const { data } = await http.get<BeltLevel>(`/belts/levels/${levelId}`);
    return data;
  },
  async listStripes(params?: {
    belt_level_id?: number;
    organization_id?: number;
    is_active?: boolean;
  }): Promise<BeltStripe[]> {
    const { data } = await http.get<BeltStripe[]>("/belts/stripes", {
      params: params ?? undefined,
    });
    return data;
  },
  async listHistory(params?: {
    student_id?: number;
    organization_id?: number;
  }): Promise<StudentBeltHistory[]> {
    const { data } = await http.get<StudentBeltHistory[]>("/belts/history", {
      params: params ?? undefined,
    });
    return data;
  },
  async createHistory(payload: {
    student_id: number;
    belt_level_id: number;
    stripe_id?: number | null;
    awarded_at: string;
    awarded_by_user_id?: number | null;
    notes?: string | null;
    update_student_current?: boolean;
  }): Promise<StudentBeltHistory> {
    const { data } = await http.post<StudentBeltHistory>("/belts/history", payload);
    return data;
  },
  async createLevel(payload: {
    organization_id: number;
    name: string;
    display_name: string;
    color_hex: string;
    text_color_hex?: string;
    order_index?: number;
    is_active?: boolean;
    description?: string | null;
  }): Promise<BeltLevel> {
    const { data } = await http.post<BeltLevel>("/belts/levels", payload);
    return data;
  },
  async createStripe(payload: {
    belt_level_id: number;
    name: string;
    display_name: string;
    color_hex: string;
    order_index?: number;
    is_active?: boolean;
  }): Promise<BeltStripe> {
    const { data } = await http.post<BeltStripe>("/belts/stripes", payload);
    return data;
  },
  async deleteLevel(levelId: number): Promise<MessageResponse> {
    const { data } = await http.delete<MessageResponse>(`/belts/levels/${levelId}`);
    return data;
  },
  async deleteStripe(stripeId: number): Promise<MessageResponse> {
    const { data } = await http.delete<MessageResponse>(`/belts/stripes/${stripeId}`);
    return data;
  },
};
