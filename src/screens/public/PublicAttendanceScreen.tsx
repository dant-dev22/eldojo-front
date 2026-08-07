import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { getErrorMessage } from "@/api/http";
import { publicAttendanceApi } from "@/api/publicAttendanceApi";
import { AppBadge } from "@/components/AppBadge";
import { AppButton } from "@/components/AppButton";
import { AppCard } from "@/components/AppCard";
import { AppInput } from "@/components/AppInput";
import { LogoSvg } from "@/components/LogoSvg";
import { PublicPageChrome } from "@/components/PublicPageChrome";
import { AppSelect } from "@/components/AppSelect";
import { StatusView } from "@/components/StatusView";
import {
  agedWood as woodAged,
  agedWoodSoft as woodSoftAccent,
  colors,
  goldenYellow as amber,
  goldenYellowSoft as amberSoft,
  indigoBlue as indigo,
  indigoBlueSoft as indigoSoft,
  judogiRed,
  judogiRedSoft as judogiRedSoft,
  radius,
  shadows,
  spacing,
  tatamiGreen as matchaGreen,
  tatamiGreenSoft as matchaGreenSoft,
  typography,
} from "@/constants/theme";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { navigateToPublicPageKey, type PublicPageKey } from "@/navigation/publicRoutes";
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

  const { isDesktop } = useResponsiveLayout();

  if (!resolvedRoute) {
    return (
      <StatusView
        title="Ruta de asistencia no disponible"
        description="Abre esta experiencia desde una URL como /equipo/sucursal/asistencia."
      />
    );
  }

  return (
    <PublicPageChrome
      idPrefix="screens-public-attendance"
      navItems={[
        { key: "home", label: "Inicio", onPress: () => navigateToPublicPageKey("home") },
        { key: "about", label: "Acerca de", onPress: () => navigateToPublicPageKey("about") },
        { key: "events", label: "Eventos", onPress: () => navigateToPublicPageKey("events") },
        { key: "stores", label: "Tiendas", onPress: () => navigateToPublicPageKey("stores") },
      ]}
      onBrandPress={() => navigateToPublicPageKey("home")}
      onGoCreateAccount={() => navigateToPublicPageKey("createAccount")}
      onGoSignIn={() => navigateToPublicPageKey("signIn")}
      onGoDashboard={() => navigateToPublicPageKey("home")}
      showAuthControls={true}
      showFooter={false}
      screenScrollable={true}
      contentContainerStyle={[styles.screenContent, { alignItems: "center" }]}
      contentMaxWidth={contentMaxWidth}
    >
      <View nativeID="screens-public-attendance-layout" style={[styles.layout, { maxWidth: isDesktop ? 880 : contentMaxWidth }]} testID="screens-public-attendance-layout">
        <View nativeID="screens-public-attendance-hero" style={styles.heroRow} testID="screens-public-attendance-hero">
          <View nativeID="screens-public-attendance-hero-icon-wrap" style={styles.heroIconWrap} testID="screens-public-attendance-hero-icon-wrap">
            <LogoSvg
              nativeID="screens-public-attendance-hero-glyph"
              size={36}
              variant="brand-red"
              testID="screens-public-attendance-hero-glyph"
            />
          </View>
          <View nativeID="screens-public-attendance-hero-copy" style={styles.heroCopy} testID="screens-public-attendance-hero-copy">
            <View nativeID="screens-public-attendance-hero-tag" style={styles.heroTagPill} testID="screens-public-attendance-hero-tag">
              <Feather name="clock" size={13} color={judogiRed} />
              <Text style={styles.heroTagText}>Registro · Asistencia</Text>
            </View>
            {contextQuery.isSuccess && contextQuery.data ? (
              <>
                <Text nativeID="screens-public-attendance-hero-title" style={styles.heroTitle} testID="screens-public-attendance-hero-title">{contextQuery.data.organization_name}</Text>
                <Text nativeID="screens-public-attendance-hero-subtitle" style={styles.heroSubtitle} testID="screens-public-attendance-hero-subtitle">
                  {contextQuery.data.branch_name} · Sucursal activa
                </Text>
              </>
            ) : contextQuery.isLoading ? (
              <>
                <View nativeID="screens-public-attendance-hero-skel-title" style={[styles.skeletonBlock, { width: 240, height: 28, marginTop: spacing.xs }]} testID="screens-public-attendance-hero-skel-title" />
                <View nativeID="screens-public-attendance-hero-skel-sub" style={[styles.skeletonBlock, { width: 300, height: 16, marginTop: spacing.sm }]} testID="screens-public-attendance-hero-skel-sub" />
              </>
            ) : null}
            <View nativeID="screens-public-attendance-hero-divider" style={styles.heroDivider} testID="screens-public-attendance-hero-divider" />
            <Text nativeID="screens-public-attendance-hero-tagline" style={styles.heroTagline} testID="screens-public-attendance-hero-tagline">
              Sencillez · Orden · Dojo
            </Text>
          </View>
        </View>

        <View nativeID="screens-public-attendance-main-column" style={styles.mainColumn} testID="screens-public-attendance-main-column">
          {contextQuery.isLoading ? (
            <View nativeID="screens-public-attendance-skel-card" style={styles.formCard} testID="screens-public-attendance-skel-card">
              <View nativeID="screens-public-attendance-skel-ctx" style={styles.skeletonContextBlock} testID="screens-public-attendance-skel-ctx">
                <View style={[styles.skeletonBlock, { width: 140, height: 22 }]} />
                <View style={[styles.skeletonBlock, { width: 220, height: 12, marginTop: spacing.md }]} />
              </View>
              <View style={[styles.skeletonBlock, { width: "100%", height: 52 }]} />
              <View style={[styles.skeletonBlock, { width: "100%", height: 52 }]} />
              <View style={[styles.skeletonBlock, { width: "100%", height: 48, borderRadius: radius.lg }]} />
            </View>
          ) : contextQuery.isError || !contextQuery.data ? (
            <StatusView
              title="No fue posible abrir la asistencia"
              description={getErrorMessage(contextQuery.error)}
            />
          ) : result ? (
            <AppCard nativeID="screens-public-attendance-success-card" style={styles.successCard} testID="screens-public-attendance-success-card">
              <View nativeID="screens-public-attendance-success-top" style={styles.successTopRow} testID="screens-public-attendance-success-top">
                <View nativeID="screens-public-attendance-success-icon" style={styles.successIconWrap} testID="screens-public-attendance-success-icon">
                  <Feather name="check-circle" size={22} color={matchaGreen} />
                </View>
                <AppBadge label="Asistencia registrada" nativeID="screens-public-attendance-success-badge" testID="screens-public-attendance-success-badge" tone="success" />
              </View>
              <View nativeID="screens-public-attendance-success-divider" style={styles.successDivider} testID="screens-public-attendance-success-divider" />
              <Text nativeID="screens-public-attendance-success-title" style={styles.successTitle} testID="screens-public-attendance-success-title">{result.message}</Text>
              <View nativeID="screens-public-attendance-success-meta" style={styles.successMetaGrid} testID="screens-public-attendance-success-meta">
                <View style={styles.successMetaItem}>
                  <Feather name="user" size={14} color={woodAged} />
                  <Text style={styles.successTextLabel}>Alumno</Text>
                  <Text style={styles.successTextValue}>{result.student_name}</Text>
                </View>
                <View style={styles.successMetaItem}>
                  <Feather name="calendar" size={14} color={woodAged} />
                  <Text style={styles.successTextLabel}>Clase</Text>
                  <Text style={styles.successTextValue}>{result.class_name ?? selectedClassName ?? "Clase general"}</Text>
                </View>
                <View style={styles.successMetaItem}>
                  <Feather name="hash" size={14} color={woodAged} />
                  <Text style={styles.successTextLabel}>Folio</Text>
                  <Text style={styles.successTextValue}>#{result.attendance_id}</Text>
                </View>
              </View>
              <Text nativeID="screens-public-attendance-success-countdown" style={styles.countdownText} testID="screens-public-attendance-success-countdown">
                Reiniciando en {successCountdown ?? 0} segundo{successCountdown === 1 ? "" : "s"}…
              </Text>
            </AppCard>
          ) : (
            <>
              <AppCard nativeID="screens-public-attendance-form-card" style={styles.formCard} testID="screens-public-attendance-form-card">
                <View nativeID="screens-public-attendance-form-divider-top" style={styles.formCardDivider} testID="screens-public-attendance-form-divider-top" />
                <View nativeID="screens-public-attendance-context" style={styles.contextBlock} testID="screens-public-attendance-context">
                  <View style={styles.contextBadgeRow}>
                    <View style={styles.contextBadgeIconWrap}>
                      <Feather name="book-open" size={13} color={judogiRed} />
                    </View>
                    <AppBadge label="Formulario de asistencia" nativeID="screens-public-attendance-context-badge" testID="screens-public-attendance-context-badge" tone="warning" />
                  </View>
                  <Text nativeID="screens-public-attendance-section-title" style={styles.sectionTitle} testID="screens-public-attendance-section-title">
                    Registrar asistencia
                  </Text>
                  <Text nativeID="screens-public-attendance-section-description" style={styles.sectionDescription} testID="screens-public-attendance-section-description">
                    Elige la clase actual y escribe el ID del alumno. El sistema confirmara su identidad antes de marcar la asistencia.
                  </Text>
                </View>

                <View nativeID="screens-public-attendance-select-wrap" style={styles.fieldWrap} testID="screens-public-attendance-select-wrap">
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
                </View>

                {selectedClassName ? (
                  <View nativeID="screens-public-attendance-selection-summary" style={styles.selectionSummary} testID="screens-public-attendance-selection-summary">
                    <AppBadge
                      label={selectedClassId === recommendedClassId ? "Sugerida · ahora" : "Clase elegida"}
                      nativeID="screens-public-attendance-selection-summary-badge"
                      testID="screens-public-attendance-selection-summary-badge"
                      tone="success"
                    />
                    <View style={styles.selectionTextWrap}>
                      <Feather name="chevron-right" size={13} color={indigo} />
                      <Text style={styles.selectionSummaryText}>{selectedClassName}</Text>
                    </View>
                  </View>
                ) : null}

                <View nativeID="screens-public-attendance-input-wrap" style={styles.fieldWrap} testID="screens-public-attendance-input-wrap">
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
                </View>

                {lookupHelperText ? (
                  <View nativeID="screens-public-attendance-helper" style={styles.helperRow} testID="screens-public-attendance-helper">
                    <Feather
                      name={studentLookupQuery.isFetching ? "loader" : "search"}
                      size={13}
                      color={studentLookupQuery.isFetching ? indigo : woodAged}
                    />
                    <Text style={styles.helper}>{lookupHelperText}</Text>
                  </View>
                ) : null}

                {studentLookupQuery.isFetching ? (
                  <View nativeID="screens-public-attendance-lookup-skel" style={styles.lookupSkeleton} testID="screens-public-attendance-lookup-skel">
                    <View style={[styles.skeletonBlock, { width: 40, height: 40, borderRadius: 999 }]} />
                    <View style={{ flex: 1, gap: spacing.xs }}>
                      <View style={[styles.skeletonBlock, { width: 180, height: 16 }]} />
                      <View style={[styles.skeletonBlock, { width: 120, height: 12 }]} />
                    </View>
                  </View>
                ) : null}

                {resolvedStudent ? (
                  <View nativeID="screens-public-attendance-student-summary" style={styles.studentSummary} testID="screens-public-attendance-student-summary">
                    <View nativeID="screens-public-attendance-student-avatar" style={styles.studentAvatar} testID="screens-public-attendance-student-avatar">
                      <Text style={styles.studentAvatarText}>
                        {resolvedStudent.student_name
                          .split(" ")
                          .map((segment) => segment[0])
                          .filter(Boolean)
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <View style={styles.studentSummaryBadgeRow}>
                        <Feather name="check" size={12} color={matchaGreen} />
                        <Text style={[styles.helper, { color: matchaGreen }]}>Alumno confirmado</Text>
                      </View>
                      <Text nativeID="screens-public-attendance-student-summary-name" style={styles.studentSummaryName} testID="screens-public-attendance-student-summary-name">
                        {resolvedStudent.student_name}
                      </Text>
                      <Text nativeID="screens-public-attendance-student-summary-meta" style={styles.studentSummaryMeta} testID="screens-public-attendance-student-summary-meta">
                        Codigo · {resolvedStudent.unique_code}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {studentLookupError ? (
                  <View nativeID="screens-public-attendance-student-error" style={styles.errorRow} testID="screens-public-attendance-student-error">
                    <Feather name="alert-circle" size={13} color={judogiRed} />
                    <Text style={styles.error}>{studentLookupError}</Text>
                  </View>
                ) : null}
                {formError ? (
                  <View nativeID="screens-public-attendance-form-error" style={styles.errorRow} testID="screens-public-attendance-form-error">
                    <Feather name="alert-triangle" size={13} color={judogiRed} />
                    <Text style={styles.error}>{formError}</Text>
                  </View>
                ) : null}

                <View nativeID="screens-public-attendance-submit-wrap" style={styles.submitWrap} testID="screens-public-attendance-submit-wrap">
                  <Pressable
                    disabled={!resolvedStudent || !selectedClassId || registerMutation.isPending}
                    style={(state) => {
                      const hovered = (state as unknown as { hovered?: boolean }).hovered;
                      const hoverState = Boolean(hovered) || Boolean(state.pressed);

                      return [
                        styles.submitButton,
                        !resolvedStudent || !selectedClassId ? styles.submitButtonDisabled : null,
                        hoverState ? styles.submitButtonHover : null,
                      ];
                    }}
                    onPress={submitAttendance}
                  >
                    {registerMutation.isPending ? (
                      <Feather name="loader" size={16} color={colors.surface} />
                    ) : (
                      <Feather name="user-check" size={16} color={colors.surface} />
                    )}
                    <Text style={styles.submitButtonText}>
                      {registerMutation.isPending ? "Registrando…" : "Registrar asistencia"}
                    </Text>
                  </Pressable>
                </View>
              </AppCard>
            </>
          )}
        </View>
      </View>
    </PublicPageChrome>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingBottom: 48,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    width: "100%",
  },
  layout: {
    alignItems: "center",
    gap: spacing.xl,
    width: "100%",
  },
  heroRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.lg,
    justifyContent: "center",
    width: "100%",
  },
  heroIconWrap: {
    alignItems: "center",
    backgroundColor: judogiRedSoft,
    borderColor: "rgba(198, 40, 40, 0.24)",
    borderRadius: 999,
    borderWidth: 1,
    height: 56,
    justifyContent: "center",
    shadowColor: shadows.cardElevated.shadowColor,
    shadowOffset: shadows.cardElevated.shadowOffset,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    width: 56,
  },
  heroBrandGlyph: {
    color: judogiRed,
    fontFamily: typography.headingFamily,
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 32,
  },
  heroCopy: {
    alignItems: "flex-start",
    flex: 1,
    gap: spacing.xs,
  },
  heroTagPill: {
    alignItems: "center",
    backgroundColor: amberSoft,
    borderColor: "rgba(249, 168, 37, 0.3)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  heroTagText: {
    color: amber,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  heroTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 32,
    marginTop: spacing.xs,
  },
  heroSubtitle: {
    color: woodAged,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 20,
  },
  heroDivider: {
    alignSelf: "center",
    backgroundColor: "rgba(141,110,99,0.14)",
    borderColor: woodAged,
    borderRadius: 999,
    height: 2,
    marginTop: spacing.md,
    width: 56,
  },
  heroTagline: {
    color: woodAged,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
    marginTop: spacing.sm,
    opacity: 0.75,
  },
  skeletonBlock: {
    backgroundColor: woodSoftAccent,
    borderRadius: radius.md,
    opacity: 0.7,
  },
  skeletonContextBlock: {
    backgroundColor: woodSoftAccent,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  lookupSkeleton: {
    alignItems: "center",
    backgroundColor: woodSoftAccent,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  mainColumn: {
    width: "100%",
  },
  formCardDivider: {
    alignSelf: "center",
    backgroundColor: judogiRed,
    borderRadius: 999,
    height: 4,
    marginBottom: spacing.lg,
    width: 56,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderColor: "rgba(141,110,99,0.14)",
    borderRadius: 24,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.xl,
    shadowColor: shadows.cardElevated.shadowColor,
    shadowOffset: shadows.cardElevated.shadowOffset,
    shadowOpacity: 0.06,
    shadowRadius: 22,
  },
  contextBlock: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  contextBadgeRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  contextBadgeIconWrap: {
    alignItems: "center",
    backgroundColor: judogiRedSoft,
    borderRadius: 999,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 28,
  },
  sectionDescription: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 22,
  },
  fieldWrap: {
    marginTop: spacing.sm,
  },
  selectionSummary: {
    alignItems: "center",
    backgroundColor: matchaGreenSoft,
    borderColor: "rgba(85, 139, 47, 0.22)",
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    padding: spacing.md,
  },
  selectionTextWrap: {
    alignItems: "center",
    flexDirection: "row",
    flex: 1,
    gap: 4,
  },
  selectionSummaryText: {
    color: colors.text,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    fontWeight: "600",
  },
  helperRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  helper: {
    color: indigo,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 18,
  },
  errorRow: {
    alignItems: "center",
    backgroundColor: judogiRedSoft,
    borderColor: "rgba(198, 40, 40, 0.22)",
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  error: {
    color: judogiRed,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  studentSummary: {
    alignItems: "center",
    backgroundColor: indigoSoft,
    borderColor: "rgba(26, 35, 126, 0.22)",
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  studentAvatar: {
    alignItems: "center",
    backgroundColor: indigo,
    borderRadius: 999,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  studentAvatarText: {
    color: colors.surface,
    fontFamily: typography.headingFamily,
    fontSize: 15,
    fontWeight: "800",
  },
  studentSummaryBadgeRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  studentSummaryName: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 22,
  },
  studentSummaryMeta: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 18,
  },
  submitWrap: {
    marginTop: spacing.sm,
    width: "100%",
  },
  submitButton: {
    alignItems: "center",
    backgroundColor: judogiRed,
    borderColor: judogiRed,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    paddingVertical: spacing.md,
    shadowColor: shadows.cardElevated.shadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    width: "100%",
  },
  submitButtonHover: {
    backgroundColor: "rgba(198, 40, 40, 0.92)",
    shadowOpacity: 0.28,
  },
  submitButtonDisabled: {
    backgroundColor: "rgba(141,110,99,0.14)",
    borderColor: colors.border,
    opacity: 0.8,
    shadowOpacity: 0,
  },
  submitButtonText: {
    color: colors.surface,
    fontFamily: typography.headingFamily,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  successCard: {
    backgroundColor: matchaGreenSoft,
    borderColor: "rgba(85, 139, 47, 0.28)",
    borderRadius: 24,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.xl,
  },
  successTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  successIconWrap: {
    alignItems: "center",
    backgroundColor: matchaGreen,
    borderRadius: 999,
    height: 40,
    justifyContent: "center",
    shadowColor: matchaGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    width: 40,
  },
  successDivider: {
    alignSelf: "center",
    backgroundColor: matchaGreen,
    borderRadius: 999,
    height: 3,
    opacity: 0.7,
    width: 44,
  },
  successTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 28,
    textAlign: "center",
  },
  successMetaGrid: {
    gap: spacing.sm,
  },
  successMetaItem: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  successTextLabel: {
    color: woodAged,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
    textTransform: "uppercase",
    width: 68,
  },
  successTextValue: {
    color: colors.text,
    flex: 1,
    fontFamily: typography.headingFamily,
    fontSize: 15,
    fontWeight: "700",
  },
  countdownText: {
    color: matchaGreen,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
});
