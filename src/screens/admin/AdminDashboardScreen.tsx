import { Feather } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Linking, Modal, Platform, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle, useWindowDimensions } from "react-native";

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
import { formatCurrency, formatDate, formatDateTime, formatPaymentMethod, formatPaymentRecordStatus, formatPaymentStatus } from "@/utils/format";
import { buildPublicAttendanceUrl } from "@/utils/publicAttendanceRoute";

import type { AdminDashboardSection, AdminStackParamList } from "@/navigation/types";
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
type TutorialStepId = "hero" | "crud" | "branches" | "attendance";
type TutorialStep = {
  id: TutorialStepId;
  title: string;
  description: string;
};
type TutorialAnchorFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
};

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
const FIRST_TIME_TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "hero",
    title: "Bienvenido a tu panel",
    description: "Aqui veras el estado general del dojo y los accesos principales para arrancar rapido.",
  },
  {
    id: "crud",
    title: "Administración General",
    description: "Desde este bloque puedes dar de alta alumnos, sucursales, clases, pagos y asistencias sin cambiar de vista.",
  },
  {
    id: "branches",
    title: "Configura tus sucursales",
    description: "Empieza creando o ajustando tu sede principal. Desde aqui tambien compartes la liga publica de asistencia.",
  },
  {
    id: "attendance",
    title: "Registra asistencias en segundos",
    description: "Cuando tengas alumnos activos, este bloque te deja cargar asistencias manuales y revisar los ultimos registros.",
  },
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

async function openPublicAttendancePage(organizationSlug: string, branchName: string): Promise<void> {
  const origin = "https://eldojo.tech";
  const path = buildPublicAttendanceUrl(origin, organizationSlug, branchName);

  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.open(path, "_blank", "noopener,noreferrer");
    return;
  }

  await Linking.openURL(path);
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

function getStudentPaymentStatusTone(status: Student["payment_status"]): "success" | "warning" | "danger" | "neutral" {
  switch (status) {
    case "up_to_date":
      return "success";
    case "due_soon":
    case "partial":
      return "warning";
    case "late":
    case "overdue":
      return "danger";
    case "waived":
      return "neutral";
    default:
      return "neutral";
  }
}

function formatStudentStatus(status: Student["status"]): string {
  switch (status) {
    case "active":
      return "Activo";
    case "frozen":
      return "Congelado";
    case "inactive":
      return "Inactivo";
    default:
      return status;
  }
}

function formatMonthYear(value: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    month: "long",
    year: "numeric",
  }).format(new Date(value));
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

export function AdminDashboardScreen({ navigation, route }: Props) {
  const { isDesktop, isMobile, width } = useResponsiveLayout();
  const { height: windowHeight } = useWindowDimensions();
  const isCompact = width < 480;
  const { completeFirstTimeTutorial, user } = useAuth();
  const queryClient = useQueryClient();
  const publicAttendanceOrigin = "https://eldojo.tech";
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
  const [selectedPaymentsStudent, setSelectedPaymentsStudent] = useState<Student | null>(null);
  const [paymentsBranchId, setPaymentsBranchId] = useState<string>(scopedBranchId ? String(scopedBranchId) : "");
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0);
  const [tutorialBusy, setTutorialBusy] = useState(false);
  const [tutorialAnchorFrame, setTutorialAnchorFrame] = useState<TutorialAnchorFrame | null>(null);
  const tutorialAnchorRefs = useRef<Record<TutorialStepId, View | null>>({
    attendance: null,
    branches: null,
    crud: null,
    hero: null,
  });

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

  const tutorialActive = user?.first_time === true;
  const activeTutorialStep = tutorialActive ? FIRST_TIME_TUTORIAL_STEPS[tutorialStepIndex] ?? null : null;

  useEffect(() => {
    if (feedback?.message !== "Tutorial cerrado. Ya puedes usar el panel libremente.") {
      return;
    }

    const timeoutId = setTimeout(() => {
      setFeedback((current) =>
        current?.message === "Tutorial cerrado. Ya puedes usar el panel libremente." ? null : current
      );
    }, 3500);

    return () => clearTimeout(timeoutId);
  }, [feedback]);

  useEffect(() => {
    if (tutorialActive) {
      setTutorialStepIndex(0);
      setTutorialBusy(false);
    }
  }, [tutorialActive]);

  const measureTutorialAnchor = useCallback((stepId: TutorialStepId) => {
    const anchor = tutorialAnchorRefs.current[stepId];

    if (!anchor) {
      return;
    }

    anchor.measureInWindow((x, y, measuredWidth, measuredHeight) => {
      if (measuredWidth <= 0 || measuredHeight <= 0) {
        return;
      }

      setTutorialAnchorFrame({
        height: measuredHeight,
        width: measuredWidth,
        x,
        y,
      });
    });
  }, []);

  const syncActiveTutorialAnchor = useCallback(
    (stepId: TutorialStepId | null) => {
      if (!stepId) {
        setTutorialAnchorFrame(null);
        return;
      }

      requestAnimationFrame(() => {
        measureTutorialAnchor(stepId);
      });
    },
    [measureTutorialAnchor],
  );

  useEffect(() => {
    syncActiveTutorialAnchor(activeTutorialStep?.id ?? null);
  }, [activeTutorialStep?.id, syncActiveTutorialAnchor, width, windowHeight]);

  const tutorialDialogStyle = useMemo<StyleProp<ViewStyle>>(() => {
    const sidePadding = spacing.md;
    const maxDialogWidth = Math.min(isDesktop ? 420 : 360, width - sidePadding * 2);

    if (!tutorialAnchorFrame) {
      return {
        left: sidePadding,
        top: 96,
        width: maxDialogWidth,
      };
    }

    const dialogWidth = Math.max(
      Math.min(tutorialAnchorFrame.width - spacing.sm, maxDialogWidth),
      Math.min(280, maxDialogWidth),
    );
    const left = Math.min(
      Math.max(tutorialAnchorFrame.x + spacing.sm, sidePadding),
      width - dialogWidth - sidePadding,
    );
    const top = Math.min(
      Math.max(tutorialAnchorFrame.y + spacing.sm, 88),
      Math.max(88, windowHeight - 260),
    );

    return {
      left,
      top,
      width: dialogWidth,
    };
  }, [isDesktop, tutorialAnchorFrame, width, windowHeight]);

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
      setFeedback({ tone: "success", message: "Los datos del dojo se actualizaron correctamente." });
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
  const sidebarSummary = useMemo(
    () => ({
      organizationName: organization?.name ?? null,
      suffix: organization?.slug ?? null,
      branchName: currentBranch?.name ?? visibleBranches[0]?.name ?? null,
      location: currentBranch
        ? [currentBranch.city, currentBranch.state, currentBranch.country].filter(Boolean).join(", ") || currentBranch.address
        : visibleBranches[0]
          ? [visibleBranches[0].city, visibleBranches[0].state, visibleBranches[0].country].filter(Boolean).join(", ") || visibleBranches[0].address
          : null,
      mainSchedule: null,
    }),
    [currentBranch, organization?.name, organization?.slug, visibleBranches]
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
  const selectedPaymentsBranchId = scopedBranchId ?? (paymentsBranchId ? Number(paymentsBranchId) : null);
  const selectedPaymentsBranch = useMemo(
    () => visibleBranches.find((item) => item.id === selectedPaymentsBranchId) ?? null,
    [selectedPaymentsBranchId, visibleBranches]
  );
  const paymentScopedStudents = useMemo(
    () =>
      selectedPaymentsBranchId
        ? visibleStudents.filter((item) => item.branch_id === selectedPaymentsBranchId)
        : [],
    [selectedPaymentsBranchId, visibleStudents]
  );
  const paymentScopedPayments = useMemo(
    () =>
      selectedPaymentsBranchId
        ? visiblePayments.filter((item) => item.branch_id === selectedPaymentsBranchId)
        : [],
    [selectedPaymentsBranchId, visiblePayments]
  );
  const paymentScopedPaymentsByStudentId = useMemo(() => {
    const paymentsByStudentId = new Map<number, Payment[]>();

    paymentScopedPayments
      .slice()
      .sort((left, right) => new Date(right.paid_at).getTime() - new Date(left.paid_at).getTime())
      .forEach((payment) => {
        const current = paymentsByStudentId.get(payment.student_id) ?? [];
        current.push(payment);
        paymentsByStudentId.set(payment.student_id, current);
      });

    return paymentsByStudentId;
  }, [paymentScopedPayments]);
  const paymentScopedPendingPayments = useMemo(
    () => paymentScopedPayments.filter((item) => item.status === "pending").length,
    [paymentScopedPayments]
  );
  const paymentScopedStudentsSorted = useMemo(
    () =>
      paymentScopedStudents
        .slice()
        .sort((left, right) => `${left.first_name} ${left.last_name}`.localeCompare(`${right.first_name} ${right.last_name}`, "es-MX")),
    [paymentScopedStudents]
  );
  const paymentsPageSize = isMobile ? 6 : 12;
  const paymentsTotalPages = Math.max(1, Math.ceil(paymentScopedStudentsSorted.length / paymentsPageSize));
  const paginatedPaymentScopedStudents = useMemo(() => {
    const startIndex = (paymentsPage - 1) * paymentsPageSize;
    return paymentScopedStudentsSorted.slice(startIndex, startIndex + paymentsPageSize);
  }, [paymentScopedStudentsSorted, paymentsPage, paymentsPageSize]);
  const paymentsRangeStart = paymentScopedStudentsSorted.length === 0 ? 0 : (paymentsPage - 1) * paymentsPageSize + 1;
  const paymentsRangeEnd = Math.min(paymentsPage * paymentsPageSize, paymentScopedStudentsSorted.length);
  const selectedPaymentsStudentPayments = useMemo(
    () => (selectedPaymentsStudent ? paymentScopedPaymentsByStudentId.get(selectedPaymentsStudent.id) ?? [] : []),
    [paymentScopedPaymentsByStudentId, selectedPaymentsStudent]
  );
  const selectedPaymentsStudentPaymentGroups = useMemo(() => {
    const groupedPayments = new Map<string, Payment[]>();

    selectedPaymentsStudentPayments.forEach((payment) => {
      const groupKey = formatMonthYear(payment.paid_at);
      const currentGroup = groupedPayments.get(groupKey) ?? [];
      currentGroup.push(payment);
      groupedPayments.set(groupKey, currentGroup);
    });

    return Array.from(groupedPayments.entries()).map(([label, items]) => ({
      label,
      items,
    }));
  }, [selectedPaymentsStudentPayments]);
  const paymentScopedStudentRows = useMemo(
    () =>
      paginatedPaymentScopedStudents.map((student) => {
        const studentPayments = paymentScopedPaymentsByStudentId.get(student.id) ?? [];
        const lastPayment = studentPayments[0] ?? null;
        const pendingMovements = studentPayments.filter((payment) => payment.status === "pending").length;

        return {
          student,
          totalPayments: studentPayments.length,
          pendingMovements,
          lastPayment,
        };
      }),
    [paginatedPaymentScopedStudents, paymentScopedPaymentsByStudentId]
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
  const heroTitle = organization?.name ?? currentBranch?.name ?? "Tu dojo";
  const focusedSection: AdminDashboardSection = route.params?.section ?? "overview";
  const isOverviewSection = focusedSection === "overview";
  const isBranchesSection = focusedSection === "branches";
  const isOperationsSection = focusedSection === "operations";
  const isPaymentsSection = focusedSection === "payments";
  const isDojoSection = focusedSection === "dojo";
  const activeShellSection =
    focusedSection === "branches"
      ? "branches"
      : focusedSection === "operations"
        ? "operations"
        : focusedSection === "payments"
          ? "payments"
        : focusedSection === "dojo"
          ? "dojo"
          : "dashboard";
  const pageTitle =
    focusedSection === "branches"
      ? "Sucursales"
      : focusedSection === "operations"
        ? "Asistencia y clases"
        : focusedSection === "payments"
          ? "Pagos"
        : focusedSection === "dojo"
          ? "Mi Dojo"
          : "Resumen general";
  const pageSubtitle =
    focusedSection === "branches"
      ? "Administra sedes, comparte la liga pública de asistencia y mantén al día la operación de cada sucursal."
      : focusedSection === "operations"
        ? "Controla las asistencias del día, abre el registro público y gestiona las clases activas desde un solo lugar."
        : focusedSection === "payments"
          ? "Selecciona una sucursal para revisar cobranza, registrar movimientos y mantener el historial financiero al día."
        : focusedSection === "dojo"
          ? "Consulta los datos principales de tu dojo y edita cada bloque disponible desde esta misma vista."
          : visibleBranches.length === 1
            ? `Resumen operativo de ${visibleBranches[0]?.name ?? "tu sucursal"} con métricas y gráficas de seguimiento.`
            : "Vista consolidada de la academia con métricas, gráficas y accesos rápidos para la operación diaria.";
  const availablePaymentStudents = isPaymentsSection ? paymentScopedStudents : visibleStudents;
  const paymentStudentOptions = useMemo(
    () =>
      availablePaymentStudents.map((item) => {
        const branchName = visibleBranches.find((branch) => branch.id === item.branch_id)?.name ?? `Sucursal ${item.branch_id}`;
        return {
          label: `${item.first_name} ${item.last_name} · ${item.unique_code} · ${branchName}`,
          value: String(item.id),
        };
      }),
    [availablePaymentStudents, visibleBranches]
  );
  const selectedPaymentStudent = useMemo(
    () => availablePaymentStudents.find((item) => item.id === Number(paymentForm.studentId)) ?? null,
    [availablePaymentStudents, paymentForm.studentId]
  );
  const inactiveStudents = Math.max(visibleStudents.length - activeStudents, 0);
  const inactiveBranches = Math.max(visibleBranches.length - activeBranches, 0);
  const inactiveClasses = Math.max(visibleClasses.length - activeClasses, 0);
  const overviewGraphData = [
    { key: "students-active", label: "Alumnos activos", value: activeStudents, tone: colors.success },
    { key: "students-inactive", label: "Alumnos inactivos", value: inactiveStudents, tone: colors.warning },
  ];
  const structureGraphData = [
    { key: "branches-active", label: "Sucursales activas", value: activeBranches, tone: colors.info },
    { key: "branches-inactive", label: "Sucursales inactivas", value: inactiveBranches, tone: colors.textMuted },
    { key: "classes-active", label: "Clases activas", value: activeClasses, tone: colors.action },
    { key: "classes-inactive", label: "Clases inactivas", value: inactiveClasses, tone: colors.danger },
  ];

  const copyPublicAttendanceUrl = async (url: string) => {
    if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      setFeedback({ tone: "success", message: "La liga publica se copio al portapapeles." });
      return;
    }

    setFeedback({ tone: "danger", message: "No fue posible copiar la liga desde este dispositivo." });
  };
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
    if (scopedBranchId) {
      setPaymentsBranchId(String(scopedBranchId));
      return;
    }

    setPaymentsBranchId((current) =>
      current && visibleBranches.some((item) => String(item.id) === current) ? current : ""
    );
  }, [scopedBranchId, visibleBranches]);

  useEffect(() => {
    if (!isPaymentsSection) {
      return;
    }

    setPaymentsPage(1);
  }, [isPaymentsSection, paymentsBranchId, paymentsPageSize]);

  useEffect(() => {
    setPaymentsPage((current) => Math.min(current, paymentsTotalPages));
  }, [paymentsTotalPages]);

  useEffect(() => {
    if (!selectedPaymentsStudent) {
      return;
    }

    if (paymentScopedStudents.some((item) => item.id === selectedPaymentsStudent.id)) {
      return;
    }

    setSelectedPaymentsStudent(null);
  }, [paymentScopedStudents, selectedPaymentsStudent]);

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
    if (!isPaymentsSection || !paymentForm.studentId) {
      return;
    }

    if (availablePaymentStudents.some((item) => String(item.id) === paymentForm.studentId)) {
      return;
    }

    setPaymentForm((current) => ({
      ...current,
      studentId: "",
    }));
  }, [availablePaymentStudents, isPaymentsSection, paymentForm.studentId]);

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

  function openCreatePaymentModal(defaultStudent?: Student | null) {
    const resolvedStudent = defaultStudent ?? availablePaymentStudents[0] ?? null;
    setFeedback(null);
    setPaymentDialogMode("create");
    setEditingPayment(null);
    setPaymentErrors({});
    setPaymentForm(createEmptyPaymentForm(resolvedStudent));
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

    const student = availablePaymentStudents.find((item) => item.id === Number(paymentForm.studentId));
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

  const handleTutorialAdvance = async () => {
    if (!tutorialActive || !activeTutorialStep || tutorialBusy) {
      return;
    }

    if (tutorialStepIndex < FIRST_TIME_TUTORIAL_STEPS.length - 1) {
      setTutorialStepIndex((current) => current + 1);
      return;
    }

    setTutorialBusy(true);

    try {
      await completeFirstTimeTutorial();
      setFeedback({
        tone: "success",
        message: "Recorrido inicial completado. Ya puedes operar el panel a tu ritmo.",
      });
    } catch (error) {
      setFeedback({ tone: "danger", message: getErrorMessage(error) });
    } finally {
      setTutorialBusy(false);
    }
  };

  const handleTutorialDismiss = async () => {
    if (!tutorialActive || tutorialBusy) {
      return;
    }

    setTutorialBusy(true);

    try {
      await completeFirstTimeTutorial();
      setFeedback({
        tone: "success",
        message: "Tutorial cerrado. Ya puedes usar el panel libremente.",
      });
    } catch (error) {
      setFeedback({ tone: "danger", message: getErrorMessage(error) });
    } finally {
      setTutorialBusy(false);
    }
  };

  const dashboardHeaderActions = focusedSection === "overview"
    ? null
    : (
      <View
        nativeID="screens-admin-dashboard-header-actions"
        style={[styles.headerActionGroup, isDesktop ? desktopStyles.headerActionGroup : mobileStyles.headerActionGroup]}
        testID="screens-admin-dashboard-header-actions"
      >
        {focusedSection === "branches" ? (
          <>
            {canCreateBranches ? (
              <AppButton
                label="Nueva sucursal"
                nativeID="screens-admin-dashboard-new-branch-button"
                onPress={openCreateBranchModal}
                testID="screens-admin-dashboard-new-branch-button"
              />
            ) : null}
            <AppButton
              label="Resumen"
              nativeID="screens-admin-dashboard-branches-summary-button"
              onPress={() => navigation.navigate("AdminHome")}
              testID="screens-admin-dashboard-branches-summary-button"
              variant="secondary"
            />
          </>
        ) : focusedSection === "operations" ? (
          <>
            <AppButton
              label="Registrar asistencia"
              nativeID="screens-admin-dashboard-operations-new-attendance-button"
              onPress={openCreateAttendanceModal}
              testID="screens-admin-dashboard-operations-new-attendance-button"
              variant="success"
              disabled={visibleStudents.length === 0}
            />
            <AppButton
              label="Nueva clase"
              nativeID="screens-admin-dashboard-operations-new-class-button"
              onPress={openCreateClassModal}
              testID="screens-admin-dashboard-operations-new-class-button"
              disabled={visibleBranches.length === 0 || disciplineOptions.length === 0}
            />
          </>
        ) : focusedSection === "payments" ? null : (
          <>
            {canManageOrganization && organization ? (
              <AppButton
                label="Editar dojo"
                nativeID="screens-admin-dashboard-edit-organization-button"
                onPress={openOrganizationModal}
                testID="screens-admin-dashboard-edit-organization-button"
                variant="secondary"
              />
            ) : null}
            {currentBranch ? (
              <AppButton
                label="Editar sucursal"
                nativeID="screens-admin-dashboard-dojo-edit-branch-button"
                onPress={() => openEditBranchModal(currentBranch)}
                testID="screens-admin-dashboard-dojo-edit-branch-button"
                variant="secondary"
              />
            ) : null}
          </>
        )}
      </View>
    );

  return (
    <Screen
      scrollable
      contentStyle={styles.screenContent}
      nativeID="screens-admin-dashboard-screen"
      testID="screens-admin-dashboard-screen"
    >
      <AdminShell
        activeSection={activeShellSection}
        headerActions={dashboardHeaderActions}
        onGoBranches={() => navigation.navigate("AdminHome", { section: "branches" })}
        onGoDashboard={() => navigation.navigate("AdminHome")}
        onGoDojo={() => navigation.navigate("AdminHome", { section: "dojo" })}
        onGoOperations={() => navigation.navigate("AdminHome", { section: "operations" })}
        onGoPayments={() => navigation.navigate("AdminHome", { section: "payments" })}
        onGoStudents={() => navigation.navigate("StudentsList")}
        sidebarSummary={sidebarSummary}
        subtitle={pageSubtitle}
        title={pageTitle}
      >
        <View nativeID="screens-admin-dashboard-content" style={styles.container} testID="screens-admin-dashboard-content">
          {isOverviewSection ? (
            <AnimatedSurface delay={40}>
            <View
              collapsable={false}
              nativeID="screens-admin-dashboard-hero-tutorial-anchor"
              onLayout={() => {
                if (activeTutorialStep?.id === "hero") {
                  syncActiveTutorialAnchor("hero");
                }
              }}
              ref={(node) => {
                tutorialAnchorRefs.current.hero = node;
              }}
              style={styles.tutorialAnchorTarget}
              testID="screens-admin-dashboard-hero-tutorial-anchor"
            >
              <AppCard
                nativeID="screens-admin-dashboard-hero-card"
                style={[styles.heroCard, isDesktop ? desktopStyles.heroCard : mobileStyles.heroCard]}
                testID="screens-admin-dashboard-hero-card"
              >
              <View nativeID="screens-admin-dashboard-hero-top" style={styles.heroTop} testID="screens-admin-dashboard-hero-top">
                <View nativeID="screens-admin-dashboard-hero-copy" style={styles.heroCopy} testID="screens-admin-dashboard-hero-copy">
                  <AppBadge label="Resumen" nativeID="screens-admin-dashboard-hero-badge" testID="screens-admin-dashboard-hero-badge" tone="info" />
                  <Text
                    nativeID="screens-admin-dashboard-hero-title"
                    style={[styles.title, isCompact ? mobileStyles.titleCompact : null]}
                    testID="screens-admin-dashboard-hero-title"
                  >
                    {heroTitle}
                  </Text>
                  <Text nativeID="screens-admin-dashboard-hero-subtitle" style={styles.subtitle} testID="screens-admin-dashboard-hero-subtitle">
                    Vista general del dojo con indicadores visuales y sin acciones operativas.
                  </Text>
                </View>
              </View>

              </AppCard>
            </View>
            </AnimatedSurface>
          ) : null}

          {feedback && !isOverviewSection ? (
            <AnimatedSurface
              delay={90}
              nativeID="screens-admin-dashboard-feedback-banner"
              style={[styles.feedbackBanner, feedback.tone === "danger" ? styles.feedbackDanger : styles.feedbackSuccess]}
              testID="screens-admin-dashboard-feedback-banner"
            >
              <Text nativeID="screens-admin-dashboard-feedback-text" style={[styles.feedbackText, feedback.tone === "danger" ? styles.feedbackTextDanger : null]} testID="screens-admin-dashboard-feedback-text">
                {feedback.message}
              </Text>
            </AnimatedSurface>
          ) : null}

          {isLoading ? (
            <StatusView
              title="Cargando panel"
              description="Obteniendo alumnos, sucursales y datos operativos de tu organizacion."
              loading
            />
          ) : hasError ? (
            <AnimatedSurface delay={110}>
              <AppCard style={styles.panelCard}>
              <StatusView nativeID="screens-admin-dashboard-error-status" title="No pudimos cargar el panel" description={getErrorMessage(dashboardError)} />
              <AppButton
                label="Reintentar"
                nativeID="screens-admin-dashboard-retry-button"
                onPress={() => {
                  void studentsQuery.refetch();
                  void classesQuery.refetch();
                  void organizationQuery.refetch();
                  void branchesQuery.refetch();
                  void disciplinesQuery.refetch();
                  void paymentsQuery.refetch();
                  void attendanceQuery.refetch();
                }}
                testID="screens-admin-dashboard-retry-button"
              />
              </AppCard>
            </AnimatedSurface>
          ) : (
            <>
              {isOverviewSection ? (
                <>
                  <View nativeID="screens-admin-dashboard-chart-grid" style={[styles.chartGrid, isDesktop ? desktopStyles.chartGrid : mobileStyles.chartGrid]} testID="screens-admin-dashboard-chart-grid">
                    <OverviewGraphCard
                      delay={120}
                      idPrefix="screens-admin-dashboard-students-graph"
                      items={overviewGraphData}
                      subtitle="Distribución actual del alumnado visible en el resumen."
                      title="Estado del alumnado"
                    />
                    <OverviewGraphCard
                      delay={150}
                      idPrefix="screens-admin-dashboard-structure-graph"
                      items={structureGraphData}
                      subtitle={visibleBranches.length === 1 ? "Estructura actual de tu sucursal visible." : "Panorama general de sucursales y clases activas del dojo."}
                      title="Estructura operativa"
                    />
                  </View>
                </>
              ) : (
                <AnimatedSurface delay={120}>
                  <AppCard nativeID="screens-admin-dashboard-section-focus-card" style={styles.sectionFocusCard} testID="screens-admin-dashboard-section-focus-card">
                    <View nativeID="screens-admin-dashboard-section-focus-header" style={styles.cardHeaderRow} testID="screens-admin-dashboard-section-focus-header">
                      <Text nativeID="screens-admin-dashboard-section-focus-title" style={styles.sectionTitle} testID="screens-admin-dashboard-section-focus-title">
                        {pageTitle}
                      </Text>
                      <AppBadge
                        label={
                          isBranchesSection
                            ? `${visibleBranches.length} sedes`
                            : isOperationsSection
                              ? `${visibleAttendanceRecords.length} asistencias`
                              : isPaymentsSection
                                ? selectedPaymentsBranch
                                  ? `${paymentScopedPayments.length} movimientos`
                                  : "Selecciona sucursal"
                              : `${activeBranches} sucursales activas`
                        }
                        tone={isOperationsSection ? "info" : isPaymentsSection ? "success" : "neutral"}
                      />
                    </View>
                    <Text nativeID="screens-admin-dashboard-section-focus-description" style={styles.helperText} testID="screens-admin-dashboard-section-focus-description">
                      {pageSubtitle}
                    </Text>
                    {isBranchesSection ? (
                      <>
                        <QuickAction
                          description="Crea una nueva sede para ampliar la operación del dojo."
                          idPrefix="screens-admin-dashboard-focus-new-branch-action"
                          label="Nueva sucursal"
                          onPress={openCreateBranchModal}
                          disabled={!canCreateBranches || !organizationId}
                          tone="primary"
                        />
                        <QuickAction
                          description="Ajusta los datos de la sucursal que estás operando ahora."
                          idPrefix="screens-admin-dashboard-focus-edit-branch-action"
                          label="Editar sucursal"
                          onPress={() => {
                            if (currentBranch) {
                              openEditBranchModal(currentBranch);
                            }
                          }}
                          disabled={!currentBranch || !canEditVisibleBranches}
                        />
                      </>
                    ) : isOperationsSection ? (
                      <>
                        <QuickAction
                          description="Registra una asistencia manual en segundos."
                          idPrefix="screens-admin-dashboard-focus-new-attendance-action"
                          label="Registrar asistencia"
                          onPress={openCreateAttendanceModal}
                          disabled={visibleStudents.length === 0}
                          tone="success"
                        />
                        <QuickAction
                          description="Abre la liga pública para capturar asistencia desde recepción."
                          idPrefix="screens-admin-dashboard-focus-open-attendance-action"
                          label="Abrir registro de asistencias"
                          onPress={() => {
                            if (organization && currentBranch) {
                              void openPublicAttendancePage(organization.slug, currentBranch.name);
                            }
                          }}
                          disabled={!organization || !currentBranch || !currentBranch.is_active}
                        />
                        <QuickAction
                          description="Da de alta una clase nueva en la sucursal visible."
                          idPrefix="screens-admin-dashboard-focus-new-class-action"
                          label="Nueva clase"
                          onPress={openCreateClassModal}
                          disabled={visibleBranches.length === 0 || disciplineOptions.length === 0}
                          tone="primary"
                        />
                      </>
                    ) : isPaymentsSection ? (
                      <>
                        <View nativeID="screens-admin-dashboard-focus-payments-branch-filter" style={[styles.formGrid, isDesktop ? desktopStyles.formGrid : null]} testID="screens-admin-dashboard-focus-payments-branch-filter">
                          <AppSelect
                            label="Sucursal"
                            value={paymentsBranchId}
                            onValueChange={setPaymentsBranchId}
                            items={branchOptions}
                            placeholder={visibleBranches.length > 0 ? "Selecciona una sucursal" : "Sin sucursales disponibles"}
                            enabled={!scopedBranchId && visibleBranches.length > 0}
                            nativeID="screens-admin-dashboard-payments-branch-select"
                            testID="screens-admin-dashboard-payments-branch-select"
                          />
                        </View>
                        <View nativeID="screens-admin-dashboard-focus-payments-summary" style={styles.paymentSummaryRow} testID="screens-admin-dashboard-focus-payments-summary">
                          <AppBadge
                            label={`${paymentScopedStudents.length} alumnos`}
                            nativeID="screens-admin-dashboard-focus-payments-students-badge"
                            testID="screens-admin-dashboard-focus-payments-students-badge"
                            tone="neutral"
                          />
                          <AppBadge
                            label={`${paymentScopedPendingPayments} pendientes`}
                            nativeID="screens-admin-dashboard-focus-payments-pending-badge"
                            testID="screens-admin-dashboard-focus-payments-pending-badge"
                            tone={paymentScopedPendingPayments > 0 ? "warning" : "success"}
                          />
                        </View>
                        <QuickAction
                          description={
                            selectedPaymentsBranch
                              ? `Registra un pago para los alumnos de ${selectedPaymentsBranch.name}.`
                              : "Selecciona una sucursal para habilitar la gestión de pagos."
                          }
                          idPrefix="screens-admin-dashboard-focus-new-payment-action"
                          label="Registrar pago"
                          onPress={openCreatePaymentModal}
                          disabled={!selectedPaymentsBranchId || availablePaymentStudents.length === 0}
                          tone="success"
                        />
                      </>
                    ) : (
                      <View nativeID="screens-admin-dashboard-focus-dojo-actions" style={styles.detailList} testID="screens-admin-dashboard-focus-dojo-actions">
                        <EditableDetailRow
                          idPrefix="screens-admin-dashboard-dojo-name-row"
                          label="Nombre del dojo"
                          value={organization?.name ?? "Sin definir"}
                          onPress={canManageOrganization && organization ? openOrganizationModal : undefined}
                        />
                        <EditableDetailRow
                          idPrefix="screens-admin-dashboard-dojo-suffix-row"
                          label="Sufijo"
                          value={organization?.slug ?? "Sin definir"}
                          onPress={canManageOrganization && organization ? openOrganizationModal : undefined}
                        />
                        <EditableDetailRow
                          idPrefix="screens-admin-dashboard-dojo-branch-row"
                          label="Sucursal visible"
                          value={currentBranch?.name ?? "Sin sucursal asignada"}
                          onPress={currentBranch ? () => openEditBranchModal(currentBranch) : undefined}
                        />
                        <EditableDetailRow
                          idPrefix="screens-admin-dashboard-dojo-location-row"
                          label="Ubicación"
                          value={
                            currentBranch
                              ? [currentBranch.city, currentBranch.state, currentBranch.country].filter(Boolean).join(", ") || currentBranch.address
                              : "Sin ubicación disponible"
                          }
                          onPress={currentBranch ? () => openEditBranchModal(currentBranch) : undefined}
                        />
                      </View>
                    )}
                  </AppCard>
                </AnimatedSurface>
              )}

              {!isOverviewSection ? (
              <View nativeID="screens-admin-dashboard-panels-grid" style={[styles.contentGrid, isDesktop ? desktopStyles.contentGrid : mobileStyles.contentGrid]} testID="screens-admin-dashboard-panels-grid">
                {isOverviewSection ? (
                <AnimatedSurface delay={270}>
                  <View
                    collapsable={false}
                    nativeID="screens-admin-dashboard-crud-tutorial-anchor"
                    onLayout={() => {
                      if (activeTutorialStep?.id === "crud") {
                        syncActiveTutorialAnchor("crud");
                      }
                    }}
                    ref={(node) => {
                      tutorialAnchorRefs.current.crud = node;
                    }}
                    style={styles.tutorialAnchorTarget}
                    testID="screens-admin-dashboard-crud-tutorial-anchor"
                  >
                    <AppCard nativeID="screens-admin-dashboard-crud-card" style={styles.panelCard} testID="screens-admin-dashboard-crud-card">
                    <Text nativeID="screens-admin-dashboard-crud-title" style={styles.sectionTitle} testID="screens-admin-dashboard-crud-title">Administración General</Text>
                    <QuickAction
                      description="Administra alumnos. Crea, edita, agrega."
                      idPrefix="screens-admin-dashboard-manage-students-action"
                      label="Administrar alumnos"
                      onPress={() => navigation.navigate("StudentsList")}
                      tone="neutral"
                    />
                    <QuickAction
                      description="Inicia el alta de un alumno nuevo."
                      idPrefix="screens-admin-dashboard-new-student-action"
                      label="Nuevo alumno"
                      onPress={() => navigation.navigate("StudentsList", { openCreate: true })}
                      tone="primary"
                    />
                    <QuickAction
                      description={
                        canManageOrganization
                          ? "Edita datos de tu dojo."
                          : "Disponible solo para org admin. Tu rol si puede operar la sucursal asignada."
                      }
                      idPrefix="screens-admin-dashboard-edit-organization-action"
                      label="Editar dojo"
                      onPress={openOrganizationModal}
                      disabled={!canManageOrganization || !organization}
                      tone="neutral"
                    />
                    <QuickAction
                      description={
                        canCreateBranches
                          ? "Da de alta una sucursal nueva ligada a esta organizacion."
                          : "La creacion de sucursales esta disponible solo para org admin."
                      }
                      idPrefix="screens-admin-dashboard-new-branch-action"
                      label="Nueva sucursal"
                      onPress={openCreateBranchModal}
                      disabled={!canCreateBranches || !organizationId}
                      tone="primary"
                    />
                    <QuickAction
                      description="Edita tu sucursal."
                      idPrefix="screens-admin-dashboard-edit-branch-action"
                      label="Editar mi sucursal"
                      onPress={() => {
                        if (currentBranch) {
                          openEditBranchModal(currentBranch);
                        }
                      }}
                      disabled={!currentBranch || !canEditVisibleBranches}
                      tone="neutral"
                    />
                    <QuickAction
                      description="Administra tus clases."
                      idPrefix="screens-admin-dashboard-new-class-action"
                      label="Nueva clase"
                      onPress={openCreateClassModal}
                      disabled={visibleBranches.length === 0 || disciplineOptions.length === 0}
                      tone="primary"
                    />
                    <QuickAction
                      description="Administra los pagos de tus alumnos."
                      idPrefix="screens-admin-dashboard-new-payment-action"
                      label="Registrar pago"
                      onPress={openCreatePaymentModal}
                      disabled={visibleStudents.length === 0}
                      tone="success"
                    />
                    <QuickAction
                      description="Administra la asistencia de tus alumnos."
                      idPrefix="screens-admin-dashboard-new-attendance-action"
                      label="Registrar asistencia"
                      onPress={openCreateAttendanceModal}
                      disabled={visibleStudents.length === 0}
                      tone="success"
                    />
                    </AppCard>
                  </View>
                </AnimatedSurface>
                ) : null}

                {isOverviewSection || isDojoSection ? (
                <AnimatedSurface delay={300}>
                  <AppCard nativeID="screens-admin-dashboard-organization-card" style={styles.panelCard} testID="screens-admin-dashboard-organization-card">
                  <View nativeID="screens-admin-dashboard-organization-header" style={styles.cardHeaderRow} testID="screens-admin-dashboard-organization-header">
                    <Text nativeID="screens-admin-dashboard-organization-title" style={styles.sectionTitle} testID="screens-admin-dashboard-organization-title">Dojo</Text>
                    <AppBadge label={organization?.is_active ? "Activa" : "Inactiva"} tone={organization?.is_active ? "success" : "warning"} />
                  </View>
                  {organization ? (
                    <>
                      <EntityField label="Nombre" value={organization.name} />
                      <EntityField label="Sufijo" value={organization.slug} />
                      {canManageOrganization ? (
                        <AppButton label="Editar datos del dojo" onPress={openOrganizationModal} variant="secondary" />
                      ) : (
                        <Text nativeID="screens-admin-dashboard-organization-helper-text" style={styles.helperText} testID="screens-admin-dashboard-organization-helper-text">
                          Tu rol puede operar la sucursal asignada, pero no editar la configuracion global del dojo.
                        </Text>
                      )}
                    </>
                  ) : (
                    <View nativeID="screens-admin-dashboard-organization-empty-block" style={styles.emptyBlock} testID="screens-admin-dashboard-organization-empty-block">
                      <Text nativeID="screens-admin-dashboard-organization-empty-title" style={styles.emptyTitle} testID="screens-admin-dashboard-organization-empty-title">Sin organizacion cargada</Text>
                      <Text nativeID="screens-admin-dashboard-organization-empty-description" style={styles.emptyDescription} testID="screens-admin-dashboard-organization-empty-description">
                        Cuando la API devuelva la organizacion asignada, podras editarla desde este panel.
                      </Text>
                    </View>
                  )}
                  </AppCard>
                </AnimatedSurface>
                ) : null}

                {isOverviewSection || isBranchesSection ? (
                <AnimatedSurface delay={330}>
                  <View
                    collapsable={false}
                    nativeID="screens-admin-dashboard-branches-tutorial-anchor"
                    onLayout={() => {
                      if (activeTutorialStep?.id === "branches") {
                        syncActiveTutorialAnchor("branches");
                      }
                    }}
                    ref={(node) => {
                      tutorialAnchorRefs.current.branches = node;
                    }}
                    style={styles.tutorialAnchorTarget}
                    testID="screens-admin-dashboard-branches-tutorial-anchor"
                  >
                    <AppCard nativeID="screens-admin-dashboard-branches-card" style={styles.panelCard} testID="screens-admin-dashboard-branches-card">
                    <View nativeID="screens-admin-dashboard-branches-header" style={[styles.cardHeaderRow, isDesktop ? styles.cardHeaderColumn : null]} testID="screens-admin-dashboard-branches-header">
                      <Text nativeID="screens-admin-dashboard-branches-title" style={styles.sectionTitle} testID="screens-admin-dashboard-branches-title">Sucursales</Text>
                      {canCreateBranches ? (
                        <View style={isDesktop ? styles.headerButtonStack : null}>
                          <AppButton label="Agregar sucursal" onPress={openCreateBranchModal} />
                        </View>
                      ) : null}
                    </View>
                    {visibleBranches.length > 0 ? (
                      visibleBranches.map((branch) => (
                        <View key={branch.id} nativeID={`screens-admin-dashboard-branch-row-${branch.id}`} style={styles.branchRow} testID={`screens-admin-dashboard-branch-row-${branch.id}`}>
                          <View nativeID={`screens-admin-dashboard-branch-copy-${branch.id}`} style={styles.branchCopy} testID={`screens-admin-dashboard-branch-copy-${branch.id}`}>
                            <View nativeID={`screens-admin-dashboard-branch-title-row-${branch.id}`} style={styles.branchTitleRow} testID={`screens-admin-dashboard-branch-title-row-${branch.id}`}>
                              <Text nativeID={`screens-admin-dashboard-branch-name-${branch.id}`} style={styles.branchName} testID={`screens-admin-dashboard-branch-name-${branch.id}`}>{branch.name}</Text>
                              <AppBadge label={branch.is_active ? "Activa" : "Inactiva"} nativeID={`screens-admin-dashboard-branch-status-badge-${branch.id}`} testID={`screens-admin-dashboard-branch-status-badge-${branch.id}`} tone={branch.is_active ? "success" : "warning"} />
                            </View>
                            <Text nativeID={`screens-admin-dashboard-branch-location-${branch.id}`} style={styles.branchMeta} testID={`screens-admin-dashboard-branch-location-${branch.id}`}>{`${branch.city}, ${branch.state} / ${branch.country}`}</Text>
                            <Text nativeID={`screens-admin-dashboard-branch-address-${branch.id}`} style={styles.branchMeta} testID={`screens-admin-dashboard-branch-address-${branch.id}`}>{branch.address}</Text>
                          </View>
                          <View nativeID={`screens-admin-dashboard-branch-actions-${branch.id}`} style={styles.branchActions} testID={`screens-admin-dashboard-branch-actions-${branch.id}`}>
                            {organization ? (
                              <AppButton
                                label="Abrir asistencia"
                                nativeID={`screens-admin-dashboard-branch-open-attendance-button-${branch.id}`}
                                onPress={() => void openPublicAttendancePage(organization.slug, branch.name)}
                                testID={`screens-admin-dashboard-branch-open-attendance-button-${branch.id}`}
                                variant="secondary"
                                disabled={!branch.is_active}
                              />
                            ) : null}
                            <AppButton label={branch.id === 1 ? "Editar matriz" : "Editar"} nativeID={`screens-admin-dashboard-branch-edit-button-${branch.id}`} onPress={() => openEditBranchModal(branch)} testID={`screens-admin-dashboard-branch-edit-button-${branch.id}`} variant="secondary" />
                            {canDeactivateBranches && branch.is_active ? (
                              <AppButton label="Desactivar" nativeID={`screens-admin-dashboard-branch-deactivate-button-${branch.id}`} onPress={() => openEditBranchModal(branch)} testID={`screens-admin-dashboard-branch-deactivate-button-${branch.id}`} variant="danger" />
                            ) : null}
                          </View>
                          {organization && branch.is_active ? (
                            <View nativeID={`screens-admin-dashboard-branch-public-route-wrap-${branch.id}`} style={styles.publicRouteBlock} testID={`screens-admin-dashboard-branch-public-route-wrap-${branch.id}`}>
                              <Text nativeID={`screens-admin-dashboard-branch-public-route-${branch.id}`} style={styles.helperText} testID={`screens-admin-dashboard-branch-public-route-${branch.id}`}>
                                {buildPublicAttendanceUrl(publicAttendanceOrigin, organization.slug, branch.name)}
                              </Text>
                              <AppButton
                                label="Copiar liga"
                                nativeID={`screens-admin-dashboard-branch-copy-route-button-${branch.id}`}
                                onPress={() => void copyPublicAttendanceUrl(buildPublicAttendanceUrl(publicAttendanceOrigin, organization.slug, branch.name))}
                                testID={`screens-admin-dashboard-branch-copy-route-button-${branch.id}`}
                                variant="secondary"
                              />
                            </View>
                          ) : null}
                        </View>
                      ))
                    ) : (
                      <View nativeID="screens-admin-dashboard-branches-empty-block" style={styles.emptyBlock} testID="screens-admin-dashboard-branches-empty-block">
                        <Text nativeID="screens-admin-dashboard-branches-empty-title" style={styles.emptyTitle} testID="screens-admin-dashboard-branches-empty-title">Sin sucursales registradas</Text>
                        <Text nativeID="screens-admin-dashboard-branches-empty-description" style={styles.emptyDescription} testID="screens-admin-dashboard-branches-empty-description">
                          Da de alta tu primera sucursal para poder operar alumnos, clases y asistencia en este panel.
                        </Text>
                      </View>
                    )}
                    </AppCard>
                  </View>
                </AnimatedSurface>
                ) : null}

                {isOverviewSection || isOperationsSection ? (
                <AnimatedSurface delay={360}>
                  <View
                    collapsable={false}
                    nativeID="screens-admin-dashboard-attendance-tutorial-anchor"
                    onLayout={() => {
                      if (activeTutorialStep?.id === "attendance") {
                        syncActiveTutorialAnchor("attendance");
                      }
                    }}
                    ref={(node) => {
                      tutorialAnchorRefs.current.attendance = node;
                    }}
                    style={styles.tutorialAnchorTarget}
                    testID="screens-admin-dashboard-attendance-tutorial-anchor"
                  >
                    <AppCard nativeID="screens-admin-dashboard-attendance-card" style={styles.panelCard} testID="screens-admin-dashboard-attendance-card">
                    <View nativeID="screens-admin-dashboard-attendance-header" style={[styles.cardHeaderRow, isDesktop ? styles.cardHeaderColumn : null]} testID="screens-admin-dashboard-attendance-header">
                      <Text nativeID="screens-admin-dashboard-attendance-title" style={styles.sectionTitle} testID="screens-admin-dashboard-attendance-title">Asistencias</Text>
                      <View style={isDesktop ? styles.headerButtonStack : null}>
                        <AppButton
                          label="Agregar asistencia"
                          onPress={openCreateAttendanceModal}
                          variant="success"
                          disabled={visibleStudents.length === 0}
                        />
                      </View>
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
                          <View key={attendance.id} nativeID={`screens-admin-dashboard-attendance-row-${attendance.id}`} style={styles.attendanceRow} testID={`screens-admin-dashboard-attendance-row-${attendance.id}`}>
                            <View nativeID={`screens-admin-dashboard-attendance-header-row-${attendance.id}`} style={styles.attendanceHeaderRow} testID={`screens-admin-dashboard-attendance-header-row-${attendance.id}`}>
                              <View nativeID={`screens-admin-dashboard-attendance-copy-${attendance.id}`} style={styles.attendanceCopy} testID={`screens-admin-dashboard-attendance-copy-${attendance.id}`}>
                                <Text nativeID={`screens-admin-dashboard-attendance-title-${attendance.id}`} style={styles.attendanceTitle} testID={`screens-admin-dashboard-attendance-title-${attendance.id}`}>
                                  {student
                                    ? `${student.first_name} ${student.last_name}`
                                    : `Alumno ${attendance.student_id}`}
                                </Text>
                                <Text nativeID={`screens-admin-dashboard-attendance-meta-${attendance.id}`} style={styles.attendanceMeta} testID={`screens-admin-dashboard-attendance-meta-${attendance.id}`}>
                                  {student ? `${student.unique_code} · ${branchName}` : branchName}
                                </Text>
                              </View>
                              <AppBadge
                                label={formatAttendanceMethod(attendance.method)}
                                nativeID={`screens-admin-dashboard-attendance-method-badge-${attendance.id}`}
                                testID={`screens-admin-dashboard-attendance-method-badge-${attendance.id}`}
                                tone={attendance.method === "qr" ? "info" : "neutral"}
                              />
                            </View>
                            <View nativeID={`screens-admin-dashboard-attendance-meta-grid-${attendance.id}`} style={styles.paymentMetaGrid} testID={`screens-admin-dashboard-attendance-meta-grid-${attendance.id}`}>
                              <EntityField idPrefix={`screens-admin-dashboard-attendance-checkin-${attendance.id}`} label="Check-in" value={formatDateTime(attendance.check_in_at)} />
                              <EntityField idPrefix={`screens-admin-dashboard-attendance-class-${attendance.id}`} label="Clase" value={classItem?.name ?? "Sin clase"} />
                            </View>
                            <View nativeID={`screens-admin-dashboard-attendance-actions-${attendance.id}`} style={styles.branchActions} testID={`screens-admin-dashboard-attendance-actions-${attendance.id}`}>
                              <AppButton label="Editar" nativeID={`screens-admin-dashboard-attendance-edit-button-${attendance.id}`} onPress={() => openEditAttendanceModal(attendance)} testID={`screens-admin-dashboard-attendance-edit-button-${attendance.id}`} variant="secondary" />
                              <AppButton label="Eliminar" nativeID={`screens-admin-dashboard-attendance-delete-button-${attendance.id}`} onPress={() => openEditAttendanceModal(attendance)} testID={`screens-admin-dashboard-attendance-delete-button-${attendance.id}`} variant="danger" />
                            </View>
                          </View>
                        );
                      })
                    ) : (
                      <View nativeID="screens-admin-dashboard-attendance-empty-block" style={styles.emptyBlock} testID="screens-admin-dashboard-attendance-empty-block">
                        <Text nativeID="screens-admin-dashboard-attendance-empty-title" style={styles.emptyTitle} testID="screens-admin-dashboard-attendance-empty-title">Sin asistencias registradas</Text>
                      </View>
                    )}
                    </AppCard>
                  </View>
                </AnimatedSurface>
                ) : null}

                {isOverviewSection || isPaymentsSection ? (
                <AnimatedSurface delay={390}>
                  <AppCard nativeID="screens-admin-dashboard-payments-card" style={styles.panelCard} testID="screens-admin-dashboard-payments-card">
                  <View nativeID="screens-admin-dashboard-payments-header" style={styles.cardHeaderRow} testID="screens-admin-dashboard-payments-header">
                    <Text nativeID="screens-admin-dashboard-payments-title" style={styles.sectionTitle} testID="screens-admin-dashboard-payments-title">
                      {isPaymentsSection && selectedPaymentsBranch ? `Pagos · ${selectedPaymentsBranch.name}` : "Pagos"}
                    </Text>
                    {!isPaymentsSection ? (
                      <AppButton
                        label="Agregar pago"
                        onPress={openCreatePaymentModal}
                        variant="success"
                        disabled={visibleStudents.length === 0}
                      />
                    ) : null}
                  </View>
                  <View style={styles.paymentSummaryRow}>
                    <AppBadge
                      label={`${isPaymentsSection ? paymentScopedStudentsSorted.length : visiblePayments.length} ${isPaymentsSection ? "alumnos" : "movimientos"}`}
                      tone="neutral"
                    />
                    <AppBadge
                      label={`${isPaymentsSection ? paymentScopedPendingPayments : pendingPayments} pendientes`}
                      tone={(isPaymentsSection ? paymentScopedPendingPayments : pendingPayments) > 0 ? "warning" : "success"}
                    />
                  </View>
                  {isPaymentsSection ? (
                    <>
                      {selectedPaymentsBranch ? (
                        <View nativeID="screens-admin-dashboard-payments-pagination-summary" style={styles.paymentsPaginationSummary} testID="screens-admin-dashboard-payments-pagination-summary">
                          <Text nativeID="screens-admin-dashboard-payments-pagination-summary-text" style={styles.helperText} testID="screens-admin-dashboard-payments-pagination-summary-text">
                            {`Mostrando ${paymentsRangeStart}-${paymentsRangeEnd} de ${paymentScopedStudentsSorted.length} alumnos`}
                          </Text>
                        </View>
                      ) : null}
                      {!selectedPaymentsBranch ? (
                        <View nativeID="screens-admin-dashboard-payments-select-branch-block" style={styles.emptyBlock} testID="screens-admin-dashboard-payments-select-branch-block">
                          <Text nativeID="screens-admin-dashboard-payments-select-branch-title" style={styles.emptyTitle} testID="screens-admin-dashboard-payments-select-branch-title">Selecciona una sucursal</Text>
                          <Text nativeID="screens-admin-dashboard-payments-select-branch-description" style={styles.emptyDescription} testID="screens-admin-dashboard-payments-select-branch-description">
                            Elige una sucursal desde la parte superior para cargar su alumnado y administrar la cobranza.
                          </Text>
                        </View>
                      ) : paymentScopedStudentRows.length > 0 ? (
                        <>
                          <View nativeID="screens-admin-dashboard-payments-student-list" style={styles.paymentsStudentList} testID="screens-admin-dashboard-payments-student-list">
                            {paymentScopedStudentRows.map(({ student, totalPayments, pendingMovements, lastPayment }) => (
                              <Pressable
                                key={student.id}
                                accessibilityRole="button"
                                nativeID={`screens-admin-dashboard-payments-student-row-${student.id}`}
                                onPress={() => setSelectedPaymentsStudent(student)}
                                style={({ pressed }) => [
                                  styles.paymentsStudentRow,
                                  pressed ? styles.paymentsStudentRowPressed : null,
                                ]}
                                testID={`screens-admin-dashboard-payments-student-row-${student.id}`}
                              >
                                <View nativeID={`screens-admin-dashboard-payments-student-copy-${student.id}`} style={styles.paymentsStudentCopy} testID={`screens-admin-dashboard-payments-student-copy-${student.id}`}>
                                  <View nativeID={`screens-admin-dashboard-payments-student-head-${student.id}`} style={styles.paymentsStudentHead} testID={`screens-admin-dashboard-payments-student-head-${student.id}`}>
                                    <Text nativeID={`screens-admin-dashboard-payments-student-name-${student.id}`} style={styles.paymentsStudentName} testID={`screens-admin-dashboard-payments-student-name-${student.id}`}>
                                      {`${student.first_name} ${student.last_name}`}
                                    </Text>
                                    <AppBadge
                                      label={formatPaymentStatus(student.payment_status)}
                                      nativeID={`screens-admin-dashboard-payments-student-payment-status-${student.id}`}
                                      testID={`screens-admin-dashboard-payments-student-payment-status-${student.id}`}
                                      tone={getStudentPaymentStatusTone(student.payment_status)}
                                    />
                                  </View>
                                  <Text nativeID={`screens-admin-dashboard-payments-student-meta-${student.id}`} style={styles.paymentsStudentMeta} testID={`screens-admin-dashboard-payments-student-meta-${student.id}`}>
                                    {`${student.unique_code} · ${formatStudentStatus(student.status)} · Próximo pago: ${formatDate(student.next_payment_date)}`}
                                  </Text>
                                  <View nativeID={`screens-admin-dashboard-payments-student-summary-${student.id}`} style={styles.paymentsStudentSummary} testID={`screens-admin-dashboard-payments-student-summary-${student.id}`}>
                                    <Text nativeID={`screens-admin-dashboard-payments-student-fee-${student.id}`} style={styles.paymentsStudentSummaryText} testID={`screens-admin-dashboard-payments-student-fee-${student.id}`}>
                                      {`Mensualidad: ${formatCurrency(student.monthly_fee, student.currency)}`}
                                    </Text>
                                    <Text nativeID={`screens-admin-dashboard-payments-student-total-${student.id}`} style={styles.paymentsStudentSummaryText} testID={`screens-admin-dashboard-payments-student-total-${student.id}`}>
                                      {`Pagos: ${totalPayments}`}
                                    </Text>
                                    <Text nativeID={`screens-admin-dashboard-payments-student-pending-${student.id}`} style={styles.paymentsStudentSummaryText} testID={`screens-admin-dashboard-payments-student-pending-${student.id}`}>
                                      {`Pendientes: ${pendingMovements}`}
                                    </Text>
                                    <Text nativeID={`screens-admin-dashboard-payments-student-last-${student.id}`} style={styles.paymentsStudentSummaryText} testID={`screens-admin-dashboard-payments-student-last-${student.id}`}>
                                      {`Último movimiento: ${lastPayment ? formatDate(lastPayment.paid_at) : "Sin registros"}`}
                                    </Text>
                                  </View>
                                </View>
                                <View nativeID={`screens-admin-dashboard-payments-student-action-${student.id}`} style={styles.paymentsStudentAction} testID={`screens-admin-dashboard-payments-student-action-${student.id}`}>
                                  <Text nativeID={`screens-admin-dashboard-payments-student-action-label-${student.id}`} style={styles.paymentsStudentActionLabel} testID={`screens-admin-dashboard-payments-student-action-label-${student.id}`}>
                                    Ver pagos
                                  </Text>
                                  <Feather color={colors.textMuted} name="chevron-right" size={18} />
                                </View>
                              </Pressable>
                            ))}
                          </View>
                          {paymentScopedStudentsSorted.length > paymentsPageSize ? (
                            <View nativeID="screens-admin-dashboard-payments-pagination-controls" style={styles.paymentsPaginationControls} testID="screens-admin-dashboard-payments-pagination-controls">
                              <AppButton
                                label="Anterior"
                                nativeID="screens-admin-dashboard-payments-pagination-prev-button"
                                onPress={() => setPaymentsPage((current) => Math.max(1, current - 1))}
                                testID="screens-admin-dashboard-payments-pagination-prev-button"
                                variant="secondary"
                                disabled={paymentsPage === 1}
                              />
                              <Text nativeID="screens-admin-dashboard-payments-pagination-page-label" style={styles.paymentsPaginationLabel} testID="screens-admin-dashboard-payments-pagination-page-label">
                                {`Página ${paymentsPage} de ${paymentsTotalPages}`}
                              </Text>
                              <AppButton
                                label="Siguiente"
                                nativeID="screens-admin-dashboard-payments-pagination-next-button"
                                onPress={() => setPaymentsPage((current) => Math.min(paymentsTotalPages, current + 1))}
                                testID="screens-admin-dashboard-payments-pagination-next-button"
                                variant="secondary"
                                disabled={paymentsPage === paymentsTotalPages}
                              />
                            </View>
                          ) : null}
                        </>
                      ) : (
                        <View nativeID="screens-admin-dashboard-payments-empty-block" style={styles.emptyBlock} testID="screens-admin-dashboard-payments-empty-block">
                          <Text nativeID="screens-admin-dashboard-payments-empty-title" style={styles.emptyTitle} testID="screens-admin-dashboard-payments-empty-title">Sin alumnos disponibles</Text>
                          <Text nativeID="screens-admin-dashboard-payments-empty-description" style={styles.emptyDescription} testID="screens-admin-dashboard-payments-empty-description">
                            {`No hay alumnos visibles para ${selectedPaymentsBranch.name}.`}
                          </Text>
                        </View>
                      )}
                    </>
                  ) : visiblePayments.length > 0 ? (
                    visiblePayments.slice(0, 6).map((payment) => {
                      const student = visibleStudents.find((item) => item.id === payment.student_id) ?? null;
                      const branchName =
                        visibleBranches.find((branch) => branch.id === payment.branch_id)?.name ??
                        `Sucursal ${payment.branch_id}`;

                      return (
                        <View key={payment.id} nativeID={`screens-admin-dashboard-payment-row-${payment.id}`} style={styles.paymentRow} testID={`screens-admin-dashboard-payment-row-${payment.id}`}>
                          <View nativeID={`screens-admin-dashboard-payment-header-row-${payment.id}`} style={styles.paymentHeaderRow} testID={`screens-admin-dashboard-payment-header-row-${payment.id}`}>
                            <View nativeID={`screens-admin-dashboard-payment-amount-block-${payment.id}`} style={styles.paymentAmountBlock} testID={`screens-admin-dashboard-payment-amount-block-${payment.id}`}>
                              <Text nativeID={`screens-admin-dashboard-payment-amount-${payment.id}`} style={styles.paymentAmount} testID={`screens-admin-dashboard-payment-amount-${payment.id}`}>
                                {formatCurrency(payment.amount, payment.currency)}
                              </Text>
                              <Text nativeID={`screens-admin-dashboard-payment-meta-${payment.id}`} style={styles.paymentMeta} testID={`screens-admin-dashboard-payment-meta-${payment.id}`}>
                                {student
                                  ? `${student.first_name} ${student.last_name} · ${student.unique_code}`
                                  : `Alumno ${payment.student_id}`}
                              </Text>
                            </View>
                            <AppBadge
                              label={formatPaymentRecordStatus(payment.status)}
                              nativeID={`screens-admin-dashboard-payment-status-badge-${payment.id}`}
                              testID={`screens-admin-dashboard-payment-status-badge-${payment.id}`}
                              tone={getPaymentRecordTone(payment.status)}
                            />
                          </View>
                          <View nativeID={`screens-admin-dashboard-payment-meta-grid-${payment.id}`} style={styles.paymentMetaGrid} testID={`screens-admin-dashboard-payment-meta-grid-${payment.id}`}>
                            <EntityField idPrefix={`screens-admin-dashboard-payment-date-${payment.id}`} label="Fecha" value={formatDateTime(payment.paid_at)} />
                            <EntityField idPrefix={`screens-admin-dashboard-payment-method-${payment.id}`} label="Metodo" value={formatPaymentMethod(payment.method)} />
                            <EntityField idPrefix={`screens-admin-dashboard-payment-branch-${payment.id}`} label="Sucursal" value={branchName} />
                            <EntityField
                              idPrefix={`screens-admin-dashboard-payment-period-${payment.id}`}
                              label="Periodo"
                              value={`${formatDate(payment.period_start)} - ${formatDate(payment.period_end)}`}
                            />
                          </View>
                          {payment.notes ? <Text nativeID={`screens-admin-dashboard-payment-notes-${payment.id}`} style={styles.paymentNote} testID={`screens-admin-dashboard-payment-notes-${payment.id}`}>Notas: {payment.notes}</Text> : null}
                          <View nativeID={`screens-admin-dashboard-payment-actions-${payment.id}`} style={styles.branchActions} testID={`screens-admin-dashboard-payment-actions-${payment.id}`}>
                            <AppButton label="Editar" nativeID={`screens-admin-dashboard-payment-edit-button-${payment.id}`} onPress={() => openEditPaymentModal(payment)} testID={`screens-admin-dashboard-payment-edit-button-${payment.id}`} variant="secondary" />
                            {payment.status !== "void" ? (
                              <AppButton label="Anular" nativeID={`screens-admin-dashboard-payment-void-button-${payment.id}`} onPress={() => openEditPaymentModal(payment)} testID={`screens-admin-dashboard-payment-void-button-${payment.id}`} variant="danger" />
                            ) : null}
                          </View>
                        </View>
                      );
                    })
                  ) : (
                    <View nativeID="screens-admin-dashboard-payments-empty-block" style={styles.emptyBlock} testID="screens-admin-dashboard-payments-empty-block">
                      <Text nativeID="screens-admin-dashboard-payments-empty-title" style={styles.emptyTitle} testID="screens-admin-dashboard-payments-empty-title">Sin pagos registrados</Text>
                      <Text nativeID="screens-admin-dashboard-payments-empty-description" style={styles.emptyDescription} testID="screens-admin-dashboard-payments-empty-description">
                        Registra el primer pago del periodo para que el dashboard empiece a mostrar historial financiero.
                      </Text>
                    </View>
                  )}
                  </AppCard>
                </AnimatedSurface>
                ) : null}

                {isOverviewSection || isOperationsSection ? (
                <AnimatedSurface delay={420}>
                  <AppCard nativeID="screens-admin-dashboard-classes-card" style={styles.panelCard} testID="screens-admin-dashboard-classes-card">
                  <View nativeID="screens-admin-dashboard-classes-header" style={styles.cardHeaderRow} testID="screens-admin-dashboard-classes-header">
                    <Text nativeID="screens-admin-dashboard-classes-title" style={styles.sectionTitle} testID="screens-admin-dashboard-classes-title">Clases</Text>
                    <AppButton
                      label="Agregar clase"
                      onPress={openCreateClassModal}
                      disabled={visibleBranches.length === 0 || disciplineOptions.length === 0}
                    />
                  </View>
                  {ensureDisciplinesMutation.isPending ? (
                    <Text nativeID="screens-admin-dashboard-classes-helper-text" style={styles.helperText} testID="screens-admin-dashboard-classes-helper-text">Preparando clases para esta organizacion.</Text>
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
                        <View key={classItem.id} nativeID={`screens-admin-dashboard-class-row-${classItem.id}`} style={styles.classPanelRow} testID={`screens-admin-dashboard-class-row-${classItem.id}`}>
                          <View nativeID={`screens-admin-dashboard-class-copy-${classItem.id}`} style={styles.classCopy} testID={`screens-admin-dashboard-class-copy-${classItem.id}`}>
                            <View nativeID={`screens-admin-dashboard-class-title-row-${classItem.id}`} style={styles.classTitleRow} testID={`screens-admin-dashboard-class-title-row-${classItem.id}`}>
                              <Text nativeID={`screens-admin-dashboard-class-name-${classItem.id}`} style={styles.className} testID={`screens-admin-dashboard-class-name-${classItem.id}`}>{classItem.name}</Text>
                              <AppBadge
                                label={classItem.is_active ? "Activa" : "Inactiva"}
                                nativeID={`screens-admin-dashboard-class-status-badge-${classItem.id}`}
                                testID={`screens-admin-dashboard-class-status-badge-${classItem.id}`}
                                tone={classItem.is_active ? "success" : "warning"}
                              />
                            </View>
                            <Text nativeID={`screens-admin-dashboard-class-discipline-${classItem.id}`} style={styles.classMeta} testID={`screens-admin-dashboard-class-discipline-${classItem.id}`}>{`Disciplina: ${disciplineName}`}</Text>
                            <Text nativeID={`screens-admin-dashboard-class-branch-${classItem.id}`} style={styles.classMeta} testID={`screens-admin-dashboard-class-branch-${classItem.id}`}>{`Sucursal: ${branchName}`}</Text>
                            <Text nativeID={`screens-admin-dashboard-class-instructor-${classItem.id}`} style={styles.classMeta} testID={`screens-admin-dashboard-class-instructor-${classItem.id}`}>
                              {classItem.instructor_name ? `Instructor: ${classItem.instructor_name}` : "Instructor pendiente"}
                            </Text>
                            <Text nativeID={`screens-admin-dashboard-class-capacity-${classItem.id}`} style={styles.classMeta} testID={`screens-admin-dashboard-class-capacity-${classItem.id}`}>
                              {classItem.capacity ? `Capacidad: ${classItem.capacity} cupos` : "Capacidad sin definir"}
                            </Text>
                            {classItem.description ? <Text nativeID={`screens-admin-dashboard-class-description-${classItem.id}`} style={styles.classMeta} testID={`screens-admin-dashboard-class-description-${classItem.id}`}>{classItem.description}</Text> : null}
                          </View>
                          <View nativeID={`screens-admin-dashboard-class-actions-${classItem.id}`} style={styles.branchActions} testID={`screens-admin-dashboard-class-actions-${classItem.id}`}>
                            <AppButton label="Editar" nativeID={`screens-admin-dashboard-class-edit-button-${classItem.id}`} onPress={() => openEditClassModal(classItem)} testID={`screens-admin-dashboard-class-edit-button-${classItem.id}`} variant="secondary" />
                            {classItem.is_active ? (
                              <AppButton label="Desactivar" nativeID={`screens-admin-dashboard-class-deactivate-button-${classItem.id}`} onPress={() => openEditClassModal(classItem)} testID={`screens-admin-dashboard-class-deactivate-button-${classItem.id}`} variant="danger" />
                            ) : null}
                          </View>
                        </View>
                      );
                    })
                  ) : (
                    <View nativeID="screens-admin-dashboard-classes-empty-block" style={styles.emptyBlock} testID="screens-admin-dashboard-classes-empty-block">
                      <Text nativeID="screens-admin-dashboard-classes-empty-title" style={styles.emptyTitle} testID="screens-admin-dashboard-classes-empty-title">Sin clases registradas</Text>
                      <Text nativeID="screens-admin-dashboard-classes-empty-description" style={styles.emptyDescription} testID="screens-admin-dashboard-classes-empty-description">
                        Crea tu primera clase desde aqui para empezar a operar.
                      </Text>
                    </View>
                  )}
                  </AppCard>
                </AnimatedSurface>
                ) : null}
              </View>
              ) : null}
            </>
          )}
        </View>
      </AdminShell>

      {activeTutorialStep ? (
        <Modal
          animationType="fade"
          onRequestClose={() => {
            void handleTutorialDismiss();
          }}
          transparent
          visible
        >
          <View nativeID="screens-admin-dashboard-tutorial-modal-root" style={styles.tutorialModalRoot} testID="screens-admin-dashboard-tutorial-modal-root">
            <View nativeID="screens-admin-dashboard-tutorial-overlay" style={styles.tutorialOverlay} testID="screens-admin-dashboard-tutorial-overlay" />
            <FirstTimeTutorialBubble
              currentStep={tutorialStepIndex + 1}
              description={activeTutorialStep.description}
              loading={tutorialBusy}
              onAdvance={() => {
                void handleTutorialAdvance();
              }}
              onDismiss={() => {
                void handleTutorialDismiss();
              }}
              style={tutorialDialogStyle}
              title={activeTutorialStep.title}
              totalSteps={FIRST_TIME_TUTORIAL_STEPS.length}
            />
          </View>
        </Modal>
      ) : null}

      <AppModal
        visible={organizationModalVisible}
        title="Editar dojo"
        description="Actualiza la configuracion general visible para la organizacion completa."
        onClose={() => {
          if (!organizationBusy) {
            setOrganizationModalVisible(false);
          }
        }}
      >
        <View style={[styles.formGrid, isDesktop ? desktopStyles.formGrid : null]}>
          <AppInput
            label="Nombre del dojo"
            value={organizationForm.name}
            onChangeText={(value) => setOrganizationForm((current) => ({ ...current, name: value }))}
            error={organizationErrors.name}
            editable={!organizationBusy}
          />
          <AppInput
            autoCapitalize="characters"
            label="Sufijo (3 letras)"
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
          <AppButton label="Guardar cambios" onPress={handleOrganizationSave} loading={organizationBusy} variant="success" />
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
              variant="success"
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
              variant="success"
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
              variant="success"
            />
          </View>
        </View>
      </AppModal>

      <AppModal
        visible={Boolean(selectedPaymentsStudent)}
        title={selectedPaymentsStudent ? `${selectedPaymentsStudent.first_name} ${selectedPaymentsStudent.last_name}` : ""}
        description={selectedPaymentsStudent ? `Historial de pagos agrupado por mes para ${selectedPaymentsStudent.first_name}.` : undefined}
        onClose={() => {
          setSelectedPaymentsStudent(null);
        }}
      >
        {selectedPaymentsStudent ? (
          <>
            <View style={styles.paymentContextBox}>
              <Text style={styles.paymentContextText}>{`Código: ${selectedPaymentsStudent.unique_code}`}</Text>
              <Text style={styles.paymentContextText}>{`Mensualidad: ${formatCurrency(selectedPaymentsStudent.monthly_fee, selectedPaymentsStudent.currency)}`}</Text>
              <Text style={styles.paymentContextText}>{`Próximo pago: ${formatDate(selectedPaymentsStudent.next_payment_date)}`}</Text>
            </View>
            <View style={styles.paymentsHistoryHeaderActions}>
              <AppButton
                label="Registrar pago"
                nativeID="screens-admin-dashboard-payments-history-register-button"
                onPress={() => {
                  setSelectedPaymentsStudent(null);
                  openCreatePaymentModal(selectedPaymentsStudent);
                }}
                testID="screens-admin-dashboard-payments-history-register-button"
                variant="success"
              />
            </View>
            {selectedPaymentsStudentPaymentGroups.length > 0 ? (
              <View style={styles.paymentsHistoryGroupList}>
                {selectedPaymentsStudentPaymentGroups.map((group) => (
                  <View key={group.label} nativeID={`screens-admin-dashboard-payments-history-group-${group.label}`} style={styles.paymentsHistoryGroup} testID={`screens-admin-dashboard-payments-history-group-${group.label}`}>
                    <Text nativeID={`screens-admin-dashboard-payments-history-group-title-${group.label}`} style={styles.paymentsHistoryGroupTitle} testID={`screens-admin-dashboard-payments-history-group-title-${group.label}`}>
                      {group.label}
                    </Text>
                    <View style={styles.paymentsHistoryRows}>
                      {group.items.map((payment) => (
                        <View key={payment.id} nativeID={`screens-admin-dashboard-payments-history-row-${payment.id}`} style={styles.paymentsHistoryRow} testID={`screens-admin-dashboard-payments-history-row-${payment.id}`}>
                          <View nativeID={`screens-admin-dashboard-payments-history-copy-${payment.id}`} style={styles.paymentsHistoryCopy} testID={`screens-admin-dashboard-payments-history-copy-${payment.id}`}>
                            <View nativeID={`screens-admin-dashboard-payments-history-head-${payment.id}`} style={styles.paymentsHistoryHead} testID={`screens-admin-dashboard-payments-history-head-${payment.id}`}>
                              <Text nativeID={`screens-admin-dashboard-payments-history-amount-${payment.id}`} style={styles.paymentsHistoryAmount} testID={`screens-admin-dashboard-payments-history-amount-${payment.id}`}>
                                {formatCurrency(payment.amount, payment.currency)}
                              </Text>
                              <AppBadge
                                label={formatPaymentRecordStatus(payment.status)}
                                nativeID={`screens-admin-dashboard-payments-history-status-${payment.id}`}
                                testID={`screens-admin-dashboard-payments-history-status-${payment.id}`}
                                tone={getPaymentRecordTone(payment.status)}
                              />
                            </View>
                            <Text nativeID={`screens-admin-dashboard-payments-history-meta-${payment.id}`} style={styles.paymentsHistoryMeta} testID={`screens-admin-dashboard-payments-history-meta-${payment.id}`}>
                              {`${formatDate(payment.paid_at)} · ${formatPaymentMethod(payment.method)} · ${formatDate(payment.period_start)} - ${formatDate(payment.period_end)}`}
                            </Text>
                            {payment.notes ? (
                              <Text nativeID={`screens-admin-dashboard-payments-history-notes-${payment.id}`} style={styles.paymentsHistoryNotes} testID={`screens-admin-dashboard-payments-history-notes-${payment.id}`}>
                                {`Notas: ${payment.notes}`}
                              </Text>
                            ) : null}
                          </View>
                          <View nativeID={`screens-admin-dashboard-payments-history-actions-${payment.id}`} style={styles.paymentsHistoryActions} testID={`screens-admin-dashboard-payments-history-actions-${payment.id}`}>
                            <AppButton
                              label="Editar"
                              nativeID={`screens-admin-dashboard-payments-history-edit-button-${payment.id}`}
                              onPress={() => {
                                setSelectedPaymentsStudent(null);
                                openEditPaymentModal(payment);
                              }}
                              testID={`screens-admin-dashboard-payments-history-edit-button-${payment.id}`}
                              variant="secondary"
                            />
                            {payment.status !== "void" ? (
                              <AppButton
                                label="Anular"
                                nativeID={`screens-admin-dashboard-payments-history-void-button-${payment.id}`}
                                onPress={() => {
                                  setSelectedPaymentsStudent(null);
                                  openEditPaymentModal(payment);
                                }}
                                testID={`screens-admin-dashboard-payments-history-void-button-${payment.id}`}
                                variant="danger"
                              />
                            ) : null}
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyBlock}>
                <Text style={styles.emptyTitle}>Sin pagos registrados</Text>
                <Text style={styles.emptyDescription}>Todavía no hay movimientos cargados para este alumno.</Text>
              </View>
            )}
          </>
        ) : null}
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
            items={paymentStudentOptions}
            error={paymentErrors.studentId}
            enabled={!paymentBusy && paymentStudentOptions.length > 0}
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
              variant="success"
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
  delay = 0,
  label,
  value,
  tone,
}: {
  delay?: number;
  label: string;
  value: string;
  tone: "neutral" | "success" | "danger" | "info";
}) {
  const baseId = `screens-admin-dashboard-metric-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const toneStyles =
    tone === "success"
      ? {
          backgroundColor: colors.metricMint,
          icon: "users",
          iconColor: colors.success,
        }
      : tone === "danger"
        ? {
            backgroundColor: colors.metricAmber,
            icon: "alert-circle",
            iconColor: colors.warning,
          }
        : tone === "info"
          ? {
              backgroundColor: colors.metricBlue,
              icon: "user-plus",
              iconColor: colors.info,
            }
          : {
              backgroundColor: colors.metricLavender,
              icon: "activity",
              iconColor: colors.primary,
            };

  return (
    <AnimatedSurface delay={delay}>
      <AppCard nativeID={baseId} style={[styles.metricCard, { backgroundColor: toneStyles.backgroundColor }]} testID={baseId}>
        <View nativeID={`${baseId}-top`} style={styles.metricCardTop} testID={`${baseId}-top`}>
          <View nativeID={`${baseId}-icon`} style={styles.metricIconWrap} testID={`${baseId}-icon`}>
            <Feather color={toneStyles.iconColor} name={toneStyles.icon as keyof typeof Feather.glyphMap} size={18} />
          </View>
          <AppBadge label="Activo" nativeID={`${baseId}-badge`} testID={`${baseId}-badge`} tone={tone} />
        </View>
        <Text nativeID={`${baseId}-value`} style={styles.metricValue} testID={`${baseId}-value`}>{value}</Text>
        <Text nativeID={`${baseId}-label`} style={styles.metricLabel} testID={`${baseId}-label`}>{label}</Text>
      </AppCard>
    </AnimatedSurface>
  );
}

function EntityField({ label, value, idPrefix }: { label: string; value: string; idPrefix?: string }) {
  const baseId = idPrefix ?? `screens-admin-dashboard-entity-field-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <View nativeID={baseId} style={styles.entityField} testID={baseId}>
      <Text nativeID={`${baseId}-label`} style={styles.entityFieldLabel} testID={`${baseId}-label`}>{label}</Text>
      <Text nativeID={`${baseId}-value`} style={styles.entityFieldValue} testID={`${baseId}-value`}>{value}</Text>
    </View>
  );
}

function EditableDetailRow({
  label,
  value,
  onPress,
  idPrefix,
}: {
  label: string;
  value: string;
  onPress?: (() => void) | undefined;
  idPrefix: string;
}) {
  return (
    <View nativeID={idPrefix} style={styles.editableDetailRow} testID={idPrefix}>
      <View nativeID={`${idPrefix}-copy`} style={styles.editableDetailCopy} testID={`${idPrefix}-copy`}>
        <Text nativeID={`${idPrefix}-label`} style={styles.editableDetailLabel} testID={`${idPrefix}-label`}>{label}</Text>
        <Text nativeID={`${idPrefix}-value`} style={styles.editableDetailValue} testID={`${idPrefix}-value`}>{value}</Text>
      </View>
      {onPress ? (
        <Pressable
          accessibilityLabel={`Editar ${label}`}
          accessibilityRole="button"
          nativeID={`${idPrefix}-edit-button`}
          onPress={onPress}
          style={({ pressed }) => [styles.editIconButton, pressed ? styles.editIconButtonPressed : null]}
          testID={`${idPrefix}-edit-button`}
        >
          <Feather color={colors.info} name="edit-2" size={16} />
        </Pressable>
      ) : null}
    </View>
  );
}

function OverviewGraphCard({
  delay,
  idPrefix,
  items,
  subtitle,
  title,
}: {
  delay: number;
  idPrefix: string;
  items: Array<{ key: string; label: string; value: number; tone: string }>;
  subtitle: string;
  title: string;
}) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <AnimatedSurface delay={delay}>
      <AppCard nativeID={idPrefix} style={styles.graphCard} testID={idPrefix}>
        <View nativeID={`${idPrefix}-header`} style={styles.graphCardHeader} testID={`${idPrefix}-header`}>
          <Text nativeID={`${idPrefix}-title`} style={styles.sectionTitle} testID={`${idPrefix}-title`}>{title}</Text>
          <Text nativeID={`${idPrefix}-subtitle`} style={styles.helperText} testID={`${idPrefix}-subtitle`}>{subtitle}</Text>
        </View>
        <View nativeID={`${idPrefix}-rows`} style={styles.graphRows} testID={`${idPrefix}-rows`}>
          {items.map((item) => (
            <View key={item.key} nativeID={`${idPrefix}-row-${item.key}`} style={styles.graphRow} testID={`${idPrefix}-row-${item.key}`}>
              <View nativeID={`${idPrefix}-copy-${item.key}`} style={styles.graphRowCopy} testID={`${idPrefix}-copy-${item.key}`}>
                <Text nativeID={`${idPrefix}-label-${item.key}`} style={styles.graphLabel} testID={`${idPrefix}-label-${item.key}`}>{item.label}</Text>
                <Text nativeID={`${idPrefix}-value-${item.key}`} style={styles.graphValue} testID={`${idPrefix}-value-${item.key}`}>{item.value}</Text>
              </View>
              <View nativeID={`${idPrefix}-track-${item.key}`} style={styles.graphTrack} testID={`${idPrefix}-track-${item.key}`}>
                <View
                  nativeID={`${idPrefix}-fill-${item.key}`}
                  style={[
                    styles.graphFill,
                    {
                      backgroundColor: item.tone,
                      width: `${Math.max((item.value / maxValue) * 100, item.value > 0 ? 12 : 4)}%`,
                    },
                  ]}
                  testID={`${idPrefix}-fill-${item.key}`}
                />
              </View>
            </View>
          ))}
        </View>
      </AppCard>
    </AnimatedSurface>
  );
}

function QuickAction({
  label,
  description,
  onPress,
  disabled = false,
  idPrefix,
  tone = "neutral",
}: {
  label: string;
  description: string;
  onPress: () => void;
  disabled?: boolean;
  idPrefix?: string;
  tone?: "neutral" | "primary" | "success";
}) {
  const toneStyles =
    tone === "primary"
      ? { icon: "plus-circle", iconColor: colors.info }
      : tone === "success"
        ? { icon: "check-circle", iconColor: colors.success }
        : { icon: "arrow-up-right", iconColor: colors.textMuted };

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      nativeID={idPrefix ? `${idPrefix}-button` : undefined}
      onPress={onPress}
      style={(state) => {
        const hovered = (state as typeof state & { hovered?: boolean }).hovered;

        return [
          styles.quickAction,
          tone === "primary" ? styles.quickActionPrimary : null,
          tone === "success" ? styles.quickActionSuccess : null,
          hovered && !disabled ? styles.quickActionHovered : null,
          disabled ? styles.quickActionDisabled : null,
          state.pressed && !disabled ? styles.quickActionPressed : null,
        ];
      }}
      testID={idPrefix ? `${idPrefix}-button` : undefined}
    >
      <View nativeID={idPrefix ? `${idPrefix}-header` : undefined} style={styles.quickActionHeader} testID={idPrefix ? `${idPrefix}-header` : undefined}>
        <View nativeID={idPrefix ? `${idPrefix}-icon` : undefined} style={styles.quickActionIconWrap} testID={idPrefix ? `${idPrefix}-icon` : undefined}>
          <Feather color={toneStyles.iconColor} name={toneStyles.icon as keyof typeof Feather.glyphMap} size={16} />
        </View>
        <Text
          nativeID={idPrefix ? `${idPrefix}-title` : undefined}
          style={[
            styles.quickActionTitle,
            tone === "primary" ? styles.quickActionTitlePrimary : null,
            tone === "success" ? styles.quickActionTitleSuccess : null,
          ]}
          testID={idPrefix ? `${idPrefix}-title` : undefined}
        >
          {label}
        </Text>
      </View>
      <Text nativeID={idPrefix ? `${idPrefix}-description` : undefined} style={styles.quickActionDescription} testID={idPrefix ? `${idPrefix}-description` : undefined}>{description}</Text>
    </Pressable>
  );
}

function FirstTimeTutorialBubble({
  currentStep,
  description,
  loading = false,
  onAdvance,
  onDismiss,
  style,
  title,
  totalSteps,
}: {
  currentStep: number;
  description: string;
  loading?: boolean;
  onAdvance: () => void;
  onDismiss: () => void;
  style?: StyleProp<ViewStyle>;
  title: string;
  totalSteps: number;
}) {
  return (
    <View
      nativeID={`screens-admin-dashboard-tutorial-step-${currentStep}`}
      style={[styles.tutorialBubble, style]}
      testID={`screens-admin-dashboard-tutorial-step-${currentStep}`}
    >
      <View style={styles.tutorialHeaderRow}>
        <View style={styles.tutorialHeader}>
          <Text style={styles.tutorialEyebrow}>{`Tutorial inicial - Paso ${currentStep} de ${totalSteps}`}</Text>
          <Text style={styles.tutorialTitle}>{title}</Text>
        </View>
        <Pressable
          accessibilityLabel="Cerrar tutorial"
          accessibilityRole="button"
          nativeID={`screens-admin-dashboard-tutorial-close-button-${currentStep}`}
          onPress={onDismiss}
          style={({ pressed }) => [styles.tutorialCloseButton, pressed ? styles.tutorialCloseButtonPressed : null]}
          testID={`screens-admin-dashboard-tutorial-close-button-${currentStep}`}
        >
          <Text
            nativeID={`screens-admin-dashboard-tutorial-close-label-${currentStep}`}
            style={styles.tutorialCloseLabel}
            testID={`screens-admin-dashboard-tutorial-close-label-${currentStep}`}
          >
            ×
          </Text>
        </Pressable>
      </View>
      <Text style={styles.tutorialDescription}>{description}</Text>
      <View style={styles.tutorialActions}>
        <AppButton
          label={currentStep === totalSteps ? "Finalizar guia" : "Siguiente"}
          loading={loading}
          onPress={onAdvance}
          variant="secondary"
        />
      </View>
    </View>
  );
}

function AnimatedSurface({
  children,
  delay = 0,
  nativeID,
  style,
  testID,
}: {
  children: ReactNode;
  delay?: number;
  nativeID?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    const animation = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    animation.start();

    return () => {
      animation.stop();
    };
  }, [delay, opacity, translateY]);

  return (
    <Animated.View
      nativeID={nativeID}
      style={[style, { opacity, transform: [{ translateY }] }]}
      testID={testID}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    flexGrow: 1,
  },
  container: {
    gap: spacing.lg,
    position: "relative",
    width: "100%",
  },
  tutorialAnchorTarget: {
    minWidth: 0,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 28,
    gap: spacing.lg,
  },
  heroTop: {
    gap: spacing.md,
  },
  heroCopy: {
    gap: spacing.sm,
    minWidth: 0,
  },
  tutorialBubble: {
    backgroundColor: colors.surface,
    borderColor: colors.action,
    borderRadius: 20,
    borderWidth: 1,
    gap: spacing.md,
    maxWidth: 420,
    padding: spacing.lg,
    position: "absolute",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    zIndex: 2,
    elevation: 12,
  },
  tutorialModalRoot: {
    flex: 1,
  },
  tutorialOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(17, 17, 17, 0.68)",
  },
  tutorialHeaderRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  tutorialHeader: {
    flex: 1,
    gap: 4,
  },
  tutorialEyebrow: {
    color: colors.action,
    fontFamily: typography.headingFamily,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  tutorialTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 26,
  },
  tutorialDescription: {
    color: colors.text,
    fontFamily: typography.bodyFamily,
    fontSize: 16,
    lineHeight: 24,
  },
  tutorialActions: {
    alignItems: "flex-start",
  },
  tutorialCloseButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  tutorialCloseButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.96 }],
  },
  tutorialCloseLabel: {
    color: colors.ink,
    fontFamily: typography.headingFamily,
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 24,
  },
  heroActions: {
    gap: spacing.sm,
    minWidth: 0,
  },
  headerActionGroup: {
    gap: spacing.sm,
    minWidth: 0,
  },
  title: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 15,
    lineHeight: 22,
  },
  scopeRow: {
    gap: spacing.md,
  },
  scopeItem: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    padding: spacing.md,
  },
  scopeLabel: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  scopeValue: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 18,
    fontWeight: "800",
  },
  metricsGrid: {
    gap: spacing.md,
  },
  chartGrid: {
    gap: spacing.md,
  },
  metricCard: {
    borderColor: "transparent",
    borderRadius: 22,
    flex: 1,
    minHeight: 126,
    minWidth: 0,
  },
  metricCardTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metricIconWrap: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.48)",
    borderRadius: 14,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  metricValue: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 34,
    fontWeight: "800",
  },
  metricLabel: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  graphCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
    flex: 1,
    gap: spacing.md,
    minWidth: 0,
  },
  graphCardHeader: {
    gap: spacing.xs,
  },
  graphRows: {
    gap: spacing.sm,
  },
  graphRow: {
    gap: spacing.xs,
  },
  graphRowCopy: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  graphLabel: {
    color: colors.text,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    fontWeight: "600",
  },
  graphValue: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 14,
    fontWeight: "700",
  },
  graphTrack: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    height: 10,
    overflow: "hidden",
  },
  graphFill: {
    borderRadius: radius.pill,
    height: "100%",
    minWidth: 6,
  },
  contentGrid: {
    gap: spacing.md,
  },
  sectionFocusCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 28,
    gap: spacing.md,
  },
  panelCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 28,
    flex: 1,
    gap: spacing.md,
    minWidth: 0,
    width: "100%",
  },
  cardHeaderRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  cardHeaderColumn: {
    alignItems: "flex-start",
    flexDirection: "column",
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
  headerButtonStack: {
    alignSelf: "stretch",
    minWidth: 0,
  },
  quickAction: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  quickActionPrimary: {
    backgroundColor: colors.infoSoft,
  },
  quickActionSuccess: {
    backgroundColor: colors.successSoft,
  },
  quickActionHovered: {
    backgroundColor: colors.hoverStrong,
    borderColor: colors.action,
  },
  quickActionDisabled: {
    opacity: 0.6,
  },
  quickActionPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.99 }],
  },
  quickActionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  quickActionIconWrap: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 14,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  quickActionTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 16,
    fontWeight: "700",
  },
  quickActionTitlePrimary: {
    color: colors.action,
  },
  quickActionTitleSuccess: {
    color: colors.success,
  },
  quickActionDescription: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 20,
  },
  feedbackBanner: {
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  feedbackSuccess: {
    backgroundColor: colors.successSoft,
  },
  feedbackDanger: {
    backgroundColor: colors.dangerSoft,
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
    lineHeight: 22,
  },
  detailList: {
    gap: spacing.sm,
  },
  editableDetailRow: {
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    padding: spacing.md,
  },
  editableDetailCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  editableDetailLabel: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  editableDetailValue: {
    color: colors.text,
    fontFamily: typography.bodyFamily,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 21,
  },
  editIconButton: {
    alignItems: "center",
    backgroundColor: colors.infoSoft,
    borderRadius: radius.pill,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  editIconButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.96 }],
  },
  branchRow: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  branchCopy: {
    minWidth: 0,
    gap: 4,
  },
  branchTitleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    justifyContent: "flex-start",
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
    width: "100%",
  },
  publicRouteBlock: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.sm,
  },
  paymentSummaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  paymentsPaginationSummary: {
    alignItems: "flex-start",
  },
  paymentsStudentList: {
    gap: spacing.sm,
  },
  paymentsStudentRow: {
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderBottomWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    padding: spacing.md,
  },
  paymentsStudentRowPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.995 }],
  },
  paymentsStudentCopy: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  paymentsStudentHead: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  paymentsStudentName: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 16,
    fontWeight: "800",
  },
  paymentsStudentMeta: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 19,
  },
  paymentsStudentSummary: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  paymentsStudentSummaryText: {
    color: colors.text,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
  },
  paymentsStudentAction: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  paymentsStudentActionLabel: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  paymentsMatrixGrid: {
    gap: spacing.sm,
  },
  paymentsMatrixGridDesktop: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  paymentRow: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  paymentRowCompact: {
    borderRadius: 18,
    gap: spacing.xs,
    padding: spacing.sm,
  },
  paymentRowDesktop: {
    flexBasis: "31%",
    maxWidth: "31%",
    minWidth: 250,
  },
  paymentRowTablet: {
    flexBasis: "48%",
    maxWidth: "48%",
    minWidth: 260,
  },
  paymentHeaderRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  paymentAmountBlock: {
    minWidth: 0,
    gap: 4,
  },
  paymentAmount: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 18,
    fontWeight: "800",
  },
  paymentAmountCompact: {
    fontSize: 16,
  },
  paymentMeta: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 19,
  },
  paymentMetaCompact: {
    fontSize: 12,
    lineHeight: 17,
  },
  paymentMetaGrid: {
    gap: spacing.sm,
  },
  paymentCompactDetails: {
    gap: 4,
  },
  paymentCompactDetail: {
    color: colors.text,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
    lineHeight: 17,
  },
  paymentNote: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 20,
  },
  paymentNoteCompact: {
    fontSize: 12,
    lineHeight: 17,
  },
  paymentsPaginationControls: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  paymentsPaginationLabel: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  paymentsHistoryHeaderActions: {
    alignItems: "flex-start",
  },
  paymentsHistoryGroupList: {
    gap: spacing.md,
  },
  paymentsHistoryGroup: {
    gap: spacing.sm,
  },
  paymentsHistoryGroupTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 16,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  paymentsHistoryRows: {
    gap: spacing.sm,
  },
  paymentsHistoryRow: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  paymentsHistoryCopy: {
    gap: 4,
    minWidth: 0,
  },
  paymentsHistoryHead: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  paymentsHistoryAmount: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 16,
    fontWeight: "800",
  },
  paymentsHistoryMeta: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 19,
  },
  paymentsHistoryNotes: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 19,
  },
  paymentsHistoryActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "flex-end",
  },
  paymentContextBox: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 18,
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
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  attendanceHeaderRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  attendanceCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
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
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  classCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  classTitleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    justifyContent: "flex-start",
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
    padding: spacing.md,
  },
  heroTop: {
    flexDirection: "column",
  },
  heroActions: {
    alignItems: "stretch",
    flexDirection: "column",
    width: "100%",
  },
  headerActionGroup: {
    alignItems: "stretch",
    flexDirection: "column",
    width: "100%",
  },
  scopeRow: {
    flexDirection: "column",
  },
  metricsGrid: {
    flexDirection: "column",
  },
  chartGrid: {
    flexDirection: "column",
  },
  contentGrid: {
    flexDirection: "column",
  },
  titleCompact: {
    fontSize: 24,
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
  heroActions: {
    alignItems: "flex-end",
  },
  headerActionGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  scopeRow: {
    flexDirection: "row",
  },
  metricsGrid: {
    flexDirection: "row",
  },
  chartGrid: {
    alignItems: "stretch",
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
