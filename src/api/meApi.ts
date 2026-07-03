import { http } from "@/api/http";
import type { MyProfile } from "@/types/api";

export const meApi = {
  async getProfile(): Promise<MyProfile> {
    const { data } = await http.get<MyProfile>("/me");
    return data;
  },

  async updateProfile(input: { primaryClassId?: number | null; photoUri?: string | null }): Promise<MyProfile> {
    const formData = new FormData();

    if (typeof input.primaryClassId === "number") {
      formData.append("primary_class_id", String(input.primaryClassId));
    }

    if (input.photoUri) {
      const extension = input.photoUri.split(".").pop() ?? "jpg";
      formData.append("photo", {
        uri: input.photoUri,
        name: `perfil.${extension}`,
        type: `image/${extension === "jpg" ? "jpeg" : extension}`,
      } as never);
    }

    const { data } = await http.patch<MyProfile>("/me", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return data;
  },
};
