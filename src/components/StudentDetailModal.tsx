import { useQueryClient, useQueries, useQuery } from "@tanstack/react-query";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { attendanceApi, ATTENDANCE_HISTORY_PAGE_SIZE } from "@/api/attendanceApi";
import { branchesApi } from "@/api/branchesApi";
import { classesApi } from "@/api/classesApi";
import { getErrorMessage } from "@/api/http";
import { paymentsApi } from "@/api/paymentsApi";
import { studentsApi } from "@/api/studentsApi";
import { AppModal } from "@/components/AppModal";
import { AttendanceSectionView } from "@/components/AttendanceSectionView";
import { StudentDetailView } from "@/components/StudentDetailView";
import { colors, radius, spacing, typography } from "@/constants/theme";

import type { Attendance, Student } from "@/types/api";

const MIN_TOUCH_TARGET = 44;
const TOUCH_HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

interface StudentDetailModalProps {
  visible: boolean;
  studentId: number | null;
  onClose: () => void;
  onQrPress?: (student: Student) => void;
  onEdit?: (student: Student) => void;
}

export function StudentDetailModal({ visible, studentId, onClose, onQrPress, onEdit }: StudentDetailModalProps) {
  const queryClient = useQueryClient();

  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);

  const hasActiveFilters = Boolean(selectedClassId || dateFrom || dateTo);

  const attendanceFilterKey = useMemo(
    () =>
      `${selectedClassId ?? ""}__${dateFrom ?? ""}__${dateTo ?? ""}`,
    [selectedClassId, dateFrom, dateTo],
  );

  useEffect(() => {
    setSelectedClassId(null);
    setDateFrom(null);
    setDateTo(null);
  }, [visible, studentId]);

  const studentQuery = useQuery({
    queryKey: ["student", "modal", studentId],
    queryFn: () => (studentId ? studentsApi.getById(studentId) : Promise.reject(new Error("No student id"))),
    enabled: Boolean(studentId) && visible,
  });

  const paymentsQuery = useQuery({
    queryKey: ["payments", "modal", "student", studentId],
    queryFn: () => (studentId ? paymentsApi.list({ studentId }) : Promise.reject(new Error("No student id"))),
    enabled: Boolean(studentId) && visible,
  });

  const attendanceQueries = useQueries({
    queries: [
      {
        queryKey: ["students", "attendance-summary", studentId, selectedClassId, dateFrom, dateTo],
        queryFn: () =>
          studentId
            ? attendanceApi.getSummary(studentId, {
                classId: selectedClassId ? Number(selectedClassId) : undefined,
                dateFrom: dateFrom ?? undefined,
                dateTo: dateTo ?? undefined,
              })
            : Promise.reject(new Error("No student id")),
        enabled: Boolean(studentId) && visible,
        staleTime: 60_000,
      },
      {
        queryKey: ["attendance", "modal", "student", studentId, attendanceFilterKey],
        queryFn: () =>
          studentId
            ? attendanceApi.getByStudent({
                studentId,
                limit: ATTENDANCE_HISTORY_PAGE_SIZE,
                offset: 0,
                classId: selectedClassId ? Number(selectedClassId) : undefined,
                dateFrom: dateFrom ?? undefined,
                dateTo: dateTo ?? undefined,
              })
            : Promise.reject(new Error("No student id")),
        enabled: Boolean(studentId) && visible,
        staleTime: 60_000,
      },
    ],
  });

  const summaryQuery = attendanceQueries[0];
  const historyQuery = attendanceQueries[1];

  const branchesQuery = useQuery({
    queryKey: ["branches", "student-modal", studentQuery.data?.organization_id],
    queryFn: () =>
      branchesApi.list({
        organizationId: studentQuery.data?.organization_id,
        isActive: true,
      }),
    enabled: Boolean(studentQuery.data?.organization_id) && visible,
  });

  const classesQuery = useQuery({
    queryKey: ["classes", "student-modal", studentQuery.data?.organization_id, studentQuery.data?.branch_id],
    queryFn: () =>
      classesApi.list({
        organizationId: studentQuery.data?.organization_id,
        branchId: studentQuery.data?.branch_id,
        isActive: true,
      }),
    enabled: Boolean(studentQuery.data?.organization_id && studentQuery.data?.branch_id) && visible,
  });

  const student = studentQuery.data ?? null;
  const payments = paymentsQuery.data ?? [];
  const branch = (branchesQuery.data ?? []).find((item) => item.id === student?.branch_id) ?? null;
  const primaryClass =
    (classesQuery.data ?? []).find((item) => item.id === student?.primary_class_id) ?? null;
  const attendanceSummary = summaryQuery.data ?? null;
  const attendanceHistory = historyQuery.data ?? [];

  const hasMoreAttendance = useMemo(() => {
    if (!attendanceSummary) return false;
    return attendanceHistory.length < attendanceSummary.total_attendances;
  }, [attendanceHistory.length, attendanceSummary]);

  const handleLoadMoreAttendance = useCallback(async () => {
    if (!studentId || !hasMoreAttendance) return;
    try {
      const nextBatch = await attendanceApi.getByStudent({
        studentId,
        limit: ATTENDANCE_HISTORY_PAGE_SIZE,
        offset: attendanceHistory.length,
        classId: selectedClassId ? Number(selectedClassId) : undefined,
        dateFrom: dateFrom ?? undefined,
        dateTo: dateTo ?? undefined,
      });
      queryClient.setQueryData(
        ["attendance", "modal", "student", studentId, attendanceFilterKey],
        (prev: unknown) => {
          const prevArr = Array.isArray(prev) ? (prev as Attendance[]) : [];
          const existingIds = new Set(prevArr.map((a) => a.id));
          const merged = [...prevArr];
          for (const r of nextBatch) if (!existingIds.has(r.id)) merged.push(r);
          return merged;
        },
      );
    } catch {
      void historyQuery.refetch();
    }
  }, [
    studentId,
    hasMoreAttendance,
    attendanceHistory.length,
    historyQuery,
    queryClient,
    selectedClassId,
    dateFrom,
    dateTo,
    attendanceFilterKey,
  ]);

  const handleRefetchAll = useCallback(() => {
    void studentQuery.refetch();
    void paymentsQuery.refetch();
    void summaryQuery.refetch();
    void historyQuery.refetch();
  }, [studentQuery, paymentsQuery, summaryQuery, historyQuery]);

  const handleClearFilters = useCallback(() => {
    setSelectedClassId(null);
    setDateFrom(null);
    setDateTo(null);
  }, []);

  const classOptions = useMemo(() => {
    const items = classesQuery.data ?? [];
    return items.map((c) => ({
      label: `${c.name}${c.discipline_name ? ` · ${c.discipline_name}` : ""}`,
      value: String(c.id),
    }));
  }, [classesQuery.data]);

  const attendanceSection = useMemo(() => {
    if (!studentId) return null;
    return (
      <AttendanceSectionView
        idPrefix="components-student-detail-modal-attendance"
        studentId={studentId}
        summary={attendanceSummary}
        history={attendanceHistory}
        isLoadingSummary={summaryQuery.isFetching}
        isLoadingHistory={historyQuery.isFetching}
        summaryError={summaryQuery.error}
        historyError={historyQuery.error}
        hasMore={hasMoreAttendance}
        onLoadMore={handleLoadMoreAttendance}
        onRetrySummary={() => void summaryQuery.refetch()}
        onRetryHistory={() => void historyQuery.refetch()}
        onRetryAll={handleRefetchAll}

        classOptions={classOptions.length > 0 ? classOptions : undefined}
        selectedClassId={selectedClassId}
        onClassChange={setSelectedClassId}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
      />
    );
  }, [
    studentId,
    attendanceSummary,
    attendanceHistory,
    summaryQuery.isFetching,
    summaryQuery.error,
    historyQuery.isFetching,
    historyQuery.error,
    hasMoreAttendance,
    handleLoadMoreAttendance,
    summaryQuery,
    historyQuery,
    handleRefetchAll,
    classOptions,
    selectedClassId,
    dateFrom,
    dateTo,
    handleClearFilters,
    hasActiveFilters,
  ]);

  return (
    <AppModal
      visible={visible}
      title={student ? `${student.first_name} ${student.last_name}` : "Detalle del alumno"}
      description={student ? `Código ${student.unique_code}` : "Cargando información del alumno..."}
      onClose={onClose}
      nativeID="components-student-detail-modal"
      testID="components-student-detail-modal"
    >
      {studentQuery.isLoading || !student ? (
        <LoadingState />
      ) : studentQuery.isError ? (
        <ErrorState
          message={getErrorMessage(studentQuery.error)}
          onRetry={handleRefetchAll}
        />
      ) : (
        <View style={styles.content} testID="components-student-detail-modal-content">
          <StudentDetailView
            idPrefix="components-student-detail-modal"
            student={student}
            payments={payments}
            branch={branch}
            primaryClass={primaryClass}
            attendanceSummary={attendanceSummary}
            attendanceHistory={attendanceHistory}
            attendanceSection={attendanceSection}
            onQrPress={onQrPress ? () => onQrPress(student) : undefined}
          />
        </View>
      )}
    </AppModal>
  );
}

function LoadingState() {
  return (
    <View style={styles.stateBlock} testID="components-student-detail-modal-loading">
      <Text accessibilityLiveRegion="polite" style={styles.stateTitle}>
        Cargando detalle...
      </Text>
      <Text style={styles.stateDescription}>Obteniendo ficha e historial financiero.</Text>
    </View>
  );
}

const ErrorState = memo(function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <View style={styles.stateBlock} testID="components-student-detail-modal-error">
      <Text accessibilityLiveRegion="assertive" style={styles.stateTitle}>
        No pudimos cargar al alumno
      </Text>
      <Text style={styles.stateDescription}>{message}</Text>
      <Pressable
        accessibilityLabel="Reintentar cargar el detalle del alumno"
        accessibilityRole="link"
        hitSlop={TOUCH_HIT_SLOP}
        onPress={onRetry}
        style={(state) => {
          const hovered = (state as typeof state & { hovered?: boolean }).hovered;
          return [
            styles.inlineRetryLink,
            hovered ? styles.inlineLinkHovered : null,
            state.pressed ? styles.inlineLinkPressed : null,
          ];
        }}
      >
        <Text style={styles.inlineRetryLinkLabel}>Reintentar</Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
  },
  stateBlock: {
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderColor: colors.border,
    borderWidth: 1,
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  stateTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 16,
    fontWeight: "700",
  },
  stateDescription: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  inlineRetryLink: {
    alignSelf: "center",
    borderRadius: radius.sm,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  inlineLinkHovered: {
    backgroundColor: colors.primarySoft,
  },
  inlineLinkPressed: {
    opacity: 0.8,
  },
  inlineRetryLinkLabel: {
    color: colors.primary,
    fontFamily: typography.headingFamily,
    fontSize: 12,
    fontWeight: "700",
    textDecorationLine: "underline",
    textTransform: "uppercase",
  },
});
