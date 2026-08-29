import { Feather } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Image, Linking, Modal, Platform, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle, useWindowDimensions } from "react-native";

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
import { AppStatusSwitch } from "@/components/AppStatusSwitch";
import { AdminSectionDashboardTemplate } from "@/components/AdminSectionDashboardTemplate";
import { AdminShell } from "@/components/AdminShell";
import { BottomSheet, type BottomSheetAction } from "@/components/BottomSheet";
import { FloatingActionButton } from "@/components/FloatingActionButton";
import { AttendanceProgressView, type AttendanceSuccessPayload, type AttendanceStepStatus } from "@/components/AttendanceProgressView";
import { QrScanner, type QrScannerAttendanceProcessState } from "@/components/QrScanner";
import { SkeletonCardGrid, SkeletonList } from "@/components/SkeletonLoader";
import { Screen } from "@/components/Screen";
import { StatusView } from "@/components/StatusView";
import {
  colors,
  indigoBlue as indigo,
  indigoBlueSoft as indigoSoft,
  judogiRed,
  judogiRedSoft as judogiRedSoft,
  radius,
  shadows,
  spacing,
  tatamiGreen as matchaGreen,
  tatamiGreenSoft as matchaGreenSoft,
  transitions,
  typography,
} from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useCameraAvailability } from "@/hooks/useCameraAvailability";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { formatCurrency, formatDate, formatDateTime, formatPaymentMethod, formatPaymentRecordStatus, formatPaymentStatus } from "@/utils/format";
import { buildPublicAttendanceUrl } from "@/utils/publicAttendanceRoute";
import { getDomainConfig } from "@/utils/domains";

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
type BranchesDashboardView = "list" | "summary";
type OperationsDashboardView = "attendance" | "classes" | null;
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
  const cfg = getDomainConfig();
  const origin = cfg.publicWebOrigin;
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
  const domainConfig = getDomainConfig();
  const publicAttendanceOrigin = domainConfig.publicWebOrigin;
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
  const [quickScannerVisible, setQuickScannerVisible] = useState(false);
  const [quickScannerProcess, setQuickScannerProcess] = useState<QrScannerAttendanceProcessState | null>(null);
  const [quickAttendanceModalVisible, setQuickAttendanceModalVisible] = useState(false);
  const [quickAttendanceFeedback, setQuickAttendanceFeedback] = useState<{ tone: "success" | "danger"; message: string } | null>(null);
  const [quickStudentIdentifier, setQuickStudentIdentifier] = useState("");
  const debouncedQuickIdentifier = useDebouncedValue(quickStudentIdentifier, 350);
  const { status: quickCameraStatus, isEnabled: quickQrEnabled } = useCameraAvailability();

  const openQuickScannerProcess = useCallback(() => {
    setQuickScannerProcess({
      lookupStatus: "pending",
      registerStatus: "pending",
      overallStatus: "processing",
      errorMessage: null,
      successPayload: null,
      successCountdown: null,
    });
  }, []);

  const closeQuickScannerProcess = useCallback(() => {
    setQuickScannerProcess(null);
  }, []);

  const resetQuickScannerAndOpenCamera = useCallback(() => {
    closeQuickScannerProcess();
    setQuickScannerVisible(true);
  }, [closeQuickScannerProcess]);

  useEffect(() => {
    if (!quickScannerProcess) return;
    if (quickScannerProcess.overallStatus !== "success") return;
    if (quickScannerProcess.successCountdown === null) return;
    if (quickScannerProcess.successCountdown <= 0) {
      closeQuickScannerProcess();
      setQuickScannerVisible(false);
      return;
    }
    const id = setTimeout(() => {
      setQuickScannerProcess((current: QrScannerAttendanceProcessState | null) => {
        if (!current || current.overallStatus !== "success" || current.successCountdown === null) return current;
        const next = current.successCountdown - 1;
        return { ...current, successCountdown: next };
      });
    }, 1000);
    return () => clearTimeout(id);
  }, [closeQuickScannerProcess, quickScannerProcess]);


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
  const [paymentsSearchQuery, setPaymentsSearchQuery] = useState("");
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [branchesDashboardView, setBranchesDashboardView] = useState<BranchesDashboardView>("list");
  const [selectedBranchDashboardId, setSelectedBranchDashboardId] = useState<string>("");
  const [operationsDashboardView, setOperationsDashboardView] = useState<OperationsDashboardView>(null);
  const [operationsSearchQuery, setOperationsSearchQuery] = useState("");
  const [operationsPage, setOperationsPage] = useState(1);
  const [operationsSelectedClassId, setOperationsSelectedClassId] = useState<string>("");
  const [operationsClassPickerVisible, setOperationsClassPickerVisible] = useState(false);
  const [operationsClassPickerValue, setOperationsClassPickerValue] = useState("");
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0);
  const [tutorialBusy, setTutorialBusy] = useState(false);
  const [tutorialAnchorFrame, setTutorialAnchorFrame] = useState<TutorialAnchorFrame | null>(null);
  const tutorialAnchorRefs = useRef<Record<TutorialStepId, View | null>>({
    attendance: null,
    branches: null,
    crud: null,
    hero: null,
  });
  const [dashboardSheetVisible, setDashboardSheetVisible] = useState(false);
  const [rowContextVisible, setRowContextVisible] = useState(false);
  const [rowContext, setRowContext] = useState<
    | { type: "branch"; entity: Branch }
    | { type: "attendance"; entity: Attendance }
    | { type: "payment"; entity: Payment }
    | { type: "class"; entity: MartialClass }
    | null
  >(null);

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
  const normalizedPaymentsSearchQuery = paymentsSearchQuery.trim().toLowerCase();
  const filteredPaymentScopedStudents = useMemo(
    () =>
      normalizedPaymentsSearchQuery
        ? paymentScopedStudentsSorted.filter((student) => {
            const searchableStudentText = [
              student.id,
              student.unique_code,
              student.first_name,
              student.last_name,
              `${student.first_name} ${student.last_name}`,
            ]
              .join(" ")
              .toLowerCase();

            return searchableStudentText.includes(normalizedPaymentsSearchQuery);
          })
        : paymentScopedStudentsSorted,
    [normalizedPaymentsSearchQuery, paymentScopedStudentsSorted]
  );
  const filteredPaymentScopedPendingPayments = useMemo(
    () =>
      filteredPaymentScopedStudents.reduce((total, student) => {
        const pendingCount = (paymentScopedPaymentsByStudentId.get(student.id) ?? []).filter((payment) => payment.status === "pending").length;
        return total + pendingCount;
      }, 0),
    [filteredPaymentScopedStudents, paymentScopedPaymentsByStudentId]
  );
  const paymentsPageSize = isMobile ? 6 : 12;
  const paymentsTotalPages = Math.max(1, Math.ceil(filteredPaymentScopedStudents.length / paymentsPageSize));
  const paginatedPaymentScopedStudents = useMemo(() => {
    const startIndex = (paymentsPage - 1) * paymentsPageSize;
    return filteredPaymentScopedStudents.slice(startIndex, startIndex + paymentsPageSize);
  }, [filteredPaymentScopedStudents, paymentsPage, paymentsPageSize]);
  const paymentsRangeStart = filteredPaymentScopedStudents.length === 0 ? 0 : (paymentsPage - 1) * paymentsPageSize + 1;
  const paymentsRangeEnd = Math.min(paymentsPage * paymentsPageSize, filteredPaymentScopedStudents.length);
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
  const branchDashboardRows = useMemo(
    () =>
      visibleBranches.map((branch) => {
        const branchStudents = visibleStudents.filter((student) => student.branch_id === branch.id);
        const branchClasses = visibleClasses.filter((classItem) => classItem.branch_id === branch.id);
        const branchAttendance = visibleAttendanceRecords.filter((attendance) => attendance.branch_id === branch.id);
        const branchPendingPayments = visiblePayments.filter((payment) => payment.branch_id === branch.id && payment.status === "pending");

        return {
          branch,
          studentsCount: branchStudents.length,
          activeClassesCount: branchClasses.filter((classItem) => classItem.is_active).length,
          todayAttendanceCount: branchAttendance.filter((attendance) => attendance.check_in_at.slice(0, 10) === new Date().toISOString().slice(0, 10)).length,
          pendingPaymentsCount: branchPendingPayments.length,
        };
      }),
    [visibleAttendanceRecords, visibleBranches, visibleClasses, visiblePayments, visibleStudents]
  );
  const selectedBranchDashboard = useMemo(() => {
    if (selectedBranchDashboardId) {
      const explicitBranch = visibleBranches.find((item) => String(item.id) === selectedBranchDashboardId) ?? null;
      if (explicitBranch) {
        return explicitBranch;
      }
    }

    return currentBranch ?? visibleBranches[0] ?? null;
  }, [currentBranch, selectedBranchDashboardId, visibleBranches]);
  const selectedBranchDashboardRow = useMemo(
    () => branchDashboardRows.find((item) => item.branch.id === selectedBranchDashboard?.id) ?? null,
    [branchDashboardRows, selectedBranchDashboard]
  );
  const operationsClassOptions = useMemo(
    () =>
      visibleClasses.map((item) => ({
        label: item.name,
        value: String(item.id),
      })),
    [visibleClasses]
  );
  const selectedOperationsClass = useMemo(
    () => visibleClasses.find((item) => String(item.id) === operationsSelectedClassId) ?? null,
    [operationsSelectedClassId, visibleClasses]
  );
  const normalizedOperationsSearchQuery = operationsSearchQuery.trim().toLowerCase();
  const filteredOperationsAttendanceRecords = useMemo(
    () =>
      visibleAttendanceRecords.filter((attendance) => {
        if (operationsSelectedClassId && String(attendance.class_id) !== operationsSelectedClassId) {
          return false;
        }

        if (!normalizedOperationsSearchQuery) {
          return true;
        }

        const student = visibleStudents.find((item) => item.id === attendance.student_id) ?? null;
        const searchableAttendanceText = [
          student?.first_name ?? "",
          student?.last_name ?? "",
          student?.unique_code ?? "",
          attendance.student_id,
        ]
          .join(" ")
          .toLowerCase();

        return searchableAttendanceText.includes(normalizedOperationsSearchQuery);
      }),
    [normalizedOperationsSearchQuery, operationsSelectedClassId, visibleAttendanceRecords, visibleStudents]
  );
  const filteredOperationsClasses = useMemo(
    () =>
      normalizedOperationsSearchQuery
        ? visibleClasses.filter((classItem) => {
            const searchableClassText = [
              classItem.name,
              classItem.instructor_name ?? "",
              classItem.description ?? "",
              classItem.discipline_name ?? "",
            ]
              .join(" ")
              .toLowerCase();

            return searchableClassText.includes(normalizedOperationsSearchQuery);
          })
        : visibleClasses,
    [normalizedOperationsSearchQuery, visibleClasses]
  );
  const operationsPageSize = 12;
  const operationsSourceLength =
    operationsDashboardView === "attendance"
      ? filteredOperationsAttendanceRecords.length
      : operationsDashboardView === "classes"
        ? filteredOperationsClasses.length
        : 0;
  const operationsTotalPages = Math.max(1, Math.ceil(operationsSourceLength / operationsPageSize));
  const paginatedOperationsAttendanceRecords = useMemo(() => {
    const startIndex = (operationsPage - 1) * operationsPageSize;
    return filteredOperationsAttendanceRecords.slice(startIndex, startIndex + operationsPageSize);
  }, [filteredOperationsAttendanceRecords, operationsPage]);
  const paginatedOperationsClasses = useMemo(() => {
    const startIndex = (operationsPage - 1) * operationsPageSize;
    return filteredOperationsClasses.slice(startIndex, startIndex + operationsPageSize);
  }, [filteredOperationsClasses, operationsPage]);
  const operationsDashboardTitle =
    operationsDashboardView === "attendance"
      ? "Asistencias"
      : operationsDashboardView === "classes"
        ? "Clases"
        : "Selecciona una vista";
  const operationsDashboardLinkLabel =
    operationsDashboardView === "attendance"
      ? "Cambiar clase"
      : operationsDashboardView === "classes"
        ? "Registrar clase"
        : null;
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

  const copyPublicAttendanceUrl = async (url: string) => {
    if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      setFeedback({ tone: "success", message: "La liga publica se copio al portapapeles." });
      return;
    }

    setFeedback({ tone: "danger", message: "No fue posible copiar la liga desde este dispositivo." });
  };

  useEffect(() => {
    if (!quickAttendanceFeedback) return;
    const id = setTimeout(() => setQuickAttendanceFeedback(null), 3500);
    return () => clearTimeout(id);
  }, [quickAttendanceFeedback]);

  const invalidateAttendanceQueries = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["dashboard-attendance"] }),
      queryClient.invalidateQueries({ queryKey: ["students"] }),
    ]);
  }, [queryClient]);

  const quickRegisterSubmit = useCallback(
    async (rawIdentifier: string, forcedClassId?: number | null) => {
      const identifier = rawIdentifier.trim().toUpperCase();
      if (!identifier) {
        setQuickAttendanceFeedback({ tone: "danger", message: "Escribe el código o ID del alumno." });
        return;
      }

      const selectedBranchId =
        (attendanceForm.branchId ? Number(attendanceForm.branchId) : undefined) ??
        scopedBranchId ??
        visibleBranches[0]?.id;
      if (!selectedBranchId) {
        setQuickAttendanceFeedback({ tone: "danger", message: "No se pudo determinar la sucursal." });
        return;
      }

      let matchedStudent: Student | null = null;
      try {
        const numericId = Number(identifier);
        if (!Number.isNaN(numericId) && numericId > 0) {
          const foundById = visibleStudents.find((s) => s.id === numericId) ?? null;
          if (foundById) matchedStudent = foundById;
        }
        if (!matchedStudent) {
          const results = await studentsApi.list({ search: identifier });
          matchedStudent = results.find((s) => s.unique_code.toUpperCase() === identifier) ?? results[0] ?? null;
        }
      } catch (err) {
        setQuickAttendanceFeedback({ tone: "danger", message: getErrorMessage(err) });
        return;
      }

      if (!matchedStudent) {
        setQuickAttendanceFeedback({ tone: "danger", message: `No se encontró alumno con identificador ${identifier}.` });
        return;
      }

      let classId: number | null = null;
      if (forcedClassId) {
        classId = forcedClassId;
      } else if (attendanceForm.classId && attendanceForm.classId !== "none") {
        classId = Number(attendanceForm.classId);
      } else if (matchedStudent.primary_class_id) {
        classId = matchedStudent.primary_class_id;
      } else {
        const classCandidate = visibleClasses.find(
          (c) => c.branch_id === (matchedStudent.branch_id || selectedBranchId) && c.is_active
        );
        classId = classCandidate?.id ?? visibleClasses[0]?.id ?? null;
      }

      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const isoDate = now.toISOString().slice(0, 10);

      try {
        await attendanceApi.create({
          student_id: matchedStudent.id,
          branch_id: matchedStudent.branch_id || selectedBranchId,
          class_id: classId,
          check_in_at: `${isoDate}T${hh}:${mm}:00`,
          method: "manual",
          registered_by: user?.id ?? null,
        });
        await invalidateAttendanceQueries();
        setQuickAttendanceFeedback({ tone: "success", message: `Asistencia registrada para ${matchedStudent.first_name} ${matchedStudent.last_name}.` });
        setQuickStudentIdentifier("");
      } catch (err) {
        setQuickAttendanceFeedback({ tone: "danger", message: getErrorMessage(err) });
      }
    },
    [attendanceForm.branchId, attendanceForm.classId, invalidateAttendanceQueries, scopedBranchId, user?.id, visibleBranches, visibleClasses, visibleStudents]
  );

  const handleQuickQrCodeScanned = useCallback(
    async (code: string) => {
      const normalized = code.trim().toUpperCase();
      if (!normalized) return;
      setQuickAttendanceFeedback(null);
      setQuickStudentIdentifier(normalized);
      openQuickScannerProcess();
      let matchedStudent: (typeof visibleStudents)[number] | null = null;
      let classId: number | null = null;
      let selectedBranchId: number | null = null;
      let createdAttendanceId: number | null = null;
      try {
        setQuickScannerProcess((current: QrScannerAttendanceProcessState | null) =>
          current ? { ...current, lookupStatus: "active" } : current
        );
        const students = await studentsApi.list({ search: normalized });
        matchedStudent = students.find((s) => s.unique_code.toUpperCase() === normalized) ?? null;
        if (!matchedStudent) {
          setQuickScannerProcess({
            lookupStatus: "error",
            registerStatus: "pending",
            overallStatus: "error",
            errorMessage: `No se encontró alumno con código ${normalized}.`,
            successPayload: null,
            successCountdown: null,
          });
          setQuickAttendanceFeedback({ tone: "danger", message: `No se encontró alumno con código ${normalized}.` });
          return;
        }
        setQuickScannerProcess((current: QrScannerAttendanceProcessState | null) =>
          current
            ? { ...current, lookupStatus: "done", registerStatus: "active" }
            : current
        );
        selectedBranchId = matchedStudent.branch_id || scopedBranchId || visibleBranches[0]?.id ?? null;
        classId = matchedStudent.primary_class_id ||
          visibleClasses.find((c) => c.branch_id === selectedBranchId && c.is_active)?.id ||
          visibleClasses[0]?.id ?? null;
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, "0");
        const mm = String(now.getMinutes()).padStart(2, "0");
        const isoDate = now.toISOString().slice(0, 10);
        const created = await attendanceApi.create({
          student_id: matchedStudent.id,
          branch_id: selectedBranchId ?? undefined,
          class_id: classId ?? undefined,
          check_in_at: `${isoDate}T${hh}:${mm}:00`,
          method: "qr",
          registered_by: user?.id ?? null,
        });
        createdAttendanceId = created?.id ?? null;
        await invalidateAttendanceQueries();
        const successPayload: AttendanceSuccessPayload = {
          attendance_id: createdAttendanceId ?? `QR-${matchedStudent!.id}-${Date.now()}`,
          student_name: `${matchedStudent!.first_name} ${matchedStudent!.last_name}`,
          class_name: visibleClasses.find((c) => c.id === classId)?.name ?? matchedStudent!.primary_class_id
            ? visibleClasses.find((c) => c.id === matchedStudent!.primary_class_id)?.name ?? "Clase general"
            : "Clase general",
          check_in_at: `${isoDate}T${hh}:${mm}:00`,
          selected_class_name: visibleClasses.find((c) => c.id === classId)?.name ?? undefined,
        };
        setQuickScannerProcess({
          lookupStatus: "done",
          registerStatus: "done",
          overallStatus: "success",
          errorMessage: null,
          successPayload,
          successCountdown: 3,
        });
        setQuickAttendanceFeedback({
          tone: "success",
          message: `Asistencia QR registrada para ${matchedStudent.first_name} ${matchedStudent.last_name}.`,
        });
      } catch (err) {
        const message = getErrorMessage(err);
        setQuickScannerProcess({
          lookupStatus: matchedStudent ? "done" : "active",
          registerStatus: "error",
          overallStatus: "error",
          errorMessage: message,
          successPayload: null,
          successCountdown: null,
        });
        setQuickAttendanceFeedback({ tone: "danger", message });
      }
    },
    [invalidateAttendanceQueries, openQuickScannerProcess, scopedBranchId, user?.id, visibleBranches, visibleClasses, visibleStudents]
  );

  const renderQuickAttendanceForm = (variant: "hero" | "operations") => {
    if (variant === "hero") {
      return (
        <View
          collapsable={false}
          nativeID="screens-admin-dashboard-quick-attendance-hero"
          style={[styles.quickAttendancePanel, isDesktop ? desktopStyles.quickAttendancePanel : mobileStyles.quickAttendancePanel]}
          testID="screens-admin-dashboard-quick-attendance-hero"
        >
          <View
            nativeID="screens-admin-dashboard-quick-attendance-form-hero"
            style={styles.quickHeroLinkRow}
            testID="screens-admin-dashboard-quick-attendance-form-hero"
          >
            <Pressable
              accessibilityRole="link"
              nativeID="screens-admin-dashboard-quick-attendance-link-hero"
              onPress={() => {
                setQuickAttendanceFeedback(null);
                setQuickAttendanceModalVisible(true);
              }}
              style={({ pressed }) => {
                const hovered = (pressed as unknown as { hovered?: boolean }).hovered;
                return [
                  styles.quickHeroLink,
                  pressed || hovered ? styles.quickHeroLinkPressed : null,
                ];
              }}
              testID="screens-admin-dashboard-quick-attendance-link-hero"
            >
              <Feather name="check-square" size={16} color={indigo} />
              <Text style={styles.quickHeroLinkLabel}>Registrar asistencia</Text>
              <Feather name="chevron-right" size={16} color={indigo} />
            </Pressable>
          </View>
        </View>
      );
    }

    const wrapStyle = [styles.quickAttendancePanelInline, isDesktop ? desktopStyles.quickAttendancePanelInline : mobileStyles.quickAttendancePanelInline];
    const quickClassValue = attendanceForm.classId && attendanceForm.classId !== "none" ? Number(attendanceForm.classId) : null;
    return (
      <View
        collapsable={false}
        nativeID={`screens-admin-dashboard-quick-attendance-${variant}`}
        style={wrapStyle}
        testID={`screens-admin-dashboard-quick-attendance-${variant}`}
      >
        {quickAttendanceFeedback ? (
          <View
            nativeID={`screens-admin-dashboard-quick-attendance-feedback-${variant}`}
            style={[
              styles.quickFeedbackBanner,
              quickAttendanceFeedback.tone === "success"
                ? { backgroundColor: matchaGreenSoft, borderColor: "rgba(85,139,47,0.22)" }
                : { backgroundColor: judogiRedSoft, borderColor: "rgba(198,40,40,0.22)" },
            ]}
            testID={`screens-admin-dashboard-quick-attendance-feedback-${variant}`}
          >
            <Feather
              name={quickAttendanceFeedback.tone === "success" ? "check-circle" : "alert-triangle"}
              size={15}
              color={quickAttendanceFeedback.tone === "success" ? matchaGreen : judogiRed}
            />
            <Text
              style={[
                styles.quickFeedbackText,
                { color: quickAttendanceFeedback.tone === "success" ? matchaGreen : judogiRed },
              ]}
            >
              {quickAttendanceFeedback.message}
            </Text>
          </View>
        ) : null}
        <View
          nativeID={`screens-admin-dashboard-quick-attendance-form-${variant}`}
          style={[styles.quickFormRow, isDesktop ? desktopStyles.quickFormRow : mobileStyles.quickFormRow]}
          testID={`screens-admin-dashboard-quick-attendance-form-${variant}`}
        >
          {!isDesktop ? (
            <Pressable
              accessibilityRole="button"
              disabled={!quickQrEnabled || createAttendanceMutation.isPending}
              nativeID={`screens-admin-dashboard-quick-attendance-qr-button-${variant}`}
              onPress={() => {
                setQuickAttendanceFeedback(null);
                setQuickScannerVisible(true);
              }}
              style={({ pressed }) => [
                styles.quickQrButton,
                !quickQrEnabled ? styles.quickQrButtonDisabled : null,
                pressed ? styles.quickQrButtonPressed : null,
              ]}
              testID={`screens-admin-dashboard-quick-attendance-qr-button-${variant}`}
            >
              <Feather name="maximize-2" size={16} color={quickQrEnabled ? colors.surface : colors.textMuted} />
              <Text
                style={[
                  styles.quickQrButtonLabel,
                  !quickQrEnabled ? { color: colors.textMuted } : null,
                ]}
              >
                Escanear QR
              </Text>
            </Pressable>
          ) : (
            <View nativeID={`screens-admin-dashboard-quick-attendance-qr-legend-${variant}`} style={styles.quickQrDesktopLegend} testID={`screens-admin-dashboard-quick-attendance-qr-legend-${variant}`}>
              <View style={[styles.quickQrButton, styles.quickQrButtonDisabled]}>
                <Feather name="maximize-2" size={16} color={colors.textMuted} />
                <Text style={[styles.quickQrButtonLabel, { color: colors.textMuted }]}>
                  Escanear QR
                </Text>
              </View>
              <Text style={styles.quickQrLegendText}>Solo disponible en celular-tablet</Text>
            </View>
          )}
          <View style={[styles.quickFieldWrap, styles.quickClassField]}>
            <AppSelect
              enabled={!createAttendanceMutation.isPending}
              items={attendanceClassOptions.filter((opt) => opt.value !== "none")}
              label="Clase"
              nativeID={`screens-admin-dashboard-quick-attendance-class-${variant}`}
              onValueChange={(value) => {
                setAttendanceForm((form) => ({ ...form, classId: value ?? "none" }));
                setQuickAttendanceFeedback(null);
              }}
              placeholder="Clase"
              testID={`screens-admin-dashboard-quick-attendance-class-${variant}`}
              value={attendanceForm.classId}
            />
          </View>
          <View style={[styles.quickFieldWrap, styles.quickStudentField]}>
            <AppInput
              autoCorrect={false}
              label="Código alumno"
              nativeID={`screens-admin-dashboard-quick-attendance-student-${variant}`}
              onChangeText={(value) => {
                setQuickStudentIdentifier(value);
                setQuickAttendanceFeedback(null);
              }}
              onSubmitEditing={() => {
                void quickRegisterSubmit(quickStudentIdentifier);
              }}
              placeholder="Ej: ABC123"
              returnKeyType="done"
              testID={`screens-admin-dashboard-quick-attendance-student-${variant}`}
              value={quickStudentIdentifier}
            />
          </View>
          <AppButton
            loading={createAttendanceMutation.isPending}
            onPress={() => {
              void quickRegisterSubmit(quickStudentIdentifier);
            }}
            style={styles.quickSubmitButton}
            label="Registrar"
            nativeID={`screens-admin-dashboard-quick-attendance-submit-${variant}`}
            testID={`screens-admin-dashboard-quick-attendance-submit-${variant}`}
            variant="primary"
          />
        </View>
      </View>
    );
  };

  const dashboardQuickActions = useMemo<BottomSheetAction[]>(
    () => [
      {
        key: "new-student",
        label: "Nuevo alumno",
        icon: "user-plus",
        tone: "primary",
        onPress: () => navigation.navigate("StudentsList", { openCreate: true }),
      },
      {
        key: "manage-students",
        label: "Administrar alumnos",
        icon: "users",
        onPress: () => navigation.navigate("StudentsList"),
      },
      {
        key: "register-payment",
        label: "Registrar pago",
        icon: "dollar-sign",
        tone: "success",
        onPress: openCreatePaymentModal,
      },
      {
        key: "new-attendance",
        label: "Registrar asistencia",
        icon: "check-circle",
        tone: "success",
        onPress: openCreateAttendanceModal,
        disabled: visibleStudents.length === 0,
      },
      {
        key: "open-attendance-route",
        label: "Abrir registro público",
        icon: "external-link",
        tone: "warning",
        onPress: () => {
          if (organization && currentBranch) {
            void openPublicAttendancePage(organization.slug, currentBranch.name);
          }
        },
        disabled: !organization || !currentBranch || !currentBranch.is_active,
      },
      {
        key: "new-class",
        label: "Nueva clase",
        icon: "calendar",
        tone: "primary",
        onPress: openCreateClassModal,
        disabled: visibleBranches.length === 0 || disciplineOptions.length === 0,
      },
      {
        key: "new-branch",
        label: "Nueva sucursal",
        icon: "map-pin",
        onPress: openCreateBranchModal,
        disabled: !canCreateBranches || !organizationId,
      },
      {
        key: "edit-organization",
        label: "Editar dojo",
        icon: "edit-3",
        onPress: openOrganizationModal,
        disabled: !canManageOrganization || !organization,
      },
    ],
    [
      currentBranch,
      disciplineOptions.length,
      navigation,
      openCreateAttendanceModal,
      openCreateBranchModal,
      openCreateClassModal,
      openCreatePaymentModal,
      openOrganizationModal,
      organization,
      canCreateBranches,
      canManageOrganization,
      organizationId,
      visibleBranches.length,
      visibleStudents.length,
    ],
  );

  const rowContextActions = useMemo<BottomSheetAction[]>(() => {
    if (!rowContext) return [];
    if (rowContext.type === "branch") {
      const branch = rowContext.entity;
      return [
        {
          key: "branch-open-attendance",
          label: "Abrir asistencia pública",
          icon: "external-link",
          tone: "warning",
          onPress: () => {
            if (organization) {
              void openPublicAttendancePage(organization.slug, branch.name);
            }
          },
          disabled: !branch.is_active || !organization,
        },
        {
          key: "branch-copy-route",
          label: "Copiar liga de asistencia",
          icon: "link",
          onPress: () => {
            if (organization) {
              void copyPublicAttendanceUrl(
                buildPublicAttendanceUrl(publicAttendanceOrigin, organization.slug, branch.name),
              );
            }
          },
          disabled: !organization,
        },
        {
          key: "branch-edit",
          label: branch.id === 1 ? "Editar matriz" : "Editar sucursal",
          icon: "edit-3",
          tone: "primary",
          onPress: () => openEditBranchModal(branch),
          disabled: !canEditVisibleBranches,
        },
        {
          key: "branch-deactivate",
          label: "Desactivar sucursal",
          icon: "pause-circle",
          destructive: true,
          onPress: () => openEditBranchModal(branch),
          disabled: !canDeactivateBranches || !branch.is_active,
        },
      ];
    }
    if (rowContext.type === "attendance") {
      const attendance = rowContext.entity;
      return [
        {
          key: "attendance-edit",
          label: "Editar asistencia",
          icon: "edit-3",
          tone: "primary",
          onPress: () => openEditAttendanceModal(attendance),
        },
        {
          key: "attendance-delete",
          label: "Eliminar registro",
          icon: "trash-2",
          destructive: true,
          onPress: () => openEditAttendanceModal(attendance),
        },
      ];
    }
    if (rowContext.type === "payment") {
      const payment = rowContext.entity;
      return [
        {
          key: "payment-edit",
          label: "Editar pago",
          icon: "edit-3",
          tone: "primary",
          onPress: () => openEditPaymentModal(payment),
        },
        {
          key: "payment-void",
          label: "Anular movimiento",
          icon: "x-circle",
          destructive: true,
          onPress: () => openEditPaymentModal(payment),
          disabled: payment.status === "void",
        },
      ];
    }
    if (rowContext.type === "class") {
      const classItem = rowContext.entity;
      return [
        {
          key: "class-edit",
          label: "Editar clase",
          icon: "edit-3",
          tone: "primary",
          onPress: () => openEditClassModal(classItem),
        },
        {
          key: "class-deactivate",
          label: classItem.is_active ? "Desactivar clase" : "Activar clase",
          icon: "pause-circle",
          destructive: classItem.is_active,
          onPress: () => openEditClassModal(classItem),
        },
      ];
    }
    return [];
  }, [
    rowContext,
    organization,
    publicAttendanceOrigin,
    canEditVisibleBranches,
    canDeactivateBranches,
    openEditBranchModal,
    openEditAttendanceModal,
    openEditPaymentModal,
    openEditClassModal,
  ]);
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
  }, [isPaymentsSection, paymentsBranchId, paymentsPageSize, paymentsSearchQuery]);

  useEffect(() => {
    setPaymentsPage((current) => Math.min(current, paymentsTotalPages));
  }, [paymentsTotalPages]);

  useEffect(() => {
    if (!isBranchesSection) {
      return;
    }

    setBranchesDashboardView("list");
    setSelectedBranchDashboardId((current) => {
      if (current) {
        return current;
      }

      if (currentBranch) {
        return String(currentBranch.id);
      }

      if (visibleBranches[0]) {
        return String(visibleBranches[0].id);
      }

      return "";
    });
  }, [currentBranch, isBranchesSection, visibleBranches]);

  useEffect(() => {
    if (!selectedBranchDashboardId) {
      return;
    }

    if (visibleBranches.some((item) => String(item.id) === selectedBranchDashboardId)) {
      return;
    }

    setSelectedBranchDashboardId(currentBranch ? String(currentBranch.id) : visibleBranches[0] ? String(visibleBranches[0].id) : "");
  }, [currentBranch, selectedBranchDashboardId, visibleBranches]);

  useEffect(() => {
    if (!isOperationsSection) {
      return;
    }

    setOperationsDashboardView(null);
    setOperationsSearchQuery("");
    setOperationsPage(1);
    setOperationsSelectedClassId("");
  }, [isOperationsSection]);

  useEffect(() => {
    if (!isOperationsSection) {
      return;
    }

    setOperationsPage(1);
  }, [isOperationsSection, operationsDashboardView, operationsSearchQuery, operationsSelectedClassId]);

  useEffect(() => {
    setOperationsPage((current) => Math.min(current, operationsTotalPages));
  }, [operationsTotalPages]);

  useEffect(() => {
    if (!operationsSelectedClassId) {
      return;
    }

    if (visibleClasses.some((item) => String(item.id) === operationsSelectedClassId)) {
      return;
    }

    setOperationsSelectedClassId("");
  }, [operationsSelectedClassId, visibleClasses]);

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
            <AppButton
              label="Resumen"
              nativeID="screens-admin-dashboard-branches-summary-button"
              onPress={() => {
                const targetBranch = selectedBranchDashboard ?? currentBranch ?? visibleBranches[0] ?? null;
                if (targetBranch) {
                  setSelectedBranchDashboardId(String(targetBranch.id));
                }
                setBranchesDashboardView("summary");
              }}
              testID="screens-admin-dashboard-branches-summary-button"
              variant="secondary"
              disabled={visibleBranches.length === 0}
            />
          </>
        ) : focusedSection === "operations" || focusedSection === "payments" ? null : (
          <>
            {canManageOrganization && organization ? (
              <Pressable
                accessibilityRole="button"
                nativeID="screens-admin-dashboard-edit-organization-button"
                onPress={openOrganizationModal}
                style={({ pressed }) => [styles.operationsInlineLink, pressed ? styles.operationsInlineLinkPressed : null]}
                testID="screens-admin-dashboard-edit-organization-button"
              >
                <Text nativeID="screens-admin-dashboard-edit-organization-button-label" style={styles.operationsInlineLinkLabel} testID="screens-admin-dashboard-edit-organization-button-label">
                  Editar
                </Text>
              </Pressable>
            ) : null}
          </>
        )}
      </View>
    );
  const overviewHeaderBottomContent = isOverviewSection ? (
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
      <View nativeID="screens-admin-dashboard-hero-card" style={styles.overviewHeroHeaderBlock} testID="screens-admin-dashboard-hero-card">
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
              Vista general del dojo con indicadores visuales y foco rápido en la estructura activa.
            </Text>
            {renderQuickAttendanceForm("hero")}
          </View>
        </View>
      </View>
    </View>
  ) : null;
  const overviewHeaderMainContent = isOverviewSection && !isLoading && !hasError ? (
    <View nativeID="screens-admin-dashboard-overview-central-content" style={styles.overviewCentralContent} testID="screens-admin-dashboard-overview-central-content">
      <View nativeID="screens-admin-dashboard-chart-grid" style={[styles.chartGrid, isDesktop ? desktopStyles.chartGrid : mobileStyles.chartGrid]} testID="screens-admin-dashboard-chart-grid">
        <OverviewCircularGraphCard
          compact={!isDesktop}
          delay={120}
          footerLink={{
            label: "Ir a alumnos",
            onPress: () => navigation.navigate("StudentsList"),
          }}
          idPrefix="screens-admin-dashboard-students-graph"
          items={overviewGraphData}
          subtitle="Distribución actual del alumnado visible en el resumen."
          title="Estado del alumnado"
        />
        <OverviewCircularGraphCard
          compact
          delay={150}
          circleLinks={{
            "branches-active": {
              label: "Ir a sucursales",
              onPress: () => navigation.navigate("AdminHome", { section: "branches" }),
            },
            "classes-active": {
              label: "Ir a clases",
              onPress: () => navigation.navigate("AdminHome", { section: "operations" }),
            },
          }}
          idPrefix="screens-admin-dashboard-structure-graph"
          items={structureGraphData}
          subtitle={visibleBranches.length === 1 ? "Estructura actual de tu sucursal visible." : "Panorama general de sucursales y clases activas del dojo."}
          title="Estructura operativa"
        />
      </View>
    </View>
  ) : null;
  const dojoHeaderMainContent = isDojoSection ? (
    <AnimatedSurface delay={300} style={styles.fullWidthPanel}>
      <AppCard nativeID="screens-admin-dashboard-dojo-central-card" style={[styles.panelCard, styles.fullWidthPanel]} testID="screens-admin-dashboard-dojo-central-card">
        {organization ? (
          <>
            <View nativeID="screens-admin-dashboard-dojo-central-actions" style={styles.detailList} testID="screens-admin-dashboard-dojo-central-actions">
              <EditableDetailRow
                idPrefix="screens-admin-dashboard-dojo-status-row"
                label="Estado"
                value={organization.is_active ? "Activa" : "Inactiva"}
              />
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
            {!canManageOrganization ? (
              <Text nativeID="screens-admin-dashboard-organization-helper-text" style={styles.helperText} testID="screens-admin-dashboard-organization-helper-text">
                Tu rol puede operar la sucursal asignada, pero no editar la configuración global del dojo.
              </Text>
            ) : null}
          </>
        ) : (
          <View nativeID="screens-admin-dashboard-organization-empty-block" style={styles.emptyBlock} testID="screens-admin-dashboard-organization-empty-block">
            <Text nativeID="screens-admin-dashboard-organization-empty-title" style={styles.emptyTitle} testID="screens-admin-dashboard-organization-empty-title">Sin organización cargada</Text>
            <Text nativeID="screens-admin-dashboard-organization-empty-description" style={styles.emptyDescription} testID="screens-admin-dashboard-organization-empty-description">
              Cuando la API devuelva la organización asignada, podrás editarla desde este panel.
            </Text>
          </View>
        )}
      </AppCard>
    </AnimatedSurface>
  ) : null;
  const branchesHeaderBottomContent = isBranchesSection ? (
    <AdminSectionDashboardTemplate
      idPrefix="screens-admin-dashboard-branches-central-dashboard"
      title={branchesDashboardView === "summary" && selectedBranchDashboard ? `Resumen · ${selectedBranchDashboard.name}` : "Sucursales del dojo"}
      description={
        branchesDashboardView === "summary" && selectedBranchDashboard
          ? "Resumen operativo de la sucursal seleccionada dentro del mismo dashboard central."
          : "Consulta las sucursales visibles y accede a sus flujos clave sin salir del header central."
      }
      actions={null}
      summary={
        <View nativeID="screens-admin-dashboard-branches-central-dashboard-meta" style={styles.paymentSummaryRow} testID="screens-admin-dashboard-branches-central-dashboard-meta">
          <AppBadge label={`${visibleBranches.length} sucursales`} tone="neutral" />
          <AppBadge label={`${activeBranches} activas`} tone={activeBranches > 0 ? "success" : "neutral"} />
          <AppBadge
            label={selectedBranchDashboard ? `Sucursal foco · ${selectedBranchDashboard.name}` : "Sin sucursal foco"}
            tone="info"
          />
        </View>
      }
    />
  ) : null;
  const branchesHeaderMainContent = isBranchesSection ? (
    <AnimatedSurface delay={330} style={styles.fullWidthPanel}>
      <AppCard nativeID="screens-admin-dashboard-branches-central-card" style={[styles.panelCard, styles.fullWidthPanel]} testID="screens-admin-dashboard-branches-central-card">
        <View nativeID="screens-admin-dashboard-branches-central-header" style={[styles.cardHeaderRow, styles.operationsMainHeader]} testID="screens-admin-dashboard-branches-central-header">
          <View nativeID="screens-admin-dashboard-branches-central-copy" style={styles.operationsMainCopy} testID="screens-admin-dashboard-branches-central-copy">
            <Text nativeID="screens-admin-dashboard-branches-central-title" style={styles.sectionTitle} testID="screens-admin-dashboard-branches-central-title">
              {branchesDashboardView === "summary" && selectedBranchDashboard ? selectedBranchDashboard.name : "Sucursales"}
            </Text>
            <View nativeID="screens-admin-dashboard-branches-central-links" style={styles.branchInlineLinkRow} testID="screens-admin-dashboard-branches-central-links">
              {canCreateBranches ? (
                <Pressable
                  accessibilityRole="button"
                  nativeID="screens-admin-dashboard-branches-add-link"
                  onPress={openCreateBranchModal}
                  style={({ pressed }) => [styles.operationsInlineLink, pressed ? styles.operationsInlineLinkPressed : null]}
                  testID="screens-admin-dashboard-branches-add-link"
                >
                  <Text nativeID="screens-admin-dashboard-branches-add-link-label" style={styles.operationsInlineLinkLabel} testID="screens-admin-dashboard-branches-add-link-label">
                    Agregar sucursal
                  </Text>
                </Pressable>
              ) : null}
              {branchesDashboardView === "summary" ? (
                <Pressable
                  accessibilityRole="button"
                  nativeID="screens-admin-dashboard-branches-back-to-list-link"
                  onPress={() => setBranchesDashboardView("list")}
                  style={({ pressed }) => [styles.operationsInlineLink, pressed ? styles.operationsInlineLinkPressed : null]}
                  testID="screens-admin-dashboard-branches-back-to-list-link"
                >
                  <Text nativeID="screens-admin-dashboard-branches-back-to-list-link-label" style={styles.operationsInlineLinkLabel} testID="screens-admin-dashboard-branches-back-to-list-link-label">
                    Ver sucursales
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
          <AppBadge
            label={branchesDashboardView === "summary" && selectedBranchDashboardRow ? `${selectedBranchDashboardRow.studentsCount} alumnos` : `${visibleBranches.length} sedes`}
            nativeID="screens-admin-dashboard-branches-central-badge"
            testID="screens-admin-dashboard-branches-central-badge"
            tone="neutral"
          />
        </View>
        {branchesDashboardView === "summary" && selectedBranchDashboard && selectedBranchDashboardRow ? (
          <View nativeID="screens-admin-dashboard-branches-summary-content" style={styles.branchSummaryContent} testID="screens-admin-dashboard-branches-summary-content">
            <View nativeID="screens-admin-dashboard-branches-summary-metrics" style={styles.branchSummaryGrid} testID="screens-admin-dashboard-branches-summary-metrics">
              <View nativeID="screens-admin-dashboard-branches-summary-students-card" style={styles.branchSummaryMetricCard} testID="screens-admin-dashboard-branches-summary-students-card">
                <Text nativeID="screens-admin-dashboard-branches-summary-students-label" style={styles.branchSummaryMetricLabel} testID="screens-admin-dashboard-branches-summary-students-label">Alumnos</Text>
                <Text nativeID="screens-admin-dashboard-branches-summary-students-value" style={styles.branchSummaryMetricValue} testID="screens-admin-dashboard-branches-summary-students-value">{selectedBranchDashboardRow.studentsCount}</Text>
              </View>
              <View nativeID="screens-admin-dashboard-branches-summary-classes-card" style={styles.branchSummaryMetricCard} testID="screens-admin-dashboard-branches-summary-classes-card">
                <Text nativeID="screens-admin-dashboard-branches-summary-classes-label" style={styles.branchSummaryMetricLabel} testID="screens-admin-dashboard-branches-summary-classes-label">Clases activas</Text>
                <Text nativeID="screens-admin-dashboard-branches-summary-classes-value" style={styles.branchSummaryMetricValue} testID="screens-admin-dashboard-branches-summary-classes-value">{selectedBranchDashboardRow.activeClassesCount}</Text>
              </View>
              <View nativeID="screens-admin-dashboard-branches-summary-attendance-card" style={styles.branchSummaryMetricCard} testID="screens-admin-dashboard-branches-summary-attendance-card">
                <Text nativeID="screens-admin-dashboard-branches-summary-attendance-label" style={styles.branchSummaryMetricLabel} testID="screens-admin-dashboard-branches-summary-attendance-label">Asistencias hoy</Text>
                <Text nativeID="screens-admin-dashboard-branches-summary-attendance-value" style={styles.branchSummaryMetricValue} testID="screens-admin-dashboard-branches-summary-attendance-value">{selectedBranchDashboardRow.todayAttendanceCount}</Text>
              </View>
              <View nativeID="screens-admin-dashboard-branches-summary-payments-card" style={styles.branchSummaryMetricCard} testID="screens-admin-dashboard-branches-summary-payments-card">
                <Text nativeID="screens-admin-dashboard-branches-summary-payments-label" style={styles.branchSummaryMetricLabel} testID="screens-admin-dashboard-branches-summary-payments-label">Pagos pendientes</Text>
                <Text nativeID="screens-admin-dashboard-branches-summary-payments-value" style={styles.branchSummaryMetricValue} testID="screens-admin-dashboard-branches-summary-payments-value">{selectedBranchDashboardRow.pendingPaymentsCount}</Text>
              </View>
            </View>
            <View nativeID="screens-admin-dashboard-branches-summary-details" style={styles.branchSummaryDetails} testID="screens-admin-dashboard-branches-summary-details">
              <Text nativeID="screens-admin-dashboard-branches-summary-location" style={styles.branchMeta} testID="screens-admin-dashboard-branches-summary-location">{`${selectedBranchDashboard.city}, ${selectedBranchDashboard.state} / ${selectedBranchDashboard.country}`}</Text>
              <Text nativeID="screens-admin-dashboard-branches-summary-address" style={styles.branchMeta} testID="screens-admin-dashboard-branches-summary-address">{selectedBranchDashboard.address}</Text>
              <Text nativeID="screens-admin-dashboard-branches-summary-timezone" style={styles.branchMeta} testID="screens-admin-dashboard-branches-summary-timezone">{`Zona horaria: ${selectedBranchDashboard.timezone}`}</Text>
            </View>
          </View>
        ) : visibleBranches.length > 0 ? (
          <View nativeID="screens-admin-dashboard-branches-list" style={styles.branchList} testID="screens-admin-dashboard-branches-list">
            {branchDashboardRows.map(({ branch, studentsCount, activeClassesCount, todayAttendanceCount: rowAttendanceCount, pendingPaymentsCount }) => (
              <View key={branch.id} nativeID={`screens-admin-dashboard-branch-row-${branch.id}`} style={styles.branchDashboardRow} testID={`screens-admin-dashboard-branch-row-${branch.id}`}>
                <View nativeID={`screens-admin-dashboard-branch-copy-${branch.id}`} style={styles.branchDashboardCopy} testID={`screens-admin-dashboard-branch-copy-${branch.id}`}>
                  <View nativeID={`screens-admin-dashboard-branch-title-row-${branch.id}`} style={styles.branchTitleRow} testID={`screens-admin-dashboard-branch-title-row-${branch.id}`}>
                    <Text nativeID={`screens-admin-dashboard-branch-name-${branch.id}`} style={styles.branchName} testID={`screens-admin-dashboard-branch-name-${branch.id}`}>{branch.name}</Text>
                    <AppBadge label={branch.is_active ? "Activa" : "Inactiva"} nativeID={`screens-admin-dashboard-branch-status-badge-${branch.id}`} testID={`screens-admin-dashboard-branch-status-badge-${branch.id}`} tone={branch.is_active ? "success" : "warning"} />
                  </View>
                  <Text nativeID={`screens-admin-dashboard-branch-location-${branch.id}`} style={styles.branchMeta} testID={`screens-admin-dashboard-branch-location-${branch.id}`}>{`${branch.city}, ${branch.state} / ${branch.country}`}</Text>
                  <Text nativeID={`screens-admin-dashboard-branch-address-${branch.id}`} style={styles.branchMeta} testID={`screens-admin-dashboard-branch-address-${branch.id}`}>{branch.address}</Text>
                  <View nativeID={`screens-admin-dashboard-branch-summary-${branch.id}`} style={styles.branchSummaryLine} testID={`screens-admin-dashboard-branch-summary-${branch.id}`}>
                    <Text nativeID={`screens-admin-dashboard-branch-students-${branch.id}`} style={styles.branchSummaryLineText} testID={`screens-admin-dashboard-branch-students-${branch.id}`}>{`${studentsCount} alumnos`}</Text>
                    <Text nativeID={`screens-admin-dashboard-branch-classes-${branch.id}`} style={styles.branchSummaryLineText} testID={`screens-admin-dashboard-branch-classes-${branch.id}`}>{`${activeClassesCount} clases activas`}</Text>
                    <Text nativeID={`screens-admin-dashboard-branch-attendance-${branch.id}`} style={styles.branchSummaryLineText} testID={`screens-admin-dashboard-branch-attendance-${branch.id}`}>{`${rowAttendanceCount} asistencias hoy`}</Text>
                    <Text nativeID={`screens-admin-dashboard-branch-payments-${branch.id}`} style={styles.branchSummaryLineText} testID={`screens-admin-dashboard-branch-payments-${branch.id}`}>{`${pendingPaymentsCount} pagos pendientes`}</Text>
                  </View>
                </View>
                <View nativeID={`screens-admin-dashboard-branch-actions-${branch.id}`} style={styles.branchActionLinks} testID={`screens-admin-dashboard-branch-actions-${branch.id}`}>
                  {organization ? (
                    <Pressable
                      accessibilityRole="link"
                      nativeID={`screens-admin-dashboard-branch-open-attendance-button-${branch.id}`}
                      onPress={() => void openPublicAttendancePage(organization.slug, branch.name)}
                      style={({ pressed }) => [styles.operationsInlineLink, (!branch.is_active || pressed) ? styles.operationsInlineLinkPressed : null]}
                      testID={`screens-admin-dashboard-branch-open-attendance-button-${branch.id}`}
                      disabled={!branch.is_active}
                    >
                      <Text nativeID={`screens-admin-dashboard-branch-open-attendance-label-${branch.id}`} style={styles.operationsInlineLinkLabel} testID={`screens-admin-dashboard-branch-open-attendance-label-${branch.id}`}>
                        Ir rapido a asistencias
                      </Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    accessibilityRole="button"
                    nativeID={`screens-admin-dashboard-branch-edit-button-${branch.id}`}
                    onPress={() => openEditBranchModal(branch)}
                    style={({ pressed }) => [styles.operationsInlineLink, pressed ? styles.operationsInlineLinkPressed : null]}
                    testID={`screens-admin-dashboard-branch-edit-button-${branch.id}`}
                  >
                    <Text nativeID={`screens-admin-dashboard-branch-edit-label-${branch.id}`} style={styles.operationsInlineLinkLabel} testID={`screens-admin-dashboard-branch-edit-label-${branch.id}`}>
                      Editar
                    </Text>
                  </Pressable>
                  {canDeactivateBranches && branch.is_active ? (
                    <Pressable
                      accessibilityRole="button"
                      nativeID={`screens-admin-dashboard-branch-deactivate-button-${branch.id}`}
                      onPress={() => openEditBranchModal(branch)}
                      style={({ pressed }) => [styles.operationsInlineLink, pressed ? styles.operationsInlineLinkPressed : null]}
                      testID={`screens-admin-dashboard-branch-deactivate-button-${branch.id}`}
                    >
                      <Text nativeID={`screens-admin-dashboard-branch-deactivate-label-${branch.id}`} style={styles.branchDangerLinkLabel} testID={`screens-admin-dashboard-branch-deactivate-label-${branch.id}`}>
                        Desactivar
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View nativeID="screens-admin-dashboard-branches-empty-block" style={styles.emptyBlock} testID="screens-admin-dashboard-branches-empty-block">
            <Text nativeID="screens-admin-dashboard-branches-empty-title" style={styles.emptyTitle} testID="screens-admin-dashboard-branches-empty-title">Sin sucursales registradas</Text>
            <Text nativeID="screens-admin-dashboard-branches-empty-description" style={styles.emptyDescription} testID="screens-admin-dashboard-branches-empty-description">
              Da de alta tu primera sucursal para poder operar alumnos, clases y asistencia en este panel.
            </Text>
          </View>
        )}
      </AppCard>
    </AnimatedSurface>
  ) : null;
  const operationsHeaderBottomContent = isOperationsSection ? (
    <AdminSectionDashboardTemplate
      idPrefix="screens-admin-dashboard-operations-central-dashboard"
      title={currentBranch ? `Operación · ${currentBranch.name}` : "Centro operativo"}
      description="Elige entre asistencias o clases para cargar la información principal dentro del dashboard central."
      actions={null}
      summary={renderQuickAttendanceForm("operations")}
    />
  ) : null;
  const operationsHeaderMainContent = isOperationsSection ? (
    <AnimatedSurface delay={360} style={styles.fullWidthPanel}>
      <View nativeID="screens-admin-dashboard-operations-central-content" style={styles.operationsCenterContent} testID="screens-admin-dashboard-operations-central-content">
        <View nativeID="screens-admin-dashboard-operations-selector-grid" style={styles.operationsSelectorGrid} testID="screens-admin-dashboard-operations-selector-grid">
          <Pressable
            accessibilityRole="button"
            nativeID="screens-admin-dashboard-operations-selector-attendance"
            onPress={() => {
              setOperationsClassPickerValue(operationsSelectedClassId);
              setOperationsClassPickerVisible(true);
            }}
            style={({ pressed }) => [
              styles.operationsSelectorCard,
              operationsDashboardView === "attendance" ? styles.operationsSelectorCardActive : null,
              pressed ? styles.operationsSelectorCardPressed : null,
            ]}
            testID="screens-admin-dashboard-operations-selector-attendance"
          >
            <View nativeID="screens-admin-dashboard-operations-selector-attendance-icon" style={styles.operationsSelectorIconWrap} testID="screens-admin-dashboard-operations-selector-attendance-icon">
              <Feather color={colors.info} name="clipboard" size={18} />
            </View>
            <View nativeID="screens-admin-dashboard-operations-selector-attendance-copy" style={styles.operationsSelectorCopy} testID="screens-admin-dashboard-operations-selector-attendance-copy">
              <Text nativeID="screens-admin-dashboard-operations-selector-attendance-title" style={styles.operationsSelectorTitle} testID="screens-admin-dashboard-operations-selector-attendance-title">Asistencias</Text>
              <Text nativeID="screens-admin-dashboard-operations-selector-attendance-description" style={styles.operationsSelectorDescription} testID="screens-admin-dashboard-operations-selector-attendance-description">
                {`${visibleAttendanceRecords.length} registros visibles y ${todayAttendanceCount} de hoy.`}
              </Text>
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            nativeID="screens-admin-dashboard-operations-selector-classes"
            onPress={() => setOperationsDashboardView("classes")}
            style={({ pressed }) => [
              styles.operationsSelectorCard,
              operationsDashboardView === "classes" ? styles.operationsSelectorCardActive : null,
              pressed ? styles.operationsSelectorCardPressed : null,
            ]}
            testID="screens-admin-dashboard-operations-selector-classes"
          >
            <View nativeID="screens-admin-dashboard-operations-selector-classes-icon" style={styles.operationsSelectorIconWrap} testID="screens-admin-dashboard-operations-selector-classes-icon">
              <Feather color={colors.info} name="book-open" size={18} />
            </View>
            <View nativeID="screens-admin-dashboard-operations-selector-classes-copy" style={styles.operationsSelectorCopy} testID="screens-admin-dashboard-operations-selector-classes-copy">
              <Text nativeID="screens-admin-dashboard-operations-selector-classes-title" style={styles.operationsSelectorTitle} testID="screens-admin-dashboard-operations-selector-classes-title">Clases</Text>
              <Text nativeID="screens-admin-dashboard-operations-selector-classes-description" style={styles.operationsSelectorDescription} testID="screens-admin-dashboard-operations-selector-classes-description">
                {`${visibleClasses.length} clases visibles y ${activeClasses} activas.`}
              </Text>
            </View>
          </Pressable>
        </View>
        <AppCard
          nativeID="screens-admin-dashboard-operations-main-card"
          style={[styles.panelCard, styles.fullWidthPanel]}
          testID="screens-admin-dashboard-operations-main-card"
        >
          <View nativeID="screens-admin-dashboard-operations-main-header" style={[styles.cardHeaderRow, styles.operationsMainHeader]} testID="screens-admin-dashboard-operations-main-header">
            <View nativeID="screens-admin-dashboard-operations-main-copy" style={styles.operationsMainCopy} testID="screens-admin-dashboard-operations-main-copy">
              <Text nativeID="screens-admin-dashboard-operations-main-title" style={styles.sectionTitle} testID="screens-admin-dashboard-operations-main-title">
                {operationsDashboardTitle}
              </Text>
              {operationsDashboardLinkLabel ? (
                <Pressable
                  accessibilityRole="button"
                  nativeID="screens-admin-dashboard-operations-main-link"
                  onPress={() => {
                    if (operationsDashboardView === "attendance") {
                      setOperationsClassPickerValue(operationsSelectedClassId);
                      setOperationsClassPickerVisible(true);
                      return;
                    }

                    if (operationsDashboardView === "classes") {
                      openCreateClassModal();
                    }
                  }}
                  style={({ pressed }) => [styles.operationsInlineLink, pressed ? styles.operationsInlineLinkPressed : null]}
                  testID="screens-admin-dashboard-operations-main-link"
                >
                  <Text nativeID="screens-admin-dashboard-operations-main-link-label" style={styles.operationsInlineLinkLabel} testID="screens-admin-dashboard-operations-main-link-label">
                    {operationsDashboardLinkLabel}
                  </Text>
                </Pressable>
              ) : null}
            </View>
            {operationsDashboardView ? (
              <AppBadge
                label={
                  operationsDashboardView === "attendance"
                    ? `${filteredOperationsAttendanceRecords.length} registros`
                    : `${filteredOperationsClasses.length} clases`
                }
                nativeID="screens-admin-dashboard-operations-main-badge"
                testID="screens-admin-dashboard-operations-main-badge"
                tone="neutral"
              />
            ) : null}
          </View>
          {operationsDashboardView ? (
            <AppInput
              label={operationsDashboardView === "attendance" ? "Buscar asistencia" : "Buscar clase"}
              nativeID="screens-admin-dashboard-operations-search-input"
              onChangeText={setOperationsSearchQuery}
              placeholder="Buscar por nombre"
              rightAdornment={<Feather color={colors.textMuted} name="search" size={16} />}
              testID="screens-admin-dashboard-operations-search-input"
              value={operationsSearchQuery}
            />
          ) : null}
          {operationsDashboardView === "attendance" ? (
            paginatedOperationsAttendanceRecords.length > 0 ? (
              <View nativeID="screens-admin-dashboard-operations-attendance-list" style={styles.operationsDataList} testID="screens-admin-dashboard-operations-attendance-list">
                {paginatedOperationsAttendanceRecords.map((attendance) => {
                  const student = visibleStudents.find((item) => item.id === attendance.student_id) ?? null;
                  const classItem = visibleClasses.find((item) => item.id === attendance.class_id) ?? null;
                  const branchName =
                    visibleBranches.find((branch) => branch.id === attendance.branch_id)?.name ??
                    `Sucursal ${attendance.branch_id}`;

                  return (
                    <View key={attendance.id} nativeID={`screens-admin-dashboard-operations-attendance-row-${attendance.id}`} style={styles.operationsDataRow} testID={`screens-admin-dashboard-operations-attendance-row-${attendance.id}`}>
                      <View nativeID={`screens-admin-dashboard-operations-attendance-icon-wrap-${attendance.id}`} style={styles.operationsDataIconWrap} testID={`screens-admin-dashboard-operations-attendance-icon-wrap-${attendance.id}`}>
                        <Feather color={colors.info} name={attendance.method === "qr" ? "smartphone" : "check-circle"} size={16} />
                      </View>
                      <View nativeID={`screens-admin-dashboard-operations-attendance-copy-${attendance.id}`} style={styles.operationsDataCopy} testID={`screens-admin-dashboard-operations-attendance-copy-${attendance.id}`}>
                        <View nativeID={`screens-admin-dashboard-operations-attendance-head-${attendance.id}`} style={styles.operationsDataHead} testID={`screens-admin-dashboard-operations-attendance-head-${attendance.id}`}>
                          <Text nativeID={`screens-admin-dashboard-operations-attendance-title-${attendance.id}`} style={styles.operationsDataTitle} testID={`screens-admin-dashboard-operations-attendance-title-${attendance.id}`}>
                            {student ? `${student.first_name} ${student.last_name}` : `Alumno ${attendance.student_id}`}
                          </Text>
                          <AppBadge
                            label={formatAttendanceMethod(attendance.method)}
                            nativeID={`screens-admin-dashboard-operations-attendance-method-badge-${attendance.id}`}
                            testID={`screens-admin-dashboard-operations-attendance-method-badge-${attendance.id}`}
                            tone={attendance.method === "qr" ? "info" : "neutral"}
                          />
                        </View>
                        <Text nativeID={`screens-admin-dashboard-operations-attendance-meta-${attendance.id}`} style={styles.operationsDataMeta} testID={`screens-admin-dashboard-operations-attendance-meta-${attendance.id}`}>
                          {student ? `${student.unique_code} · ${branchName}` : branchName}
                        </Text>
                        <View nativeID={`screens-admin-dashboard-operations-attendance-summary-${attendance.id}`} style={styles.operationsDataSummary} testID={`screens-admin-dashboard-operations-attendance-summary-${attendance.id}`}>
                          <Text nativeID={`screens-admin-dashboard-operations-attendance-checkin-${attendance.id}`} style={styles.operationsDataSummaryText} testID={`screens-admin-dashboard-operations-attendance-checkin-${attendance.id}`}>
                            {`Check-in: ${formatDateTime(attendance.check_in_at)}`}
                          </Text>
                          <Text nativeID={`screens-admin-dashboard-operations-attendance-class-${attendance.id}`} style={styles.operationsDataSummaryText} testID={`screens-admin-dashboard-operations-attendance-class-${attendance.id}`}>
                            {`Clase: ${classItem?.name ?? "Sin clase"}`}
                          </Text>
                        </View>
                      </View>
                      <View nativeID={`screens-admin-dashboard-operations-attendance-actions-${attendance.id}`} style={styles.operationsDataActions} testID={`screens-admin-dashboard-operations-attendance-actions-${attendance.id}`}>
                        <AppButton label="Editar" nativeID={`screens-admin-dashboard-attendance-edit-button-${attendance.id}`} onPress={() => openEditAttendanceModal(attendance)} testID={`screens-admin-dashboard-attendance-edit-button-${attendance.id}`} variant="secondary" />
                        <AppButton label="Eliminar" nativeID={`screens-admin-dashboard-attendance-delete-button-${attendance.id}`} onPress={() => openEditAttendanceModal(attendance)} testID={`screens-admin-dashboard-attendance-delete-button-${attendance.id}`} variant="danger" />
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View nativeID="screens-admin-dashboard-operations-attendance-empty-block" style={styles.emptyBlock} testID="screens-admin-dashboard-operations-attendance-empty-block">
                <Text nativeID="screens-admin-dashboard-operations-attendance-empty-title" style={styles.emptyTitle} testID="screens-admin-dashboard-operations-attendance-empty-title">
                  {operationsSearchQuery.trim() ? "Sin coincidencias" : "Sin asistencias registradas"}
                </Text>
                <Text nativeID="screens-admin-dashboard-operations-attendance-empty-description" style={styles.emptyDescription} testID="screens-admin-dashboard-operations-attendance-empty-description">
                  {operationsSearchQuery.trim()
                    ? "No encontramos asistencias para la búsqueda actual."
                    : "Selecciona una clase y registra la primera asistencia para empezar a monitorear la operación diaria."}
                </Text>
              </View>
            )
          ) : operationsDashboardView === "classes" ? (
            paginatedOperationsClasses.length > 0 ? (
              <View nativeID="screens-admin-dashboard-operations-classes-list" style={styles.operationsDataList} testID="screens-admin-dashboard-operations-classes-list">
                {paginatedOperationsClasses.map((classItem) => {
                  const branchName =
                    visibleBranches.find((branch) => branch.id === classItem.branch_id)?.name ??
                    `Sucursal ${classItem.branch_id}`;
                  const disciplineName =
                    classItem.discipline_name ??
                    disciplines.find((discipline) => discipline.id === classItem.discipline_id)?.name ??
                    `Disciplina ${classItem.discipline_id}`;

                  return (
                    <View key={classItem.id} nativeID={`screens-admin-dashboard-operations-class-row-${classItem.id}`} style={styles.operationsDataRow} testID={`screens-admin-dashboard-operations-class-row-${classItem.id}`}>
                      <View nativeID={`screens-admin-dashboard-operations-class-icon-wrap-${classItem.id}`} style={styles.operationsDataIconWrap} testID={`screens-admin-dashboard-operations-class-icon-wrap-${classItem.id}`}>
                        <Feather color={colors.info} name="book-open" size={16} />
                      </View>
                      <View nativeID={`screens-admin-dashboard-operations-class-copy-${classItem.id}`} style={styles.operationsDataCopy} testID={`screens-admin-dashboard-operations-class-copy-${classItem.id}`}>
                        <View nativeID={`screens-admin-dashboard-operations-class-head-${classItem.id}`} style={styles.operationsDataHead} testID={`screens-admin-dashboard-operations-class-head-${classItem.id}`}>
                          <Text nativeID={`screens-admin-dashboard-operations-class-title-${classItem.id}`} style={styles.operationsDataTitle} testID={`screens-admin-dashboard-operations-class-title-${classItem.id}`}>
                            {classItem.name}
                          </Text>
                          <AppBadge
                            label={classItem.is_active ? "Activa" : "Inactiva"}
                            nativeID={`screens-admin-dashboard-class-status-badge-${classItem.id}`}
                            testID={`screens-admin-dashboard-class-status-badge-${classItem.id}`}
                            tone={classItem.is_active ? "success" : "warning"}
                          />
                        </View>
                        <Text nativeID={`screens-admin-dashboard-operations-class-meta-${classItem.id}`} style={styles.operationsDataMeta} testID={`screens-admin-dashboard-operations-class-meta-${classItem.id}`}>
                          {`${disciplineName} · ${branchName}`}
                        </Text>
                        <View nativeID={`screens-admin-dashboard-operations-class-summary-${classItem.id}`} style={styles.operationsDataSummary} testID={`screens-admin-dashboard-operations-class-summary-${classItem.id}`}>
                          <Text nativeID={`screens-admin-dashboard-operations-class-instructor-${classItem.id}`} style={styles.operationsDataSummaryText} testID={`screens-admin-dashboard-operations-class-instructor-${classItem.id}`}>
                            {classItem.instructor_name ? `Instructor: ${classItem.instructor_name}` : "Instructor pendiente"}
                          </Text>
                          <Text nativeID={`screens-admin-dashboard-operations-class-capacity-${classItem.id}`} style={styles.operationsDataSummaryText} testID={`screens-admin-dashboard-operations-class-capacity-${classItem.id}`}>
                            {classItem.capacity ? `Capacidad: ${classItem.capacity} cupos` : "Capacidad sin definir"}
                          </Text>
                          {classItem.description ? (
                            <Text nativeID={`screens-admin-dashboard-operations-class-description-${classItem.id}`} style={styles.operationsDataSummaryText} testID={`screens-admin-dashboard-operations-class-description-${classItem.id}`}>
                              {classItem.description}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                      <View nativeID={`screens-admin-dashboard-operations-class-actions-${classItem.id}`} style={styles.operationsDataActions} testID={`screens-admin-dashboard-operations-class-actions-${classItem.id}`}>
                        <AppButton label="Editar" nativeID={`screens-admin-dashboard-class-edit-button-${classItem.id}`} onPress={() => openEditClassModal(classItem)} testID={`screens-admin-dashboard-class-edit-button-${classItem.id}`} variant="secondary" />
                        {classItem.is_active ? (
                          <AppButton label="Desactivar" nativeID={`screens-admin-dashboard-class-deactivate-button-${classItem.id}`} onPress={() => openEditClassModal(classItem)} testID={`screens-admin-dashboard-class-deactivate-button-${classItem.id}`} variant="danger" />
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View nativeID="screens-admin-dashboard-operations-classes-empty-block" style={styles.emptyBlock} testID="screens-admin-dashboard-operations-classes-empty-block">
                <Text nativeID="screens-admin-dashboard-operations-classes-empty-title" style={styles.emptyTitle} testID="screens-admin-dashboard-operations-classes-empty-title">
                  {operationsSearchQuery.trim() ? "Sin coincidencias" : "Sin clases registradas"}
                </Text>
                <Text nativeID="screens-admin-dashboard-operations-classes-empty-description" style={styles.emptyDescription} testID="screens-admin-dashboard-operations-classes-empty-description">
                  {operationsSearchQuery.trim()
                    ? "No encontramos clases que coincidan con la búsqueda actual."
                    : "Todavía no hay clases configuradas dentro del alcance visible."}
                </Text>
              </View>
            )
          ) : (
            <View nativeID="screens-admin-dashboard-operations-placeholder-block" style={styles.emptyBlock} testID="screens-admin-dashboard-operations-placeholder-block">
              <Text nativeID="screens-admin-dashboard-operations-placeholder-title" style={styles.emptyTitle} testID="screens-admin-dashboard-operations-placeholder-title">Elige una vista operativa</Text>
              <Text nativeID="screens-admin-dashboard-operations-placeholder-description" style={styles.emptyDescription} testID="screens-admin-dashboard-operations-placeholder-description">
                Usa cualquiera de las dos tarjetas superiores para cargar el historial de asistencias o la configuración de clases.
              </Text>
            </View>
          )}
          {operationsDashboardView && operationsSourceLength > operationsPageSize ? (
            <View nativeID="screens-admin-dashboard-operations-pagination-controls" style={styles.paymentsPaginationControls} testID="screens-admin-dashboard-operations-pagination-controls">
              <AppButton
                label="Anterior"
                nativeID="screens-admin-dashboard-operations-pagination-prev-button"
                onPress={() => setOperationsPage((current) => Math.max(1, current - 1))}
                testID="screens-admin-dashboard-operations-pagination-prev-button"
                variant="secondary"
                disabled={operationsPage === 1}
              />
              <Text nativeID="screens-admin-dashboard-operations-pagination-page-label" style={styles.paymentsPaginationLabel} testID="screens-admin-dashboard-operations-pagination-page-label">
                {`Página ${operationsPage} de ${operationsTotalPages}`}
              </Text>
              <AppButton
                label="Siguiente"
                nativeID="screens-admin-dashboard-operations-pagination-next-button"
                onPress={() => setOperationsPage((current) => Math.min(operationsTotalPages, current + 1))}
                testID="screens-admin-dashboard-operations-pagination-next-button"
                variant="secondary"
                disabled={operationsPage === operationsTotalPages}
              />
            </View>
          ) : null}
        </AppCard>
      </View>
    </AnimatedSurface>
  ) : null;
  const paymentsHeaderBottomContent = isPaymentsSection ? (
    <AdminSectionDashboardTemplate
      idPrefix="screens-admin-dashboard-payments-central-dashboard"
      title={selectedPaymentsBranch ? `Sucursal activa · ${selectedPaymentsBranch.name}` : "Configura la cobranza por sucursal"}
      description={
        selectedPaymentsBranch
          ? "Selecciona alumnos, abre su historial mensual y registra nuevos pagos desde este panel central."
          : "Elige una sucursal para cargar a sus alumnos y administrar sus pagos sin salir del dashboard."
      }
      actions={
        <AppButton
          label="Registrar pago"
          nativeID="screens-admin-dashboard-payments-header-register-button"
          onPress={openCreatePaymentModal}
          testID="screens-admin-dashboard-payments-header-register-button"
          variant="success"
          disabled={!selectedPaymentsBranchId || availablePaymentStudents.length === 0}
        />
      }
      toolbar={
        <View
          nativeID="screens-admin-dashboard-payments-header-branch-filter"
          style={[styles.formGrid, isDesktop ? desktopStyles.formGrid : null]}
          testID="screens-admin-dashboard-payments-header-branch-filter"
        >
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
      }
      summary={
        <>
          <View nativeID="screens-admin-dashboard-payments-header-summary" style={styles.paymentSummaryRow} testID="screens-admin-dashboard-payments-header-summary">
            <AppBadge
              label={`${filteredPaymentScopedStudents.length} alumnos`}
              nativeID="screens-admin-dashboard-payments-header-students-badge"
              testID="screens-admin-dashboard-payments-header-students-badge"
              tone="neutral"
            />
            <AppBadge
              label={`${filteredPaymentScopedPendingPayments} pendientes`}
              nativeID="screens-admin-dashboard-payments-header-pending-badge"
              testID="screens-admin-dashboard-payments-header-pending-badge"
              tone={filteredPaymentScopedPendingPayments > 0 ? "warning" : "success"}
            />
          </View>
          {selectedPaymentsBranch ? (
            <Text nativeID="screens-admin-dashboard-payments-header-range" style={styles.helperText} testID="screens-admin-dashboard-payments-header-range">
              {`Mostrando ${paymentsRangeStart}-${paymentsRangeEnd} de ${filteredPaymentScopedStudents.length} alumnos`}
            </Text>
          ) : null}
        </>
      }
    />
  ) : null;
  const paymentsHeaderSearch = isPaymentsSection ? (
    <AppInput
      label="Buscar alumnos"
      nativeID="screens-admin-dashboard-payments-search-input"
      onChangeText={setPaymentsSearchQuery}
      placeholder="Buscar por nombre o ID"
      rightAdornment={<Feather color={colors.textMuted} name="search" size={16} />}
      testID="screens-admin-dashboard-payments-search-input"
      value={paymentsSearchQuery}
    />
  ) : null;
  const paymentsHeaderMainContent = isPaymentsSection ? (
    <AnimatedSurface delay={390} style={styles.fullWidthPanel}>
      <AppCard
        nativeID="screens-admin-dashboard-payments-card"
        style={[styles.panelCard, styles.fullWidthPanel]}
        testID="screens-admin-dashboard-payments-card"
      >
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
                  <View nativeID={`screens-admin-dashboard-payments-student-avatar-wrap-${student.id}`} style={styles.paymentsStudentAvatarWrap} testID={`screens-admin-dashboard-payments-student-avatar-wrap-${student.id}`}>
                    {student.photo_url ? (
                      <Image
                        nativeID={`screens-admin-dashboard-payments-student-avatar-${student.id}`}
                        source={{ uri: student.photo_url }}
                        style={styles.paymentsStudentAvatar}
                        testID={`screens-admin-dashboard-payments-student-avatar-${student.id}`}
                      />
                    ) : (
                      <View nativeID={`screens-admin-dashboard-payments-student-avatar-fallback-${student.id}`} style={styles.paymentsStudentAvatarFallback} testID={`screens-admin-dashboard-payments-student-avatar-fallback-${student.id}`}>
                        <Text nativeID={`screens-admin-dashboard-payments-student-avatar-label-${student.id}`} style={styles.paymentsStudentAvatarLabel} testID={`screens-admin-dashboard-payments-student-avatar-label-${student.id}`}>
                          {`${student.first_name.charAt(0)}${student.last_name.charAt(0)}`.trim().toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
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
            {filteredPaymentScopedStudents.length > paymentsPageSize ? (
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
            <Text nativeID="screens-admin-dashboard-payments-empty-title" style={styles.emptyTitle} testID="screens-admin-dashboard-payments-empty-title">
              {paymentsSearchQuery.trim() ? "Sin coincidencias" : "Sin alumnos disponibles"}
            </Text>
            <Text nativeID="screens-admin-dashboard-payments-empty-description" style={styles.emptyDescription} testID="screens-admin-dashboard-payments-empty-description">
              {paymentsSearchQuery.trim()
                ? `No encontramos alumnos en ${selectedPaymentsBranch.name} con ese nombre o ID.`
                : `No hay alumnos visibles para ${selectedPaymentsBranch.name}.`}
            </Text>
          </View>
        )}
      </AppCard>
    </AnimatedSurface>
  ) : null;

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
        headerBottomContent={isOverviewSection ? overviewHeaderBottomContent : isBranchesSection ? branchesHeaderBottomContent : isOperationsSection ? operationsHeaderBottomContent : isPaymentsSection ? paymentsHeaderBottomContent : undefined}
        headerMainContent={isOverviewSection ? overviewHeaderMainContent : isBranchesSection ? branchesHeaderMainContent : isOperationsSection ? operationsHeaderMainContent : isPaymentsSection ? paymentsHeaderMainContent : isDojoSection ? dojoHeaderMainContent : undefined}
        headerSearch={isPaymentsSection ? paymentsHeaderSearch : null}
        onGoBranches={() => navigation.navigate("AdminHome", { section: "branches" })}
        onGoDashboard={() => navigation.navigate("AdminHome")}
        onGoDojo={() => navigation.navigate("AdminHome", { section: "dojo" })}
        onGoOperations={() => navigation.navigate("AdminHome", { section: "operations" })}
        onGoPayments={() => navigation.navigate("AdminHome", { section: "payments" })}
        onGoQrCodes={() => navigation.navigate("QrCodesList")}
        onGoStudents={() => navigation.navigate("StudentsList")}
        onGoTrajectory={() => navigation.navigate("TrajectoryList")}
        sidebarSummary={sidebarSummary}
        subtitle={pageSubtitle}
        title={pageTitle}
      >
        <View nativeID="screens-admin-dashboard-content" style={styles.container} testID="screens-admin-dashboard-content">
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
            <View nativeID="screens-admin-dashboard-skeleton-block" style={styles.skeletonWrap} testID="screens-admin-dashboard-skeleton-block">
              <SkeletonCardGrid columns={isDesktop ? 2 : 1} count={3} idPrefix="screens-admin-dashboard-overview-skeleton" />
              <View style={styles.skeletonGap} />
              <AppCard style={styles.panelCard}>
                <SkeletonList count={5} idPrefix="screens-admin-dashboard-lists-skeleton" />
              </AppCard>
            </View>
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
              {!isOverviewSection && !isBranchesSection && !isPaymentsSection && !isOperationsSection && !isDojoSection ? (
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
              ) : null}

              {!isOverviewSection && !isBranchesSection && !isOperationsSection && !isPaymentsSection && !isDojoSection ? (
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

                {isOverviewSection ? (
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

                {isOverviewSection ? (
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
                          <View nativeID={`screens-admin-dashboard-branch-actions-${branch.id}`} style={[styles.branchActions, !isDesktop ? styles.mobileRowActions : null]} testID={`screens-admin-dashboard-branch-actions-${branch.id}`}>
                            {isDesktop ? (
                              <>
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
                              </>
                            ) : (
                              <>
                                <Pressable
                                  accessibilityLabel="Abrir asistencia pública"
                                  accessibilityRole="button"
                                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                  nativeID={`screens-admin-dashboard-branch-open-attendance-link-${branch.id}`}
                                  onPress={() => {
                                    if (organization && branch.is_active) {
                                      void openPublicAttendancePage(organization.slug, branch.name);
                                    }
                                  }}
                                  style={({ pressed }) => [styles.mobileActionLink, pressed ? styles.mobileActionLinkPressed : null, !branch.is_active || !organization ? { opacity: 0.5 } : null]}
                                  testID={`screens-admin-dashboard-branch-open-attendance-link-${branch.id}`}
                                >
                                  <Text nativeID={`screens-admin-dashboard-branch-open-attendance-link-label-${branch.id}`} style={styles.mobileActionLinkLabel} testID={`screens-admin-dashboard-branch-open-attendance-link-label-${branch.id}`}>
                                    Abrir asistencia
                                  </Text>
                                </Pressable>
                                <Pressable
                                  accessibilityLabel="Editar sucursal"
                                  accessibilityRole="button"
                                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                  nativeID={`screens-admin-dashboard-branch-edit-link-${branch.id}`}
                                  onPress={() => openEditBranchModal(branch)}
                                  style={({ pressed }) => [styles.mobileActionLink, pressed ? styles.mobileActionLinkPressed : null]}
                                  testID={`screens-admin-dashboard-branch-edit-link-${branch.id}`}
                                >
                                  <Text nativeID={`screens-admin-dashboard-branch-edit-link-label-${branch.id}`} style={styles.mobileActionLinkLabel} testID={`screens-admin-dashboard-branch-edit-link-label-${branch.id}`}>
                                    {branch.id === 1 ? "Editar matriz" : "Editar"}
                                  </Text>
                                </Pressable>
                                <Pressable
                                  accessibilityLabel="Más acciones"
                                  accessibilityRole="button"
                                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                  nativeID={`screens-admin-dashboard-branch-context-button-${branch.id}`}
                                  onPress={() => {
                                    setRowContext({ type: "branch", entity: branch });
                                    setRowContextVisible(true);
                                  }}
                                  style={({ pressed }) => [styles.mobileContextButton, pressed ? styles.mobileContextButtonPressed : null]}
                                  testID={`screens-admin-dashboard-branch-context-button-${branch.id}`}
                                >
                                  <Feather color={colors.primary} name="more-horizontal" size={20} />
                                </Pressable>
                              </>
                            )}
                          </View>
                          {organization && branch.is_active ? (
                            <View nativeID={`screens-admin-dashboard-branch-public-route-wrap-${branch.id}`} style={styles.publicRouteBlock} testID={`screens-admin-dashboard-branch-public-route-wrap-${branch.id}`}>
                              <Text nativeID={`screens-admin-dashboard-branch-public-route-${branch.id}`} style={styles.helperText} testID={`screens-admin-dashboard-branch-public-route-${branch.id}`}>
                                {buildPublicAttendanceUrl(publicAttendanceOrigin, organization.slug, branch.name)}
                              </Text>
                              {isDesktop ? (
                                <AppButton
                                  label="Copiar liga"
                                  nativeID={`screens-admin-dashboard-branch-copy-route-button-${branch.id}`}
                                  onPress={() => void copyPublicAttendanceUrl(buildPublicAttendanceUrl(publicAttendanceOrigin, organization.slug, branch.name))}
                                  testID={`screens-admin-dashboard-branch-copy-route-button-${branch.id}`}
                                  variant="secondary"
                                />
                              ) : (
                                <Pressable
                                  accessibilityLabel="Copiar liga de asistencia"
                                  accessibilityRole="button"
                                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                  nativeID={`screens-admin-dashboard-branch-copy-route-link-${branch.id}`}
                                  onPress={() => void copyPublicAttendanceUrl(buildPublicAttendanceUrl(publicAttendanceOrigin, organization.slug, branch.name))}
                                  style={({ pressed }) => [
                                    styles.mobileActionLink,
                                    { alignItems: "flex-start", alignSelf: "flex-start" },
                                    pressed ? styles.mobileActionLinkPressed : null,
                                  ]}
                                  testID={`screens-admin-dashboard-branch-copy-route-link-${branch.id}`}
                                >
                                  <Text nativeID={`screens-admin-dashboard-branch-copy-route-link-label-${branch.id}`} style={styles.mobileActionLinkLabel} testID={`screens-admin-dashboard-branch-copy-route-link-label-${branch.id}`}>
                                    Copiar liga
                                  </Text>
                                </Pressable>
                              )}
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

                {isOverviewSection ? (
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
                            <View nativeID={`screens-admin-dashboard-attendance-actions-${attendance.id}`} style={[styles.branchActions, !isDesktop ? styles.mobileRowActions : null]} testID={`screens-admin-dashboard-attendance-actions-${attendance.id}`}>
                              {isDesktop ? (
                                <>
                                  <AppButton label="Editar" nativeID={`screens-admin-dashboard-attendance-edit-button-${attendance.id}`} onPress={() => openEditAttendanceModal(attendance)} testID={`screens-admin-dashboard-attendance-edit-button-${attendance.id}`} variant="secondary" />
                                  <AppButton label="Eliminar" nativeID={`screens-admin-dashboard-attendance-delete-button-${attendance.id}`} onPress={() => openEditAttendanceModal(attendance)} testID={`screens-admin-dashboard-attendance-delete-button-${attendance.id}`} variant="danger" />
                                </>
                              ) : (
                                <>
                                  <Pressable
                                    accessibilityLabel="Editar asistencia"
                                    accessibilityRole="button"
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    nativeID={`screens-admin-dashboard-attendance-edit-link-${attendance.id}`}
                                    onPress={() => openEditAttendanceModal(attendance)}
                                    style={({ pressed }) => [styles.mobileActionLink, pressed ? styles.mobileActionLinkPressed : null]}
                                    testID={`screens-admin-dashboard-attendance-edit-link-${attendance.id}`}
                                  >
                                    <Text nativeID={`screens-admin-dashboard-attendance-edit-link-label-${attendance.id}`} style={styles.mobileActionLinkLabel} testID={`screens-admin-dashboard-attendance-edit-link-label-${attendance.id}`}>
                                      Editar
                                    </Text>
                                  </Pressable>
                                  <Pressable
                                    accessibilityLabel="Más acciones"
                                    accessibilityRole="button"
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    nativeID={`screens-admin-dashboard-attendance-context-button-${attendance.id}`}
                                    onPress={() => {
                                      setRowContext({ type: "attendance", entity: attendance });
                                      setRowContextVisible(true);
                                    }}
                                    style={({ pressed }) => [styles.mobileContextButton, pressed ? styles.mobileContextButtonPressed : null]}
                                    testID={`screens-admin-dashboard-attendance-context-button-${attendance.id}`}
                                  >
                                    <Feather color={colors.primary} name="more-horizontal" size={20} />
                                  </Pressable>
                                </>
                              )}
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

                {isOverviewSection ? (
                <AnimatedSurface delay={390}>
                  <AppCard
                    nativeID="screens-admin-dashboard-payments-card"
                    style={styles.panelCard}
                    testID="screens-admin-dashboard-payments-card"
                  >
                  <View nativeID="screens-admin-dashboard-payments-header" style={styles.cardHeaderRow} testID="screens-admin-dashboard-payments-header">
                    <Text nativeID="screens-admin-dashboard-payments-title" style={styles.sectionTitle} testID="screens-admin-dashboard-payments-title">
                      Pagos
                    </Text>
                    <AppButton
                      label="Agregar pago"
                      onPress={openCreatePaymentModal}
                      variant="success"
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
                          <View nativeID={`screens-admin-dashboard-payment-actions-${payment.id}`} style={[styles.branchActions, !isDesktop ? styles.mobileRowActions : null]} testID={`screens-admin-dashboard-payment-actions-${payment.id}`}>
                            {isDesktop ? (
                              <>
                                <AppButton label="Editar" nativeID={`screens-admin-dashboard-payment-edit-button-${payment.id}`} onPress={() => openEditPaymentModal(payment)} testID={`screens-admin-dashboard-payment-edit-button-${payment.id}`} variant="secondary" />
                                {payment.status !== "void" ? (
                                  <AppButton label="Anular" nativeID={`screens-admin-dashboard-payment-void-button-${payment.id}`} onPress={() => openEditPaymentModal(payment)} testID={`screens-admin-dashboard-payment-void-button-${payment.id}`} variant="danger" />
                                ) : null}
                              </>
                            ) : (
                              <>
                                <Pressable
                                  accessibilityLabel="Editar pago"
                                  accessibilityRole="button"
                                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                  nativeID={`screens-admin-dashboard-payment-edit-link-${payment.id}`}
                                  onPress={() => openEditPaymentModal(payment)}
                                  style={({ pressed }) => [styles.mobileActionLink, pressed ? styles.mobileActionLinkPressed : null]}
                                  testID={`screens-admin-dashboard-payment-edit-link-${payment.id}`}
                                >
                                  <Text nativeID={`screens-admin-dashboard-payment-edit-link-label-${payment.id}`} style={styles.mobileActionLinkLabel} testID={`screens-admin-dashboard-payment-edit-link-label-${payment.id}`}>
                                    Editar
                                  </Text>
                                </Pressable>
                                <Pressable
                                  accessibilityLabel="Más acciones"
                                  accessibilityRole="button"
                                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                  nativeID={`screens-admin-dashboard-payment-context-button-${payment.id}`}
                                  onPress={() => {
                                    setRowContext({ type: "payment", entity: payment });
                                    setRowContextVisible(true);
                                  }}
                                  style={({ pressed }) => [styles.mobileContextButton, pressed ? styles.mobileContextButtonPressed : null]}
                                  testID={`screens-admin-dashboard-payment-context-button-${payment.id}`}
                                >
                                  <Feather color={colors.primary} name="more-horizontal" size={20} />
                                </Pressable>
                              </>
                            )}
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

                {isOverviewSection ? (
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
                          <View nativeID={`screens-admin-dashboard-class-actions-${classItem.id}`} style={[styles.branchActions, !isDesktop ? styles.mobileRowActions : null]} testID={`screens-admin-dashboard-class-actions-${classItem.id}`}>
                            {isDesktop ? (
                              <>
                                <AppButton label="Editar" nativeID={`screens-admin-dashboard-class-edit-button-${classItem.id}`} onPress={() => openEditClassModal(classItem)} testID={`screens-admin-dashboard-class-edit-button-${classItem.id}`} variant="secondary" />
                                {classItem.is_active ? (
                                  <AppButton label="Desactivar" nativeID={`screens-admin-dashboard-class-deactivate-button-${classItem.id}`} onPress={() => openEditClassModal(classItem)} testID={`screens-admin-dashboard-class-deactivate-button-${classItem.id}`} variant="danger" />
                                ) : null}
                              </>
                            ) : (
                              <>
                                <Pressable
                                  accessibilityLabel="Editar clase"
                                  accessibilityRole="button"
                                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                  nativeID={`screens-admin-dashboard-class-edit-link-${classItem.id}`}
                                  onPress={() => openEditClassModal(classItem)}
                                  style={({ pressed }) => [styles.mobileActionLink, pressed ? styles.mobileActionLinkPressed : null]}
                                  testID={`screens-admin-dashboard-class-edit-link-${classItem.id}`}
                                >
                                  <Text nativeID={`screens-admin-dashboard-class-edit-link-label-${classItem.id}`} style={styles.mobileActionLinkLabel} testID={`screens-admin-dashboard-class-edit-link-label-${classItem.id}`}>
                                    Editar
                                  </Text>
                                </Pressable>
                                <Pressable
                                  accessibilityLabel="Más acciones"
                                  accessibilityRole="button"
                                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                  nativeID={`screens-admin-dashboard-class-context-button-${classItem.id}`}
                                  onPress={() => {
                                    setRowContext({ type: "class", entity: classItem });
                                    setRowContextVisible(true);
                                  }}
                                  style={({ pressed }) => [styles.mobileContextButton, pressed ? styles.mobileContextButtonPressed : null]}
                                  testID={`screens-admin-dashboard-class-context-button-${classItem.id}`}
                                >
                                  <Feather color={colors.primary} name="more-horizontal" size={20} />
                                </Pressable>
                              </>
                            )}
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

      <FloatingActionButton
        accessibilityLabel="Acciones rápidas"
        onPress={() => setDashboardSheetVisible(true)}
        icon="plus"
        label="Acciones"
        variant="extended"
      />

      <BottomSheet
        idPrefix="screens-admin-dashboard-quick-actions"
        title="Acciones rápidas"
        subtitle="Operaciones diarias del dojo"
        visible={dashboardSheetVisible}
        onClose={() => setDashboardSheetVisible(false)}
        actions={dashboardQuickActions}
      />

      <BottomSheet
        idPrefix="screens-admin-dashboard-row-context"
        title={
          rowContext?.type === "branch"
            ? rowContext.entity.name
            : rowContext?.type === "attendance"
              ? "Asistencia"
              : rowContext?.type === "payment"
                ? "Pago"
                : rowContext?.type === "class"
                  ? rowContext.entity.name
                  : "Acciones"
        }
        subtitle={
          rowContext?.type === "branch"
            ? [rowContext.entity.city, rowContext.entity.state, rowContext.entity.country].filter(Boolean).join(", ") || undefined
            : rowContext?.type === "payment"
              ? formatCurrency(rowContext.entity.amount, rowContext.entity.currency)
              : rowContext?.type === "class"
                ? rowContext.entity.instructor_name ?? "Clase"
                : undefined
        }
        visible={rowContextVisible}
        onClose={() => setRowContextVisible(false)}
        actions={rowContextActions}
      />

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
        <AppStatusSwitch
          entityName={organization?.name}
          entityType="dojo"
          enabled={!organizationBusy}
          error={organizationErrors.status}
          label="Estado"
          nativeID="screens-admin-dashboard-organization-form-status-switch"
          onValueChange={(value) =>
            setOrganizationForm((current) => ({ ...current, status: value as OrganizationStatusValue }))
          }
          testID="screens-admin-dashboard-organization-form-status-switch"
          value={organizationForm.status}
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
          <AppStatusSwitch
            entityName={editingBranch?.name}
            entityType="sucursal"
            enabled={!branchBusy}
            label="Estado"
            nativeID="screens-admin-dashboard-branch-form-status-switch"
            onValueChange={(value) => setBranchForm((current) => ({ ...current, status: value as BranchStatusValue }))}
            testID="screens-admin-dashboard-branch-form-status-switch"
            value={branchForm.status}
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
        visible={operationsClassPickerVisible}
        title="Elegir clase"
        description="Selecciona la clase cuya asistencia quieres administrar en el dashboard."
        onClose={() => setOperationsClassPickerVisible(false)}
      >
        <AppSelect
          label="Clase"
          value={operationsClassPickerValue}
          onValueChange={setOperationsClassPickerValue}
          items={operationsClassOptions}
          placeholder={operationsClassOptions.length > 0 ? "Selecciona una clase" : "Sin clases disponibles"}
          enabled={operationsClassOptions.length > 0}
        />
        <View style={[styles.modalActions, isDesktop ? desktopStyles.modalActions : null]}>
          <View style={styles.modalPrimaryActions}>
            <AppButton label="Cancelar" onPress={() => setOperationsClassPickerVisible(false)} variant="secondary" />
            <AppButton
              label="Cargar asistencias"
              onPress={() => {
                setOperationsSelectedClassId(operationsClassPickerValue);
                setOperationsDashboardView("attendance");
                setOperationsClassPickerVisible(false);
              }}
              variant="success"
              disabled={!operationsClassPickerValue}
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
        {/* TEMPORAL COMENTADO PARA DEBUG: formulario manual completo */}
        {/*
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
        */}

        <Pressable
          accessibilityRole="button"
          disabled={!quickQrEnabled || attendanceBusy}
          nativeID="screens-admin-dashboard-attendance-modal-qr-row"
          onPress={() => {
            setAttendanceModalVisible(false);
            setQuickScannerVisible(true);
          }}
          style={({ pressed, hovered }) => [
            styles.quickModalQrRow,
            !quickQrEnabled || attendanceBusy ? styles.quickModalQrRowDisabled : null,
            pressed || hovered ? styles.quickModalQrRowPressed : null,
          ]}
          testID="screens-admin-dashboard-attendance-modal-qr-row"
        >
          <View style={styles.quickModalQrRowContent}>
            <View style={[styles.quickModalSectionIconWrap, { backgroundColor: "rgba(85,139,47,0.14)" }]}>
              <Feather name="maximize-2" size={16} color={matchaGreen} />
            </View>
            <View style={styles.quickModalQrRowCopy}>
              <Text style={styles.quickModalQrRowTitle}>Escanear QR</Text>
              <Text style={styles.quickModalQrRowSubtitle}>
                {quickQrEnabled
                  ? "Abre la camara y apunta al codigo QR de la credencial del alumno."
                  : isDesktop
                    ? "El escaneo QR solo esta disponible en dispositivos moviles."
                    : "Camara no disponible. Verifica los permisos del dispositivo."}
              </Text>
            </View>
          </View>
          <Feather
            name="chevron-right"
            size={18}
            color={quickQrEnabled ? matchaGreen : colors.textMuted}
          />
        </Pressable>
        <View style={[styles.modalActions, isDesktop ? desktopStyles.modalActions : null, { marginTop: 20 }]}>
          <AppButton
            label="Cerrar"
            onPress={() => setAttendanceModalVisible(false)}
            variant="secondary"
            disabled={attendanceBusy}
          />
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
          <AppStatusSwitch
            entityName={editingClass?.name}
            entityType="clase"
            enabled={!classBusy}
            label="Estado"
            nativeID="screens-admin-dashboard-class-form-status-switch"
            onValueChange={(value) => setClassForm((current) => ({ ...current, status: value as ClassStatusValue }))}
            testID="screens-admin-dashboard-class-form-status-switch"
            value={classForm.status}
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

      <AppModal
        visible={quickAttendanceModalVisible}
        title="Registrar asistencia"
        description="Escanea el codigo QR de la credencial del alumno para registrar la asistencia."
        onClose={() => setQuickAttendanceModalVisible(false)}
        nativeID="screens-admin-dashboard-quick-attendance-modal"
        testID="screens-admin-dashboard-quick-attendance-modal"
      >
        {quickAttendanceFeedback ? (
          <View
            nativeID="screens-admin-dashboard-quick-attendance-modal-feedback"
            style={[
              styles.quickFeedbackBanner,
              quickAttendanceFeedback.tone === "success"
                ? { backgroundColor: matchaGreenSoft, borderColor: "rgba(85,139,47,0.22)" }
                : { backgroundColor: judogiRedSoft, borderColor: "rgba(198,40,40,0.22)" },
            ]}
            testID="screens-admin-dashboard-quick-attendance-modal-feedback"
          >
            <Feather
              name={quickAttendanceFeedback.tone === "success" ? "check-circle" : "alert-triangle"}
              size={15}
              color={quickAttendanceFeedback.tone === "success" ? matchaGreen : judogiRed}
            />
            <Text
              style={[
                styles.quickFeedbackText,
                { color: quickAttendanceFeedback.tone === "success" ? matchaGreen : judogiRed },
              ]}
            >
              {quickAttendanceFeedback.message}
            </Text>
          </View>
        ) : null}

        {/* TEMPORAL COMENTADO PARA DEBUG: flujo de registro manual */}
        {/*
        <View
          nativeID="screens-admin-dashboard-quick-attendance-modal-manual-section"
          style={styles.quickModalSection}
          testID="screens-admin-dashboard-quick-attendance-modal-manual-section"
        >
          <View style={styles.quickModalSectionHeader}>
            <View style={[styles.quickModalSectionIconWrap, { backgroundColor: indigoSoft }]}>
              <Feather name="edit-3" size={16} color={indigo} />
            </View>
            <Text style={styles.quickModalSectionTitle}>Registro manual</Text>
          </View>
          <View style={styles.quickModalManualFields}>
            <AppSelect
              enabled={!createAttendanceMutation.isPending}
              items={attendanceClassOptions.filter((opt) => opt.value !== "none")}
              label="Clase"
              nativeID="screens-admin-dashboard-quick-attendance-modal-class"
              onValueChange={(value) => {
                setAttendanceForm((form) => ({ ...form, classId: value ?? "none" }));
                setQuickAttendanceFeedback(null);
              }}
              placeholder="Selecciona una clase"
              testID="screens-admin-dashboard-quick-attendance-modal-class"
              value={attendanceForm.classId && attendanceForm.classId !== "none" ? Number(attendanceForm.classId) : null}
            />
            <AppInput
              autoCorrect={false}
              enabled={!createAttendanceMutation.isPending}
              label="Código del alumno"
              nativeID="screens-admin-dashboard-quick-attendance-modal-student"
              onChangeText={(value) => {
                setQuickStudentIdentifier(value);
                setQuickAttendanceFeedback(null);
              }}
              onSubmitEditing={() => {
                void quickRegisterSubmit(quickStudentIdentifier);
              }}
              placeholder="Ej: ABC123 · ELD-XXXX"
              returnKeyType="done"
              testID="screens-admin-dashboard-quick-attendance-modal-student"
              value={quickStudentIdentifier}
            />
          </View>
          <View style={styles.quickModalManualActions}>
            <AppButton
              loading={createAttendanceMutation.isPending}
              onPress={() => {
                void quickRegisterSubmit(quickStudentIdentifier);
              }}
              label="Registrar asistencia"
              nativeID="screens-admin-dashboard-quick-attendance-modal-submit"
              testID="screens-admin-dashboard-quick-attendance-modal-submit"
              variant="primary"
              style={{ minHeight: 52 }}
            />
          </View>
        </View>

        <View
          nativeID="screens-admin-dashboard-quick-attendance-modal-divider"
          style={styles.quickModalDivider}
          testID="screens-admin-dashboard-quick-attendance-modal-divider"
        />
        */}

        <Pressable
          accessibilityRole="button"
          disabled={!quickQrEnabled}
          nativeID="screens-admin-dashboard-quick-attendance-modal-qr-row"
          onPress={() => {
            setQuickAttendanceFeedback(null);
            setQuickAttendanceModalVisible(false);
            setQuickScannerVisible(true);
          }}
          style={({ pressed, hovered }) => [
            styles.quickModalQrRow,
            !quickQrEnabled ? styles.quickModalQrRowDisabled : null,
            pressed || hovered ? styles.quickModalQrRowPressed : null,
          ]}
          testID="screens-admin-dashboard-quick-attendance-modal-qr-row"
        >
          <View style={styles.quickModalQrRowContent}>
            <View style={[styles.quickModalSectionIconWrap, { backgroundColor: "rgba(85,139,47,0.14)" }]}>
              <Feather name="maximize-2" size={16} color={matchaGreen} />
            </View>
            <View style={styles.quickModalQrRowCopy}>
              <Text style={styles.quickModalQrRowTitle}>Escanear QR</Text>
              <Text style={styles.quickModalQrRowSubtitle}>
                {quickQrEnabled
                  ? "Abre la camara y apunta al codigo QR de la credencial del alumno."
                  : isDesktop
                    ? "El escaneo QR solo esta disponible en dispositivos moviles."
                    : "Camara no disponible. Verifica los permisos del dispositivo."}
              </Text>
            </View>
          </View>
          <Feather
            name="chevron-right"
            size={18}
            color={quickQrEnabled ? matchaGreen : colors.textMuted}
          />
        </Pressable>
      </AppModal>

      <QrScanner
        visible={quickScannerVisible}
        onClose={() => {
          closeQuickScannerProcess();
          setQuickScannerVisible(false);
        }}
        onCodeScanned={handleQuickQrCodeScanned}
        title="Escanear credencial"
        description="Apunta la cámara al código QR del alumno para registrar su asistencia."
        nativeID="screens-admin-dashboard-quick-qr-scanner"
        testID="screens-admin-dashboard-quick-qr-scanner"
        attendanceProcess={quickScannerProcess}
        onAttendanceProcessRetry={resetQuickScannerAndOpenCamera}
      />
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
          backgroundColor: colors.successSoft,
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

function CircularStat({
  idPrefix,
  label,
  value,
  total,
  tone,
  compact = false,
}: {
  idPrefix: string;
  label: string;
  value: number;
  total: number;
  tone: string;
  compact?: boolean;
}) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <View nativeID={idPrefix} style={[styles.circularStatCard, compact ? styles.circularStatCardCompact : null]} testID={idPrefix}>
      <View nativeID={`${idPrefix}-ring-wrap`} style={styles.circularStatRingWrap} testID={`${idPrefix}-ring-wrap`}>
        <View
          nativeID={`${idPrefix}-ring`}
          style={[
            styles.circularStatRing,
            compact ? styles.circularStatRingCompact : null,
            { borderColor: tone },
          ]}
          testID={`${idPrefix}-ring`}
        >
          <View
            nativeID={`${idPrefix}-ring-inner`}
            style={[styles.circularStatRingInner, compact ? styles.circularStatRingInnerCompact : null]}
            testID={`${idPrefix}-ring-inner`}
          >
            <Text nativeID={`${idPrefix}-value`} style={[styles.circularStatValue, compact ? styles.circularStatValueCompact : null]} testID={`${idPrefix}-value`}>
              {value}
            </Text>
            <Text nativeID={`${idPrefix}-percentage`} style={styles.circularStatPercentage} testID={`${idPrefix}-percentage`}>
              {`${percentage}%`}
            </Text>
          </View>
        </View>
      </View>
      <View nativeID={`${idPrefix}-copy`} style={styles.circularStatCopy} testID={`${idPrefix}-copy`}>
        <Text nativeID={`${idPrefix}-label`} style={styles.circularStatLabel} testID={`${idPrefix}-label`}>{label}</Text>
        <Text nativeID={`${idPrefix}-meta`} style={styles.circularStatMeta} testID={`${idPrefix}-meta`}>
          {`De ${total} visibles`}
        </Text>
      </View>
    </View>
  );
}

function OverviewCircularGraphCard({
  delay,
  idPrefix,
  items,
  subtitle,
  title,
  compact = false,
  footerLink,
  circleLinks,
}: {
  delay: number;
  idPrefix: string;
  items: Array<{ key: string; label: string; value: number; tone: string }>;
  subtitle: string;
  title: string;
  compact?: boolean;
  footerLink?: { label: string; onPress: () => void };
  circleLinks?: Record<string, { label: string; onPress: () => void }>;
}) {
  const totalValue = Math.max(items.reduce((accumulator, item) => accumulator + item.value, 0), 1);

  return (
    <AnimatedSurface delay={delay}>
      <AppCard nativeID={idPrefix} style={styles.graphCard} testID={idPrefix}>
        <View nativeID={`${idPrefix}-header`} style={styles.graphCardHeader} testID={`${idPrefix}-header`}>
          <Text nativeID={`${idPrefix}-title`} style={styles.sectionTitle} testID={`${idPrefix}-title`}>{title}</Text>
          <Text nativeID={`${idPrefix}-subtitle`} style={styles.helperText} testID={`${idPrefix}-subtitle`}>{subtitle}</Text>
        </View>
        <View nativeID={`${idPrefix}-circles`} style={[styles.circularStatsGrid, compact ? styles.circularStatsGridCompact : null]} testID={`${idPrefix}-circles`}>
          {items.map((item) => {
            const circleLink = circleLinks?.[item.key];

            return (
              <View key={item.key} style={styles.circularStatColumn}>
                <CircularStat
                  compact={compact}
                  idPrefix={`${idPrefix}-circle-${item.key}`}
                  label={item.label}
                  tone={item.tone}
                  total={totalValue}
                  value={item.value}
                />
                {circleLink ? (
                  <Pressable
                    accessibilityRole="link"
                    nativeID={`${idPrefix}-circle-${item.key}-link`}
                    onPress={circleLink.onPress}
                    style={({ pressed }) => [styles.operationsInlineLink, styles.circularStatInlineLink, pressed ? styles.operationsInlineLinkPressed : null]}
                    testID={`${idPrefix}-circle-${item.key}-link`}
                  >
                    <Text
                      nativeID={`${idPrefix}-circle-${item.key}-link-label`}
                      style={[styles.operationsInlineLinkLabel, styles.circularStatInlineLinkLabel]}
                      testID={`${idPrefix}-circle-${item.key}-link-label`}
                    >
                      {circleLink.label}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </View>
        {footerLink ? (
          <View nativeID={`${idPrefix}-footer`} style={styles.graphCardFooter} testID={`${idPrefix}-footer`}>
            <Pressable
              accessibilityRole="link"
              nativeID={`${idPrefix}-footer-link`}
              onPress={footerLink.onPress}
              style={({ pressed }) => [styles.operationsInlineLink, styles.graphCardFooterInlineLink, pressed ? styles.operationsInlineLinkPressed : null]}
              testID={`${idPrefix}-footer-link`}
            >
              <Text
                nativeID={`${idPrefix}-footer-link-label`}
                style={[styles.operationsInlineLinkLabel, styles.graphCardFooterInlineLinkLabel]}
                testID={`${idPrefix}-footer-link-label`}
              >
                {footerLink.label}
              </Text>
            </Pressable>
          </View>
        ) : null}
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
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          nativeID={`screens-admin-dashboard-tutorial-close-button-${currentStep}`}
          onPress={onDismiss}
          style={({ pressed }) => [styles.tutorialCloseButton, pressed ? styles.tutorialCloseButtonPressed : null]}
          testID={`screens-admin-dashboard-tutorial-close-button-${currentStep}`}
        >
          <Feather color={colors.textMuted} name="x" size={18} />
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
  skeletonWrap: {
    gap: spacing.lg,
  },
  skeletonGap: {
    height: spacing.xs,
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
  overviewHeroHeaderBlock: {
    width: "100%",
  },
  overviewCentralContent: {
    width: "100%",
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
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
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
    backgroundColor: colors.hover,
    opacity: 0.92,
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
  graphCardFooter: {
    alignItems: "center",
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingTop: spacing.md,
  },
  graphCardFooterInlineLink: {
    alignSelf: "center",
  },
  graphCardFooterInlineLinkLabel: {
    textAlign: "center",
  },
  circularStatsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "center",
  },
  circularStatsGridCompact: {
    gap: spacing.sm,
  },
  circularStatColumn: {
    alignItems: "center",
    flexGrow: 1,
    gap: spacing.sm,
    justifyContent: "center",
    minWidth: 150,
  },
  circularStatInlineLink: {
    alignContent: "center",
    alignItems: "center",
    alignSelf: "center",
    flexDirection: "row",
    justifyContent: "center",
    width: "100%",
  },
  circularStatInlineLinkLabel: {
    textAlign: "center",
    width: "100%",
  },
  circularStatCard: {
    alignItems: "center",
    flexGrow: 1,
    gap: spacing.sm,
    minWidth: 150,
  },
  circularStatCardCompact: {
    minWidth: 132,
  },
  circularStatRingWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  circularStatRing: {
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderRadius: 999,
    borderWidth: 10,
    height: 118,
    justifyContent: "center",
    width: 118,
  },
  circularStatRingCompact: {
    borderWidth: 8,
    height: 96,
    width: 96,
  },
  circularStatRingInner: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 999,
    gap: 2,
    height: 82,
    justifyContent: "center",
    width: 82,
  },
  circularStatRingInnerCompact: {
    height: 66,
    width: 66,
  },
  circularStatValue: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 30,
  },
  circularStatValueCompact: {
    fontSize: 22,
    lineHeight: 24,
  },
  circularStatPercentage: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  circularStatCopy: {
    alignItems: "center",
    gap: 2,
  },
  circularStatLabel: {
    color: colors.text,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  circularStatMeta: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
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
  fullWidthPanel: {
    flexBasis: "100%",
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
  dashboardTemplateActionGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  operationsCenterContent: {
    gap: spacing.md,
    width: "100%",
  },
  operationsSelectorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  operationsSelectorCard: {
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minWidth: 240,
    padding: spacing.md,
  },
  operationsSelectorCardActive: {
    backgroundColor: colors.infoSoft,
    borderColor: colors.action,
  },
  operationsSelectorCardPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.995 }],
  },
  operationsSelectorIconWrap: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  operationsSelectorCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  operationsSelectorTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 16,
    fontWeight: "800",
  },
  operationsSelectorDescription: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 19,
  },
  operationsQuickLinkWrap: {
    alignItems: "flex-start",
  },
  operationsMainHeader: {
    alignItems: "center",
  },
  operationsMainCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  branchInlineLinkRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  operationsInlineLink: {
    alignSelf: "flex-start",
  },
  operationsInlineLinkPressed: {
    opacity: 0.84,
  },
  operationsInlineLinkLabel: {
    color: colors.action,
    fontFamily: typography.headingFamily,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  branchDangerLinkLabel: {
    color: colors.danger,
    fontFamily: typography.headingFamily,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  operationsDataList: {
    gap: spacing.xs,
  },
  operationsDataRow: {
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    minHeight: 82,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  operationsDataIconWrap: {
    alignItems: "center",
    backgroundColor: colors.infoSoft,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  operationsDataCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  operationsDataHead: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  operationsDataTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 15,
    fontWeight: "800",
  },
  operationsDataMeta: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
    lineHeight: 17,
  },
  operationsDataSummary: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  operationsDataSummaryText: {
    color: colors.text,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
  operationsDataActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    justifyContent: "flex-end",
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
  branchList: {
    gap: spacing.sm,
  },
  branchDashboardRow: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  branchDashboardCopy: {
    gap: 6,
    minWidth: 0,
  },
  branchSummaryLine: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  branchSummaryLineText: {
    color: colors.text,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
  branchActionLinks: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  branchSummaryContent: {
    gap: spacing.md,
  },
  branchSummaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  branchSummaryMetricCard: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    flexGrow: 1,
    gap: 4,
    minWidth: 150,
    padding: spacing.md,
  },
  branchSummaryMetricLabel: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
    textTransform: "uppercase",
  },
  branchSummaryMetricValue: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 26,
    fontWeight: "800",
  },
  branchSummaryDetails: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  publicRouteBlock: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.sm,
  },
  mobileRowActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "flex-start",
    marginTop: spacing.xs,
  },
  mobileActionLink: {
    alignItems: "center",
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
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
  mobileActionLinkLabelMuted: {
    color: colors.textMuted,
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
  mobileContextButtonPressed: {
    backgroundColor: colors.surfaceAlt,
    opacity: 0.85,
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
    gap: spacing.xs,
  },
  paymentsStudentRow: {
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderBottomWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    minHeight: 82,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  paymentsStudentRowPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.995 }],
  },
  paymentsStudentAvatarWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  paymentsStudentAvatar: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    width: 36,
  },
  paymentsStudentAvatarFallback: {
    alignItems: "center",
    backgroundColor: colors.infoSoft,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  paymentsStudentAvatarLabel: {
    color: colors.info,
    fontFamily: typography.headingFamily,
    fontSize: 11,
    fontWeight: "800",
  },
  paymentsStudentCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  paymentsStudentHead: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  paymentsStudentName: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 15,
    fontWeight: "800",
  },
  paymentsStudentMeta: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
    lineHeight: 17,
  },
  paymentsStudentSummary: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  paymentsStudentSummaryText: {
    color: colors.text,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
  paymentsStudentAction: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  paymentsStudentActionLabel: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 11,
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
  quickAttendancePanel: {
    alignItems: "flex-start",
    alignSelf: "flex-start",
    flexDirection: "column",
    gap: spacing.sm,
    justifyContent: "flex-start",
    marginTop: spacing.md,
    width: "100%",
  },
  quickAttendancePanelInline: {
    alignItems: "flex-start",
    flexDirection: "column",
    gap: spacing.xs,
    justifyContent: "flex-start",
    width: "100%",
  },
  quickFeedbackBanner: {
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    width: "100%",
  },
  quickFeedbackText: {
    flex: 1,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  quickFormRow: {
    alignItems: "flex-start",
    gap: spacing.sm,
    justifyContent: "space-between",
    width: "100%",
  },
  quickQrButton: {
    alignItems: "center",
    backgroundColor: indigo,
    borderRadius: radius.md,
    flexDirection: "row",
    gap: spacing.xs,
    height: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    minWidth: 130,
  },
  quickQrButtonDisabled: {
    backgroundColor: colors.surfaceAlt,
    opacity: 0.85,
  },
  quickQrButtonPressed: {
    opacity: 0.9,
    transform: [{ translateY: 1 }],
  },
  quickQrButtonLabel: {
    color: colors.surface,
    fontFamily: typography.headingFamily,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  quickQrDesktopLegend: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    height: 44,
    justifyContent: "flex-start",
  },
  quickQrLegendText: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
    lineHeight: 16,
  },
  quickFieldWrap: {
    minWidth: 0,
  },
  quickClassField: {
    flex: 3,
  },
  quickStudentField: {
    flex: 3,
  },
  quickSubmitButton: {
    flex: 2,
    height: 44,
    minWidth: 110,
  },
  quickHeroLinkRow: {
    width: "100%",
  },
  quickHeroLink: {
    alignSelf: "flex-start",
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  quickHeroLinkPressed: {
    opacity: 0.8,
  },
  quickHeroLinkLabel: {
    color: indigo,
    fontFamily: typography.headingFamily,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.15,
  },
  quickModalSection: {
    gap: spacing.md,
    width: "100%",
  },
  quickModalSectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  quickModalSectionIconWrap: {
    alignItems: "center",
    borderRadius: 999,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  quickModalSectionTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.1,
  },
  quickModalManualFields: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  quickModalManualActions: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  quickModalDivider: {
    backgroundColor: "rgba(141, 110, 99, 0.14)",
    height: 0.5,
    marginVertical: spacing.md,
    width: "100%",
  },
  quickModalQrRow: {
    alignItems: "center",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(85, 139, 47, 0.18)",
    backgroundColor: "rgba(85, 139, 47, 0.06)",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    minHeight: 72,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    width: "100%",
    ...Platform.select({
      web: {
        transition: `background-color ${transitions.base}ms ease, border-color ${transitions.base}ms ease, transform ${transitions.fast}ms ease`,
      } as any,
    }),
  },
  quickModalQrRowPressed: {
    backgroundColor: "rgba(85, 139, 47, 0.12)",
    borderColor: "rgba(85, 139, 47, 0.28)",
    transform: [{ translateY: -1 }],
  },
  quickModalQrRowDisabled: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    opacity: 0.7,
  },
  quickModalQrRowContent: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.md,
    minWidth: 0,
  },
  quickModalQrRowCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  quickModalQrRowTitle: {
    color: matchaGreen,
    fontFamily: typography.headingFamily,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.1,
  },
  quickModalQrRowSubtitle: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
    lineHeight: 16,
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
  quickFormRow: {
    alignItems: "stretch",
    flexDirection: "column",
  },
  quickSubmitButton: {
    width: "100%",
  },
  quickAttendancePanel: {
    marginTop: spacing.sm,
  },
  quickAttendancePanelInline: {},
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
  quickFormRow: {
    alignItems: "center",
    flexDirection: "row",
  },
  quickAttendancePanel: {
    marginTop: spacing.md,
  },
  quickAttendancePanelInline: {},
});
