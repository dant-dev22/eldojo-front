import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";

import type { AdminStackParamList } from "@/navigation/types";
import type {
  AttendanceMethod,
  PaymentMethod,
  PaymentRecordStatus,
} from "@/types/api";

export type Props = NativeStackScreenProps<AdminStackParamList, "AdminHome">;

export type FeedbackTone = "success" | "danger";
export type AttendanceDialogMode = "create" | "edit";
export type BranchDialogMode = "create" | "edit";
export type ClassDialogMode = "create" | "edit";
export type BranchesDashboardView = "list" | "summary";
export type OperationsDashboardView = "attendance" | "classes" | null;
export type PaymentDialogMode = "create" | "edit";

export type DestructiveActionState = {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
};

export type OrganizationStatusValue = "active" | "inactive";
export type BranchStatusValue = "active" | "inactive";
export type ClassStatusValue = "active" | "inactive";

export type OrganizationFormState = {
  name: string;
  slug: string;
  status: OrganizationStatusValue;
};

export type BranchFormState = {
  name: string;
  country: string;
  state: string;
  city: string;
  address: string;
  timezone: string;
  qrSecret: string;
  status: BranchStatusValue;
};

export type ClassFormState = {
  branchId: string;
  disciplineId: string;
  name: string;
  description: string;
  instructorName: string;
  capacity: string;
  status: ClassStatusValue;
};

export type PaymentFormState = {
  studentId: string;
  amount: string;
  currency: string;
  periodStart: string;
  periodEnd: string;
  paidDate: string;
  method: PaymentMethod;
  status: PaymentRecordStatus;
  notes: string;
};

export type AttendanceFormState = {
  studentId: string;
  branchId: string;
  classId: string;
  checkInDate: string;
  checkInTime: string;
  method: AttendanceMethod;
};

export type OrganizationFormErrors = Partial<Record<keyof OrganizationFormState, string>>;
export type AttendanceFormErrors = Partial<Record<keyof AttendanceFormState, string>>;
export type BranchFormErrors = Partial<Record<keyof BranchFormState, string>>;
export type ClassFormErrors = Partial<Record<keyof ClassFormState, string>>;
export type PaymentFormErrors = Partial<Record<keyof PaymentFormState, string>>;

export type TutorialStepId = "hero" | "crud" | "branches" | "attendance";

export type TutorialStep = {
  id: TutorialStepId;
  title: string;
  description: string;
};

export type TutorialAnchorFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type MetricCardProps = {
  delay?: number;
  label: string;
  value: string;
  tone: "neutral" | "success" | "danger" | "info";
};

export type EntityFieldProps = {
  label: string;
  value: string;
  idPrefix?: string;
};

export type EditableDetailRowProps = {
  label: string;
  value: string;
  onPress?: (() => void) | undefined;
  idPrefix: string;
};

export type OverviewGraphItem = {
  key: string;
  label: string;
  value: number;
  tone: string;
};

export type OverviewGraphCardProps = {
  delay: number;
  idPrefix: string;
  items: OverviewGraphItem[];
  subtitle: string;
  title: string;
};

export type CircularStatProps = {
  idPrefix: string;
  label: string;
  value: number;
  total: number;
  tone: string;
  compact?: boolean;
};

export type OverviewCircularGraphFooterLink = {
  label: string;
  onPress: () => void;
};

export type OverviewCircularGraphCardProps = {
  delay: number;
  idPrefix: string;
  items: OverviewGraphItem[];
  subtitle: string;
  title: string;
  compact?: boolean;
  footerLink?: OverviewCircularGraphFooterLink;
  circleLinks?: Record<string, OverviewCircularGraphFooterLink>;
};

export type OverviewHybridGraphTileLink = {
  tileKey: string;
  onPress: () => void;
};

export type OverviewHybridGraphCardProps = {
  delay: number;
  idPrefix: string;
  items: OverviewGraphItem[];
  subtitle: string;
  title: string;
  ctaLabel?: string;
  onCtaPress?: () => void;
  summaryTiles?: OverviewGraphItem[];
  tileLinks?: OverviewHybridGraphTileLink[];
};

export type QuickActionProps = {
  label: string;
  description: string;
  onPress: () => void;
  disabled?: boolean;
  idPrefix?: string;
  tone?: "neutral" | "primary" | "success";
};

export type FirstTimeTutorialBubbleProps = {
  currentStep: number;
  description: string;
  loading?: boolean;
  onAdvance: () => void;
  onDismiss: () => void;
  style?: StyleProp<ViewStyle>;
  title: string;
  totalSteps: number;
};

export type AnimatedSurfaceProps = {
  children: ReactNode;
  delay?: number;
  nativeID?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};
