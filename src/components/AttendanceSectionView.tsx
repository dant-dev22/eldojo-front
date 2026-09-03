import { Feather, Ionicons } from "@expo/vector-icons";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { AppBadge } from "@/components/AppBadge";
import { AppDateInput } from "@/components/AppDateInput";
import { AppSelect } from "@/components/AppSelect";
import { SkeletonCardGrid, SkeletonLoader, SkeletonList } from "@/components/SkeletonLoader";
import {
  agedWood as woodAged,
  colors,
  goldenYellow as amber,
  indigoBlue as indigo,
  judogiRed as dangerRed,
  radius,
  spacing,
  tatamiGreen as matchaGreen,
  typography,
} from "@/constants/theme";
import { formatDateTime } from "@/utils/format";

import type { Attendance, AttendanceMethod, StudentAttendanceSummary } from "@/types/api";

export const ATTENDANCE_HISTORY_PAGE_SIZE = 10;

interface AttendanceSectionViewProps {
  studentId: number;
  summary: StudentAttendanceSummary | null;
  history: Attendance[];
  isLoadingSummary?: boolean;
  isLoadingHistory?: boolean;
  summaryError?: unknown;
  historyError?: unknown;
  onLoadMore?: () => void;
  hasMore?: boolean;
  idPrefix?: string;
  onRetrySummary?: () => void;
  onRetryHistory?: () => void;
  onRetryAll?: () => void;

  classOptions?: Array<{ label: string; value: string }>;
  selectedClassId?: string | null;
  onClassChange?: (value: string) => void;

  dateFrom?: string | null;
  dateTo?: string | null;
  onDateFromChange?: (value: string) => void;
  onDateToChange?: (value: string) => void;
  onClearFilters?: () => void;
  hasActiveFilters?: boolean;
}

function formatMethodLabel(method: AttendanceMethod): string {
  return method === "qr" ? "QR" : "Manual";
}

function getMethodTone(method: AttendanceMethod): "success" | "info" | "neutral" {
  return method === "qr" ? "success" : "info";
}

interface KpiCellProps {
  icon: keyof typeof Feather.glyphMap;
  accent: string;
  accentSoft: string;
  title: string;
  value: number | string;
  idPrefix: string;
}

const KpiCell = memo(function KpiCell({ icon, accent, accentSoft, title, value, idPrefix }: KpiCellProps) {
  return (
    <View nativeID={idPrefix} style={styles.kpiCard} testID={idPrefix}>
      <View style={[styles.kpiIconDot, { backgroundColor: accentSoft }]}>
        <Feather name={icon} size={16} color={accent} />
      </View>
      <Text nativeID={`${idPrefix}-title`} style={styles.kpiTitle} testID={`${idPrefix}-title`}>
        {title}
      </Text>
      <Text
        nativeID={`${idPrefix}-value`}
        style={[styles.kpiValue, { color: accent }]}
        testID={`${idPrefix}-value`}
      >
        {value}
      </Text>
    </View>
  );
});

const ClassDistributionBar = memo(function ClassDistributionBar({
  row,
  index,
  maxCount,
  idPrefix,
}: {
  row: StudentAttendanceSummary["by_class"][number];
  index: number;
  maxCount: number;
  idPrefix: string;
}) {
  const barPalette = [indigo, matchaGreen, amber, woodAged, dangerRed];
  const accent = barPalette[index % barPalette.length];
  const safeMax = Math.max(1, maxCount);
  const ratio = row.count / safeMax;
  const widthPct = Math.max(8, Math.min(100, ratio * 100));

  return (
    <View nativeID={`${idPrefix}-row-${row.class_id}`} style={styles.classBarRow} testID={`${idPrefix}-row-${row.class_id}`}>
      <View style={styles.classBarHeader}>
        <Text style={styles.classBarName} numberOfLines={1}>
          {row.class_name}
        </Text>
        <View style={styles.classBarCountBlock}>
          <Text style={[styles.classBarCount, { color: accent }]}>{row.count}</Text>
          <Text style={styles.classBarCountLabel}>asist.</Text>
        </View>
      </View>
      <View style={styles.classBarTrack}>
        <View
          nativeID={`${idPrefix}-row-${row.class_id}-bar`}
          style={[styles.classBarFill, { backgroundColor: accent, width: `${widthPct}%` }]}
          testID={`${idPrefix}-row-${row.class_id}-bar`}
        />
      </View>
    </View>
  );
});

const AttendanceHistoryRow = memo(function AttendanceHistoryRow({
  item,
  idPrefix,
}: {
  item: Attendance;
  idPrefix: string;
}) {
  const className = item.class_obj?.name ?? "Sin clase asignada";
  const disciplineName = item.class_obj?.discipline_name ?? null;
  const baseId = `${idPrefix}-row-${item.id}`;

  return (
    <View nativeID={baseId} style={styles.historyRow} testID={baseId}>
      <View style={styles.historyLeftDot}>
        <Feather name="calendar" size={14} color={woodAged} />
      </View>
      <View style={styles.historyCopy}>
        <View style={styles.historyTitleRow}>
          <Text style={styles.historyDateTime}>{formatDateTime(item.check_in_at)}</Text>
          <AppBadge label={formatMethodLabel(item.method)} tone={getMethodTone(item.method)} />
        </View>
        <Text style={styles.historyClass} numberOfLines={1}>
          {className}
          {disciplineName ? ` · ${disciplineName}` : ""}
        </Text>
        {item.class_obj?.instructor_name ? (
          <Text style={styles.historyInstructor} numberOfLines={1}>
            Impartida por {item.class_obj.instructor_name}
          </Text>
        ) : null}
      </View>
    </View>
  );
});

const EmptyState = memo(function EmptyState({ onRetry }: { onRetry?: () => void }) {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconDot}>
        <Feather name="calendar" size={22} color={woodAged} />
      </View>
      <Text style={styles.emptyTitle}>Sin asistencias registradas</Text>
      <Text style={styles.emptyDescription}>
        Aún no hay asistencias para este alumno. El primer check-in QR o manual se verá aquí.
      </Text>
      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={onRetry}
          style={({ pressed }) => {
            const hovered = (pressed as unknown as { hovered?: boolean }).hovered;
            return [
              styles.emptyRetry,
              pressed || hovered ? styles.emptyRetryHover : null,
            ];
          }}
          testID="attendance-section-empty-retry"
        >
          <Feather name="refresh-cw" size={14} color={colors.onPrimary} />
          <Text style={styles.emptyRetryLabel}>Reintentar</Text>
        </Pressable>
      ) : null}
    </View>
  );
});

const ErrorInline = memo(function ErrorInline({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.errorWrap}>
      <View style={styles.errorIconDot}>
        <Feather name="alert-triangle" size={16} color={dangerRed} />
      </View>
      <View style={styles.errorCopy}>
        <Text style={styles.errorTitle}>{title}</Text>
        <Text style={styles.errorMessage}>{message}</Text>
      </View>
      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={onRetry}
          style={({ pressed }) => {
            const hovered = (pressed as unknown as { hovered?: boolean }).hovered;
            return [
              styles.errorRetry,
              pressed || hovered ? styles.errorRetryHover : null,
            ];
          }}
        >
          <Ionicons name="refresh" size={14} color={woodAged} />
        </Pressable>
      ) : null}
    </View>
  );
});

const SectionHeader = memo(function SectionHeader({
  title,
  subtitle,
  right,
  idPrefix,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  idPrefix: string;
}) {
  return (
    <View nativeID={idPrefix} style={styles.sectionHeader} testID={idPrefix}>
      <View style={styles.sectionHeaderCopy}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {right ?? null}
    </View>
  );
});

export function AttendanceSectionView({
  studentId,
  summary,
  history,
  isLoadingSummary = false,
  isLoadingHistory = false,
  summaryError,
  historyError,
  onLoadMore,
  hasMore = false,
  idPrefix = "attendance-section",
  onRetrySummary,
  onRetryHistory,
  onRetryAll,

  classOptions,
  selectedClassId,
  onClassChange,

  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onClearFilters,
  hasActiveFilters,
}: AttendanceSectionViewProps) {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    setOffset(0);
  }, [studentId, selectedClassId, dateFrom, dateTo]);

  const visible = useMemo(
    () => history.slice(0, offset + ATTENDANCE_HISTORY_PAGE_SIZE),
    [history, offset],
  );

  const maxByClassCount = useMemo(() => {
    if (!summary || summary.by_class.length === 0) return 0;
    return summary.by_class.reduce((m, r) => Math.max(m, r.count), 0);
  }, [summary]);

  const handleLoadMore = useCallback(() => {
    setOffset((prev) => prev + ATTENDANCE_HISTORY_PAGE_SIZE);
    onLoadMore?.();
  }, [onLoadMore]);

  const summaryHasError = Boolean(summaryError);
  const historyHasError = Boolean(historyError);
  const summaryMessage = summaryError instanceof Error ? summaryError.message : "No se pudieron cargar los KPIs.";
  const historyMessage = historyError instanceof Error ? historyError.message : "No se pudo cargar el historial.";

  const summaryEmpty = Boolean(summary && summary.total_attendances === 0);

  const kpiNodes = isLoadingSummary ? (
    <View style={styles.kpiGrid}>
      <SkeletonCardGrid cardHeight={96} columns={2} count={4} idPrefix={`${idPrefix}-kpis`} />
    </View>
  ) : summaryHasError ? (
    <ErrorInline title="No se pudo cargar el resumen" message={summaryMessage} onRetry={onRetrySummary ?? onRetryAll} />
  ) : summaryEmpty ? null : summary ? (
    <View nativeID={`${idPrefix}-kpis`} style={styles.kpiGrid} testID={`${idPrefix}-kpis`}>
      <KpiCell
        idPrefix={`${idPrefix}-kpi-total`}
        icon="hash"
        accent={indigo}
        accentSoft={colors.infoSoft}
        title="Totales"
        value={summary.total_attendances}
      />
      <KpiCell
        idPrefix={`${idPrefix}-kpi-7d`}
        icon="trending-up"
        accent={matchaGreen}
        accentSoft={colors.successSoft}
        title="Últimos 7 días"
        value={summary.last_7_days}
      />
      <KpiCell
        idPrefix={`${idPrefix}-kpi-30d`}
        icon="calendar"
        accent={amber}
        accentSoft={colors.warningSoft}
        title="Últimos 30 días"
        value={summary.last_30_days}
      />
      <KpiCell
        idPrefix={`${idPrefix}-kpi-streak`}
        icon="zap"
        accent={woodAged}
        accentSoft={colors.primarySoft}
        title="Racha actual"
        value={`${summary.streak_days} día${summary.streak_days === 1 ? "" : "s"}`}
      />
    </View>
  ) : null;

  const byClassNodes = isLoadingSummary ? (
    <View style={{ gap: spacing.sm }}>
      <SkeletonLoader height={14} idPrefix={`${idPrefix}-by-class-0`} variant="text" width="55%" />
      <SkeletonLoader height={56} idPrefix={`${idPrefix}-by-class-1`} lines={3} variant="text" width="100%" />
    </View>
  ) : summaryHasError ? null : summaryEmpty ? null : summary && summary.by_class.length > 0 ? (
    <View nativeID={`${idPrefix}-by-class`} style={styles.byClassWrap} testID={`${idPrefix}-by-class`}>
      {summary.by_class.map((row, index) => (
        <ClassDistributionBar
          key={`by-class-${row.class_id}`}
          idPrefix={`${idPrefix}-by-class`}
          index={index}
          maxCount={maxByClassCount}
          row={row}
        />
      ))}
    </View>
  ) : null;

  const canRenderHistory = !isLoadingHistory && !historyHasError && history.length > 0;
  const historyNodes = isLoadingHistory ? (
    <SkeletonList count={5} idPrefix={`${idPrefix}-history-skeleton`} />
  ) : historyHasError ? (
    <ErrorInline
      title="No se pudo cargar el historial"
      message={historyMessage}
      onRetry={onRetryHistory ?? onRetryAll}
    />
  ) : history.length === 0 && summaryEmpty ? (
    <EmptyState onRetry={onRetryAll ?? onRetryHistory} />
  ) : canRenderHistory ? (
    <>
      <FlatList
        data={visible}
        keyExtractor={(item) => `attendance-${item.id}`}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <AttendanceHistoryRow idPrefix={`${idPrefix}-history`} item={item} />
        )}
        ItemSeparatorComponent={() => <View style={styles.historyDivider} />}
        ListHeaderComponent={
          <SectionHeader
            idPrefix={`${idPrefix}-history-header`}
            title="Historial de asistencias"
            subtitle={summary ? `Mostrando ${visible.length} de ${summary.total_attendances} registros` : undefined}
          />
        }
        ListEmptyComponent={null}
      />
      {hasMore || visible.length < history.length ? (
        <Pressable
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={handleLoadMore}
          style={({ pressed }) => {
            const hovered = (pressed as unknown as { hovered?: boolean }).hovered;
            return [
              styles.loadMoreBtn,
              pressed || hovered ? styles.loadMoreBtnHover : null,
            ];
          }}
          testID={`${idPrefix}-history-load-more`}
        >
          <Feather name="chevrons-down" size={16} color={woodAged} />
          <Text style={styles.loadMoreLabel}>Cargar más</Text>
        </Pressable>
      ) : null}
    </>
  ) : null;

  return (
    <View nativeID={idPrefix} style={styles.root} testID={idPrefix}>
      <SectionHeader
        idPrefix={`${idPrefix}-summary-header`}
        title="Asistencias y actividad"
        subtitle={
          summary
            ? `Primera: ${summary.first_attendance_at ? formatDateTime(summary.first_attendance_at) : "Sin registros"} · Última: ${summary.last_attendance_at ? formatDateTime(summary.last_attendance_at) : "—"}`
            : "KPIs de asistencia del alumno"
        }
      />

      {classOptions || dateFrom || dateTo ? (
        <View nativeID={`${idPrefix}-filters`} style={styles.filtersWrap} testID={`${idPrefix}-filters`}>
          <View style={styles.filtersRow}>
            {classOptions ? (
              <View style={styles.filterCol}>
                <AppSelect
                  enabled={onClassChange ? true : false}
                  items={classOptions}
                  label="Clase"
                  nativeID={`${idPrefix}-filter-class`}
                  onValueChange={(v) => onClassChange?.(v)}
                  placeholder="Todas las clases"
                  testID={`${idPrefix}-filter-class`}
                  value={selectedClassId ?? ""}
                />
              </View>
            ) : null}
          </View>
          <View style={styles.filtersRow}>
            {onDateFromChange ? (
              <View style={styles.filterCol}>
                <AppDateInput
                  editable
                  label="Desde"
                  nativeID={`${idPrefix}-filter-date-from`}
                  onChangeText={onDateFromChange}
                  placeholder="YYYY-MM-DD"
                  testID={`${idPrefix}-filter-date-from`}
                  value={dateFrom ?? ""}
                />
              </View>
            ) : null}
            {onDateToChange ? (
              <View style={styles.filterCol}>
                <AppDateInput
                  editable
                  label="Hasta"
                  nativeID={`${idPrefix}-filter-date-to`}
                  onChangeText={onDateToChange}
                  placeholder="YYYY-MM-DD"
                  testID={`${idPrefix}-filter-date-to`}
                  value={dateTo ?? ""}
                />
              </View>
            ) : null}
          </View>
          {hasActiveFilters ? (
            <View style={styles.filtersActionsRow}>
              <Text style={styles.filtersActiveBadgeLabel}>Filtros activos</Text>
              <Pressable
                accessibilityRole="button"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={onClearFilters}
                style={({ pressed }) => {
                  const hovered = (pressed as unknown as { hovered?: boolean }).hovered;
                  return [
                    styles.filtersClearBtn,
                    pressed || hovered ? styles.filtersClearBtnHover : null,
                  ];
                }}
                testID={`${idPrefix}-filters-clear`}
              >
                <Feather name="x" size={14} color={colors.onPrimary} />
                <Text style={styles.filtersClearBtnLabel}>Quitar filtros</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}

      {kpiNodes}
      {byClassNodes}
      {historyNodes}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    width: "100%",
  },
  filtersWrap: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  filtersRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  filterCol: {
    flex: 1,
    minWidth: 0,
  },
  filtersActionsRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  filtersActiveBadgeLabel: {
    color: indigo,
    fontFamily: typography.headingFamily,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  filtersClearBtn: {
    alignItems: "center",
    backgroundColor: dangerRed,
    borderRadius: radius.sm,
    flexDirection: "row",
    gap: 6,
    minHeight: 36,
    paddingHorizontal: spacing.md,
  },
  filtersClearBtnHover: {
    backgroundColor: "#B71C1C",
  },
  filtersClearBtnLabel: {
    color: colors.onPrimary,
    fontFamily: typography.headingFamily,
    fontSize: 12,
    fontWeight: "700",
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  sectionHeaderCopy: {
    flex: 1,
    gap: 2,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.1,
    lineHeight: 22,
  },
  sectionSubtitle: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
    lineHeight: 18,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  kpiCard: {
    alignItems: "flex-start",
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: "48%",
    flexGrow: 1,
    gap: spacing.xs,
    minHeight: 96,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  kpiIconDot: {
    alignItems: "center",
    borderRadius: 999,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  kpiTitle: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  kpiValue: {
    fontFamily: typography.headingFamily,
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28,
  },
  byClassWrap: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  classBarRow: {
    gap: spacing.xs,
  },
  classBarHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  classBarName: {
    color: colors.text,
    flex: 1,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  classBarCountBlock: {
    alignItems: "baseline",
    flexDirection: "row",
    gap: 4,
  },
  classBarCount: {
    fontFamily: typography.headingFamily,
    fontSize: 16,
    fontWeight: "800",
  },
  classBarCountLabel: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 11,
    fontWeight: "500",
  },
  classBarTrack: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    height: 8,
    overflow: "hidden",
    width: "100%",
  },
  classBarFill: {
    borderRadius: radius.sm,
    height: "100%",
  },
  historyRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  historyDivider: {
    backgroundColor: colors.border,
    height: 1,
    opacity: 0.6,
    width: "100%",
  },
  historyLeftDot: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    height: 32,
    justifyContent: "center",
    marginTop: 4,
    width: 32,
  },
  historyCopy: {
    flex: 1,
    gap: 2,
  },
  historyTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  historyDateTime: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 13,
    fontWeight: "700",
  },
  historyClass: {
    color: colors.wood,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
  },
  historyInstructor: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 11,
    lineHeight: 15,
  },
  emptyWrap: {
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xl,
  },
  emptyIconDot: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    height: 44,
    justifyContent: "center",
    marginBottom: spacing.xs,
    width: 44,
  },
  emptyTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
    textAlign: "center",
  },
  emptyDescription: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
    lineHeight: 18,
    maxWidth: 420,
    textAlign: "center",
  },
  emptyRetry: {
    alignItems: "center",
    backgroundColor: woodAged,
    borderRadius: radius.sm,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    marginTop: spacing.sm,
    minHeight: 40,
    paddingHorizontal: spacing.md,
  },
  emptyRetryHover: {
    backgroundColor: agedWoodHover(),
  },
  emptyRetryLabel: {
    color: colors.onPrimary,
    fontFamily: typography.headingFamily,
    fontSize: 12,
    fontWeight: "700",
  },
  errorWrap: {
    alignItems: "center",
    backgroundColor: colors.dangerSoft,
    borderColor: "rgba(198,40,40,0.22)",
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  errorIconDot: {
    alignItems: "center",
    borderRadius: 999,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  errorCopy: {
    flex: 1,
    gap: 2,
  },
  errorTitle: {
    color: dangerRed,
    fontFamily: typography.headingFamily,
    fontSize: 13,
    fontWeight: "800",
  },
  errorMessage: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
    lineHeight: 17,
  },
  errorRetry: {
    alignItems: "center",
    borderRadius: 999,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  errorRetryHover: {
    backgroundColor: colors.surface,
  },
  loadMoreBtn: {
    alignSelf: "center",
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 40,
    paddingHorizontal: spacing.lg,
  },
  loadMoreBtnHover: {
    backgroundColor: colors.surfaceAlt,
  },
  loadMoreLabel: {
    color: woodAged,
    fontFamily: typography.headingFamily,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
});

function agedWoodHover() {
  return "#6D4C41";
}
