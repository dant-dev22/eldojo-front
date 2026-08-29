import { Feather } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { attendanceApi } from "@/api/attendanceApi";
import { branchesApi } from "@/api/branchesApi";
import { classesApi } from "@/api/classesApi";
import { studentsApi } from "@/api/studentsApi";
import { getErrorMessage } from "@/api/http";
import { AppBadge } from "@/components/AppBadge";
import { AppButton } from "@/components/AppButton";
import { AppCard } from "@/components/AppCard";
import { AppInput } from "@/components/AppInput";
import { AdminShell } from "@/components/AdminShell";
import { BeltIndicator } from "@/components/BeltIndicator";
import { BottomSheet, type BottomSheetAction } from "@/components/BottomSheet";
import { CredencialQRModal } from "@/components/CredencialQRModal";
import { QrScanner } from "@/components/QrScanner";
import { SkeletonList } from "@/components/SkeletonLoader";
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
import { formatDate, formatPaymentStatus } from "@/utils/format";

import type { AdminStackParamList } from "@/navigation/types";
import type { Student } from "@/types/api";

type Props = NativeStackScreenProps<AdminStackParamList, "QrCodesList">;

const STUDENTS_PER_PAGE = 10;

function getPaymentTone(status: string): "success" | "warning" | "danger" | "neutral" {
  switch (status) {
    case "up_to_date":
      return "success";
    case "partial":
    case "due_soon":
      return "warning";
    case "late":
    case "overdue":
    case "waived":
      return "danger";
    default:
      return "neutral";
  }
}

export function QrCodesListScreen({ navigation }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { isDesktop, isMobile } = useResponsiveLayout();
  const { status: cameraStatus, isEnabled: qrScannerEnabled } = useCameraAvailability();

  const currentAssignment = user?.admin_assignments[0] ?? null;
  const organizationId = currentAssignment?.organization_id ?? null;
  const fixedBranchId = currentAssignment?.branch_id ?? null;

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const [currentPage, setCurrentPage] = useState(1);

  const [showContextSheet, setShowContextSheet] = useState(false);
  const [contextSheetStudent, setContextSheetStudent] = useState<Student | null>(null);

  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrStudent, setQrStudent] = useState<Student | null>(null);

  const [scannerVisible, setScannerVisible] = useState(false);
  const [attendanceFeedback, setAttendanceFeedback] = useState<{ tone: "success" | "danger"; message: string } | null>(null);

  useEffect(() => {
    if (!attendanceFeedback) return;
    const timeoutId = setTimeout(() => setAttendanceFeedback(null), 3500);
    return () => clearTimeout(timeoutId);
  }, [attendanceFeedback]);

  const classesQuery = useQuery({
    queryKey: ["dashboard-classes", organizationId, fixedBranchId],
    queryFn: () =>
      classesApi.list({
        organizationId: organizationId as number,
        branchId: fixedBranchId ?? undefined,
      }),
    enabled: Boolean(organizationId),
  });

  const branchesQuery = useQuery({
    queryKey: ["branches", organizationId],
    queryFn: () => branchesApi.list({ organizationId: organizationId ?? undefined, isActive: true }),
    enabled: Boolean(organizationId),
  });

  const studentsQuery = useQuery({
    queryKey: ["students", debouncedSearch],
    queryFn: () => studentsApi.list({ search: debouncedSearch.trim() || undefined }),
  });

  const invalidateQueries = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["dashboard-attendance"] }),
      queryClient.invalidateQueries({ queryKey: ["students"] }),
    ]);
  }, [queryClient]);

  const createAttendanceMutation = useMutation({
    mutationFn: (payload: Parameters<typeof attendanceApi.create>[0]) => attendanceApi.create(payload),
    onSuccess: async () => {
      await invalidateQueries();
      setAttendanceFeedback({ tone: "success", message: "Asistencia registrada correctamente." });
    },
    onError: (error) => {
      setAttendanceFeedback({ tone: "danger", message: getErrorMessage(error) });
    },
  });

  const handleQrCodeScanned = useCallback(
    async (code: string) => {
      const normalizedCode = code.trim().toUpperCase();
      if (!normalizedCode) return;
      setScannerVisible(false);

      try {
        const students = await studentsApi.list({ search: normalizedCode });
        const matchedStudent = students.find(
          (s) => s.unique_code.toUpperCase() === normalizedCode
        );
        if (!matchedStudent) {
          setAttendanceFeedback({ tone: "danger", message: `No se encontró alumno con código ${normalizedCode}.` });
          return;
        }

        const now = new Date();
        const branchId = matchedStudent.branch_id || fixedBranchId || (branchesQuery.data?.[0]?.id as number | undefined);
        if (!branchId) {
          setAttendanceFeedback({ tone: "danger", message: "No se pudo determinar la sucursal para registrar la asistencia." });
          return;
        }

        const classId = matchedStudent.primary_class_id ||
          classesQuery.data?.find((c) => c.branch_id === branchId && c.is_active)?.id ||
          null;

        const hh = String(now.getHours()).padStart(2, "0");
        const mm = String(now.getMinutes()).padStart(2, "0");
        const isoDate = now.toISOString().slice(0, 10);

        createAttendanceMutation.mutate({
          student_id: matchedStudent.id,
          branch_id: branchId,
          class_id: classId,
          check_in_at: `${isoDate}T${hh}:${mm}:00`,
          method: "qr",
          registered_by: user?.id ?? null,
        });
      } catch (err) {
        setAttendanceFeedback({ tone: "danger", message: getErrorMessage(err) });
      }
    },
    [branchesQuery.data, classesQuery.data, createAttendanceMutation, fixedBranchId, user?.id]
  );

  const students = useMemo(() => studentsQuery.data ?? [], [studentsQuery.data]);
  const branches = branchesQuery.data ?? [];
  const sidebarBranch = branches.find((branch) => branch.id === fixedBranchId) ?? branches[0] ?? null;
  const qrModalBranch = sidebarBranch;

  const sidebarSummary = useMemo(
    () => ({
      organizationName: null,
      suffix: null,
      branchName: sidebarBranch?.name ?? null,
      location: sidebarBranch
        ? [sidebarBranch.city, sidebarBranch.state].filter(Boolean).join(", ") || null
        : null,
      mainSchedule: null,
    }),
    [sidebarBranch],
  );

  const hasActiveSearch = debouncedSearch.trim().length > 0;
  const foundStudentsLabel = useMemo(
    () =>
      students.length === 1
        ? `${students.length} alumno`
        : `${students.length} alumnos`,
    [students.length],
  );
  const totalPages = Math.max(1, Math.ceil(students.length / STUDENTS_PER_PAGE));
  const currentPageStart = students.length === 0 ? 0 : (currentPage - 1) * STUDENTS_PER_PAGE + 1;
  const currentPageEnd = Math.min(currentPage * STUDENTS_PER_PAGE, students.length);
  const paginatedStudents = useMemo(
    () =>
      students.slice(
        (currentPage - 1) * STUDENTS_PER_PAGE,
        currentPage * STUDENTS_PER_PAGE,
      ),
    [currentPage, students],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, students.length]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const contextActions = useMemo<BottomSheetAction[]>(
    () => {
      if (!contextSheetStudent) return [];
      return [
        {
          key: "view-qr",
          label: "Ver código QR",
          icon: "camera",
          onPress: () => {
            setShowContextSheet(false);
            setQrStudent(contextSheetStudent);
            setQrModalVisible(true);
          },
        },
      ];
    },
    [contextSheetStudent],
  );

  function onContext(student: Student) {
    setContextSheetStudent(student);
    setShowContextSheet(true);
  }

  function renderDesktopRow(student: Student) {
    return (
      <View
        key={student.id}
        nativeID={`screens-admin-qr-codes-list-row-${student.id}`}
        style={[styles.tableRow]}
        testID={`screens-admin-qr-codes-list-row-${student.id}`}
      >
        <View nativeID={`screens-admin-qr-codes-list-row-name-${student.id}`} style={[styles.tableCell, styles.nameColumn]} testID={`screens-admin-qr-codes-list-row-name-${student.id}`}>
          <View nativeID={`screens-admin-qr-codes-list-row-name-main-${student.id}`} style={styles.nameMainBlock} testID={`screens-admin-qr-codes-list-row-name-main-${student.id}`}>
            <Text
              nativeID={`screens-admin-qr-codes-list-row-name-label-${student.id}`}
              style={styles.namePrimary}
              testID={`screens-admin-qr-codes-list-row-name-label-${student.id}`}
            >
              {`${student.first_name} ${student.last_name}`}
            </Text>
            <Text
              nativeID={`screens-admin-qr-codes-list-row-name-secondary-${student.id}`}
              style={styles.nameSecondary}
              testID={`screens-admin-qr-codes-list-row-name-secondary-${student.id}`}
            >
              {student.unique_code}
            </Text>
          </View>
        </View>

        <View nativeID={`screens-admin-qr-codes-list-row-belt-${student.id}`} style={[styles.tableCell, styles.beltColumn]} testID={`screens-admin-qr-codes-list-row-belt-${student.id}`}>
          {student.current_belt_level || student.current_stripe ? (
            <BeltIndicator
              beltLevel={student.current_belt_level}
              size="xs"
              stripe={student.current_stripe}
              testID={`screens-admin-qr-codes-list-row-belt-indicator-${student.id}`}
            />
          ) : (
            <Text style={styles.placeholderCell}>Sin cinta</Text>
          )}
        </View>

        <View nativeID={`screens-admin-qr-codes-list-row-enrollment-${student.id}`} style={[styles.tableCell, styles.dateColumn]} testID={`screens-admin-qr-codes-list-row-enrollment-${student.id}`}>
          <Text style={styles.datePrimary}>{formatDate(student.enrollment_date)}</Text>
        </View>

        <View nativeID={`screens-admin-qr-codes-list-row-payment-${student.id}`} style={[styles.tableCell, styles.paymentColumn]} testID={`screens-admin-qr-codes-list-row-payment-${student.id}`}>
          <AppBadge
            label={formatPaymentStatus(student.payment_status)}
            nativeID={`screens-admin-qr-codes-list-row-payment-badge-${student.id}`}
            testID={`screens-admin-qr-codes-list-row-payment-badge-${student.id}`}
            tone={getPaymentTone(student.payment_status)}
          />
        </View>

        <View nativeID={`screens-admin-qr-codes-list-row-actions-${student.id}`} style={[styles.tableCell, styles.actionsColumn, styles.tableActions]} testID={`screens-admin-qr-codes-list-row-actions-${student.id}`}>
          <Pressable
            accessibilityLabel="Acciones del alumno"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => onContext(student)}
            nativeID={`screens-admin-qr-codes-list-row-context-button-${student.id}`}
            testID={`screens-admin-qr-codes-list-row-context-button-${student.id}`}
            style={(state) => {
              const hovered = (state as typeof state & { hovered?: boolean }).hovered;
              return [
                styles.rowContextMenuButton,
                hovered ? styles.rowContextMenuButtonHovered : null,
                state.pressed ? styles.rowContextMenuButtonPressed : null,
              ];
            }}
          >
            <Feather color={colors.text} name="more-vertical" size={18} />
          </Pressable>
        </View>
      </View>
    );
  }

  function renderMobileRow(student: Student) {
    return (
      <AppCard
        key={student.id}
        nativeID={`screens-admin-qr-codes-list-mobile-row-${student.id}`}
        style={styles.mobileRowCard}
        testID={`screens-admin-qr-codes-list-mobile-row-${student.id}`}
      >
        <View style={[styles.mobileRowHeader, isDesktop ? desktopStyles.mobileRowHeader : mobileStyles.mobileRowHeader]}>
          <View style={styles.mobileRowIdentityBlock}>
            <Text
              nativeID={`screens-admin-qr-codes-list-mobile-row-name-${student.id}`}
              style={styles.mobileRowName}
              testID={`screens-admin-qr-codes-list-mobile-row-name-${student.id}`}
            >
              {`${student.first_name} ${student.last_name}`}
            </Text>
            <Text
              nativeID={`screens-admin-qr-codes-list-mobile-row-code-${student.id}`}
              style={styles.mobileRowCode}
              testID={`screens-admin-qr-codes-list-mobile-row-code-${student.id}`}
            >
              {student.unique_code}
            </Text>
          </View>

          <View style={styles.mobileRowActions}>
            <Pressable
              accessibilityLabel="Acciones del alumno"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => onContext(student)}
              nativeID={`screens-admin-qr-codes-list-mobile-context-button-${student.id}`}
              testID={`screens-admin-qr-codes-list-mobile-context-button-${student.id}`}
              style={(state) => {
                const hovered = (state as typeof state & { hovered?: boolean }).hovered;
                return [
                  styles.mobileContextButton,
                  hovered ? styles.mobileContextButtonHovered : null,
                  state.pressed ? styles.mobileContextButtonPressed : null,
                ];
              }}
            >
              <Feather color={colors.text} name="more-horizontal" size={20} />
            </Pressable>
          </View>
        </View>

        <View style={[styles.mobileRowMeta, isDesktop ? desktopStyles.mobileRowMeta : mobileStyles.mobileRowMeta]}>
          <View style={styles.mobileRowMetaLeft}>
            {student.current_belt_level || student.current_stripe ? (
              <BeltIndicator
                beltLevel={student.current_belt_level}
                size="sm"
                stripe={student.current_stripe}
                testID={`screens-admin-qr-codes-list-mobile-row-belt-${student.id}`}
              />
            ) : (
              <Text style={styles.placeholderCell}>Sin cinta</Text>
            )}
          </View>
          <View style={styles.mobileRowMetaRight}>
            <AppBadge
              label={formatPaymentStatus(student.payment_status)}
              nativeID={`screens-admin-qr-codes-list-mobile-row-payment-badge-${student.id}`}
              testID={`screens-admin-qr-codes-list-mobile-row-payment-badge-${student.id}`}
              tone={getPaymentTone(student.payment_status)}
            />
          </View>
        </View>
      </AppCard>
    );
  }

  const qrHeaderMainContent = !studentsQuery.isLoading && !studentsQuery.isError ? (
    <View nativeID="screens-admin-qr-codes-list-header-main-content" style={styles.headerMainContent} testID="screens-admin-qr-codes-list-header-main-content">
      {attendanceFeedback ? (
        <View
          nativeID="screens-admin-qr-codes-list-attendance-feedback"
          style={[
            styles.feedbackBanner,
            attendanceFeedback.tone === "success"
              ? { backgroundColor: matchaGreenSoft, borderColor: "rgba(85,139,47,0.25)" }
              : { backgroundColor: judogiRedSoft, borderColor: "rgba(198,40,40,0.25)" },
          ]}
          testID="screens-admin-qr-codes-list-attendance-feedback"
        >
          <Feather
            name={attendanceFeedback.tone === "success" ? "check-circle" : "alert-triangle"}
            size={16}
            color={attendanceFeedback.tone === "success" ? matchaGreen : judogiRed}
          />
          <Text
            style={[
              styles.feedbackText,
              { color: attendanceFeedback.tone === "success" ? matchaGreen : judogiRed },
            ]}
          >
            {attendanceFeedback.message}
          </Text>
        </View>
      ) : null}
      <View
        nativeID="screens-admin-qr-codes-list-scan-action-row"
        style={[styles.qrScanActionRow, isDesktop ? desktopStyles.qrScanActionRow : mobileStyles.qrScanActionRow]}
        testID="screens-admin-qr-codes-list-scan-action-row"
      >
        <Pressable
          accessibilityRole="button"
          disabled={isDesktop || !qrScannerEnabled || createAttendanceMutation.isPending}
          nativeID="screens-admin-qr-codes-list-scan-attendance-button"
          onPress={() => {
            setAttendanceFeedback(null);
            setScannerVisible(true);
          }}
          style={(state) => {
            const hovered = (state as unknown as { hovered?: boolean }).hovered;
            const disabled = isDesktop || !qrScannerEnabled || createAttendanceMutation.isPending;
            const hoverState = Boolean(hovered) || Boolean(state.pressed);
            return [
              styles.qrScanButton,
              disabled ? styles.qrScanButtonDisabled : null,
              hoverState && !disabled ? styles.qrScanButtonHover : null,
            ];
          }}
          testID="screens-admin-qr-codes-list-scan-attendance-button"
        >
          <View style={styles.qrScanIconFrame}>
            <Feather name="maximize-2" size={20} color={isDesktop ? colors.textMuted : colors.surface} />
          </View>
          <View style={styles.qrScanCopy}>
            <Text style={[styles.qrScanLabel, isDesktop ? { color: colors.textMuted } : null]}>
              Escanear QR
            </Text>
            <Text style={styles.qrScanHint}>
              {isDesktop
                ? "Solo disponible en celular-tablet"
                : cameraStatus === "checking"
                  ? "Verificando cámara…"
                  : !qrScannerEnabled
                    ? "Dispositivo sin cámara"
                    : "Registro rápido por QR · 1 paso"}
            </Text>
          </View>
        </Pressable>
      </View>
      <View nativeID="screens-admin-qr-codes-list-search-row" style={[styles.searchRowCompact, isDesktop ? desktopStyles.searchRowCompact : mobileStyles.searchRowCompact]} testID="screens-admin-qr-codes-list-search-row">
        <View nativeID="screens-admin-qr-codes-list-search-input-wrap" style={styles.searchInputWrap} testID="screens-admin-qr-codes-list-search-input-wrap">
          <AppInput
            label="Buscar por nombre, apellido o código"
            nativeID="screens-admin-qr-codes-list-search-input"
            onChangeText={setSearch}
            placeholder="Ej: María López, ABC123"
            rightAdornment={<Feather color={colors.textMuted} name="search" size={16} />}
            style={styles.compactSearchInput}
            testID="screens-admin-qr-codes-list-search-input"
            value={search}
          />
        </View>
        {search.trim() ? (
          <AppButton
            label="Limpiar"
            nativeID="screens-admin-qr-codes-list-clear-search-button"
            onPress={() => setSearch("")}
            testID="screens-admin-qr-codes-list-clear-search-button"
            variant="secondary"
          />
        ) : null}
      </View>
      {students.length > 0 ? (
        <Text nativeID="screens-admin-qr-codes-list-results-meta" style={styles.resultsMetaCompact} testID="screens-admin-qr-codes-list-results-meta">
          mostrando {currentPageStart}-{currentPageEnd} de {students.length} alumnos en total
        </Text>
      ) : null}
      <AppCard nativeID="screens-admin-qr-codes-list-results-panel" style={styles.resultsPanel} testID="screens-admin-qr-codes-list-results-panel">
        {students.length > 0 ? (
          <View nativeID="screens-admin-qr-codes-list-table" style={styles.table} testID="screens-admin-qr-codes-list-table">
            {isDesktop ? (
              <View nativeID="screens-admin-qr-codes-list-desktop-table" style={styles.tableHead} testID="screens-admin-qr-codes-list-desktop-table">
                <Text nativeID="screens-admin-qr-codes-list-table-head-student" style={[styles.tableHeadCell, styles.nameColumn]} testID="screens-admin-qr-codes-list-table-head-student">Alumno</Text>
                <Text nativeID="screens-admin-qr-codes-list-table-head-belt" style={[styles.tableHeadCell, styles.beltColumn]} testID="screens-admin-qr-codes-list-table-head-belt">Cinta</Text>
                <Text nativeID="screens-admin-qr-codes-list-table-head-enrollment" style={[styles.tableHeadCell, styles.dateColumn]} testID="screens-admin-qr-codes-list-table-head-enrollment">Alta</Text>
                <Text nativeID="screens-admin-qr-codes-list-table-head-payment" style={[styles.tableHeadCell, styles.paymentColumn]} testID="screens-admin-qr-codes-list-table-head-payment">Pago</Text>
                <Text nativeID="screens-admin-qr-codes-list-table-head-actions" style={[styles.tableHeadCell, styles.actionsColumn]} testID="screens-admin-qr-codes-list-table-head-actions">Acciones</Text>
              </View>
            ) : null}

            <ScrollView
              contentContainerStyle={styles.tableBody}
              nativeID="screens-admin-qr-codes-list-table-scroll"
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
              style={[styles.tableScroll, isDesktop ? desktopStyles.tableScroll : mobileStyles.tableScroll]}
              testID="screens-admin-qr-codes-list-table-scroll"
            >
              {isDesktop
                ? paginatedStudents.map((student) => renderDesktopRow(student))
                : paginatedStudents.map((student) => renderMobileRow(student))}
            </ScrollView>

            {totalPages > 1 ? (
              <View nativeID="screens-admin-qr-codes-list-pagination" style={[styles.pagination, isDesktop ? desktopStyles.pagination : mobileStyles.pagination]} testID="screens-admin-qr-codes-list-pagination">
                <AppButton
                  disabled={currentPage === 1}
                  label="Anterior"
                  nativeID="screens-admin-qr-codes-list-pagination-prev-button"
                  onPress={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  testID="screens-admin-qr-codes-list-pagination-prev-button"
                  variant="secondary"
                />
                <Text nativeID="screens-admin-qr-codes-list-pagination-label" style={styles.paginationLabel} testID="screens-admin-qr-codes-list-pagination-label">
                  Página {currentPage} de {totalPages}
                </Text>
                <AppButton
                  disabled={currentPage === totalPages}
                  label="Siguiente"
                  nativeID="screens-admin-qr-codes-list-pagination-next-button"
                  onPress={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  testID="screens-admin-qr-codes-list-pagination-next-button"
                  variant="secondary"
                />
              </View>
            ) : null}
          </View>
        ) : (
          <View nativeID="screens-admin-qr-codes-list-empty-state" style={styles.emptyState} testID="screens-admin-qr-codes-list-empty-state">
            <Text nativeID="screens-admin-qr-codes-list-empty-title" style={styles.emptyTitle} testID="screens-admin-qr-codes-list-empty-title">No hay alumnos para mostrar</Text>
            <Text nativeID="screens-admin-qr-codes-list-empty-description" style={styles.emptyDescription} testID="screens-admin-qr-codes-list-empty-description">
              {hasActiveSearch
                ? "Prueba con otro nombre o limpia la búsqueda para ver más resultados."
                : "Aún no hay alumnos disponibles. Agrega alumnos desde la sección Alumnos."}
            </Text>
          </View>
        )}
      </AppCard>
    </View>
  ) : null;

  return (
    <Screen
      contentStyle={styles.screenContent}
      nativeID="screens-admin-qr-codes-list-screen"
      scrollable
      testID="screens-admin-qr-codes-list-screen"
    >
      <AdminShell
        activeSection="qr-codes"
        headerBottomContent={null}
        headerMainContent={qrHeaderMainContent}
        onGoBranches={() => navigation.navigate("AdminHome", { section: "branches" })}
        onGoDashboard={() => navigation.navigate("AdminHome")}
        onGoDojo={() => navigation.navigate("AdminHome", { section: "dojo" })}
        onGoOperations={() => navigation.navigate("AdminHome", { section: "operations" })}
        onGoPayments={() => navigation.navigate("AdminHome", { section: "payments" })}
        onGoQrCodes={() => navigation.navigate("QrCodesList")}
        onGoStudents={() => navigation.navigate("StudentsList")}
        onGoTrajectory={() => navigation.navigate("TrajectoryList")}
        sidebarSummary={sidebarSummary}
        subtitle="credenciales QR de alumnos para asistencia e identificación"
        title="Códigos QR"
      >
        <View nativeID="screens-admin-qr-codes-list-content" style={styles.container} testID="screens-admin-qr-codes-list-content">
          {studentsQuery.isLoading ? (
            <AppCard nativeID="screens-admin-qr-codes-list-skeleton-card" style={styles.resultsPanel} testID="screens-admin-qr-codes-list-skeleton-card">
              <SkeletonList count={6} idPrefix="screens-admin-qr-codes-list-skeleton" />
            </AppCard>
          ) : studentsQuery.isError ? (
            <View nativeID="screens-admin-qr-codes-list-error-block" style={styles.errorBlock} testID="screens-admin-qr-codes-list-error-block">
              <StatusView
                nativeID="screens-admin-qr-codes-list-error-status"
                title="No pudimos cargar el listado"
                description={getErrorMessage(studentsQuery.error)}
                testID="screens-admin-qr-codes-list-error-status"
              />
            </View>
          ) : null}
        </View>
      </AdminShell>

      <BottomSheet
        actions={contextActions}
        description={`Acciones para ${contextSheetStudent ? `${contextSheetStudent.first_name} ${contextSheetStudent.last_name}` : "el alumno"}`}
        idPrefix="admin-qr-codes-context"
        onClose={() => setShowContextSheet(false)}
        visible={showContextSheet}
      />

      {qrStudent ? (
        <CredencialQRModal
          visible={qrModalVisible}
          onClose={() => setQrModalVisible(false)}
          uniqueCode={qrStudent.unique_code}
          studentFullName={`${qrStudent.first_name} ${qrStudent.last_name}`}
          studentPhotoUrl={qrStudent.photo_url}
          branchName={qrModalBranch?.name ?? null}
          enrollmentDateText={formatDate(qrStudent.enrollment_date)}
          organizationName={qrModalBranch?.name ? null : sidebarSummary.organizationName}
          nativeID="screens-admin-qr-codes-list-credential-modal"
          testID="screens-admin-qr-codes-list-credential-modal"
        />
      ) : null}

      <QrScanner
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onCodeScanned={handleQrCodeScanned}
        title="Escanear credencial"
        description="Apunta la cámara al código QR del alumno para registrar su asistencia."
        nativeID="screens-admin-qr-codes-list-qr-scanner"
        testID="screens-admin-qr-codes-list-qr-scanner"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    flexGrow: 1,
    width: "100%",
  },
  container: {
    alignSelf: "center",
    gap: spacing.lg,
    width: "100%",
  },
  headerMainContent: {
    alignItems: "flex-start",
    flexDirection: "column",
    gap: spacing.md,
    justifyContent: "space-between",
    width: "100%",
  },
  searchRowCompact: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    width: "100%",
  },
  searchInputWrap: {
    flex: 1,
    minWidth: 0,
    width: "100%",
  },
  compactSearchInput: {
    fontSize: 13,
    minHeight: 40,
    paddingHorizontal: spacing.sm,
  },
  resultsMetaCompact: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 18,
  },
  resultsPanel: {
    gap: spacing.md,
    overflow: "hidden",
    padding: 0,
  },
  errorBlock: {
    width: "100%",
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
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    paddingRight: spacing.sm,
    textTransform: "uppercase",
  },
  tableScroll: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    width: "100%",
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
    width: "100%",
  },
  tableCell: {
    alignItems: "flex-start",
    justifyContent: "center",
    minWidth: 0,
    paddingRight: spacing.sm,
  },
  nameColumn: { flex: 5, minWidth: 160 },
  beltColumn: { flex: 2.5, minWidth: 100 },
  dateColumn: { flex: 2.5, minWidth: 100 },
  paymentColumn: { flex: 2.5, minWidth: 110 },
  actionsColumn: {
    flex: 1,
    minWidth: 80,
    paddingRight: 0,
  },
  tableActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "flex-end",
  },
  nameMainBlock: {
    flexDirection: "column",
    gap: 2,
  },
  namePrimary: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 15,
    fontWeight: "700",
  },
  nameSecondary: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
    lineHeight: 16,
  },
  datePrimary: {
    color: colors.text,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 18,
  },
  placeholderCell: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 18,
  },
  rowContextMenuButton: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderColor: "transparent",
    borderRadius: radius.md,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    minWidth: 44,
    width: 44,
  },
  rowContextMenuButtonHovered: {
    backgroundColor: colors.hover,
    borderColor: colors.border,
  },
  rowContextMenuButtonPressed: {
    backgroundColor: colors.surfaceAlt,
    opacity: 0.9,
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
    maxWidth: 420,
    textAlign: "center",
  },
  mobileListWrap: {
    flexDirection: "column",
    gap: spacing.sm,
    justifyContent: "flex-start",
    width: "100%",
  },
  mobileRowCard: {
    padding: spacing.md,
  },
  mobileRowHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    width: "100%",
  },
  mobileRowIdentityBlock: {
    flex: 1,
    flexDirection: "column",
    gap: 4,
    minWidth: 0,
  },
  mobileRowName: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.15,
  },
  mobileRowCode: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
    lineHeight: 16,
  },
  mobileRowActions: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.xs,
    marginLeft: spacing.xs,
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
    backgroundColor: colors.hover,
  },
  mobileContextButtonPressed: {
    backgroundColor: colors.surfaceAlt,
    opacity: 0.85,
  },
  mobileRowMeta: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    marginTop: spacing.md,
    width: "100%",
  },
  mobileRowMetaLeft: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  mobileRowMetaRight: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "flex-end",
  },
  feedbackBanner: {
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    width: "100%",
  },
  feedbackText: {
    flex: 1,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  qrScanActionRow: {
    alignItems: "flex-start",
    width: "100%",
  },
  qrScanButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: indigo,
    borderRadius: radius.lg,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  qrScanButtonDisabled: {
    backgroundColor: colors.surfaceAlt,
    opacity: 0.9,
  },
  qrScanButtonHover: {
    backgroundColor: "#232D87",
    transform: [{ translateY: -1 }],
  },
  qrScanIconFrame: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: radius.md,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  qrScanCopy: {
    alignItems: "flex-start",
    justifyContent: "center",
  },
  qrScanLabel: {
    color: colors.surface,
    fontFamily: typography.bodyFamily,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  qrScanHint: {
    color: "rgba(255,255,255,0.72)",
    fontFamily: typography.bodyFamily,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
});

const desktopStyles = StyleSheet.create({
  searchRowCompact: {
    alignItems: "center",
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  tableScroll: {
    maxHeight: 640,
  },
  mobileRowHeader: {
    alignItems: "center",
  },
  mobileRowMeta: {
    alignItems: "center",
  },
  qrScanActionRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "flex-end",
  },
});

const mobileStyles = StyleSheet.create({
  searchRowCompact: {
    flexDirection: "column",
  },
  pagination: {
    flexDirection: "column",
  },
  tableScroll: {
    maxHeight: "100%",
  },
  mobileRowHeader: {
    alignItems: "flex-start",
  },
  mobileRowMeta: {
    alignItems: "flex-start",
  },
  qrScanActionRow: {
    alignItems: "stretch",
    flexDirection: "column",
    justifyContent: "flex-start",
  },
});
