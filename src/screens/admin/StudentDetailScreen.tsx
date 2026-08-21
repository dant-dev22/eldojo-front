import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useRef, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { branchesApi } from "@/api/branchesApi";
import { classesApi } from "@/api/classesApi";
import { getErrorMessage } from "@/api/http";
import { paymentsApi } from "@/api/paymentsApi";
import { studentsApi } from "@/api/studentsApi";
import { AppButton } from "@/components/AppButton";
import { AdminShell } from "@/components/AdminShell";
import { CredencialQRModal } from "@/components/CredencialQRModal";
import { PaymentsListModal } from "@/components/PaymentsListModal";
import { Screen } from "@/components/Screen";
import { StatusView } from "@/components/StatusView";
import { StudentEditForm, editableToPayload, studentToEditable, type EditableFields } from "@/components/StudentEditForm";
import { colors, spacing, typography } from "@/constants/theme";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { formatDate } from "@/utils/format";

import type { AdminStackParamList } from "@/navigation/types";
import type { StudentUpdatePayload } from "@/types/api";

type Props = NativeStackScreenProps<AdminStackParamList, "StudentDetail">;

const MIN_TOUCH_TARGET = 44;
const TOUCH_HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

const EDITABLE_FIELD_LABELS: Readonly<Partial<Record<keyof EditableFields, string>>> = {
  first_name: "Nombre",
  last_name: "Apellidos",
  birth_date: "Fecha de nacimiento",
  birth_place: "Lugar de nacimiento",
  height_cm: "Altura (cm)",
  enrollment_date: "Fecha de inscripción",
  branch_id: "Sucursal",
  primary_class_id: "Clase principal",
  monthly_fee: "Mensualidad",
  currency: "Moneda",
  next_payment_date: "Próxima fecha de pago",
  payment_status: "Estatus de pago",
  status: "Estatus del alumno",
  guardian_name: "Nombre del tutor(a)",
  guardian_phone: "Teléfono del tutor(a)",
  phone: "Teléfono",
  email: "Correo electrónico",
  is_minor: "¿Es menor de edad?",
  notes: "Notas generales",
  rd_victorias: "Victorias (record deportivo)",
  rd_empates: "Empates (record deportivo)",
  rd_derrotas: "Derrotas (record deportivo)",
};

export function StudentDetailScreen({ navigation, route }: Props) {
  const { isDesktop } = useResponsiveLayout();
  const { studentId } = route.params;
  const queryClient = useQueryClient();
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [paymentsModalVisible, setPaymentsModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [fields, setFields] = useState<EditableFields | null>(null);

  const studentQuery = useQuery({
    queryKey: ["student", studentId],
    queryFn: () => studentsApi.getById(studentId),
  });

  const paymentsQuery = useQuery({
    queryKey: ["payments", "student", studentId],
    queryFn: () => paymentsApi.list({ studentId }),
  });

  const branchesQuery = useQuery({
    queryKey: ["branches", "student-detail", studentQuery.data?.organization_id],
    queryFn: () =>
      branchesApi.list({
        organizationId: studentQuery.data?.organization_id,
        isActive: true,
      }),
    enabled: Boolean(studentQuery.data?.organization_id),
  });

  const classesQuery = useQuery({
    queryKey: [
      "classes",
      "student-detail",
      studentQuery.data?.organization_id,
      studentQuery.data?.branch_id,
    ],
    queryFn: () =>
      classesApi.list({
        organizationId: studentQuery.data?.organization_id,
        branchId: studentQuery.data?.branch_id,
        isActive: true,
      }),
    enabled: Boolean(studentQuery.data?.organization_id && studentQuery.data?.branch_id),
  });

  const student = studentQuery.data;
  const payments = paymentsQuery.data ?? [];
  const branches = branchesQuery.data ?? [];
  const classes = classesQuery.data ?? [];
  const branch = student ? branches.find((item) => item.id === student.branch_id) ?? null : null;
  const primaryClass = student
    ? classes.find((item) => item.id === student.primary_class_id) ?? null
    : null;

  const hasUnsavedChanges = useMemo(() => {
    if (!isEditing || !student || !fields) return false;
    const payload = editableToPayload(fields, student);
    return Object.keys(payload).length > 0;
  }, [isEditing, student, fields]);

  const handleRefresh = useCallback(() => {
    void studentQuery.refetch();
    void paymentsQuery.refetch();
    if (branchesQuery.isEnabled) {
      void branchesQuery.refetch();
    }
    if (classesQuery.isEnabled) {
      void classesQuery.refetch();
    }
  }, [studentQuery, paymentsQuery, branchesQuery, classesQuery]);

  const handleEnterEdit = useCallback(() => {
    if (!student) return;
    setFields(studentToEditable(student));
    setSubmitError(null);
    setIsEditing(true);
  }, [student]);

  const handleCancelEdit = useCallback(() => {
    if (!student) return;
    const payload = fields ? editableToPayload(fields, student) : {};
    const changedKeys = Object.keys(payload) as Array<keyof EditableFields>;

    if (changedKeys.length === 0) {
      setFields(studentToEditable(student));
      setSubmitError(null);
      setIsEditing(false);
      return;
    }

    const labels = changedKeys
      .map((key) => EDITABLE_FIELD_LABELS[key] ?? key)
      .filter(Boolean);
    const changedText =
      labels.length === 1
        ? `el campo "${labels[0]}" fue editado`
        : `los campos ${labels.slice(0, 3).map((l) => `"${l}"`).join(", ")}${labels.length > 3 ? ` y ${labels.length - 3} más` : ""} fueron editados`;

    Alert.alert(
      "¿Estás seguro de cancelar?",
      `Notamos que ${changedText} y los cambios no han sido guardados. Si cancelas ahora, perderás estas modificaciones.\n\n¿Deseas continuar?`,
      [
        {
          isPreferred: true,
          onPress: () => {},
          style: "default",
          text: "Seguir editando",
        },
        {
          onPress: () => {
            setFields(studentToEditable(student));
            setSubmitError(null);
            setIsEditing(false);
          },
          style: "destructive",
          text: "Descartar cambios",
        },
      ],
      { cancelable: true, onDismiss: () => {} },
    );
  }, [student, fields]);

  const handleFieldsChange = useCallback(<K extends keyof EditableFields>(key: K, value: EditableFields[K]) => {
    setFields((prev) => (prev ? { ...prev, [key]: value } : prev));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!student || !fields) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const payload = editableToPayload(fields, student);
      if (Object.keys(payload).length > 0) {
        await studentsApi.update(studentId, payload as StudentUpdatePayload);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["student", studentId] }),
          queryClient.invalidateQueries({ queryKey: ["students"] }),
          queryClient.invalidateQueries({ queryKey: ["payments", "student", studentId] }),
        ]);
      }
      setIsEditing(false);
      setFields(null);
    } catch (err) {
      setSubmitError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }, [student, fields, studentId, queryClient]);

  const handlePressPhoto = useCallback(() => {
    // TODO: Implementar cuando esté studentsApi.uploadPhoto
  }, []);

  const sidebarSummary = useMemo(() => ({
    organizationName: null,
    suffix: null,
    branchName: branch?.name ?? null,
    location: branch
      ? [branch.city, branch.state, branch.country].filter(Boolean).join(", ") || branch.address
      : null,
    mainSchedule: null,
  }), [branch]);

  if (studentQuery.isLoading) {
    return (
      <Screen contentStyle={styles.screenContent}>
        <AdminShell
          activeSection="students"
          headerQuickLinks={
            <HeaderTextLink
              icon={<Ionicons name="arrow-back-outline" size={14} color={colors.textMuted} />}
              label="Volver al listado"
              nativeID="screens-admin-student-detail-loading-back-link"
              onPress={() => navigation.goBack()}
              testID="screens-admin-student-detail-loading-back-link"
            />
          }
          onGoBranches={() => navigation.navigate("AdminHome", { section: "branches" })}
          onGoDashboard={() => navigation.navigate("AdminHome")}
          onGoDojo={() => navigation.navigate("AdminHome", { section: "dojo" })}
          onGoOperations={() => navigation.navigate("AdminHome", { section: "operations" })}
          onGoPayments={() => navigation.navigate("AdminHome", { section: "payments" })}
          onGoStudents={() => navigation.navigate("StudentsList")}
          onGoTrajectory={() => navigation.navigate("TrajectoryList")}
          onGoQrCodes={() => navigation.navigate("QrCodesList")}
          subtitle="Preparando la ficha principal y el historial financiero del alumno."
          title="Detalle de alumno"
        >
          <View nativeID="screens-admin-student-detail-loading-state" style={styles.loadingContainer} testID="screens-admin-student-detail-loading-state">
            <StatusView
              nativeID="screens-admin-student-detail-loading-status"
              title="Cargando detalle del alumno"
              description="Obteniendo la ficha principal y preparando el historial de pagos."
              loading
            />
          </View>
        </AdminShell>
      </Screen>
    );
  }

  if (studentQuery.isError || !student) {
    return (
      <Screen contentStyle={styles.screenContent}>
        <AdminShell
          activeSection="students"
          headerQuickLinks={
            <HeaderTextLink
              icon={<Ionicons name="arrow-back-outline" size={14} color={colors.textMuted} />}
              label="Volver al listado"
              nativeID="screens-admin-student-detail-error-back-link"
              onPress={() => navigation.goBack()}
              testID="screens-admin-student-detail-error-back-link"
            />
          }
          onGoBranches={() => navigation.navigate("AdminHome", { section: "branches" })}
          onGoDashboard={() => navigation.navigate("AdminHome")}
          onGoDojo={() => navigation.navigate("AdminHome", { section: "dojo" })}
          onGoOperations={() => navigation.navigate("AdminHome", { section: "operations" })}
          onGoPayments={() => navigation.navigate("AdminHome", { section: "payments" })}
          onGoStudents={() => navigation.navigate("StudentsList")}
          onGoTrajectory={() => navigation.navigate("TrajectoryList")}
          onGoQrCodes={() => navigation.navigate("QrCodesList")}
          subtitle="No fue posible cargar la informacion del alumno."
          title="Detalle de alumno"
        >
          <View nativeID="screens-admin-student-detail-error-state" style={styles.loadingContainer} testID="screens-admin-student-detail-error-state">
            <StatusView
              nativeID="screens-admin-student-detail-error-status"
              title="No pudimos cargar al alumno"
              description={getErrorMessage(studentQuery.error)}
            />
            <View nativeID="screens-admin-student-detail-error-actions" style={[styles.inlineActions, isDesktop ? desktopStyles.inlineActions : mobileStyles.inlineActions]} testID="screens-admin-student-detail-error-actions">
              <AppButton label="Volver" nativeID="screens-admin-student-detail-error-return-button" onPress={() => navigation.goBack()} testID="screens-admin-student-detail-error-return-button" variant="secondary" />
              <AppButton label="Reintentar" nativeID="screens-admin-student-detail-error-retry-button" onPress={() => studentQuery.refetch()} testID="screens-admin-student-detail-error-retry-button" />
            </View>
          </View>
        </AdminShell>
      </Screen>
    );
  }

  const studentName = `${student.first_name} ${student.last_name}`;

  return (
    <Screen
      contentStyle={styles.screenContentFlex}
      nativeID="screens-admin-student-detail-screen"
      testID="screens-admin-student-detail-screen"
    >
      <AdminShell
        activeSection="students"
        bodyNoSidePadding
        headerLeadingContent={
          <EditableStudentPhoto
            idPrefix="screens-admin-student-detail-photo"
            onPressChange={handlePressPhoto}
            photoInitials={`${student.first_name.charAt(0)}${student.last_name.charAt(0)}`}
            photoUrl={student.photo_url ?? null}
            studentFullName={studentName}
          />
        }
        headerQuickLinks={
          <>
            <HeaderTextLink
              icon={<Ionicons name="arrow-back-outline" size={14} color={colors.textMuted} />}
              label="Volver al listado"
              nativeID="screens-admin-student-detail-back-link"
              onPress={() => navigation.goBack()}
              testID="screens-admin-student-detail-back-link"
            />
            <HeaderTextLink
              icon={<Ionicons name="qr-code-outline" size={14} color={colors.gold} />}
              label="Ver QR"
              nativeID="screens-admin-student-detail-qr-link"
              onPress={() => setQrModalVisible(true)}
              testID="screens-admin-student-detail-qr-link"
            />
            {!isEditing ? (
              <HeaderTextLink
                emphasis
                icon={<Ionicons name="create-outline" size={14} color={colors.wood} />}
                label="Editar información"
                nativeID="screens-admin-student-detail-enter-edit-link"
                onPress={handleEnterEdit}
                testID="screens-admin-student-detail-enter-edit-link"
              />
            ) : (
              <>
                <HeaderTextLink
                  disabled={isSubmitting}
                  label="Cancelar"
                  nativeID="screens-admin-student-detail-cancel-link"
                  onPress={handleCancelEdit}
                  testID="screens-admin-student-detail-cancel-link"
                  tone="muted"
                />
                <HeaderTextLink
                  disabled={isSubmitting || !hasUnsavedChanges}
                  emphasis
                  icon={<Ionicons name="checkmark-circle" size={14} color={colors.wood} />}
                  label={isSubmitting ? "Guardando..." : "Guardar cambios"}
                  nativeID="screens-admin-student-detail-save-link"
                  onPress={() => { void handleSubmit(); }}
                  testID="screens-admin-student-detail-save-link"
                />
              </>
            )}
          </>
        }
        onGoBranches={() => navigation.navigate("AdminHome", { section: "branches" })}
        onGoDashboard={() => navigation.navigate("AdminHome")}
        onGoDojo={() => navigation.navigate("AdminHome", { section: "dojo" })}
        onGoOperations={() => navigation.navigate("AdminHome", { section: "operations" })}
        onGoPayments={() => navigation.navigate("AdminHome", { section: "payments" })}
        onGoStudents={() => navigation.navigate("StudentsList")}
        onGoTrajectory={() => navigation.navigate("TrajectoryList")}
        onGoQrCodes={() => navigation.navigate("QrCodesList")}
        sidebarSummary={sidebarSummary}
        subtitle={`Código ${student.unique_code}. ${isEditing ? "Editando la ficha general del alumno." : "Edita la ficha general del alumno y su historial financiero."}`}
        title={studentName}
      >
        <View nativeID="screens-admin-student-detail-content" style={styles.formContainer} testID="screens-admin-student-detail-content">
          {submitError ? (
            <View nativeID="screens-admin-student-detail-submit-error" style={styles.errorBanner} testID="screens-admin-student-detail-submit-error">
              <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
              <Text style={styles.errorBannerText}>{submitError}</Text>
            </View>
          ) : null}
          <StudentEditForm
            idPrefix="screens-admin-student-detail"
            isEditing={isEditing}
            isSubmitting={isSubmitting}
            student={student}
            payments={payments}
            branch={branch}
            primaryClass={primaryClass}
            branches={branches}
            classes={classes}
            fields={fields}
            onFieldChange={handleFieldsChange}
            onViewPayments={() => setPaymentsModalVisible(true)}
          />
        </View>
      </AdminShell>
      <CredencialQRModal
        visible={qrModalVisible}
        onClose={() => setQrModalVisible(false)}
        uniqueCode={student.unique_code}
        studentFullName={studentName}
        studentPhotoUrl={student.photo_url}
        branchName={branch?.name ?? null}
        enrollmentDateText={formatDate(student.enrollment_date)}
        organizationName={branch?.name ? null : sidebarSummary.organizationName}
        nativeID="screens-admin-student-detail-credential-modal"
        testID="screens-admin-student-detail-credential-modal"
      />
      <PaymentsListModal
        visible={paymentsModalVisible}
        onClose={() => setPaymentsModalVisible(false)}
        payments={payments}
        studentFullName={studentName}
        nativeID="screens-admin-student-detail-payments-modal"
        testID="screens-admin-student-detail-payments-modal"
      />
    </Screen>
  );
}

interface HeaderTextLinkProps {
  label: string;
  onPress: () => void;
  nativeID: string;
  testID: string;
  icon?: React.ReactNode;
  emphasis?: boolean;
  disabled?: boolean;
  tone?: "default" | "muted";
}

function HeaderTextLink({
  label,
  onPress,
  nativeID,
  testID,
  icon,
  emphasis = false,
  disabled = false,
  tone = "default",
}: HeaderTextLinkProps) {
  const labelStyle = useMemo(() => {
    if (disabled) {
      return [styles.headerLinkLabel, styles.headerLinkLabelDisabled];
    }
    if (emphasis) {
      return [styles.headerLinkLabel, styles.headerLinkLabelEmphasis];
    }
    if (tone === "muted") {
      return [styles.headerLinkLabel, styles.headerLinkLabelMuted];
    }
    return styles.headerLinkLabel;
  }, [emphasis, disabled, tone]);

  return (
    <Pressable
      accessibilityDisabled={disabled}
      accessibilityLabel={label}
      accessibilityRole="link"
      disabled={disabled}
      hitSlop={TOUCH_HIT_SLOP}
      nativeID={nativeID}
      onPress={onPress}
      style={({ hovered, pressed }) => [
        styles.headerLinkWrap,
        hovered ? styles.headerLinkWrapHovered : null,
        pressed ? styles.headerLinkWrapPressed : null,
        disabled ? styles.headerLinkWrapDisabled : null,
        { minHeight: MIN_TOUCH_TARGET },
      ]}
      testID={testID}
    >
      {icon ? <View style={styles.headerLinkIcon}>{icon}</View> : null}
      <Text style={labelStyle}>{label}</Text>
    </Pressable>
  );
}

interface EditableStudentPhotoProps {
  idPrefix: string;
  photoUrl: string | null;
  photoInitials: string;
  studentFullName: string;
  onPressChange: () => void;
}

function EditableStudentPhoto({
  idPrefix,
  photoUrl,
  photoInitials,
  studentFullName,
  onPressChange,
}: EditableStudentPhotoProps) {
  return (
    <Pressable
      accessibilityLabel={`Cambiar foto de perfil de ${studentFullName}`}
      accessibilityRole="button"
      hitSlop={TOUCH_HIT_SLOP}
      nativeID={`${idPrefix}-block`}
      onPress={onPressChange}
      style={({ hovered, pressed }) => [
        styles.photoBlock,
        hovered ? styles.photoBlockHovered : null,
        pressed ? styles.photoBlockPressed : null,
        { minHeight: MIN_TOUCH_TARGET, minWidth: MIN_TOUCH_TARGET },
      ]}
      testID={`${idPrefix}-block`}
    >
      {photoUrl ? (
        <Image
          accessibilityIgnoresInvertColors
          source={{ uri: photoUrl }}
          style={styles.photoImg}
          testID={`${idPrefix}-photo`}
        />
      ) : (
        <View style={styles.photoPlaceholder} testID={`${idPrefix}-photo-placeholder`}>
          <Text style={styles.photoInitials}>{photoInitials}</Text>
        </View>
      )}
      <View
        nativeID={`${idPrefix}-edit-dot`}
        style={styles.photoEditDot}
        testID={`${idPrefix}-edit-dot`}
      >
        <Ionicons name="camera-outline" size={11} color={colors.textOnPrimary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    flexGrow: 1,
  },
  screenContentFlex: {
    flex: 1,
  },
  formContainer: {
    flex: 1,
    width: "100%",
  },
  loadingContainer: {
    gap: spacing.lg,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.lg,
    width: "100%",
  },
  inlineActions: {
    gap: spacing.sm,
  },
  errorBanner: {
    alignItems: "center",
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
    borderRadius: spacing.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    marginHorizontal: spacing.sm,
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  errorBannerText: {
    color: colors.danger,
    flex: 1,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    fontWeight: "600",
  },
  headerLinkWrap: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  headerLinkWrapHovered: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: spacing.sm,
  },
  headerLinkWrapPressed: {
    backgroundColor: colors.borderStrong,
    borderRadius: spacing.sm,
    opacity: 0.9,
  },
  headerLinkWrapDisabled: {
    opacity: 0.45,
  },
  headerLinkIcon: {
    alignItems: "center",
    justifyContent: "center",
  },
  headerLinkLabel: {
    color: colors.wood,
    fontFamily: typography.headingFamily,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  headerLinkLabelEmphasis: {
    color: colors.text,
    fontWeight: "700",
  },
  headerLinkLabelMuted: {
    color: colors.textMuted,
    fontWeight: "500",
  },
  headerLinkLabelDisabled: {
    color: colors.textMuted,
  },
  photoBlock: {
    alignContent: "center",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: spacing.lg,
    flexDirection: "row",
    justifyContent: "center",
    padding: spacing.xs,
  },
  photoBlockHovered: {
    backgroundColor: colors.surfaceAlt,
  },
  photoBlockPressed: {
    backgroundColor: colors.woodSoft,
  },
  photoImg: {
    borderRadius: spacing["2xl"],
    borderColor: colors.borderStrong,
    borderWidth: 1,
    height: 56,
    width: 56,
  },
  photoPlaceholder: {
    alignItems: "center",
    backgroundColor: colors.woodSoft,
    borderRadius: spacing["2xl"],
    borderColor: colors.border,
    borderWidth: 1,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  photoInitials: {
    color: colors.woodStrong,
    fontFamily: typography.headingFamily,
    fontSize: 20,
    fontWeight: "800",
  },
  photoEditDot: {
    alignItems: "center",
    backgroundColor: colors.wood,
    borderColor: colors.surface,
    borderRadius: spacing["2xl"],
    borderWidth: 1.5,
    bottom: 2,
    height: 20,
    justifyContent: "center",
    position: "absolute",
    right: 2,
    width: 20,
  },
});

const mobileStyles = StyleSheet.create({
  inlineActions: {
    flexDirection: "column",
    width: "100%",
  },
});

const desktopStyles = StyleSheet.create({
  inlineActions: {
    flexDirection: "row",
  },
});
