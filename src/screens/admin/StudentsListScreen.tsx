import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";

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
import { colors, radius, spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { formatDate, formatPaymentStatus } from "@/utils/format";

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
  const currentPage = FORM_PAGES[currentFormPage];
  const isLastFormPage = currentFormPage === FORM_PAGES.length - 1;

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
      <Screen contentStyle={[styles.screenContent, { alignItems: "center" }]}>
        <View style={[styles.container, { maxWidth: contentMaxWidth }]}>
          <StatusView
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
    <Screen contentStyle={styles.screenContent}>
      <AdminShell
        activeSection="students"
        headerActions={<AppButton label="Nuevo alumno" onPress={handleOpenCreate} />}
        onGoDashboard={() => navigation.navigate("AdminHome")}
        onGoStudents={() => navigation.navigate("StudentsList")}
        subtitle="Consulta el padron del gimnasio, filtra por nombre y opera altas, ediciones y bajas sin salir del navegador."
        title="Panel de alumnos"
      >
      <View style={styles.container}>

        {feedbackMessage ? (
          <AppCard style={[styles.feedbackCard, feedbackTone === "success" ? styles.feedbackSuccess : styles.feedbackDanger]}>
            <View style={styles.feedbackCopy}>
              <Text style={styles.feedbackTitle}>
                {feedbackTone === "success" ? "Acción completada" : "Necesita revisión"}
              </Text>
              <Text style={styles.feedbackDescription}>{feedbackMessage}</Text>
            </View>
            <AppButton label="Cerrar aviso" onPress={() => setFeedbackMessage(null)} variant="secondary" />
          </AppCard>
        ) : null}

        <View style={[styles.topGrid, isDesktop ? desktopStyles.topGrid : mobileStyles.topGrid]}>
          <AppCard style={styles.searchCard}>
            <Text style={styles.sectionTitle}>Búsqueda operativa</Text>
            <Text style={styles.sectionDescription}>
              Filtra por nombre para encontrar rápido al alumno que necesitas o abre el alta desde este panel.
            </Text>
            <AppInput
              label="Buscar por nombre"
              onChangeText={setSearch}
              placeholder="Ej. Juan"
              value={search}
            />
          </AppCard>

          {!studentsQuery.isLoading && !studentsQuery.isError ? (
            <AppCard style={[styles.summaryCard, isDesktop ? desktopStyles.summaryCard : mobileStyles.summaryCard]}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total visibles</Text>
                <Text style={styles.summaryValue}>{students.length}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Filtro actual</Text>
                <Text style={styles.summaryValue}>{debouncedSearch.trim() || "Sin filtro"}</Text>
              </View>
            </AppCard>
          ) : null}
        </View>

        {studentsQuery.isLoading ? (
          <StatusView
            title="Cargando alumnos"
            description="Obteniendo el listado inicial desde el backend."
            loading
          />
        ) : studentsQuery.isError ? (
          <View style={styles.errorBlock}>
            <StatusView
              title="No pudimos cargar el listado"
              description={getErrorMessage(studentsQuery.error)}
            />
            <AppButton label="Reintentar" onPress={() => studentsQuery.refetch()} />
          </View>
        ) : (
          <FlatList
            contentContainerStyle={styles.listContent}
            data={students}
            keyExtractor={(item) => String(item.id)}
            refreshControl={
              <RefreshControl
                refreshing={studentsQuery.isRefetching}
                onRefresh={studentsQuery.refetch}
              />
            }
            renderItem={({ item }) => (
              <AppCard style={styles.studentCard}>
                <View style={styles.studentTopRow}>
                  <View style={styles.studentTitleBlock}>
                    <Text style={styles.studentName}>
                      {item.first_name} {item.last_name}
                    </Text>
                    <Text style={styles.studentMeta}>Código: {item.unique_code}</Text>
                  </View>
                  <AppBadge
                    label={formatPaymentStatus(item.payment_status)}
                    tone={getPaymentTone(item.payment_status)}
                  />
                </View>
                <View style={[styles.metaGrid, isDesktop ? desktopStyles.metaGrid : mobileStyles.metaGrid]}>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Próximo pago</Text>
                    <Text style={styles.studentMetaStrong}>{formatDate(item.next_payment_date)}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Estado</Text>
                    <Text style={styles.studentMetaStrong}>{getStudentStatusLabel(item.status)}</Text>
                  </View>
                </View>
                <View style={[styles.cardActions, isDesktop ? desktopStyles.cardActions : mobileStyles.cardActions]}>
                  <AppButton
                    label="Ver detalle"
                    onPress={() => navigation.navigate("StudentDetail", { studentId: item.id })}
                    variant="secondary"
                  />
                  <AppButton label="Editar" onPress={() => handleOpenEdit(item)} variant="secondary" />
                  <AppButton
                    label="Dar de baja"
                    onPress={() => {
                      setFeedbackMessage(null);
                      setStudentToDelete(item);
                    }}
                    variant="danger"
                  />
                </View>
              </AppCard>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No hay alumnos para mostrar</Text>
                <Text style={styles.emptyDescription}>
                  Ajusta la búsqueda o verifica que existan alumnos en tu organización o sucursal.
                </Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
      </AdminShell>

      <AppModal
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
      >
        {dialogStep === "form" ? (
          <>
            {modalError ? <Text style={styles.modalError}>{modalError}</Text> : null}
            <View style={styles.formStepper}>
              <View style={styles.formStepperCopy}>
                <Text style={styles.formStepLabel}>Paso {currentFormPage + 1}</Text>
                <Text style={styles.formStepTitle}>{currentPage.title}</Text>
              </View>
              <View style={styles.formStepperTrack}>
                {FORM_PAGES.map((page, index) => (
                  <View
                    key={page.id}
                    style={[
                      styles.formStepDot,
                      index === currentFormPage ? styles.formStepDotActive : null,
                      index < currentFormPage ? styles.formStepDotCompleted : null,
                    ]}
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
                    onValueChange={(value) => handleUpdateField("branchId", value)}
                    placeholder={
                      branchesQuery.isLoading ? "Cargando sucursales..." : "Selecciona una sucursal"
                    }
                    value={form.branchId}
                  />
                  <AppDateInput
                    error={formErrors.birthDate}
                    label="Fecha de nacimiento"
                    onChangeText={(value) => handleUpdateField("birthDate", value)}
                    placeholder="2008-05-10"
                    value={form.birthDate}
                  />
                </View>

                <View style={[styles.formGrid, isDesktop ? desktopStyles.formGrid : mobileStyles.formGrid]}>
                  <AppInput
                    error={formErrors.firstName}
                    label="Nombre"
                    onChangeText={(value) => handleUpdateField("firstName", value)}
                    placeholder="Juan"
                    value={form.firstName}
                  />
                  <AppInput
                    error={formErrors.lastName}
                    label="Apellido"
                    onChangeText={(value) => handleUpdateField("lastName", value)}
                    placeholder="Pérez"
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
                    onChangeText={(value) => handleUpdateField("birthPlace", value)}
                    placeholder="Monterrey"
                    value={form.birthPlace}
                  />
                  <AppDateInput
                    error={formErrors.enrollmentDate}
                    label="Fecha de inscripción"
                    onChangeText={(value) => handleUpdateField("enrollmentDate", value)}
                    placeholder="2026-07-01"
                    value={form.enrollmentDate}
                  />
                </View>

                <View style={[styles.formGrid, isDesktop ? desktopStyles.formGrid : mobileStyles.formGrid]}>
                  <AppInput
                    error={formErrors.heightCm}
                    keyboardType="numeric"
                    label="Altura (cm)"
                    onChangeText={(value) => handleUpdateField("heightCm", value)}
                    placeholder="168"
                    value={form.heightCm}
                  />
                  <AppSelect
                    items={classOptions}
                    label="Clase principal"
                    onValueChange={(value) => handleUpdateField("primaryClassId", value)}
                    placeholder={
                      selectedBranchId
                        ? classesQuery.isLoading
                          ? "Cargando clases..."
                          : "Selecciona una clase"
                        : "Elige una sucursal primero"
                    }
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
                    onValueChange={(value) => handleUpdateField("status", value as StudentStatus)}
                    value={form.status}
                  />
                  <AppSelect
                    items={PAYMENT_STATUS_OPTIONS}
                    label="Estatus de pago"
                    onValueChange={(value) => handleUpdateField("paymentStatus", value as PaymentStatus)}
                    value={form.paymentStatus}
                  />
                </View>

                <View style={[styles.formGrid, isDesktop ? desktopStyles.formGrid : mobileStyles.formGrid]}>
                  <AppInput
                    error={formErrors.monthlyFee}
                    keyboardType="decimal-pad"
                    label="Mensualidad"
                    onChangeText={(value) => handleUpdateField("monthlyFee", value)}
                    placeholder="1200.00"
                    value={form.monthlyFee}
                  />
                  <AppInput
                    label="Moneda"
                    onChangeText={(value) => handleUpdateField("currency", value.toUpperCase())}
                    placeholder="MXN"
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
                    onChangeText={(value) => handleUpdateField("nextPaymentDate", value)}
                    placeholder="2026-08-01"
                    value={form.nextPaymentDate}
                  />
                  <AppInput
                    label="Tutor o responsable"
                    onChangeText={(value) => handleUpdateField("guardianName", value)}
                    placeholder="María Pérez"
                    value={form.guardianName}
                  />
                </View>

                <View style={[styles.formGrid, isDesktop ? desktopStyles.formGrid : mobileStyles.formGrid]}>
                  <AppInput
                    label="Teléfono del tutor"
                    onChangeText={(value) => handleUpdateField("guardianPhone", value)}
                    placeholder="8112345678"
                    value={form.guardianPhone}
                  />
                  <View style={styles.notesBlock}>
                    <AppInput
                      label="Notas"
                      multiline
                      numberOfLines={4}
                      onChangeText={(value) => handleUpdateField("notes", value)}
                      placeholder="Observaciones relevantes para el gimnasio"
                      style={styles.notesInput}
                      value={form.notes}
                    />
                  </View>
                </View>
              </>
            ) : null}

            <View style={[styles.modalActions, isDesktop ? desktopStyles.modalActions : mobileStyles.modalActions]}>
              <AppButton
                label={currentFormPage === 0 ? "Cancelar" : "Anterior"}
                onPress={currentFormPage === 0 ? handleCloseFormDialog : handleGoToPreviousPage}
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
                onPress={handleAdvanceForm}
              />
            </View>
          </>
        ) : dialogMode === "create" ? (
          <>
            {modalError ? <Text style={styles.modalError}>{modalError}</Text> : null}
            <AppCard style={styles.confirmCard}>
              <Text style={styles.confirmTitle}>Confirma el nuevo alumno</Text>
              <SummaryRow label="Sucursal" value={selectedBranch?.name ?? "Sin sucursal"} />
              <SummaryRow label="Nombre completo" value={`${form.firstName} ${form.lastName}`.trim()} />
              <SummaryRow label="Nacimiento" value={`${form.birthDate} · ${form.birthPlace}`} />
              <SummaryRow label="Inscripción" value={form.enrollmentDate} />
              <SummaryRow label="Clase principal" value={selectedClass?.name ?? "Sin clase"} />
              <SummaryRow label="Mensualidad" value={form.monthlyFee.trim() ? `${form.monthlyFee} ${form.currency}` : "Sin mensualidad"} />
              <SummaryRow label="Pago" value={getPaymentLabel(form.paymentStatus)} />
              <SummaryRow label="Estado" value={getStudentStatusLabel(form.status)} />
              <SummaryRow label="Tutor" value={form.guardianName || "Sin tutor"} />
              <SummaryRow label="Notas" value={form.notes || "Sin notas"} />
            </AppCard>
            <View style={[styles.modalActions, isDesktop ? desktopStyles.modalActions : mobileStyles.modalActions]}>
              <AppButton label="Volver a editar" onPress={() => setDialogStep("form")} variant="secondary" />
              <AppButton
                label="Confirmar alta"
                loading={createStudentMutation.isPending}
                onPress={handleConfirmCreate}
              />
            </View>
          </>
        ) : (
          <>
            {modalError ? <Text style={styles.modalError}>{modalError}</Text> : null}
            <AppCard style={styles.confirmCard}>
              <Text style={styles.confirmTitle}>¿Guardar cambios del alumno?</Text>
              <Text style={styles.confirmText}>
                Confirma si deseas actualizar a {selectedStudent?.first_name} {selectedStudent?.last_name} con los datos capturados.
              </Text>
            </AppCard>
            <View style={[styles.modalActions, isDesktop ? desktopStyles.modalActions : mobileStyles.modalActions]}>
              <AppButton label="Volver a editar" onPress={() => setDialogStep("form")} variant="secondary" />
              <AppButton
                label="Sí, guardar cambios"
                loading={updateStudentMutation.isPending}
                onPress={handleConfirmUpdate}
              />
            </View>
          </>
        )}
      </AppModal>

      <AppModal
        visible={Boolean(studentToDelete)}
        title="Confirmar baja"
        description="Esta acción hará una baja lógica y dejará al alumno como inactivo."
        onClose={() => setStudentToDelete(null)}
      >
        <AppCard style={styles.confirmCard}>
          <Text style={styles.confirmTitle}>¿Estás seguro?</Text>
          <Text style={styles.confirmText}>
            {studentToDelete
              ? `Vas a dar de baja a ${studentToDelete.first_name} ${studentToDelete.last_name}.`
              : "Selecciona un alumno para continuar."}
          </Text>
        </AppCard>
        <View style={[styles.modalActions, isDesktop ? desktopStyles.modalActions : mobileStyles.modalActions]}>
          <AppButton label="Cancelar" onPress={() => setStudentToDelete(null)} variant="secondary" />
          <AppButton
            label="Sí, dar de baja"
            loading={deleteStudentMutation.isPending}
            onPress={handleConfirmDelete}
            variant="danger"
          />
        </View>
      </AppModal>
    </Screen>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryRowLabel}>{label}</Text>
      <Text style={styles.summaryRowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    gap: spacing.md,
    width: "100%",
  },
  header: {
    gap: spacing.sm,
  },
  headerCopy: {
    gap: 4,
  },
  headerAction: {
    alignSelf: "flex-start",
  },
  headerActionsGroup: {
    gap: spacing.sm,
  },
  feedbackCard: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  feedbackSuccess: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },
  feedbackDanger: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  feedbackCopy: {
    flex: 1,
    gap: 4,
  },
  feedbackTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  feedbackDescription: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  topGrid: {
    gap: spacing.md,
  },
  searchCard: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
  },
  sectionDescription: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  summaryCard: {
    gap: spacing.md,
  },
  summaryItem: {
    flex: 1,
    gap: 4,
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  summaryValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  errorBlock: {
    flex: 1,
  },
  listContent: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  studentCard: {
    borderRadius: radius.lg,
    gap: spacing.md,
  },
  cardActions: {
    gap: spacing.sm,
  },
  studentTopRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  studentTitleBlock: {
    flex: 1,
    gap: 4,
  },
  studentName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
  },
  metaGrid: {
    gap: spacing.md,
  },
  metaItem: {
    flex: 1,
    gap: 4,
  },
  metaLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  studentMeta: {
    color: colors.textMuted,
    fontSize: 14,
  },
  studentMetaStrong: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  emptyDescription: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: "center",
  },
  modalError: {
    color: colors.danger,
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
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  formStepTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  formStepperTrack: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  formStepDot: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flex: 1,
    height: 8,
  },
  formStepDotActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  formStepDotCompleted: {
    backgroundColor: "#D1D5DB",
    borderColor: "#D1D5DB",
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
    gap: spacing.sm,
  },
  confirmTitle: {
    color: colors.text,
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
  header: {
    flexDirection: "column",
  },
  topGrid: {
    flexDirection: "column",
  },
  summaryCard: {
    flexDirection: "column",
  },
  metaGrid: {
    flexDirection: "column",
  },
  cardActions: {
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
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  topGrid: {
    alignItems: "stretch",
    flexDirection: "row",
  },
  summaryCard: {
    flex: 0.7,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaGrid: {
    flexDirection: "row",
  },
  cardActions: {
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
