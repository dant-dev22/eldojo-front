import { Feather } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { beltsApi } from "@/api/beltsApi";
import { branchesApi } from "@/api/branchesApi";
import { classesApi } from "@/api/classesApi";
import { studentsApi } from "@/api/studentsApi";
import { getErrorMessage } from "@/api/http";
import { AppBadge } from "@/components/AppBadge";
import { AppButton } from "@/components/AppButton";
import { AppCard } from "@/components/AppCard";
import { AppDateInput } from "@/components/AppDateInput";
import { AppInput } from "@/components/AppInput";
import { AdminShell } from "@/components/AdminShell";
import { AppModal } from "@/components/AppModal";
import { AppSelect } from "@/components/AppSelect";
import { BeltIndicator } from "@/components/BeltIndicator";
import { BeltSelector, type BeltSelectorValue } from "@/components/BeltSelector";
import { BottomSheet, type BottomSheetAction } from "@/components/BottomSheet";
import { ConfirmActionModal } from "@/components/ConfirmActionModal";
import { FloatingActionButton } from "@/components/FloatingActionButton";
import { SkeletonList } from "@/components/SkeletonLoader";
import { Screen } from "@/components/Screen";
import { StatusView } from "@/components/StatusView";
import { StudentDetailModal } from "@/components/StudentDetailModal";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { formatCurrency, formatDate, formatPaymentStatus } from "@/utils/format";

import type { AdminStackParamList } from "@/navigation/types";
import type {
  PaymentStatus,
  Student,
  StudentCreatePayload,
  StudentStatus,
  StudentUpdatePayload,
} from "@/types/api";

type Props = NativeStackScreenProps<AdminStackParamList, "StudentsList">;

type FormDialogMode = "create" | "edit";
type FormDialogStep = "form" | "confirm";
type FormPageId =
  | "identity"
  | "profile"
  | "billing"
  | "contact"
  | "medical"
  | "documents"
  | "minors";

type EmergencyContactFormState = {
  fullName: string;
  relationship: string;
  phone: string;
  secondaryPhone: string;
  email: string;
  notes: string;
};

type MedicalRecordFormState = {
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

type DocumentFormState = {
  waiverFileUrl: string;
  waiverSignedAt: string;
  waiverSignedBy: string;
  photoConsentGranted: boolean;
  photoConsentSignedAt: string;
  photoConsentSignedBy: string;
};

type AuthorizedPersonFormState = {
  fullName: string;
  relationship: string;
  dniType: string;
  dniNumber: string;
  dniVerified: boolean;
  phone: string;
  secondaryPhone: string;
  authorizationNotes: string;
};

type StudentFormState = {
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

type FormErrors = Partial<Record<keyof StudentFormState, string>>;
type FeedbackTone = "success" | "danger";
type StudentFormField = keyof StudentFormState;
type FormPage = {
  id: FormPageId;
  title: string;
  description: string;
  fields: StudentFormField[];
  conditional?: (form: StudentFormState) => boolean;
};

const PAYMENT_STATUS_OPTIONS: Array<{ label: string; value: PaymentStatus }> = [
  { label: "Al corriente", value: "up_to_date" },
  { label: "Vencido", value: "late" },
  { label: "Parcial", value: "partial" },
  { label: "Exento", value: "waived" },
];

const STUDENT_STATUS_OPTIONS: Array<{ label: string; value: StudentStatus }> = [
  { label: "Activo", value: "active" },
  { label: "Congelado", value: "frozen" },
  { label: "Inactivo", value: "inactive" },
];

const INSURANCE_TYPE_OPTIONS: Array<{ label: string; value: "public" | "private" | "none" }> = [
  { label: "Seguro público", value: "public" },
  { label: "Seguro privado", value: "private" },
  { label: "Sin seguro", value: "none" },
];

const BLOOD_TYPE_OPTIONS = [
  { label: "A+", value: "A+" },
  { label: "A-", value: "A-" },
  { label: "B+", value: "B+" },
  { label: "B-", value: "B-" },
  { label: "AB+", value: "AB+" },
  { label: "AB-", value: "AB-" },
  { label: "O+", value: "O+" },
  { label: "O-", value: "O-" },
];

const FORM_PAGES: FormPage[] = [
  {
    id: "identity",
    title: "Identidad",
    description: "Define la sucursal y los datos personales base del alumno.",
    fields: ["branchId", "firstName", "lastName", "birthDate"],
  },
  {
    id: "profile",
    title: "Perfil",
    description: "Captura contexto deportivo, grado actual y datos generales del ingreso.",
    fields: ["birthPlace", "enrollmentDate", "heightCm", "primaryClassId", "belt"],
  },
  {
    id: "billing",
    title: "Cobro",
    description: "Configura estado operativo y condiciones de pago actuales.",
    fields: ["status", "paymentStatus", "monthlyFee", "currency"],
  },
  {
    id: "contact",
    title: "Contacto",
    description: "Teléfono, email, contacto de emergencia y responsable.",
    fields: ["phone", "email", "nextPaymentDate", "guardianName", "guardianPhone", "notes", "emergencyContact"],
  },
  {
    id: "medical",
    title: "Ficha médica",
    description: "Datos clínicos relevantes para proteger la integridad del alumno.",
    fields: ["medical"],
  },
  {
    id: "documents",
    title: "Documentos",
    description: "Waiver de responsabilidad firmado y consentimiento de uso de imagen.",
    fields: ["documents"],
  },
  {
    id: "minors",
    title: "Menores de edad",
    description: "Si es menor, indica personas autorizadas para su retiro con DNI verificado.",
    fields: ["isMinor", "authorizedPerson"],
    conditional: (form) => true,
  },
];

const STUDENTS_PER_PAGE = 10;

function createEmptyEmergencyContact(): EmergencyContactFormState {
  return {
    fullName: "",
    relationship: "",
    phone: "",
    secondaryPhone: "",
    email: "",
    notes: "",
  };
}

function createEmptyMedicalRecord(): MedicalRecordFormState {
  return {
    bloodType: "",
    allergies: "",
    previousInjuries: "",
    insuranceType: "none",
    insuranceProvider: "",
    insurancePolicyNumber: "",
    chronicConditions: "",
    medications: "",
    physicianName: "",
    physicianPhone: "",
    additionalNotes: "",
  };
}

function createEmptyDocuments(): DocumentFormState {
  return {
    waiverFileUrl: "",
    waiverSignedAt: "",
    waiverSignedBy: "",
    photoConsentGranted: false,
    photoConsentSignedAt: "",
    photoConsentSignedBy: "",
  };
}

function createEmptyAuthorizedPerson(): AuthorizedPersonFormState {
  return {
    fullName: "",
    relationship: "",
    dniType: "",
    dniNumber: "",
    dniVerified: false,
    phone: "",
    secondaryPhone: "",
    authorizationNotes: "",
  };
}

function createEmptyForm(defaultBranchId?: number | null): StudentFormState {
  return {
    branchId: defaultBranchId ? String(defaultBranchId) : "",
    firstName: "",
    lastName: "",
    birthDate: "",
    birthPlace: "",
    heightCm: "",
    enrollmentDate: new Date().toISOString().slice(0, 10),
    primaryClassId: "",
    belt: { beltLevelId: null, stripeId: null },
    monthlyFee: "",
    currency: "MXN",
    nextPaymentDate: "",
    paymentStatus: "up_to_date",
    status: "active",
    guardianName: "",
    guardianPhone: "",
    phone: "",
    email: "",
    isMinor: false,
    notes: "",
    emergencyContact: createEmptyEmergencyContact(),
    medical: createEmptyMedicalRecord(),
    documents: createEmptyDocuments(),
    authorizedPerson: createEmptyAuthorizedPerson(),
  };
}

function toFormState(student: Student): StudentFormState {
  const ec = student.emergency_contacts?.[0];
  const mr = student.medical_record;
  const docs = student.documents ?? [];
  const waiver = docs.find((d) => d.document_type === "liability_waiver");
  const photo = docs.find((d) => d.document_type === "photo_consent");
  const ap = student.authorized_persons?.[0];

  return {
    branchId: String(student.branch_id),
    firstName: student.first_name,
    lastName: student.last_name,
    birthDate: student.birth_date,
    birthPlace: student.birth_place,
    heightCm: student.height_cm ? String(student.height_cm) : "",
    enrollmentDate: student.enrollment_date,
    primaryClassId: student.primary_class_id ? String(student.primary_class_id) : "",
    belt: {
      beltLevelId: student.current_belt_level_id ?? null,
      stripeId: student.current_stripe_id ?? null,
    },
    monthlyFee: student.monthly_fee ?? "",
    currency: student.currency,
    nextPaymentDate: student.next_payment_date ?? "",
    paymentStatus: student.payment_status,
    status: student.status,
    guardianName: student.guardian_name ?? "",
    guardianPhone: student.guardian_phone ?? "",
    phone: student.phone ?? "",
    email: student.email ?? "",
    isMinor: Boolean(student.is_minor),
    notes: student.notes ?? "",
    emergencyContact: {
      fullName: ec?.full_name ?? "",
      relationship: ec?.relationship ?? "",
      phone: ec?.phone ?? "",
      secondaryPhone: ec?.secondary_phone ?? "",
      email: ec?.email ?? "",
      notes: ec?.notes ?? "",
    },
    medical: {
      bloodType: mr?.blood_type ?? "",
      allergies: mr?.allergies ?? "",
      previousInjuries: mr?.previous_injuries ?? "",
      insuranceType: mr?.insurance_type ?? "none",
      insuranceProvider: mr?.insurance_provider ?? "",
      insurancePolicyNumber: mr?.insurance_policy_number ?? "",
      chronicConditions: mr?.chronic_conditions ?? "",
      medications: mr?.medications ?? "",
      physicianName: mr?.physician_name ?? "",
      physicianPhone: mr?.physician_phone ?? "",
      additionalNotes: mr?.additional_notes ?? "",
    },
    documents: {
      waiverFileUrl: waiver?.file_url ?? "",
      waiverSignedAt: waiver?.signed_at ?? "",
      waiverSignedBy: waiver?.signed_by_full_name ?? "",
      photoConsentGranted: Boolean(photo),
      photoConsentSignedAt: photo?.signed_at ?? "",
      photoConsentSignedBy: photo?.signed_by_full_name ?? "",
    },
    authorizedPerson: {
      fullName: ap?.full_name ?? "",
      relationship: ap?.relationship ?? "",
      dniType: ap?.dni_type ?? "",
      dniNumber: ap?.dni_number ?? "",
      dniVerified: Boolean(ap?.dni_verified),
      phone: ap?.phone ?? "",
      secondaryPhone: ap?.secondary_phone ?? "",
      authorizationNotes: ap?.authorization_notes ?? "",
    },
  };
}

function isValidDateText(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getPaymentLabel(value: PaymentStatus): string {
  return PAYMENT_STATUS_OPTIONS.find((item) => item.value === value)?.label ?? value;
}

function getStudentStatusLabel(value: StudentStatus): string {
  return STUDENT_STATUS_OPTIONS.find((item) => item.value === value)?.label ?? value;
}

function getStudentStatusTone(status: StudentStatus): "success" | "warning" | "neutral" {
  switch (status) {
    case "active":
      return "success";
    case "frozen":
      return "warning";
    default:
      return "neutral";
  }
}

function getPaymentTone(status: string): "success" | "warning" | "danger" | "neutral" {
  switch (status) {
    case "up_to_date":
      return "success";
    case "partial":
    case "due_soon":
      return "warning";
    case "late":
    case "overdue":
      return "danger";
    default:
      return "neutral";
  }
}

function getFeedbackTone(message: string): FeedbackTone {
  return message.toLowerCase().includes("no fue posible") ? "danger" : "success";
}

function formatStudentFee(student: Student): string {
  if (!student.monthly_fee) {
    return "Sin definir";
  }

  return formatCurrency(student.monthly_fee, student.currency);
}

function buildStudentPayload(
  form: StudentFormState,
  organizationId: number,
): StudentCreatePayload {
  return {
    organization_id: organizationId,
    branch_id: Number(form.branchId),
    first_name: form.firstName.trim(),
    last_name: form.lastName.trim(),
    birth_date: form.birthDate,
    birth_place: form.birthPlace.trim(),
    height_cm: form.heightCm.trim() ? Number(form.heightCm.trim()) : null,
    enrollment_date: form.enrollmentDate,
    primary_class_id: form.primaryClassId ? Number(form.primaryClassId) : null,
    current_belt_level_id: form.belt.beltLevelId,
    current_stripe_id: form.belt.stripeId,
    monthly_fee: form.monthlyFee.trim() ? form.monthlyFee.trim() : null,
    currency: form.currency.trim().toUpperCase(),
    next_payment_date: form.nextPaymentDate.trim() || null,
    payment_status: form.paymentStatus,
    status: form.status,
    guardian_name: form.guardianName.trim() || null,
    guardian_phone: form.guardianPhone.trim() || null,
    phone: form.phone.trim() || null,
    email: form.email.trim() || null,
    is_minor: form.isMinor,
    notes: form.notes.trim() || null,
  };
}

function buildStudentUpdatePayload(form: StudentFormState): StudentUpdatePayload {
  return {
    branch_id: Number(form.branchId),
    first_name: form.firstName.trim(),
    last_name: form.lastName.trim(),
    birth_date: form.birthDate,
    birth_place: form.birthPlace.trim(),
    height_cm: form.heightCm.trim() ? Number(form.heightCm.trim()) : null,
    enrollment_date: form.enrollmentDate,
    primary_class_id: form.primaryClassId ? Number(form.primaryClassId) : null,
    current_belt_level_id: form.belt.beltLevelId,
    current_stripe_id: form.belt.stripeId,
    monthly_fee: form.monthlyFee.trim() ? form.monthlyFee.trim() : null,
    currency: form.currency.trim().toUpperCase(),
    next_payment_date: form.nextPaymentDate.trim() || null,
    payment_status: form.paymentStatus,
    status: form.status,
    guardian_name: form.guardianName.trim() || null,
    guardian_phone: form.guardianPhone.trim() || null,
    phone: form.phone.trim() || null,
    email: form.email.trim() || null,
    is_minor: form.isMinor,
    notes: form.notes.trim() || null,
  };
}

function validateStudentForm(form: StudentFormState): FormErrors {
  const errors: FormErrors = {};

  if (!form.branchId) {
    errors.branchId = "Selecciona una sucursal.";
  }
  if (form.firstName.trim().length < 2) {
    errors.firstName = "Ingresa al menos 2 caracteres.";
  }
  if (form.lastName.trim().length < 2) {
    errors.lastName = "Ingresa al menos 2 caracteres.";
  }
  if (!isValidDateText(form.birthDate)) {
    errors.birthDate = "Usa el formato YYYY-MM-DD.";
  }
  if (form.birthPlace.trim().length < 2) {
    errors.birthPlace = "Ingresa el lugar de nacimiento.";
  }
  if (!isValidDateText(form.enrollmentDate)) {
    errors.enrollmentDate = "Usa el formato YYYY-MM-DD.";
  }
  if (form.heightCm.trim() && Number.isNaN(Number(form.heightCm.trim()))) {
    errors.heightCm = "Ingresa una altura válida.";
  }
  if (form.monthlyFee.trim() && Number.isNaN(Number(form.monthlyFee.trim()))) {
    errors.monthlyFee = "Ingresa una mensualidad válida.";
  }
  if (form.nextPaymentDate.trim() && !isValidDateText(form.nextPaymentDate.trim())) {
    errors.nextPaymentDate = "Usa el formato YYYY-MM-DD.";
  }
  if (form.phone.trim() && !/^[\d\s\-+()]{7,}$/.test(form.phone.trim())) {
    errors.phone = "Ingresa un teléfono válido.";
  }
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = "Ingresa un email válido.";
  }

  return errors;
}

function getPageErrors(formErrors: FormErrors, fields: StudentFormField[]): FormErrors {
  return fields.reduce<FormErrors>((accumulator, field) => {
    if (formErrors[field]) {
      accumulator[field] = formErrors[field];
    }

    return accumulator;
  }, {});
}

export function StudentsListScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const { contentMaxWidth, isDesktop } = useResponsiveLayout();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<FeedbackTone>("success");
  const [dialogMode, setDialogMode] = useState<FormDialogMode>("create");
  const [dialogStep, setDialogStep] = useState<FormDialogStep>("form");
  const [isFormDialogVisible, setIsFormDialogVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [form, setForm] = useState<StudentFormState>(() => createEmptyForm());
  const [currentFormPage, setCurrentFormPage] = useState(0);
  const [currentStudentsPage, setCurrentStudentsPage] = useState(1);
  const [showContextSheet, setShowContextSheet] = useState(false);
  const [contextSheetStudent, setContextSheetStudent] = useState<Student | null>(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [detailStudentId, setDetailStudentId] = useState<number | null>(null);
  const [isMedicalQuickViewVisible, setIsMedicalQuickViewVisible] = useState(false);
  const [medicalQuickViewStudent, setMedicalQuickViewStudent] = useState<Student | null>(null);

  const currentAssignment = user?.admin_assignments[0] ?? null;
  const organizationId = currentAssignment?.organization_id ?? null;
  const fixedBranchId = currentAssignment?.branch_id ?? null;
  const selectedBranchId = form.branchId ? Number(form.branchId) : fixedBranchId;

  const branchesQuery = useQuery({
    queryKey: ["branches", organizationId],
    queryFn: () => branchesApi.list({ organizationId: organizationId ?? undefined, isActive: true }),
    enabled: Boolean(organizationId),
  });

  const classesQuery = useQuery({
    queryKey: ["classes", organizationId, selectedBranchId],
    queryFn: () =>
      classesApi.list({
        organizationId: organizationId ?? undefined,
        branchId: selectedBranchId ?? undefined,
        isActive: true,
      }),
    enabled: Boolean(organizationId && selectedBranchId),
  });

  const beltsQuery = useQuery({
    queryKey: ["belts-levels", organizationId],
    queryFn: () =>
      beltsApi.listLevels({
        organization_id: organizationId ?? undefined,
        is_active: true,
        include_stripes: true,
      }),
    enabled: Boolean(organizationId),
  });

  const studentsQuery = useQuery({
    queryKey: ["students", debouncedSearch],
    queryFn: () => studentsApi.list({ search: debouncedSearch.trim() || undefined }),
  });

  const students = useMemo(() => studentsQuery.data ?? [], [studentsQuery.data]);
  const branches = branchesQuery.data ?? [];
  const classes = classesQuery.data ?? [];
  const beltLevels = beltsQuery.data ?? [];
  const sidebarBranch = branches.find((branch) => branch.id === fixedBranchId) ?? branches[0] ?? null;
  const sidebarSummary = useMemo(
    () => ({
      organizationName: null,
      suffix: null,
      branchName: sidebarBranch?.name ?? null,
      location: sidebarBranch
        ? [sidebarBranch.city, sidebarBranch.state, sidebarBranch.country].filter(Boolean).join(", ") || sidebarBranch.address
        : null,
      mainSchedule: null,
    }),
    [sidebarBranch]
  );
  const currentPage = FORM_PAGES[currentFormPage];
  const isLastFormPage = currentFormPage === FORM_PAGES.length - 1;
  const hasActiveSearch = debouncedSearch.trim().length > 0;
  const foundStudentsLabel = students.length === 1 ? "1 alumno encontrado" : `${students.length} alumnos encontrados`;
  const studentsByBranchId = useMemo(
    () => new Map(branches.map((branch) => [branch.id, branch])),
    [branches],
  );
  const activeStudentsCount = useMemo(
    () => students.filter((student) => student.status === "active").length,
    [students],
  );
  const paymentAttentionCount = useMemo(
    () => students.filter((student) => student.payment_status === "late" || student.payment_status === "partial").length,
    [students],
  );
  const inactiveStudentsCount = useMemo(
    () => students.filter((student) => student.status !== "active").length,
    [students],
  );
  const incompleteProfilesCount = useMemo(
    () => students.filter((student) => student.profile_completeness && !student.profile_completeness.is_complete).length,
    [students],
  );
  const totalStudentsPages = Math.max(1, Math.ceil(students.length / STUDENTS_PER_PAGE));
  const currentStudentsPageStart = students.length === 0 ? 0 : (currentStudentsPage - 1) * STUDENTS_PER_PAGE + 1;
  const currentStudentsPageEnd = Math.min(currentStudentsPage * STUDENTS_PER_PAGE, students.length);
  const paginatedStudents = useMemo(
    () =>
      students.slice(
        (currentStudentsPage - 1) * STUDENTS_PER_PAGE,
        currentStudentsPage * STUDENTS_PER_PAGE,
      ),
    [currentStudentsPage, students],
  );

  const branchOptions = useMemo(
    () =>
      branches.map((branch) => ({
        label: `${branch.name} · ${branch.city}`,
        value: String(branch.id),
      })),
    [branches],
  );

  const classOptions = useMemo(
    () =>
      classes.map((classItem) => ({
        label: classItem.name,
        value: String(classItem.id),
      })),
    [classes],
  );

  const createStudentMutation = useMutation({
    mutationFn: studentsApi.create,
    onSuccess: async (student) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["students"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-students"] }),
      ]);
      setFeedbackTone("success");
      setFeedbackMessage(`Alumno creado correctamente. Código asignado: ${student.unique_code}.`);
      handleCloseFormDialog();
    },
    onError: (error) => {
      setModalError(getErrorMessage(error));
    },
  });

  const updateStudentMutation = useMutation({
    mutationFn: ({ studentId, payload }: { studentId: number; payload: StudentUpdatePayload }) =>
      studentsApi.update(studentId, payload),
    onSuccess: async (student) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["students"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-students"] }),
      ]);
      setFeedbackTone("success");
      setFeedbackMessage(`Alumno actualizado correctamente: ${student.first_name} ${student.last_name}.`);
      handleCloseFormDialog();
    },
    onError: (error) => {
      setModalError(getErrorMessage(error));
    },
  });

  const deleteStudentMutation = useMutation({
    mutationFn: (studentId: number) => studentsApi.remove(studentId),
    onSuccess: async (response) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["students"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-students"] }),
      ]);
      setFeedbackTone(getFeedbackTone(response.message));
      setFeedbackMessage(response.message);
      setStudentToDelete(null);
    },
    onError: (error) => {
      setFeedbackTone("danger");
      setFeedbackMessage(getErrorMessage(error));
    },
  });

  useEffect(() => {
    if (fixedBranchId) {
      setForm((current) => ({
        ...current,
        branchId: current.branchId || String(fixedBranchId),
      }));
    }
  }, [fixedBranchId]);

  useEffect(() => {
    if (route.params?.openCreate) {
      handleOpenCreate();
      navigation.setParams({ openCreate: undefined });
    }
  }, [navigation, route.params?.openCreate]);

  useEffect(() => {
    setCurrentStudentsPage(1);
  }, [debouncedSearch, students.length]);

  useEffect(() => {
    setCurrentStudentsPage((current) => Math.min(current, totalStudentsPages));
  }, [totalStudentsPages]);

  function handleCloseFormDialog() {
    setIsFormDialogVisible(false);
    setDialogMode("create");
    setDialogStep("form");
    setCurrentFormPage(0);
    setSelectedStudent(null);
    setModalError(null);
    setFormErrors({});
    setForm(createEmptyForm(fixedBranchId));
  }

  function handleOpenCreate() {
    setFeedbackMessage(null);
    setDialogMode("create");
    setDialogStep("form");
    setCurrentFormPage(0);
    setSelectedStudent(null);
    setModalError(null);
    setFormErrors({});
    setForm(createEmptyForm(fixedBranchId));
    setIsFormDialogVisible(true);
  }

  function handleOpenEdit(student: Student) {
    setFeedbackMessage(null);
    setDialogMode("edit");
    setDialogStep("form");
    setCurrentFormPage(0);
    setSelectedStudent(student);
    setModalError(null);
    setFormErrors({});
    setForm(toFormState(student));
    setIsFormDialogVisible(true);
  }

  function handleOpenContextActions(student: Student) {
    setContextSheetStudent(student);
    setShowContextSheet(true);
  }

  function handleOpenDetail(studentId: number) {
    setDetailStudentId(studentId);
    setIsDetailModalVisible(true);
  }

  function handleCloseDetail() {
    setIsDetailModalVisible(false);
    setDetailStudentId(null);
  }

  const contextActions = useMemo<BottomSheetAction[]>(
    () => {
      if (!contextSheetStudent) return [];
      return [
        {
          key: "medical",
          label: "Ver ficha médica",
          icon: "heart",
          tone: "danger",
          onPress: () => {
            setShowContextSheet(false);
            handleOpenMedicalCard(contextSheetStudent);
          },
        },
        {
          key: "view",
          label: "Ver detalle",
          icon: "eye",
          tone: "primary",
          onPress: () => {
            setShowContextSheet(false);
            handleOpenDetail(contextSheetStudent.id);
          },
        },
        {
          key: "edit",
          label: "Editar alumno",
          icon: "edit-3",
          onPress: () => handleOpenEdit(contextSheetStudent),
        },
        {
          key: "payment",
          label: "Registrar pago",
          icon: "dollar-sign",
          tone: "success",
          onPress: () => {
            setFeedbackMessage(
              `Funcionalidad de registro de pago para ${contextSheetStudent.first_name} ${contextSheetStudent.last_name} próximamente.`
            );
            setFeedbackTone("success");
          },
        },
        {
          key: "attendance",
          label: "Marcar asistencia",
          icon: "check-circle",
          tone: "warning",
          onPress: () => {
            setFeedbackMessage(
              `Asistencia marcada para ${contextSheetStudent.first_name}.`
            );
            setFeedbackTone("success");
          },
        },
        {
          key: "delete",
          label: "Eliminar alumno",
          icon: "trash-2",
          destructive: true,
          onPress: () => setStudentToDelete(contextSheetStudent),
        },
      ];
    },
    [contextSheetStudent, navigation],
  );

  function handleUpdateField<K extends keyof StudentFormState>(field: K, value: StudentFormState[K]) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
    setFormErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
    setModalError(null);
  }

  function handleUpdateNestedField<
    T extends "emergencyContact" | "medical" | "documents" | "authorizedPerson",
    K extends keyof StudentFormState[T],
  >(nested: T, field: K, value: StudentFormState[T][K]) {
    setForm((current) => ({
      ...current,
      [nested]: {
        ...current[nested],
        [field]: value,
      },
    }));
    setModalError(null);
  }

  function handleOpenMedicalCard(student: Student) {
    setMedicalQuickViewStudent(student);
    setIsMedicalQuickViewVisible(true);
  }

  function handleCloseMedicalCard() {
    setIsMedicalQuickViewVisible(false);
    setMedicalQuickViewStudent(null);
  }

  function handleAdvanceForm() {
    const validationErrors = validateStudentForm(form);
    const pageErrors = getPageErrors(validationErrors, currentPage.fields);

    if (Object.keys(pageErrors).length > 0) {
      setFormErrors((current) => ({
        ...current,
        ...pageErrors,
      }));
      return;
    }

    if (!isLastFormPage) {
      setCurrentFormPage((current) => current + 1);
      return;
    }

    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      return;
    }

    setFormErrors({});
    setDialogStep("confirm");
  }

  function handleGoToPreviousPage() {
    setCurrentFormPage((current) => Math.max(current - 1, 0));
  }

  function handleConfirmCreate() {
    if (!organizationId) {
      setModalError("No se encontró el alcance administrativo del usuario.");
      return;
    }

    createStudentMutation.mutate(buildStudentPayload(form, organizationId));
  }

  function handleConfirmUpdate() {
    if (!selectedStudent) {
      return;
    }

    updateStudentMutation.mutate({
      studentId: selectedStudent.id,
      payload: buildStudentUpdatePayload(form),
    });
  }

  function handleConfirmDelete() {
    if (!studentToDelete) {
      return;
    }

    deleteStudentMutation.mutate(studentToDelete.id);
  }

  if (!organizationId) {
    return (
      <Screen contentStyle={[styles.screenContent, { alignItems: "center" }]} nativeID="screens-admin-students-list-missing-scope-screen" testID="screens-admin-students-list-missing-scope-screen">
        <View nativeID="screens-admin-students-list-missing-scope-container" style={[styles.container, { maxWidth: contentMaxWidth }]} testID="screens-admin-students-list-missing-scope-container">
          <StatusView
            nativeID="screens-admin-students-list-missing-scope-status"
            title="No encontramos el alcance admin"
            description="El usuario autenticado no tiene una asignación válida para operar alumnos."
          />
        </View>
      </Screen>
    );
  }

  const selectedBranch = branches.find((branch) => String(branch.id) === form.branchId) ?? null;
  const selectedClass = classes.find((classItem) => String(classItem.id) === form.primaryClassId) ?? null;
  const studentsHeaderBottomContent = (
    <View nativeID="screens-admin-students-list-dashboard-header-block" style={styles.dashboardHeaderBlock} testID="screens-admin-students-list-dashboard-header-block">
      <View nativeID="screens-admin-students-list-dashboard-top" style={[styles.dashboardTop, isDesktop ? desktopStyles.dashboardTop : mobileStyles.dashboardTop]} testID="screens-admin-students-list-dashboard-top">
        <View nativeID="screens-admin-students-list-dashboard-copy" style={styles.dashboardCopy} testID="screens-admin-students-list-dashboard-copy">
          <Text nativeID="screens-admin-students-list-dashboard-kicker" style={styles.dashboardKicker} testID="screens-admin-students-list-dashboard-kicker">Dashboard compacto</Text>
          <Text nativeID="screens-admin-students-list-dashboard-title" style={styles.dashboardTitle} testID="screens-admin-students-list-dashboard-title">Busca alumnos por nombre</Text>
          <Text nativeID="screens-admin-students-list-dashboard-description" style={styles.dashboardDescription} testID="screens-admin-students-list-dashboard-description">
            Encuentra coincidencias al instante, revisa cuántos alumnos aparecen y entra al detalle desde una vista más ligera para web y móvil.
          </Text>
          <View nativeID="screens-admin-students-list-dashboard-links" style={styles.dashboardHeaderLinks} testID="screens-admin-students-list-dashboard-links">
            <Pressable
              accessibilityRole="link"
              nativeID="screens-admin-students-list-new-link"
              onPress={handleOpenCreate}
              style={(state) => {
                const hovered = (state as typeof state & { hovered?: boolean }).hovered;
                return [
                  styles.inlineLink,
                  hovered ? styles.inlineLinkHovered : null,
                  state.pressed ? styles.inlineLinkPressed : null,
                ];
              }}
              testID="screens-admin-students-list-new-link"
            >
              <Text nativeID="screens-admin-students-list-new-link-label" style={styles.inlineLinkLabel} testID="screens-admin-students-list-new-link-label">
                Agregar alumno
              </Text>
            </Pressable>
          </View>
        </View>

        {!studentsQuery.isLoading && !studentsQuery.isError ? (
          <View nativeID="screens-admin-students-list-dashboard-badge-wrap" style={styles.dashboardBadgeWrap} testID="screens-admin-students-list-dashboard-badge-wrap">
            <AppBadge
              label={foundStudentsLabel}
              nativeID="screens-admin-students-list-dashboard-found-badge"
              testID="screens-admin-students-list-dashboard-found-badge"
              tone="info"
            />
          </View>
        ) : null}
      </View>
    </View>
  );
  const studentsHeaderSearch = (
    <View nativeID="screens-admin-students-list-search-wrap" style={styles.searchWrap} testID="screens-admin-students-list-search-wrap">
      <View nativeID="screens-admin-students-list-metrics-grid" style={[styles.inlineMetricsGrid, isDesktop ? desktopStyles.inlineMetricsGrid : mobileStyles.inlineMetricsGrid]} testID="screens-admin-students-list-metrics-grid">
        <View nativeID="screens-admin-students-list-metric-found" style={styles.inlineMetricRow} testID="screens-admin-students-list-metric-found">
          <Text nativeID="screens-admin-students-list-metric-found-value" style={styles.inlineMetricValue} testID="screens-admin-students-list-metric-found-value">
            {students.length}
          </Text>
          <Text nativeID="screens-admin-students-list-metric-found-label" style={styles.inlineMetricLabel} testID="screens-admin-students-list-metric-found-label">
            alumnos en total
          </Text>
        </View>
        <View nativeID="screens-admin-students-list-metric-active" style={styles.inlineMetricRow} testID="screens-admin-students-list-metric-active">
          <Text nativeID="screens-admin-students-list-metric-active-value" style={styles.inlineMetricValue} testID="screens-admin-students-list-metric-active-value">
            {activeStudentsCount}
          </Text>
          <Text nativeID="screens-admin-students-list-metric-active-label" style={styles.inlineMetricLabel} testID="screens-admin-students-list-metric-active-label">
            alumnos activos
          </Text>
        </View>
        <View nativeID="screens-admin-students-list-metric-payment" style={styles.inlineMetricRow} testID="screens-admin-students-list-metric-payment">
          <Text nativeID="screens-admin-students-list-metric-payment-value" style={styles.inlineMetricValue} testID="screens-admin-students-list-metric-payment-value">
            {paymentAttentionCount}
          </Text>
          <Text nativeID="screens-admin-students-list-metric-payment-label" style={styles.inlineMetricLabel} testID="screens-admin-students-list-metric-payment-label">
            pagos vencidos
          </Text>
        </View>
        <View nativeID="screens-admin-students-list-metric-inactive" style={styles.inlineMetricRow} testID="screens-admin-students-list-metric-inactive">
          <Text nativeID="screens-admin-students-list-metric-inactive-value" style={styles.inlineMetricValue} testID="screens-admin-students-list-metric-inactive-value">
            {inactiveStudentsCount}
          </Text>
          <Text nativeID="screens-admin-students-list-metric-inactive-label" style={styles.inlineMetricLabel} testID="screens-admin-students-list-metric-inactive-label">
            alumnos no activos
          </Text>
        </View>
        <View nativeID="screens-admin-students-list-metric-incomplete" style={styles.inlineMetricRow} testID="screens-admin-students-list-metric-incomplete">
          <Text nativeID="screens-admin-students-list-metric-incomplete-value" style={[styles.inlineMetricValue, { color: colors.warning }]} testID="screens-admin-students-list-metric-incomplete-value">
            {incompleteProfilesCount}
          </Text>
          <Text nativeID="screens-admin-students-list-metric-incomplete-label" style={styles.inlineMetricLabel} testID="screens-admin-students-list-metric-incomplete-label">
            fichas incompletas
          </Text>
        </View>
      </View>
      <Text nativeID="screens-admin-students-list-results-title" style={styles.resultsTitleInline} testID="screens-admin-students-list-results-title">lista de alumnos</Text>
    </View>
  );
  const studentsHeaderMainContent = !studentsQuery.isLoading && !studentsQuery.isError ? (
    <View nativeID="screens-admin-students-list-header-main-content" style={styles.headerMainContent} testID="screens-admin-students-list-header-main-content">
      <View nativeID="screens-admin-students-list-search-row" style={[styles.searchRowCompact, isDesktop ? desktopStyles.searchRowCompact : mobileStyles.searchRowCompact]} testID="screens-admin-students-list-search-row">
        <View nativeID="screens-admin-students-list-search-input-wrap" style={styles.searchInputWrap} testID="screens-admin-students-list-search-input-wrap">
          <AppInput
            label="Buscar por nombre"
            nativeID="screens-admin-students-list-search-input"
            onChangeText={setSearch}
            placeholder="Ej. Juan Pérez"
            rightAdornment={<Feather color={colors.textMuted} name="search" size={16} />}
            style={styles.compactSearchInput}
            testID="screens-admin-students-list-search-input"
            value={search}
          />
        </View>
        {search.trim() ? (
          <AppButton
            label="Limpiar"
            nativeID="screens-admin-students-list-clear-search-button"
            onPress={() => setSearch("")}
            testID="screens-admin-students-list-clear-search-button"
            variant="secondary"
          />
        ) : null}
      </View>
      {students.length > 0 ? (
        <Text nativeID="screens-admin-students-list-results-meta" style={styles.resultsMetaCompact} testID="screens-admin-students-list-results-meta">
          mostrando {currentStudentsPageStart}-{currentStudentsPageEnd} de {students.length} alumnos en total
        </Text>
      ) : null}
      <AppCard nativeID="screens-admin-students-list-results-panel" style={styles.resultsPanel} testID="screens-admin-students-list-results-panel">
        {students.length > 0 ? (
          <View nativeID="screens-admin-students-list-table" style={styles.table} testID="screens-admin-students-list-table">
            {isDesktop ? (
              <View nativeID="screens-admin-students-list-table-head" style={styles.tableHead} testID="screens-admin-students-list-table-head">
                <Text nativeID="screens-admin-students-list-table-head-student" style={[styles.tableHeadCell, styles.studentColumn]} testID="screens-admin-students-list-table-head-student">Alumno</Text>
                <Text nativeID="screens-admin-students-list-table-head-branch" style={[styles.tableHeadCell, styles.branchColumn]} testID="screens-admin-students-list-table-head-branch">Sede</Text>
                <Text nativeID="screens-admin-students-list-table-head-payment" style={[styles.tableHeadCell, styles.paymentColumn]} testID="screens-admin-students-list-table-head-payment">Próximo pago</Text>
                <Text nativeID="screens-admin-students-list-table-head-fee" style={[styles.tableHeadCell, styles.feeColumn]} testID="screens-admin-students-list-table-head-fee">Mensualidad</Text>
                <Text nativeID="screens-admin-students-list-table-head-belt" style={[styles.tableHeadCell, styles.beltColumn]} testID="screens-admin-students-list-table-head-belt">Grado</Text>
                <Text nativeID="screens-admin-students-list-table-head-status" style={[styles.tableHeadCell, styles.statusColumn]} testID="screens-admin-students-list-table-head-status">Estado</Text>
                <Text nativeID="screens-admin-students-list-table-head-actions" style={[styles.tableHeadCell, styles.actionsColumn]} testID="screens-admin-students-list-table-head-actions">Acciones</Text>
              </View>
            ) : null}

            <ScrollView
              contentContainerStyle={styles.tableBody}
              nativeID="screens-admin-students-list-table-scroll"
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
              style={[styles.tableScroll, isDesktop ? desktopStyles.tableScroll : mobileStyles.tableScroll]}
              testID="screens-admin-students-list-table-scroll"
            >
              {paginatedStudents.map((item) => (
                <StudentListRow
                  key={item.id}
                  isDesktop={isDesktop}
                  onContext={() => handleOpenContextActions(item)}
                  onDelete={() => {
                    setFeedbackMessage(null);
                    setStudentToDelete(item);
                  }}
                  onEdit={() => handleOpenEdit(item)}
                  onOpenMedicalCard={() => handleOpenMedicalCard(item)}
                  onViewDetail={() => handleOpenDetail(item.id)}
                  student={item}
                  studentStatusLabel={getStudentStatusLabel(item.status)}
                  studentStatusTone={getStudentStatusTone(item.status)}
                  paymentLabel={formatPaymentStatus(item.payment_status)}
                  paymentTone={getPaymentTone(item.payment_status)}
                  branchName={studentsByBranchId.get(item.branch_id)?.name ?? "Sin sede"}
                />
              ))}
            </ScrollView>

            {totalStudentsPages > 1 ? (
              <View nativeID="screens-admin-students-list-pagination" style={[styles.pagination, isDesktop ? desktopStyles.pagination : mobileStyles.pagination]} testID="screens-admin-students-list-pagination">
                <AppButton
                  disabled={currentStudentsPage === 1}
                  label="Anterior"
                  nativeID="screens-admin-students-list-pagination-prev-button"
                  onPress={() => setCurrentStudentsPage((current) => Math.max(1, current - 1))}
                  testID="screens-admin-students-list-pagination-prev-button"
                  variant="secondary"
                />
                <Text nativeID="screens-admin-students-list-pagination-label" style={styles.paginationLabel} testID="screens-admin-students-list-pagination-label">
                  Página {currentStudentsPage} de {totalStudentsPages}
                </Text>
                <AppButton
                  disabled={currentStudentsPage === totalStudentsPages}
                  label="Siguiente"
                  nativeID="screens-admin-students-list-pagination-next-button"
                  onPress={() => setCurrentStudentsPage((current) => Math.min(totalStudentsPages, current + 1))}
                  testID="screens-admin-students-list-pagination-next-button"
                  variant="secondary"
                />
              </View>
            ) : null}
          </View>
        ) : (
          <View nativeID="screens-admin-students-list-empty-state" style={styles.emptyState} testID="screens-admin-students-list-empty-state">
            <Text nativeID="screens-admin-students-list-empty-title" style={styles.emptyTitle} testID="screens-admin-students-list-empty-title">No hay alumnos para mostrar</Text>
            <Text nativeID="screens-admin-students-list-empty-description" style={styles.emptyDescription} testID="screens-admin-students-list-empty-description">
              {hasActiveSearch
                ? "Prueba con otro nombre o limpia la búsqueda para ver más resultados."
                : "Aún no hay alumnos disponibles en esta organización o sucursal."}
            </Text>
          </View>
        )}
      </AppCard>
    </View>
  ) : null;

  return (
    <Screen scrollable contentStyle={styles.screenContent} nativeID="screens-admin-students-list-screen" testID="screens-admin-students-list-screen">
      <AdminShell
        activeSection="students"
        headerBottomContent={studentsHeaderBottomContent}
        headerMainContent={studentsHeaderMainContent}
        headerSearch={studentsHeaderSearch}
        onGoBranches={() => navigation.navigate("AdminHome", { section: "branches" })}
        onGoDashboard={() => navigation.navigate("AdminHome")}
        onGoDojo={() => navigation.navigate("AdminHome", { section: "dojo" })}
        onGoOperations={() => navigation.navigate("AdminHome", { section: "operations" })}
        onGoPayments={() => navigation.navigate("AdminHome", { section: "payments" })}
        onGoStudents={() => navigation.navigate("StudentsList")}
        onGoTrajectory={() => navigation.navigate("TrajectoryList")}
        sidebarSummary={sidebarSummary}
        subtitle="consulta y administra el estado del alumnado de tu Dojo"
        title="Panel de alumnos"
      >
        <View nativeID="screens-admin-students-list-content" style={styles.container} testID="screens-admin-students-list-content">

        {feedbackMessage ? (
          <AppCard
            nativeID="screens-admin-students-list-feedback-card"
            style={[styles.feedbackCard, feedbackTone === "success" ? styles.feedbackSuccess : styles.feedbackDanger]}
            testID="screens-admin-students-list-feedback-card"
          >
            <View nativeID="screens-admin-students-list-feedback-copy" style={styles.feedbackCopy} testID="screens-admin-students-list-feedback-copy">
              <Text nativeID="screens-admin-students-list-feedback-title" style={styles.feedbackTitle} testID="screens-admin-students-list-feedback-title">
                {feedbackTone === "success" ? "Acción completada" : "Necesita revisión"}
              </Text>
              <Text nativeID="screens-admin-students-list-feedback-description" style={styles.feedbackDescription} testID="screens-admin-students-list-feedback-description">{feedbackMessage}</Text>
            </View>
            <AppButton label="Cerrar aviso" nativeID="screens-admin-students-list-feedback-close-button" onPress={() => setFeedbackMessage(null)} testID="screens-admin-students-list-feedback-close-button" variant="secondary" />
          </AppCard>
        ) : null}

        {studentsQuery.isLoading ? (
          <AppCard nativeID="screens-admin-students-list-skeleton-card" style={styles.resultsPanel} testID="screens-admin-students-list-skeleton-card">
            <SkeletonList count={6} idPrefix="screens-admin-students-list-skeleton" />
          </AppCard>
        ) : studentsQuery.isError ? (
          <View nativeID="screens-admin-students-list-error-block" style={styles.errorBlock} testID="screens-admin-students-list-error-block">
            <StatusView
              nativeID="screens-admin-students-list-error-status"
              title="No pudimos cargar el listado"
              description={getErrorMessage(studentsQuery.error)}
            />
            <AppButton label="Reintentar" nativeID="screens-admin-students-list-retry-button" onPress={() => studentsQuery.refetch()} testID="screens-admin-students-list-retry-button" />
          </View>
        ) : null}
      </View>
      </AdminShell>

      <FloatingActionButton
        accessibilityLabel="Agregar nuevo alumno"
        onPress={handleOpenCreate}
        icon="user-plus"
        label="Agregar alumno"
        variant="extended"
      />

      <BottomSheet
        nativeID="screens-admin-students-list-context-sheet"
        title={contextSheetStudent ? `${contextSheetStudent.first_name} ${contextSheetStudent.last_name}` : "Acciones"}
        subtitle={contextSheetStudent?.unique_code ? `Código ${contextSheetStudent.unique_code}` : undefined}
        visible={showContextSheet}
        onClose={() => setShowContextSheet(false)}
        actions={contextActions}
      />

      <AppModal
        nativeID="screens-admin-students-list-form-modal"
        visible={isFormDialogVisible}
        title={dialogMode === "create" ? "Nuevo alumno" : "Editar alumno"}
        description={
          dialogStep === "form"
            ? `Paso ${currentFormPage + 1} de ${FORM_PAGES.length}. ${currentPage.description}`
            : dialogMode === "create"
              ? "Revisa el resumen y confirma si deseas agregar el alumno."
              : "Confirma si deseas guardar estos cambios en el alumno."
        }
        onClose={handleCloseFormDialog}
        testID="screens-admin-students-list-form-modal"
      >
        {dialogStep === "form" ? (
          <>
            {modalError ? <Text nativeID="screens-admin-students-list-modal-error" style={styles.modalError} testID="screens-admin-students-list-modal-error">{modalError}</Text> : null}
            <View nativeID="screens-admin-students-list-form-stepper" style={styles.formStepper} testID="screens-admin-students-list-form-stepper">
              <View nativeID="screens-admin-students-list-form-stepper-copy" style={styles.formStepperCopy} testID="screens-admin-students-list-form-stepper-copy">
                <Text nativeID="screens-admin-students-list-form-step-label" style={styles.formStepLabel} testID="screens-admin-students-list-form-step-label">Paso {currentFormPage + 1}</Text>
                <Text nativeID="screens-admin-students-list-form-step-title" style={styles.formStepTitle} testID="screens-admin-students-list-form-step-title">{currentPage.title}</Text>
              </View>
              <View nativeID="screens-admin-students-list-form-stepper-track" style={styles.formStepperTrack} testID="screens-admin-students-list-form-stepper-track">
                {FORM_PAGES.map((page, index) => (
                  <View
                    key={page.id}
                    nativeID={`screens-admin-students-list-form-step-dot-${page.id}`}
                    style={[
                      styles.formStepDot,
                      index === currentFormPage ? styles.formStepDotActive : null,
                      index < currentFormPage ? styles.formStepDotCompleted : null,
                    ]}
                    testID={`screens-admin-students-list-form-step-dot-${page.id}`}
                  />
                ))}
              </View>
            </View>

            {currentPage.id === "identity" ? (
              <>
                <View style={[styles.formGrid, isDesktop ? desktopStyles.formGrid : mobileStyles.formGrid]}>
                  <AppSelect
                    enabled={!fixedBranchId}
                    error={formErrors.branchId}
                    items={branchOptions}
                    label="Sucursal"
                    nativeID="screens-admin-students-list-form-branch-select"
                    onValueChange={(value) => handleUpdateField("branchId", value)}
                    placeholder={
                      branchesQuery.isLoading ? "Cargando sucursales..." : "Selecciona una sucursal"
                    }
                    testID="screens-admin-students-list-form-branch-select"
                    value={form.branchId}
                  />
                  <AppDateInput
                    error={formErrors.birthDate}
                    label="Fecha de nacimiento"
                    nativeID="screens-admin-students-list-form-birth-date-input"
                    onChangeText={(value) => handleUpdateField("birthDate", value)}
                    placeholder="2008-05-10"
                    testID="screens-admin-students-list-form-birth-date-input"
                    value={form.birthDate}
                  />
                </View>

                <View style={[styles.formGrid, isDesktop ? desktopStyles.formGrid : mobileStyles.formGrid]}>
                  <AppInput
                    error={formErrors.firstName}
                    label="Nombre"
                    nativeID="screens-admin-students-list-form-first-name-input"
                    onChangeText={(value) => handleUpdateField("firstName", value)}
                    placeholder="Juan"
                    testID="screens-admin-students-list-form-first-name-input"
                    value={form.firstName}
                  />
                  <AppInput
                    error={formErrors.lastName}
                    label="Apellido"
                    nativeID="screens-admin-students-list-form-last-name-input"
                    onChangeText={(value) => handleUpdateField("lastName", value)}
                    placeholder="Pérez"
                    testID="screens-admin-students-list-form-last-name-input"
                    value={form.lastName}
                  />
                </View>
              </>
            ) : null}

            {currentPage.id === "profile" ? (
              <>
                <View style={[styles.formGrid, isDesktop ? desktopStyles.formGrid : mobileStyles.formGrid]}>
                  <AppInput
                    error={formErrors.birthPlace}
                    label="Lugar de nacimiento"
                    nativeID="screens-admin-students-list-form-birth-place-input"
                    onChangeText={(value) => handleUpdateField("birthPlace", value)}
                    placeholder="Monterrey"
                    testID="screens-admin-students-list-form-birth-place-input"
                    value={form.birthPlace}
                  />
                  <AppDateInput
                    error={formErrors.enrollmentDate}
                    label="Fecha de inscripción"
                    nativeID="screens-admin-students-list-form-enrollment-date-input"
                    onChangeText={(value) => handleUpdateField("enrollmentDate", value)}
                    placeholder="2026-07-01"
                    testID="screens-admin-students-list-form-enrollment-date-input"
                    value={form.enrollmentDate}
                  />
                </View>

                <View style={[styles.formGrid, isDesktop ? desktopStyles.formGrid : mobileStyles.formGrid]}>
                  <AppInput
                    error={formErrors.heightCm}
                    keyboardType="numeric"
                    label="Altura (cm)"
                    nativeID="screens-admin-students-list-form-height-input"
                    onChangeText={(value) => handleUpdateField("heightCm", value)}
                    placeholder="168"
                    testID="screens-admin-students-list-form-height-input"
                    value={form.heightCm}
                  />
                  <AppSelect
                    items={classOptions}
                    label="Clase principal"
                    nativeID="screens-admin-students-list-form-primary-class-select"
                    onValueChange={(value) => handleUpdateField("primaryClassId", value)}
                    placeholder={
                      selectedBranchId
                        ? classesQuery.isLoading
                          ? "Cargando clases..."
                          : "Selecciona una clase"
                        : "Elige una sucursal primero"
                    }
                    testID="screens-admin-students-list-form-primary-class-select"
                    value={form.primaryClassId}
                  />
                </View>

                <View style={styles.formBeltBlock}>
                  <BeltSelector
                    enabled={Boolean(organizationId)}
                    label="Grado / Cinta actual"
                    levels={beltLevels}
                    onChange={(next) => handleUpdateField("belt", next)}
                    testID="screens-admin-students-list-form-belt"
                    value={form.belt}
                  />
                </View>
              </>
            ) : null}

            {currentPage.id === "billing" ? (
              <>
                <View style={[styles.formGrid, isDesktop ? desktopStyles.formGrid : mobileStyles.formGrid]}>
                  <AppSelect
                    items={STUDENT_STATUS_OPTIONS}
                    label="Estado del alumno"
                    nativeID="screens-admin-students-list-form-status-select"
                    onValueChange={(value) => handleUpdateField("status", value as StudentStatus)}
                    testID="screens-admin-students-list-form-status-select"
                    value={form.status}
                  />
                  <AppSelect
                    items={PAYMENT_STATUS_OPTIONS}
                    label="Estatus de pago"
                    nativeID="screens-admin-students-list-form-payment-status-select"
                    onValueChange={(value) => handleUpdateField("paymentStatus", value as PaymentStatus)}
                    testID="screens-admin-students-list-form-payment-status-select"
                    value={form.paymentStatus}
                  />
                </View>

                <View style={[styles.formGrid, isDesktop ? desktopStyles.formGrid : mobileStyles.formGrid]}>
                  <AppInput
                    error={formErrors.monthlyFee}
                    keyboardType="decimal-pad"
                    label="Mensualidad"
                    nativeID="screens-admin-students-list-form-monthly-fee-input"
                    onChangeText={(value) => handleUpdateField("monthlyFee", value)}
                    placeholder="1200.00"
                    testID="screens-admin-students-list-form-monthly-fee-input"
                    value={form.monthlyFee}
                  />
                  <AppInput
                    label="Moneda"
                    nativeID="screens-admin-students-list-form-currency-input"
                    onChangeText={(value) => handleUpdateField("currency", value.toUpperCase())}
                    placeholder="MXN"
                    testID="screens-admin-students-list-form-currency-input"
                    value={form.currency}
                  />
                </View>
              </>
            ) : null}

            {currentPage.id === "contact" ? (
              <>
                <View style={[styles.formGrid, isDesktop ? desktopStyles.formGrid : mobileStyles.formGrid]}>
                  <AppInput
                    autoCapitalize="none"
                    error={formErrors.phone}
                    keyboardType="phone-pad"
                    label="Teléfono del alumno"
                    nativeID="screens-admin-students-list-form-phone-input"
                    onChangeText={(value) => handleUpdateField("phone", value)}
                    placeholder="8112345678"
                    testID="screens-admin-students-list-form-phone-input"
                    value={form.phone}
                  />
                  <AppInput
                    autoCapitalize="none"
                    error={formErrors.email}
                    keyboardType="email-address"
                    label="Email del alumno"
                    nativeID="screens-admin-students-list-form-email-input"
                    onChangeText={(value) => handleUpdateField("email", value)}
                    placeholder="alumno@correo.com"
                    testID="screens-admin-students-list-form-email-input"
                    value={form.email}
                  />
                </View>

                <View style={[styles.formGrid, isDesktop ? desktopStyles.formGrid : mobileStyles.formGrid]}>
                  <AppDateInput
                    error={formErrors.nextPaymentDate}
                    label="Próximo pago"
                    nativeID="screens-admin-students-list-form-next-payment-date-input"
                    onChangeText={(value) => handleUpdateField("nextPaymentDate", value)}
                    placeholder="2026-08-01"
                    testID="screens-admin-students-list-form-next-payment-date-input"
                    value={form.nextPaymentDate}
                  />
                  <AppInput
                    label="Tutor o responsable"
                    nativeID="screens-admin-students-list-form-guardian-name-input"
                    onChangeText={(value) => handleUpdateField("guardianName", value)}
                    placeholder="María Pérez"
                    testID="screens-admin-students-list-form-guardian-name-input"
                    value={form.guardianName}
                  />
                </View>

                <View style={[styles.formGrid, isDesktop ? desktopStyles.formGrid : mobileStyles.formGrid]}>
                  <AppInput
                    label="Teléfono del tutor"
                    nativeID="screens-admin-students-list-form-guardian-phone-input"
                    onChangeText={(value) => handleUpdateField("guardianPhone", value)}
                    placeholder="8112345678"
                    testID="screens-admin-students-list-form-guardian-phone-input"
                    value={form.guardianPhone}
                  />
                </View>

                <AppCard nativeID="screens-admin-students-list-form-emergency-card" style={styles.formSubCard} testID="screens-admin-students-list-form-emergency-card">
                  <Text nativeID="screens-admin-students-list-form-emergency-title" style={styles.formSubCardTitle} testID="screens-admin-students-list-form-emergency-title">
                    Contacto de emergencia
                  </Text>
                  <Text nativeID="screens-admin-students-list-form-emergency-desc" style={styles.formSubCardDesc} testID="screens-admin-students-list-form-emergency-desc">
                    Persona a quien contactar en caso de incidente o urgencia médica.
                  </Text>
                  <View style={[styles.formGrid, isDesktop ? desktopStyles.formGrid : mobileStyles.formGrid]}>
                    <AppInput
                      label="Nombre completo"
                      nativeID="screens-admin-students-list-form-ec-fullname-input"
                      onChangeText={(value) => handleUpdateNestedField("emergencyContact", "fullName", value)}
                      placeholder="Nombre del contacto"
                      testID="screens-admin-students-list-form-ec-fullname-input"
                      value={form.emergencyContact.fullName}
                    />
                    <AppInput
                      label="Parentesco"
                      nativeID="screens-admin-students-list-form-ec-rel-input"
                      onChangeText={(value) => handleUpdateNestedField("emergencyContact", "relationship", value)}
                      placeholder="Madre, Padre, Hermano, Amigo..."
                      testID="screens-admin-students-list-form-ec-rel-input"
                      value={form.emergencyContact.relationship}
                    />
                  </View>
                  <View style={[styles.formGrid, isDesktop ? desktopStyles.formGrid : mobileStyles.formGrid]}>
                    <AppInput
                      keyboardType="phone-pad"
                      label="Teléfono principal"
                      nativeID="screens-admin-students-list-form-ec-phone-input"
                      onChangeText={(value) => handleUpdateNestedField("emergencyContact", "phone", value)}
                      placeholder="8112345678"
                      testID="screens-admin-students-list-form-ec-phone-input"
                      value={form.emergencyContact.phone}
                    />
                    <AppInput
                      keyboardType="phone-pad"
                      label="Teléfono secundario"
                      nativeID="screens-admin-students-list-form-ec-phone2-input"
                      onChangeText={(value) => handleUpdateNestedField("emergencyContact", "secondaryPhone", value)}
                      placeholder="Opcional"
                      testID="screens-admin-students-list-form-ec-phone2-input"
                      value={form.emergencyContact.secondaryPhone}
                    />
                  </View>
                  <View nativeID="screens-admin-students-list-form-notes-block" style={styles.notesBlock} testID="screens-admin-students-list-form-notes-block">
                    <AppInput
                      label="Notas generales"
                      multiline
                      nativeID="screens-admin-students-list-form-notes-input"
                      numberOfLines={4}
                      onChangeText={(value) => handleUpdateField("notes", value)}
                      placeholder="Observaciones relevantes para el dojo"
                      style={styles.notesInput}
                      testID="screens-admin-students-list-form-notes-input"
                      value={form.notes}
                    />
                  </View>
                </AppCard>
              </>
            ) : null}

            {currentPage.id === "medical" ? (
              <>
                <AppCard nativeID="screens-admin-students-list-form-medical-card" style={styles.formSubCard} testID="screens-admin-students-list-form-medical-card">
                  <Text nativeID="screens-admin-students-list-form-medical-title" style={styles.formSubCardTitle} testID="screens-admin-students-list-form-medical-title">
                    Ficha médica
                  </Text>
                  <Text nativeID="screens-admin-students-list-form-medical-desc" style={styles.formSubCardDesc} testID="screens-admin-students-list-form-medical-desc">
                    Información clínica esencial para proteger al alumno durante la práctica. Ningún campo es obligatorio.
                  </Text>
                  <View style={[styles.formGrid, isDesktop ? desktopStyles.formGrid : mobileStyles.formGrid]}>
                    <AppSelect
                      items={BLOOD_TYPE_OPTIONS}
                      label="Tipo de sangre"
                      nativeID="screens-admin-students-list-form-mr-blood-select"
                      onValueChange={(value) => handleUpdateNestedField("medical", "bloodType", value)}
                      placeholder="Selecciona el tipo"
                      testID="screens-admin-students-list-form-mr-blood-select"
                      value={form.medical.bloodType}
                    />
                    <AppSelect
                      items={INSURANCE_TYPE_OPTIONS}
                      label="Seguro médico"
                      nativeID="screens-admin-students-list-form-mr-insurance-select"
                      onValueChange={(value) => handleUpdateNestedField("medical", "insuranceType", value as "public" | "private" | "none")}
                      testID="screens-admin-students-list-form-mr-insurance-select"
                      value={form.medical.insuranceType}
                    />
                  </View>
                  {form.medical.insuranceType !== "none" ? (
                    <View style={[styles.formGrid, isDesktop ? desktopStyles.formGrid : mobileStyles.formGrid]}>
                      <AppInput
                        label="Proveedor / aseguradora"
                        nativeID="screens-admin-students-list-form-mr-ins-provider-input"
                        onChangeText={(value) => handleUpdateNestedField("medical", "insuranceProvider", value)}
                        placeholder="IMSS, ISSSTE, AXXA, GNP..."
                        testID="screens-admin-students-list-form-mr-ins-provider-input"
                        value={form.medical.insuranceProvider}
                      />
                      <AppInput
                        label="Número de póliza"
                        nativeID="screens-admin-students-list-form-mr-ins-policy-input"
                        onChangeText={(value) => handleUpdateNestedField("medical", "insurancePolicyNumber", value)}
                        placeholder="Número de afiliación"
                        testID="screens-admin-students-list-form-mr-ins-policy-input"
                        value={form.medical.insurancePolicyNumber}
                      />
                    </View>
                  ) : null}
                  <View style={[styles.formGrid, isDesktop ? desktopStyles.formGrid : mobileStyles.formGrid]}>
                    <View style={styles.formFieldSpan}>
                      <AppInput
                        label="Alergias conocidas"
                        multiline
                        nativeID="screens-admin-students-list-form-mr-allergies-input"
                        numberOfLines={3}
                        onChangeText={(value) => handleUpdateNestedField("medical", "allergies", value)}
                        placeholder="Medicamentos, alimentos, picaduras..."
                        style={styles.notesInput}
                        testID="screens-admin-students-list-form-mr-allergies-input"
                        value={form.medical.allergies}
                      />
                    </View>
                    <View style={styles.formFieldSpan}>
                      <AppInput
                        label="Lesiones o padecimientos previos"
                        multiline
                        nativeID="screens-admin-students-list-form-mr-injuries-input"
                        numberOfLines={3}
                        onChangeText={(value) => handleUpdateNestedField("medical", "previousInjuries", value)}
                        placeholder="Esguinces, fracturas, cirugías, asma, cardiopatías..."
                        style={styles.notesInput}
                        testID="screens-admin-students-list-form-mr-injuries-input"
                        value={form.medical.previousInjuries}
                      />
                    </View>
                  </View>
                  <View style={[styles.formGrid, isDesktop ? desktopStyles.formGrid : mobileStyles.formGrid]}>
                    <View style={styles.formFieldSpan}>
                      <AppInput
                        label="Padecimientos crónicos"
                        multiline
                        nativeID="screens-admin-students-list-form-mr-chronic-input"
                        numberOfLines={2}
                        onChangeText={(value) => handleUpdateNestedField("medical", "chronicConditions", value)}
                        placeholder="Hipertensión, diabetes, epilepsia..."
                        style={styles.notesInput}
                        testID="screens-admin-students-list-form-mr-chronic-input"
                        value={form.medical.chronicConditions}
                      />
                    </View>
                    <View style={styles.formFieldSpan}>
                      <AppInput
                        label="Medicamentos de uso diario"
                        multiline
                        nativeID="screens-admin-students-list-form-mr-meds-input"
                        numberOfLines={2}
                        onChangeText={(value) => handleUpdateNestedField("medical", "medications", value)}
                        placeholder="Dosis y horario si es relevante"
                        style={styles.notesInput}
                        testID="screens-admin-students-list-form-mr-meds-input"
                        value={form.medical.medications}
                      />
                    </View>
                  </View>
                  <View style={[styles.formGrid, isDesktop ? desktopStyles.formGrid : mobileStyles.formGrid]}>
                    <AppInput
                      label="Médico tratante"
                      nativeID="screens-admin-students-list-form-mr-physician-input"
                      onChangeText={(value) => handleUpdateNestedField("medical", "physicianName", value)}
                      placeholder="Nombre del doctor"
                      testID="screens-admin-students-list-form-mr-physician-input"
                      value={form.medical.physicianName}
                    />
                    <AppInput
                      keyboardType="phone-pad"
                      label="Teléfono del médico"
                      nativeID="screens-admin-students-list-form-mr-physician-phone-input"
                      onChangeText={(value) => handleUpdateNestedField("medical", "physicianPhone", value)}
                      placeholder="Contacto de urgencias"
                      testID="screens-admin-students-list-form-mr-physician-phone-input"
                      value={form.medical.physicianPhone}
                    />
                  </View>
                  <View style={styles.formFieldSpan}>
                    <AppInput
                      label="Notas médicas adicionales"
                      multiline
                      nativeID="screens-admin-students-list-form-mr-notes-input"
                      numberOfLines={2}
                      onChangeText={(value) => handleUpdateNestedField("medical", "additionalNotes", value)}
                      placeholder="Restricciones físicas, dispositivos médicos, instrucciones especiales..."
                      style={styles.notesInput}
                      testID="screens-admin-students-list-form-mr-notes-input"
                      value={form.medical.additionalNotes}
                    />
                  </View>
                </AppCard>
              </>
            ) : null}

            {currentPage.id === "documents" ? (
              <>
                <AppCard nativeID="screens-admin-students-list-form-waiver-card" style={styles.formSubCard} testID="screens-admin-students-list-form-waiver-card">
                  <Text nativeID="screens-admin-students-list-form-waiver-title" style={styles.formSubCardTitle} testID="screens-admin-students-list-form-waiver-title">
                    Waiver de responsabilidad firmado
                  </Text>
                  <Text nativeID="screens-admin-students-list-form-waiver-desc" style={styles.formSubCardDesc} testID="screens-admin-students-list-form-waiver-desc">
                    Documento de exención de responsabilidad por actividad física. Puedes pegar una URL del archivo o indicar "firmado en papel".
                  </Text>
                  <View style={[styles.formGrid, isDesktop ? desktopStyles.formGrid : mobileStyles.formGrid]}>
                    <View style={styles.formFieldSpan}>
                      <AppInput
                        autoCapitalize="none"
                        label="URL o referencia del archivo"
                        nativeID="screens-admin-students-list-form-waiver-url-input"
                        onChangeText={(value) => handleUpdateNestedField("documents", "waiverFileUrl", value)}
                        placeholder="https://drive.google.com/... o 'Firmado 15/07/26 en recepción'"
                        testID="screens-admin-students-list-form-waiver-url-input"
                        value={form.documents.waiverFileUrl}
                      />
                    </View>
                  </View>
                  <View style={[styles.formGrid, isDesktop ? desktopStyles.formGrid : mobileStyles.formGrid]}>
                    <AppDateInput
                      label="Fecha de firma"
                      nativeID="screens-admin-students-list-form-waiver-date-input"
                      onChangeText={(value) => handleUpdateNestedField("documents", "waiverSignedAt", value)}
                      placeholder="2026-07-15"
                      testID="screens-admin-students-list-form-waiver-date-input"
                      value={form.documents.waiverSignedAt}
                    />
                    <AppInput
                      label="Firmado por"
                      nativeID="screens-admin-students-list-form-waiver-signedby-input"
                      onChangeText={(value) => handleUpdateNestedField("documents", "waiverSignedBy", value)}
                      placeholder="Nombre completo del alumno o tutor"
                      testID="screens-admin-students-list-form-waiver-signedby-input"
                      value={form.documents.waiverSignedBy}
                    />
                  </View>
                </AppCard>

                <AppCard nativeID="screens-admin-students-list-form-photo-card" style={styles.formSubCard} testID="screens-admin-students-list-form-photo-card">
                  <Text nativeID="screens-admin-students-list-form-photo-title" style={styles.formSubCardTitle} testID="screens-admin-students-list-form-photo-title">
                    Consentimiento de uso de imagen
                  </Text>
                  <Text nativeID="screens-admin-students-list-form-photo-desc" style={styles.formSubCardDesc} testID="screens-admin-students-list-form-photo-desc">
                    Autorización para publicar fotos o videos en redes sociales, sitio web o material promocional del dojo.
                  </Text>
                  <ToggleRow
                    idPrefix="screens-admin-students-list-form-photo-consent-toggle"
                    label="Autoriza uso de imagen para redes"
                    value={form.documents.photoConsentGranted}
                    onValueChange={(next) => handleUpdateNestedField("documents", "photoConsentGranted", next)}
                  />
                  {form.documents.photoConsentGranted ? (
                    <View style={[styles.formGrid, isDesktop ? desktopStyles.formGrid : mobileStyles.formGrid]}>
                      <AppDateInput
                        label="Fecha de consentimiento"
                        nativeID="screens-admin-students-list-form-photo-date-input"
                        onChangeText={(value) => handleUpdateNestedField("documents", "photoConsentSignedAt", value)}
                        placeholder="2026-07-15"
                        testID="screens-admin-students-list-form-photo-date-input"
                        value={form.documents.photoConsentSignedAt}
                      />
                      <AppInput
                        label="Consentimiento firmado por"
                        nativeID="screens-admin-students-list-form-photo-signedby-input"
                        onChangeText={(value) => handleUpdateNestedField("documents", "photoConsentSignedBy", value)}
                        placeholder="Nombre del alumno o tutor legal"
                        testID="screens-admin-students-list-form-photo-signedby-input"
                        value={form.documents.photoConsentSignedBy}
                      />
                    </View>
                  ) : null}
                </AppCard>
              </>
            ) : null}

            {currentPage.id === "minors" ? (
              <>
                <AppCard nativeID="screens-admin-students-list-form-minors-card" style={styles.formSubCard} testID="screens-admin-students-list-form-minors-card">
                  <Text nativeID="screens-admin-students-list-form-minors-title" style={styles.formSubCardTitle} testID="screens-admin-students-list-form-minors-title">
                    Menores de edad
                  </Text>
                  <Text nativeID="screens-admin-students-list-form-minors-desc" style={styles.formSubCardDesc} testID="screens-admin-students-list-form-minors-desc">
                    Si el alumno es menor de edad, registra a las personas autorizadas para su retiro del dojo con DNI verificado.
                  </Text>
                  <ToggleRow
                    idPrefix="screens-admin-students-list-form-is-minor-toggle"
                    label="¿Es menor de edad?"
                    value={form.isMinor}
                    onValueChange={(next) => handleUpdateField("isMinor", next)}
                  />
                </AppCard>

                {form.isMinor ? (
                  <AppCard nativeID="screens-admin-students-list-form-authorized-card" style={styles.formSubCard} testID="screens-admin-students-list-form-authorized-card">
                    <Text nativeID="screens-admin-students-list-form-authorized-title" style={styles.formSubCardTitle} testID="screens-admin-students-list-form-authorized-title">
                      Persona autorizada para retiro
                    </Text>
                    <Text nativeID="screens-admin-students-list-form-authorized-desc" style={styles.formSubCardDesc} testID="screens-admin-students-list-form-authorized-desc">
                      Registra al menos una persona que pueda retirar al alumno. Verifica físicamente su documento de identidad antes de marcarlo como confirmado.
                    </Text>
                    <View style={[styles.formGrid, isDesktop ? desktopStyles.formGrid : mobileStyles.formGrid]}>
                      <AppInput
                        label="Nombre completo"
                        nativeID="screens-admin-students-list-form-ap-fullname-input"
                        onChangeText={(value) => handleUpdateNestedField("authorizedPerson", "fullName", value)}
                        placeholder="Nombre de la persona autorizada"
                        testID="screens-admin-students-list-form-ap-fullname-input"
                        value={form.authorizedPerson.fullName}
                      />
                      <AppInput
                        label="Parentesco / relación"
                        nativeID="screens-admin-students-list-form-ap-rel-input"
                        onChangeText={(value) => handleUpdateNestedField("authorizedPerson", "relationship", value)}
                        placeholder="Madre, Padre, Tío, Abuelo..."
                        testID="screens-admin-students-list-form-ap-rel-input"
                        value={form.authorizedPerson.relationship}
                      />
                    </View>
                    <View style={[styles.formGrid, isDesktop ? desktopStyles.formGrid : mobileStyles.formGrid]}>
                      <AppInput
                        label="Tipo de DNI"
                        nativeID="screens-admin-students-list-form-ap-dni-type-input"
                        onChangeText={(value) => handleUpdateNestedField("authorizedPerson", "dniType", value)}
                        placeholder="INE, Pasaporte, CURP, Cédula..."
                        testID="screens-admin-students-list-form-ap-dni-type-input"
                        value={form.authorizedPerson.dniType}
                      />
                      <AppInput
                        label="Número de DNI"
                        nativeID="screens-admin-students-list-form-ap-dni-number-input"
                        onChangeText={(value) => handleUpdateNestedField("authorizedPerson", "dniNumber", value)}
                        placeholder="Número del documento"
                        testID="screens-admin-students-list-form-ap-dni-number-input"
                        value={form.authorizedPerson.dniNumber}
                      />
                    </View>
                    <ToggleRow
                      idPrefix="screens-admin-students-list-form-ap-dni-verified-toggle"
                      label="DNI verificado físicamente en recepción"
                      value={form.authorizedPerson.dniVerified}
                      onValueChange={(next) => handleUpdateNestedField("authorizedPerson", "dniVerified", next)}
                    />
                    <View style={[styles.formGrid, isDesktop ? desktopStyles.formGrid : mobileStyles.formGrid]}>
                      <AppInput
                        keyboardType="phone-pad"
                        label="Teléfono"
                        nativeID="screens-admin-students-list-form-ap-phone-input"
                        onChangeText={(value) => handleUpdateNestedField("authorizedPerson", "phone", value)}
                        placeholder="Teléfono de contacto"
                        testID="screens-admin-students-list-form-ap-phone-input"
                        value={form.authorizedPerson.phone}
                      />
                      <AppInput
                        keyboardType="phone-pad"
                        label="Teléfono secundario"
                        nativeID="screens-admin-students-list-form-ap-phone2-input"
                        onChangeText={(value) => handleUpdateNestedField("authorizedPerson", "secondaryPhone", value)}
                        placeholder="Opcional"
                        testID="screens-admin-students-list-form-ap-phone2-input"
                        value={form.authorizedPerson.secondaryPhone}
                      />
                    </View>
                    <View style={styles.formFieldSpan}>
                      <AppInput
                        label="Notas / instrucciones de autorización"
                        multiline
                        nativeID="screens-admin-students-list-form-ap-notes-input"
                        numberOfLines={2}
                        onChangeText={(value) => handleUpdateNestedField("authorizedPerson", "authorizationNotes", value)}
                        placeholder="Horarios permitidos, solo retirar con credencial, etc."
                        style={styles.notesInput}
                        testID="screens-admin-students-list-form-ap-notes-input"
                        value={form.authorizedPerson.authorizationNotes}
                      />
                    </View>
                  </AppCard>
                ) : null}
              </>
            ) : null}

            <View style={[styles.modalActions, isDesktop ? desktopStyles.modalActions : mobileStyles.modalActions]}>
              <AppButton
                label={currentFormPage === 0 ? "Cancelar" : "Anterior"}
                nativeID="screens-admin-students-list-form-back-button"
                onPress={currentFormPage === 0 ? handleCloseFormDialog : handleGoToPreviousPage}
                testID="screens-admin-students-list-form-back-button"
                variant="secondary"
              />
              <AppButton
                label={
                  isLastFormPage
                    ? dialogMode === "create"
                      ? "Revisar alta"
                      : "Revisar cambios"
                    : "Siguiente"
                }
                nativeID="screens-admin-students-list-form-next-button"
                onPress={handleAdvanceForm}
                testID="screens-admin-students-list-form-next-button"
              />
            </View>
          </>
        ) : dialogMode === "create" ? (
          <>
            {modalError ? <Text nativeID="screens-admin-students-list-confirm-create-error" style={styles.modalError} testID="screens-admin-students-list-confirm-create-error">{modalError}</Text> : null}
            <AppCard nativeID="screens-admin-students-list-confirm-create-card" style={styles.confirmCard} testID="screens-admin-students-list-confirm-create-card">
              <Text nativeID="screens-admin-students-list-confirm-create-title" style={styles.confirmTitle} testID="screens-admin-students-list-confirm-create-title">Confirma el nuevo alumno</Text>
              <SummaryRow idPrefix="screens-admin-students-list-summary-branch" label="Sucursal" value={selectedBranch?.name ?? "Sin sucursal"} />
              <SummaryRow idPrefix="screens-admin-students-list-summary-full-name" label="Nombre completo" value={`${form.firstName} ${form.lastName}`.trim()} />
              <SummaryRow idPrefix="screens-admin-students-list-summary-birth" label="Nacimiento" value={`${form.birthDate} · ${form.birthPlace}`} />
              <SummaryRow idPrefix="screens-admin-students-list-summary-phone" label="Teléfono" value={form.phone || "Sin capturar"} />
              <SummaryRow idPrefix="screens-admin-students-list-summary-email" label="Email" value={form.email || "Sin capturar"} />
              <SummaryRow idPrefix="screens-admin-students-list-summary-minor" label="Menor de edad" value={form.isMinor ? "Sí" : "No"} />
              <SummaryRow idPrefix="screens-admin-students-list-summary-enrollment" label="Inscripción" value={form.enrollmentDate} />
              <SummaryRow idPrefix="screens-admin-students-list-summary-class" label="Clase principal" value={selectedClass?.name ?? "Sin clase"} />
              <SummaryRow idPrefix="screens-admin-students-list-summary-monthly-fee" label="Mensualidad" value={form.monthlyFee.trim() ? `${form.monthlyFee} ${form.currency}` : "Sin mensualidad"} />
              <SummaryRow idPrefix="screens-admin-students-list-summary-payment" label="Pago" value={getPaymentLabel(form.paymentStatus)} />
              <SummaryRow idPrefix="screens-admin-students-list-summary-status" label="Estado" value={getStudentStatusLabel(form.status)} />
              <SummaryRow idPrefix="screens-admin-students-list-summary-guardian" label="Tutor" value={form.guardianName || "Sin tutor"} />
              <SummaryRow idPrefix="screens-admin-students-list-summary-emergency" label="Contacto de emergencia" value={form.emergencyContact.fullName || "Sin capturar"} />
              <SummaryRow idPrefix="screens-admin-students-list-summary-blood" label="Tipo de sangre" value={form.medical.bloodType || "Sin capturar"} />
              <SummaryRow idPrefix="screens-admin-students-list-summary-insurance" label="Seguro médico" value={INSURANCE_TYPE_OPTIONS.find((i) => i.value === form.medical.insuranceType)?.label ?? "Sin seguro"} />
              <SummaryRow idPrefix="screens-admin-students-list-summary-waiver" label="Waiver firmado" value={form.documents.waiverFileUrl || form.documents.waiverSignedBy ? "Subido / firmado" : "Pendiente"} />
              <SummaryRow idPrefix="screens-admin-students-list-summary-photos" label="Uso de imagen" value={form.documents.photoConsentGranted ? "Autorizado" : "No autorizado"} />
              {form.isMinor ? (
                <SummaryRow idPrefix="screens-admin-students-list-summary-authorized" label="Persona autorizada" value={form.authorizedPerson.fullName || "Sin capturar"} />
              ) : null}
              <SummaryRow idPrefix="screens-admin-students-list-summary-notes" label="Notas" value={form.notes || "Sin notas"} />
            </AppCard>
            <View style={[styles.modalActions, isDesktop ? desktopStyles.modalActions : mobileStyles.modalActions]}>
              <AppButton label="Volver a editar" nativeID="screens-admin-students-list-confirm-create-back-button" onPress={() => setDialogStep("form")} testID="screens-admin-students-list-confirm-create-back-button" variant="secondary" />
              <AppButton
                label="Confirmar alta"
                loading={createStudentMutation.isPending}
                nativeID="screens-admin-students-list-confirm-create-button"
                onPress={handleConfirmCreate}
                testID="screens-admin-students-list-confirm-create-button"
              />
            </View>
          </>
        ) : (
          <>
            {modalError ? <Text nativeID="screens-admin-students-list-confirm-update-error" style={styles.modalError} testID="screens-admin-students-list-confirm-update-error">{modalError}</Text> : null}
            <AppCard nativeID="screens-admin-students-list-confirm-update-card" style={styles.confirmCard} testID="screens-admin-students-list-confirm-update-card">
              <Text nativeID="screens-admin-students-list-confirm-update-title" style={styles.confirmTitle} testID="screens-admin-students-list-confirm-update-title">¿Guardar cambios del alumno?</Text>
              <Text nativeID="screens-admin-students-list-confirm-update-text" style={styles.confirmText} testID="screens-admin-students-list-confirm-update-text">
                Confirma si deseas actualizar a {selectedStudent?.first_name} {selectedStudent?.last_name} con los datos capturados.
              </Text>
            </AppCard>
            <View style={[styles.modalActions, isDesktop ? desktopStyles.modalActions : mobileStyles.modalActions]}>
              <AppButton label="Volver a editar" nativeID="screens-admin-students-list-confirm-update-back-button" onPress={() => setDialogStep("form")} testID="screens-admin-students-list-confirm-update-back-button" variant="secondary" />
              <AppButton
                label="Sí, guardar cambios"
                loading={updateStudentMutation.isPending}
                nativeID="screens-admin-students-list-confirm-update-button"
                onPress={handleConfirmUpdate}
                testID="screens-admin-students-list-confirm-update-button"
              />
            </View>
          </>
        )}
      </AppModal>

      <AppModal
        nativeID="screens-admin-students-list-delete-modal"
        visible={Boolean(studentToDelete)}
        title="Confirmar baja"
        description="Esta acción hará una baja lógica y dejará al alumno como inactivo."
        onClose={() => setStudentToDelete(null)}
        testID="screens-admin-students-list-delete-modal"
      >
        <AppCard nativeID="screens-admin-students-list-delete-card" style={styles.confirmCard} testID="screens-admin-students-list-delete-card">
          <Text nativeID="screens-admin-students-list-delete-title" style={styles.confirmTitle} testID="screens-admin-students-list-delete-title">¿Estás seguro?</Text>
          <Text nativeID="screens-admin-students-list-delete-text" style={styles.confirmText} testID="screens-admin-students-list-delete-text">
            {studentToDelete
              ? `Vas a dar de baja a ${studentToDelete.first_name} ${studentToDelete.last_name}.`
              : "Selecciona un alumno para continuar."}
          </Text>
        </AppCard>
        <View style={[styles.modalActions, isDesktop ? desktopStyles.modalActions : mobileStyles.modalActions]}>
          <AppButton label="Cancelar" nativeID="screens-admin-students-list-cancel-delete-button" onPress={() => setStudentToDelete(null)} testID="screens-admin-students-list-cancel-delete-button" variant="secondary" />
          <AppButton
            label="Sí, dar de baja"
            loading={deleteStudentMutation.isPending}
            nativeID="screens-admin-students-list-confirm-delete-button"
            onPress={handleConfirmDelete}
            testID="screens-admin-students-list-confirm-delete-button"
            variant="danger"
          />
        </View>
      </AppModal>

      <AppModal
        nativeID="screens-admin-students-list-medical-quick-view-modal"
        title={
          medicalQuickViewStudent
            ? `Ficha médica · ${medicalQuickViewStudent.first_name} ${medicalQuickViewStudent.last_name}`
            : "Ficha médica"
        }
        description={
          medicalQuickViewStudent?.unique_code
            ? `Código ${medicalQuickViewStudent.unique_code} · Datos clínicos relevantes para proteger al alumno durante la práctica`
            : undefined
        }
        onClose={handleCloseMedicalCard}
        testID="screens-admin-students-list-medical-quick-view-modal"
        visible={isMedicalQuickViewVisible}
      >
        {medicalQuickViewStudent ? (
          <View style={styles.medicalQuickViewContainer}>
            {medicalQuickViewStudent.profile_completeness?.missing_fields?.length ? (
              <AppCard nativeID="screens-admin-students-list-medical-incomplete" style={[styles.formSubCard, styles.medicalIncompleteCard]} testID="screens-admin-students-list-medical-incomplete">
                <View style={styles.medicalIncompleteHeader}>
                  <Feather color={colors.warning} name="alert-circle" size={18} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.medicalIncompleteTitle}>Ficha médica incompleta</Text>
                    <Text style={styles.medicalIncompleteDesc}>
                      Faltan: {medicalQuickViewStudent.profile_completeness.missing_fields.join(", ")}.
                    </Text>
                  </View>
                </View>
              </AppCard>
            ) : null}

            <AppCard nativeID="screens-admin-students-list-medical-quick-vitals" style={styles.formSubCard} testID="screens-admin-students-list-medical-quick-vitals">
              <Text style={styles.formSubCardTitle}>Signos vitales y sangre</Text>
              <View style={[styles.medicalGrid]}>
                <QuickField
                  idPrefix="screens-admin-students-list-medical-blood"
                  icon="droplet"
                  label="Tipo de sangre"
                  tone="danger"
                  value={medicalQuickViewStudent.medical_record?.blood_type}
                />
                <QuickField
                  idPrefix="screens-admin-students-list-medical-tetanus"
                  icon="shield"
                  label="Vacuna antitetánica"
                  tone="info"
                  value={medicalQuickViewStudent.medical_record?.tetanus_vaccine_date ? formatDate(medicalQuickViewStudent.medical_record.tetanus_vaccine_date) : null}
                />
                <QuickField
                  idPrefix="screens-admin-students-list-medical-alt"
                  icon="activity"
                  label="Altura"
                  value={medicalQuickViewStudent.height_cm ? `${medicalQuickViewStudent.height_cm} cm` : null}
                />
                <QuickField
                  idPrefix="screens-admin-students-list-medical-birth"
                  icon="calendar"
                  label="Nacimiento"
                  value={formatDate(medicalQuickViewStudent.birth_date)}
                />
              </View>
            </AppCard>

            <AppCard nativeID="screens-admin-students-list-medical-quick-allergies" style={styles.formSubCard} testID="screens-admin-students-list-medical-quick-allergies">
              <Text style={styles.formSubCardTitle}>Alergias, lesiones y padecimientos</Text>
              <QuickField
                idPrefix="screens-admin-students-list-medical-quick-allergies-field"
                icon="alert-triangle"
                label="Alergias conocidas"
                tone="warning"
                value={medicalQuickViewStudent.medical_record?.allergies}
              />
              <QuickField
                idPrefix="screens-admin-students-list-medical-quick-injuries-field"
                icon="x-circle"
                label="Lesiones / cirugías previas"
                tone="danger"
                value={medicalQuickViewStudent.medical_record?.previous_injuries}
              />
              <QuickField
                idPrefix="screens-admin-students-list-medical-quick-chronic-field"
                icon="heart"
                label="Padecimientos crónicos"
                tone="warning"
                value={medicalQuickViewStudent.medical_record?.chronic_conditions}
              />
              <QuickField
                idPrefix="screens-admin-students-list-medical-quick-meds-field"
                icon="plus-circle"
                label="Medicamentos de uso diario"
                tone="info"
                value={medicalQuickViewStudent.medical_record?.medications}
              />
              <QuickField
                idPrefix="screens-admin-students-list-medical-quick-notes-field"
                icon="file-text"
                label="Notas adicionales"
                value={medicalQuickViewStudent.medical_record?.additional_notes}
              />
            </AppCard>

            <AppCard nativeID="screens-admin-students-list-medical-quick-insurance" style={styles.formSubCard} testID="screens-admin-students-list-medical-quick-insurance">
              <Text style={styles.formSubCardTitle}>Seguro médico y doctor de cabecera</Text>
              <View style={[styles.medicalGrid]}>
                <QuickField
                  idPrefix="screens-admin-students-list-medical-quick-ins-type"
                  icon="umbrella"
                  label="Tipo de seguro"
                  tone="success"
                  value={(() => {
                    const type = medicalQuickViewStudent.medical_record?.insurance_type;
                    if (!type || type === "none") return "Sin seguro";
                    return type === "public" ? "Seguro público" : "Seguro privado";
                  })()}
                />
                <QuickField
                  idPrefix="screens-admin-students-list-medical-quick-ins-provider"
                  icon="briefcase"
                  label="Aseguradora"
                  value={medicalQuickViewStudent.medical_record?.insurance_provider}
                />
                <QuickField
                  idPrefix="screens-admin-students-list-medical-quick-ins-policy"
                  icon="hash"
                  label="Número de póliza"
                  value={medicalQuickViewStudent.medical_record?.insurance_policy_number}
                />
                <QuickField
                  idPrefix="screens-admin-students-list-medical-quick-physician"
                  icon="user"
                  label="Médico tratante"
                  value={medicalQuickViewStudent.medical_record?.physician_name}
                />
              </View>
              <QuickField
                idPrefix="screens-admin-students-list-medical-quick-physician-phone"
                icon="phone"
                label="Teléfono del médico"
                tone="info"
                value={medicalQuickViewStudent.medical_record?.physician_phone}
              />
            </AppCard>

            <AppCard nativeID="screens-admin-students-list-medical-quick-emergency" style={styles.formSubCard} testID="screens-admin-students-list-medical-quick-emergency">
              <Text style={styles.formSubCardTitle}>Contacto de emergencia</Text>
              {medicalQuickViewStudent.emergency_contacts?.length ? (
                <>
                  <QuickField
                    idPrefix="screens-admin-students-list-medical-ec-name"
                    icon="user"
                    label="Nombre"
                    value={medicalQuickViewStudent.emergency_contacts[0].full_name}
                  />
                  <View style={[styles.medicalGrid]}>
                    <QuickField
                      idPrefix="screens-admin-students-list-medical-ec-rel"
                      icon="link"
                      label="Parentesco"
                      value={medicalQuickViewStudent.emergency_contacts[0].relationship}
                    />
                    <QuickField
                      idPrefix="screens-admin-students-list-medical-ec-phone"
                      icon="phone-call"
                      label="Teléfono"
                      tone="danger"
                      value={medicalQuickViewStudent.emergency_contacts[0].phone}
                    />
                  </View>
                  {medicalQuickViewStudent.emergency_contacts[0].secondary_phone ? (
                    <QuickField
                      idPrefix="screens-admin-students-list-medical-ec-phone2"
                      icon="phone"
                      label="Teléfono secundario"
                      value={medicalQuickViewStudent.emergency_contacts[0].secondary_phone}
                    />
                  ) : null}
                  {medicalQuickViewStudent.emergency_contacts[0].notes ? (
                    <QuickField
                      idPrefix="screens-admin-students-list-medical-ec-notes"
                      icon="message-square"
                      label="Notas de contacto"
                      value={medicalQuickViewStudent.emergency_contacts[0].notes}
                    />
                  ) : null}
                </>
              ) : (
                <Text style={[styles.quickFieldValue, { color: colors.textMuted }]}>
                  Sin contacto de emergencia capturado.
                </Text>
              )}
            </AppCard>

            <View style={styles.medicalQuickActions}>
              <AppButton
                label="Editar ficha completa"
                nativeID="screens-admin-students-list-medical-edit-button"
                onPress={() => {
                  handleCloseMedicalCard();
                  if (medicalQuickViewStudent) handleOpenEdit(medicalQuickViewStudent);
                }}
                testID="screens-admin-students-list-medical-edit-button"
                variant="secondary"
              />
              <AppButton
                label="Cerrar"
                nativeID="screens-admin-students-list-medical-close-button"
                onPress={handleCloseMedicalCard}
                testID="screens-admin-students-list-medical-close-button"
              />
            </View>
          </View>
        ) : (
          <StatusView title="Sin alumno seleccionado" description="Selecciona un alumno para ver su ficha médica." />
        )}
      </AppModal>

      <StudentDetailModal
        visible={isDetailModalVisible}
        studentId={detailStudentId}
        onClose={handleCloseDetail}
      />
    </Screen>
  );
}

function ToggleRow({
  idPrefix,
  label,
  value,
  onValueChange,
}: {
  idPrefix: string;
  label: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      nativeID={idPrefix}
      onPress={() => onValueChange(!value)}
      style={(state) => {
        const hovered = (state as typeof state & { hovered?: boolean }).hovered;
        return [
          styles.toggleRow,
          hovered ? styles.toggleRowHovered : null,
          state.pressed ? styles.toggleRowPressed : null,
        ];
      }}
      testID={idPrefix}
    >
      <Text nativeID={`${idPrefix}-label`} style={styles.toggleRowLabel} testID={`${idPrefix}-label`}>
        {label}
      </Text>
      <View
        nativeID={`${idPrefix}-track`}
        style={[styles.toggleTrack, value ? styles.toggleTrackOn : null]}
        testID={`${idPrefix}-track`}
      >
        <View
          nativeID={`${idPrefix}-thumb`}
          style={[styles.toggleThumb, value ? styles.toggleThumbOn : null]}
          testID={`${idPrefix}-thumb`}
        />
      </View>
    </Pressable>
  );
}

function QuickField({
  idPrefix,
  icon,
  label,
  value,
  tone = "neutral",
}: {
  idPrefix: string;
  icon?: keyof typeof Feather.glyphMap;
  label: string;
  value?: string | null;
  tone?: "neutral" | "danger" | "warning" | "success" | "info";
}) {
  const hasValue = Boolean(value && value.trim().length > 0);
  const displayValue = hasValue ? value : "Sin capturar";
  const valueColor = hasValue
    ? tone === "danger"
      ? colors.danger
      : tone === "warning"
        ? colors.warning
        : tone === "success"
          ? colors.success
          : tone === "info"
            ? colors.info
            : colors.text
    : colors.textMuted;

  return (
    <View nativeID={idPrefix} style={styles.quickFieldWrap} testID={idPrefix}>
      <View style={styles.quickFieldHeader}>
        {icon ? (
          <View
            nativeID={`${idPrefix}-icon-wrap`}
            style={[
              styles.quickFieldIconWrap,
              tone === "danger"
                ? styles.quickFieldIconDanger
                : tone === "warning"
                  ? styles.quickFieldIconWarning
                  : tone === "success"
                    ? styles.quickFieldIconSuccess
                    : null,
            ]}
            testID={`${idPrefix}-icon-wrap`}
          >
            <Feather
              color={
                tone === "danger"
                  ? colors.danger
                  : tone === "warning"
                    ? colors.warning
                    : tone === "success"
                      ? colors.success
                      : colors.textMuted
              }
              name={icon}
              size={14}
            />
          </View>
        ) : null}
        <Text nativeID={`${idPrefix}-label`} style={styles.quickFieldLabel} testID={`${idPrefix}-label`}>
          {label}
        </Text>
      </View>
      <Text
        nativeID={`${idPrefix}-value`}
        style={[styles.quickFieldValue, { color: valueColor }]}
        testID={`${idPrefix}-value`}
      >
        {displayValue}
      </Text>
    </View>
  );
}

function SummaryRow({ label, value, idPrefix }: { label: string; value: string; idPrefix?: string }) {
  const baseId = idPrefix ?? `screens-admin-students-list-summary-row-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <View nativeID={baseId} style={styles.summaryRow} testID={baseId}>
      <Text nativeID={`${baseId}-label`} style={styles.summaryRowLabel} testID={`${baseId}-label`}>{label}</Text>
      <Text nativeID={`${baseId}-value`} style={styles.summaryRowValue} testID={`${baseId}-value`}>{value}</Text>
    </View>
  );
}

function DashboardMetricCard({
  title,
  value,
  description,
  icon,
  tone,
  idPrefix,
}: {
  title: string;
  value: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  tone: "info" | "success" | "warning" | "neutral";
  idPrefix: string;
}) {
  return (
    <View
      nativeID={idPrefix}
      style={[
        styles.metricCard,
        tone === "info"
          ? styles.metricCardInfo
          : tone === "success"
            ? styles.metricCardSuccess
            : tone === "warning"
              ? styles.metricCardWarning
              : styles.metricCardNeutral,
      ]}
      testID={idPrefix}
    >
      <View nativeID={`${idPrefix}-icon-wrap`} style={styles.metricIconWrap} testID={`${idPrefix}-icon-wrap`}>
        <Feather color={colors.text} name={icon} size={16} />
      </View>
      <View nativeID={`${idPrefix}-copy`} style={styles.metricCopy} testID={`${idPrefix}-copy`}>
        <Text nativeID={`${idPrefix}-title`} style={styles.metricTitle} testID={`${idPrefix}-title`}>{title}</Text>
        <Text nativeID={`${idPrefix}-value`} style={styles.metricValue} testID={`${idPrefix}-value`}>{value}</Text>
        <Text nativeID={`${idPrefix}-description`} style={styles.metricDescription} testID={`${idPrefix}-description`}>{description}</Text>
      </View>
    </View>
  );
}

function StudentListRow({
  student,
  branchName,
  paymentLabel,
  paymentTone,
  studentStatusLabel,
  studentStatusTone,
  isDesktop,
  onViewDetail,
  onEdit,
  onDelete,
  onContext,
  onOpenMedicalCard,
}: {
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
}) {
  const isProfileIncomplete = Boolean(student.profile_completeness && !student.profile_completeness.is_complete);

  if (isDesktop) {
    return (
      <View nativeID={`screens-admin-students-list-row-${student.id}`} style={styles.tableRow} testID={`screens-admin-students-list-row-${student.id}`}>
        <View nativeID={`screens-admin-students-list-row-student-${student.id}`} style={[styles.tableCell, styles.studentColumn]} testID={`screens-admin-students-list-row-student-${student.id}`}>
          <Text nativeID={`screens-admin-students-list-row-name-${student.id}`} style={styles.tableStudentName} testID={`screens-admin-students-list-row-name-${student.id}`}>
            {student.first_name} {student.last_name}
          </Text>
          <View style={[styles.tableBadgesText, { marginTop: 2 }]}>
            <Text nativeID={`screens-admin-students-list-row-code-${student.id}`} style={styles.tableStudentMeta} testID={`screens-admin-students-list-row-code-${student.id}`}>
              Código {student.unique_code}
            </Text>
            {isProfileIncomplete ? (
              <View
                nativeID={`screens-admin-students-list-row-incomplete-badge-${student.id}`}
                style={styles.inlineWarningBadge}
                testID={`screens-admin-students-list-row-incomplete-badge-${student.id}`}
              >
                <Feather color={colors.warning} name="alert-circle" size={12} />
                <Text style={styles.inlineWarningBadgeText}>Ficha incompleta</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View nativeID={`screens-admin-students-list-row-branch-${student.id}`} style={[styles.tableCell, styles.branchColumn]} testID={`screens-admin-students-list-row-branch-${student.id}`}>
          <Text nativeID={`screens-admin-students-list-row-branch-value-${student.id}`} style={styles.tableCellValue} testID={`screens-admin-students-list-row-branch-value-${student.id}`}>{branchName}</Text>
        </View>

        <View nativeID={`screens-admin-students-list-row-payment-date-${student.id}`} style={[styles.tableCell, styles.paymentColumn]} testID={`screens-admin-students-list-row-payment-date-${student.id}`}>
          <Text nativeID={`screens-admin-students-list-row-payment-date-value-${student.id}`} style={styles.tableCellValue} testID={`screens-admin-students-list-row-payment-date-value-${student.id}`}>
            {formatDate(student.next_payment_date)}
          </Text>
        </View>

        <View nativeID={`screens-admin-students-list-row-fee-${student.id}`} style={[styles.tableCell, styles.feeColumn]} testID={`screens-admin-students-list-row-fee-${student.id}`}>
          <Text nativeID={`screens-admin-students-list-row-fee-value-${student.id}`} style={styles.tableCellValue} testID={`screens-admin-students-list-row-fee-value-${student.id}`}>{formatStudentFee(student)}</Text>
        </View>

        <View nativeID={`screens-admin-students-list-row-belt-${student.id}`} style={[styles.tableCell, styles.beltColumn]} testID={`screens-admin-students-list-row-belt-${student.id}`}>
          <BeltIndicator
            beltLevel={student.current_belt_level}
            size="xs"
            stripe={student.current_stripe}
            testID={`screens-admin-students-list-row-belt-value-${student.id}`}
          />
        </View>

        <View nativeID={`screens-admin-students-list-row-status-${student.id}`} style={[styles.tableCell, styles.statusColumn]} testID={`screens-admin-students-list-row-status-${student.id}`}>
          <View nativeID={`screens-admin-students-list-row-badges-${student.id}`} style={styles.tableBadgesText} testID={`screens-admin-students-list-row-badges-${student.id}`}>
            <Text nativeID={`screens-admin-students-list-row-status-badge-${student.id}`} style={styles.tableBadgeText} testID={`screens-admin-students-list-row-status-badge-${student.id}`}>
              {studentStatusLabel}
            </Text>
            <Text nativeID={`screens-admin-students-list-row-payment-badge-${student.id}`} style={styles.tableBadgeText} testID={`screens-admin-students-list-row-payment-badge-${student.id}`}>
              {paymentLabel}
            </Text>
          </View>
        </View>

        <View nativeID={`screens-admin-students-list-row-actions-${student.id}`} style={[styles.tableCell, styles.actionsColumn, styles.tableActions]} testID={`screens-admin-students-list-row-actions-${student.id}`}>
          {onOpenMedicalCard ? (
            <Pressable
              accessibilityLabel="Ver ficha médica del alumno"
              accessibilityRole="link"
              nativeID={`screens-admin-students-list-medical-button-${student.id}`}
              onPress={onOpenMedicalCard}
              style={(state) => {
                const hovered = (state as typeof state & { hovered?: boolean }).hovered;
                return [
                  styles.rowHyperlink,
                  hovered ? styles.rowHyperlinkHovered : null,
                  state.pressed ? styles.rowHyperlinkPressed : null,
                ];
              }}
              testID={`screens-admin-students-list-medical-button-${student.id}`}
            >
              <View style={styles.rowIconHyperlink}>
                <Feather color={colors.danger} name="heart" size={14} />
                <Text nativeID={`screens-admin-students-list-medical-button-${student.id}-label`} style={[styles.rowHyperlinkLabel, { color: colors.danger }]} testID={`screens-admin-students-list-medical-button-${student.id}-label`}>
                  Ficha médica
                </Text>
              </View>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityLabel="Ver detalle del alumno"
            accessibilityRole="link"
            nativeID={`screens-admin-students-list-detail-button-${student.id}`}
            onPress={onViewDetail}
            style={(state) => {
              const hovered = (state as typeof state & { hovered?: boolean }).hovered;
              return [
                styles.rowHyperlink,
                hovered ? styles.rowHyperlinkHovered : null,
                state.pressed ? styles.rowHyperlinkPressed : null,
              ];
            }}
            testID={`screens-admin-students-list-detail-button-${student.id}`}
          >
            <Text nativeID={`screens-admin-students-list-detail-button-${student.id}-label`} style={styles.rowHyperlinkLabel} testID={`screens-admin-students-list-detail-button-${student.id}-label`}>
              Ver detalle
            </Text>
          </Pressable>
          <Text nativeID={`screens-admin-students-list-edit-button-${student.id}`} style={styles.rowEditText} testID={`screens-admin-students-list-edit-button-${student.id}`}>
            Editar
          </Text>
          <Pressable
            accessibilityLabel="Dar de baja al alumno"
            accessibilityRole="link"
            nativeID={`screens-admin-students-list-delete-button-${student.id}`}
            onPress={onDelete}
            style={(state) => {
              const hovered = (state as typeof state & { hovered?: boolean }).hovered;
              return [
                styles.rowHyperlink,
                styles.rowHyperlinkDanger,
                hovered ? styles.rowHyperlinkHoveredDanger : null,
                state.pressed ? styles.rowHyperlinkPressed : null,
              ];
            }}
            testID={`screens-admin-students-list-delete-button-${student.id}`}
          >
            <Text nativeID={`screens-admin-students-list-delete-button-${student.id}-label`} style={[styles.rowHyperlinkLabel, styles.rowHyperlinkLabelDanger]} testID={`screens-admin-students-list-delete-button-${student.id}-label`}>
              Dar de baja
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View nativeID={`screens-admin-students-list-row-mobile-${student.id}`} style={styles.mobileRow} testID={`screens-admin-students-list-row-mobile-${student.id}`}>
      {isProfileIncomplete ? (
        <View style={styles.mobileIncompleteWrap}>
          <View
            nativeID={`screens-admin-students-list-row-mobile-incomplete-${student.id}`}
            style={styles.inlineWarningBadge}
            testID={`screens-admin-students-list-row-mobile-incomplete-${student.id}`}
          >
            <Feather color={colors.warning} name="alert-circle" size={12} />
            <Text style={styles.inlineWarningBadgeText}>Ficha incompleta</Text>
          </View>
        </View>
      ) : null}
      <View nativeID={`screens-admin-students-list-row-mobile-top-${student.id}`} style={styles.mobileRowTop} testID={`screens-admin-students-list-row-mobile-top-${student.id}`}>
        <View nativeID={`screens-admin-students-list-row-mobile-copy-${student.id}`} style={styles.mobileRowCopy} testID={`screens-admin-students-list-row-mobile-copy-${student.id}`}>
          <Text nativeID={`screens-admin-students-list-row-mobile-name-${student.id}`} style={styles.tableStudentName} testID={`screens-admin-students-list-row-mobile-name-${student.id}`}>
            {student.first_name} {student.last_name}
          </Text>
          <Text nativeID={`screens-admin-students-list-row-mobile-code-${student.id}`} style={styles.tableStudentMeta} testID={`screens-admin-students-list-row-mobile-code-${student.id}`}>
            Código {student.unique_code} · {branchName}
          </Text>
        </View>
        <View nativeID={`screens-admin-students-list-row-mobile-badges-${student.id}`} style={styles.mobileRowBadges} testID={`screens-admin-students-list-row-mobile-badges-${student.id}`}>
          <Text nativeID={`screens-admin-students-list-row-mobile-status-badge-${student.id}`} style={styles.tableBadgeText} testID={`screens-admin-students-list-row-mobile-status-badge-${student.id}`}>
            {studentStatusLabel}
          </Text>
          <Text nativeID={`screens-admin-students-list-row-mobile-payment-badge-${student.id}`} style={styles.tableBadgeText} testID={`screens-admin-students-list-row-mobile-payment-badge-${student.id}`}>
            {paymentLabel}
          </Text>
        </View>
      </View>

      <View nativeID={`screens-admin-students-list-row-mobile-belt-${student.id}`} style={styles.mobileBeltRow} testID={`screens-admin-students-list-row-mobile-belt-${student.id}`}>
        <BeltIndicator
          beltLevel={student.current_belt_level}
          size="sm"
          stripe={student.current_stripe}
          testID={`screens-admin-students-list-row-mobile-belt-value-${student.id}`}
        />
      </View>

      <View nativeID={`screens-admin-students-list-row-mobile-meta-${student.id}`} style={styles.mobileMetaGrid} testID={`screens-admin-students-list-row-mobile-meta-${student.id}`}>
        <MobileMetaItem idPrefix={`screens-admin-students-list-row-mobile-payment-date-${student.id}`} label="Próximo pago" value={formatDate(student.next_payment_date)} />
        <MobileMetaItem idPrefix={`screens-admin-students-list-row-mobile-fee-${student.id}`} label="Mensualidad" value={formatStudentFee(student)} />
        <MobileMetaItem idPrefix={`screens-admin-students-list-row-mobile-enrollment-${student.id}`} label="Alta" value={formatDate(student.enrollment_date)} />
      </View>

      <View nativeID={`screens-admin-students-list-row-mobile-actions-${student.id}`} style={styles.mobileRowActions} testID={`screens-admin-students-list-row-mobile-actions-${student.id}`}>
        {onOpenMedicalCard ? (
          <Pressable
            accessibilityLabel="Ver ficha médica"
            accessibilityRole="link"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            nativeID={`screens-admin-students-list-medical-link-${student.id}`}
            onPress={onOpenMedicalCard}
            style={(state) => {
              const hovered = (state as typeof state & { hovered?: boolean }).hovered;
              return [
                styles.mobileActionLink,
                hovered ? styles.mobileActionLinkHovered : null,
                state.pressed ? styles.mobileActionLinkPressed : null,
              ];
            }}
            testID={`screens-admin-students-list-medical-link-${student.id}`}
          >
            <View style={styles.rowIconHyperlink}>
              <Feather color={colors.danger} name="heart" size={14} />
              <Text nativeID={`screens-admin-students-list-medical-link-label-${student.id}`} style={[styles.mobileActionLinkLabel, { color: colors.danger }]} testID={`screens-admin-students-list-medical-link-label-${student.id}`}>
                Médica
              </Text>
            </View>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityLabel="Ver detalle del alumno"
          accessibilityRole="link"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          nativeID={`screens-admin-students-list-detail-link-${student.id}`}
          onPress={onViewDetail}
          style={(state) => {
            const hovered = (state as typeof state & { hovered?: boolean }).hovered;
            return [
              styles.mobileActionLink,
              hovered ? styles.mobileActionLinkHovered : null,
              state.pressed ? styles.mobileActionLinkPressed : null,
            ];
          }}
          testID={`screens-admin-students-list-detail-link-${student.id}`}
        >
          <Text nativeID={`screens-admin-students-list-detail-link-label-${student.id}`} style={styles.mobileActionLinkLabel} testID={`screens-admin-students-list-detail-link-label-${student.id}`}>
            Ver detalle
          </Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Editar alumno"
          accessibilityRole="link"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          nativeID={`screens-admin-students-list-edit-link-${student.id}`}
          onPress={onEdit}
          style={(state) => {
            const hovered = (state as typeof state & { hovered?: boolean }).hovered;
            return [
              styles.mobileActionLink,
              hovered ? styles.mobileActionLinkHovered : null,
              state.pressed ? styles.mobileActionLinkPressed : null,
            ];
          }}
          testID={`screens-admin-students-list-edit-link-${student.id}`}
        >
          <Text nativeID={`screens-admin-students-list-edit-link-label-${student.id}`} style={styles.mobileActionLinkLabel} testID={`screens-admin-students-list-edit-link-label-${student.id}`}>
            Editar
          </Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Más acciones"
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          nativeID={`screens-admin-students-list-context-button-${student.id}`}
          onPress={onContext}
          style={(state) => {
            const hovered = (state as typeof state & { hovered?: boolean }).hovered;
            return [
              styles.mobileContextButton,
              hovered ? styles.mobileContextButtonHovered : null,
              state.pressed ? styles.mobileContextButtonPressed : null,
            ];
          }}
          testID={`screens-admin-students-list-context-button-${student.id}`}
        >
          <Feather color={colors.primary} name="more-horizontal" size={20} />
        </Pressable>
      </View>
    </View>
  );
}

function MobileMetaItem({ idPrefix, label, value }: { idPrefix: string; label: string; value: string }) {
  return (
    <View nativeID={idPrefix} style={styles.mobileMetaItem} testID={idPrefix}>
      <Text nativeID={`${idPrefix}-label`} style={styles.mobileMetaLabel} testID={`${idPrefix}-label`}>{label}</Text>
      <Text nativeID={`${idPrefix}-value`} style={styles.mobileMetaValue} testID={`${idPrefix}-value`}>{value}</Text>
    </View>
  );
}

function StudentRowActionButton({
  nativeID,
  label,
  onPress,
  tone = "neutral",
}: {
  nativeID: string;
  label: string;
  onPress: () => void;
  tone?: "neutral" | "danger";
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      nativeID={nativeID}
      onPress={onPress}
      style={({ pressed }) => [
        styles.compactActionButton,
        tone === "danger" ? styles.compactActionButtonDanger : null,
        pressed ? styles.compactActionButtonPressed : null,
      ]}
      testID={nativeID}
    >
      <Text
        nativeID={`${nativeID}-label`}
        style={[styles.compactActionLabel, tone === "danger" ? styles.compactActionLabelDanger : null]}
        testID={`${nativeID}-label`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    width: "100%",
  },
  container: {
    gap: spacing.lg,
    width: "100%",
  },
  feedbackCard: {
    alignItems: "center",
    borderRadius: 24,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  feedbackSuccess: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
  },
  feedbackDanger: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
  },
  feedbackCopy: {
    flex: 1,
    gap: 4,
  },
  feedbackTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 16,
    fontWeight: "700",
  },
  feedbackDescription: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 20,
  },
  dashboardHeaderBlock: {
    width: "100%",
  },
  dashboardCard: {
    gap: spacing.md,
    padding: spacing.md,
  },
  dashboardTop: {
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  dashboardCopy: {
    flex: 1,
    gap: 6,
  },
  dashboardKicker: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  dashboardTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 24,
    fontWeight: "800",
  },
  dashboardDescription: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 20,
  },
  dashboardBadgeWrap: {
    alignItems: "flex-start",
  },
  dashboardHeaderLinks: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  inlineLink: {
    alignSelf: "flex-start",
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 6,
  },
  inlineLinkHovered: {
    backgroundColor: colors.actionSoft ?? colors.primarySoft,
    opacity: 1,
  },
  inlineLinkPressed: {
    opacity: 0.84,
  },
  inlineLinkLabel: {
    color: colors.action,
    fontFamily: typography.headingFamily,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  inlineLinkLabelHovered: {
    textDecorationLine: "underline",
  },
  searchRow: {
    gap: spacing.sm,
  },
  searchWrap: {
    gap: spacing.md,
  },
  searchInputWrap: {
    flex: 1,
  },
  headerMainContent: {
    gap: spacing.md,
  },
  inlineMetricsGrid: {
    gap: spacing.sm,
  },
  inlineMetricRow: {
    alignItems: "baseline",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  inlineMetricValue: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 20,
    fontWeight: "800",
  },
  inlineMetricLabel: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  metricsGrid: {
    gap: spacing.sm,
  },
  metricCard: {
    borderRadius: radius.md,
    borderColor: colors.border,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 108,
    padding: spacing.md,
  },
  metricCardInfo: {
    backgroundColor: colors.infoSoft,
  },
  metricCardSuccess: {
    backgroundColor: colors.successSoft,
  },
  metricCardWarning: {
    backgroundColor: colors.warningSoft,
  },
  metricCardNeutral: {
    backgroundColor: colors.surfaceAlt,
  },
  metricIconWrap: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  metricCopy: {
    flex: 1,
    gap: 2,
  },
  metricTitle: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  metricValue: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 24,
    fontWeight: "800",
  },
  metricDescription: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 18,
  },
  resultsHeader: {
    alignItems: "center",
    gap: spacing.sm,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  resultsHeaderCopy: {
    alignItems: "center",
    gap: 4,
    maxWidth: 680,
  },
  resultsTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  resultsDescription: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  resultsMeta: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  resultsPanel: {
    gap: spacing.md,
    padding: 0,
  },
  errorBlock: {
    flex: 1,
  },
  table: {
    width: "100%",
  },
  tableScroll: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    width: "100%",
  },
  tableHead: {
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  tableHeadCell: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  tableBody: {
    width: "100%",
  },
  tableRow: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  tableCell: {
    minWidth: 0,
  },
  studentColumn: {
    flex: 2.2,
  },
  branchColumn: {
    flex: 1.4,
  },
  paymentColumn: {
    flex: 1.2,
  },
  feeColumn: {
    flex: 1.1,
  },
  beltColumn: {
    flex: 1.4,
    minWidth: 160,
  },
  statusColumn: {
    flex: 1.5,
  },
  actionsColumn: {
    flex: 1.8,
  },
  tableStudentName: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 15,
    fontWeight: "700",
  },
  tableStudentMeta: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 18,
  },
  tableCellValue: {
    color: colors.text,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  tableBadges: {
    gap: spacing.xs,
  },
  tableBadgesText: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  tableBadgeText: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  tableActions: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "flex-start",
  },
  rowHyperlink: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 32,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  rowHyperlinkHovered: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
  },
  rowHyperlinkHoveredDanger: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.sm,
  },
  rowHyperlinkPressed: {
    opacity: 0.7,
  },
  rowHyperlinkDanger: {},
  rowHyperlinkLabel: {
    color: colors.primary,
    fontFamily: typography.headingFamily,
    fontSize: 13,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  rowHyperlinkLabelDanger: {
    color: colors.danger,
  },
  rowEditText: {
    color: colors.text,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  resultsTitleInline: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 18,
    fontWeight: "800",
    marginTop: spacing.xs,
  },
  searchRowCompact: {
    gap: spacing.sm,
  },
  compactSearchInput: {
    minHeight: 40,
    paddingHorizontal: spacing.sm,
    fontSize: 13,
  },
  resultsMetaCompact: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 18,
  },
  mobileRow: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  mobileRowTop: {
    gap: spacing.sm,
  },
  mobileRowCopy: {
    gap: 4,
  },
  mobileRowBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  mobileMetaGrid: {
    gap: spacing.sm,
  },
  mobileMetaItem: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 2,
    padding: spacing.sm,
  },
  mobileMetaLabel: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  mobileMetaValue: {
    color: colors.text,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    fontWeight: "600",
  },
  mobileRowActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  mobileActionLink: {
    alignItems: "center",
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  mobileActionLinkHovered: {
    backgroundColor: colors.primarySoft,
    textDecorationLine: "underline",
  },
  mobileActionLinkPressed: {
    backgroundColor: colors.surfaceAlt,
    opacity: 0.8,
  },
  mobileActionLinkLabel: {
    color: colors.primary,
    fontFamily: typography.headingFamily,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.15,
  },
  mobileContextButton: {
    alignItems: "center",
    borderRadius: radius.sm,
    height: 40,
    justifyContent: "center",
    marginLeft: "auto",
    width: 40,
  },
  mobileContextButtonHovered: {
    backgroundColor: colors.primarySoft,
  },
  mobileContextButtonPressed: {
    backgroundColor: colors.surfaceAlt,
    opacity: 0.85,
  },
  pagination: {
    alignItems: "center",
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  paginationLabel: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  compactActionButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 34,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  compactActionButtonDanger: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
  },
  compactActionButtonPressed: {
    opacity: 0.78,
  },
  compactActionLabel: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 12,
    fontWeight: "700",
  },
  compactActionLabelDanger: {
    color: colors.danger,
  },
  emptyState: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 18,
    fontWeight: "700",
  },
  emptyDescription: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  modalError: {
    color: colors.danger,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
  },
  formStepper: {
    gap: spacing.sm,
  },
  formStepperCopy: {
    gap: 4,
  },
  formStepLabel: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  formStepTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 18,
    fontWeight: "700",
  },
  formStepperTrack: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  formStepDot: {
    backgroundColor: colors.hoverStrong,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flex: 1,
    height: 8,
  },
  formStepDotActive: {
    backgroundColor: colors.action,
    borderColor: colors.action,
  },
  formStepDotCompleted: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
  },
  formGrid: {
    gap: spacing.md,
  },
  notesBlock: {
    flex: 1,
  },
  notesInput: {
    minHeight: 108,
    paddingTop: spacing.md,
    textAlignVertical: "top",
  },
  modalActions: {
    gap: spacing.sm,
    justifyContent: "flex-end",
  },
  confirmCard: {
    backgroundColor: colors.surfaceAlt,
    gap: spacing.sm,
  },
  confirmTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 17,
    fontWeight: "800",
  },
  confirmText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  summaryRow: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: 4,
    paddingBottom: spacing.sm,
  },
  summaryRowLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  summaryRowValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  formBeltBlock: {
    marginTop: spacing.lg,
    width: "100%",
  },
  formSubCard: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  formSubCardTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 15,
    fontWeight: "800",
  },
  formSubCardDesc: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 18,
  },
  formFieldSpan: {
    width: "100%",
  },
  inlineWarningBadge: {
    alignItems: "center",
    backgroundColor: colors.warningSoft,
    borderColor: colors.warning,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  inlineWarningBadgeText: {
    color: colors.warning,
    fontFamily: typography.headingFamily,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  toggleRow: {
    alignItems: "center",
    borderRadius: radius.md,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  toggleRowHovered: {
    backgroundColor: colors.hoverStrong,
  },
  toggleRowPressed: {
    backgroundColor: colors.surface,
    opacity: 0.9,
  },
  toggleRowLabel: {
    color: colors.text,
    flex: 1,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  toggleTrack: {
    alignItems: "center",
    backgroundColor: colors.hoverStrong,
    borderRadius: radius.pill,
    height: 26,
    justifyContent: "center",
    paddingHorizontal: 2,
    width: 48,
  },
  toggleTrackOn: {
    backgroundColor: colors.success,
  },
  toggleThumb: {
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    height: 22,
    width: 22,
  },
  toggleThumbOn: {
    alignSelf: "flex-end",
  },
  mobileIncompleteWrap: {
    alignItems: "flex-start",
    marginBottom: spacing.xs,
  },
  rowIconHyperlink: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  quickFieldWrap: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: 6,
    paddingBottom: spacing.sm,
    paddingTop: spacing.xs,
  },
  quickFieldHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  quickFieldIconWrap: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  quickFieldIconDanger: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
  },
  quickFieldIconWarning: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.warning,
  },
  quickFieldIconSuccess: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
  },
  quickFieldLabel: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  quickFieldValue: {
    color: colors.text,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    paddingLeft: 32,
  },
  medicalQuickViewContainer: {
    gap: spacing.md,
  },
  medicalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  medicalIncompleteCard: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.warning,
  },
  medicalIncompleteHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
  },
  medicalIncompleteTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 14,
    fontWeight: "800",
  },
  medicalIncompleteDesc: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 18,
  },
  medicalQuickActions: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "flex-end",
    marginTop: spacing.sm,
  },
  mobileBeltRow: {
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
});

const mobileStyles = StyleSheet.create({
  dashboardTop: {
    flexDirection: "column",
  },
  searchRow: {
    flexDirection: "column",
  },
  searchRowCompact: {
    flexDirection: "column",
  },
  inlineMetricsGrid: {
    flexDirection: "column",
  },
  metricsGrid: {
    flexDirection: "column",
  },
  resultsHeader: {
    flexDirection: "column",
    alignItems: "center",
  },
  tableScroll: {
    maxHeight: 520,
  },
  pagination: {
    flexDirection: "column",
  },
  formGrid: {
    flexDirection: "column",
  },
  modalActions: {
    flexDirection: "column",
  },
});

const desktopStyles = StyleSheet.create({
  dashboardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  searchRow: {
    alignItems: "flex-end",
    flexDirection: "row",
  },
  searchRowCompact: {
    alignItems: "flex-end",
    flexDirection: "row",
  },
  inlineMetricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  resultsHeader: {
    flexDirection: "column",
  },
  tableScroll: {
    maxHeight: 620,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  formGrid: {
    flexDirection: "row",
  },
  modalActions: {
    alignItems: "center",
    flexDirection: "row",
  },
});
