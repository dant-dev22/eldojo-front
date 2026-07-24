import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { getErrorMessage } from "@/api/http";
import { publicAttendanceApi } from "@/api/publicAttendanceApi";
import { AppBadge } from "@/components/AppBadge";
import { AppButton } from "@/components/AppButton";
import { AppCard } from "@/components/AppCard";
import { AppInput } from "@/components/AppInput";
import { AppSelect } from "@/components/AppSelect";
import { Screen } from "@/components/Screen";
import { StatusView } from "@/components/StatusView";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { getPublicAttendanceRoute } from "@/utils/publicAttendanceRoute";

import type {
  PublicAttendanceClassOption,
  PublicAttendanceClassSchedule,
  PublicAttendanceResult,
  PublicAttendanceRouteParams,
} from "@/types/publicAttendance";

interface PublicAttendanceScreenProps {
  routeParams?: PublicAttendanceRouteParams | null;
}

function formatRouteLabel(routeParams: PublicAttendanceRouteParams) {
  return `${routeParams.organizationSlug} / ${routeParams.branchSlug}`;
}

const WEEKDAY_TO_INDEX: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

function parseTimeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map((segment) => Number(segment));
  return hours * 60 + minutes;
}

function formatScheduleRange(schedule: PublicAttendanceClassSchedule): string {
  return `${schedule.start_time.slice(0, 5)} - ${schedule.end_time.slice(0, 5)}`;
}

function getBranchLocalClock(timeZone: string): { dayOfWeek: number; minutes: number } {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(new Date());
    const weekday = parts.find((part) => part.type === "weekday")?.value ?? "Mon";
    const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
    const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");

    return {
      dayOfWeek: WEEKDAY_TO_INDEX[weekday] ?? 0,
      minutes: hour * 60 + minute,
    };
  } catch {
    const now = new Date();
    return {
      dayOfWeek: (now.getDay() + 6) % 7,
      minutes: now.getHours() * 60 + now.getMinutes(),
    };
  }
}

function sortSchedules(schedules: PublicAttendanceClassSchedule[]): PublicAttendanceClassSchedule[] {
  return [...schedules].sort((left, right) => parseTimeToMinutes(left.start_time) - parseTimeToMinutes(right.start_time));
}

function findRecommendedSchedule(
  schedules: PublicAttendanceClassSchedule[],
  currentMinutes: number
): PublicAttendanceClassSchedule | null {
  if (schedules.length === 0) {
    return null;
  }

  const nextIndex = schedules.findIndex((schedule) => parseTimeToMinutes(schedule.start_time) >= currentMinutes);
  if (nextIndex === -1) {
    return schedules[schedules.length - 1];
  }
  if (nextIndex === 0) {
    return schedules[0];
  }

  const previousSchedule = schedules[nextIndex - 1];
  const previousStart = parseTimeToMinutes(previousSchedule.start_time);

  if (currentMinutes - previousStart <= 15) {
    return previousSchedule;
  }

  return schedules[nextIndex];
}

function buildClassItems(classes: PublicAttendanceClassOption[], branchTimeZone: string) {
  const { dayOfWeek, minutes } = getBranchLocalClock(branchTimeZone);

  return classes.map((classOption) => {
    const todaysSchedules = sortSchedules(classOption.schedules.filter((schedule) => schedule.day_of_week === dayOfWeek));
    const highlightedSchedule = findRecommendedSchedule(todaysSchedules, minutes);
    const labelParts = [classOption.name];

    if (highlightedSchedule) {
      labelParts.push(formatScheduleRange(highlightedSchedule));
    }
    if (classOption.instructor_name) {
      labelParts.push(classOption.instructor_name);
    }

    return {
      label: labelParts.join(" · "),
      value: String(classOption.id),
    };
  });
}

function getRecommendedClassId(classes: PublicAttendanceClassOption[], branchTimeZone: string): string {
  if (classes.length === 0) {
    return "";
  }

  const { dayOfWeek, minutes } = getBranchLocalClock(branchTimeZone);
  const todaysSchedules = classes.flatMap((classOption) =>
    classOption.schedules
      .filter((schedule) => schedule.day_of_week === dayOfWeek)
      .map((schedule) => ({
        classId: classOption.id,
        startMinutes: parseTimeToMinutes(schedule.start_time),
      }))
  );

  const sortedSchedules = [...todaysSchedules].sort((left, right) => left.startMinutes - right.startMinutes);
  if (sortedSchedules.length === 0) {
    return String(classes[0].id);
  }

  const nextIndex = sortedSchedules.findIndex((schedule) => schedule.startMinutes >= minutes);
  if (nextIndex === -1) {
    return String(sortedSchedules[sortedSchedules.length - 1].classId);
  }
  if (nextIndex === 0) {
    return String(sortedSchedules[0].classId);
  }

  const previousSchedule = sortedSchedules[nextIndex - 1];
  if (minutes - previousSchedule.startMinutes <= 15) {
    return String(previousSchedule.classId);
  }

  return String(sortedSchedules[nextIndex].classId);
}

export function PublicAttendanceScreen({ routeParams }: PublicAttendanceScreenProps) {
  const resolvedRoute = routeParams ?? getPublicAttendanceRoute();
  const { contentMaxWidth } = useResponsiveLayout();
  const [studentIdentifier, setStudentIdentifier] = useState("");
  const [debouncedStudentIdentifier, setDebouncedStudentIdentifier] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [result, setResult] = useState<PublicAttendanceResult | null>(null);
  const [successCountdown, setSuccessCountdown] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const contextQuery = useQuery({
    enabled: Boolean(resolvedRoute),
    queryKey: ["public-attendance-context", resolvedRoute?.organizationSlug, resolvedRoute?.branchSlug],
    queryFn: () =>
      publicAttendanceApi.getContext(resolvedRoute!.organizationSlug, resolvedRoute!.branchSlug),
  });

  useEffect(() => {
    const normalizedIdentifier = studentIdentifier.trim().toUpperCase();

    if (!normalizedIdentifier) {
      setDebouncedStudentIdentifier("");
      return;
    }

    const timeoutId = setTimeout(() => {
      setDebouncedStudentIdentifier(normalizedIdentifier);
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [studentIdentifier]);

  const normalizedStudentIdentifier = studentIdentifier.trim().toUpperCase();

  const studentLookupQuery = useQuery({
    enabled: Boolean(resolvedRoute && debouncedStudentIdentifier),
    queryKey: [
      "public-attendance-student",
      resolvedRoute?.organizationSlug,
      resolvedRoute?.branchSlug,
      debouncedStudentIdentifier,
    ],
    queryFn: () =>
      publicAttendanceApi.lookupStudent(
        resolvedRoute!.organizationSlug,
        resolvedRoute!.branchSlug,
        debouncedStudentIdentifier
      ),
    retry: false,
  });

  const registerMutation = useMutation({
    mutationFn: async () =>
      publicAttendanceApi.register(resolvedRoute!.organizationSlug, resolvedRoute!.branchSlug, {
        student_id: studentLookupQuery.data!.id,
        class_id: selectedClassId ? Number(selectedClassId) : null,
      }),
    onSuccess: (response) => {
      setResult(response);
      setSuccessCountdown(3);
      setStudentIdentifier("");
      setDebouncedStudentIdentifier("");
      setSelectedClassId(recommendedClassId);
      setFormError(null);
    },
    onError: (error) => {
      setFormError(getErrorMessage(error));
    },
  });

  const recommendedClassId = useMemo(() => {
    if (!contextQuery.data) {
      return "";
    }

    return getRecommendedClassId(contextQuery.data.classes, contextQuery.data.branch_timezone);
  }, [contextQuery.data]);

  const classItems = useMemo(() => {
    if (!contextQuery.data) {
      return [];
    }

    return buildClassItems(contextQuery.data.classes, contextQuery.data.branch_timezone);
  }, [contextQuery.data]);

  const selectedClassName = useMemo(
    () => contextQuery.data?.classes.find((item) => item.id === Number(selectedClassId))?.name ?? null,
    [contextQuery.data?.classes, selectedClassId]
  );

  useEffect(() => {
    if (!contextQuery.data) {
      return;
    }

    const currentSelectionExists = contextQuery.data.classes.some((classOption) => String(classOption.id) === selectedClassId);
    if (!selectedClassId || !currentSelectionExists) {
      setSelectedClassId(recommendedClassId);
    }
  }, [contextQuery.data, recommendedClassId, selectedClassId]);

  useEffect(() => {
    if (!result) {
      return;
    }

    const intervalId = setInterval(() => {
      setSuccessCountdown((currentValue) => {
        if (currentValue === null) {
          return null;
        }
        return currentValue - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [result]);

  useEffect(() => {
    if (!result || successCountdown === null || successCountdown > 0) {
      return;
    }

    setResult(null);
    setSuccessCountdown(null);
    setFormError(null);
    setStudentIdentifier("");
    setDebouncedStudentIdentifier("");
    setSelectedClassId(recommendedClassId);
  }, [recommendedClassId, result, successCountdown]);

  const submitAttendance = useCallback(() => {
    if (!normalizedStudentIdentifier) {
      setFormError("Ingresa el ID o codigo del alumno para continuar.");
      return;
    }
    if (!studentLookupQuery.data) {
      setFormError("Debes esperar a que el sistema confirme al alumno antes de registrar.");
      return;
    }
    if (!selectedClassId) {
      setFormError("Selecciona una clase disponible para continuar.");
      return;
    }

    setFormError(null);
    registerMutation.mutate();
  }, [normalizedStudentIdentifier, registerMutation, selectedClassId, studentLookupQuery.data]);

  const studentLookupError =
    normalizedStudentIdentifier &&
    debouncedStudentIdentifier === normalizedStudentIdentifier &&
    studentLookupQuery.isError
      ? getErrorMessage(studentLookupQuery.error)
      : null;

  const resolvedStudent =
    normalizedStudentIdentifier &&
    debouncedStudentIdentifier === normalizedStudentIdentifier &&
    studentLookupQuery.isSuccess
      ? studentLookupQuery.data
      : null;

  const lookupHelperText = studentLookupQuery.isFetching
    ? "Buscando alumno..."
    : resolvedStudent
      ? `Alumno encontrado: ${resolvedStudent.student_name}`
      : null;

  if (!resolvedRoute) {
    return (
      <StatusView
        title="Ruta de asistencia no disponible"
        description="Abre esta experiencia desde una URL como /equipo/sucursal/asistencia."
      />
    );
  }

  if (contextQuery.isLoading) {
    return (
      <StatusView
        title="Cargando asistencia"
        description={`Preparando el acceso publico para ${formatRouteLabel(resolvedRoute)}.`}
        loading
      />
    );
  }

  if (contextQuery.isError || !contextQuery.data) {
    return (
      <StatusView
        title="No fue posible abrir la asistencia"
        description={getErrorMessage(contextQuery.error)}
      />
    );
  }

  return (
    <Screen
      scrollable
      contentStyle={[styles.screenContent, { alignItems: "center" }]}
      nativeID="screens-public-attendance-screen"
      testID="screens-public-attendance-screen"
    >
      <View nativeID="screens-public-attendance-layout" style={[styles.layout, { maxWidth: contentMaxWidth }]} testID="screens-public-attendance-layout">
        <View nativeID="screens-public-attendance-main-column" style={styles.mainColumn} testID="screens-public-attendance-main-column">
          {result ? (
            <AppCard nativeID="screens-public-attendance-success-card" style={styles.successCard} testID="screens-public-attendance-success-card">
              <AppBadge label="Asistencia registrada" tone="success" />
              <Text style={styles.successTitle}>{result.message}</Text>
              <Text style={styles.successText}>Alumno: {result.student_name}</Text>
              <Text style={styles.successText}>
                Clase: {result.class_name ?? selectedClassName ?? "Clase general"}
              </Text>
              <Text style={styles.successText}>Folio: #{result.attendance_id}</Text>
              <Text style={styles.countdownText}>
                Reiniciando el formulario en {successCountdown ?? 0} segundo{successCountdown === 1 ? "" : "s"}.
              </Text>
            </AppCard>
          ) : (
            <>
              <AppCard nativeID="screens-public-attendance-form-card" style={styles.formCard} testID="screens-public-attendance-form-card">
                <View nativeID="screens-public-attendance-context" style={styles.contextBlock} testID="screens-public-attendance-context">
                  <AppBadge label="Registrar asistencia" tone="info" />
                  <Text style={styles.contextTitle}>{contextQuery.data.organization_name}</Text>
                  <Text style={styles.contextSubtitle}>{contextQuery.data.branch_name}</Text>
                </View>
                <Text style={styles.sectionTitle}>Registrar asistencia</Text>
                <Text style={styles.sectionDescription}>
                  Escribe el ID del alumno o su codigo. Cuando el sistema lo encuentre, podras confirmar la asistencia manualmente.
                </Text>
                <AppSelect
                  enabled={!registerMutation.isPending}
                  items={classItems}
                  label="Clase disponible"
                  nativeID="screens-public-attendance-class-select"
                  onValueChange={(value) => {
                    setSelectedClassId(value);
                    setFormError(null);
                  }}
                  placeholder="Selecciona una clase"
                  testID="screens-public-attendance-class-select"
                  value={selectedClassId}
                />
                {selectedClassName ? (
                  <View nativeID="screens-public-attendance-selection-summary" style={styles.selectionSummary} testID="screens-public-attendance-selection-summary">
                    <AppBadge
                      label={selectedClassId === recommendedClassId ? "Clase sugerida" : "Clase elegida"}
                      tone="success"
                    />
                    <Text style={styles.selectionSummaryText}>{selectedClassName}</Text>
                  </View>
                ) : null}
                <AppInput
                  autoCapitalize="characters"
                  autoCorrect={false}
                  editable={!registerMutation.isPending}
                  keyboardType="default"
                  label="ID o codigo del alumno"
                  nativeID="screens-public-attendance-student-input"
                  onChangeText={(value) => {
                    setStudentIdentifier(value);
                    setFormError(null);
                  }}
                  placeholder="Ejemplo: 125 o ELD-A1B2"
                  testID="screens-public-attendance-student-input"
                  value={studentIdentifier}
                />
                {lookupHelperText ? <Text style={styles.helper}>{lookupHelperText}</Text> : null}
                {resolvedStudent ? (
                  <View nativeID="screens-public-attendance-student-summary" style={styles.studentSummary} testID="screens-public-attendance-student-summary">
                    <AppBadge label="Alumno encontrado" tone="info" />
                    <Text style={styles.studentSummaryName}>{resolvedStudent.student_name}</Text>
                    <Text style={styles.studentSummaryMeta}>Codigo: {resolvedStudent.unique_code}</Text>
                  </View>
                ) : null}
                {studentLookupError ? <Text style={styles.error}>{studentLookupError}</Text> : null}
                {formError ? <Text style={styles.error}>{formError}</Text> : null}
                <AppButton
                  disabled={!resolvedStudent || !selectedClassId}
                  label="Registrar asistencia"
                  loading={registerMutation.isPending}
                  nativeID="screens-public-attendance-submit-button"
                  onPress={submitAttendance}
                  testID="screens-public-attendance-submit-button"
                />
              </AppCard>
            </>
          )}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingBottom: spacing["2xl"],
  },
  layout: {
    width: "100%",
  },
  mainColumn: {
    width: "100%",
  },
  formCard: {
    gap: spacing.md,
  },
  contextBlock: {
    gap: spacing.xs,
  },
  contextTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 24,
    fontWeight: "800",
  },
  contextSubtitle: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 20,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 22,
    fontWeight: "800",
  },
  sectionDescription: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 20,
  },
  selectionSummary: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  selectionSummaryText: {
    color: colors.text,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
  },
  helper: {
    color: colors.info,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 18,
  },
  error: {
    color: colors.danger,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
  },
  studentSummary: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  studentSummaryName: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 18,
    fontWeight: "700",
  },
  studentSummaryMeta: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 18,
  },
  successCard: {
    backgroundColor: colors.successSoft,
    borderColor: "#B7E4C7",
    gap: spacing.sm,
  },
  successTitle: {
    color: colors.success,
    fontFamily: typography.headingFamily,
    fontSize: 24,
    fontWeight: "800",
  },
  successText: {
    color: colors.text,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 20,
  },
  countdownText: {
    color: colors.success,
    fontFamily: typography.headingFamily,
    fontSize: 14,
    fontWeight: "700",
  },
});
