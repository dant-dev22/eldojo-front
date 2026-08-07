import { Feather } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Pressable, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { getErrorMessage } from "@/api/http";
import { studentsApi } from "@/api/studentsApi";
import { trajectoryApi } from "@/api/trajectoryApi";
import { AppButton } from "@/components/AppButton";
import { AppCard } from "@/components/AppCard";
import { AppInput } from "@/components/AppInput";
import { AppModal } from "@/components/AppModal";
import { AdminShell } from "@/components/AdminShell";
import { BeltIndicator } from "@/components/BeltIndicator";
import { Screen } from "@/components/Screen";
import { StatusView } from "@/components/StatusView";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import type { AdminStackParamList } from "@/navigation/types";
import type { Student, TrajectoryEvent } from "@/types/api";
import { formatDate } from "@/utils/format";

type Props = NativeStackScreenProps<AdminStackParamList, "TrajectoryDetail">;

const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];
const WEEKDAY_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const WEEKDAY_LONG = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

function toDateKey(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function fromDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function formatLongDate(dateKey: string): string {
  const date = fromDateKey(dateKey);
  const weekday = WEEKDAY_LONG[date.getDay()] ?? "";
  const day = date.getDate();
  const month = MONTH_NAMES[date.getMonth()] ?? "";
  const year = date.getFullYear();
  return `${weekday} ${day} de ${month}, ${year}`;
}

export function TrajectoryDetailScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const { contentMaxWidth, isDesktop } = useResponsiveLayout();
  const queryClient = useQueryClient();
  const studentId = route.params.studentId;

  const currentAssignment = user?.admin_assignments[0] ?? null;
  const organizationId = currentAssignment?.organization_id ?? null;

  const today = new Date();
  const initialCursor = new Date(today.getFullYear(), today.getMonth(), 1);
  const [cursor, setCursor] = useState<Date>(initialCursor);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [isDayModalVisible, setIsDayModalVisible] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [draftContent, setDraftContent] = useState("");
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [dayModalError, setDayModalError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<"success" | "danger">("success");
  const newContentInputRef = useRef<TextInput>(null);
  const editContentInputRef = useRef<TextInput>(null);

  const studentQuery = useQuery({
    queryKey: ["student", studentId],
    queryFn: () => studentsApi.getById(studentId),
  });

  const eventsQuery = useQuery({
    queryKey: ["trajectory-events", studentId],
    queryFn: () =>
      trajectoryApi.listEvents({
        student_id: studentId,
        organization_id: organizationId ?? undefined,
      }),
    enabled: Boolean(studentId),
  });

  const events = eventsQuery.data ?? [];
  const eventsByDateKey = useMemo(() => {
    const map = new Map<string, TrajectoryEvent[]>();
    events.forEach((event) => {
      const existing = map.get(event.event_date) ?? [];
      existing.push(event);
      map.set(event.event_date, existing);
    });
    return map;
  }, [events]);
  const totalEvents = events.length;
  const uniqueDays = eventsByDateKey.size;

  const createEventMutation = useMutation({
    mutationFn: trajectoryApi.createEvent,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["trajectory-events", studentId] });
      await queryClient.invalidateQueries({ queryKey: ["trajectory-summary"] });
      setIsCreatingNew(false);
      setDraftContent("");
      setDayModalError(null);
      setFeedbackTone("success");
      setFeedbackMessage("Suceso registrado correctamente.");
    },
    onError: (error) => {
      setDayModalError(getErrorMessage(error));
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: ({
      eventId,
      payload,
    }: {
      eventId: number;
      payload: { content: string };
    }) => trajectoryApi.updateEvent(eventId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["trajectory-events", studentId] });
      await queryClient.invalidateQueries({ queryKey: ["trajectory-summary"] });
      setEditingEventId(null);
      setEditingContent("");
      setDayModalError(null);
      setFeedbackTone("success");
      setFeedbackMessage("Suceso actualizado correctamente.");
    },
    onError: (error) => {
      setDayModalError(getErrorMessage(error));
    },
  });

  const removeEventMutation = useMutation({
    mutationFn: (eventId: number) => trajectoryApi.removeEvent(eventId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["trajectory-events", studentId] });
      await queryClient.invalidateQueries({ queryKey: ["trajectory-summary"] });
      setDayModalError(null);
      setFeedbackTone("success");
      setFeedbackMessage("Suceso eliminado de la trayectoria.");
    },
    onError: (error) => {
      setDayModalError(getErrorMessage(error));
    },
  });

  useEffect(() => {
    if (!feedbackMessage) {
      return;
    }
    const timeoutId = setTimeout(() => setFeedbackMessage(null), 3500);
    return () => clearTimeout(timeoutId);
  }, [feedbackMessage]);

  useEffect(() => {
    if (isCreatingNew && Platform.OS !== "web") {
      const timeoutId = setTimeout(() => newContentInputRef.current?.focus(), 80);
      return () => clearTimeout(timeoutId);
    }
    return undefined;
  }, [isCreatingNew]);

  useEffect(() => {
    if (editingEventId !== null && Platform.OS !== "web") {
      const timeoutId = setTimeout(() => editContentInputRef.current?.focus(), 80);
      return () => clearTimeout(timeoutId);
    }
    return undefined;
  }, [editingEventId]);

  const handleGoBack = useCallback(() => {
    navigation.navigate("TrajectoryList");
  }, [navigation]);

  const handleOpenDay = useCallback((dateKey: string) => {
    setSelectedDateKey(dateKey);
    setIsDayModalVisible(true);
    setIsCreatingNew(false);
    setDraftContent("");
    setEditingEventId(null);
    setEditingContent("");
    setDayModalError(null);
  }, []);

  const handleCloseDay = useCallback(() => {
    setIsDayModalVisible(false);
    setIsCreatingNew(false);
    setDraftContent("");
    setEditingEventId(null);
    setEditingContent("");
    setDayModalError(null);
  }, []);

  const handleSubmitNew = useCallback(() => {
    if (!selectedDateKey) {
      return;
    }
    const trimmed = draftContent.trim();
    if (trimmed.length === 0) {
      setDayModalError("Escribe al menos un carácter.");
      return;
    }
    if (trimmed.length > 280) {
      setDayModalError("El texto no puede exceder 280 caracteres.");
      return;
    }
    createEventMutation.mutate({
      student_id: studentId,
      event_date: selectedDateKey,
      content: trimmed,
    });
  }, [createEventMutation, draftContent, selectedDateKey, studentId]);

  const handleSubmitEdit = useCallback(() => {
    if (editingEventId === null) {
      return;
    }
    const trimmed = editingContent.trim();
    if (trimmed.length === 0) {
      setDayModalError("Escribe al menos un carácter.");
      return;
    }
    if (trimmed.length > 280) {
      setDayModalError("El texto no puede exceder 280 caracteres.");
      return;
    }
    updateEventMutation.mutate({
      eventId: editingEventId,
      payload: { content: trimmed },
    });
  }, [editingContent, editingEventId, updateEventMutation]);

  const handleStartEdit = useCallback((event: TrajectoryEvent) => {
    setEditingEventId(event.id);
    setEditingContent(event.content);
    setDayModalError(null);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingEventId(null);
    setEditingContent("");
    setDayModalError(null);
  }, []);

  const handleRemove = useCallback(
    (eventId: number) => {
      removeEventMutation.mutate(eventId);
    },
    [removeEventMutation],
  );

  const handlePrevMonth = useCallback(() => {
    setCursor((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1));
  }, []);
  const handleNextMonth = useCallback(() => {
    setCursor((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1));
  }, []);

  const calendarCells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const cells: Array<{
      key: string;
      day: number | null;
      dateKey: string | null;
      inMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      eventsCount: number;
    }> = [];
    const todayKey = toDateKey(new Date());
    for (let i = 0; i < firstWeekday; i += 1) {
      cells.push({
        key: `prev-${i}`,
        day: null,
        dateKey: null,
        inMonth: false,
        isToday: false,
        isSelected: false,
        eventsCount: 0,
      });
    }
    for (let day = 1; day <= lastDay; day += 1) {
      const date = new Date(year, month, day);
      const key = toDateKey(date);
      const eventsForDay = eventsByDateKey.get(key) ?? [];
      cells.push({
        key,
        day,
        dateKey: key,
        inMonth: true,
        isToday: key === todayKey,
        isSelected: key === selectedDateKey,
        eventsCount: eventsForDay.length,
      });
    }
    return cells;
  }, [cursor, eventsByDateKey, selectedDateKey]);

  const sidebarSummary = useMemo(
    () => ({
      organizationName: null,
      suffix: null,
      branchName: null,
      location: null,
      mainSchedule: null,
    }),
    [],
  );

  const student: Student | null = studentQuery.data ?? null;
  const monthTitle = `${MONTH_NAMES[cursor.getMonth()] ?? ""} ${cursor.getFullYear()}`;
  const selectedEvents = useMemo(
    () => (selectedDateKey ? eventsByDateKey.get(selectedDateKey) ?? [] : []),
    [eventsByDateKey, selectedDateKey],
  );

  if (!organizationId) {
    return (
      <Screen
        contentStyle={[styles.screenContent, { alignItems: "center" }]}
        nativeID="screens-admin-trajectory-detail-missing-scope-screen"
        testID="screens-admin-trajectory-detail-missing-scope-screen"
      >
        <View
          nativeID="screens-admin-trajectory-detail-missing-scope-container"
          style={[styles.container, { maxWidth: contentMaxWidth }]}
          testID="screens-admin-trajectory-detail-missing-scope-container"
        >
          <StatusView
            nativeID="screens-admin-trajectory-detail-missing-scope-status"
            title="No encontramos el alcance admin"
            description="El usuario autenticado no tiene una asignación válida para operar trayectoria."
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      scrollable
      contentStyle={styles.screenContent}
      nativeID="screens-admin-trajectory-detail-screen"
      testID="screens-admin-trajectory-detail-screen"
    >
      <AdminShell
        activeSection="trajectory"
        onGoBranches={() => navigation.navigate("AdminHome", { section: "branches" })}
        onGoDashboard={() => navigation.navigate("AdminHome")}
        onGoDojo={() => navigation.navigate("AdminHome", { section: "dojo" })}
        onGoOperations={() => navigation.navigate("AdminHome", { section: "operations" })}
        onGoPayments={() => navigation.navigate("AdminHome", { section: "payments" })}
        onGoStudents={() => navigation.navigate("StudentsList")}
        onGoTrajectory={handleGoBack}
        sidebarSummary={sidebarSummary}
        subtitle={student ? `trayectoria de ${student.first_name} ${student.last_name}` : "trayectoria del alumno"}
        title="Trayectoria"
      >
        <View
          nativeID="screens-admin-trajectory-detail-content"
          style={[styles.container, { maxWidth: contentMaxWidth }]}
          testID="screens-admin-trajectory-detail-content"
        >
          <View style={styles.backRow}>
            <Pressable
              accessibilityRole="link"
              hitSlop={{ bottom: 8, left: 8, right: 8, top: 8 }}
              onPress={handleGoBack}
              style={(state) => {
                const hovered = (state as typeof state & { hovered?: boolean }).hovered ?? false;
                return [
                  styles.backLink,
                  hovered ? styles.backLinkHovered : null,
                  state.pressed ? styles.backLinkPressed : null,
                ];
              }}
            >
              <Feather name="arrow-left" size={16} color={colors.action} />
              <Text style={styles.backLinkLabel}>Volver a la lista</Text>
            </Pressable>
          </View>

          {feedbackMessage ? (
            <AppCard
              nativeID="screens-admin-trajectory-detail-feedback-card"
              style={[
                styles.feedbackCard,
                feedbackTone === "success" ? styles.feedbackSuccess : styles.feedbackDanger,
              ]}
              testID="screens-admin-trajectory-detail-feedback-card"
            >
              <Text style={styles.feedbackText}>{feedbackMessage}</Text>
            </AppCard>
          ) : null}

          {studentQuery.isLoading || eventsQuery.isLoading ? (
            <AppCard
              nativeID="screens-admin-trajectory-detail-loading-card"
              style={styles.loadingCard}
              testID="screens-admin-trajectory-detail-loading-card"
            >
              <Text style={styles.loadingText}>Cargando trayectoria…</Text>
            </AppCard>
          ) : studentQuery.isError ? (
            <View style={styles.errorBlock}>
              <StatusView
                nativeID="screens-admin-trajectory-detail-error-status"
                title="No pudimos cargar al alumno"
                description={getErrorMessage(studentQuery.error)}
              />
            </View>
          ) : !student ? (
            <View style={styles.errorBlock}>
              <StatusView
                nativeID="screens-admin-trajectory-detail-missing-status"
                title="Alumno no encontrado"
                description="Verifica el código del alumno e intenta nuevamente."
              />
            </View>
          ) : (
            <>
              <AppCard
                nativeID="screens-admin-trajectory-detail-student-card"
                style={styles.studentCard}
                testID="screens-admin-trajectory-detail-student-card"
              >
                <View
                  style={[
                    styles.studentCardRow,
                    isDesktop ? null : mobileStyles.studentCardRow,
                  ]}
                >
                  <View style={styles.studentPhotoWrap}>
                    {student.photo_url ? (
                      <View style={styles.studentPhoto} />
                    ) : (
                      <View style={[styles.studentPhoto, styles.studentPhotoEmpty]}>
                        <Text style={styles.studentPhotoInitials}>
                          {student.first_name.slice(0, 1).toUpperCase()}
                          {student.last_name.slice(0, 1).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>
                      {student.first_name} {student.last_name}
                    </Text>
                    <Text style={styles.studentMeta}>
                      {student.unique_code} · Inscrito el{" "}
                      {formatDate(student.enrollment_date)}
                    </Text>
                    <View style={styles.studentInfoDetails}>
                      <BeltIndicator
                        beltLevel={student.current_belt_level}
                        size="sm"
                        stripe={student.current_stripe}
                        testID={`screens-admin-trajectory-detail-belt-${student.id}`}
                      />
                    </View>
                  </View>

                  <View
                    style={[
                      styles.studentStats,
                      isDesktop ? null : mobileStyles.studentStats,
                    ]}
                  >
                    <View style={styles.studentStat}>
                      <Text style={styles.studentStatValue}>{totalEvents}</Text>
                      <Text style={styles.studentStatLabel}>sucesos</Text>
                    </View>
                    <View style={styles.studentStat}>
                      <Text style={styles.studentStatValue}>{uniqueDays}</Text>
                      <Text style={styles.studentStatLabel}>días marcados</Text>
                    </View>
                  </View>
                </View>
              </AppCard>

              <View
                nativeID="screens-admin-trajectory-detail-calendar-wrap"
                style={styles.calendarWrap}
                testID="screens-admin-trajectory-detail-calendar-wrap"
              >
                <AppCard
                  nativeID="screens-admin-trajectory-detail-calendar-card"
                  style={styles.calendarCard}
                  testID="screens-admin-trajectory-detail-calendar-card"
                >
                  <View style={styles.calendarHeader}>
                    <Pressable
                      accessibilityLabel="Mes anterior"
                      accessibilityRole="button"
                      hitSlop={{ bottom: 8, left: 8, right: 8, top: 8 }}
                      onPress={handlePrevMonth}
                      style={(state) => {
                        const hovered =
                          (state as typeof state & { hovered?: boolean }).hovered ?? false;
                        return [
                          styles.monthNavButton,
                          hovered ? styles.monthNavButtonHovered : null,
                          state.pressed ? styles.monthNavButtonPressed : null,
                        ];
                      }}
                    >
                      <Feather name="chevron-left" size={20} color={colors.text} />
                    </Pressable>
                    <Text style={styles.monthTitle}>{monthTitle}</Text>
                    <Pressable
                      accessibilityLabel="Mes siguiente"
                      accessibilityRole="button"
                      hitSlop={{ bottom: 8, left: 8, right: 8, top: 8 }}
                      onPress={handleNextMonth}
                      style={(state) => {
                        const hovered =
                          (state as typeof state & { hovered?: boolean }).hovered ?? false;
                        return [
                          styles.monthNavButton,
                          hovered ? styles.monthNavButtonHovered : null,
                          state.pressed ? styles.monthNavButtonPressed : null,
                        ];
                      }}
                    >
                      <Feather name="chevron-right" size={20} color={colors.text} />
                    </Pressable>
                  </View>

                  <View style={styles.weekdayRow}>
                    {WEEKDAY_SHORT.map((label) => (
                      <Text
                        key={label}
                        style={styles.weekdayLabel}
                      >
                        {label}
                      </Text>
                    ))}
                  </View>

                  <View style={styles.calendarGrid}>
                    {calendarCells.map((cell) => {
                      if (!cell.inMonth || cell.day === null || !cell.dateKey) {
                        return (
                          <View key={cell.key} style={styles.dayCell} />
                        );
                      }
                      return (
                        <Pressable
                          key={cell.key}
                          accessibilityRole="button"
                          hitSlop={{ bottom: 8, left: 8, right: 8, top: 8 }}
                          onPress={() => handleOpenDay(cell.dateKey!)}
                          style={(state) => {
                            const hovered =
                              (state as typeof state & { hovered?: boolean })
                                .hovered ?? false;
                            return [
                              styles.dayCell,
                              styles.dayCellInteractive,
                              cell.isToday ? styles.dayCellToday : null,
                              cell.isSelected ? styles.dayCellSelected : null,
                              hovered && !cell.isSelected
                                ? styles.dayCellHovered
                                : null,
                              state.pressed ? styles.dayCellPressed : null,
                            ];
                          }}
                        >
                          <Text
                            style={[
                              styles.dayNumber,
                              cell.isToday ? styles.dayNumberToday : null,
                              cell.isSelected ? styles.dayNumberSelected : null,
                            ]}
                          >
                            {cell.day}
                          </Text>
                          {cell.eventsCount > 0 ? (
                            <View
                              style={[
                                styles.dayDotRow,
                                cell.eventsCount >= 3
                                  ? styles.dayDotRowWide
                                  : null,
                              ]}
                            >
                              {Array.from({ length: Math.min(cell.eventsCount, 3) }).map(
                                (_, idx) => (
                                  <View
                                    key={idx}
                                    style={[
                                      styles.dayDot,
                                      cell.isSelected
                                        ? styles.dayDotSelected
                                        : cell.isToday
                                          ? styles.dayDotToday
                                          : null,
                                    ]}
                                  />
                                ),
                              )}
                            </View>
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </View>

                  <View style={styles.calendarLegend}>
                    <View style={styles.legendItem}>
                      <View style={styles.dayDot} />
                      <Text style={styles.legendText}>
                        1-2 hitos del día
                      </Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.dayDot, styles.dayDotAlt]} />
                      <View style={styles.dayDotRowNarrow}>
                        <View style={styles.dayDot} />
                        <View style={styles.dayDot} />
                        <View style={styles.dayDot} />
                      </View>
                      <Text style={styles.legendText}>3+ hitos</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.dayDotSample, styles.dayDotSampleToday]} />
                      <Text style={styles.legendText}>Hoy</Text>
                    </View>
                  </View>
                </AppCard>
              </View>
            </>
          )}
        </View>
      </AdminShell>

      <AppModal
        nativeID="screens-admin-trajectory-detail-day-modal"
        visible={isDayModalVisible}
        title={selectedDateKey ? formatLongDate(selectedDateKey) : "Sucesos del día"}
        description={
          selectedDateKey
            ? `${selectedEvents.length} ${selectedEvents.length === 1 ? "suceso" : "sucesos"} registrados`
            : undefined
        }
        onClose={handleCloseDay}
        testID="screens-admin-trajectory-detail-day-modal"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.dayModalContent}
        >
          {dayModalError ? (
            <AppCard
              nativeID="screens-admin-trajectory-detail-day-modal-error"
              style={[styles.feedbackCard, styles.feedbackDanger]}
              testID="screens-admin-trajectory-detail-day-modal-error"
            >
              <Text style={styles.feedbackText}>{dayModalError}</Text>
            </AppCard>
          ) : null}

          {selectedEvents.length === 0 && !isCreatingNew ? (
            <AppCard
              nativeID="screens-admin-trajectory-detail-day-modal-empty"
              style={styles.emptyCard}
              testID="screens-admin-trajectory-detail-day-modal-empty"
            >
              <Text style={styles.emptyTitle}>Todavía no hay sucesos</Text>
              <Text style={styles.emptyDescription}>
                Agrega el primer recuerdo de este día para comenzar a construir la trayectoria.
              </Text>
            </AppCard>
          ) : null}

          <ScrollView
            contentContainerStyle={styles.dayEventsList}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {selectedEvents.map((event) => {
              const isEditing = editingEventId === event.id;
              return (
                <AppCard
                  key={event.id}
                  nativeID={`screens-admin-trajectory-detail-event-${event.id}`}
                  style={styles.eventCard}
                  testID={`screens-admin-trajectory-detail-event-${event.id}`}
                >
                  {isEditing ? (
                    <View style={styles.eventEditRow}>
                      <AppInput
                        nativeID={`screens-admin-trajectory-detail-event-edit-input-${event.id}`}
                        testID={`screens-admin-trajectory-detail-event-edit-input-${event.id}`}
                        label="Editar suceso"
                        placeholder="Ej: Graduación cinta azul"
                        value={editingContent}
                        onChangeText={setEditingContent}
                        multiline
                      />
                      <View style={styles.eventEditActions}>
                        <AppButton
                          label="Guardar"
                          nativeID={`screens-admin-trajectory-detail-event-edit-save-${event.id}`}
                          onPress={handleSubmitEdit}
                          loading={updateEventMutation.isPending}
                          testID={`screens-admin-trajectory-detail-event-edit-save-${event.id}`}
                          variant="success"
                        />
                        <AppButton
                          label="Cancelar"
                          nativeID={`screens-admin-trajectory-detail-event-edit-cancel-${event.id}`}
                          onPress={handleCancelEdit}
                          testID={`screens-admin-trajectory-detail-event-edit-cancel-${event.id}`}
                          variant="secondary"
                        />
                      </View>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.eventContent}>{event.content}</Text>
                      <Text style={styles.eventMeta}>
                        Guardado el {formatDate(event.created_at)}
                      </Text>
                      <View style={styles.eventActionsRow}>
                        <Pressable
                          accessibilityRole="link"
                          hitSlop={{ bottom: 8, left: 8, right: 8, top: 8 }}
                          onPress={() => handleStartEdit(event)}
                          style={(state) => {
                            const hovered =
                              (state as typeof state & { hovered?: boolean }).hovered ??
                              false;
                            return [
                              styles.eventActionLink,
                              hovered ? styles.eventActionLinkHovered : null,
                              state.pressed ? styles.eventActionLinkPressed : null,
                            ];
                          }}
                        >
                          <Text
                            style={[
                              styles.eventActionLinkLabel,
                              styles.eventActionLinkUnderlined,
                            ]}
                          >
                            Editar
                          </Text>
                        </Pressable>
                        <Pressable
                          accessibilityRole="link"
                          hitSlop={{ bottom: 8, left: 8, right: 8, top: 8 }}
                          onPress={() => handleRemove(event.id)}
                          style={(state) => {
                            const hovered =
                              (state as typeof state & { hovered?: boolean }).hovered ??
                              false;
                            return [
                              styles.eventActionLink,
                              styles.eventActionLinkDanger,
                              hovered ? styles.eventActionLinkDangerHovered : null,
                              state.pressed ? styles.eventActionLinkPressed : null,
                            ];
                          }}
                        >
                          <Text
                            style={[
                              styles.eventActionLinkLabel,
                              styles.eventActionLinkDangerLabel,
                              styles.eventActionLinkUnderlined,
                            ]}
                          >
                            Eliminar
                          </Text>
                        </Pressable>
                      </View>
                    </>
                  )}
                </AppCard>
              );
            })}
          </ScrollView>

          {isCreatingNew ? (
            <View style={styles.newEventBlock}>
              <AppInput
                nativeID="screens-admin-trajectory-detail-day-modal-new-input"
                testID="screens-admin-trajectory-detail-day-modal-new-input"
                label="Nuevo suceso"
                placeholder="Ej: Graduación cinta azul"
                value={draftContent}
                onChangeText={setDraftContent}
                multiline
              />
              <View style={styles.newEventCounterRow}>
                <Text style={styles.newEventCounter}>
                  {draftContent.length}/280
                </Text>
              </View>
              <View style={styles.newEventActionsRow}>
                <AppButton
                  label="Guardar"
                  loading={createEventMutation.isPending}
                  nativeID="screens-admin-trajectory-detail-day-modal-new-submit"
                  onPress={handleSubmitNew}
                  testID="screens-admin-trajectory-detail-day-modal-new-submit"
                  variant="success"
                />
                <AppButton
                  label="Cancelar"
                  nativeID="screens-admin-trajectory-detail-day-modal-new-cancel"
                  onPress={() => {
                    setIsCreatingNew(false);
                    setDraftContent("");
                  }}
                  testID="screens-admin-trajectory-detail-day-modal-new-cancel"
                  variant="secondary"
                />
              </View>
            </View>
          ) : (
            <View style={styles.addActionRow}>
              <AppButton
                label="+ Agregar recuerdo"
                nativeID="screens-admin-trajectory-detail-day-modal-add-button"
                onPress={() => {
                  setIsCreatingNew(true);
                  setDraftContent("");
                  setDayModalError(null);
                  setTimeout(() => {
                    if (Platform.OS === "web") {
                      newContentInputRef.current?.focus();
                    }
                  }, 80);
                }}
                testID="screens-admin-trajectory-detail-day-modal-add-button"
                variant="primary"
              />
            </View>
          )}
        </KeyboardAvoidingView>
      </AppModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    width: "100%",
  },
  container: {
    alignSelf: "center",
    gap: spacing.lg,
    width: "100%",
  },
  backRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  backLink: {
    alignItems: "center",
    borderRadius: radius.sm,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 6,
  },
  backLinkHovered: {
    backgroundColor: colors.actionSoft ?? colors.primarySoft,
  },
  backLinkPressed: {
    opacity: 0.84,
  },
  backLinkLabel: {
    color: colors.action,
    fontFamily: typography.headingFamily,
    fontSize: 13,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  feedbackCard: {
    borderRadius: radius.md,
    padding: spacing.md,
  },
  feedbackSuccess: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
    borderWidth: 1,
  },
  feedbackDanger: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
    borderWidth: 1,
  },
  feedbackText: {
    color: colors.text,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 20,
  },
  loadingCard: {
    alignItems: "center",
    padding: spacing.xl,
  },
  loadingText: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
  },
  errorBlock: {
    flex: 1,
  },
  studentCard: {
    padding: spacing.md,
  },
  studentCardRow: {
    alignItems: "center",
    gap: spacing.md,
  },
  studentPhotoWrap: {
    alignItems: "center",
  },
  studentPhoto: {
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  studentPhotoEmpty: {
    backgroundColor: colors.primarySoft,
  },
  studentPhotoInitials: {
    color: colors.primary,
    fontFamily: typography.headingFamily,
    fontSize: 22,
    fontWeight: "800",
  },
  studentInfo: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  studentName: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 20,
    fontWeight: "800",
  },
  studentMeta: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 18,
  },
  studentInfoDetails: {
    marginTop: spacing.xs,
  },
  studentStats: {
    gap: spacing.md,
  },
  studentStat: {
    alignItems: "center",
    gap: 2,
  },
  studentStatValue: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 22,
    fontWeight: "800",
  },
  studentStatLabel: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
    textTransform: "lowercase",
  },
  calendarWrap: {
    width: "100%",
  },
  calendarCard: {
    padding: spacing.md,
  },
  calendarHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  monthNavButton: {
    alignItems: "center",
    borderRadius: radius.sm,
    height: 40,
    justifyContent: "center",
    minWidth: 40,
    paddingHorizontal: spacing.xs,
  },
  monthNavButtonHovered: {
    backgroundColor: colors.surfaceAlt,
  },
  monthNavButtonPressed: {
    opacity: 0.84,
  },
  monthTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  weekdayRow: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    marginBottom: spacing.xs,
    paddingBottom: spacing.xs,
  },
  weekdayLabel: {
    color: colors.textMuted,
    flex: 1,
    fontFamily: typography.headingFamily,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    textTransform: "uppercase",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: "100%",
  },
  dayCell: {
    aspectRatio: 1,
    flexBasis: `${100 / 7}%`,
    padding: 2,
  },
  dayCellInteractive: {
    alignItems: "center",
    borderRadius: radius.md,
    gap: 2,
    justifyContent: "center",
    padding: spacing.xs,
  },
  dayCellToday: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
  },
  dayCellHovered: {
    backgroundColor: colors.primarySoft,
  },
  dayCellPressed: {
    opacity: 0.88,
  },
  dayNumber: {
    color: colors.text,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    fontWeight: "500",
  },
  dayNumberToday: {
    color: colors.primary,
    fontWeight: "700",
  },
  dayNumberSelected: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  dayDotRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 3,
    justifyContent: "center",
    marginTop: 2,
  },
  dayDotRowWide: {
    gap: 3,
  },
  dayDotRowNarrow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 2,
  },
  dayDot: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 6,
    width: 6,
  },
  dayDotAlt: {
    backgroundColor: colors.gold,
  },
  dayDotToday: {
    backgroundColor: colors.primary,
  },
  dayDotSelected: {
    backgroundColor: colors.gold,
  },
  dayDotSample: {
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  dayDotSampleToday: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  calendarLegend: {
    alignItems: "center",
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "flex-start",
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  legendItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  legendText: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
  },
  dayModalContent: {
    gap: spacing.md,
  },
  dayEventsList: {
    gap: spacing.sm,
  },
  emptyCard: {
    alignItems: "center",
    gap: spacing.xs,
    padding: spacing.lg,
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
    textAlign: "center",
  },
  eventCard: {
    gap: spacing.xs,
    padding: spacing.md,
  },
  eventContent: {
    color: colors.text,
    fontFamily: typography.bodyFamily,
    fontSize: 15,
    lineHeight: 22,
  },
  eventMeta: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
  },
  eventActionsRow: {
    flexDirection: "row",
    gap: spacing.lg,
    marginTop: spacing.xs,
  },
  eventActionLink: {
    alignSelf: "flex-start",
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
  },
  eventActionLinkHovered: {
    backgroundColor: colors.actionSoft ?? colors.primarySoft,
  },
  eventActionLinkDanger: {},
  eventActionLinkDangerHovered: {
    backgroundColor: colors.dangerSoft,
  },
  eventActionLinkPressed: {
    opacity: 0.84,
  },
  eventActionLinkLabel: {
    color: colors.action,
    fontFamily: typography.headingFamily,
    fontSize: 12,
    fontWeight: "700",
  },
  eventActionLinkDangerLabel: {
    color: colors.danger,
  },
  eventActionLinkUnderlined: {
    textDecorationLine: "underline",
  },
  eventEditRow: {
    gap: spacing.sm,
  },
  eventEditActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  newEventBlock: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  newEventCounterRow: {
    alignItems: "flex-end",
  },
  newEventCounter: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
  },
  newEventActionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  addActionRow: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
  },
});

const mobileStyles = StyleSheet.create({
  studentCardRow: {
    alignItems: "flex-start",
    flexDirection: "column",
  },
  studentStats: {
    alignSelf: "stretch",
    flexDirection: "row",
    gap: spacing.xl,
    justifyContent: "flex-start",
    paddingLeft: spacing.sm,
  },
});
