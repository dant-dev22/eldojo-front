import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { attendanceApi } from "@/api/attendanceApi";
import { branchesApi } from "@/api/branchesApi";
import { classesApi } from "@/api/classesApi";
import { disciplinesApi } from "@/api/disciplinesApi";
import { getErrorMessage } from "@/api/http";
import { organizationsApi } from "@/api/organizationsApi";
import { paymentsApi } from "@/api/paymentsApi";
import { studentsApi } from "@/api/studentsApi";
import { AppBadge } from "@/components/AppBadge";
import { AppButton } from "@/components/AppButton";
import { AppCard } from "@/components/AppCard";
import { AppDateInput } from "@/components/AppDateInput";
import { AppInput } from "@/components/AppInput";
import { AppModal } from "@/components/AppModal";
import { AppSelect } from "@/components/AppSelect";
import { AdminShell } from "@/components/AdminShell";
import { Screen } from "@/components/Screen";
import { StatusView } from "@/components/StatusView";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { formatCurrency, formatDate, formatDateTime, formatPaymentMethod, formatPaymentRecordStatus } from "@/utils/format";

import type { AdminStackParamList } from "@/navigation/types";
import type {
  Attendance,
  AttendanceCreatePayload,
  AttendanceMethod,
  AttendanceUpdatePayload,
  Branch,
  BranchCreatePayload,
  BranchUpdatePayload,
  MartialClass,
  MartialClassCreatePayload,
  MartialClassUpdatePayload,
  Organization,
  OrganizationUpdatePayload,
  Payment,
  PaymentCreatePayload,
  PaymentMethod,
  PaymentRecordStatus,
  PaymentUpdatePayload,
  Student,
} from "@/types/api";

type Props = NativeStackScreenProps<AdminStackParamList, "AdminHome">;

type FeedbackTone = "success" | "danger";
type AttendanceDialogMode = "create" | "edit";
type BranchDialogMode = "create" | "edit";
type ClassDialogMode = "create" | "edit";
type PaymentDialogMode = "create" | "edit";
type DestructiveActionState = {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
};
type OrganizationStatusValue = "active" | "inactive";
type BranchStatusValue = "active" | "inactive";
type ClassStatusValue = "active" | "inactive";

type OrganizationFormState = {
  name: string;
  slug: string;
  status: OrganizationStatusValue;
};

type BranchFormState = {
  name: string;
  country: string;
  state: string;
  city: string;
  address: string;
  timezone: string;
  qrSecret: string;
  status: BranchStatusValue;
};

type ClassFormState = {
  branchId: string;
  disciplineId: string;
  name: string;
  description: string;
  instructorName: string;
  capacity: string;
  status: ClassStatusValue;
};

type PaymentFormState = {
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

type AttendanceFormState = {
  studentId: string;
  branchId: string;
  classId: string;
  checkInDate: string;
  checkInTime: string;
  method: AttendanceMethod;
};

type OrganizationFormErrors = Partial<Record<keyof OrganizationFormState, string>>;
type AttendanceFormErrors = Partial<Record<keyof AttendanceFormState, string>>;
type BranchFormErrors = Partial<Record<keyof BranchFormState, string>>;
type ClassFormErrors = Partial<Record<keyof ClassFormState, string>>;
type PaymentFormErrors = Partial<Record<keyof PaymentFormState, string>>;

const STATUS_OPTIONS = [
  { label: "Activa", value: "active" },
  { label: "Inactiva", value: "inactive" },
];
const PAYMENT_METHOD_OPTIONS: Array<{ label: string; value: PaymentMethod }> = [
  { label: "Efectivo", value: "cash" },
  { label: "Transferencia", value: "transfer" },
  { label: "Tarjeta", value: "card" },
  { label: "Otro", value: "other" },
];
const PAYMENT_RECORD_STATUS_OPTIONS: Array<{ label: string; value: PaymentRecordStatus }> = [
  { label: "Pagado", value: "paid" },
  { label: "Pendiente", value: "pending" },
  { label: "Anulado", value: "void" },
];
const ATTENDANCE_METHOD_OPTIONS: Array<{ label: string; value: AttendanceMethod }> = [
  { label: "Manual", value: "manual" },
  { label: "QR", value: "qr" },
];

const DEFAULT_DISCIPLINE_NAMES = ["MMA", "BJJ", "JUDO"] as const;

function isValidDateText(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toIsoPaymentDateTime(dateText: string): string {
  return `${dateText}T12:00:00`;
}

function isValidTimeText(value: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

function toIsoAttendanceDateTime(dateText: string, timeText: string): string {
  return `${dateText}T${timeText}:00`;
}

function createQrSecret(): string {
  const randomBlock = Math.random().toString(36).slice(2, 8).toUpperCase();
  const timeBlock = Date.now().toString(36).slice(-4).toUpperCase();
  return `QR${randomBlock}${timeBlock}`;
}

function toOrganizationFormState(organization: Organization): OrganizationFormState {
  return {
    name: organization.name,
    slug: organization.slug,
    status: organization.is_active ? "active" : "inactive",
  };
}

function createEmptyBranchForm(sourceBranch?: Branch | null): BranchFormState {
  return {
    name: "",
    country: sourceBranch?.country ?? "Mexico",
    state: sourceBranch?.state ?? "",
    city: sourceBranch?.city ?? "",
    address: "",
    timezone: sourceBranch?.timezone ?? "America/Mexico_City",
    qrSecret: createQrSecret(),
    status: "active",
  };
}

function toBranchFormState(branch: Branch): BranchFormState {
  return {
    name: branch.name,
    country: branch.country,
    state: branch.state,
    city: branch.city,
    address: branch.address,
    timezone: branch.timezone,
    qrSecret: branch.qr_secret,
    status: branch.is_active ? "active" : "inactive",
  };
}

function createEmptyClassForm(defaultBranchId?: number | null, defaultDisciplineId?: number | null): ClassFormState {
  return {
    branchId: defaultBranchId ? String(defaultBranchId) : "",
    disciplineId: defaultDisciplineId ? String(defaultDisciplineId) : "",
    name: "",
    description: "",
    instructorName: "",
    capacity: "",
    status: "active",
  };
}

function toClassFormState(classItem: MartialClass): ClassFormState {
  return {
    branchId: String(classItem.branch_id),
    disciplineId: String(classItem.discipline_id),
    name: classItem.name,
    description: classItem.description ?? "",
    instructorName: classItem.instructor_name ?? "",
    capacity: classItem.capacity ? String(classItem.capacity) : "",
    status: classItem.is_active ? "active" : "inactive",
  };
}

function createEmptyPaymentForm(defaultStudent?: Student | null): PaymentFormState {
  return {
    studentId: defaultStudent ? String(defaultStudent.id) : "",
    amount: defaultStudent?.monthly_fee ? String(defaultStudent.monthly_fee) : "",
    currency: defaultStudent?.currency ?? "MXN",
    periodStart: defaultStudent?.next_payment_date ?? "",
    periodEnd: defaultStudent?.next_payment_date ?? "",
    paidDate: new Date().toISOString().slice(0, 10),
    method: "cash",
    status: "paid",
    notes: "",
  };
}

function toPaymentFormState(payment: Payment): PaymentFormState {
  return {
    studentId: String(payment.student_id),
    amount: String(payment.amount),
    currency: payment.currency,
    periodStart: payment.period_start,
    periodEnd: payment.period_end,
    paidDate: payment.paid_at.slice(0, 10),
    method: payment.method,
    status: payment.status,
    notes: payment.notes ?? "",
  };
}

function createEmptyAttendanceForm(defaultStudent?: Student | null): AttendanceFormState {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");

  return {
    studentId: defaultStudent ? String(defaultStudent.id) : "",
    branchId: defaultStudent ? String(defaultStudent.branch_id) : "",
    classId: defaultStudent?.primary_class_id ? String(defaultStudent.primary_class_id) : "none",
    checkInDate: now.toISOString().slice(0, 10),
    checkInTime: `${hh}:${mm}`,
    method: "manual",
  };
}

function toAttendanceFormState(attendance: Attendance): AttendanceFormState {
  return {
    studentId: String(attendance.student_id),
    branchId: String(attendance.branch_id),
    classId: attendance.class_id ? String(attendance.class_id) : "none",
    checkInDate: attendance.check_in_at.slice(0, 10),
    checkInTime: attendance.check_in_at.slice(11, 16),
    method: attendance.method,
  };
}

function validateOrganizationForm(form: OrganizationFormState): OrganizationFormErrors {
  const errors: OrganizationFormErrors = {};

  if (form.name.trim().length < 2) {
    errors.name = "Ingresa al menos 2 caracteres.";
  }

  if (!/^[A-Z]{3}$/.test(form.slug.trim().toUpperCase())) {
    errors.slug = "Usa exactamente 3 letras mayusculas.";
  }

  return errors;
}

function validateBranchForm(form: BranchFormState): BranchFormErrors {
  const errors: BranchFormErrors = {};

  if (form.name.trim().length < 2) {
    errors.name = "Ingresa al menos 2 caracteres.";
  }
  if (form.country.trim().length < 2) {
    errors.country = "Ingresa un pais valido.";
  }
  if (form.state.trim().length < 2) {
    errors.state = "Ingresa un estado valido.";
  }
  if (form.city.trim().length < 2) {
    errors.city = "Ingresa una ciudad valida.";
  }
  if (form.address.trim().length < 5) {
    errors.address = "Ingresa una direccion mas completa.";
  }
  if (form.timezone.trim().length < 3 || !form.timezone.includes("/")) {
    errors.timezone = "Usa una zona IANA valida. Ejemplo: America/Mexico_City.";
  }
  if (form.qrSecret.trim().length < 8) {
    errors.qrSecret = "La clave QR debe tener al menos 8 caracteres.";
  }

  return errors;
}

function validateClassForm(form: ClassFormState): ClassFormErrors {
  const errors: ClassFormErrors = {};

  if (!form.branchId) {
    errors.branchId = "Selecciona una sucursal.";
  }
  if (!form.disciplineId) {
    errors.disciplineId = "Selecciona una disciplina.";
  }
  if (form.name.trim().length < 2) {
    errors.name = "Ingresa al menos 2 caracteres.";
  }
  if (form.capacity.trim()) {
    const parsedCapacity = Number(form.capacity.trim());
    if (!Number.isInteger(parsedCapacity) || parsedCapacity <= 0) {
      errors.capacity = "Ingresa una capacidad valida mayor a 0.";
    }
  }

  return errors;
}

function validatePaymentForm(form: PaymentFormState): PaymentFormErrors {
  const errors: PaymentFormErrors = {};

  if (!form.studentId) {
    errors.studentId = "Selecciona un alumno.";
  }
  if (!form.amount.trim() || Number(form.amount) <= 0) {
    errors.amount = "Ingresa un monto valido mayor a 0.";
  }
  if (!/^[A-Za-z]{3}$/.test(form.currency.trim())) {
    errors.currency = "Usa una moneda ISO de 3 letras.";
  }
  if (!isValidDateText(form.periodStart.trim())) {
    errors.periodStart = "Usa el formato YYYY-MM-DD.";
  }
  if (!isValidDateText(form.periodEnd.trim())) {
    errors.periodEnd = "Usa el formato YYYY-MM-DD.";
  }
  if (
    isValidDateText(form.periodStart.trim()) &&
    isValidDateText(form.periodEnd.trim()) &&
    form.periodStart.trim() > form.periodEnd.trim()
  ) {
    errors.periodEnd = "La fecha final no puede ser menor a la inicial.";
  }
  if (!isValidDateText(form.paidDate.trim())) {
    errors.paidDate = "Usa el formato YYYY-MM-DD.";
  }

  return errors;
}

function validateAttendanceForm(form: AttendanceFormState): AttendanceFormErrors {
  const errors: AttendanceFormErrors = {};

  if (!form.studentId) {
    errors.studentId = "Selecciona un alumno.";
  }
  if (!form.branchId) {
    errors.branchId = "Selecciona una sucursal.";
  }
  if (!isValidDateText(form.checkInDate.trim())) {
    errors.checkInDate = "Usa el formato YYYY-MM-DD.";
  }
  if (!isValidTimeText(form.checkInTime.trim())) {
    errors.checkInTime = "Usa el formato HH:MM en 24 horas.";
  }

  return errors;
}

function buildOrganizationPayload(form: OrganizationFormState): OrganizationUpdatePayload {
  return {
    name: form.name.trim(),
    slug: form.slug.trim().toUpperCase(),
    is_active: form.status === "active",
  };
}

function buildBranchCreatePayload(form: BranchFormState, organizationId: number): BranchCreatePayload {
  return {
    organization_id: organizationId,
    name: form.name.trim(),
    country: form.country.trim(),
    state: form.state.trim(),
    city: form.city.trim(),
    address: form.address.trim(),
    timezone: form.timezone.trim(),
    qr_secret: form.qrSecret.trim(),
    is_active: form.status === "active",
  };
}

function buildBranchUpdatePayload(form: BranchFormState): BranchUpdatePayload {
  return {
    name: form.name.trim(),
    country: form.country.trim(),
    state: form.state.trim(),
    city: form.city.trim(),
    address: form.address.trim(),
    timezone: form.timezone.trim(),
    qr_secret: form.qrSecret.trim(),
    is_active: form.status === "active",
  };
}

function buildClassCreatePayload(form: ClassFormState, organizationId: number): MartialClassCreatePayload {
  return {
    organization_id: organizationId,
    branch_id: Number(form.branchId),
    discipline_id: Number(form.disciplineId),
    name: form.name.trim(),
    description: form.description.trim() || null,
    instructor_name: form.instructorName.trim() || null,
    capacity: form.capacity.trim() ? Number(form.capacity.trim()) : null,
    is_active: form.status === "active",
  };
}

function buildClassUpdatePayload(form: ClassFormState): MartialClassUpdatePayload {
  return {
    branch_id: Number(form.branchId),
    discipline_id: Number(form.disciplineId),
    name: form.name.trim(),
    description: form.description.trim() || null,
    instructor_name: form.instructorName.trim() || null,
    capacity: form.capacity.trim() ? Number(form.capacity.trim()) : null,
    is_active: form.status === "active",
  };
}

function buildPaymentCreatePayload(
  form: PaymentFormState,
  student: Student,
  recordedBy: number
): PaymentCreatePayload {
  return {
    student_id: student.id,
    organization_id: student.organization_id,
    branch_id: student.branch_id,
    amount: Number(form.amount).toFixed(2),
    currency: form.currency.trim().toUpperCase(),
    period_start: form.periodStart.trim(),
    period_end: form.periodEnd.trim(),
    paid_at: toIsoPaymentDateTime(form.paidDate.trim()),
    method: form.method,
    status: form.status,
    recorded_by: recordedBy,
    notes: form.notes.trim() || null,
  };
}

function buildPaymentUpdatePayload(
  form: PaymentFormState,
  student: Student,
  recordedBy: number
): PaymentUpdatePayload {
  return {
    student_id: student.id,
    organization_id: student.organization_id,
    branch_id: student.branch_id,
    amount: Number(form.amount).toFixed(2),
    currency: form.currency.trim().toUpperCase(),
    period_start: form.periodStart.trim(),
    period_end: form.periodEnd.trim(),
    paid_at: toIsoPaymentDateTime(form.paidDate.trim()),
    method: form.method,
    status: form.status,
    recorded_by: recordedBy,
    notes: form.notes.trim() || null,
  };
}

function buildAttendanceCreatePayload(
  form: AttendanceFormState,
  recordedBy: number | null
): AttendanceCreatePayload {
  return {
    student_id: Number(form.studentId),
    branch_id: Number(form.branchId),
    class_id: form.classId && form.classId !== "none" ? Number(form.classId) : null,
    check_in_at: toIsoAttendanceDateTime(form.checkInDate.trim(), form.checkInTime.trim()),
    method: form.method,
    registered_by: recordedBy,
  };
}

function buildAttendanceUpdatePayload(
  form: AttendanceFormState,
  recordedBy: number | null
): AttendanceUpdatePayload {
  return {
    student_id: Number(form.studentId),
    branch_id: Number(form.branchId),
    class_id: form.classId && form.classId !== "none" ? Number(form.classId) : null,
    check_in_at: toIsoAttendanceDateTime(form.checkInDate.trim(), form.checkInTime.trim()),
    method: form.method,
    registered_by: recordedBy,
  };
}

function getPaymentRecordTone(status: PaymentRecordStatus): "success" | "warning" | "danger" {
  switch (status) {
    case "paid":
      return "success";
    case "pending":
      return "warning";
    case "void":
      return "danger";
    default:
      return "warning";
  }
}

function formatAttendanceMethod(method: AttendanceMethod): string {
  switch (method) {
    case "manual":
      return "Manual";
    case "qr":
      return "QR";
    default:
      return method;
  }
}

export function AdminDashboardScreen({ navigation }: Props) {
  const { isDesktop } = useResponsiveLayout();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const currentAssignment = user?.admin_assignments[0] ?? null;
  const organizationId = currentAssignment?.organization_id ?? null;
  const scopedBranchId = currentAssignment?.branch_id ?? null;
  const canManageOrganization = user?.role === "org_admin";
  const canCreateBranches = user?.role === "org_admin";
  const canDeactivateBranches = user?.role === "org_admin";
  const canEditVisibleBranches = Boolean(user);
  const [feedback, setFeedback] = useState<{ tone: FeedbackTone; message: string } | null>(null);
  const [organizationModalVisible, setOrganizationModalVisible] = useState(false);
  const [organizationForm, setOrganizationForm] = useState<OrganizationFormState>({
    name: "",
    slug: "",
    status: "active",
  });
  const [organizationErrors, setOrganizationErrors] = useState<OrganizationFormErrors>({});
  const [destructiveAction, setDestructiveAction] = useState<DestructiveActionState | null>(null);
  const [attendanceModalVisible, setAttendanceModalVisible] = useState(false);
  const [attendanceDialogMode, setAttendanceDialogMode] = useState<AttendanceDialogMode>("create");
  const [editingAttendance, setEditingAttendance] = useState<Attendance | null>(null);
  const [attendanceForm, setAttendanceForm] = useState<AttendanceFormState>(createEmptyAttendanceForm());
  const [attendanceErrors, setAttendanceErrors] = useState<AttendanceFormErrors>({});
  const [branchModalVisible, setBranchModalVisible] = useState(false);
  const [branchDialogMode, setBranchDialogMode] = useState<BranchDialogMode>("create");
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [branchForm, setBranchForm] = useState<BranchFormState>(createEmptyBranchForm());
  const [branchErrors, setBranchErrors] = useState<BranchFormErrors>({});
  const [classModalVisible, setClassModalVisible] = useState(false);
  const [classDialogMode, setClassDialogMode] = useState<ClassDialogMode>("create");
  const [editingClass, setEditingClass] = useState<MartialClass | null>(null);
  const [classForm, setClassForm] = useState<ClassFormState>(createEmptyClassForm());
  const [classErrors, setClassErrors] = useState<ClassFormErrors>({});
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentDialogMode, setPaymentDialogMode] = useState<PaymentDialogMode>("create");
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>(createEmptyPaymentForm());
  const [paymentErrors, setPaymentErrors] = useState<PaymentFormErrors>({});

  const studentsQuery = useQuery({
    queryKey: ["dashboard-students"],
    queryFn: () => studentsApi.list(),
  });

  const classesQuery = useQuery({
    queryKey: ["dashboard-classes", organizationId, scopedBranchId],
    queryFn: () =>
      classesApi.list({
        organizationId: organizationId as number,
        branchId: scopedBranchId ?? undefined,
      }),
    enabled: Boolean(organizationId),
  });

  const organizationQuery = useQuery({
    queryKey: ["dashboard-organization", organizationId],
    queryFn: () => organizationsApi.getById(organizationId as number),
    enabled: Boolean(organizationId),
  });

  const branchesQuery = useQuery({
    queryKey: ["dashboard-branches", organizationId],
    queryFn: () => branchesApi.list({ organizationId: organizationId as number }),
    enabled: Boolean(organizationId),
  });

  const disciplinesQuery = useQuery({
    queryKey: ["dashboard-disciplines", organizationId],
    queryFn: () => disciplinesApi.list({ organizationId: organizationId as number, isActive: true }),
    enabled: Boolean(organizationId),
  });

  const paymentsQuery = useQuery({
    queryKey: ["dashboard-payments", organizationId, scopedBranchId],
    queryFn: () =>
      paymentsApi.list({
        organizationId: organizationId as number,
        branchId: scopedBranchId ?? undefined,
      }),
    enabled: Boolean(organizationId),
  });

  const attendanceQuery = useQuery({
    queryKey: ["dashboard-attendance", scopedBranchId],
    queryFn: () =>
      attendanceApi.list({
        branchId: scopedBranchId ?? undefined,
      }),
    enabled: Boolean(user),
  });

  const invalidateOperationalQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["dashboard-organization", organizationId] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard-branches", organizationId] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard-classes"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard-disciplines", organizationId] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard-payments"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard-attendance"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard-students"] }),
      queryClient.invalidateQueries({ queryKey: ["student"] }),
      queryClient.invalidateQueries({ queryKey: ["students"] }),
      queryClient.invalidateQueries({ queryKey: ["payments"] }),
    ]);
  };

  const organizationMutation = useMutation({
    mutationFn: (payload: OrganizationUpdatePayload) => organizationsApi.update(organizationId as number, payload),
    onSuccess: async () => {
      await invalidateOperationalQueries();
      setFeedback({ tone: "success", message: "Los datos del gimnasio se actualizaron correctamente." });
      setOrganizationModalVisible(false);
      setOrganizationErrors({});
    },
    onError: (error) => {
      setFeedback({ tone: "danger", message: getErrorMessage(error) });
    },
  });

  const createBranchMutation = useMutation({
    mutationFn: (payload: BranchCreatePayload) => branchesApi.create(payload),
    onSuccess: async () => {
      await invalidateOperationalQueries();
      setFeedback({ tone: "success", message: "La sucursal se creo correctamente." });
      setBranchModalVisible(false);
      setBranchErrors({});
    },
    onError: (error) => {
      setFeedback({ tone: "danger", message: getErrorMessage(error) });
    },
  });

  const updateBranchMutation = useMutation({
    mutationFn: ({ branchId, payload }: { branchId: number; payload: BranchUpdatePayload }) =>
      branchesApi.update(branchId, payload),
    onSuccess: async () => {
      await invalidateOperationalQueries();
      setFeedback({ tone: "success", message: "La sucursal se actualizo correctamente." });
      setBranchModalVisible(false);
      setBranchErrors({});
    },
    onError: (error) => {
      setFeedback({ tone: "danger", message: getErrorMessage(error) });
    },
  });

  const deactivateBranchMutation = useMutation({
    mutationFn: (branchId: number) => branchesApi.remove(branchId),
    onSuccess: async () => {
      await invalidateOperationalQueries();
      setDestructiveAction(null);
      setFeedback({ tone: "success", message: "La sucursal quedo desactivada." });
      setBranchModalVisible(false);
      setBranchErrors({});
    },
    onError: (error) => {
      setFeedback({ tone: "danger", message: getErrorMessage(error) });
    },
  });

  const ensureDisciplinesMutation = useMutation({
    mutationFn: async (missingNames: string[]) => {
      if (!organizationId) {
        return [];
      }

      return Promise.all(
        missingNames.map((name) =>
          disciplinesApi.create({
            organization_id: organizationId,
            name,
            is_active: true,
          })
        )
      );
    },
    onSuccess: async () => {
      await invalidateOperationalQueries();
    },
    onError: (error) => {
      setFeedback({ tone: "danger", message: getErrorMessage(error) });
    },
  });

  const createClassMutation = useMutation({
    mutationFn: (payload: MartialClassCreatePayload) => classesApi.create(payload),
    onSuccess: async () => {
      await invalidateOperationalQueries();
      setFeedback({ tone: "success", message: "La clase se creo correctamente." });
      setClassModalVisible(false);
      setClassErrors({});
    },
    onError: (error) => {
      setFeedback({ tone: "danger", message: getErrorMessage(error) });
    },
  });

  const updateClassMutation = useMutation({
    mutationFn: ({ classId, payload }: { classId: number; payload: MartialClassUpdatePayload }) =>
      classesApi.update(classId, payload),
    onSuccess: async () => {
      await invalidateOperationalQueries();
      setFeedback({ tone: "success", message: "La clase se actualizo correctamente." });
      setClassModalVisible(false);
      setClassErrors({});
    },
    onError: (error) => {
      setFeedback({ tone: "danger", message: getErrorMessage(error) });
    },
  });

  const deactivateClassMutation = useMutation({
    mutationFn: (classId: number) => classesApi.remove(classId),
    onSuccess: async () => {
      await invalidateOperationalQueries();
      setDestructiveAction(null);
      setFeedback({ tone: "success", message: "La clase quedo desactivada." });
      setClassModalVisible(false);
      setClassErrors({});
    },
    onError: (error) => {
      setFeedback({ tone: "danger", message: getErrorMessage(error) });
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: (payload: PaymentCreatePayload) => paymentsApi.create(payload),
    onSuccess: async () => {
      await invalidateOperationalQueries();
      setFeedback({ tone: "success", message: "El pago se registro correctamente." });
      setPaymentModalVisible(false);
      setPaymentErrors({});
    },
    onError: (error) => {
      setFeedback({ tone: "danger", message: getErrorMessage(error) });
    },
  });

  const updatePaymentMutation = useMutation({
    mutationFn: ({ paymentId, payload }: { paymentId: number; payload: PaymentUpdatePayload }) =>
      paymentsApi.update(paymentId, payload),
    onSuccess: async () => {
      await invalidateOperationalQueries();
      setFeedback({ tone: "success", message: "El pago se actualizo correctamente." });
      setPaymentModalVisible(false);
      setPaymentErrors({});
    },
    onError: (error) => {
      setFeedback({ tone: "danger", message: getErrorMessage(error) });
    },
  });

  const voidPaymentMutation = useMutation({
    mutationFn: (paymentId: number) => paymentsApi.remove(paymentId),
    onSuccess: async () => {
      await invalidateOperationalQueries();
      setDestructiveAction(null);
      setFeedback({ tone: "success", message: "El pago quedo anulado." });
      setPaymentModalVisible(false);
      setPaymentErrors({});
    },
    onError: (error) => {
      setFeedback({ tone: "danger", message: getErrorMessage(error) });
    },
  });

  const createAttendanceMutation = useMutation({
    mutationFn: (payload: AttendanceCreatePayload) => attendanceApi.create(payload),
    onSuccess: async () => {
      await invalidateOperationalQueries();
      setFeedback({ tone: "success", message: "La asistencia se registro correctamente." });
      setAttendanceModalVisible(false);
      setAttendanceErrors({});
    },
    onError: (error) => {
      setFeedback({ tone: "danger", message: getErrorMessage(error) });
    },
  });

  const updateAttendanceMutation = useMutation({
    mutationFn: ({ attendanceId, payload }: { attendanceId: number; payload: AttendanceUpdatePayload }) =>
      attendanceApi.update(attendanceId, payload),
    onSuccess: async () => {
      await invalidateOperationalQueries();
      setFeedback({ tone: "success", message: "La asistencia se actualizo correctamente." });
      setAttendanceModalVisible(false);
      setAttendanceErrors({});
    },
    onError: (error) => {
      setFeedback({ tone: "danger", message: getErrorMessage(error) });
    },
  });

  const deleteAttendanceMutation = useMutation({
    mutationFn: (attendanceId: number) => attendanceApi.remove(attendanceId),
    onSuccess: async () => {
      await invalidateOperationalQueries();
      setDestructiveAction(null);
      setFeedback({ tone: "success", message: "La asistencia se elimino correctamente." });
      setAttendanceModalVisible(false);
      setAttendanceErrors({});
    },
    onError: (error) => {
      setFeedback({ tone: "danger", message: getErrorMessage(error) });
    },
  });

  const students = studentsQuery.data ?? [];
  const classes = classesQuery.data ?? [];
  const organization = organizationQuery.data ?? null;
  const branches = branchesQuery.data ?? [];
  const disciplines = disciplinesQuery.data ?? [];
  const payments = paymentsQuery.data ?? [];
  const attendanceRecords = attendanceQuery.data ?? [];
  const visibleBranches = useMemo(
    () => (scopedBranchId ? branches.filter((item) => item.id === scopedBranchId) : branches),
    [branches, scopedBranchId]
  );
  const visibleStudents = useMemo(
    () =>
      students.filter(
        (item) =>
          item.deleted_at === null &&
          (!scopedBranchId || item.branch_id === scopedBranchId)
      ),
    [students, scopedBranchId]
  );
  const currentBranch = useMemo(
    () => visibleBranches.find((item) => item.id === scopedBranchId) ?? visibleBranches[0] ?? null,
    [visibleBranches, scopedBranchId]
  );
  const visibleClasses = useMemo(
    () => (scopedBranchId ? classes.filter((item) => item.branch_id === scopedBranchId) : classes),
    [classes, scopedBranchId]
  );
  const disciplineOptions = useMemo(
    () => disciplines.map((item) => ({ label: item.name, value: String(item.id) })),
    [disciplines]
  );
  const branchOptions = useMemo(
    () =>
      visibleBranches.map((item) => ({
        label: `${item.name}${item.city ? ` · ${item.city}` : ""}`,
        value: String(item.id),
      })),
    [visibleBranches]
  );
  const studentOptions = useMemo(
    () =>
      visibleStudents.map((item) => {
        const branchName = visibleBranches.find((branch) => branch.id === item.branch_id)?.name ?? `Sucursal ${item.branch_id}`;
        return {
          label: `${item.first_name} ${item.last_name} · ${item.unique_code} · ${branchName}`,
          value: String(item.id),
        };
      }),
    [visibleBranches, visibleStudents]
  );
  const visiblePayments = useMemo(
    () =>
      payments.filter(
        (item) =>
          visibleStudents.some((student) => student.id === item.student_id) &&
          (!scopedBranchId || item.branch_id === scopedBranchId)
      ),
    [payments, scopedBranchId, visibleStudents]
  );
  const visibleAttendanceRecords = useMemo(
    () =>
      attendanceRecords.filter(
        (item) =>
          visibleStudents.some((student) => student.id === item.student_id) &&
          (!scopedBranchId || item.branch_id === scopedBranchId)
      ),
    [attendanceRecords, scopedBranchId, visibleStudents]
  );
  const selectedPaymentStudent = useMemo(
    () => visibleStudents.find((item) => item.id === Number(paymentForm.studentId)) ?? null,
    [paymentForm.studentId, visibleStudents]
  );
  const selectedAttendanceStudent = useMemo(
    () => visibleStudents.find((item) => item.id === Number(attendanceForm.studentId)) ?? null,
    [attendanceForm.studentId, visibleStudents]
  );
  const attendanceBranchOptions = useMemo(
    () =>
      visibleBranches.map((item) => ({
        label: `${item.name}${item.city ? ` · ${item.city}` : ""}`,
        value: String(item.id),
      })),
    [visibleBranches]
  );
  const attendanceClassOptions = useMemo(() => {
    const selectedBranchId = Number(attendanceForm.branchId);
    const filteredClasses = visibleClasses.filter((item) =>
      attendanceForm.branchId ? item.branch_id === selectedBranchId : true
    );

    return [
      { label: "Sin clase", value: "none" },
      ...filteredClasses.map((item) => ({
        label: item.name,
        value: String(item.id),
      })),
    ];
  }, [attendanceForm.branchId, visibleClasses]);
  const activeStudents = visibleStudents.filter((item) => item.status === "active").length;
  const latePayments = visibleStudents.filter((item) => item.payment_status === "late").length;
  const activeBranches = visibleBranches.filter((item) => item.is_active).length;
  const activeClasses = visibleClasses.filter((item) => item.is_active).length;
  const pendingPayments = visiblePayments.filter((item) => item.status === "pending").length;
  const todayAttendanceCount = visibleAttendanceRecords.filter((item) => item.check_in_at.slice(0, 10) === new Date().toISOString().slice(0, 10)).length;
  const isLoading =
    studentsQuery.isLoading ||
    classesQuery.isLoading ||
    organizationQuery.isLoading ||
    branchesQuery.isLoading ||
    disciplinesQuery.isLoading ||
    paymentsQuery.isLoading ||
    attendanceQuery.isLoading;
  const hasError =
    studentsQuery.isError ||
    classesQuery.isError ||
    organizationQuery.isError ||
    branchesQuery.isError ||
    disciplinesQuery.isError ||
    paymentsQuery.isError ||
    attendanceQuery.isError;
  const dashboardError =
    studentsQuery.error ??
    classesQuery.error ??
    organizationQuery.error ??
    branchesQuery.error ??
    disciplinesQuery.error ??
    paymentsQuery.error ??
    attendanceQuery.error;

  useEffect(() => {
    if (!organizationId || !canManageOrganization || disciplinesQuery.isLoading || ensureDisciplinesMutation.isPending) {
      return;
    }

    const availableNames = new Set(disciplines.map((item) => item.name.toUpperCase()));
    const missingNames = DEFAULT_DISCIPLINE_NAMES.filter((name) => !availableNames.has(name));

    if (missingNames.length > 0) {
      ensureDisciplinesMutation.mutate(missingNames as unknown as string[]);
    }
  }, [
    canManageOrganization,
    disciplines,
    disciplinesQuery.isLoading,
    ensureDisciplinesMutation.isPending,
    organizationId,
  ]);

  useEffect(() => {
    if (!selectedPaymentStudent) {
      return;
    }

    setPaymentForm((current) => ({
      ...current,
      currency: current.currency || selectedPaymentStudent.currency || "MXN",
      amount: current.amount || (selectedPaymentStudent.monthly_fee ? String(selectedPaymentStudent.monthly_fee) : ""),
      periodStart: current.periodStart || selectedPaymentStudent.next_payment_date || "",
      periodEnd: current.periodEnd || selectedPaymentStudent.next_payment_date || "",
    }));
  }, [selectedPaymentStudent]);

  useEffect(() => {
    if (!selectedAttendanceStudent) {
      return;
    }

    setAttendanceForm((current) => ({
      ...current,
      branchId: String(selectedAttendanceStudent.branch_id),
      classId:
        attendanceDialogMode === "create"
          ? current.classId && current.classId !== "none"
            ? current.classId
            : selectedAttendanceStudent.primary_class_id
              ? String(selectedAttendanceStudent.primary_class_id)
              : "none"
          : current.classId,
    }));
  }, [attendanceDialogMode, selectedAttendanceStudent]);

  function openOrganizationModal() {
    if (!organization) {
      return;
    }

    setFeedback(null);
    setOrganizationErrors({});
    setOrganizationForm(toOrganizationFormState(organization));
    setOrganizationModalVisible(true);
  }

  function openCreateBranchModal() {
    setFeedback(null);
    setBranchDialogMode("create");
    setEditingBranch(null);
    setBranchErrors({});
    setBranchForm(createEmptyBranchForm(currentBranch));
    setBranchModalVisible(true);
  }

  function openEditBranchModal(branch: Branch) {
    setFeedback(null);
    setBranchDialogMode("edit");
    setEditingBranch(branch);
    setBranchErrors({});
    setBranchForm(toBranchFormState(branch));
    setBranchModalVisible(true);
  }

  function openCreateAttendanceModal() {
    const defaultStudent = visibleStudents[0] ?? null;
    setFeedback(null);
    setAttendanceDialogMode("create");
    setEditingAttendance(null);
    setAttendanceErrors({});
    setAttendanceForm(createEmptyAttendanceForm(defaultStudent));
    setAttendanceModalVisible(true);
  }

  function openEditAttendanceModal(attendance: Attendance) {
    setFeedback(null);
    setAttendanceDialogMode("edit");
    setEditingAttendance(attendance);
    setAttendanceErrors({});
    setAttendanceForm(toAttendanceFormState(attendance));
    setAttendanceModalVisible(true);
  }

  function openCreateClassModal() {
    setFeedback(null);
    setClassDialogMode("create");
    setEditingClass(null);
    setClassErrors({});
    setClassForm(createEmptyClassForm(currentBranch?.id ?? scopedBranchId ?? null, disciplines[0]?.id ?? null));
    setClassModalVisible(true);
  }

  function openEditClassModal(classItem: MartialClass) {
    setFeedback(null);
    setClassDialogMode("edit");
    setEditingClass(classItem);
    setClassErrors({});
    setClassForm(toClassFormState(classItem));
    setClassModalVisible(true);
  }

  function openCreatePaymentModal() {
    const defaultStudent = visibleStudents[0] ?? null;
    setFeedback(null);
    setPaymentDialogMode("create");
    setEditingPayment(null);
    setPaymentErrors({});
    setPaymentForm(createEmptyPaymentForm(defaultStudent));
    setPaymentModalVisible(true);
  }

  function openEditPaymentModal(payment: Payment) {
    setFeedback(null);
    setPaymentDialogMode("edit");
    setEditingPayment(payment);
    setPaymentErrors({});
    setPaymentForm(toPaymentFormState(payment));
    setPaymentModalVisible(true);
  }

  function handleOrganizationSave() {
    const errors = validateOrganizationForm(organizationForm);
    setOrganizationErrors(errors);

    if (Object.keys(errors).length > 0 || !organizationId) {
      return;
    }

    organizationMutation.mutate(buildOrganizationPayload(organizationForm));
  }

  function handleBranchSave() {
    const errors = validateBranchForm(branchForm);
    setBranchErrors(errors);

    if (Object.keys(errors).length > 0 || !organizationId) {
      return;
    }

    if (branchDialogMode === "create") {
      createBranchMutation.mutate(buildBranchCreatePayload(branchForm, organizationId));
      return;
    }

    if (editingBranch) {
      updateBranchMutation.mutate({
        branchId: editingBranch.id,
        payload: buildBranchUpdatePayload(branchForm),
      });
    }
  }

  function handleBranchDeactivate() {
    if (!editingBranch) {
      return;
    }

    const activeStudentsInBranch = visibleStudents.filter(
      (student) => student.branch_id === editingBranch.id && student.status === "active"
    ).length;
    const activeClassesInBranch = visibleClasses.filter(
      (classItem) => classItem.branch_id === editingBranch.id && classItem.is_active
    ).length;

    if (activeStudentsInBranch > 0 || activeClassesInBranch > 0) {
      setFeedback({
        tone: "danger",
        message:
          "No puedes desactivar esta sucursal mientras tenga alumnos activos o clases activas. Reubica o desactiva esos elementos primero.",
      });
      return;
    }

    setDestructiveAction({
      title: "Desactivar sucursal",
      description: `La sucursal ${editingBranch.name} dejara de estar disponible para operar desde el dashboard. Esta accion cambia su estado a inactiva.`,
      confirmLabel: "Si, desactivar",
      onConfirm: () => deactivateBranchMutation.mutate(editingBranch.id),
    });
  }

  function handleClassSave() {
    const errors = validateClassForm(classForm);
    setClassErrors(errors);

    if (Object.keys(errors).length > 0 || !organizationId) {
      return;
    }

    if (classDialogMode === "create") {
      createClassMutation.mutate(buildClassCreatePayload(classForm, organizationId));
      return;
    }

    if (editingClass) {
      updateClassMutation.mutate({
        classId: editingClass.id,
        payload: buildClassUpdatePayload(classForm),
      });
    }
  }

  function handleClassDeactivate() {
    if (!editingClass) {
      return;
    }

    const activeStudentsInClass = visibleStudents.filter(
      (student) => student.primary_class_id === editingClass.id && student.status === "active"
    ).length;

    if (activeStudentsInClass > 0) {
      setFeedback({
        tone: "danger",
        message:
          "No puedes desactivar esta clase mientras tenga alumnos activos asignados como clase principal. Reasignalos primero.",
      });
      return;
    }

    setDestructiveAction({
      title: "Desactivar clase",
      description: `La clase ${editingClass.name} dejara de poder usarse en nuevas operaciones. Esta accion la marca como inactiva.`,
      confirmLabel: "Si, desactivar",
      onConfirm: () => deactivateClassMutation.mutate(editingClass.id),
    });
  }

  function handlePaymentSave() {
    const errors = validatePaymentForm(paymentForm);

    const student = visibleStudents.find((item) => item.id === Number(paymentForm.studentId));
    if (!student) {
      errors.studentId = "Selecciona un alumno valido dentro del alcance actual.";
    }
    if (paymentDialogMode === "create" && paymentForm.status === "void") {
      errors.status = "Primero registra el pago y luego anulado desde la accion dedicada si es necesario.";
    }
    if (paymentDialogMode === "edit" && editingPayment && editingPayment.status !== "void" && paymentForm.status === "void") {
      errors.status = "Usa la accion Anular pago para dejar trazabilidad y confirmacion explicita.";
    }
    if (paymentForm.status === "void" && paymentForm.notes.trim().length < 10) {
      errors.notes = "Explica con mas detalle el motivo de la anulacion.";
    }

    setPaymentErrors(errors);

    if (Object.keys(errors).length > 0 || !student || !user?.id) {
      return;
    }

    if (paymentDialogMode === "create") {
      createPaymentMutation.mutate(buildPaymentCreatePayload(paymentForm, student, user.id));
      return;
    }

    if (editingPayment) {
      updatePaymentMutation.mutate({
        paymentId: editingPayment.id,
        payload: buildPaymentUpdatePayload(paymentForm, student, user.id),
      });
    }
  }

  function handlePaymentVoid() {
    if (!editingPayment) {
      return;
    }

    const notes = paymentForm.notes.trim();
    if (!notes) {
      setPaymentErrors((current) => ({
        ...current,
        notes: "Agrega una nota explicando por que se anula el pago.",
      }));
      return;
    }

    setDestructiveAction({
      title: "Anular pago",
      description: "El pago se marcara como anulado y dejara trazabilidad en el historial financiero. Verifica que la nota explique claramente el motivo.",
      confirmLabel: "Si, anular",
      onConfirm: () => voidPaymentMutation.mutate(editingPayment.id),
    });
  }

  function handleAttendanceSave() {
    const errors = validateAttendanceForm(attendanceForm);
    const student = visibleStudents.find((item) => item.id === Number(attendanceForm.studentId)) ?? null;
    const selectedBranchId = Number(attendanceForm.branchId);
    const selectedClass =
      attendanceForm.classId && attendanceForm.classId !== "none"
        ? visibleClasses.find((item) => item.id === Number(attendanceForm.classId)) ?? null
        : null;

    if (!student) {
      errors.studentId = "Selecciona un alumno valido dentro del alcance actual.";
    }
    if (student && attendanceForm.branchId && student.branch_id !== selectedBranchId) {
      errors.branchId = "La asistencia debe registrarse en la sucursal asignada al alumno.";
    }
    if (attendanceForm.classId !== "none") {
      if (!selectedClass) {
        errors.classId = "Selecciona una clase valida.";
      } else if (!selectedClass.is_active) {
        errors.classId = "No puedes registrar asistencia en una clase inactiva.";
      } else if (selectedClass.branch_id !== selectedBranchId) {
        errors.classId = "La clase seleccionada no pertenece a la sucursal elegida.";
      }
    }

    setAttendanceErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    if (attendanceDialogMode === "create") {
      createAttendanceMutation.mutate(buildAttendanceCreatePayload(attendanceForm, user?.id ?? null));
      return;
    }

    if (editingAttendance) {
      updateAttendanceMutation.mutate({
        attendanceId: editingAttendance.id,
        payload: buildAttendanceUpdatePayload(attendanceForm, user?.id ?? null),
      });
    }
  }

  function handleAttendanceDelete() {
    if (!editingAttendance) {
      return;
    }

    setDestructiveAction({
      title: "Eliminar asistencia",
      description: "Esta asistencia desaparecera del historial operativo visible en el dashboard. Confirma solo si se registro por error.",
      confirmLabel: "Si, eliminar",
      onConfirm: () => deleteAttendanceMutation.mutate(editingAttendance.id),
    });
  }

  function handleCloseDestructiveAction() {
    if (!destructiveActionBusy) {
      setDestructiveAction(null);
    }
  }

  const organizationBusy = organizationMutation.isPending;
  const branchBusy =
    createBranchMutation.isPending || updateBranchMutation.isPending || deactivateBranchMutation.isPending;
  const classBusy =
    createClassMutation.isPending ||
    updateClassMutation.isPending ||
    deactivateClassMutation.isPending ||
    ensureDisciplinesMutation.isPending;
  const attendanceBusy =
    createAttendanceMutation.isPending ||
    updateAttendanceMutation.isPending ||
    deleteAttendanceMutation.isPending;
  const paymentBusy =
    createPaymentMutation.isPending ||
    updatePaymentMutation.isPending ||
    voidPaymentMutation.isPending;
  const destructiveActionBusy =
    deactivateBranchMutation.isPending ||
    deactivateClassMutation.isPending ||
    voidPaymentMutation.isPending ||
    deleteAttendanceMutation.isPending;

  return (
    <Screen scrollable contentStyle={styles.screenContent}>
      <AdminShell
        activeSection="dashboard"
        headerActions={
          <View style={styles.headerActionGroup}>
            {canCreateBranches ? (
              <AppButton label="Nueva sucursal" onPress={openCreateBranchModal} variant="secondary" />
            ) : null}
            <AppButton label="Ver alumnos" onPress={() => navigation.navigate("StudentsList")} />
          </View>
        }
        onGoDashboard={() => navigation.navigate("AdminHome")}
        onGoStudents={() => navigation.navigate("StudentsList")}
        subtitle="Gestiona alumnos, sucursales y datos operativos del gimnasio desde un panel pensado para la operacion diaria."
        title="Resumen del gimnasio"
      >
        <View style={styles.container}>
          <AppCard style={[styles.heroCard, isDesktop ? desktopStyles.heroCard : mobileStyles.heroCard]}>
            <View style={[styles.heroTop, isDesktop ? desktopStyles.heroTop : mobileStyles.heroTop]}>
              <View style={styles.heroCopy}>
                <AppBadge label="Resumen operativo" tone="info" />
                <Text style={styles.title}>{organization?.name ?? "Visibilidad rapida del gimnasio"}</Text>
                <Text style={styles.subtitle}>
                  El dashboard ya funciona como centro operativo: desde aqui puedes editar la informacion del gimnasio,
                  administrar sucursales y disparar el CRUD de alumnos sin salir del panel.
                </Text>
              </View>
              <View style={styles.heroActions}>
                <AppButton label="Nuevo alumno" onPress={() => navigation.navigate("StudentsList", { openCreate: true })} />
                {canManageOrganization && organization ? (
                  <AppButton label="Editar gimnasio" onPress={openOrganizationModal} variant="secondary" />
                ) : null}
              </View>
            </View>

            {isDesktop ? (
              <View style={[styles.scopeRow, desktopStyles.scopeRow]}>
                <View style={styles.scopeItem}>
                  <Text style={styles.scopeLabel}>Canal actual</Text>
                  <Text style={styles.scopeValue}>Web responsive</Text>
                </View>
                <View style={styles.scopeItem}>
                  <Text style={styles.scopeLabel}>Rol activo</Text>
                  <Text style={styles.scopeValue}>{user?.role === "org_admin" ? "Org admin" : "Branch admin"}</Text>
                </View>
                <View style={styles.scopeItem}>
                  <Text style={styles.scopeLabel}>Alcance</Text>
                  <Text style={styles.scopeValue}>{scopedBranchId ? "Sucursal" : "Organizacion"}</Text>
                </View>
              </View>
            ) : null}
          </AppCard>

          {feedback ? (
            <View style={[styles.feedbackBanner, feedback.tone === "danger" ? styles.feedbackDanger : styles.feedbackSuccess]}>
              <Text style={[styles.feedbackText, feedback.tone === "danger" ? styles.feedbackTextDanger : null]}>
                {feedback.message}
              </Text>
            </View>
          ) : null}

          {isLoading ? (
            <StatusView
              title="Cargando panel"
              description="Obteniendo alumnos, sucursales y datos operativos de tu organizacion."
              loading
            />
          ) : hasError ? (
            <AppCard>
              <StatusView title="No pudimos cargar el panel" description={getErrorMessage(dashboardError)} />
              <AppButton
                label="Reintentar"
                onPress={() => {
                  void studentsQuery.refetch();
                  void classesQuery.refetch();
                  void organizationQuery.refetch();
                  void branchesQuery.refetch();
                  void disciplinesQuery.refetch();
                  void paymentsQuery.refetch();
                  void attendanceQuery.refetch();
                }}
              />
            </AppCard>
          ) : (
            <>
              <View style={[styles.metricsGrid, isDesktop ? desktopStyles.metricsGrid : mobileStyles.metricsGrid]}>
                <MetricCard label="Alumnos activos" value={String(activeStudents)} tone="success" />
                <MetricCard label="Sucursales activas" value={String(activeBranches)} tone="info" />
                <MetricCard label="Clases activas" value={String(activeClasses)} tone="neutral" />
                <MetricCard label="Pagos vencidos" value={String(latePayments)} tone={latePayments > 0 ? "danger" : "neutral"} />
                <MetricCard label="Asistencias hoy" value={String(todayAttendanceCount)} tone="info" />
              </View>

              <View style={[styles.contentGrid, isDesktop ? desktopStyles.contentGrid : mobileStyles.contentGrid]}>
                <AppCard style={styles.panelCard}>
                  <Text style={styles.sectionTitle}>Centro CRUD</Text>
                  <QuickAction
                    description="Abre el padron para buscar, crear, editar o eliminar alumnos del gimnasio."
                    label="Administrar alumnos"
                    onPress={() => navigation.navigate("StudentsList")}
                  />
                  <QuickAction
                    description="Inicia el alta de un alumno nuevo y confirma sus datos antes de guardarlo."
                    label="Nuevo alumno"
                    onPress={() => navigation.navigate("StudentsList", { openCreate: true })}
                  />
                  <QuickAction
                    description={
                      canManageOrganization
                        ? "Edita nombre comercial, slug y estado operativo de la organizacion."
                        : "Disponible solo para org admin. Tu rol si puede operar la sucursal asignada."
                    }
                    label="Editar gimnasio"
                    onPress={openOrganizationModal}
                    disabled={!canManageOrganization || !organization}
                  />
                  <QuickAction
                    description={
                      canCreateBranches
                        ? "Da de alta una sucursal nueva ligada a esta organizacion."
                        : "La creacion de sucursales esta disponible solo para org admin."
                    }
                    label="Nueva sucursal"
                    onPress={openCreateBranchModal}
                    disabled={!canCreateBranches || !organizationId}
                  />
                  <QuickAction
                    description="Abre la ficha operativa de tu sucursal para actualizar ubicacion, zona horaria o estado."
                    label="Editar mi sucursal"
                    onPress={() => {
                      if (currentBranch) {
                        openEditBranchModal(currentBranch);
                      }
                    }}
                    disabled={!currentBranch || !canEditVisibleBranches}
                  />
                  <QuickAction
                    description="Crea, edita o desactiva clases usando las disciplinas MMA, BJJ y JUDO."
                    label="Nueva clase"
                    onPress={openCreateClassModal}
                    disabled={visibleBranches.length === 0 || disciplineOptions.length === 0}
                  />
                  <QuickAction
                    description="Registra, corrige o anula pagos de alumnos dentro del alcance actual."
                    label="Registrar pago"
                    onPress={openCreatePaymentModal}
                    disabled={visibleStudents.length === 0}
                  />
                  <QuickAction
                    description="Registra, corrige o elimina asistencias manuales por alumno y clase."
                    label="Registrar asistencia"
                    onPress={openCreateAttendanceModal}
                    disabled={visibleStudents.length === 0}
                  />
                </AppCard>

                <AppCard style={styles.panelCard}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.sectionTitle}>Gimnasio-academia</Text>
                    <AppBadge label={organization?.is_active ? "Activa" : "Inactiva"} tone={organization?.is_active ? "success" : "warning"} />
                  </View>
                  {organization ? (
                    <>
                      <EntityField label="Nombre" value={organization.name} />
                      <EntityField label="Slug" value={organization.slug} />
                      <EntityField label="Alcance actual" value={scopedBranchId ? "Administracion por sucursal" : "Administracion de organizacion"} />
                      {canManageOrganization ? (
                        <AppButton label="Editar datos del gimnasio" onPress={openOrganizationModal} variant="secondary" />
                      ) : (
                        <Text style={styles.helperText}>
                          Tu rol puede operar la sucursal asignada, pero no editar la configuracion global del gimnasio.
                        </Text>
                      )}
                    </>
                  ) : (
                    <View style={styles.emptyBlock}>
                      <Text style={styles.emptyTitle}>Sin organizacion cargada</Text>
                      <Text style={styles.emptyDescription}>
                        Cuando la API devuelva la organizacion asignada, podras editarla desde este panel.
                      </Text>
                    </View>
                  )}
                </AppCard>

                <AppCard style={styles.panelCard}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.sectionTitle}>Sucursales</Text>
                    {canCreateBranches ? (
                      <AppButton label="Agregar sucursal" onPress={openCreateBranchModal} variant="secondary" />
                    ) : null}
                  </View>
                  {visibleBranches.length > 0 ? (
                    visibleBranches.map((branch) => (
                      <View key={branch.id} style={styles.branchRow}>
                        <View style={styles.branchCopy}>
                          <View style={styles.branchTitleRow}>
                            <Text style={styles.branchName}>{branch.name}</Text>
                            <AppBadge label={branch.is_active ? "Activa" : "Inactiva"} tone={branch.is_active ? "success" : "warning"} />
                          </View>
                          <Text style={styles.branchMeta}>{`${branch.city}, ${branch.state} / ${branch.country}`}</Text>
                          <Text style={styles.branchMeta}>{branch.address}</Text>
                          <Text style={styles.branchMeta}>Zona horaria: {branch.timezone}</Text>
                        </View>
                        <View style={styles.branchActions}>
                          <AppButton label="Editar" onPress={() => openEditBranchModal(branch)} variant="secondary" />
                          {canDeactivateBranches && branch.is_active ? (
                            <AppButton label="Desactivar" onPress={() => openEditBranchModal(branch)} variant="danger" />
                          ) : null}
                        </View>
                      </View>
                    ))
                  ) : (
                    <View style={styles.emptyBlock}>
                      <Text style={styles.emptyTitle}>Sin sucursales registradas</Text>
                      <Text style={styles.emptyDescription}>
                        Da de alta tu primera sucursal para poder operar alumnos, clases y asistencia en este panel.
                      </Text>
                    </View>
                  )}
                </AppCard>

                <AppCard style={styles.panelCard}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.sectionTitle}>Asistencias</Text>
                    <AppButton
                      label="Agregar asistencia"
                      onPress={openCreateAttendanceModal}
                      variant="secondary"
                      disabled={visibleStudents.length === 0}
                    />
                  </View>
                  <View style={styles.paymentSummaryRow}>
                    <AppBadge label={`${visibleAttendanceRecords.length} registros`} tone="neutral" />
                    <AppBadge label={`${todayAttendanceCount} hoy`} tone={todayAttendanceCount > 0 ? "success" : "neutral"} />
                  </View>
                  {visibleAttendanceRecords.length > 0 ? (
                    visibleAttendanceRecords.slice(0, 8).map((attendance) => {
                      const student =
                        visibleStudents.find((item) => item.id === attendance.student_id) ?? null;
                      const classItem =
                        visibleClasses.find((item) => item.id === attendance.class_id) ?? null;
                      const branchName =
                        visibleBranches.find((branch) => branch.id === attendance.branch_id)?.name ??
                        `Sucursal ${attendance.branch_id}`;

                      return (
                        <View key={attendance.id} style={styles.attendanceRow}>
                          <View style={styles.attendanceHeaderRow}>
                            <View style={styles.attendanceCopy}>
                              <Text style={styles.attendanceTitle}>
                                {student
                                  ? `${student.first_name} ${student.last_name}`
                                  : `Alumno ${attendance.student_id}`}
                              </Text>
                              <Text style={styles.attendanceMeta}>
                                {student ? `${student.unique_code} · ${branchName}` : branchName}
                              </Text>
                            </View>
                            <AppBadge
                              label={formatAttendanceMethod(attendance.method)}
                              tone={attendance.method === "qr" ? "info" : "neutral"}
                            />
                          </View>
                          <View style={styles.paymentMetaGrid}>
                            <EntityField label="Check-in" value={formatDateTime(attendance.check_in_at)} />
                            <EntityField label="Clase" value={classItem?.name ?? "Sin clase"} />
                          </View>
                          <View style={styles.branchActions}>
                            <AppButton label="Editar" onPress={() => openEditAttendanceModal(attendance)} variant="secondary" />
                            <AppButton label="Eliminar" onPress={() => openEditAttendanceModal(attendance)} variant="danger" />
                          </View>
                        </View>
                      );
                    })
                  ) : (
                    <View style={styles.emptyBlock}>
                      <Text style={styles.emptyTitle}>Sin asistencias registradas</Text>
                      <Text style={styles.emptyDescription}>
                        Registra la primera asistencia del dia para empezar a construir el historial operativo.
                      </Text>
                    </View>
                  )}
                </AppCard>

                <AppCard style={styles.panelCard}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.sectionTitle}>Pagos</Text>
                    <AppButton
                      label="Agregar pago"
                      onPress={openCreatePaymentModal}
                      variant="secondary"
                      disabled={visibleStudents.length === 0}
                    />
                  </View>
                  <View style={styles.paymentSummaryRow}>
                    <AppBadge label={`${visiblePayments.length} movimientos`} tone="neutral" />
                    <AppBadge
                      label={`${pendingPayments} pendientes`}
                      tone={pendingPayments > 0 ? "warning" : "success"}
                    />
                  </View>
                  {visiblePayments.length > 0 ? (
                    visiblePayments.slice(0, 6).map((payment) => {
                      const student =
                        visibleStudents.find((item) => item.id === payment.student_id) ?? null;
                      const branchName =
                        visibleBranches.find((branch) => branch.id === payment.branch_id)?.name ??
                        `Sucursal ${payment.branch_id}`;

                      return (
                        <View key={payment.id} style={styles.paymentRow}>
                          <View style={styles.paymentHeaderRow}>
                            <View style={styles.paymentAmountBlock}>
                              <Text style={styles.paymentAmount}>
                                {formatCurrency(payment.amount, payment.currency)}
                              </Text>
                              <Text style={styles.paymentMeta}>
                                {student
                                  ? `${student.first_name} ${student.last_name} · ${student.unique_code}`
                                  : `Alumno ${payment.student_id}`}
                              </Text>
                            </View>
                            <AppBadge
                              label={formatPaymentRecordStatus(payment.status)}
                              tone={getPaymentRecordTone(payment.status)}
                            />
                          </View>
                          <View style={styles.paymentMetaGrid}>
                            <EntityField label="Fecha" value={formatDateTime(payment.paid_at)} />
                            <EntityField label="Metodo" value={formatPaymentMethod(payment.method)} />
                            <EntityField label="Sucursal" value={branchName} />
                            <EntityField
                              label="Periodo"
                              value={`${formatDate(payment.period_start)} - ${formatDate(payment.period_end)}`}
                            />
                          </View>
                          {payment.notes ? <Text style={styles.paymentNote}>Notas: {payment.notes}</Text> : null}
                          <View style={styles.branchActions}>
                            <AppButton label="Editar" onPress={() => openEditPaymentModal(payment)} variant="secondary" />
                            {payment.status !== "void" ? (
                              <AppButton label="Anular" onPress={() => openEditPaymentModal(payment)} variant="danger" />
                            ) : null}
                          </View>
                        </View>
                      );
                    })
                  ) : (
                    <View style={styles.emptyBlock}>
                      <Text style={styles.emptyTitle}>Sin pagos registrados</Text>
                      <Text style={styles.emptyDescription}>
                        Registra el primer pago del periodo para que el dashboard empiece a mostrar historial financiero.
                      </Text>
                    </View>
                  )}
                </AppCard>

                <AppCard style={styles.panelCard}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.sectionTitle}>Clases</Text>
                    <AppButton
                      label="Agregar clase"
                      onPress={openCreateClassModal}
                      variant="secondary"
                      disabled={visibleBranches.length === 0 || disciplineOptions.length === 0}
                    />
                  </View>
                  {ensureDisciplinesMutation.isPending ? (
                    <Text style={styles.helperText}>Preparando disciplinas MMA, BJJ y JUDO para esta organizacion.</Text>
                  ) : null}
                  {visibleClasses.length > 0 ? (
                    visibleClasses.map((classItem) => {
                      const branchName =
                        visibleBranches.find((branch) => branch.id === classItem.branch_id)?.name ??
                        `Sucursal ${classItem.branch_id}`;
                      const disciplineName =
                        classItem.discipline_name ??
                        disciplines.find((discipline) => discipline.id === classItem.discipline_id)?.name ??
                        `Disciplina ${classItem.discipline_id}`;

                      return (
                        <View key={classItem.id} style={styles.classPanelRow}>
                          <View style={styles.classCopy}>
                            <View style={styles.classTitleRow}>
                              <Text style={styles.className}>{classItem.name}</Text>
                              <AppBadge
                                label={classItem.is_active ? "Activa" : "Inactiva"}
                                tone={classItem.is_active ? "success" : "warning"}
                              />
                            </View>
                            <Text style={styles.classMeta}>{`Disciplina: ${disciplineName}`}</Text>
                            <Text style={styles.classMeta}>{`Sucursal: ${branchName}`}</Text>
                            <Text style={styles.classMeta}>
                              {classItem.instructor_name ? `Instructor: ${classItem.instructor_name}` : "Instructor pendiente"}
                            </Text>
                            <Text style={styles.classMeta}>
                              {classItem.capacity ? `Capacidad: ${classItem.capacity} cupos` : "Capacidad sin definir"}
                            </Text>
                            {classItem.description ? <Text style={styles.classMeta}>{classItem.description}</Text> : null}
                          </View>
                          <View style={styles.branchActions}>
                            <AppButton label="Editar" onPress={() => openEditClassModal(classItem)} variant="secondary" />
                            {classItem.is_active ? (
                              <AppButton label="Desactivar" onPress={() => openEditClassModal(classItem)} variant="danger" />
                            ) : null}
                          </View>
                        </View>
                      );
                    })
                  ) : (
                    <View style={styles.emptyBlock}>
                      <Text style={styles.emptyTitle}>Sin clases registradas</Text>
                      <Text style={styles.emptyDescription}>
                        Crea tu primera clase desde aqui y asignale una disciplina entre MMA, BJJ o JUDO.
                      </Text>
                    </View>
                  )}
                </AppCard>
              </View>
            </>
          )}
        </View>
      </AdminShell>

      <AppModal
        visible={organizationModalVisible}
        title="Editar gimnasio-academia"
        description="Actualiza la configuracion general visible para la organizacion completa."
        onClose={() => {
          if (!organizationBusy) {
            setOrganizationModalVisible(false);
          }
        }}
      >
        <View style={[styles.formGrid, isDesktop ? desktopStyles.formGrid : null]}>
          <AppInput
            label="Nombre del gimnasio"
            value={organizationForm.name}
            onChangeText={(value) => setOrganizationForm((current) => ({ ...current, name: value }))}
            error={organizationErrors.name}
            editable={!organizationBusy}
          />
          <AppInput
            autoCapitalize="characters"
            label="Slug (3 letras)"
            maxLength={3}
            value={organizationForm.slug}
            onChangeText={(value) =>
              setOrganizationForm((current) => ({ ...current, slug: value.replace(/[^a-zA-Z]/g, "").toUpperCase() }))
            }
            error={organizationErrors.slug}
            editable={!organizationBusy}
          />
        </View>
        <AppSelect
          label="Estado"
          value={organizationForm.status}
          onValueChange={(value) =>
            setOrganizationForm((current) => ({ ...current, status: value as OrganizationStatusValue }))
          }
          items={STATUS_OPTIONS}
          error={organizationErrors.status}
          enabled={!organizationBusy}
        />
        <View style={[styles.modalActions, isDesktop ? desktopStyles.modalActions : null]}>
          <AppButton label="Cancelar" onPress={() => setOrganizationModalVisible(false)} variant="secondary" disabled={organizationBusy} />
          <AppButton label="Guardar cambios" onPress={handleOrganizationSave} loading={organizationBusy} />
        </View>
      </AppModal>

      <AppModal
        visible={branchModalVisible}
        title={branchDialogMode === "create" ? "Nueva sucursal" : "Editar sucursal"}
        description={
          branchDialogMode === "create"
            ? "Completa los datos base para operar la sucursal dentro del dashboard."
            : "Actualiza datos operativos de la sucursal seleccionada."
        }
        onClose={() => {
          if (!branchBusy) {
            setBranchModalVisible(false);
          }
        }}
      >
        <View style={[styles.formGrid, isDesktop ? desktopStyles.formGrid : null]}>
          <AppInput
            label="Nombre de la sucursal"
            value={branchForm.name}
            onChangeText={(value) => setBranchForm((current) => ({ ...current, name: value }))}
            error={branchErrors.name}
            editable={!branchBusy}
          />
          <AppInput
            label="Pais"
            value={branchForm.country}
            onChangeText={(value) => setBranchForm((current) => ({ ...current, country: value }))}
            error={branchErrors.country}
            editable={!branchBusy}
          />
          <AppInput
            label="Estado"
            value={branchForm.state}
            onChangeText={(value) => setBranchForm((current) => ({ ...current, state: value }))}
            error={branchErrors.state}
            editable={!branchBusy}
          />
          <AppInput
            label="Ciudad"
            value={branchForm.city}
            onChangeText={(value) => setBranchForm((current) => ({ ...current, city: value }))}
            error={branchErrors.city}
            editable={!branchBusy}
          />
        </View>
        <AppInput
          label="Direccion"
          value={branchForm.address}
          onChangeText={(value) => setBranchForm((current) => ({ ...current, address: value }))}
          error={branchErrors.address}
          editable={!branchBusy}
        />
        <View style={[styles.formGrid, isDesktop ? desktopStyles.formGrid : null]}>
          <AppInput
            label="Zona horaria"
            value={branchForm.timezone}
            onChangeText={(value) => setBranchForm((current) => ({ ...current, timezone: value }))}
            error={branchErrors.timezone}
            editable={!branchBusy}
          />
          <AppInput
            label="Clave QR"
            value={branchForm.qrSecret}
            onChangeText={(value) => setBranchForm((current) => ({ ...current, qrSecret: value }))}
            error={branchErrors.qrSecret}
            editable={!branchBusy}
          />
        </View>
        <View style={[styles.formGrid, isDesktop ? desktopStyles.formGrid : null]}>
          <AppSelect
            label="Estado"
            value={branchForm.status}
            onValueChange={(value) => setBranchForm((current) => ({ ...current, status: value as BranchStatusValue }))}
            items={STATUS_OPTIONS}
            enabled={!branchBusy}
          />
          <View style={styles.inlineButtonSlot}>
            <AppButton
              label="Generar nueva clave"
              onPress={() => setBranchForm((current) => ({ ...current, qrSecret: createQrSecret() }))}
              variant="secondary"
              disabled={branchBusy}
            />
          </View>
        </View>
        <View style={[styles.modalActions, isDesktop ? desktopStyles.modalActions : null]}>
          {branchDialogMode === "edit" && editingBranch && canDeactivateBranches && editingBranch.is_active ? (
            <AppButton label="Desactivar sucursal" onPress={handleBranchDeactivate} variant="danger" loading={deactivateBranchMutation.isPending} />
          ) : null}
          <View style={styles.modalPrimaryActions}>
            <AppButton label="Cancelar" onPress={() => setBranchModalVisible(false)} variant="secondary" disabled={branchBusy} />
            <AppButton
              label={branchDialogMode === "create" ? "Crear sucursal" : "Guardar cambios"}
              onPress={handleBranchSave}
              loading={createBranchMutation.isPending || updateBranchMutation.isPending}
            />
          </View>
        </View>
      </AppModal>

      <AppModal
        visible={attendanceModalVisible}
        title={attendanceDialogMode === "create" ? "Registrar asistencia" : "Editar asistencia"}
        description="Gestiona el check-in manual del alumno dentro del dashboard."
        onClose={() => {
          if (!attendanceBusy) {
            setAttendanceModalVisible(false);
          }
        }}
      >
        <View style={[styles.formGrid, isDesktop ? desktopStyles.formGrid : null]}>
          <AppSelect
            label="Alumno"
            value={attendanceForm.studentId}
            onValueChange={(value) => setAttendanceForm((current) => ({ ...current, studentId: value }))}
            items={studentOptions}
            error={attendanceErrors.studentId}
            enabled={!attendanceBusy}
          />
          <AppSelect
            label="Metodo"
            value={attendanceForm.method}
            onValueChange={(value) => setAttendanceForm((current) => ({ ...current, method: value as AttendanceMethod }))}
            items={ATTENDANCE_METHOD_OPTIONS}
            enabled={!attendanceBusy}
          />
        </View>
        <View style={[styles.formGrid, isDesktop ? desktopStyles.formGrid : null]}>
          <AppSelect
            label="Sucursal"
            value={attendanceForm.branchId}
            onValueChange={(value) =>
              setAttendanceForm((current) => ({
                ...current,
                branchId: value,
                classId: current.classId === "none" ? "none" : "",
              }))
            }
            items={attendanceBranchOptions}
            error={attendanceErrors.branchId}
            enabled={!attendanceBusy}
          />
          <AppSelect
            label="Clase"
            value={attendanceForm.classId}
            onValueChange={(value) => setAttendanceForm((current) => ({ ...current, classId: value }))}
            items={attendanceClassOptions}
            error={attendanceErrors.classId}
            enabled={!attendanceBusy}
          />
        </View>
        <View style={[styles.formGrid, isDesktop ? desktopStyles.formGrid : null]}>
          <AppDateInput
            label="Fecha"
            value={attendanceForm.checkInDate}
            onChangeText={(value) => setAttendanceForm((current) => ({ ...current, checkInDate: value }))}
            error={attendanceErrors.checkInDate}
            editable={!attendanceBusy}
          />
          <AppInput
            label="Hora"
            placeholder="HH:MM"
            value={attendanceForm.checkInTime}
            onChangeText={(value) => setAttendanceForm((current) => ({ ...current, checkInTime: value }))}
            error={attendanceErrors.checkInTime}
            editable={!attendanceBusy}
          />
        </View>
        {selectedAttendanceStudent ? (
          <View style={styles.paymentContextBox}>
            <Text style={styles.paymentContextText}>
              {`Alumno: ${selectedAttendanceStudent.first_name} ${selectedAttendanceStudent.last_name}`}
            </Text>
            <Text style={styles.paymentContextText}>
              {`Sucursal asignada: ${
                visibleBranches.find((item) => item.id === selectedAttendanceStudent.branch_id)?.name ??
                `Sucursal ${selectedAttendanceStudent.branch_id}`
              }`}
            </Text>
            <Text style={styles.paymentContextText}>
              {`Clase principal: ${
                visibleClasses.find((item) => item.id === selectedAttendanceStudent.primary_class_id)?.name ??
                "Sin clase principal"
              }`}
            </Text>
          </View>
        ) : null}
        <View style={[styles.modalActions, isDesktop ? desktopStyles.modalActions : null]}>
          {attendanceDialogMode === "edit" && editingAttendance ? (
            <AppButton
              label="Eliminar asistencia"
              onPress={handleAttendanceDelete}
              variant="danger"
              loading={deleteAttendanceMutation.isPending}
            />
          ) : null}
          <View style={styles.modalPrimaryActions}>
            <AppButton
              label="Cancelar"
              onPress={() => setAttendanceModalVisible(false)}
              variant="secondary"
              disabled={attendanceBusy}
            />
            <AppButton
              label={attendanceDialogMode === "create" ? "Registrar asistencia" : "Guardar cambios"}
              onPress={handleAttendanceSave}
              loading={createAttendanceMutation.isPending || updateAttendanceMutation.isPending}
            />
          </View>
        </View>
      </AppModal>

      <AppModal
        visible={classModalVisible}
        title={classDialogMode === "create" ? "Nueva clase" : "Editar clase"}
        description="Configura la clase, su disciplina y la sucursal donde se impartira."
        onClose={() => {
          if (!classBusy) {
            setClassModalVisible(false);
          }
        }}
      >
        <View style={[styles.formGrid, isDesktop ? desktopStyles.formGrid : null]}>
          <AppSelect
            label="Sucursal"
            value={classForm.branchId}
            onValueChange={(value) => setClassForm((current) => ({ ...current, branchId: value }))}
            items={branchOptions}
            error={classErrors.branchId}
            enabled={!classBusy}
          />
          <AppSelect
            label="Disciplina"
            value={classForm.disciplineId}
            onValueChange={(value) => setClassForm((current) => ({ ...current, disciplineId: value }))}
            items={disciplineOptions}
            error={classErrors.disciplineId}
            enabled={!classBusy}
          />
        </View>
        <View style={[styles.formGrid, isDesktop ? desktopStyles.formGrid : null]}>
          <AppInput
            label="Nombre de la clase"
            value={classForm.name}
            onChangeText={(value) => setClassForm((current) => ({ ...current, name: value }))}
            error={classErrors.name}
            editable={!classBusy}
          />
          <AppInput
            label="Instructor"
            value={classForm.instructorName}
            onChangeText={(value) => setClassForm((current) => ({ ...current, instructorName: value }))}
            editable={!classBusy}
          />
        </View>
        <View style={[styles.formGrid, isDesktop ? desktopStyles.formGrid : null]}>
          <AppInput
            label="Capacidad"
            keyboardType="numeric"
            value={classForm.capacity}
            onChangeText={(value) => setClassForm((current) => ({ ...current, capacity: value }))}
            error={classErrors.capacity}
            editable={!classBusy}
          />
          <AppSelect
            label="Estado"
            value={classForm.status}
            onValueChange={(value) => setClassForm((current) => ({ ...current, status: value as ClassStatusValue }))}
            items={STATUS_OPTIONS}
            enabled={!classBusy}
          />
        </View>
        <AppInput
          label="Descripcion"
          multiline
          numberOfLines={4}
          value={classForm.description}
          onChangeText={(value) => setClassForm((current) => ({ ...current, description: value }))}
          editable={!classBusy}
          style={styles.multilineInput}
        />
        <View style={[styles.modalActions, isDesktop ? desktopStyles.modalActions : null]}>
          {classDialogMode === "edit" && editingClass && editingClass.is_active ? (
            <AppButton label="Desactivar clase" onPress={handleClassDeactivate} variant="danger" loading={deactivateClassMutation.isPending} />
          ) : null}
          <View style={styles.modalPrimaryActions}>
            <AppButton label="Cancelar" onPress={() => setClassModalVisible(false)} variant="secondary" disabled={classBusy} />
            <AppButton
              label={classDialogMode === "create" ? "Crear clase" : "Guardar cambios"}
              onPress={handleClassSave}
              loading={createClassMutation.isPending || updateClassMutation.isPending}
            />
          </View>
        </View>
      </AppModal>

      <AppModal
        visible={paymentModalVisible}
        title={paymentDialogMode === "create" ? "Registrar pago" : "Editar pago"}
        description="Gestiona el pago de un alumno sin salir del dashboard."
        onClose={() => {
          if (!paymentBusy) {
            setPaymentModalVisible(false);
          }
        }}
      >
        <View style={[styles.formGrid, isDesktop ? desktopStyles.formGrid : null]}>
          <AppSelect
            label="Alumno"
            value={paymentForm.studentId}
            onValueChange={(value) => setPaymentForm((current) => ({ ...current, studentId: value }))}
            items={studentOptions}
            error={paymentErrors.studentId}
            enabled={!paymentBusy}
          />
          <AppInput
            autoCapitalize="characters"
            label="Moneda"
            maxLength={3}
            value={paymentForm.currency}
            onChangeText={(value) => setPaymentForm((current) => ({ ...current, currency: value.toUpperCase() }))}
            error={paymentErrors.currency}
            editable={!paymentBusy}
          />
        </View>
        <View style={[styles.formGrid, isDesktop ? desktopStyles.formGrid : null]}>
          <AppInput
            label="Monto"
            keyboardType="decimal-pad"
            value={paymentForm.amount}
            onChangeText={(value) => setPaymentForm((current) => ({ ...current, amount: value }))}
            error={paymentErrors.amount}
            editable={!paymentBusy}
          />
          <AppSelect
            label="Metodo"
            value={paymentForm.method}
            onValueChange={(value) => setPaymentForm((current) => ({ ...current, method: value as PaymentMethod }))}
            items={PAYMENT_METHOD_OPTIONS}
            enabled={!paymentBusy}
          />
        </View>
        <View style={[styles.formGrid, isDesktop ? desktopStyles.formGrid : null]}>
          <AppDateInput
            label="Periodo inicial"
            value={paymentForm.periodStart}
            onChangeText={(value) => setPaymentForm((current) => ({ ...current, periodStart: value }))}
            error={paymentErrors.periodStart}
            editable={!paymentBusy}
          />
          <AppDateInput
            label="Periodo final"
            value={paymentForm.periodEnd}
            onChangeText={(value) => setPaymentForm((current) => ({ ...current, periodEnd: value }))}
            error={paymentErrors.periodEnd}
            editable={!paymentBusy}
          />
        </View>
        <View style={[styles.formGrid, isDesktop ? desktopStyles.formGrid : null]}>
          <AppDateInput
            label="Fecha de pago"
            value={paymentForm.paidDate}
            onChangeText={(value) => setPaymentForm((current) => ({ ...current, paidDate: value }))}
            error={paymentErrors.paidDate}
            editable={!paymentBusy}
          />
          <AppSelect
            label="Estado"
            value={paymentForm.status}
            onValueChange={(value) => setPaymentForm((current) => ({ ...current, status: value as PaymentRecordStatus }))}
            items={PAYMENT_RECORD_STATUS_OPTIONS}
            error={paymentErrors.status}
            enabled={!paymentBusy}
          />
        </View>
        {selectedPaymentStudent ? (
          <View style={styles.paymentContextBox}>
            <Text style={styles.paymentContextText}>
              {`Alumno: ${selectedPaymentStudent.first_name} ${selectedPaymentStudent.last_name}`}
            </Text>
            <Text style={styles.paymentContextText}>
              {`Mensualidad sugerida: ${formatCurrency(selectedPaymentStudent.monthly_fee, selectedPaymentStudent.currency)}`}
            </Text>
            <Text style={styles.paymentContextText}>
              {`Proximo pago actual: ${formatDate(selectedPaymentStudent.next_payment_date)}`}
            </Text>
          </View>
        ) : null}
        <AppInput
          label="Notas"
          multiline
          numberOfLines={4}
          value={paymentForm.notes}
          onChangeText={(value) => setPaymentForm((current) => ({ ...current, notes: value }))}
          error={paymentErrors.notes}
          editable={!paymentBusy}
          style={styles.multilineInput}
        />
        <View style={[styles.modalActions, isDesktop ? desktopStyles.modalActions : null]}>
          {paymentDialogMode === "edit" && editingPayment && editingPayment.status !== "void" ? (
            <AppButton
              label="Anular pago"
              onPress={handlePaymentVoid}
              variant="danger"
              loading={voidPaymentMutation.isPending}
            />
          ) : null}
          <View style={styles.modalPrimaryActions}>
            <AppButton label="Cancelar" onPress={() => setPaymentModalVisible(false)} variant="secondary" disabled={paymentBusy} />
            <AppButton
              label={paymentDialogMode === "create" ? "Registrar pago" : "Guardar cambios"}
              onPress={handlePaymentSave}
              loading={createPaymentMutation.isPending || updatePaymentMutation.isPending}
            />
          </View>
        </View>
      </AppModal>

      <AppModal
        visible={Boolean(destructiveAction)}
        title={destructiveAction?.title ?? ""}
        description={destructiveAction?.description}
        onClose={handleCloseDestructiveAction}
      >
        <View style={styles.destructiveActionBody}>
          <Text style={styles.destructiveActionHint}>
            Esta accion es sensible. Confirma solo si ya verificaste dependencias, impacto operativo y trazabilidad.
          </Text>
          <View style={[styles.modalActions, isDesktop ? desktopStyles.modalActions : null]}>
            <AppButton
              label="Cancelar"
              onPress={handleCloseDestructiveAction}
              variant="secondary"
              disabled={destructiveActionBusy}
            />
            <AppButton
              label={destructiveAction?.confirmLabel ?? "Confirmar"}
              onPress={() => destructiveAction?.onConfirm()}
              variant="danger"
              loading={destructiveActionBusy}
              disabled={!destructiveAction}
            />
          </View>
        </View>
      </AppModal>
    </Screen>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "neutral" | "success" | "danger" | "info";
}) {
  return (
    <AppCard style={styles.metricCard}>
      <AppBadge label={label} tone={tone} />
      <Text style={styles.metricValue}>{value}</Text>
    </AppCard>
  );
}

function EntityField({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.entityField}>
      <Text style={styles.entityFieldLabel}>{label}</Text>
      <Text style={styles.entityFieldValue}>{value}</Text>
    </View>
  );
}

function QuickAction({
  label,
  description,
  onPress,
  disabled = false,
}: {
  label: string;
  description: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickAction,
        disabled ? styles.quickActionDisabled : null,
        pressed && !disabled ? styles.quickActionPressed : null,
      ]}
    >
      <Text style={styles.quickActionTitle}>{label}</Text>
      <Text style={styles.quickActionDescription}>{description}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    flexGrow: 1,
  },
  container: {
    gap: spacing.md,
    width: "100%",
  },
  heroCard: {
    gap: spacing.lg,
    backgroundColor: colors.surfaceStrong,
    borderColor: "#2E241D",
  },
  heroTop: {
    gap: spacing.md,
  },
  heroCopy: {
    gap: spacing.sm,
  },
  heroActions: {
    gap: spacing.sm,
  },
  headerActionGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  title: {
    color: colors.surface,
    fontFamily: typography.headingFamily,
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  subtitle: {
    color: "#D1C2B5",
    fontFamily: typography.bodyFamily,
    fontSize: 15,
    lineHeight: 22,
  },
  scopeRow: {
    gap: spacing.md,
  },
  scopeItem: {
    backgroundColor: "#211812",
    borderRadius: radius.md,
    borderColor: "#30251D",
    borderWidth: 1,
    flex: 1,
    gap: 4,
    padding: spacing.md,
  },
  scopeLabel: {
    color: "#BCAEA2",
    fontFamily: typography.headingFamily,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  scopeValue: {
    color: colors.surface,
    fontFamily: typography.headingFamily,
    fontSize: 18,
    fontWeight: "800",
  },
  metricsGrid: {
    gap: spacing.md,
  },
  metricCard: {
    flex: 1,
    minHeight: 104,
    minWidth: 180,
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.borderStrong,
  },
  metricValue: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 38,
    fontWeight: "800",
  },
  contentGrid: {
    gap: spacing.md,
  },
  panelCard: {
    flex: 1,
    gap: spacing.md,
    minWidth: 280,
  },
  cardHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  helperText: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 20,
  },
  quickAction: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  quickActionDisabled: {
    opacity: 0.6,
  },
  quickActionPressed: {
    opacity: 0.85,
  },
  quickActionTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 16,
    fontWeight: "700",
  },
  quickActionDescription: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 20,
  },
  feedbackBanner: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  feedbackSuccess: {
    backgroundColor: colors.successSoft,
    borderColor: "#B7E4C7",
    borderWidth: 1,
  },
  feedbackDanger: {
    backgroundColor: colors.dangerSoft,
    borderColor: "#F0B6B6",
    borderWidth: 1,
  },
  feedbackText: {
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    fontWeight: "600",
  },
  feedbackTextDanger: {
    color: colors.danger,
  },
  entityField: {
    gap: 4,
  },
  entityFieldLabel: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  entityFieldValue: {
    color: colors.text,
    fontFamily: typography.bodyFamily,
    fontSize: 16,
    fontWeight: "700",
  },
  branchRow: {
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    backgroundColor: colors.surfaceAlt,
    gap: spacing.md,
    padding: spacing.md,
  },
  branchCopy: {
    gap: 4,
  },
  branchTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    justifyContent: "space-between",
  },
  branchName: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 16,
    fontWeight: "800",
  },
  branchMeta: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 19,
  },
  branchActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  paymentSummaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  paymentRow: {
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    backgroundColor: colors.surfaceAlt,
    gap: spacing.sm,
    padding: spacing.md,
  },
  paymentHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  paymentAmountBlock: {
    gap: 4,
  },
  paymentAmount: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 18,
    fontWeight: "800",
  },
  paymentMeta: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 19,
  },
  paymentMetaGrid: {
    gap: spacing.sm,
  },
  paymentNote: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 20,
  },
  paymentContextBox: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 4,
    padding: spacing.md,
  },
  paymentContextText: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 19,
  },
  attendanceRow: {
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    backgroundColor: colors.surfaceAlt,
    gap: spacing.sm,
    padding: spacing.md,
  },
  attendanceHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  attendanceCopy: {
    flex: 1,
    gap: 4,
  },
  attendanceTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 16,
    fontWeight: "700",
  },
  attendanceMeta: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 19,
  },
  classPanelRow: {
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    backgroundColor: colors.surfaceAlt,
    gap: spacing.sm,
    padding: spacing.md,
  },
  classCopy: {
    flex: 1,
    gap: 4,
  },
  classTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    justifyContent: "space-between",
  },
  className: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 16,
    fontWeight: "700",
  },
  classMeta: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 19,
  },
  emptyBlock: {
    gap: spacing.xs,
  },
  emptyTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 16,
    fontWeight: "700",
  },
  emptyDescription: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 20,
  },
  formGrid: {
    gap: spacing.md,
  },
  inlineButtonSlot: {
    justifyContent: "flex-end",
  },
  modalActions: {
    gap: spacing.sm,
  },
  modalPrimaryActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  multilineInput: {
    minHeight: 110,
    paddingTop: spacing.md,
    textAlignVertical: "top",
  },
  destructiveActionBody: {
    gap: spacing.md,
  },
  destructiveActionHint: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 20,
  },
});

const mobileStyles = StyleSheet.create({
  heroCard: {
    paddingBottom: spacing.lg,
  },
  heroTop: {
    flexDirection: "column",
  },
  scopeRow: {
    flexDirection: "column",
  },
  metricsGrid: {
    flexDirection: "column",
  },
  contentGrid: {
    flexDirection: "column",
  },
  modalActions: {
    flexDirection: "column",
  },
});

const desktopStyles = StyleSheet.create({
  heroCard: {
    padding: 28,
  },
  heroTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  scopeRow: {
    flexDirection: "row",
  },
  metricsGrid: {
    flexDirection: "row",
  },
  contentGrid: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
  },
  formGrid: {
    flexDirection: "row",
  },
  modalActions: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
