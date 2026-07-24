import { http } from "@/api/http";

import type {
  PublicAttendanceContext,
  PublicAttendanceCreatePayload,
  PublicAttendanceResult,
  PublicAttendanceStudentPreview,
} from "@/types/publicAttendance";

function encodeSegment(value: string): string {
  return encodeURIComponent(value.trim());
}

export const publicAttendanceApi = {
  async getContext(organizationSlug: string, branchSlug: string): Promise<PublicAttendanceContext> {
    const { data } = await http.get<PublicAttendanceContext>(
      `/public/attendance/${encodeSegment(organizationSlug)}/${encodeSegment(branchSlug)}`
    );
    return data;
  },
  async lookupStudent(
    organizationSlug: string,
    branchSlug: string,
    query: string
  ): Promise<PublicAttendanceStudentPreview> {
    const { data } = await http.get<PublicAttendanceStudentPreview>(
      `/public/attendance/${encodeSegment(organizationSlug)}/${encodeSegment(branchSlug)}/students/lookup`,
      {
        params: {
          query: query.trim(),
        },
      }
    );
    return data;
  },
  async register(
    organizationSlug: string,
    branchSlug: string,
    payload: PublicAttendanceCreatePayload
  ): Promise<PublicAttendanceResult> {
    const { data } = await http.post<PublicAttendanceResult>(
      `/public/attendance/${encodeSegment(organizationSlug)}/${encodeSegment(branchSlug)}`,
      payload
    );
    return data;
  },
};
