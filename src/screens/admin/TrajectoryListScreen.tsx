import { Feather } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Pressable,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { getErrorMessage } from "@/api/http";
import { fightRecordsApi } from "@/api/fightRecordsApi";
import { beltsApi } from "@/api/beltsApi";
import { studentsApi } from "@/api/studentsApi";
import { trajectoryApi } from "@/api/trajectoryApi";
import { AppButton } from "@/components/AppButton";
import { AppCard } from "@/components/AppCard";
import { AppDateInput } from "@/components/AppDateInput";
import { AppInput } from "@/components/AppInput";
import { AppModal } from "@/components/AppModal";
import { BeltSelector } from "@/components/BeltSelector";
import type { BeltSelectorValue } from "@/components/BeltSelector";
import { AdminShell } from "@/components/AdminShell";
import { BeltIndicator } from "@/components/BeltIndicator";
import { Screen } from "@/components/Screen";
import { StatusView } from "@/components/StatusView";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import type { AdminStackParamList } from "@/navigation/types";
import type {
  BeltLevel,
  FightRecordType,
  Student,
  StudentBeltHistory,
  StudentFightRecord,
  StudentTrajectorySummary,
  TrajectoryEvent,
} from "@/types/api";
import { formatCurrency, formatDate, formatPaymentStatus } from "@/utils/format";

type Props = NativeStackScreenProps<AdminStackParamList, "TrajectoryList">;
const STUDENTS_PER_PAGE = 20;

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
  return toDateKey(date);
}

function formatStudentStatus(status: Student["status"]): string {
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

function getStudentStatusColor(status: Student["status"]): string {
  switch (status) {
    case "active":
      return colors.success;
    case "frozen":
      return colors.warning;
    default:
      return colors.textMuted;
  }
}

type UnifiedModalTab = "events" | "fight" | "belts";

type FightTotals = { victoria: number; empate: number; derrota: number };

export function TrajectoryListScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { contentMaxWidth, isDesktop } = useResponsiveLayout();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [currentPage, setCurrentPage] = useState(1);

  const currentAssignment = user?.admin_assignments[0] ?? null;
  const organizationId = currentAssignment?.organization_id ?? null;
  const fixedBranchId = currentAssignment?.branch_id ?? null;

  const studentsQuery = useQuery({
    queryKey: ["students", debouncedSearch, "trajectory"],
    queryFn: () => studentsApi.list({ search: debouncedSearch.trim() || undefined }),
  });

  const allStudents = useMemo(() => studentsQuery.data ?? [], [studentsQuery.data]);
  const visibleStudents = useMemo(
    () =>
      allStudents.filter(
        (student) =>
          student.deleted_at === null &&
          (!fixedBranchId || student.branch_id === fixedBranchId),
      ),
    [allStudents, fixedBranchId],
  );
  const visibleStudentIds = useMemo(
    () => visibleStudents.map((s) => s.id),
    [visibleStudents],
  );

  const summaryQuery = useQuery({
    queryKey: ["trajectory-summary", organizationId, visibleStudentIds.join(",")],
    queryFn: () =>
      trajectoryApi.summaryByStudent({
        organization_id: organizationId ?? undefined,
        student_ids: visibleStudentIds,
      }),
    enabled: Boolean(organizationId && visibleStudentIds.length > 0),
  });

  const summaryByStudentId = useMemo(() => {
    const map = new Map<number, StudentTrajectorySummary>();
    (summaryQuery.data ?? []).forEach((summary) => {
      map.set(summary.student_id, summary);
    });
    return map;
  }, [summaryQuery.data]);

  const totalStudents = visibleStudents.length;
  const totalEvents = useMemo(
    () =>
      Array.from(summaryByStudentId.values()).reduce(
        (sum, item) => sum + item.total_events,
        0,
      ),
    [summaryByStudentId],
  );
  const studentsWithTrajectory = useMemo(
    () =>
      Array.from(summaryByStudentId.values()).filter((s) => s.total_events > 0)
        .length,
    [summaryByStudentId],
  );
  const totalPages = Math.max(1, Math.ceil(visibleStudents.length / STUDENTS_PER_PAGE));
  const paginatedStudents = useMemo(
    () =>
      visibleStudents.slice(
        (currentPage - 1) * STUDENTS_PER_PAGE,
        currentPage * STUDENTS_PER_PAGE,
      ),
    [currentPage, visibleStudents],
  );

  // ============================
  // Modal unificado (events + fight record)
  // ============================
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [activeStudentId, setActiveStudentId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<UnifiedModalTab>("events");

  const activeStudent = useMemo<Student | null>(() => {
    if (!activeStudentId) return null;
    return allStudents.find((s) => s.id === activeStudentId) ?? null;
  }, [activeStudentId, allStudents]);

  // =========== Trayectoria (sucesos) ===========
  const [selectedDateKey, setSelectedDateKey] = useState<string>(
    toDateKey(new Date()),
  );
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [draftContent, setDraftContent] = useState("");
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [dayModalError, setDayModalError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<"success" | "danger">("success");
  const newContentInputRef = useRef<TextInput>(null);
  const editContentInputRef = useRef<TextInput>(null);

  const eventsQuery = useQuery({
    queryKey: ["trajectory-events", activeStudentId],
    queryFn: () =>
      trajectoryApi.listEvents({
        student_id: activeStudentId!,
        organization_id: organizationId ?? undefined,
      }),
    enabled: Boolean(activeStudentId && isModalVisible),
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

  const selectedEvents = useMemo(
    () => (selectedDateKey ? eventsByDateKey.get(selectedDateKey) ?? [] : []),
    [eventsByDateKey, selectedDateKey],
  );

  const totalModalEvents = events.length;
  const uniqueModalDays = eventsByDateKey.size;
  const lastModalEvent = useMemo(() => {
    if (events.length === 0) return null;
    return events.reduce((latest, current) =>
      current.event_date > latest.event_date ? current : latest,
    );
  }, [events]);

  const datesWithEvents = useMemo(() => Array.from(eventsByDateKey.keys()).sort(), [
    eventsByDateKey,
  ]);

  const createEventMutation = useMutation({
    mutationFn: trajectoryApi.createEvent,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["trajectory-events", activeStudentId],
      });
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
      await queryClient.invalidateQueries({
        queryKey: ["trajectory-events", activeStudentId],
      });
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
      await queryClient.invalidateQueries({
        queryKey: ["trajectory-events", activeStudentId],
      });
      await queryClient.invalidateQueries({ queryKey: ["trajectory-summary"] });
      setDayModalError(null);
      setFeedbackTone("success");
      setFeedbackMessage("Suceso eliminado de la trayectoria.");
    },
    onError: (error) => {
      setDayModalError(getErrorMessage(error));
    },
  });

  // =========== Récord deportivo ===========
  const [isCreatingFightRecord, setIsCreatingFightRecord] = useState(false);
  const [editingFightRecordId, setEditingFightRecordId] = useState<number | null>(null);
  const [draftFightType, setDraftFightType] = useState<FightRecordType>("victoria");
  const [draftFightOpponent, setDraftFightOpponent] = useState("");
  const [draftFightDate, setDraftFightDate] = useState<string>(formatDateIso(new Date()));
  const [fightRecordError, setFightRecordError] = useState<string | null>(null);

  const fightRecordsQuery = useQuery({
    queryKey: ["fight-records", activeStudentId],
    queryFn: () => fightRecordsApi.list({ student_id: activeStudentId! }),
    enabled: Boolean(activeStudentId && isModalVisible),
  });

  const fightRecords = fightRecordsQuery.data ?? [];
  const fightTotals = useMemo<FightTotals>(() => {
    const totals: FightTotals = { victoria: 0, empate: 0, derrota: 0 };
    fightRecords.forEach((r) => {
      totals[r.record_type] += 1;
    });
    return totals;
  }, [fightRecords]);

  const createFightMutation = useMutation({
    mutationFn: fightRecordsApi.create,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["fight-records", activeStudentId],
      });
      await queryClient.invalidateQueries({ queryKey: ["student", activeStudentId] });
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
      payload: {
        record_type?: FightRecordType;
        opponent_name?: string;
        fight_date?: string;
      };
    }) => fightRecordsApi.update(recordId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["fight-records", activeStudentId],
      });
      await queryClient.invalidateQueries({ queryKey: ["student", activeStudentId] });
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
      await queryClient.invalidateQueries({
        queryKey: ["fight-records", activeStudentId],
      });
      await queryClient.invalidateQueries({ queryKey: ["student", activeStudentId] });
      setFightRecordError(null);
      setFeedbackTone("success");
      setFeedbackMessage("Registro deportivo eliminado.");
    },
    onError: (error) => {
      setFightRecordError(getErrorMessage(error));
    },
  });

  // =========== Cinta / Grados (belts) ===========
  const [beltDraft, setBeltDraft] = useState<BeltSelectorValue>({
    beltLevelId: null,
    stripeId: null,
  });
  const [beltAwardedAt, setBeltAwardedAt] = useState<string>(formatDateIso(new Date()));
  const [beltNotes, setBeltNotes] = useState<string>("");
  const [beltError, setBeltError] = useState<string | null>(null);

  const beltLevelsQuery = useQuery({
    queryKey: ["belt-levels", organizationId],
    queryFn: () =>
      beltsApi.listLevels({
        organization_id: organizationId ?? undefined,
        is_active: true,
        include_stripes: true,
      }),
    enabled: Boolean(organizationId && isModalVisible),
  });
  const beltLevels: BeltLevel[] = beltLevelsQuery.data ?? [];

  const beltHistoryQuery = useQuery({
    queryKey: ["belt-history", activeStudentId],
    queryFn: () =>
      beltsApi.listHistory({
        student_id: activeStudentId!,
      }),
    enabled: Boolean(activeStudentId && isModalVisible),
  });
  const beltHistory: StudentBeltHistory[] = useMemo(
    () =>
      [...(beltHistoryQuery.data ?? [])].sort(
        (a, b) =>
          (b.awarded_at ?? "").localeCompare(a.awarded_at ?? "") || b.id - a.id,
      ),
    [beltHistoryQuery.data],
  );

  const isBeltDirty = useMemo(() => {
    if (!activeStudent) return false;
    return (
      beltDraft.beltLevelId !== (activeStudent.current_belt_level_id ?? null) ||
      beltDraft.stripeId !== (activeStudent.current_stripe_id ?? null) ||
      beltNotes.trim().length > 0 ||
      beltAwardedAt !== formatDateIso(new Date())
    );
  }, [activeStudent, beltAwardedAt, beltDraft, beltNotes]);

  const updateStudentMutation = useMutation({
    mutationFn: ({
      studentId,
      payload,
    }: {
      studentId: number;
      payload: { current_belt_level_id?: number | null; current_stripe_id?: number | null };
    }) => studentsApi.update(studentId, payload),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["students"] });
      await queryClient.invalidateQueries({ queryKey: ["student", updated.id] });
      setBeltError(null);
    },
    onError: (error) => {
      setBeltError(getErrorMessage(error));
    },
  });

  const createBeltHistoryMutation = useMutation({
    mutationFn: beltsApi.createHistory,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["belt-history", activeStudentId] });
      setBeltError(null);
    },
    onError: (error) => {
      setBeltError(getErrorMessage(error));
    },
  });

  const handleSubmitBeltChange = useCallback(() => {
    if (!activeStudentId || !activeStudent) return;
    if (beltDraft.beltLevelId == null) {
      setBeltError("Selecciona al menos un nivel de cinta.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(beltAwardedAt)) {
      setBeltError("Usa el formato YYYY-MM-DD para la fecha de otorgamiento.");
      return;
    }
    const currentLevelId = activeStudent.current_belt_level_id ?? null;
    const currentStripeId = activeStudent.current_stripe_id ?? null;
    const levelChanged = beltDraft.beltLevelId !== currentLevelId;
    const stripeChanged = beltDraft.stripeId !== currentStripeId;
    if (!levelChanged && !stripeChanged) {
      setBeltError("Selecciona un cambio de cinta o stripe para registrar.");
      return;
    }
    updateStudentMutation.mutate(
      {
        studentId: activeStudentId,
        payload: {
          current_belt_level_id: beltDraft.beltLevelId,
          current_stripe_id: beltDraft.stripeId,
        },
      },
      {
        onSuccess: async () => {
          await createBeltHistoryMutation.mutateAsync({
            student_id: activeStudentId,
            belt_level_id: beltDraft.beltLevelId,
            stripe_id: beltDraft.stripeId ?? null,
            awarded_at: beltAwardedAt,
            awarded_by_user_id: user?.id ?? null,
            notes: beltNotes.trim().length > 0 ? beltNotes.trim() : null,
            update_student_current: false,
          });
          setBeltAwardedAt(formatDateIso(new Date()));
          setBeltNotes("");
          setFeedbackTone("success");
          setFeedbackMessage("Cambio de grado registrado correctamente.");
        },
      },
    );
  }, [
    activeStudent,
    activeStudentId,
    beltAwardedAt,
    beltDraft.beltLevelId,
    beltDraft.stripeId,
    beltNotes,
    createBeltHistoryMutation,
    updateStudentMutation,
    user?.id,
  ]);

  // =========== Handlers (Modal unificado) ===========

  const handleOpenUnifiedModal = useCallback((studentId: number) => {
    const target = allStudents.find((s) => s.id === studentId) ?? null;
    setActiveStudentId(studentId);
    setIsModalVisible(true);
    setActiveTab("events");
    setSelectedDateKey(toDateKey(new Date()));
    setIsCreatingNew(false);
    setDraftContent("");
    setEditingEventId(null);
    setEditingContent("");
    setDayModalError(null);
    setFeedbackMessage(null);
    setIsCreatingFightRecord(false);
    setEditingFightRecordId(null);
    setDraftFightType("victoria");
    setDraftFightOpponent("");
    setDraftFightDate(formatDateIso(new Date()));
    setFightRecordError(null);
    setBeltDraft({
      beltLevelId: target?.current_belt_level_id ?? null,
      stripeId: target?.current_stripe_id ?? null,
    });
    setBeltAwardedAt(formatDateIso(new Date()));
    setBeltNotes("");
    setBeltError(null);
  }, [allStudents]);

  const handleCloseUnifiedModal = useCallback(() => {
    setIsModalVisible(false);
    setActiveStudentId(null);
    setActiveTab("events");
    setIsCreatingNew(false);
    setDraftContent("");
    setEditingEventId(null);
    setEditingContent("");
    setDayModalError(null);
    setFeedbackMessage(null);
    setIsCreatingFightRecord(false);
    setEditingFightRecordId(null);
    setDraftFightType("victoria");
    setDraftFightOpponent("");
    setDraftFightDate(formatDateIso(new Date()));
    setFightRecordError(null);
    setBeltDraft({ beltLevelId: null, stripeId: null });
    setBeltAwardedAt(formatDateIso(new Date()));
    setBeltNotes("");
    setBeltError(null);
  }, []);

  // Sucesos handlers
  const handleSubmitNew = useCallback(() => {
    if (!selectedDateKey || !activeStudentId) return;
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
      student_id: activeStudentId,
      event_date: selectedDateKey,
      content: trimmed,
    });
  }, [activeStudentId, createEventMutation, draftContent, selectedDateKey]);

  const handleSubmitEdit = useCallback(() => {
    if (editingEventId === null) return;
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

  // Fight record handlers
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
    if (!activeStudentId) return;
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
        student_id: activeStudentId,
        record_type: draftFightType,
        opponent_name: opponentTrimmed,
        fight_date: draftFightDate,
      });
    }
  }, [
    activeStudentId,
    createFightMutation,
    draftFightDate,
    draftFightOpponent,
    draftFightType,
    editingFightRecordId,
    updateFightMutation,
  ]);

  const handleRemoveFight = useCallback(
    (recordId: number) => {
      removeFightMutation.mutate(recordId);
    },
    [removeFightMutation],
  );

  // Efectos
  useEffect(() => {
    if (!feedbackMessage) return;
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

  // =========== Sidebar summary ===========
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

  if (!organizationId) {
    return (
      <Screen
        contentStyle={[styles.screenContent, { alignItems: "center" }]}
        nativeID="screens-admin-trajectory-list-missing-scope-screen"
        testID="screens-admin-trajectory-list-missing-scope-screen"
      >
        <View
          nativeID="screens-admin-trajectory-list-missing-scope-container"
          style={[styles.container, { maxWidth: contentMaxWidth }]}
          testID="screens-admin-trajectory-list-missing-scope-container"
        >
          <StatusView
            nativeID="screens-admin-trajectory-list-missing-scope-status"
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
      nativeID="screens-admin-trajectory-list-screen"
      testID="screens-admin-trajectory-list-screen"
    >
      <AdminShell
        activeSection="trajectory"
        onGoBranches={() =>
          navigation.navigate("AdminHome", { section: "branches" })
        }
        onGoDashboard={() => navigation.navigate("AdminHome")}
        onGoDojo={() => navigation.navigate("AdminHome", { section: "dojo" })}
        onGoOperations={() =>
          navigation.navigate("AdminHome", { section: "operations" })
        }
        onGoPayments={() =>
          navigation.navigate("AdminHome", { section: "payments" })
        }
        onGoQrCodes={() => navigation.navigate("QrCodesList")}
        onGoStudents={() => navigation.navigate("StudentsList")}
        onGoTrajectory={() => navigation.navigate("TrajectoryList")}
        sidebarSummary={sidebarSummary}
        subtitle="registra hitos y recuerdos en la trayectoria de cada alumno"
        title="Trayectoria"
        headerMainContent={
          <View
            nativeID="screens-admin-trajectory-list-header-block"
            style={styles.headerBlock}
            testID="screens-admin-trajectory-list-header-block"
          >
            <View
              nativeID="screens-admin-trajectory-list-header-top"
              style={[
                styles.headerTop,
                isDesktop ? desktopStyles.headerTop : mobileStyles.headerTop,
              ]}
              testID="screens-admin-trajectory-list-header-top"
            >
              <View
                nativeID="screens-admin-trajectory-list-header-copy"
                style={styles.headerCopy}
                testID="screens-admin-trajectory-list-header-copy"
              >
                <Text
                  nativeID="screens-admin-trajectory-list-header-kicker"
                  style={styles.headerKicker}
                  testID="screens-admin-trajectory-list-header-kicker"
                >
                  Trayectoria
                </Text>
                <Text
                  nativeID="screens-admin-trajectory-list-header-title"
                  style={styles.headerTitle}
                  testID="screens-admin-trajectory-list-header-title"
                >
                  Línea del tiempo por alumno
                </Text>
                <Text
                  nativeID="screens-admin-trajectory-list-header-description"
                  style={styles.headerDescription}
                  testID="screens-admin-trajectory-list-header-description"
                >
                  Selecciona un alumno para entrar a su calendario y registrar
                  graduaciones, torneos, exámenes o cualquier hito importante.
                </Text>
              </View>
            </View>

            <View
              nativeID="screens-admin-trajectory-list-metrics-grid"
              style={[
                styles.metricsGrid,
                isDesktop ? desktopStyles.metricsGrid : mobileStyles.metricsGrid,
              ]}
              testID="screens-admin-trajectory-list-metrics-grid"
            >
              <AppCard
                nativeID="screens-admin-trajectory-list-metric-students"
                style={[styles.metricCard, styles.metricInfo]}
                testID="screens-admin-trajectory-list-metric-students"
              >
                <View style={styles.metricCopy}>
                  <Text style={styles.metricTitle}>Alumnos</Text>
                  <Text style={styles.metricValue}>{totalStudents}</Text>
                  <Text style={styles.metricDescription}>
                    Totales en el padrón
                  </Text>
                </View>
              </AppCard>
              <AppCard
                nativeID="screens-admin-trajectory-list-metric-with-trajectory"
                style={[styles.metricCard, styles.metricSuccess]}
                testID="screens-admin-trajectory-list-metric-with-trajectory"
              >
                <View style={styles.metricCopy}>
                  <Text style={styles.metricTitle}>Con trayectoria</Text>
                  <Text style={styles.metricValue}>{studentsWithTrajectory}</Text>
                  <Text style={styles.metricDescription}>
                    Alumnos con al menos un suceso
                  </Text>
                </View>
              </AppCard>
              <AppCard
                nativeID="screens-admin-trajectory-list-metric-events"
                style={[styles.metricCard, styles.metricAmber]}
                testID="screens-admin-trajectory-list-metric-events"
              >
                <View style={styles.metricCopy}>
                  <Text style={styles.metricTitle}>Sucesos totales</Text>
                  <Text style={styles.metricValue}>{totalEvents}</Text>
                  <Text style={styles.metricDescription}>
                    Registrados en la organización
                  </Text>
                </View>
              </AppCard>
            </View>

            <View
              nativeID="screens-admin-trajectory-list-search-row"
              style={styles.searchRow}
              testID="screens-admin-trajectory-list-search-row"
            >
              <AppInput
                nativeID="screens-admin-trajectory-list-search-input"
                testID="screens-admin-trajectory-list-search-input"
                label="Buscar alumno"
                placeholder="Nombre, apellidos o código"
                value={search}
                onChangeText={setSearch}
              />
            </View>

            <View
              nativeID="screens-admin-trajectory-list-content"
              style={[styles.container, { maxWidth: contentMaxWidth }]}
              testID="screens-admin-trajectory-list-content"
            >
              {studentsQuery.isLoading ? (
                <AppCard
                  nativeID="screens-admin-trajectory-list-loading-card"
                  style={styles.loadingCard}
                  testID="screens-admin-trajectory-list-loading-card"
                >
                  <Text style={styles.loadingText}>Cargando alumnos…</Text>
                </AppCard>
              ) : studentsQuery.isError ? (
                <View style={styles.errorBlock}>
                  <StatusView
                    nativeID="screens-admin-trajectory-list-error-status"
                    title="No pudimos cargar los alumnos"
                    description={getErrorMessage(studentsQuery.error)}
                  />
                </View>
              ) : visibleStudents.length === 0 ? (
                <AppCard
                  nativeID="screens-admin-trajectory-list-empty-card"
                  style={styles.loadingCard}
                  testID="screens-admin-trajectory-list-empty-card"
                >
                  <Text style={styles.resultsTitle}>
                    {debouncedSearch.trim()
                      ? "Sin resultados para la búsqueda"
                      : "Todavía no hay alumnos"}
                  </Text>
                  <Text style={styles.resultsDescription}>
                    {debouncedSearch.trim()
                      ? "Prueba con otro nombre, apellido o código."
                      : "Agrega alumnos desde la sección 'Alumnos' y luego vuelve aquí para registrar su trayectoria."}
                  </Text>
                </AppCard>
              ) : (
                <AppCard
                  nativeID="screens-admin-trajectory-list-results-panel"
                  style={styles.resultsPanel}
                  testID="screens-admin-trajectory-list-results-panel"
                >
                  <View
                    nativeID="screens-admin-trajectory-list-results-head"
                    style={styles.resultsHead}
                    testID="screens-admin-trajectory-list-results-head"
                  >
                    <Text style={styles.resultsHeadTitle}>
                      Lista de alumnos
                    </Text>
                    <Text style={styles.resultsHeadMeta}>
                      {visibleStudents.length === 1
                        ? "1 alumno"
                        : `${visibleStudents.length} alumnos`}
                    </Text>
                  </View>

                  <View
                    nativeID="screens-admin-trajectory-list-table-head"
                    style={[
                      styles.tableHead,
                      isDesktop ? null : mobileStyles.tableHead,
                    ]}
                    testID="screens-admin-trajectory-list-table-head"
                  >
                    <Text style={[styles.tableHeadCell, styles.tableColStudent]}>
                      Alumno
                    </Text>
                    <Text
                      style={[styles.tableHeadCell, styles.tableColBelt]}
                    >
                      Cinta
                    </Text>
                    {isDesktop ? (
                      <Text
                        style={[styles.tableHeadCell, styles.tableColStatus]}
                      >
                        Estado
                      </Text>
                    ) : null}
                    {isDesktop ? (
                      <Text
                        style={[styles.tableHeadCell, styles.tableColCount]}
                      >
                        Sucesos
                      </Text>
                    ) : null}
                    {isDesktop ? (
                      <Text
                        style={[styles.tableHeadCell, styles.tableColLast]}
                      >
                        Último suceso
                      </Text>
                    ) : null}
                    <Text
                      style={[styles.tableHeadCell, styles.tableColActions]}
                    >
                      Acciones
                    </Text>
                  </View>

                  <ScrollView
                    horizontal={!isDesktop}
                    style={styles.tableScroll}
                    contentContainerStyle={styles.tableScrollContent}
                    showsHorizontalScrollIndicator={false}
                  >
                    <View style={styles.tableBody}>
                      {paginatedStudents.map((student) => {
                        const summary = summaryByStudentId.get(student.id);
                        return (
                          <View
                            key={student.id}
                            nativeID={`screens-admin-trajectory-list-table-row-${student.id}`}
                            style={styles.tableRow}
                            testID={`screens-admin-trajectory-list-table-row-${student.id}`}
                          >
                            <View
                              style={[
                                styles.tableCell,
                                styles.tableColStudent,
                                !isDesktop
                                  ? mobileStyles.tableColStudent
                                  : null,
                              ]}
                            >
                              <Text
                                style={styles.studentName}
                                numberOfLines={1}
                              >
                                {student.first_name} {student.last_name}
                              </Text>
                              <Text style={styles.studentCode}>
                                {student.unique_code}
                              </Text>
                            </View>

                            <View
                              style={[
                                styles.tableCell,
                                styles.tableColBelt,
                                !isDesktop ? mobileStyles.tableColBelt : null,
                              ]}
                            >
                              <BeltIndicator
                                beltLevel={student.current_belt_level}
                                size="xs"
                                stripe={student.current_stripe}
                                testID={`screens-admin-trajectory-list-row-belt-value-${student.id}`}
                              />
                            </View>

                            {isDesktop ? (
                              <View
                                style={[
                                  styles.tableCell,
                                  styles.tableColStatus,
                                ]}
                              >
                                <Text style={styles.statusText}>
                                  {formatStudentStatus(student.status)}
                                </Text>
                              </View>
                            ) : null}

                            {isDesktop ? (
                              <View
                                style={[
                                  styles.tableCell,
                                  styles.tableColCount,
                                ]}
                              >
                                <Text style={styles.countText}>
                                  {summary?.total_events ?? 0}
                                </Text>
                              </View>
                            ) : null}

                            {isDesktop ? (
                              <View
                                style={[styles.tableCell, styles.tableColLast]}
                              >
                                <Text style={styles.lastEventText}>
                                  {summary?.last_event_date
                                    ? formatDate(summary.last_event_date)
                                    : "—"}
                                </Text>
                              </View>
                            ) : null}

                            <View
                              style={[
                                styles.tableCell,
                                styles.tableColActions,
                                !isDesktop
                                  ? mobileStyles.tableColActions
                                  : null,
                              ]}
                            >
                              <Pressable
                                accessibilityRole="link"
                                hitSlop={{
                                  bottom: 8,
                                  left: 8,
                                  right: 8,
                                  top: 8,
                                }}
                                nativeID={`screens-admin-trajectory-list-edit-link-${student.id}`}
                                onPress={() =>
                                  handleOpenUnifiedModal(student.id)
                                }
                                style={(state) => {
                                  const hovered =
                                    (state as typeof state & { hovered?: boolean })
                                      .hovered ?? false;
                                  return [
                                    styles.inlineLink,
                                    hovered
                                      ? styles.inlineLinkHovered
                                      : null,
                                    state.pressed
                                      ? styles.inlineLinkPressed
                                      : null,
                                  ];
                                }}
                                testID={`screens-admin-trajectory-list-edit-link-${student.id}`}
                              >
                                <Text
                                  style={[
                                    styles.inlineLinkLabel,
                                    styles.inlineLinkLabelUnderlined,
                                  ]}
                                >
                                  Editar trayectoria
                                </Text>
                              </Pressable>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </ScrollView>

                  {totalPages > 1 ? (
                    <View style={styles.paginationRow}>
                      <Text style={styles.paginationMeta}>
                        Página {currentPage} de {totalPages}
                      </Text>
                    </View>
                  ) : null}
                </AppCard>
              )}
            </View>
          </View>
        }
      >
      </AdminShell>

      {/* ========================================================== */}
      {/* Modal unificado: Sucesos + Récord deportivo (2 tabs)      */}
      {/* ========================================================== */}
      <AppModal
        nativeID="screens-admin-trajectory-list-unified-modal-wrapper"
        visible={isModalVisible}
        title={
          activeStudent
            ? `Trayectoria · ${activeStudent.first_name} ${activeStudent.last_name}`
            : "Trayectoria del alumno"
        }
        description={
          activeStudent ? `Código ${activeStudent.unique_code}` : undefined
        }
        onClose={handleCloseUnifiedModal}
        testID="screens-admin-trajectory-list-unified-modal-wrapper"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalContent}
        >
          {/* Feedback flash */}
          {feedbackMessage ? (
            <AppCard
              nativeID="screens-admin-trajectory-list-unified-feedback"
              style={[
                styles.feedbackCard,
                feedbackTone === "success" ? styles.feedbackSuccess : styles.feedbackDanger,
              ]}
              testID="screens-admin-trajectory-list-unified-feedback"
            >
              <Text style={styles.feedbackText}>{feedbackMessage}</Text>
            </AppCard>
          ) : null}

          {/* Tabs */}
          <View
            nativeID="screens-admin-trajectory-list-unified-tabs"
            style={styles.tabsRow}
            testID="screens-admin-trajectory-list-unified-tabs"
          >
            {([
              { key: "events", label: "Sucesos", icon: "calendar" as const },
              { key: "fight", label: "Récord deportivo", icon: "award" as const },
              { key: "belts", label: "Cinta y grados", icon: "star" as const },
            ] as const).map((tab) => {
              const selected = activeTab === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  accessibilityRole="tab"
                  hitSlop={{ bottom: 8, left: 8, right: 8, top: 8 }}
                  onPress={() => {
                    setActiveTab(tab.key);
                    if (tab.key === "events") {
                      setFightRecordError(null);
                      setBeltError(null);
                    } else if (tab.key === "fight") {
                      setDayModalError(null);
                      setBeltError(null);
                    } else {
                      setDayModalError(null);
                      setFightRecordError(null);
                    }
                  }}
                  style={(state) => {
                    const hovered =
                      (state as typeof state & { hovered?: boolean }).hovered ??
                      false;
                    return [
                      styles.tabButton,
                      selected ? styles.tabButtonSelected : null,
                      hovered && !selected ? styles.tabButtonHovered : null,
                      state.pressed ? styles.tabButtonPressed : null,
                    ];
                  }}
                  testID={`screens-admin-trajectory-list-unified-tab-${tab.key}`}
                >
                  <Feather
                    name={tab.icon}
                    size={14}
                    color={selected ? colors.primary : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.tabButtonLabel,
                      selected ? styles.tabButtonLabelSelected : null,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Mini encabezado del alumno (dentro del modal) */}
          {activeStudent ? (
            <View
              nativeID="screens-admin-trajectory-list-unified-miniheader"
              style={styles.miniHeader}
              testID="screens-admin-trajectory-list-unified-miniheader"
            >
              <View style={styles.miniHeaderPhotoBlock}>
                {activeStudent.photo_url ? (
                  <Image
                    accessibilityLabel={`Foto de ${activeStudent.first_name} ${activeStudent.last_name}`}
                    source={{ uri: activeStudent.photo_url }}
                    style={styles.miniHeaderPhoto}
                  />
                ) : (
                  <View
                    accessibilityLabel={`Iniciales del alumno ${activeStudent.first_name} ${activeStudent.last_name}`}
                    style={styles.miniHeaderPhotoPlaceholder}
                  >
                    <Text style={styles.miniHeaderPhotoInitials} accessible={false}>
                      {activeStudent.first_name.charAt(0)}
                      {activeStudent.last_name.charAt(0)}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.miniHeaderCopy}>
                <Text style={styles.miniHeaderName}>
                  {activeStudent.first_name} {activeStudent.last_name}
                </Text>
                <View style={styles.miniHeaderStats}>
                  <View style={styles.miniHeaderStatItem}>
                    <Text style={styles.miniHeaderStatValue}>{totalModalEvents}</Text>
                    <Text style={styles.miniHeaderStatLabel}>sucesos</Text>
                  </View>
                  <View style={styles.miniHeaderStatItem}>
                    <Text style={styles.miniHeaderStatValue}>{uniqueModalDays}</Text>
                    <Text style={styles.miniHeaderStatLabel}>días</Text>
                  </View>
                  <View
                    style={[
                      styles.miniHeaderStatItem,
                      { borderLeftWidth: 1, borderLeftColor: colors.border, paddingLeft: spacing.sm },
                    ]}
                  >
                    <Text
                      style={[
                        styles.miniHeaderStatValue,
                        { color: getStudentPaymentColor(activeStudent.payment_status) },
                      ]}
                    >
                      {formatPaymentStatus(activeStudent.payment_status)}
                    </Text>
                    <Text style={styles.miniHeaderStatLabel}>pago</Text>
                  </View>
                  <View style={styles.miniHeaderStatItem}>
                    <Text
                      style={[
                        styles.miniHeaderStatValue,
                        { color: getStudentStatusColor(activeStudent.status) },
                      ]}
                    >
                      {formatStudentStatus(activeStudent.status)}
                    </Text>
                    <Text style={styles.miniHeaderStatLabel}>estado</Text>
                  </View>
                  <View style={styles.miniHeaderStatItem}>
                    <Text style={styles.miniHeaderStatValue}>
                      {formatCurrency(activeStudent.monthly_fee, activeStudent.currency)}
                    </Text>
                    <Text style={styles.miniHeaderStatLabel}>mensualidad</Text>
                  </View>
                </View>
              </View>
            </View>
          ) : null}

          {/* ======================================== */}
          {/* TAB 1: Sucesos (sin calendario pared)   */}
          {/* ======================================== */}
          {activeTab === "events" ? (
            <View style={styles.tabPanel}>
              {eventsQuery.isLoading ? (
                <AppCard style={styles.loadingCard}>
                  <Text style={styles.loadingText}>Cargando sucesos…</Text>
                </AppCard>
              ) : (
                <>
                  {/* Selector simple de fecha + listado cronológico de fechas con sucesos */}
                  <View style={styles.eventsTopBar}>
                    <View style={styles.eventsDatePickerBlock}>
                      <AppDateInput
                        label="Fecha del suceso"
                        nativeID="screens-admin-trajectory-list-unified-event-date-input"
                        onChangeText={(v) => {
                          if (/^\d{4}-\d{2}-\d{2}$/.test(v) || v.length === 0) {
                            setSelectedDateKey(v || toDateKey(new Date()));
                          }
                        }}
                        placeholder="YYYY-MM-DD"
                        testID="screens-admin-trajectory-list-unified-event-date-input"
                        value={selectedDateKey}
                      />
                    </View>
                    <View style={styles.eventsQuickNavBlock}>
                      <Text style={styles.eventsSectionLabel}>Días con sucesos</Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.eventsQuickList}
                      >
                        {datesWithEvents.length === 0 ? (
                          <Text style={styles.eventsQuickEmpty}>
                            Aún no hay días registrados.
                          </Text>
                        ) : (
                          datesWithEvents.map((dateKey) => {
                            const active = dateKey === selectedDateKey;
                            return (
                              <Pressable
                                key={dateKey}
                                accessibilityRole="button"
                                hitSlop={{ bottom: 8, left: 8, right: 8, top: 8 }}
                                onPress={() => setSelectedDateKey(dateKey)}
                                style={(state) => [
                                  styles.eventsQuickPill,
                                  active ? styles.eventsQuickPillActive : null,
                                  state.pressed ? { opacity: 0.84 } : null,
                                ]}
                                testID={`screens-admin-trajectory-list-unified-quickdate-${dateKey}`}
                              >
                                <Text
                                  style={[
                                    styles.eventsQuickPillLabel,
                                    active ? styles.eventsQuickPillLabelActive : null,
                                  ]}
                                >
                                  {formatDate(dateKey)}
                                </Text>
                                <View
                                  style={[
                                    styles.eventsQuickPillDot,
                                    active ? styles.eventsQuickPillDotActive : null,
                                  ]}
                                />
                              </Pressable>
                            );
                          })
                        )}
                      </ScrollView>
                    </View>
                  </View>

                  {dayModalError ? (
                    <AppCard
                      nativeID="screens-admin-trajectory-list-unified-events-error"
                      style={[styles.feedbackCard, styles.feedbackDanger]}
                      testID="screens-admin-trajectory-list-unified-events-error"
                    >
                      <Text style={styles.feedbackText}>{dayModalError}</Text>
                    </AppCard>
                  ) : null}

                  <View style={styles.eventsDayHeader}>
                    <Text style={styles.eventsDayTitle}>
                      {formatLongDate(selectedDateKey)}
                    </Text>
                    <Text style={styles.eventsDayMeta}>
                      {selectedEvents.length === 0
                        ? "Sin sucesos en esta fecha"
                        : selectedEvents.length === 1
                          ? "1 suceso registrado"
                          : `${selectedEvents.length} sucesos registrados`}
                    </Text>
                  </View>

                  <ScrollView
                    contentContainerStyle={styles.eventsList}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    style={styles.eventsScroll}
                  >
                    {selectedEvents.length === 0 && !isCreatingNew && editingEventId === null ? (
                      <AppCard
                        nativeID="screens-admin-trajectory-list-unified-events-empty"
                        style={styles.emptyCard}
                        testID="screens-admin-trajectory-list-unified-events-empty"
                      >
                        <Text style={styles.emptyTitle}>Todavía no hay sucesos</Text>
                        <Text style={styles.emptyDescription}>
                          Agrega el primer recuerdo de este día para comenzar a construir la trayectoria.
                        </Text>
                      </AppCard>
                    ) : null}

                    {selectedEvents.map((event) => {
                      const isEditing = editingEventId === event.id;
                      return (
                        <AppCard
                          key={event.id}
                          nativeID={`screens-admin-trajectory-list-unified-event-${event.id}`}
                          style={styles.eventCard}
                          testID={`screens-admin-trajectory-list-unified-event-${event.id}`}
                        >
                          {isEditing ? (
                            <View style={styles.eventEditRow}>
                              <AppInput
                                nativeID={`screens-admin-trajectory-list-unified-event-edit-input-${event.id}`}
                                testID={`screens-admin-trajectory-list-unified-event-edit-input-${event.id}`}
                                label="Editar suceso"
                                placeholder="Ej: Graduación cinta azul"
                                value={editingContent}
                                onChangeText={setEditingContent}
                                multiline
                              />
                              <View style={styles.eventEditActions}>
                                <AppButton
                                  label="Guardar"
                                  nativeID={`screens-admin-trajectory-list-unified-event-edit-save-${event.id}`}
                                  onPress={handleSubmitEdit}
                                  loading={updateEventMutation.isPending}
                                  testID={`screens-admin-trajectory-list-unified-event-edit-save-${event.id}`}
                                  variant="success"
                                />
                                <AppButton
                                  label="Cancelar"
                                  nativeID={`screens-admin-trajectory-list-unified-event-edit-cancel-${event.id}`}
                                  onPress={handleCancelEdit}
                                  testID={`screens-admin-trajectory-list-unified-event-edit-cancel-${event.id}`}
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
                        nativeID="screens-admin-trajectory-list-unified-new-input"
                        testID="screens-admin-trajectory-list-unified-new-input"
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
                          nativeID="screens-admin-trajectory-list-unified-new-submit"
                          onPress={handleSubmitNew}
                          testID="screens-admin-trajectory-list-unified-new-submit"
                          variant="success"
                        />
                        <AppButton
                          label="Cancelar"
                          nativeID="screens-admin-trajectory-list-unified-new-cancel"
                          onPress={() => {
                            setIsCreatingNew(false);
                            setDraftContent("");
                          }}
                          testID="screens-admin-trajectory-list-unified-new-cancel"
                          variant="secondary"
                        />
                      </View>
                    </View>
                  ) : (
                    <View style={styles.addActionRow}>
                      <AppButton
                        label="+ Agregar recuerdo"
                        nativeID="screens-admin-trajectory-list-unified-add-button"
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
                        testID="screens-admin-trajectory-list-unified-add-button"
                        variant="primary"
                      />
                    </View>
                  )}
                </>
              )}
            </View>
          ) : null}

          {/* ========================================== */}
          {/* TAB 2: Récord deportivo (peleas)          */}
          {/* ========================================== */}
          {activeTab === "fight" ? (
            <View style={styles.tabPanel}>
              {/* Totales (victoria / empate / derrota) */}
              <View style={styles.fightTotalsRow}>
                <FightRecordStatInline
                  label="Victorias"
                  value={fightTotals.victoria}
                  tone="victoria"
                  idPrefix="screens-admin-trajectory-list-unified-fight-stat-victoria"
                />
                <FightRecordStatInline
                  label="Empates"
                  value={fightTotals.empate}
                  tone="empate"
                  idPrefix="screens-admin-trajectory-list-unified-fight-stat-empate"
                />
                <FightRecordStatInline
                  label="Derrotas"
                  value={fightTotals.derrota}
                  tone="derrota"
                  idPrefix="screens-admin-trajectory-list-unified-fight-stat-derrota"
                />
              </View>

              {fightRecordError ? (
                <AppCard
                  nativeID="screens-admin-trajectory-list-unified-fight-error"
                  style={[styles.feedbackCard, styles.feedbackDanger]}
                  testID="screens-admin-trajectory-list-unified-fight-error"
                >
                  <Text style={styles.feedbackText}>{fightRecordError}</Text>
                </AppCard>
              ) : null}

              <ScrollView
                contentContainerStyle={styles.fightRecordList}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                style={styles.eventsScroll}
              >
                {fightRecordsQuery.isLoading ? (
                  <AppCard style={styles.loadingCard}>
                    <Text style={styles.loadingText}>Cargando récord deportivo…</Text>
                  </AppCard>
                ) : fightRecords.length === 0 &&
                  !isCreatingFightRecord &&
                  editingFightRecordId === null ? (
                  <AppCard
                    nativeID="screens-admin-trajectory-list-unified-fight-empty"
                    style={styles.emptyCard}
                    testID="screens-admin-trajectory-list-unified-fight-empty"
                  >
                    <Text style={styles.emptyTitle}>Sin peleas registradas</Text>
                    <Text style={styles.emptyDescription}>
                      Agrega el primer registro deportivo para comenzar a construir el historial competitivo del alumno.
                    </Text>
                  </AppCard>
                ) : (
                  fightRecords.map((record) => {
                    const isEditing = editingFightRecordId === record.id;
                    if (isEditing) {
                      return (
                        <AppCard
                          key={record.id}
                          nativeID={`screens-admin-trajectory-list-unified-fight-edit-card-${record.id}`}
                          style={styles.fightRecordCard}
                          testID={`screens-admin-trajectory-list-unified-fight-edit-card-${record.id}`}
                        >
                          <FightRecordFormBlockInline
                            idPrefix={`screens-admin-trajectory-list-unified-fight-edit-${record.id}`}
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
                              nativeID={`screens-admin-trajectory-list-unified-fight-edit-save-${record.id}`}
                              onPress={handleSubmitFightRecord}
                              loading={updateFightMutation.isPending}
                              testID={`screens-admin-trajectory-list-unified-fight-edit-save-${record.id}`}
                              variant="success"
                            />
                            <AppButton
                              label="Cancelar"
                              nativeID={`screens-admin-trajectory-list-unified-fight-edit-cancel-${record.id}`}
                              onPress={handleCancelEditFight}
                              testID={`screens-admin-trajectory-list-unified-fight-edit-cancel-${record.id}`}
                              variant="secondary"
                            />
                          </View>
                        </AppCard>
                      );
                    }
                    return (
                      <AppCard
                        key={record.id}
                        nativeID={`screens-admin-trajectory-list-unified-fight-card-${record.id}`}
                        style={[
                          styles.fightRecordCard,
                          {
                            borderLeftColor: getFightTypeColor(record.record_type),
                            borderLeftWidth: 4,
                          },
                        ]}
                        testID={`screens-admin-trajectory-list-unified-fight-card-${record.id}`}
                      >
                        <View style={styles.fightRecordCardTopRow}>
                          <View
                            nativeID={`screens-admin-trajectory-list-unified-fight-type-tag-${record.id}`}
                            style={[
                              styles.fightRecordTypeTag,
                              {
                                backgroundColor: getFightTypeSoftColor(record.record_type),
                                borderColor: getFightTypeColor(record.record_type),
                              },
                            ]}
                            testID={`screens-admin-trajectory-list-unified-fight-type-tag-${record.id}`}
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
                          <Text style={styles.fightRecordDate}>
                            {formatDate(record.fight_date)}
                          </Text>
                        </View>
                        <Text style={styles.fightRecordOpponent}>
                          vs.{" "}
                          <Text style={styles.fightRecordOpponentName}>
                            {record.opponent_name}
                          </Text>
                        </Text>
                        <View style={styles.fightRecordCardActionsRow}>
                          <Pressable
                            accessibilityRole="link"
                            hitSlop={{ bottom: 8, left: 8, right: 8, top: 8 }}
                            onPress={() => handleStartEditFight(record)}
                            style={(state) => {
                              const hovered =
                                (state as typeof state & { hovered?: boolean })
                                  .hovered ?? false;
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
                                (state as typeof state & { hovered?: boolean })
                                  .hovered ?? false;
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
                  })
                )}
              </ScrollView>

              {isCreatingFightRecord ? (
                <AppCard
                  nativeID="screens-admin-trajectory-list-unified-fight-new-card"
                  style={styles.fightRecordCard}
                  testID="screens-admin-trajectory-list-unified-fight-new-card"
                >
                  <FightRecordFormBlockInline
                    idPrefix="screens-admin-trajectory-list-unified-fight-new"
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
                      nativeID="screens-admin-trajectory-list-unified-fight-new-save"
                      onPress={handleSubmitFightRecord}
                      testID="screens-admin-trajectory-list-unified-fight-new-save"
                      variant="success"
                    />
                    <AppButton
                      label="Cancelar"
                      nativeID="screens-admin-trajectory-list-unified-fight-new-cancel"
                      onPress={() => {
                        setIsCreatingFightRecord(false);
                        setEditingFightRecordId(null);
                        setDraftFightType("victoria");
                        setDraftFightOpponent("");
                        setDraftFightDate(formatDateIso(new Date()));
                        setFightRecordError(null);
                      }}
                      testID="screens-admin-trajectory-list-unified-fight-new-cancel"
                      variant="secondary"
                    />
                  </View>
                </AppCard>
              ) : editingFightRecordId === null ? (
                <View style={styles.addActionRow}>
                  <AppButton
                    label="+ Registrar encuentro"
                    nativeID="screens-admin-trajectory-list-unified-fight-add-button"
                    onPress={() => {
                      setIsCreatingFightRecord(true);
                      setEditingFightRecordId(null);
                      setDraftFightType("victoria");
                      setDraftFightOpponent("");
                      setDraftFightDate(formatDateIso(new Date()));
                      setFightRecordError(null);
                    }}
                    testID="screens-admin-trajectory-list-unified-fight-add-button"
                    variant="primary"
                  />
                </View>
              ) : null}
            </View>
          ) : null}

          {/* ========================================== */}
          {/* TAB 3: Cinta y grados (belts)             */}
          {/* ========================================== */}
          {activeTab === "belts" ? (
            <View style={styles.tabPanel}>
              {beltLevelsQuery.isLoading ? (
                <AppCard style={styles.loadingCard}>
                  <Text style={styles.loadingText}>
                    Cargando niveles de cinta…
                  </Text>
                </AppCard>
              ) : (
                <>
                  {beltError ? (
                    <AppCard
                      nativeID="screens-admin-trajectory-list-unified-belt-error"
                      style={[styles.feedbackCard, styles.feedbackDanger]}
                      testID="screens-admin-trajectory-list-unified-belt-error"
                    >
                      <Text style={styles.feedbackText}>{beltError}</Text>
                    </AppCard>
                  ) : null}

                  {/* Cinta actual */}
                  <View style={styles.beltCurrentBlock}>
                    <Text style={styles.beltSectionLabel}>Cinta actual</Text>
                    {activeStudent ? (
                      <View style={styles.beltCurrentRow}>
                        <BeltIndicator
                          beltLevel={activeStudent.current_belt_level}
                          size="md"
                          stripe={activeStudent.current_stripe}
                          testID="screens-admin-trajectory-list-unified-belt-current-indicator"
                        />
                        <View style={styles.beltCurrentCopy}>
                          <Text style={styles.beltCurrentTitle}>
                            {activeStudent.current_belt_level?.display_name ??
                              "Sin cinta asignada"}
                          </Text>
                          <Text style={styles.beltCurrentSubtitle}>
                            {activeStudent.current_stripe
                              ? `Stripe: ${activeStudent.current_stripe.display_name}`
                              : activeStudent.current_belt_level
                                ? "Sin stripe"
                                : "Asigna el primer nivel aquí abajo."}
                          </Text>
                        </View>
                      </View>
                    ) : null}
                  </View>

                  {/* Formulario de nuevo cambio */}
                  <AppCard
                    nativeID="screens-admin-trajectory-list-unified-belt-change-card"
                    style={styles.beltChangeCard}
                    testID="screens-admin-trajectory-list-unified-belt-change-card"
                  >
                    <Text style={styles.beltSectionLabel}>
                      Registrar cambio de grado
                    </Text>
                    <BeltSelector
                      value={beltDraft}
                      onChange={setBeltDraft}
                      levels={beltLevels}
                      label="Nuevo grado"
                      includeNoneOption={false}
                      testID="screens-admin-trajectory-list-unified-belt-selector"
                    />
                    <View style={styles.beltFormRow}>
                      <AppDateInput
                        label="Fecha de otorgamiento"
                        nativeID="screens-admin-trajectory-list-unified-belt-awarded-date"
                        onChangeText={(v) => {
                          if (/^\d{4}-\d{2}-\d{2}$/.test(v) || v.length === 0) {
                            setBeltAwardedAt(v || formatDateIso(new Date()));
                          }
                        }}
                        placeholder="YYYY-MM-DD"
                        testID="screens-admin-trajectory-list-unified-belt-awarded-date"
                        value={beltAwardedAt}
                      />
                    </View>
                    <AppInput
                      label="Notas (opcional)"
                      maxLength={200}
                      multiline
                      nativeID="screens-admin-trajectory-list-unified-belt-notes-input"
                      onChangeText={setBeltNotes}
                      placeholder="Ej: Examen presentado ante el sensei X"
                      testID="screens-admin-trajectory-list-unified-belt-notes-input"
                      value={beltNotes}
                    />
                    <View style={styles.beltFormActions}>
                      <AppButton
                        label="Registrar cambio"
                        loading={
                          updateStudentMutation.isPending ||
                          createBeltHistoryMutation.isPending
                        }
                        nativeID="screens-admin-trajectory-list-unified-belt-submit"
                        onPress={handleSubmitBeltChange}
                        testID="screens-admin-trajectory-list-unified-belt-submit"
                        variant="primary"
                        disabled={!isBeltDirty}
                      />
                    </View>
                    {!isBeltDirty ? (
                      <Text style={styles.beltHint}>
                        Selecciona un nivel o stripe distinto para habilitar el
                        registro.
                      </Text>
                    ) : null}
                  </AppCard>

                  {/* Historial de cambios */}
                  <View style={styles.beltHistoryBlock}>
                    <Text style={styles.beltSectionLabel}>
                      Historial de grados
                    </Text>
                    {beltHistoryQuery.isLoading ? (
                      <AppCard style={styles.loadingCard}>
                        <Text style={styles.loadingText}>
                          Cargando historial…
                        </Text>
                      </AppCard>
                    ) : beltHistory.length === 0 ? (
                      <AppCard
                        nativeID="screens-admin-trajectory-list-unified-belt-history-empty"
                        style={styles.emptyCard}
                        testID="screens-admin-trajectory-list-unified-belt-history-empty"
                      >
                        <Text style={styles.emptyTitle}>
                          Sin historial de grados
                        </Text>
                        <Text style={styles.emptyDescription}>
                          Registra el primer cambio de cinta para comenzar a
                          construir el historial del alumno.
                        </Text>
                      </AppCard>
                    ) : (
                      <ScrollView
                        contentContainerStyle={styles.beltHistoryList}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        style={styles.eventsScroll}
                      >
                        {beltHistory.map((entry) => (
                          <AppCard
                            key={entry.id}
                            nativeID={`screens-admin-trajectory-list-unified-belt-history-row-${entry.id}`}
                            style={styles.beltHistoryRow}
                            testID={`screens-admin-trajectory-list-unified-belt-history-row-${entry.id}`}
                          >
                            <View style={styles.beltHistoryTopRow}>
                              <View style={styles.beltHistoryIndicator}>
                                <BeltIndicator
                                  beltLevel={entry.belt_level}
                                  size="sm"
                                  stripe={entry.stripe}
                                />
                              </View>
                              <View style={styles.beltHistoryCopy}>
                                <Text style={styles.beltHistoryTitle}>
                                  {entry.belt_level?.display_name ??
                                    "Grado registrado"}
                                </Text>
                                <Text style={styles.beltHistorySubtitle}>
                                  {entry.stripe
                                    ? `Stripe: ${entry.stripe.display_name}`
                                    : "Sin stripe"}
                                </Text>
                              </View>
                              <Text style={styles.beltHistoryDate}>
                                {formatDate(entry.awarded_at)}
                              </Text>
                            </View>
                            {entry.notes ? (
                              <Text style={styles.beltHistoryNotes}>
                                {entry.notes}
                              </Text>
                            ) : null}
                          </AppCard>
                        ))}
                      </ScrollView>
                    )}
                  </View>
                </>
              )}
            </View>
          ) : null}
        </KeyboardAvoidingView>
      </AppModal>
    </Screen>
  );
}

// ==========================================================
// Subcomponentes inline del modal unificado (sin dependencias)
// ==========================================================

type FightStatTone = FightRecordType;

function FightRecordStatInline({
  label,
  value,
  tone,
  idPrefix,
}: {
  label: string;
  value: number;
  tone: FightStatTone;
  idPrefix?: string;
}) {
  const baseId = idPrefix ?? `screens-admin-trajectory-list-unified-fight-stat-${tone}`;
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
      <Text
        nativeID={`${baseId}-label`}
        style={styles.fightRecordStatLabel}
        testID={`${baseId}-label`}
      >
        {label}
      </Text>
    </View>
  );
}

function FightRecordFormBlockInline({
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
    <View
      nativeID={`${idPrefix}-form`}
      style={styles.fightRecordFormBlock}
      testID={`${idPrefix}-form`}
    >
      <View
        nativeID={`${idPrefix}-type-row`}
        style={styles.fightRecordTypeRow}
        testID={`${idPrefix}-type-row`}
      >
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
                  (state as typeof state & { hovered?: boolean }).hovered ??
                  false;
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
          <Text style={styles.fightRecordOpponentCounter}>
            {opponentValue.length}/50
          </Text>
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

// ==========================================================
// Estilos
// ==========================================================

const styles = StyleSheet.create({
  screenContent: {
    width: "100%",
  },
  container: {
    alignSelf: "center",
    gap: spacing.lg,
    width: "100%",
  },
  headerBlock: {
    gap: spacing.lg,
    width: "100%",
  },
  headerTop: {
    gap: spacing.md,
    justifyContent: "space-between",
  },
  headerCopy: {
    gap: spacing.xs,
  },
  headerKicker: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  headerTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 24,
    fontWeight: "800",
  },
  headerDescription: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 20,
  },
  metricsGrid: {
    gap: spacing.sm,
  },
  metricCard: {
    borderRadius: radius.md,
    borderColor: colors.border,
    borderWidth: 1,
    gap: spacing.sm,
    minHeight: 96,
    padding: spacing.md,
  },
  metricInfo: {
    backgroundColor: colors.infoSoft,
  },
  metricSuccess: {
    backgroundColor: colors.successSoft,
  },
  metricAmber: {
    backgroundColor: colors.warningSoft,
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
    fontSize: 22,
    fontWeight: "800",
  },
  metricDescription: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 18,
  },
  searchRow: {
    gap: spacing.sm,
  },
  loadingCard: {
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.xl,
  },
  loadingText: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
  },
  resultsTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 16,
    fontWeight: "700",
  },
  resultsDescription: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  errorBlock: {
    flex: 1,
  },
  resultsPanel: {
    gap: spacing.sm,
    padding: 0,
  },
  resultsHead: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  resultsHeadTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 18,
    fontWeight: "800",
  },
  resultsHeadMeta: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
  },
  tableHead: {
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    borderTopColor: colors.border,
    borderTopWidth: 1,
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
  tableScroll: {
    width: "100%",
  },
  tableScrollContent: {
    minWidth: "100%",
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
  tableColStudent: {
    flex: 2.4,
  },
  tableColBelt: {
    flex: 1.4,
  },
  tableColStatus: {
    flex: 1.2,
  },
  tableColCount: {
    flex: 1,
  },
  tableColLast: {
    flex: 1.4,
  },
  tableColActions: {
    flex: 1.6,
  },
  studentName: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 15,
    fontWeight: "700",
  },
  studentCode: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
    marginTop: 2,
  },
  statusText: {
    color: colors.text,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
  },
  countText: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 16,
    fontWeight: "700",
  },
  lastEventText: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
  },
  inlineLink: {
    alignSelf: "flex-start",
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 6,
  },
  inlineLinkHovered: {
    backgroundColor: colors.actionSoft ?? colors.primarySoft,
  },
  inlineLinkPressed: {
    opacity: 0.84,
  },
  inlineLinkLabel: {
    color: colors.action,
    fontFamily: typography.headingFamily,
    fontSize: 13,
    fontWeight: "700",
  },
  inlineLinkLabelUnderlined: {
    textDecorationLine: "underline",
  },
  paginationRow: {
    alignItems: "center",
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  paginationMeta: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
  },

  // ============ Modal unificado ============
  modalContent: {
    gap: spacing.md,
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
  tabsRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  tabButton: {
    alignItems: "center",
    borderRadius: radius.md,
    borderColor: colors.border,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    paddingVertical: spacing.sm,
  },
  tabButtonHovered: {
    backgroundColor: colors.surfaceAlt,
  },
  tabButtonSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  tabButtonPressed: {
    opacity: 0.88,
  },
  tabButtonLabel: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 13,
    fontWeight: "700",
  },
  tabButtonLabelSelected: {
    color: colors.primary,
  },
  miniHeader: {
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderColor: colors.border,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  miniHeaderPhotoBlock: {
    alignItems: "center",
  },
  miniHeaderPhoto: {
    borderRadius: 999,
    borderColor: colors.border,
    borderWidth: 1,
    height: 56,
    width: 56,
  },
  miniHeaderPhotoPlaceholder: {
    alignItems: "center",
    backgroundColor: colors.woodSoft,
    borderRadius: 999,
    borderColor: colors.border,
    borderWidth: 1,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  miniHeaderPhotoInitials: {
    color: colors.woodStrong,
    fontFamily: typography.headingFamily,
    fontSize: 20,
    fontWeight: "800",
  },
  miniHeaderCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  miniHeaderName: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 16,
    fontWeight: "800",
  },
  miniHeaderStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  miniHeaderStatItem: {
    alignItems: "center",
    gap: 2,
  },
  miniHeaderStatValue: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 14,
    fontWeight: "800",
  },
  miniHeaderStatLabel: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 11,
    textTransform: "lowercase",
  },
  tabPanel: {
    gap: spacing.md,
  },
  eventsTopBar: {
    gap: spacing.md,
  },
  eventsDatePickerBlock: {
    gap: spacing.xs,
  },
  eventsQuickNavBlock: {
    gap: spacing.xs,
  },
  eventsSectionLabel: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  eventsQuickList: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  eventsQuickEmpty: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
    fontStyle: "italic",
    paddingVertical: spacing.xs,
  },
  eventsQuickPill: {
    alignItems: "center",
    borderRadius: 999,
    borderColor: colors.border,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  eventsQuickPillActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  eventsQuickPillLabel: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
    fontWeight: "600",
  },
  eventsQuickPillLabelActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  eventsQuickPillDot: {
    backgroundColor: colors.border,
    borderRadius: 999,
    height: 6,
    width: 6,
  },
  eventsQuickPillDotActive: {
    backgroundColor: colors.gold,
  },
  eventsDayHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  eventsDayTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 14,
    fontWeight: "800",
  },
  eventsDayMeta: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
  },
  eventsScroll: {
    maxHeight: 320,
  },
  eventsList: {
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

  // Récord deportivo
  fightTotalsRow: {
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
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 26,
  },
  fightRecordStatAccent: {
    borderRadius: 999,
    height: 3,
    opacity: 0.85,
    width: 28,
  },
  fightRecordStatLabel: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
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

  // Cinta / Grados (belts)
  beltSectionLabel: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
  },
  beltCurrentBlock: {
    gap: spacing.xs,
  },
  beltCurrentRow: {
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderColor: colors.border,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  beltCurrentCopy: {
    flex: 1,
    gap: 2,
  },
  beltCurrentTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 16,
    fontWeight: "800",
  },
  beltCurrentSubtitle: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 18,
  },
  beltChangeCard: {
    gap: spacing.md,
    padding: spacing.md,
  },
  beltFormRow: {
    gap: spacing.xs,
  },
  beltFormActions: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "flex-start",
    marginTop: spacing.xs,
  },
  beltHint: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontStyle: "italic",
    fontSize: 12,
  },
  beltHistoryBlock: {
    gap: spacing.xs,
  },
  beltHistoryList: {
    gap: spacing.sm,
  },
  beltHistoryRow: {
    gap: spacing.xs,
    padding: spacing.md,
  },
  beltHistoryTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  beltHistoryIndicator: {
    minWidth: 64,
  },
  beltHistoryCopy: {
    flex: 1,
    gap: 2,
  },
  beltHistoryTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 14,
    fontWeight: "700",
  },
  beltHistorySubtitle: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
  },
  beltHistoryDate: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
  },
  beltHistoryNotes: {
    backgroundColor: colors.surfaceAlt,
    borderLeftColor: colors.primary,
    borderLeftWidth: 2,
    color: colors.text,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
});

const mobileStyles = StyleSheet.create({
  headerTop: {
    flexDirection: "column",
  },
  metricsGrid: {
    flexDirection: "column",
  },
  tableHead: {
    minWidth: 720,
  },
  tableColStudent: {
    minWidth: 220,
  },
  tableColBelt: {
    minWidth: 160,
  },
  tableColActions: {
    minWidth: 180,
  },
});

const desktopStyles = StyleSheet.create({
  headerTop: {
    flexDirection: "row",
  },
  metricsGrid: {
    flexDirection: "row",
  },
});
