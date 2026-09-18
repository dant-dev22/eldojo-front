import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { BeltSelectorValue } from "@/components/BeltSelector";
import type { AdminStackParamList } from "@/navigation/types";
import type {
  PaymentStatus,
  StudentPortalInvitationStatus,
  StudentStatus,
} from "@/types/api";

export type Props = NativeStackScreenProps<AdminStackParamList, "StudentsList">;

export type FormDialogMode = "create" | "edit";
export type FormDialogStep = "form" | "confirm";

export type FormPageId =
  | "identity"
  | "profile"
  | "billing"
  | "contact"
  | "medical"
  | "documents"
  | "minors";

export type EmergencyContactFormState = {
  fullName: string;
  relationship: string;
  phone: string;
  secondaryPhone: string;
  email: string;
  notes: string;
};

export type MedicalRecordFormState = {
  bloodType: string;
  allergies: string;
  previousInjuries: string;
  insuranceType: "public" | "private" | "none";
  insuranceProvider: string;
  insurancePolicyNumber: string;
  chronicConditions: string;
  medications: string;
  physicianName: string;
  physicianPhone: string;
  additionalNotes: string;
};

export type DocumentFormState = {
  waiverFileUrl: string;
  waiverSignedAt: string;
  waiverSignedBy: string;
  photoConsentGranted: boolean;
  photoConsentSignedAt: string;
  photoConsentSignedBy: string;
};

export type AuthorizedPersonFormState = {
  fullName: string;
  relationship: string;
  dniType: string;
  dniNumber: string;
  dniVerified: boolean;
  phone: string;
  secondaryPhone: string;
  authorizationNotes: string;
};

export type StudentFormState = {
  branchId: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  birthPlace: string;
  heightCm: string;
  enrollmentDate: string;
  primaryClassId: string;
  belt: BeltSelectorValue;
  monthlyFee: string;
  currency: string;
  nextPaymentDate: string;
  paymentStatus: PaymentStatus;
  status: StudentStatus;
  guardianName: string;
  guardianPhone: string;
  phone: string;
  email: string;
  isMinor: boolean;
  notes: string;
  emergencyContact: EmergencyContactFormState;
  medical: MedicalRecordFormState;
  documents: DocumentFormState;
  authorizedPerson: AuthorizedPersonFormState;
};

export type FormErrors = Partial<Record<keyof StudentFormState, string>>;
export type FeedbackTone = "success" | "danger";
export type StudentFormField = keyof StudentFormState;

export type FormPage = {
  id: FormPageId;
  title: string;
  description: string;
  fields: StudentFormField[];
  conditional?: (form: StudentFormState) => boolean;
};

export type ResolvedPortalInvitationStatus = Exclude<StudentPortalInvitationStatus, "used">;

export type StudentAccountStatus = "activated" | "pending" | "missing_email";

export type ToggleRowProps = {
  idPrefix: string;
  label: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
};

export type SummaryRowProps = {
  label: string;
  value: string;
  idPrefix?: string;
};

import type { Feather } from "@expo/vector-icons";

export type DashboardMetricCardProps = {
  title: string;
  value: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  tone: "info" | "success" | "warning" | "neutral";
  idPrefix: string;
};

import type { Student } from "@/types/api";

export type StudentListRowProps = {
  student: Student;
  branchName: string;
  paymentLabel: string;
  paymentTone: "success" | "warning" | "danger" | "neutral";
  studentStatusLabel: string;
  studentStatusTone: "success" | "warning" | "neutral";
  isDesktop: boolean;
  onViewDetail: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onContext?: () => void;
  onOpenMedicalCard?: () => void;
  onCopyInvitationLink?: () => void;
  isCopyingInvitationLink?: boolean;
  copiedInvitationLink?: boolean;
};

export type MobileMetaItemProps = {
  idPrefix: string;
  label: string;
  value: string;
};

export type StudentRowActionButtonProps = {
  nativeID: string;
  label: string;
  onPress: () => void;
  tone?: "neutral" | "danger";
};
