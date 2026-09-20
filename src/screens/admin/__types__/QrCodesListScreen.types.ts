import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { AdminStackParamList } from "@/navigation/types";

export type Props = NativeStackScreenProps<AdminStackParamList, "QrCodesList">;

export type FeedbackTone = "success" | "danger";
export type PaymentStatusTone = "success" | "warning" | "danger" | "neutral";

export type AttendanceFeedbackState = {
  tone: FeedbackTone;
  message: string;
};

export type LastScanContext = {
  student_name: string;
  class_name: string | null;
  check_in_at: string | null;
};
