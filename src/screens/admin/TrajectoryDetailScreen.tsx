import { Feather } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, KeyboardAvoidingView, Pressable, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { getErrorMessage } from "@/api/http";
import { branchesApi } from "@/api/branchesApi";
import { classesApi } from "@/api/classesApi";
import { fightRecordsApi } from "@/api/fightRecordsApi";
import { studentsApi } from "@/api/studentsApi";
import { trajectoryApi } from "@/api/trajectoryApi";
import { AppButton } from "@/components/AppButton";
import { AppCard } from "@/components/AppCard";
import { AppDateInput } from "@/components/AppDateInput";
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
import type {
  FightRecordType,
  Student,
  StudentFightRecord,
  StudentStatus,
  TrajectoryEvent,
} from "@/types/api";
import {
  formatCurrency,
  formatDate,
  formatPaymentStatus,
} from "@/utils/format";

function formatStudentStatus(status: StudentStatus): string {
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

function formatDateIso(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatFightTypeLabel(t: FightRecordType): string {
  switch (t) {
    case "victoria":
      return "Victoria";
    case "empate":
      return "Empate";
    case "derrota":
      return "Derrota";
  }
}

function getFightTypeColor(t: FightRecordType): string {
  switch (t) {
    case "victoria":
      return colors.success;
    case "empate":
      return colors.warning;
    case "derrota":
      return colors.danger;
  }
}

function getFightTypeSoftColor(t: FightRecordType): string {
  switch (t) {
    case "victoria":
      return colors.successSoft;
    case "empate":
      return colors.warningSoft;
    case "derrota":
      return colors.dangerSoft;
  }
}

function getStudentPaymentColor(status: Student["payment_status"]): string {
  switch (status) {
    case "up_to_date":
      return colors.success;
    case "partial":
    case "due_soon":
      return colors.warning;
    case "late":
    case "overdue":
      return colors.danger;
    default:
      return colors.textMuted;
  }
}

function getStudentStatusColor(status: StudentStatus): string {
  switch (status) {
    case "active":
      return colors.success;
    case "frozen":
      return colors.warning;
    default:
      return colors.textMuted;
  }
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
  const [datePickerValue, setDatePickerValue] = useState<string>("");
  const [isFightRecordModalVisible, setIsFightRecordModalVisible] = useState(false);
  const [isCreatingFightRecord, setIsCreatingFightRecord] = useState(false);
  const [editingFightRecordId, setEditingFightRecordId] = useState<number | null>(null);
  const [draftFightType, setDraftFightType] = useState<FightRecordType>("victoria");
  const [draftFightOpponent, setDraftFightOpponent] = useState("");
  const [draftFightDate, setDraftFightDate] = useState<string>(formatDateIso(new Date()));
  const [fightRecordError, setFightRecordError] = useState<string | null>(null);
  const newContentInputRef = useRef<TextInput>(null);
  const editContentInputRef = useRef<TextInput>(null);

  const studentQuery = useQuery({
    queryKey: ["student", studentId],
    queryFn: () => studentsApi.getById(studentId),
  });

  const fightRecordsQuery = useQuery({
    queryKey: ["fight-records", studentId],
    queryFn: () => fightRecordsApi.list({ student_id: studentId }),
    enabled: Boolean(studentId),
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

  const student: Student | null = studentQuery.data ?? null;

  const branchesQuery = useQuery({
    queryKey: ["branches", "trajectory-detail", student?.organization_id],
    queryFn: () =>
      branchesApi.list({
        organizationId: student?.organization_id,
        isActive: true,
      }),
    enabled: Boolean(student?.organization_id),
  });

  const classesQuery = useQuery({
    queryKey: ["classes", "trajectory-detail", student?.organization_id, student?.branch_id],
    queryFn: () =>
      classesApi.list({
        organizationId: student?.organization_id,
        branchId: student?.branch_id,
        isActive: true,
      }),
    enabled: Boolean(student?.organization_id && student?.branch_id),
  });

  const branch = (branchesQuery.data ?? []).find((item) => item.id === student?.branch_id) ?? null;
  const primaryClass =
    (classesQuery.data ?? []).find((item) => item.id === student?.primary_class_id) ?? null;

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

  const lastEvent = useMemo(() => {
    if (events.length === 0) return null;
    return events.reduce((latest, current) =>
      current.event_date > latest.event_date ? current : latest
    );
  }, [events]);

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

  const fightRecords = fightRecordsQuery.data ?? [];
  const fightTotals = useMemo(() => {
    const totals = { victoria: 0, empate: 0, derrota: 0 };
    fightRecords.forEach((r) => {
      totals[r.record_type] += 1;
    });
    return totals;
  }, [fightRecords]);

  const createFightMutation = useMutation({
    mutationFn: fightRecordsApi.create,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["fight-records", studentId] });
      await queryClient.invalidateQueries({ queryKey: ["student", studentId] });
      setIsCreatingFightRecord(false);
      setDraftFightType("victoria");
      setDraftFightOpponent("");
      setDraftFightDate(formatDateIso(new Date()));
      setFightRecordError(null);
      setFeedbackTone("success");
      setFeedbackMessage("Registro deportivo agregado.");
    },
    onError: (error) => {
      setFightRecordError(getErrorMessage(error));
    },
  });

  const updateFightMutation = useMutation({
    mutationFn: ({
      recordId,
      payload,
    }: {
      recordId: number;
      payload: { record_type?: FightRecordType; opponent_name?: string; fight_date?: string };
    }) => fightRecordsApi.update(recordId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["fight-records", studentId] });
      await queryClient.invalidateQueries({ queryKey: ["student", studentId] });
      setEditingFightRecordId(null);
      setDraftFightType("victoria");
      setDraftFightOpponent("");
      setDraftFightDate(formatDateIso(new Date()));
      setFightRecordError(null);
      setFeedbackTone("success");
      setFeedbackMessage("Registro deportivo actualizado.");
    },
    onError: (error) => {
      setFightRecordError(getErrorMessage(error));
    },
  });

  const removeFightMutation = useMutation({
    mutationFn: (recordId: number) => fightRecordsApi.remove(recordId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["fight-records", studentId] });
      await queryClient.invalidateQueries({ queryKey: ["student", studentId] });
      setFightRecordError(null);
      setFeedbackTone("success");
      setFeedbackMessage("Registro deportivo eliminado.");
    },
    onError: (error) => {
      setFightRecordError(getErrorMessage(error));
    },
  });

  const handleOpenFightRecord = useCallback(() => {
    setIsFightRecordModalVisible(true);
    setIsCreatingFightRecord(false);
    setEditingFightRecordId(null);
    setDraftFightType("victoria");
    setDraftFightOpponent("");
    setDraftFightDate(formatDateIso(new Date()));
    setFightRecordError(null);
  }, []);

  const handleCloseFightRecord = useCallback(() => {
    setIsFightRecordModalVisible(false);
    setIsCreatingFightRecord(false);
    setEditingFightRecordId(null);
    setDraftFightType("victoria");
    setDraftFightOpponent("");
    setDraftFightDate(formatDateIso(new Date()));
    setFightRecordError(null);
  }, []);

  const handleStartEditFight = useCallback((record: StudentFightRecord) => {
    setEditingFightRecordId(record.id);
    setDraftFightType(record.record_type);
    setDraftFightOpponent(record.opponent_name);
    setDraftFightDate(record.fight_date);
    setIsCreatingFightRecord(false);
    setFightRecordError(null);
  }, []);

  const handleCancelEditFight = useCallback(() => {
    setEditingFightRecordId(null);
    setDraftFightType("victoria");
    setDraftFightOpponent("");
    setDraftFightDate(formatDateIso(new Date()));
    setFightRecordError(null);
  }, []);

  const handleSubmitFightRecord = useCallback(() => {
    const opponentTrimmed = draftFightOpponent.trim();
    if (opponentTrimmed.length === 0) {
      setFightRecordError("Escribe el nombre del rival.");
      return;
    }
    if (opponentTrimmed.length > 50) {
      setFightRecordError("El nombre del rival no puede exceder 50 caracteres.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draftFightDate)) {
      setFightRecordError("Usa el formato YYYY-MM-DD para la fecha.");
      return;
    }

    if (editingFightRecordId !== null) {
      updateFightMutation.mutate({
        recordId: editingFightRecordId,
        payload: {
          record_type: draftFightType,
          opponent_name: opponentTrimmed,
          fight_date: draftFightDate,
        },
      });
    } else {
      createFightMutation.mutate({
        student_id: studentId,
        record_type: draftFightType,
        opponent_name: opponentTrimmed,
        fight_date: draftFightDate,
      });
    }
  }, [
    createFightMutation,
    draftFightDate,
    draftFightOpponent,
    draftFightType,
    editingFightRecordId,
    studentId,
    updateFightMutation,
  ]);

  const handleRemoveFight = useCallback(
    (recordId: number) => {
      removeFightMutation.mutate(recordId);
    },
    [removeFightMutation],
  );

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

  const handleDatePickerChange = useCallback((raw: string) => {
    setDatePickerValue(raw);
    const trimmed = raw.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return;
    }
    const parsed = fromDateKey(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      return;
    }
    setCursor(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
    setSelectedDateKey(trimmed);
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
          style={[{ width: "100%", alignSelf: "center" }, { maxWidth: contentMaxWidth }]}
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
        showBackButton
        onBack={handleGoBack}
        headerMainContent={
          <View
            nativeID="screens-admin-trajectory-detail-header-block"
            style={styles.headerBlock}
            testID="screens-admin-trajectory-detail-header-block"
          >
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

            {studentQuery.isLoading || eventsQuery.isLoading || fightRecordsQuery.isLoading || branchesQuery.isLoading || classesQuery.isLoading ? (
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
                  style={styles.summaryCard}
                  testID="screens-admin-trajectory-detail-student-card"
                >
                  <View
                    style={[
                      styles.summaryHeaderSection,
                      isDesktop ? desktopStyles.summaryHeaderSection : mobileStyles.summaryHeaderSection,
                    ]}
                  >
                    <View style={styles.summaryPhotoBlock} testID="screens-admin-trajectory-detail-student-photo-block">
                      {student.photo_url ? (
                        <Image
                          accessibilityLabel={`Foto de ${student.first_name} ${student.last_name}`}
                          source={{ uri: student.photo_url }}
                          style={styles.summaryPhoto}
                          testID="screens-admin-trajectory-detail-student-photo"
                        />
                      ) : (
                        <View
                          accessibilityLabel={`Iniciales del alumno ${student.first_name} ${student.last_name}`}
                          style={styles.summaryPhotoPlaceholder}
                          testID="screens-admin-trajectory-detail-student-photo-placeholder"
                        >
                          <Text style={styles.summaryPhotoInitials} accessible={false}>
                            {student.first_name.charAt(0)}
                            {student.last_name.charAt(0)}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.summaryHeaderCopy} testID="screens-admin-trajectory-detail-student-header-copy">
                      <Text style={styles.summaryHeaderName} testID="screens-admin-trajectory-detail-student-name">
                        {student.first_name} {student.last_name}
                      </Text>
                      <Text style={styles.summaryHeaderCode} testID="screens-admin-trajectory-detail-student-code">
                        Código {student.unique_code}
                      </Text>
                      <View style={styles.summaryHeaderBeltRow} testID="screens-admin-trajectory-detail-student-belt-row">
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
                        styles.summaryStatsBlock,
                        isDesktop ? null : mobileStyles.summaryStatsBlock,
                      ]}
                    >
                      <View style={styles.summaryStatItem}>
                        <Text style={styles.summaryStatValue}>{totalEvents}</Text>
                        <Text style={styles.summaryStatLabel}>sucesos</Text>
                      </View>
                      <View style={styles.summaryStatItem}>
                        <Text style={styles.summaryStatValue}>{uniqueDays}</Text>
                        <Text style={styles.summaryStatLabel}>días</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.summaryDivider} />

                  <View
                    style={[
                      styles.summaryTwoColGrid,
                      isDesktop ? desktopStyles.summaryTwoColGrid : mobileStyles.summaryTwoColGrid,
                    ]}
                  >
                    <View style={styles.summaryInfoBlock} testID="screens-admin-trajectory-detail-student-status-block">
                      <Text style={styles.summarySectionLabel}>Estado</Text>
                      <View style={styles.summaryInfoRow} nativeID="screens-admin-trajectory-detail-student-status-payment" testID="screens-admin-trajectory-detail-student-status-payment">
                        <Text style={styles.summaryInfoRowLabel}>Pago</Text>
                        <Text style={[styles.summaryInfoRowValue, { color: getStudentPaymentColor(student.payment_status) }]}>
                          {formatPaymentStatus(student.payment_status)}
                        </Text>
                      </View>
                      <View style={styles.summaryInfoRow} nativeID="screens-admin-trajectory-detail-student-status-student" testID="screens-admin-trajectory-detail-student-status-student">
                        <Text style={styles.summaryInfoRowLabel}>Alumno</Text>
                        <Text style={[styles.summaryInfoRowValue, { color: getStudentStatusColor(student.status) }]}>
                          {formatStudentStatus(student.status)}
                        </Text>
                      </View>
                      <View style={styles.summaryInfoRow} nativeID="screens-admin-trajectory-detail-student-status-next" testID="screens-admin-trajectory-detail-student-status-next">
                        <Text style={styles.summaryInfoRowLabel}>Próximo pago</Text>
                        <Text style={styles.summaryInfoRowValue}>{formatDate(student.next_payment_date)}</Text>
                      </View>
                      <View style={styles.summaryInfoRow} nativeID="screens-admin-trajectory-detail-student-status-fee" testID="screens-admin-trajectory-detail-student-status-fee">
                        <Text style={styles.summaryInfoRowLabel}>Mensualidad</Text>
                        <Text style={styles.summaryInfoRowValue}>{formatCurrency(student.monthly_fee, student.currency)}</Text>
                      </View>
                    </View>

                    <View style={styles.summaryInfoBlock} testID="screens-admin-trajectory-detail-student-profile-block">
                      <Text style={styles.summarySectionLabel}>Perfil</Text>
                      <View style={styles.summaryInfoRow} nativeID="screens-admin-trajectory-detail-student-profile-birth" testID="screens-admin-trajectory-detail-student-profile-birth">
                        <Text style={styles.summaryInfoRowLabel}>Nacimiento</Text>
                        <Text style={styles.summaryInfoRowValue}>
                          {formatDate(student.birth_date)} · {student.birth_place}
                        </Text>
                      </View>
                      <View style={styles.summaryInfoRow} nativeID="screens-admin-trajectory-detail-student-profile-enrollment" testID="screens-admin-trajectory-detail-student-profile-enrollment">
                        <Text style={styles.summaryInfoRowLabel}>Inscripción</Text>
                        <Text style={styles.summaryInfoRowValue}>{formatDate(student.enrollment_date)}</Text>
                      </View>
                      <View style={styles.summaryInfoRow} nativeID="screens-admin-trajectory-detail-student-profile-branch" testID="screens-admin-trajectory-detail-student-profile-branch">
                        <Text style={styles.summaryInfoRowLabel}>Sucursal</Text>
                        <Text style={styles.summaryInfoRowValue}>
                          {branch ? `${branch.name} · ${branch.city}` : `ID ${student.branch_id}`}
                        </Text>
                      </View>
                      <View style={styles.summaryInfoRow} nativeID="screens-admin-trajectory-detail-student-profile-class" testID="screens-admin-trajectory-detail-student-profile-class">
                        <Text style={styles.summaryInfoRowLabel}>Clase</Text>
                        <Text style={styles.summaryInfoRowValue}>{primaryClass?.name ?? "No asignada"}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.summaryDivider} />

                  <View style={styles.summaryInfoBlock} testID="screens-admin-trajectory-detail-student-contact-block">
                    <Text style={styles.summarySectionLabel}>Contacto</Text>
                    <View style={styles.summaryInfoRow} nativeID="screens-admin-trajectory-detail-student-guardian-name" testID="screens-admin-trajectory-detail-student-guardian-name">
                      <Text style={styles.summaryInfoRowLabel}>Tutor</Text>
                      <Text style={styles.summaryInfoRowValue}>{student.guardian_name ?? "No registrado"}</Text>
                    </View>
                    <View style={styles.summaryInfoRow} nativeID="screens-admin-trajectory-detail-student-guardian-phone" testID="screens-admin-trajectory-detail-student-guardian-phone">
                      <Text style={styles.summaryInfoRowLabel}>Teléfono</Text>
                      <Text style={styles.summaryInfoRowValue}>{student.guardian_phone ?? "No registrado"}</Text>
                    </View>
                  </View>

                  <View style={styles.summaryDivider} />

                  <View
                    nativeID="screens-admin-trajectory-detail-student-fight-record-block"
                    style={styles.fightRecordBlock}
                    testID="screens-admin-trajectory-detail-student-fight-record-block"
                  >
                    <View style={styles.fightRecordHeaderRow}>
                      <Text style={styles.summarySectionLabel}>Récord deportivo</Text>
                      <AppButton
                        label="Editar"
                        nativeID="screens-admin-trajectory-detail-student-fight-record-edit-button"
                        onPress={handleOpenFightRecord}
                        testID="screens-admin-trajectory-detail-student-fight-record-edit-button"
                        variant="secondary"
                      />
                    </View>
                    <View style={styles.fightRecordStatsRow} testID="screens-admin-trajectory-detail-student-fight-record-stats">
                      <FightRecordStat
                        idPrefix="screens-admin-trajectory-detail-student-fight-record-wins"
                        label="Victorias"
                        value={fightTotals.victoria}
                        tone="victoria"
                      />
                      <FightRecordStat
                        idPrefix="screens-admin-trajectory-detail-student-fight-record-draws"
                        label="Empates"
                        value={fightTotals.empate}
                        tone="empate"
                      />
                      <FightRecordStat
                        idPrefix="screens-admin-trajectory-detail-student-fight-record-losses"
                        label="Derrotas"
                        value={fightTotals.derrota}
                        tone="derrota"
                      />
                    </View>
                  </View>

                  <View style={styles.summaryDivider} />

                  <View style={styles.summaryLastEventBlock} testID="screens-admin-trajectory-detail-student-last-event-block">
                    <View style={styles.summaryLastEventHeader}>
                      <Text style={styles.summarySectionLabel}>Último suceso</Text>
                      <Feather name="award" size={14} color={colors.gold} />
                    </View>
                    {lastEvent ? (
                      <View style={styles.summaryLastEventCard}>
                        <View style={styles.summaryLastEventTopRow}>
                          <Text style={styles.summaryLastEventDate}>
                            {formatLongDate(lastEvent.event_date)}
                          </Text>
                          <Text style={styles.summaryLastEventMeta}>
                            Guardado el {formatDate(lastEvent.created_at)}
                          </Text>
                        </View>
                        <Text style={styles.summaryLastEventContent}>{lastEvent.content}</Text>
                        <Pressable
                          accessibilityRole="link"
                          hitSlop={{ bottom: 8, left: 8, right: 8, top: 8 }}
                          onPress={() => {
                            const d = fromDateKey(lastEvent.event_date);
                            setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
                            setSelectedDateKey(lastEvent.event_date);
                            setIsDayModalVisible(true);
                            setIsCreatingNew(false);
                            setDraftContent("");
                            setEditingEventId(null);
                            setEditingContent("");
                            setDayModalError(null);
                          }}
                          style={(state) => {
                            const hovered =
                              (state as typeof state & { hovered?: boolean }).hovered ?? false;
                            return [
                              styles.summaryLastEventLink,
                              hovered ? styles.summaryLastEventLinkHovered : null,
                              state.pressed ? styles.summaryLastEventLinkPressed : null,
                            ];
                          }}
                        >
                          <Text style={[styles.summaryLastEventLinkLabel, styles.summaryLastEventLinkUnderlined]}>
                            Ver en el calendario
                          </Text>
                        </Pressable>
                      </View>
                    ) : (
                      <View style={styles.summaryLastEventEmpty}>
                        <Text style={styles.summaryLastEventEmptyTitle}>Sin sucesos registrados</Text>
                        <Text style={styles.summaryLastEventEmptyDesc}>
                          Selecciona un día en el calendario para agregar el primer recuerdo de la trayectoria de {student.first_name}.
                        </Text>
                      </View>
                    )}
                  </View>
                </AppCard>

                <View
                  nativeID="screens-admin-trajectory-detail-calendar-wrap"
                  style={styles.calendarWrap}
                  testID="screens-admin-trajectory-detail-calendar-wrap"
                >
                  <AppCard
                    nativeID="screens-admin-trajectory-detail-calendar-card"
                    style={[
                      styles.calendarCard,
                      Platform.OS === "web" ? (webStyles.calendarCardInline as never) : null,
                    ]}
                    testID="screens-admin-trajectory-detail-calendar-card"
                  >
                    {Platform.OS === "web" ? (
                      <div
                        data-testid="screens-admin-trajectory-detail-calendar-portal"
                        id="screens-admin-trajectory-detail-calendar-portal"
                        style={webStyles.calendarPortal as React.CSSProperties}
                      />
                    ) : null}
                    <View style={[styles.calendarTopBar, isDesktop ? desktopStyles.calendarTopBar : mobileStyles.calendarTopBar]}>
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

                      <View style={styles.datePickerWrap}>
                        <AppDateInput
                          label="Ir a fecha"
                          nativeID="screens-admin-trajectory-detail-date-picker"
                          testID="screens-admin-trajectory-detail-date-picker"
                          value={datePickerValue}
                          onChangeText={handleDatePickerChange}
                          placeholder="YYYY-MM-DD"
                          inlineContainerId={Platform.OS === "web" ? "screens-admin-trajectory-detail-calendar-portal" : undefined}
                          popperZIndex={50}
                        />
                      </View>
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
        }
      >
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

      <AppModal
        nativeID="screens-admin-trajectory-detail-fight-record-modal"
        visible={isFightRecordModalVisible}
        title="Récord deportivo"
        description={
          fightRecords.length > 0
            ? `${fightRecords.length} ${fightRecords.length === 1 ? "encuentro" : "encuentros"} registrados`
            : "Sin encuentros registrados"
        }
        onClose={handleCloseFightRecord}
        testID="screens-admin-trajectory-detail-fight-record-modal"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.fightRecordModalContent}
        >
          {fightRecordError ? (
            <AppCard
              nativeID="screens-admin-trajectory-detail-fight-record-modal-error"
              style={[styles.feedbackCard, styles.feedbackDanger]}
              testID="screens-admin-trajectory-detail-fight-record-modal-error"
            >
              <Text style={styles.feedbackText}>{fightRecordError}</Text>
            </AppCard>
          ) : null}

          <ScrollView
            contentContainerStyle={styles.fightRecordList}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {fightRecords.length === 0 && !isCreatingFightRecord && editingFightRecordId === null ? (
              <AppCard
                nativeID="screens-admin-trajectory-detail-fight-record-modal-empty"
                style={styles.emptyCard}
                testID="screens-admin-trajectory-detail-fight-record-modal-empty"
              >
                <Text style={styles.emptyTitle}>Sin peleas registradas</Text>
                <Text style={styles.emptyDescription}>
                  Agrega el primer registro deportivo para comenzar a construir el historial competitivo del alumno.
                </Text>
              </AppCard>
            ) : null}

            {fightRecords.map((record) => {
              const isEditing = editingFightRecordId === record.id;
              if (isEditing) {
                return (
                  <AppCard
                    key={record.id}
                    nativeID={`screens-admin-trajectory-detail-fight-record-edit-card-${record.id}`}
                    style={styles.fightRecordCard}
                    testID={`screens-admin-trajectory-detail-fight-record-edit-card-${record.id}`}
                  >
                    <FightRecordFormBlock
                      idPrefix={`screens-admin-trajectory-detail-fight-record-edit-${record.id}`}
                      typeValue={draftFightType}
                      onTypeChange={setDraftFightType}
                      opponentValue={draftFightOpponent}
                      onOpponentChange={setDraftFightOpponent}
                      dateValue={draftFightDate}
                      onDateChange={setDraftFightDate}
                      opponentCounter
                    />
                    <View style={styles.fightRecordFormActions}>
                      <AppButton
                        label="Guardar"
                        nativeID={`screens-admin-trajectory-detail-fight-record-edit-save-${record.id}`}
                        onPress={handleSubmitFightRecord}
                        loading={updateFightMutation.isPending}
                        testID={`screens-admin-trajectory-detail-fight-record-edit-save-${record.id}`}
                        variant="success"
                      />
                      <AppButton
                        label="Cancelar"
                        nativeID={`screens-admin-trajectory-detail-fight-record-edit-cancel-${record.id}`}
                        onPress={handleCancelEditFight}
                        testID={`screens-admin-trajectory-detail-fight-record-edit-cancel-${record.id}`}
                        variant="secondary"
                      />
                    </View>
                  </AppCard>
                );
              }
              return (
                <AppCard
                  key={record.id}
                  nativeID={`screens-admin-trajectory-detail-fight-record-card-${record.id}`}
                  style={[
                    styles.fightRecordCard,
                    { borderLeftColor: getFightTypeColor(record.record_type), borderLeftWidth: 4 },
                  ]}
                  testID={`screens-admin-trajectory-detail-fight-record-card-${record.id}`}
                >
                  <View style={styles.fightRecordCardTopRow}>
                    <View
                      nativeID={`screens-admin-trajectory-detail-fight-record-type-tag-${record.id}`}
                      style={[
                        styles.fightRecordTypeTag,
                        {
                          backgroundColor: getFightTypeSoftColor(record.record_type),
                          borderColor: getFightTypeColor(record.record_type),
                        },
                      ]}
                      testID={`screens-admin-trajectory-detail-fight-record-type-tag-${record.id}`}
                    >
                      <Text
                        style={[
                          styles.fightRecordTypeTagLabel,
                          { color: getFightTypeColor(record.record_type) },
                        ]}
                      >
                        {formatFightTypeLabel(record.record_type)}
                      </Text>
                    </View>
                    <Text style={styles.fightRecordDate}>{formatDate(record.fight_date)}</Text>
                  </View>
                  <Text style={styles.fightRecordOpponent}>
                    vs. <Text style={styles.fightRecordOpponentName}>{record.opponent_name}</Text>
                  </Text>
                  <View style={styles.fightRecordCardActionsRow}>
                    <Pressable
                      accessibilityRole="link"
                      hitSlop={{ bottom: 8, left: 8, right: 8, top: 8 }}
                      onPress={() => handleStartEditFight(record)}
                      style={(state) => {
                        const hovered =
                          (state as typeof state & { hovered?: boolean }).hovered ?? false;
                        return [
                          styles.fightRecordActionLink,
                          hovered ? styles.fightRecordActionLinkHovered : null,
                          state.pressed ? styles.fightRecordActionLinkPressed : null,
                        ];
                      }}
                    >
                      <Text
                        style={[
                          styles.fightRecordActionLinkLabel,
                          styles.fightRecordActionLinkUnderlined,
                        ]}
                      >
                        Editar
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="link"
                      hitSlop={{ bottom: 8, left: 8, right: 8, top: 8 }}
                      onPress={() => handleRemoveFight(record.id)}
                      style={(state) => {
                        const hovered =
                          (state as typeof state & { hovered?: boolean }).hovered ?? false;
                        return [
                          styles.fightRecordActionLink,
                          styles.fightRecordActionLinkDanger,
                          hovered ? styles.fightRecordActionLinkDangerHovered : null,
                          state.pressed ? styles.fightRecordActionLinkPressed : null,
                        ];
                      }}
                    >
                      <Text
                        style={[
                          styles.fightRecordActionLinkLabel,
                          styles.fightRecordActionLinkDangerLabel,
                          styles.fightRecordActionLinkUnderlined,
                        ]}
                      >
                        Eliminar
                      </Text>
                    </Pressable>
                  </View>
                </AppCard>
              );
            })}
          </ScrollView>

          {isCreatingFightRecord ? (
            <AppCard
              nativeID="screens-admin-trajectory-detail-fight-record-modal-new-card"
              style={styles.fightRecordCard}
              testID="screens-admin-trajectory-detail-fight-record-modal-new-card"
            >
              <FightRecordFormBlock
                idPrefix="screens-admin-trajectory-detail-fight-record-new"
                typeValue={draftFightType}
                onTypeChange={setDraftFightType}
                opponentValue={draftFightOpponent}
                onOpponentChange={setDraftFightOpponent}
                dateValue={draftFightDate}
                onDateChange={setDraftFightDate}
                opponentCounter
              />
              <View style={styles.fightRecordFormActions}>
                <AppButton
                  label="Guardar"
                  loading={createFightMutation.isPending}
                  nativeID="screens-admin-trajectory-detail-fight-record-new-save"
                  onPress={handleSubmitFightRecord}
                  testID="screens-admin-trajectory-detail-fight-record-new-save"
                  variant="success"
                />
                <AppButton
                  label="Cancelar"
                  nativeID="screens-admin-trajectory-detail-fight-record-new-cancel"
                  onPress={() => {
                    setIsCreatingFightRecord(false);
                    setDraftFightType("victoria");
                    setDraftFightOpponent("");
                    setDraftFightDate(formatDateIso(new Date()));
                    setFightRecordError(null);
                  }}
                  testID="screens-admin-trajectory-detail-fight-record-new-cancel"
                  variant="secondary"
                />
              </View>
            </AppCard>
          ) : editingFightRecordId === null ? (
            <View style={styles.addActionRow}>
              <AppButton
                label="+ Registrar encuentro"
                nativeID="screens-admin-trajectory-detail-fight-record-add-button"
                onPress={() => {
                  setIsCreatingFightRecord(true);
                  setEditingFightRecordId(null);
                  setDraftFightType("victoria");
                  setDraftFightOpponent("");
                  setDraftFightDate(formatDateIso(new Date()));
                  setFightRecordError(null);
                }}
                testID="screens-admin-trajectory-detail-fight-record-add-button"
                variant="primary"
              />
            </View>
          ) : null}
        </KeyboardAvoidingView>
      </AppModal>
    </Screen>
  );
}

type FightRecordStatTone = FightRecordType;

function FightRecordStat({
  label,
  value,
  tone,
  idPrefix,
}: {
  label: string;
  value: number;
  tone: FightRecordStatTone;
  idPrefix?: string;
}) {
  const baseId = idPrefix ?? `screens-admin-trajectory-detail-fight-stat-${tone}`;
  const accent = getFightTypeColor(tone);
  const softBg = getFightTypeSoftColor(tone);

  return (
    <View
      nativeID={baseId}
      style={[styles.fightRecordStatBox, { backgroundColor: softBg }]}
      testID={baseId}
    >
      <Text
        nativeID={`${baseId}-value`}
        style={[styles.fightRecordStatValue, { color: accent }]}
        testID={`${baseId}-value`}
      >
        {value}
      </Text>
      <View
        nativeID={`${baseId}-accent`}
        style={[styles.fightRecordStatAccent, { backgroundColor: accent }]}
        testID={`${baseId}-accent`}
      />
      <Text nativeID={`${baseId}-label`} style={styles.fightRecordStatLabel} testID={`${baseId}-label`}>
        {label}
      </Text>
    </View>
  );
}

function FightRecordFormBlock({
  idPrefix,
  typeValue,
  onTypeChange,
  opponentValue,
  onOpponentChange,
  dateValue,
  onDateChange,
  opponentCounter = false,
}: {
  idPrefix: string;
  typeValue: FightRecordType;
  onTypeChange: (v: FightRecordType) => void;
  opponentValue: string;
  onOpponentChange: (v: string) => void;
  dateValue: string;
  onDateChange: (v: string) => void;
  opponentCounter?: boolean;
}) {
  const options: Array<{ key: FightRecordType; label: string }> = [
    { key: "victoria", label: "Victoria" },
    { key: "empate", label: "Empate" },
    { key: "derrota", label: "Derrota" },
  ];

  return (
    <View nativeID={`${idPrefix}-form`} style={styles.fightRecordFormBlock} testID={`${idPrefix}-form`}>
      <View nativeID={`${idPrefix}-type-row`} style={styles.fightRecordTypeRow} testID={`${idPrefix}-type-row`}>
        {options.map((option) => {
          const selected = typeValue === option.key;
          const accent = getFightTypeColor(option.key);
          const softBg = getFightTypeSoftColor(option.key);
          return (
            <Pressable
              key={option.key}
              accessibilityRole="button"
              hitSlop={{ bottom: 8, left: 8, right: 8, top: 8 }}
              onPress={() => onTypeChange(option.key)}
              style={(state) => {
                const hovered =
                  (state as typeof state & { hovered?: boolean }).hovered ?? false;
                return [
                  styles.fightRecordTypeOption,
                  selected
                    ? {
                        backgroundColor: softBg,
                        borderColor: accent,
                      }
                    : null,
                  hovered && !selected ? { backgroundColor: colors.surfaceAlt } : null,
                  state.pressed ? { opacity: 0.9 } : null,
                ];
              }}
              testID={`${idPrefix}-type-option-${option.key}`}
            >
              <Text
                style={[
                  styles.fightRecordTypeOptionLabel,
                  selected ? { color: accent, fontWeight: "800" } : null,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <AppInput
        label="Rival (nombre y apellido)"
        maxLength={50}
        nativeID={`${idPrefix}-opponent-input`}
        onChangeText={onOpponentChange}
        placeholder="Ej: Juan Pérez"
        testID={`${idPrefix}-opponent-input`}
        value={opponentValue}
      />
      {opponentCounter ? (
        <View style={styles.fightRecordOpponentCounterRow}>
          <Text style={styles.fightRecordOpponentCounter}>{opponentValue.length}/50</Text>
        </View>
      ) : null}
      <AppDateInput
        label="Fecha del encuentro"
        nativeID={`${idPrefix}-date-input`}
        onChangeText={onDateChange}
        placeholder="YYYY-MM-DD"
        testID={`${idPrefix}-date-input`}
        value={dateValue}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    width: "100%",
  },
  headerBlock: {
    alignSelf: "center",
    gap: spacing.lg,
    width: "100%",
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
  summaryCard: {
    gap: spacing.lg,
    padding: spacing.lg,
  },
  summaryHeaderSection: {
    gap: spacing.md,
  },
  summaryPhotoBlock: {
    alignItems: "center",
  },
  summaryPhoto: {
    borderRadius: 999,
    borderColor: colors.border,
    borderWidth: 1,
    height: 88,
    width: 88,
  },
  summaryPhotoPlaceholder: {
    alignItems: "center",
    backgroundColor: colors.woodSoft,
    borderRadius: 999,
    borderColor: colors.border,
    borderWidth: 1,
    height: 88,
    justifyContent: "center",
    width: 88,
  },
  summaryPhotoInitials: {
    color: colors.woodStrong,
    fontFamily: typography.headingFamily,
    fontSize: 28,
    fontWeight: "800",
  },
  summaryHeaderCopy: {
    flex: 1,
    gap: 6,
  },
  summaryHeaderName: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 22,
    fontWeight: "800",
  },
  summaryHeaderCode: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
  },
  summaryHeaderBeltRow: {
    alignSelf: "flex-start",
  },
  summaryStatsBlock: {
    gap: spacing.md,
  },
  summaryStatItem: {
    alignItems: "center",
    gap: 2,
  },
  summaryStatValue: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 22,
    fontWeight: "800",
  },
  summaryStatLabel: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
    textTransform: "lowercase",
  },
  summaryDivider: {
    backgroundColor: colors.border,
    height: 1,
    width: "100%",
  },
  summaryTwoColGrid: {
    gap: spacing.md,
  },
  summaryInfoBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  summarySectionLabel: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 2,
    textTransform: "uppercase",
  },
  summaryInfoRow: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: 3,
    paddingVertical: spacing.xs,
  },
  summaryInfoRowLabel: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  summaryInfoRowValue: {
    color: colors.text,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  summaryLastEventBlock: {
    gap: spacing.sm,
  },
  summaryLastEventHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "space-between",
  },
  summaryLastEventCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderColor: colors.border,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  summaryLastEventTopRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  summaryLastEventDate: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 14,
    fontWeight: "800",
  },
  summaryLastEventMeta: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
  },
  summaryLastEventContent: {
    color: colors.text,
    fontFamily: typography.bodyFamily,
    fontSize: 15,
    lineHeight: 22,
  },
  summaryLastEventLink: {
    alignSelf: "flex-start",
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 6,
  },
  summaryLastEventLinkHovered: {
    backgroundColor: colors.actionSoft ?? colors.primarySoft,
  },
  summaryLastEventLinkPressed: {
    opacity: 0.84,
  },
  summaryLastEventLinkLabel: {
    color: colors.action,
    fontFamily: typography.headingFamily,
    fontSize: 13,
    fontWeight: "700",
  },
  summaryLastEventLinkUnderlined: {
    textDecorationLine: "underline",
  },
  summaryLastEventEmpty: {
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderColor: colors.border,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  summaryLastEventEmptyTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 16,
    fontWeight: "700",
  },
  summaryLastEventEmptyDesc: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  calendarWrap: {
    width: "100%",
  },
  calendarCard: {
    padding: spacing.md,
  },
  calendarTopBar: {
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md,
    width: "100%",
  },
  datePickerWrap: {
    width: "100%",
  },
  calendarHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
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
  fightRecordBlock: {
    gap: spacing.sm,
  },
  fightRecordHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  fightRecordStatsRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  fightRecordStatBox: {
    alignItems: "center",
    borderRadius: 16,
    flex: 1,
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: spacing.sm,
  },
  fightRecordStatValue: {
    fontFamily: typography.headingFamily,
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 30,
  },
  fightRecordStatAccent: {
    borderRadius: 999,
    height: 3,
    opacity: 0.85,
    width: 32,
  },
  fightRecordStatLabel: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  fightRecordModalContent: {
    gap: spacing.md,
  },
  fightRecordList: {
    gap: spacing.sm,
  },
  fightRecordCard: {
    gap: spacing.xs,
    padding: spacing.md,
  },
  fightRecordCardTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  fightRecordTypeTag: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  fightRecordTypeTagLabel: {
    fontFamily: typography.headingFamily,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  fightRecordDate: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
  },
  fightRecordOpponent: {
    color: colors.text,
    fontFamily: typography.bodyFamily,
    fontSize: 15,
    lineHeight: 22,
  },
  fightRecordOpponentName: {
    fontFamily: typography.headingFamily,
    fontWeight: "700",
  },
  fightRecordCardActionsRow: {
    flexDirection: "row",
    gap: spacing.lg,
    marginTop: spacing.xs,
  },
  fightRecordActionLink: {
    alignSelf: "flex-start",
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
  },
  fightRecordActionLinkHovered: {
    backgroundColor: colors.actionSoft ?? colors.primarySoft,
  },
  fightRecordActionLinkDanger: {},
  fightRecordActionLinkDangerHovered: {
    backgroundColor: colors.dangerSoft,
  },
  fightRecordActionLinkPressed: {
    opacity: 0.84,
  },
  fightRecordActionLinkLabel: {
    color: colors.action,
    fontFamily: typography.headingFamily,
    fontSize: 12,
    fontWeight: "700",
  },
  fightRecordActionLinkDangerLabel: {
    color: colors.danger,
  },
  fightRecordActionLinkUnderlined: {
    textDecorationLine: "underline",
  },
  fightRecordFormBlock: {
    gap: spacing.sm,
  },
  fightRecordTypeRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  fightRecordTypeOption: {
    alignItems: "center",
    borderRadius: radius.md,
    borderColor: colors.border,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 10,
  },
  fightRecordTypeOptionLabel: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 13,
    fontWeight: "700",
  },
  fightRecordFormActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  fightRecordOpponentCounterRow: {
    alignItems: "flex-end",
  },
  fightRecordOpponentCounter: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
  },
});

const mobileStyles = StyleSheet.create({
  summaryHeaderSection: {
    alignItems: "center",
    flexDirection: "column",
  },
  summaryHeaderCopy: {
    alignItems: "center",
  },
  summaryHeaderBeltRow: {
    alignSelf: "center",
  },
  summaryStatsBlock: {
    alignSelf: "stretch",
    flexDirection: "row",
    gap: spacing.xl,
    justifyContent: "center",
  },
  summaryTwoColGrid: {
    flexDirection: "column",
  },
  calendarTopBar: {
    flexDirection: "column",
  },
});

const desktopStyles = StyleSheet.create({
  summaryHeaderSection: {
    alignItems: "flex-start",
    flexDirection: "row",
  },
  summaryTwoColGrid: {
    flexDirection: "row",
  },
  calendarTopBar: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  datePickerWrap: {
    maxWidth: 320,
  },
});

const webStyles = {
  calendarCardInline: {
    position: "relative" as const,
    overflow: "visible" as const,
    zIndex: 10,
  },
  calendarPortal: {
    position: "absolute" as const,
    width: 0,
    height: 0,
    top: 0,
    left: 0,
  },
};
