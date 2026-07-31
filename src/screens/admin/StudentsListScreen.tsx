import { Feather } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

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
import { Screen } from "@/components/Screen";
import { StatusView } from "@/components/StatusView";
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
type FormPageId = "identity" | "profile" | "billing" | "contact";

type StudentFormState = {
  branchId: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  birthPlace: string;
  heightCm: string;
  enrollmentDate: string;
  primaryClassId: string;
  monthlyFee: string;
  currency: string;
  nextPaymentDate: string;
  paymentStatus: PaymentStatus;
  status: StudentStatus;
  guardianName: string;
  guardianPhone: string;
  notes: string;
};

type FormErrors = Partial<Record<keyof StudentFormState, string>>;
type FeedbackTone = "success" | "danger";
type StudentFormField = keyof StudentFormState;
type FormPage = {
  id: FormPageId;
  title: string;
  description: string;
  fields: StudentFormField[];
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
    description: "Captura contexto deportivo y datos generales del ingreso.",
    fields: ["birthPlace", "enrollmentDate", "heightCm", "primaryClassId"],
  },
  {
    id: "billing",
    title: "Cobro",
    description: "Configura estado operativo y condiciones de pago actuales.",
    fields: ["status", "paymentStatus", "monthlyFee", "currency"],
  },
  {
    id: "contact",
    title: "Seguimiento",
    description: "Agrega contacto responsable, próximo pago y observaciones.",
    fields: ["nextPaymentDate", "guardianName", "guardianPhone", "notes"],
  },
];

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
    monthlyFee: "",
    currency: "MXN",
    nextPaymentDate: "",
    paymentStatus: "up_to_date",
    status: "active",
    guardianName: "",
    guardianPhone: "",
    notes: "",
  };
}

function toFormState(student: Student): StudentFormState {
  return {
    branchId: String(student.branch_id),
    firstName: student.first_name,
    lastName: student.last_name,
    birthDate: student.birth_date,
    birthPlace: student.birth_place,
    heightCm: student.height_cm ? String(student.height_cm) : "",
    enrollmentDate: student.enrollment_date,
    primaryClassId: student.primary_class_id ? String(student.primary_class_id) : "",
    monthlyFee: student.monthly_fee ?? "",
    currency: student.currency,
    nextPaymentDate: student.next_payment_date ?? "",
    paymentStatus: student.payment_status,
    status: student.status,
    guardianName: student.guardian_name ?? "",
    guardianPhone: student.guardian_phone ?? "",
    notes: student.notes ?? "",
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
    monthly_fee: form.monthlyFee.trim() ? form.monthlyFee.trim() : null,
    currency: form.currency.trim().toUpperCase(),
    next_payment_date: form.nextPaymentDate.trim() || null,
    payment_status: form.paymentStatus,
    status: form.status,
    guardian_name: form.guardianName.trim() || null,
    guardian_phone: form.guardianPhone.trim() || null,
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
    monthly_fee: form.monthlyFee.trim() ? form.monthlyFee.trim() : null,
    currency: form.currency.trim().toUpperCase(),
    next_payment_date: form.nextPaymentDate.trim() || null,
    payment_status: form.paymentStatus,
    status: form.status,
    guardian_name: form.guardianName.trim() || null,
    guardian_phone: form.guardianPhone.trim() || null,
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

  const studentsQuery = useQuery({
    queryKey: ["students", debouncedSearch],
    queryFn: () => studentsApi.list({ search: debouncedSearch.trim() || undefined }),
  });

  const students = useMemo(() => studentsQuery.data ?? [], [studentsQuery.data]);
  const branches = branchesQuery.data ?? [];
  const classes = classesQuery.data ?? [];
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

  return (
    <Screen scrollable contentStyle={styles.screenContent} nativeID="screens-admin-students-list-screen" testID="screens-admin-students-list-screen">
      <AdminShell
        activeSection="students"
        headerActions={
          <AppButton
            label="Nuevo alumno"
            nativeID="screens-admin-students-list-new-button"
            onPress={handleOpenCreate}
            testID="screens-admin-students-list-new-button"
          />
        }
        onGoDashboard={() => navigation.navigate("AdminHome")}
        onGoStudents={() => navigation.navigate("StudentsList")}
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

        <AppCard nativeID="screens-admin-students-list-dashboard-card" style={styles.dashboardCard} testID="screens-admin-students-list-dashboard-card">
          <View nativeID="screens-admin-students-list-dashboard-top" style={[styles.dashboardTop, isDesktop ? desktopStyles.dashboardTop : mobileStyles.dashboardTop]} testID="screens-admin-students-list-dashboard-top">
            <View nativeID="screens-admin-students-list-dashboard-copy" style={styles.dashboardCopy} testID="screens-admin-students-list-dashboard-copy">
              <Text nativeID="screens-admin-students-list-dashboard-kicker" style={styles.dashboardKicker} testID="screens-admin-students-list-dashboard-kicker">Dashboard compacto</Text>
              <Text nativeID="screens-admin-students-list-dashboard-title" style={styles.dashboardTitle} testID="screens-admin-students-list-dashboard-title">Busca alumnos por nombre</Text>
              <Text nativeID="screens-admin-students-list-dashboard-description" style={styles.dashboardDescription} testID="screens-admin-students-list-dashboard-description">
                Encuentra coincidencias al instante, revisa cuántos alumnos aparecen y entra al detalle desde una vista más ligera para web y móvil.
              </Text>
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

          <View nativeID="screens-admin-students-list-search-row" style={[styles.searchRow, isDesktop ? desktopStyles.searchRow : mobileStyles.searchRow]} testID="screens-admin-students-list-search-row">
            <View nativeID="screens-admin-students-list-search-input-wrap" style={styles.searchInputWrap} testID="screens-admin-students-list-search-input-wrap">
              <AppInput
                label="Buscar por nombre"
                nativeID="screens-admin-students-list-search-input"
                onChangeText={setSearch}
                placeholder="Ej. Juan Pérez"
                rightAdornment={<Feather color={colors.textMuted} name="search" size={18} />}
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

          {!studentsQuery.isLoading && !studentsQuery.isError ? (
            <View nativeID="screens-admin-students-list-metrics-grid" style={[styles.metricsGrid, isDesktop ? desktopStyles.metricsGrid : mobileStyles.metricsGrid]} testID="screens-admin-students-list-metrics-grid">
              <DashboardMetricCard
                description={hasActiveSearch ? `Filtro: ${debouncedSearch.trim()}` : "Sin filtro activo"}
                icon="users"
                idPrefix="screens-admin-students-list-metric-found"
                tone="info"
                title="Encontrados"
                value={String(students.length)}
              />
              <DashboardMetricCard
                description="Con estatus activo"
                icon="check-circle"
                idPrefix="screens-admin-students-list-metric-active"
                tone="success"
                title="Activos"
                value={String(activeStudentsCount)}
              />
              <DashboardMetricCard
                description="Vencidos o parciales"
                icon="alert-circle"
                idPrefix="screens-admin-students-list-metric-payment"
                tone="warning"
                title="Cobranza"
                value={String(paymentAttentionCount)}
              />
              <DashboardMetricCard
                description="Congelados o inactivos"
                icon="pause-circle"
                idPrefix="screens-admin-students-list-metric-inactive"
                tone="neutral"
                title="No activos"
                value={String(inactiveStudentsCount)}
              />
            </View>
          ) : null}
        </AppCard>

        {studentsQuery.isLoading ? (
          <StatusView
            nativeID="screens-admin-students-list-loading-status"
            title="Cargando alumnos"
            description="Obteniendo el listado inicial desde el backend."
            loading
          />
        ) : studentsQuery.isError ? (
          <View nativeID="screens-admin-students-list-error-block" style={styles.errorBlock} testID="screens-admin-students-list-error-block">
            <StatusView
              nativeID="screens-admin-students-list-error-status"
              title="No pudimos cargar el listado"
              description={getErrorMessage(studentsQuery.error)}
            />
            <AppButton label="Reintentar" nativeID="screens-admin-students-list-retry-button" onPress={() => studentsQuery.refetch()} testID="screens-admin-students-list-retry-button" />
          </View>
        ) : (
          <AppCard nativeID="screens-admin-students-list-results-panel" style={styles.resultsPanel} testID="screens-admin-students-list-results-panel">
            <View nativeID="screens-admin-students-list-results-header" style={[styles.resultsHeader, isDesktop ? desktopStyles.resultsHeader : mobileStyles.resultsHeader]} testID="screens-admin-students-list-results-header">
              <View nativeID="screens-admin-students-list-results-header-copy" style={styles.resultsHeaderCopy} testID="screens-admin-students-list-results-header-copy">
                <Text nativeID="screens-admin-students-list-results-title" style={styles.resultsTitle} testID="screens-admin-students-list-results-title">Listado de alumnos</Text>
                <Text nativeID="screens-admin-students-list-results-description" style={styles.resultsDescription} testID="screens-admin-students-list-results-description">
                  {hasActiveSearch
                    ? `Se encontraron ${students.length} coincidencias para "${debouncedSearch.trim()}".`
                    : `Mostrando ${students.length} alumnos disponibles en una sola vista.`}
                </Text>
              </View>
              {studentsQuery.isRefetching ? (
                <AppBadge
                  label="Actualizando"
                  nativeID="screens-admin-students-list-results-refresh-badge"
                  testID="screens-admin-students-list-results-refresh-badge"
                  tone="info"
                />
              ) : null}
            </View>

            {students.length > 0 ? (
              <View nativeID="screens-admin-students-list-table" style={styles.table} testID="screens-admin-students-list-table">
                {isDesktop ? (
                  <View nativeID="screens-admin-students-list-table-head" style={styles.tableHead} testID="screens-admin-students-list-table-head">
                    <Text nativeID="screens-admin-students-list-table-head-student" style={[styles.tableHeadCell, styles.studentColumn]} testID="screens-admin-students-list-table-head-student">Alumno</Text>
                    <Text nativeID="screens-admin-students-list-table-head-branch" style={[styles.tableHeadCell, styles.branchColumn]} testID="screens-admin-students-list-table-head-branch">Sede</Text>
                    <Text nativeID="screens-admin-students-list-table-head-payment" style={[styles.tableHeadCell, styles.paymentColumn]} testID="screens-admin-students-list-table-head-payment">Próximo pago</Text>
                    <Text nativeID="screens-admin-students-list-table-head-fee" style={[styles.tableHeadCell, styles.feeColumn]} testID="screens-admin-students-list-table-head-fee">Mensualidad</Text>
                    <Text nativeID="screens-admin-students-list-table-head-status" style={[styles.tableHeadCell, styles.statusColumn]} testID="screens-admin-students-list-table-head-status">Estado</Text>
                    <Text nativeID="screens-admin-students-list-table-head-actions" style={[styles.tableHeadCell, styles.actionsColumn]} testID="screens-admin-students-list-table-head-actions">Acciones</Text>
                  </View>
                ) : null}

                <View nativeID="screens-admin-students-list-table-body" style={styles.tableBody} testID="screens-admin-students-list-table-body">
                  {students.map((item) => (
                    <StudentListRow
                      key={item.id}
                      isDesktop={isDesktop}
                      onDelete={() => {
                        setFeedbackMessage(null);
                        setStudentToDelete(item);
                      }}
                      onEdit={() => handleOpenEdit(item)}
                      onViewDetail={() => navigation.navigate("StudentDetail", { studentId: item.id })}
                      student={item}
                      studentStatusLabel={getStudentStatusLabel(item.status)}
                      studentStatusTone={getStudentStatusTone(item.status)}
                      paymentLabel={formatPaymentStatus(item.payment_status)}
                      paymentTone={getPaymentTone(item.payment_status)}
                      branchName={studentsByBranchId.get(item.branch_id)?.name ?? "Sin sede"}
                    />
                  ))}
                </View>
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
        )}
      </View>
      </AdminShell>

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
                  <View nativeID="screens-admin-students-list-form-notes-block" style={styles.notesBlock} testID="screens-admin-students-list-form-notes-block">
                    <AppInput
                      label="Notas"
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
                </View>
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
              <SummaryRow idPrefix="screens-admin-students-list-summary-enrollment" label="Inscripción" value={form.enrollmentDate} />
              <SummaryRow idPrefix="screens-admin-students-list-summary-class" label="Clase principal" value={selectedClass?.name ?? "Sin clase"} />
              <SummaryRow idPrefix="screens-admin-students-list-summary-monthly-fee" label="Mensualidad" value={form.monthlyFee.trim() ? `${form.monthlyFee} ${form.currency}` : "Sin mensualidad"} />
              <SummaryRow idPrefix="screens-admin-students-list-summary-payment" label="Pago" value={getPaymentLabel(form.paymentStatus)} />
              <SummaryRow idPrefix="screens-admin-students-list-summary-status" label="Estado" value={getStudentStatusLabel(form.status)} />
              <SummaryRow idPrefix="screens-admin-students-list-summary-guardian" label="Tutor" value={form.guardianName || "Sin tutor"} />
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
    </Screen>
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
}) {
  if (isDesktop) {
    return (
      <View nativeID={`screens-admin-students-list-row-${student.id}`} style={styles.tableRow} testID={`screens-admin-students-list-row-${student.id}`}>
        <View nativeID={`screens-admin-students-list-row-student-${student.id}`} style={[styles.tableCell, styles.studentColumn]} testID={`screens-admin-students-list-row-student-${student.id}`}>
          <Text nativeID={`screens-admin-students-list-row-name-${student.id}`} style={styles.tableStudentName} testID={`screens-admin-students-list-row-name-${student.id}`}>
            {student.first_name} {student.last_name}
          </Text>
          <Text nativeID={`screens-admin-students-list-row-code-${student.id}`} style={styles.tableStudentMeta} testID={`screens-admin-students-list-row-code-${student.id}`}>
            Código {student.unique_code}
          </Text>
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

        <View nativeID={`screens-admin-students-list-row-status-${student.id}`} style={[styles.tableCell, styles.statusColumn]} testID={`screens-admin-students-list-row-status-${student.id}`}>
          <View nativeID={`screens-admin-students-list-row-badges-${student.id}`} style={styles.tableBadges} testID={`screens-admin-students-list-row-badges-${student.id}`}>
            <AppBadge
              label={studentStatusLabel}
              nativeID={`screens-admin-students-list-row-status-badge-${student.id}`}
              testID={`screens-admin-students-list-row-status-badge-${student.id}`}
              tone={studentStatusTone}
            />
            <AppBadge
              label={paymentLabel}
              nativeID={`screens-admin-students-list-row-payment-badge-${student.id}`}
              testID={`screens-admin-students-list-row-payment-badge-${student.id}`}
              tone={paymentTone}
            />
          </View>
        </View>

        <View nativeID={`screens-admin-students-list-row-actions-${student.id}`} style={[styles.tableCell, styles.actionsColumn, styles.tableActions]} testID={`screens-admin-students-list-row-actions-${student.id}`}>
          <StudentRowActionButton nativeID={`screens-admin-students-list-detail-button-${student.id}`} label="Ver detalle" onPress={onViewDetail} />
          <StudentRowActionButton nativeID={`screens-admin-students-list-edit-button-${student.id}`} label="Editar" onPress={onEdit} />
          <StudentRowActionButton nativeID={`screens-admin-students-list-delete-button-${student.id}`} label="Dar de baja" onPress={onDelete} tone="danger" />
        </View>
      </View>
    );
  }

  return (
    <View nativeID={`screens-admin-students-list-row-mobile-${student.id}`} style={styles.mobileRow} testID={`screens-admin-students-list-row-mobile-${student.id}`}>
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
          <AppBadge
            label={studentStatusLabel}
            nativeID={`screens-admin-students-list-row-mobile-status-badge-${student.id}`}
            testID={`screens-admin-students-list-row-mobile-status-badge-${student.id}`}
            tone={studentStatusTone}
          />
          <AppBadge
            label={paymentLabel}
            nativeID={`screens-admin-students-list-row-mobile-payment-badge-${student.id}`}
            testID={`screens-admin-students-list-row-mobile-payment-badge-${student.id}`}
            tone={paymentTone}
          />
        </View>
      </View>

      <View nativeID={`screens-admin-students-list-row-mobile-meta-${student.id}`} style={styles.mobileMetaGrid} testID={`screens-admin-students-list-row-mobile-meta-${student.id}`}>
        <MobileMetaItem idPrefix={`screens-admin-students-list-row-mobile-payment-date-${student.id}`} label="Próximo pago" value={formatDate(student.next_payment_date)} />
        <MobileMetaItem idPrefix={`screens-admin-students-list-row-mobile-fee-${student.id}`} label="Mensualidad" value={formatStudentFee(student)} />
        <MobileMetaItem idPrefix={`screens-admin-students-list-row-mobile-enrollment-${student.id}`} label="Alta" value={formatDate(student.enrollment_date)} />
      </View>

      <View nativeID={`screens-admin-students-list-row-mobile-actions-${student.id}`} style={styles.mobileRowActions} testID={`screens-admin-students-list-row-mobile-actions-${student.id}`}>
        <AppButton label="Ver detalle" nativeID={`screens-admin-students-list-detail-button-${student.id}`} onPress={onViewDetail} testID={`screens-admin-students-list-detail-button-${student.id}`} variant="secondary" />
        <AppButton label="Editar" nativeID={`screens-admin-students-list-edit-button-${student.id}`} onPress={onEdit} testID={`screens-admin-students-list-edit-button-${student.id}`} variant="secondary" />
        <AppButton label="Dar de baja" nativeID={`screens-admin-students-list-delete-button-${student.id}`} onPress={onDelete} testID={`screens-admin-students-list-delete-button-${student.id}`} variant="danger" />
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
    borderColor: "#B7E4C7",
  },
  feedbackDanger: {
    backgroundColor: colors.dangerSoft,
    borderColor: "#F0B6B6",
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
  searchRow: {
    gap: spacing.sm,
  },
  searchInputWrap: {
    flex: 1,
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
    justifyContent: "space-between",
  },
  resultsHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  resultsTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 18,
    fontWeight: "800",
  },
  resultsDescription: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 20,
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
  tableActions: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    justifyContent: "flex-start",
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
    gap: spacing.xs,
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
    borderColor: "#F0B6B6",
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
    backgroundColor: colors.metricMint,
    borderColor: "#BFE9D9",
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
});

const mobileStyles = StyleSheet.create({
  dashboardTop: {
    flexDirection: "column",
  },
  searchRow: {
    flexDirection: "column",
  },
  metricsGrid: {
    flexDirection: "column",
  },
  resultsHeader: {
    flexDirection: "column",
    alignItems: "flex-start",
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
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  resultsHeader: {
    flexDirection: "row",
  },
  formGrid: {
    flexDirection: "row",
  },
  modalActions: {
    alignItems: "center",
    flexDirection: "row",
  },
});
