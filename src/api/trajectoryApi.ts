import { http } from "@/api/http";
import type {
  MessageResponse,
  StudentTrajectorySummary,
  TrajectoryEvent,
  TrajectoryEventCreatePayload,
  TrajectoryEventUpdatePayload,
} from "@/types/api";

export const trajectoryApi = {
  async createEvent(payload: TrajectoryEventCreatePayload): Promise<TrajectoryEvent> {
    const { data } = await http.post<TrajectoryEvent>("/trajectory/events", payload);
    return data;
  },
  async listEvents(params?: {
    student_id?: number;
    organization_id?: number;
    event_date_from?: string;
    event_date_to?: string;
  }): Promise<TrajectoryEvent[]> {
    const { data } = await http.get<TrajectoryEvent[]>("/trajectory/events", { params });
    return data;
  },
  async getEvent(eventId: number): Promise<TrajectoryEvent> {
    const { data } = await http.get<TrajectoryEvent>(`/trajectory/events/${eventId}`);
    return data;
  },
  async updateEvent(
    eventId: number,
    payload: TrajectoryEventUpdatePayload,
  ): Promise<TrajectoryEvent> {
    const { data } = await http.patch<TrajectoryEvent>(
      `/trajectory/events/${eventId}`,
      payload,
    );
    return data;
  },
  async removeEvent(eventId: number): Promise<MessageResponse> {
    const { data } = await http.delete<MessageResponse>(`/trajectory/events/${eventId}`);
    return data;
  },
  async summaryByStudent(params?: {
    student_ids?: number[];
    organization_id?: number;
  }): Promise<StudentTrajectorySummary[]> {
    const queryParams: Record<string, unknown> = {};
    if (params?.organization_id) {
      queryParams.organization_id = params.organization_id;
    }
    if (params?.student_ids && params.student_ids.length > 0) {
      queryParams.student_ids = params.student_ids;
    }
    const { data } = await http.get<StudentTrajectorySummary[]>(
      "/trajectory/summary/by-student",
      { params: queryParams },
    );
    return data;
  },
};
