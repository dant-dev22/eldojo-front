import { useQuery } from "@tanstack/react-query";
import { memo, useCallback, useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { branchesApi } from "@/api/branchesApi";
import { classesApi } from "@/api/classesApi";
import { getErrorMessage } from "@/api/http";
import { paymentsApi } from "@/api/paymentsApi";
import { studentsApi } from "@/api/studentsApi";
import { AppModal } from "@/components/AppModal";
import { StudentDetailView } from "@/components/StudentDetailView";
import { colors, radius, spacing, typography } from "@/constants/theme";

import type { Student } from "@/types/api";

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
  useEffect(() => {
    // Reset is handled implicitly by react-query's enabled flag
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

  const handleRefetch = useCallback(() => {
    void studentQuery.refetch();
    void paymentsQuery.refetch();
  }, [studentQuery, paymentsQuery]);

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
          onRetry={handleRefetch}
        />
      ) : (
        <View style={styles.content} testID="components-student-detail-modal-content">
          <StudentDetailView
            idPrefix="components-student-detail-modal"
            student={student}
            payments={payments}
            branch={branch}
            primaryClass={primaryClass}
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
