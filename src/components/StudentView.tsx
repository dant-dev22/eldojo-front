import { Feather } from "@expo/vector-icons";
import { Image, Pressable, Platform, StyleSheet, Text, View } from "react-native";

import { AppButton } from "@/components/AppButton";
import { AppCard } from "@/components/AppCard";
import { BeltIndicator } from "@/components/BeltIndicator";
import { colors, radius, spacing, typography } from "@/constants/theme";
import type { FightRecordType, Student, StudentStatus, TrajectoryEvent } from "@/types/api";
import {
  formatCurrency,
  formatDate,
  formatPaymentStatus,
} from "@/utils/format";

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

type FightTotals = { victoria: number; empate: number; derrota: number };

type BranchLike = { id: number; name: string; city: string } | null;
type ClassLike = { id: number; name: string } | null;

export type StudentViewProps = {
  student: Student;
  branch?: BranchLike;
  primaryClass?: ClassLike;
  fightTotals: FightTotals;
  totalEvents: number;
  uniqueDays: number;
  lastEvent: TrajectoryEvent | null;
  isDesktop?: boolean;
  idPrefix?: string;
  onOpenFightRecord?: () => void;
  onGoToEventDate?: (eventDate: string) => void;
};

const DEFAULT_ID_PREFIX = "components-studentview";

export function StudentView({
  student,
  branch = null,
  primaryClass = null,
  fightTotals,
  totalEvents,
  uniqueDays,
  lastEvent,
  isDesktop = false,
  idPrefix = DEFAULT_ID_PREFIX,
  onOpenFightRecord,
  onGoToEventDate,
}: StudentViewProps) {
  const baseId = idPrefix;

  return (
    <AppCard
      nativeID={`${baseId}-card`}
      style={[
        styles.summaryCard,
        Platform.OS === "web" ? (webStyles.studentCardRelative as never) : null,
      ]}
      testID={`${baseId}-card`}
    >
      <View
        style={[
          styles.summaryHeaderSection,
          isDesktop ? desktopStyles.summaryHeaderSection : mobileStyles.summaryHeaderSection,
        ]}
      >
        <View style={styles.summaryPhotoBlock} testID={`${baseId}-photo-block`}>
          {student.photo_url ? (
            <Image
              accessibilityLabel={`Foto de ${student.first_name} ${student.last_name}`}
              source={{ uri: student.photo_url }}
              style={styles.summaryPhoto}
              testID={`${baseId}-photo`}
            />
          ) : (
            <View
              accessibilityLabel={`Iniciales del alumno ${student.first_name} ${student.last_name}`}
              style={styles.summaryPhotoPlaceholder}
              testID={`${baseId}-photo-placeholder`}
            >
              <Text style={styles.summaryPhotoInitials} accessible={false}>
                {student.first_name.charAt(0)}
                {student.last_name.charAt(0)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.summaryHeaderCopy} testID={`${baseId}-header-copy`}>
          <Text style={styles.summaryHeaderName} testID={`${baseId}-name`}>
            {student.first_name} {student.last_name}
          </Text>
          <Text style={styles.summaryHeaderCode} testID={`${baseId}-code`}>
            Código {student.unique_code}
          </Text>
          <View style={styles.summaryHeaderBeltRow} testID={`${baseId}-belt-row`}>
            <BeltIndicator
              beltLevel={student.current_belt_level}
              size="sm"
              stripe={student.current_stripe}
              testID={`${baseId}-belt-${student.id}`}
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
        <View style={styles.summaryInfoBlock} testID={`${baseId}-status-block`}>
          <Text style={styles.summarySectionLabel}>Estado</Text>
          <View style={styles.summaryInfoRow} nativeID={`${baseId}-status-payment`} testID={`${baseId}-status-payment`}>
            <Text style={styles.summaryInfoRowLabel}>Pago</Text>
            <Text style={[styles.summaryInfoRowValue, { color: getStudentPaymentColor(student.payment_status) }]}>
              {formatPaymentStatus(student.payment_status)}
            </Text>
          </View>
          <View style={styles.summaryInfoRow} nativeID={`${baseId}-status-student`} testID={`${baseId}-status-student`}>
            <Text style={styles.summaryInfoRowLabel}>Alumno</Text>
            <Text style={[styles.summaryInfoRowValue, { color: getStudentStatusColor(student.status) }]}>
              {formatStudentStatus(student.status)}
            </Text>
          </View>
          <View style={styles.summaryInfoRow} nativeID={`${baseId}-status-next`} testID={`${baseId}-status-next`}>
            <Text style={styles.summaryInfoRowLabel}>Próximo pago</Text>
            <Text style={styles.summaryInfoRowValue}>{formatDate(student.next_payment_date)}</Text>
          </View>
          <View style={styles.summaryInfoRow} nativeID={`${baseId}-status-fee`} testID={`${baseId}-status-fee`}>
            <Text style={styles.summaryInfoRowLabel}>Mensualidad</Text>
            <Text style={styles.summaryInfoRowValue}>{formatCurrency(student.monthly_fee, student.currency)}</Text>
          </View>
        </View>

        <View style={styles.summaryInfoBlock} testID={`${baseId}-profile-block`}>
          <Text style={styles.summarySectionLabel}>Perfil</Text>
          <View style={styles.summaryInfoRow} nativeID={`${baseId}-profile-birth`} testID={`${baseId}-profile-birth`}>
            <Text style={styles.summaryInfoRowLabel}>Nacimiento</Text>
            <Text style={styles.summaryInfoRowValue}>
              {formatDate(student.birth_date)} · {student.birth_place}
            </Text>
          </View>
          <View style={styles.summaryInfoRow} nativeID={`${baseId}-profile-enrollment`} testID={`${baseId}-profile-enrollment`}>
            <Text style={styles.summaryInfoRowLabel}>Inscripción</Text>
            <Text style={styles.summaryInfoRowValue}>{formatDate(student.enrollment_date)}</Text>
          </View>
          <View style={styles.summaryInfoRow} nativeID={`${baseId}-profile-branch`} testID={`${baseId}-profile-branch`}>
            <Text style={styles.summaryInfoRowLabel}>Sucursal</Text>
            <Text style={styles.summaryInfoRowValue}>
              {branch ? `${branch.name} · ${branch.city}` : `ID ${student.branch_id}`}
            </Text>
          </View>
          <View style={styles.summaryInfoRow} nativeID={`${baseId}-profile-class`} testID={`${baseId}-profile-class`}>
            <Text style={styles.summaryInfoRowLabel}>Clase</Text>
            <Text style={styles.summaryInfoRowValue}>{primaryClass?.name ?? "No asignada"}</Text>
          </View>
        </View>
      </View>

      <View style={styles.summaryDivider} />

      <View style={styles.summaryInfoBlock} testID={`${baseId}-contact-block`}>
        <Text style={styles.summarySectionLabel}>Contacto</Text>
        <View style={styles.summaryInfoRow} nativeID={`${baseId}-guardian-name`} testID={`${baseId}-guardian-name`}>
          <Text style={styles.summaryInfoRowLabel}>Tutor</Text>
          <Text style={styles.summaryInfoRowValue}>{student.guardian_name ?? "No registrado"}</Text>
        </View>
        <View style={styles.summaryInfoRow} nativeID={`${baseId}-guardian-phone`} testID={`${baseId}-guardian-phone`}>
          <Text style={styles.summaryInfoRowLabel}>Teléfono</Text>
          <Text style={styles.summaryInfoRowValue}>{student.guardian_phone ?? "No registrado"}</Text>
        </View>
      </View>

      <View style={styles.summaryDivider} />

      <View
        nativeID={`${baseId}-fight-record-block`}
        style={styles.summaryInfoBlock}
        testID={`${baseId}-fight-record-block`}
      >
        <View style={styles.fightRecordHeaderRow}>
          <Text style={styles.summarySectionLabel}>Récord deportivo</Text>
          {onOpenFightRecord ? (
            <AppButton
              label="Editar"
              nativeID={`${baseId}-fight-record-edit-button`}
              onPress={onOpenFightRecord}
              testID={`${baseId}-fight-record-edit-button`}
              variant="secondary"
            />
          ) : null}
        </View>
        <View style={styles.summaryInfoRow} nativeID={`${baseId}-fight-record-wins`} testID={`${baseId}-fight-record-wins`}>
          <Text style={styles.summaryInfoRowLabel}>Victorias</Text>
          <Text style={[styles.summaryInfoRowValue, { color: getFightTypeColor("victoria") }]}>
            {fightTotals.victoria}
          </Text>
        </View>
        <View style={styles.summaryInfoRow} nativeID={`${baseId}-fight-record-draws`} testID={`${baseId}-fight-record-draws`}>
          <Text style={styles.summaryInfoRowLabel}>Empates</Text>
          <Text style={[styles.summaryInfoRowValue, { color: getFightTypeColor("empate") }]}>
            {fightTotals.empate}
          </Text>
        </View>
        <View style={styles.summaryInfoRow} nativeID={`${baseId}-fight-record-losses`} testID={`${baseId}-fight-record-losses`}>
          <Text style={styles.summaryInfoRowLabel}>Derrotas</Text>
          <Text style={[styles.summaryInfoRowValue, { color: getFightTypeColor("derrota") }]}>
            {fightTotals.derrota}
          </Text>
        </View>
      </View>

      <View style={styles.summaryDivider} />

      <View style={styles.summaryLastEventBlock} testID={`${baseId}-last-event-block`}>
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
            {onGoToEventDate ? (
              <Pressable
                accessibilityRole="link"
                hitSlop={{ bottom: 8, left: 8, right: 8, top: 8 }}
                onPress={() => onGoToEventDate(lastEvent.event_date)}
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
            ) : null}
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

      <View style={styles.summaryDivider} />
    </AppCard>
  );
}

const styles = StyleSheet.create({
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
  fightRecordHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
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
});

const desktopStyles = StyleSheet.create({
  summaryHeaderSection: {
    alignItems: "flex-start",
    flexDirection: "row",
  },
  summaryTwoColGrid: {
    flexDirection: "row",
  },
});

const webStyles = {
  studentCardRelative: {
    position: "relative" as const,
  },
};
