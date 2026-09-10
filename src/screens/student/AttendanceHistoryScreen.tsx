import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { meApi } from "@/api/meApi";
import { getErrorMessage } from "@/api/http";
import { ATTENDANCE_HISTORY_PAGE_SIZE, AttendanceSectionView } from "@/components/AttendanceSectionView";
import { Screen } from "@/components/Screen";
import { StatusView } from "@/components/StatusView";
import { colors, radius, spacing, typography } from "@/constants/theme";
import type { StudentStackParamList } from "@/navigation/types";

import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

const STUDENT_EMPTY_TITLE = "Aún no tienes asistencias registradas.";
const STUDENT_EMPTY_DESCRIPTION = "¡Empieza entrenando! Tu primer check-in QR o manual aparecerá aquí.";

export function AttendanceHistoryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<StudentStackParamList>>();

  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);

  const profileQuery = useQuery({
    queryKey: ["my-profile"],
    queryFn: meApi.getProfile,
    staleTime: 300_000,
  });

  const filters = useMemo(
    () => ({
      class_id: selectedClassId ? Number(selectedClassId) : undefined,
      date_from: dateFrom ?? undefined,
      date_to: dateTo ?? undefined,
    }),
    [selectedClassId, dateFrom, dateTo]
  );

  const summaryQuery = useQuery({
    queryKey: ["my-attendance-summary", filters],
    queryFn: () => meApi.getMyAttendanceSummary(filters),
    placeholderData: keepPreviousData,
    staleTime: 120_000,
  });

  const historyQuery = useQuery({
    queryKey: ["my-attendance", { offset, limit: ATTENDANCE_HISTORY_PAGE_SIZE, ...filters }],
    queryFn: () =>
      meApi.getMyAttendance({
        limit: ATTENDANCE_HISTORY_PAGE_SIZE,
        offset,
        class_id: filters.class_id,
        date_from: filters.date_from,
        date_to: filters.date_to,
      }),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  const pagesLoaded = Math.floor(offset / ATTENDANCE_HISTORY_PAGE_SIZE) + 1;
  const hasMore =
    historyQuery.isSuccess &&
    historyQuery.data.length === ATTENDANCE_HISTORY_PAGE_SIZE * pagesLoaded;

  const classOptions = useMemo(() => {
    if (!profileQuery.data?.available_classes?.length) return undefined;
    return profileQuery.data.available_classes.map((c) => ({
      label: c.name,
      value: String(c.id),
    }));
  }, [profileQuery.data]);

  const history = useMemo(() => historyQuery.data ?? [], [historyQuery.data]);
  const summary = summaryQuery.data ?? null;

  const hasActiveFilters = Boolean(
    selectedClassId !== null || dateFrom !== null || dateTo !== null
  );

  const handleClassChange = (value: string) => {
    setSelectedClassId(value || null);
    setOffset(0);
    void summaryQuery.refetch();
    void historyQuery.refetch();
  };

  const handleDateFromChange = (value: string) => {
    setDateFrom(value || null);
    setOffset(0);
  };

  const handleDateToChange = (value: string) => {
    setDateTo(value || null);
    setOffset(0);
  };

  const handleClearFilters = () => {
    setSelectedClassId(null);
    setDateFrom(null);
    setDateTo(null);
    setOffset(0);
  };

  const handleLoadMore = () => {
    if (!hasMore || historyQuery.isFetching) return;
    setOffset((prev) => prev + ATTENDANCE_HISTORY_PAGE_SIZE);
  };

  const isLoading =
    profileQuery.isLoading ||
    (summaryQuery.isLoading && !summaryQuery.data) ||
    (historyQuery.isLoading && !historyQuery.data);
  const anyError = profileQuery.error || summaryQuery.error || historyQuery.error;

  if (isLoading) {
    return (
      <Screen scrollable>
        <StatusView
          title="Cargando historial"
          description="Estamos preparando tus asistencias y filtros."
          loading
        />
      </Screen>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <Screen scrollable>
        <StatusView
          title="No pudimos cargar tu perfil"
          description={getErrorMessage(profileQuery.error)}
        />
      </Screen>
    );
  }

  return (
    <Screen scrollable>
      <View style={styles.root}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Volver"
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [styles.backButton, pressed && styles.backPressed]}
          >
            <Feather color={colors.text} name="arrow-left" size={20} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Historial de asistencias</Text>
            <Text style={styles.headerSub}>
              Revisa cada clase que has tomado y sigue tu progreso en el dojo.
            </Text>
          </View>
        </View>

        {anyError && !summary && history.length === 0 ? (
          <StatusView
            description={getErrorMessage(anyError)}
            title="No pudimos cargar tu historial"
          />
        ) : (
          <AttendanceSectionView
            classOptions={classOptions}
            dateFrom={dateFrom}
            dateTo={dateTo}
            emptyDescription={STUDENT_EMPTY_DESCRIPTION}
            emptyTitle={STUDENT_EMPTY_TITLE}
            hasActiveFilters={hasActiveFilters}
            hasMore={Boolean(hasMore)}
            history={history}
            historyError={historyQuery.error}
            idPrefix="student-attendance-history"
            isLoadingHistory={historyQuery.isFetching && !historyQuery.data}
            isLoadingSummary={summaryQuery.isFetching && !summaryQuery.data}
            onClassChange={handleClassChange}
            onClearFilters={handleClearFilters}
            onDateFromChange={handleDateFromChange}
            onDateToChange={handleDateToChange}
            onLoadMore={handleLoadMore}
            onRetryAll={() => {
              void profileQuery.refetch();
              void summaryQuery.refetch();
              void historyQuery.refetch();
            }}
            onRetryHistory={() => void historyQuery.refetch()}
            onRetrySummary={() => void summaryQuery.refetch()}
            selectedClassId={selectedClassId}
            studentId={profileQuery.data.student_id}
            summary={summary}
            summaryError={summaryQuery.error}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
  },
  backButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  backPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  headerTitle: {
    color: colors.text,
    fontFamily: typography.displayFamily,
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 30,
  },
  headerSub: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.xs,
  },
});
