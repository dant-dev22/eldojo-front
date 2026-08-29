import { Feather, Ionicons } from "@expo/vector-icons";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { AppBadge } from "@/components/AppBadge";
import { BeltIndicator } from "@/components/BeltIndicator";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatPaymentMethod,
  formatPaymentRecordStatus,
  formatPaymentStatus,
} from "@/utils/format";

import type {
  AuthorizedPerson,
  Branch,
  DocumentType,
  EmergencyContact,
  FightRecordType,
  MartialClass,
  MedicalRecord,
  Payment,
  PaymentRecordStatus,
  PaymentStatus,
  Student,
  StudentDocument,
  StudentFightRecord,
  StudentStatus,
  TrajectoryEvent,
} from "@/types/api";

const MIN_TOUCH_TARGET = 44;
const TOUCH_HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };
const DEFAULT_PAGE_SIZE = 5;
const PAYMENT_PAGE_SIZE_DESKTOP = 5;
const PAYMENT_PAGE_SIZE_MOBILE = 3;
const FIGHT_PAGE_SIZE = 4;
const MAX_ROWS_PER_INFO_SECTION = 6;

interface StudentDetailViewProps {
  student: Student;
  payments: Payment[];
  branch: Branch | null;
  primaryClass: MartialClass | null;
  idPrefix?: string;
  onQrPress?: () => void;
  fightRecords?: StudentFightRecord[];
  trajectoryEvents?: TrajectoryEvent[];
  totalTrajectoryEvents?: number;
  uniqueTrajectoryDays?: number;
  lastTrajectoryEvent?: TrajectoryEvent | null;
  onEditFightRecord?: () => void;
  onGoToTrajectory?: () => void;
  onOpenLastEvent?: () => void;
}

interface InfoRowData {
  label: string;
  value: string;
  valueColor?: string;
  icon?: keyof typeof Feather.glyphMap;
}

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  idPrefix?: string;
}

interface InfoListSectionProps {
  title: string;
  subtitle?: string;
  rows: InfoRowData[];
  emptyConfig?: EmptyStateConfig;
  idPrefix?: string;
}

interface EmptyStateConfig {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
  hint?: string;
}

interface PaginatedListState {
  page: number;
  pageSize: number;
}

const EMPTY_CONTACTS: EmptyStateConfig = {
  icon: "phone-off",
  title: "Sin contactos de emergencia",
  description: "Aún no hay personas registradas para notificar en caso de incidente.",
  hint: "Agrega al menos un contacto desde el formulario del alumno.",
};

const EMPTY_DOCUMENTS: EmptyStateConfig = {
  icon: "file-minus",
  title: "Sin documentos adjuntos",
  description: "No existen waivers, consentimientos ni archivos para este alumno.",
  hint: "Sube el waiver de responsabilidad y el consentimiento de fotos para completar la ficha.",
};

const EMPTY_AUTHORIZED: EmptyStateConfig = {
  icon: "user-x",
  title: "Sin personas autorizadas",
  description: "Como es menor de edad, debes registrar quién puede retirarlo del dojo.",
  hint: "Verifica el DNI de cada persona autorizada antes de guardar.",
};

const EMPTY_MEDICAL: EmptyStateConfig = {
  icon: "heart",
  title: "Ficha médica sin completar",
  description: "No contamos con información clínica relevante para proteger al alumno.",
  hint: "Registra tipo de sangre, alergias y médico tratante como mínimo.",
};

const EMPTY_PAYMENTS: EmptyStateConfig = {
  icon: "credit-card",
  title: "Sin pagos registrados",
  description: "Todavía no hay movimientos financieros asociados a este alumno.",
  hint: "El primer pago se registra desde el módulo de cobranza.",
};

const EMPTY_CONTACT: EmptyStateConfig = {
  icon: "phone-missed",
  title: "Sin vías de contacto",
  description: "No hay teléfono, email ni tutor asignados para comunicarse.",
  hint: "Agrega al menos un teléfono principal para recepción y emergencias.",
};

const EMPTY_FIGHTS: EmptyStateConfig = {
  icon: "activity",
  title: "Sin peleas registradas",
  description: "Todavía no hay eventos deportivos (victorias, empates o derrotas).",
  hint: "Registra torneos o exámenes desde la ficha del alumno.",
};

const EMPTY_TRAJECTORY: EmptyStateConfig = {
  icon: "award",
  title: "Sin hitos de trayectoria",
  description: "No existen hitos, graduaciones o recuerdos guardados.",
  hint: "Abre el calendario de trayectoria para agregar el primer suceso.",
};

function getStudentPaymentTone(status: PaymentStatus): "success" | "warning" | "danger" | "neutral" {
  switch (status) {
    case "up_to_date":
      return "success";
    case "partial":
    case "due_soon":
      return "warning";
    case "late":
    case "overdue":
      return "danger";
    default:
      return "neutral";
  }
}

function getStudentStatusTone(status: StudentStatus): "success" | "warning" | "neutral" {
  switch (status) {
    case "active":
      return "success";
    case "frozen":
      return "warning";
    default:
      return "neutral";
  }
}

function getPaymentRecordTone(status: PaymentRecordStatus): "success" | "warning" | "danger" {
  switch (status) {
    case "paid":
      return "success";
    case "pending":
      return "warning";
    case "void":
      return "danger";
    default:
      return "warning";
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

function formatDocumentType(type: DocumentType): string {
  switch (type) {
    case "liability_waiver":
      return "Waiver de responsabilidad";
    case "photo_consent":
      return "Consentimiento de fotos";
    case "other":
      return "Documento general";
    default:
      return type;
  }
}

function formatInsuranceType(type: string): string {
  switch (type) {
    case "public":
      return "Seguro público";
    case "private":
      return "Seguro privado";
    case "none":
      return "Sin seguro";
    default:
      return type;
  }
}

function usePaginatedList<T>(items: T[], pageSize: number) {
  const [page, setInternalPage] = useState(1);

  useEffect(() => {
    setInternalPage(1);
  }, [items.length]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = items.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const pageEnd = Math.min(safePage * pageSize, items.length);
  const paginatedItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize],
  );

  const setPage = useCallback(
    (next: number) => {
      setInternalPage((current) => Math.max(1, Math.min(totalPages, next)));
    },
    [totalPages],
  );

  return {
    page: safePage,
    totalPages,
    pageStart,
    pageEnd,
    paginatedItems,
    setPage,
  };
}

const SectionHeader = memo(function SectionHeader({
  title,
  subtitle,
  right,
  idPrefix,
}: SectionHeaderProps) {
  const baseId = idPrefix ?? "student-detail-section";
  return (
    <View
      nativeID={`${baseId}-header`}
      style={styles.sectionHeader}
      testID={`${baseId}-header`}
    >
      <View style={styles.sectionHeaderCopy}>
        <Text
          nativeID={`${baseId}-title`}
          style={styles.sectionTitle}
          testID={`${baseId}-title`}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            nativeID={`${baseId}-subtitle`}
            style={styles.sectionSubtitle}
            testID={`${baseId}-subtitle`}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ?? null}
    </View>
  );
});

const InfoRow = memo(function InfoRow({
  label,
  value,
  valueColor,
  icon,
  idPrefix,
  isLast = false,
}: InfoRowData & { idPrefix?: string; isLast?: boolean }) {
  return (
    <View
      nativeID={idPrefix}
      style={[styles.infoRow, isLast ? styles.infoRowLast : styles.infoRowBorder]}
      testID={idPrefix}
    >
      <View style={styles.infoRowLabelBlock}>
        {icon ? (
          <Feather
            name={icon}
            size={14}
            color={colors.wood}
            style={styles.infoRowIcon}
          />
        ) : null}
        <Text
          nativeID={`${idPrefix}-label`}
          style={styles.infoRowLabel}
          testID={`${idPrefix}-label`}
        >
          {label}
        </Text>
      </View>
      <Text
        nativeID={`${idPrefix}-value`}
        style={[styles.infoRowValue, valueColor ? { color: valueColor } : null]}
        testID={`${idPrefix}-value`}
        numberOfLines={3}
      >
        {value}
      </Text>
    </View>
  );
});

const EmptyInline = memo(function EmptyInline({ config }: { config: EmptyStateConfig }) {
  return (
    <View style={styles.emptyInlineWrap}>
      <View style={styles.emptyIconDot}>
        <Feather name={config.icon} size={20} color={colors.wood} />
      </View>
      <Text style={styles.emptyTitle}>{config.title}</Text>
      <Text style={styles.emptyDescription}>{config.description}</Text>
      {config.hint ? <Text style={styles.emptyHint}>{config.hint}</Text> : null}
    </View>
  );
});

const InfoListSection = memo(function InfoListSection({
  title,
  subtitle,
  rows,
  emptyConfig,
  idPrefix,
}: InfoListSectionProps) {
  const baseId = idPrefix ?? `student-detail-info-${title.toLowerCase().replace(/\s+/g, "-")}`;
  const hasRows = rows.length > 0;

  return (
    <View nativeID={baseId} style={styles.section} testID={baseId}>
      <SectionHeader title={title} subtitle={subtitle} idPrefix={baseId} />
      <View
        nativeID={`${baseId}-list`}
        style={[
          styles.infoList,
          hasRows ? null : styles.infoListEmpty,
        ]}
        testID={`${baseId}-list`}
      >
        {hasRows ? (
          rows.map((row, index) => (
            <InfoRow
              key={`${baseId}-row-${index}`}
              idPrefix={`${baseId}-row-${index}`}
              label={row.label}
              value={row.value}
              valueColor={row.valueColor}
              icon={row.icon}
              isLast={index === rows.length - 1}
            />
          ))
        ) : emptyConfig ? (
          <EmptyInline config={emptyConfig} />
        ) : null}
      </View>
    </View>
  );
});

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  pageStart: number;
  pageEnd: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  idPrefix?: string;
}

const PaginationControls = memo(function PaginationControls({
  page,
  totalPages,
  pageStart,
  pageEnd,
  total,
  onPrev,
  onNext,
  idPrefix,
}: PaginationControlsProps) {
  const { isDesktop } = useResponsiveLayout();
  const baseId = idPrefix ?? "student-detail-pagination";
  const liveText = `Página ${page} de ${totalPages}. Mostrando ${pageStart} a ${pageEnd} de ${total} registros.`;

  return (
    <View
      nativeID={baseId}
      style={[
        styles.pagination,
        isDesktop ? desktopStyles.pagination : mobileStyles.pagination,
      ]}
      testID={baseId}
    >
      <Pressable
        accessibilityLabel="Página anterior"
        accessibilityRole="link"
        disabled={page === 1}
        hitSlop={TOUCH_HIT_SLOP}
        onPress={onPrev}
        style={(state) => {
          const hovered = (state as typeof state & { hovered?: boolean }).hovered;
          const disabled = page === 1;
          return [
            styles.pagLink,
            disabled ? styles.pagLinkDisabled : null,
            hovered && !disabled ? styles.pagLinkHovered : null,
            state.pressed && !disabled ? styles.pagLinkPressed : null,
          ];
        }}
        testID={`${baseId}-prev`}
      >
        <Ionicons
          name="chevron-back"
          size={14}
          color={page === 1 ? colors.textMuted : colors.wood}
        />
        <Text
          style={[
            styles.pagLinkLabel,
            page === 1 ? { color: colors.textMuted, opacity: 0.5 } : null,
          ]}
        >
          Anterior
        </Text>
      </Pressable>
      <Text accessibilityLiveRegion="polite" style={styles.paginationMeta}>
        {liveText}
      </Text>
      <Pressable
        accessibilityLabel="Página siguiente"
        accessibilityRole="link"
        disabled={page === totalPages}
        hitSlop={TOUCH_HIT_SLOP}
        onPress={onNext}
        style={(state) => {
          const hovered = (state as typeof state & { hovered?: boolean }).hovered;
          const disabled = page === totalPages;
          return [
            styles.pagLink,
            disabled ? styles.pagLinkDisabled : null,
            hovered && !disabled ? styles.pagLinkHovered : null,
            state.pressed && !disabled ? styles.pagLinkPressed : null,
          ];
        }}
        testID={`${baseId}-next`}
      >
        <Text
          style={[
            styles.pagLinkLabel,
            page === totalPages ? { color: colors.textMuted, opacity: 0.5 } : null,
          ]}
        >
          Siguiente
        </Text>
        <Ionicons
          name="chevron-forward"
          size={14}
          color={page === totalPages ? colors.textMuted : colors.wood}
        />
      </Pressable>
    </View>
  );
});

interface PaginatedListSectionProps<T> {
  title: string;
  subtitle?: string;
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string;
  emptyConfig?: EmptyStateConfig;
  pageSize?: number;
  idPrefix?: string;
  headerRight?: React.ReactNode;
}

function PaginatedListSection<T>({
  title,
  subtitle,
  items,
  renderItem,
  keyExtractor,
  emptyConfig,
  pageSize = DEFAULT_PAGE_SIZE,
  idPrefix,
  headerRight,
}: PaginatedListSectionProps<T>) {
  const baseId = idPrefix ?? `student-detail-list-${title.toLowerCase().replace(/\s+/g, "-")}`;
  const { page, totalPages, pageStart, pageEnd, paginatedItems, setPage } = usePaginatedList(
    items,
    pageSize,
  );
  const hasItems = items.length > 0;

  return (
    <View nativeID={baseId} style={styles.section} testID={baseId}>
      <SectionHeader
        title={title}
        subtitle={subtitle}
        idPrefix={baseId}
        right={
          <>
            {headerRight ?? null}
            {hasItems && !headerRight ? (
              <Text style={styles.sectionMeta}>
                {pageStart}-{pageEnd} de {items.length}
              </Text>
            ) : null}
          </>
        }
      />
      <View
        nativeID={`${baseId}-list`}
        style={[styles.infoList, hasItems ? null : styles.infoListEmpty]}
        testID={`${baseId}-list`}
      >
        {hasItems ? (
          paginatedItems.map((item, localIndex) => {
            const absoluteIndex = (page - 1) * pageSize + localIndex;
            const isLast = localIndex === paginatedItems.length - 1;
            return (
              <View key={keyExtractor(item)} style={isLast ? null : styles.listItemDivider}>
                {renderItem(item, absoluteIndex)}
              </View>
            );
          })
        ) : emptyConfig ? (
          <EmptyInline config={emptyConfig} />
        ) : null}
      </View>
      {hasItems && totalPages > 1 ? (
        <PaginationControls
          idPrefix={`${baseId}-pagination`}
          page={page}
          totalPages={totalPages}
          pageStart={pageStart}
          pageEnd={pageEnd}
          total={items.length}
          onPrev={() => setPage(page - 1)}
          onNext={() => setPage(page + 1)}
        />
      ) : null}
    </View>
  );
}

function EmergencyContactRow({
  contact,
  index,
  idPrefix,
}: {
  contact: EmergencyContact;
  index: number;
  idPrefix: string;
}) {
  const baseId = `${idPrefix}-${contact.id}`;
  const innerRows: InfoRowData[] = [];

  innerRows.push({
    label: "Teléfono principal",
    value: contact.phone,
    icon: "phone",
  });
  if (contact.secondary_phone) {
    innerRows.push({
      label: "Teléfono secundario",
      value: contact.secondary_phone,
      icon: "phone-call",
    });
  }
  if (contact.email) {
    innerRows.push({
      label: "Email",
      value: contact.email,
      icon: "mail",
    });
  }
  if (contact.notes) {
    innerRows.push({
      label: "Notas",
      value: contact.notes,
      icon: "info",
    });
  }

  return (
    <View nativeID={baseId} style={styles.itemWithHeader} testID={baseId}>
      <View style={styles.contactRowHeader}>
        <View style={styles.contactAvatar}>
          <Text style={styles.contactAvatarText}>
            {contact.full_name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.contactRowHeaderCopy}>
          <Text style={styles.itemName}>
            {contact.full_name}
            {contact.relationship ? ` · ${contact.relationship}` : ""}
          </Text>
          <Text style={styles.itemSubtitle}>Prioridad {contact.priority}</Text>
        </View>
      </View>
      <View style={styles.itemFields}>
        {innerRows.map((row, rowIndex) => (
          <InfoRow
            key={`${baseId}-field-${rowIndex}`}
            idPrefix={`${baseId}-field-${rowIndex}`}
            label={row.label}
            value={row.value}
            icon={row.icon}
            isLast={rowIndex === innerRows.length - 1}
          />
        ))}
      </View>
    </View>
  );
}

function DocumentRow({
  document,
  index,
  idPrefix,
}: {
  document: StudentDocument;
  index: number;
  idPrefix: string;
}) {
  const baseId = `${idPrefix}-${document.id}`;
  const innerRows: InfoRowData[] = [];

  if (document.file_name) {
    innerRows.push({
      label: "Archivo",
      value: document.file_name,
      icon: "paperclip",
    });
  }
  if (document.signed_at) {
    innerRows.push({
      label: "Fecha de firma",
      value: formatDate(document.signed_at),
      icon: "calendar",
    });
  }
  if (document.signed_by_full_name) {
    innerRows.push({
      label: "Firmado por",
      value: document.signed_by_full_name,
      icon: "user-check",
    });
  }
  if (document.expires_at) {
    innerRows.push({
      label: "Vencimiento",
      value: formatDate(document.expires_at),
      icon: "clock",
    });
  }
  if (document.notes) {
    innerRows.push({
      label: "Notas",
      value: document.notes,
      icon: "info",
    });
  }

  return (
    <View nativeID={baseId} style={styles.itemWithHeader} testID={baseId}>
      <View style={styles.documentRowTop}>
        <View style={styles.documentIconBlock}>
          <Feather name="file-text" size={18} color={colors.wood} />
        </View>
        <View style={styles.documentTopCopy}>
          <Text style={styles.itemName}>{document.title}</Text>
          <Text style={styles.itemSubtitle}>
            {formatDocumentType(document.document_type)}
          </Text>
        </View>
        {document.signed_at ? (
          <AppBadge label="Firmado" tone="success" />
        ) : (
          <AppBadge label="Pendiente" tone="warning" />
        )}
      </View>
      {innerRows.length > 0 ? (
        <View style={styles.itemFields}>
          {innerRows.map((row, rowIndex) => (
            <InfoRow
              key={`${baseId}-field-${rowIndex}`}
              idPrefix={`${baseId}-field-${rowIndex}`}
              label={row.label}
              value={row.value}
              icon={row.icon}
              isLast={rowIndex === innerRows.length - 1}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function AuthorizedPersonRow({
  person,
  index,
  idPrefix,
}: {
  person: AuthorizedPerson;
  index: number;
  idPrefix: string;
}) {
  const baseId = `${idPrefix}-${person.id}`;
  const innerRows: InfoRowData[] = [];

  if (person.dni_type || person.dni_number) {
    innerRows.push({
      label: "Documento",
      value: `${person.dni_type ?? ""} ${person.dni_number}`.trim(),
      icon: "credit-card",
    });
  }
  innerRows.push({
    label: "Teléfono principal",
    value: person.phone,
    icon: "phone",
  });
  if (person.secondary_phone) {
    innerRows.push({
      label: "Teléfono secundario",
      value: person.secondary_phone,
      icon: "phone-call",
    });
  }
  if (person.authorization_notes) {
    innerRows.push({
      label: "Autorización",
      value: person.authorization_notes,
      icon: "info",
    });
  }

  return (
    <View nativeID={baseId} style={styles.itemWithHeader} testID={baseId}>
      <View style={styles.personRowTop}>
        <View style={styles.personAvatar}>
          <Text style={styles.personAvatarText}>
            {person.full_name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.personTopCopy}>
          <Text style={styles.itemName}>
            {person.full_name}
            {person.relationship ? ` · ${person.relationship}` : ""}
          </Text>
          <View style={styles.personStatusRow}>
            {person.dni_verified ? (
              <AppBadge label="DNI verificado" tone="success" />
            ) : (
              <AppBadge label="DNI sin verificar" tone="warning" />
            )}
            {person.is_active ? (
              <AppBadge label="Activo" tone="neutral" />
            ) : (
              <AppBadge label="Inactivo" tone="danger" />
            )}
          </View>
        </View>
      </View>
      <View style={styles.itemFields}>
        {innerRows.map((row, rowIndex) => (
          <InfoRow
            key={`${baseId}-field-${rowIndex}`}
            idPrefix={`${baseId}-field-${rowIndex}`}
            label={row.label}
            value={row.value}
            icon={row.icon}
            isLast={rowIndex === innerRows.length - 1}
          />
        ))}
      </View>
    </View>
  );
}

function FightRecordRow({
  record,
  index,
  idPrefix,
}: {
  record: StudentFightRecord;
  index: number;
  idPrefix: string;
}) {
  const baseId = `${idPrefix}-${record.id}`;
  const toneColor = getFightTypeColor(record.record_type);
  const innerRows: InfoRowData[] = [
    {
      label: "Rival",
      value: record.opponent_name,
      icon: "user",
    },
    {
      label: "Fecha",
      value: formatDate(record.fight_date),
      icon: "calendar",
    },
    {
      label: "Tipo",
      value: formatFightTypeLabel(record.record_type),
      valueColor: toneColor,
      icon: "activity",
    },
  ];

  return (
    <View nativeID={baseId} style={styles.itemWithHeader} testID={baseId}>
      <View style={styles.fightRowTop}>
        <View style={[styles.fightIconBlock, { backgroundColor: `${toneColor}18` }]}>
          <Feather
            name={record.record_type === "victoria" ? "award" : record.record_type === "empate" ? "minus" : "x"}
            size={18}
            color={toneColor}
          />
        </View>
        <View style={styles.fightTopCopy}>
          <Text style={styles.itemName}>{record.opponent_name}</Text>
          <Text style={styles.itemSubtitle}>{formatDate(record.fight_date)}</Text>
        </View>
        <AppBadge
          label={formatFightTypeLabel(record.record_type)}
          tone={record.record_type === "victoria" ? "success" : record.record_type === "empate" ? "warning" : "danger"}
        />
      </View>
      <View style={styles.itemFields}>
        {innerRows.map((row, rowIndex) => (
          <InfoRow
            key={`${baseId}-field-${rowIndex}`}
            idPrefix={`${baseId}-field-${rowIndex}`}
            label={row.label}
            value={row.value}
            valueColor={row.valueColor}
            icon={row.icon}
            isLast={rowIndex === innerRows.length - 1}
          />
        ))}
      </View>
    </View>
  );
}

function PaymentRowDesktop({
  payment,
  index,
  idPrefix,
}: {
  payment: Payment;
  index: number;
  idPrefix: string;
}) {
  const baseId = `${idPrefix}-${payment.id}`;
  return (
    <View
      nativeID={baseId}
      style={[
        styles.desktopPaymentRow,
        index % 2 === 1 ? styles.desktopPaymentRowAlt : null,
      ]}
      testID={baseId}
    >
      <View style={[styles.paymentCell, styles.paymentColAmount]}>
        <Text style={styles.paymentAmount}>
          {formatCurrency(payment.amount, payment.currency)}
        </Text>
        <Text style={styles.paymentMeta}>#{payment.id}</Text>
      </View>
      <Text style={[styles.paymentCell, styles.paymentColDate, styles.paymentText]}>
        {formatDateTime(payment.paid_at)}
      </Text>
      <View style={[styles.paymentCell, styles.paymentColPeriod]}>
        <Text style={styles.paymentText} numberOfLines={1}>
          {formatDate(payment.period_start)} — {formatDate(payment.period_end)}
        </Text>
      </View>
      <Text style={[styles.paymentCell, styles.paymentColMethod, styles.paymentText]}>
        {formatPaymentMethod(payment.method)}
      </Text>
      <View style={[styles.paymentCell, styles.paymentColStatus]}>
        <AppBadge
          label={formatPaymentRecordStatus(payment.status)}
          tone={getPaymentRecordTone(payment.status)}
        />
      </View>
    </View>
  );
}

function PaymentRowMobile({
  payment,
  index,
  idPrefix,
}: {
  payment: Payment;
  index: number;
  idPrefix: string;
}) {
  const baseId = `${idPrefix}-${payment.id}`;
  const innerRows: InfoRowData[] = [
    {
      label: "Fecha de pago",
      value: formatDateTime(payment.paid_at),
      icon: "calendar",
    },
    {
      label: "Método",
      value: formatPaymentMethod(payment.method),
      icon: "dollar-sign",
    },
    {
      label: "Período",
      value: `${formatDate(payment.period_start)} al ${formatDate(payment.period_end)}`,
      icon: "clock",
    },
  ];
  if (payment.notes) {
    innerRows.push({
      label: "Notas",
      value: payment.notes,
      icon: "info",
    });
  }

  return (
    <View nativeID={baseId} style={styles.mobilePaymentRow} testID={baseId}>
      <View style={styles.mobilePaymentTop}>
        <View style={styles.mobilePaymentAmountBlock}>
          <Text style={styles.mobilePaymentAmount}>
            {formatCurrency(payment.amount, payment.currency)}
          </Text>
          <Text style={styles.paymentMeta}>Pago #{payment.id}</Text>
        </View>
        <AppBadge
          label={formatPaymentRecordStatus(payment.status)}
          tone={getPaymentRecordTone(payment.status)}
        />
      </View>
      <View style={styles.itemFields}>
        {innerRows.map((row, rowIndex) => (
          <InfoRow
            key={`${baseId}-field-${rowIndex}`}
            idPrefix={`${baseId}-field-${rowIndex}`}
            label={row.label}
            value={row.value}
            icon={row.icon}
            isLast={rowIndex === innerRows.length - 1}
          />
        ))}
      </View>
    </View>
  );
}

function splitRows(rows: InfoRowData[]): InfoRowData[][] {
  if (rows.length <= MAX_ROWS_PER_INFO_SECTION) return [rows];
  const chunks: InfoRowData[][] = [];
  for (let i = 0; i < rows.length; i += MAX_ROWS_PER_INFO_SECTION) {
    chunks.push(rows.slice(i, i + MAX_ROWS_PER_INFO_SECTION));
  }
  return chunks;
}

interface HorizontalCarouselProps {
  idPrefix: string;
  children: Array<{ key: string; title: string; content: React.ReactNode }>;
}

function HorizontalCarousel({ idPrefix, children }: HorizontalCarouselProps) {
  const { isDesktop } = useResponsiveLayout();
  const [slideIndex, setSlideIndex] = useState(0);
  const total = Math.max(1, children.length);
  const safeIndex = Math.min(slideIndex, total - 1);
  const baseId = `${idPrefix}-carousel`;

  const goPrev = useCallback(() => {
    setSlideIndex((s) => Math.max(0, s - 1));
  }, []);
  const goNext = useCallback(() => {
    setSlideIndex((s) => Math.min(total - 1, s + 1));
  }, [total]);

  return (
    <View nativeID={baseId} style={styles.carouselRoot} testID={baseId}>
      <View style={styles.carouselNavRow}>
        <Pressable
          accessibilityLabel={`Sección anterior: ${children[Math.max(0, safeIndex - 1)]?.title ?? ""}`}
          accessibilityRole="button"
          disabled={safeIndex === 0}
          hitSlop={TOUCH_HIT_SLOP}
          onPress={goPrev}
          style={(state) => {
            const hovered = (state as typeof state & { hovered?: boolean }).hovered;
            const disabled = safeIndex === 0;
            return [
              styles.carouselNavBtn,
              disabled ? styles.carouselNavBtnDisabled : null,
              hovered && !disabled ? styles.carouselNavBtnHovered : null,
              state.pressed && !disabled ? styles.carouselNavBtnPressed : null,
            ];
          }}
          testID={`${baseId}-prev`}
        >
          <Ionicons
            name="chevron-back"
            size={16}
            color={safeIndex === 0 ? colors.textMuted : colors.wood}
          />
        </Pressable>

        <View style={styles.carouselDots}>
          {children.map((s, i) => (
            <Pressable
            accessibilityLabel={`Ir a sección: ${s.title}`}
            accessibilityRole="button"
            hitSlop={TOUCH_HIT_SLOP}
            key={s.key}
            onPress={() => setSlideIndex(i)}
            style={[styles.carouselDot, i === safeIndex ? styles.carouselDotActive : null]}
            testID={`${baseId}-dot-${i}`}
          />
          ))}
        </View>

        <Text style={styles.carouselSlideLabel} accessibilityLiveRegion="polite">
          {safeIndex + 1} / {total} · {children[safeIndex]?.title ?? ""}
        </Text>

        <Pressable
          accessibilityLabel={`Siguiente sección: ${children[Math.min(total - 1, safeIndex + 1)]?.title ?? ""}`}
          accessibilityRole="button"
          disabled={safeIndex === total - 1}
          hitSlop={TOUCH_HIT_SLOP}
          onPress={goNext}
          style={(state) => {
            const hovered = (state as typeof state & { hovered?: boolean }).hovered;
            const disabled = safeIndex === total - 1;
            return [
              styles.carouselNavBtn,
              disabled ? styles.carouselNavBtnDisabled : null,
              hovered && !disabled ? styles.carouselNavBtnHovered : null,
              state.pressed && !disabled ? styles.carouselNavBtnPressed : null,
            ];
          }}
          testID={`${baseId}-next`}
        >
          <Ionicons
            name="chevron-forward"
            size={16}
            color={safeIndex === total - 1 ? colors.textMuted : colors.wood}
          />
        </Pressable>
      </View>

      <View style={[styles.carouselViewport, isDesktop ? null : mobileStyles.carouselViewport]}>
        {children.map((s, i) => (
          <View
            key={s.key}
            nativeID={`${baseId}-slide-${i}`}
            style={[styles.carouselSlide, i !== safeIndex ? styles.carouselSlideHidden : null]}
            testID={`${baseId}-slide-${i}`}
          >
            {s.content}
          </View>
        ))}
      </View>
    </View>
  );
}

export function StudentDetailView({
  student,
  payments,
  branch,
  primaryClass,
  idPrefix = "student-detail-view",
  onQrPress,
  fightRecords = [],
  trajectoryEvents = [],
  totalTrajectoryEvents,
  uniqueTrajectoryDays,
  lastTrajectoryEvent,
  onEditFightRecord,
  onGoToTrajectory,
  onOpenLastEvent,
}: StudentDetailViewProps) {
  const { isDesktop } = useResponsiveLayout();

  const statusRows: InfoRowData[] = useMemo(() => {
    const rows: InfoRowData[] = [
      {
        label: "Estado de pago",
        value: formatPaymentStatus(student.payment_status),
        valueColor:
          getStudentPaymentTone(student.payment_status) === "success"
            ? colors.success
            : getStudentPaymentTone(student.payment_status) === "warning"
              ? colors.warning
              : colors.danger,
        icon: "credit-card",
      },
      {
        label: "Estado del alumno",
        value: formatStudentStatus(student.status),
        valueColor:
          getStudentStatusTone(student.status) === "success"
            ? colors.success
            : getStudentStatusTone(student.status) === "warning"
              ? colors.warning
              : colors.textMuted,
        icon: "user-check",
      },
    ];
    if (student.next_payment_date) {
      rows.push({
        label: "Próximo pago",
        value: formatDate(student.next_payment_date),
        icon: "calendar",
      });
    }
    rows.push({
      label: "Mensualidad",
      value: formatCurrency(student.monthly_fee, student.currency),
      icon: "dollar-sign",
    });
    rows.push({
      label: "Moneda",
      value: student.currency,
      icon: "dollar-sign",
    });
    return rows;
  }, [student]);

  const profileRows: InfoRowData[] = useMemo(() => {
    const rows: InfoRowData[] = [];
    rows.push({
      label: "Fecha de nacimiento",
      value: `${formatDate(student.birth_date)}${student.birth_place ? ` · ${student.birth_place}` : ""}`,
      icon: "calendar",
    });
    rows.push({
      label: "Fecha de inscripción",
      value: formatDate(student.enrollment_date),
      icon: "clipboard",
    });
    if (student.height_cm) {
      rows.push({
        label: "Altura",
        value: `${student.height_cm} cm`,
        icon: "maximize-2",
      });
    }
    rows.push({
      label: "Sucursal",
      value: branch ? `${branch.name} · ${branch.city}` : `ID ${student.branch_id}`,
      icon: "map-pin",
    });
    rows.push({
      label: "Clase principal",
      value: primaryClass?.name ?? "No asignada",
      icon: "users",
    });
    return rows;
  }, [student, branch, primaryClass]);

  const contactRows: InfoRowData[] = useMemo(() => {
    const rows: InfoRowData[] = [];
    if (student.phone) {
      rows.push({ label: "Teléfono", value: student.phone, icon: "phone" });
    }
    if (student.email) {
      rows.push({ label: "Email", value: student.email, icon: "mail" });
    }
    if (student.guardian_name || student.guardian_phone) {
      rows.push({
        label: "Tutor",
        value: [student.guardian_name, student.guardian_phone].filter(Boolean).join(" · ") || "No registrado",
        icon: "user",
      });
    }
    if (student.notes) {
      rows.push({ label: "Notas generales", value: student.notes, icon: "info" });
    }
    return rows;
  }, [student]);

  const medicalChunks = useMemo(() => {
    const mr = student.medical_record;
    if (!mr) return [] as InfoRowData[][];
    const base: InfoRowData[] = [];
    if (mr.blood_type) {
      base.push({ label: "Tipo de sangre", value: mr.blood_type, icon: "droplet" });
    }
    base.push({
      label: "Tipo de seguro",
      value: formatInsuranceType(mr.insurance_type),
      icon: "shield",
    });
    if (mr.insurance_provider || mr.insurance_policy_number) {
      base.push({
        label: "Póliza",
        value: [mr.insurance_provider, mr.insurance_policy_number].filter(Boolean).join(" · ") || "Sin datos",
        icon: "file-text",
      });
    }

    const clinical: InfoRowData[] = [];
    if (mr.allergies) {
      clinical.push({ label: "Alergias", value: mr.allergies, icon: "alert-triangle" });
    }
    if (mr.chronic_conditions) {
      clinical.push({
        label: "Padecimientos crónicos",
        value: mr.chronic_conditions,
        icon: "activity",
      });
    }
    if (mr.medications) {
      clinical.push({ label: "Medicamentos", value: mr.medications, icon: "heart" });
    }
    if (mr.previous_injuries) {
      clinical.push({ label: "Lesiones previas", value: mr.previous_injuries, icon: "zap" });
    }

    const practitioner: InfoRowData[] = [];
    if (mr.physician_name || mr.physician_phone) {
      practitioner.push({
        label: "Médico tratante",
        value: [mr.physician_name, mr.physician_phone].filter(Boolean).join(" · ") || "Sin datos",
        icon: "user-plus",
      });
    }
    if (mr.tetanus_vaccine_date) {
      practitioner.push({
        label: "Vacuna de tétanos",
        value: formatDate(mr.tetanus_vaccine_date),
        icon: "activity",
      });
    }
    if (mr.additional_notes) {
      practitioner.push({
        label: "Notas adicionales",
        value: mr.additional_notes,
        icon: "info",
      });
    }

    const all: InfoRowData[][] = [];
    if (base.length) all.push(base);
    if (clinical.length) all.push(clinical);
    if (practitioner.length) all.push(practitioner);
    return all;
  }, [student.medical_record]);

  const emergencyContacts = useMemo(
    () => student.emergency_contacts ?? [],
    [student.emergency_contacts],
  );
  const documents = useMemo(() => student.documents ?? [], [student.documents]);
  const authorizedPersons = useMemo(
    () => (student.is_minor ? student.authorized_persons ?? [] : []),
    [student.is_minor, student.authorized_persons],
  );

  const lastPayment = payments[0] ?? null;
  const paymentSummaryRows: InfoRowData[] = useMemo(() => {
    const rows: InfoRowData[] = [];
    rows.push({
      label: "Registros totales",
      value: `${payments.length} pagos`,
      icon: "list",
    });
    if (lastPayment) {
      rows.push({
        label: "Último movimiento",
        value: formatDateTime(lastPayment.paid_at),
        icon: "clock",
      });
      rows.push({
        label: "Último monto",
        value: formatCurrency(lastPayment.amount, lastPayment.currency),
        icon: "dollar-sign",
      });
    }
    return rows;
  }, [payments, lastPayment]);

  const fightTotals = useMemo(() => {
    const totals = { victoria: 0, empate: 0, derrota: 0 };
    fightRecords.forEach((r) => {
      totals[r.record_type] += 1;
    });
    return totals;
  }, [fightRecords]);

  const wins = fightRecords.length > 0 ? fightTotals.victoria : (student.rd_victorias ?? 0);
  const draws = fightRecords.length > 0 ? fightTotals.empate : (student.rd_empates ?? 0);
  const losses = fightRecords.length > 0 ? fightTotals.derrota : (student.rd_derrotas ?? 0);
  const totalFights = wins + draws + losses;
  const winRate = totalFights > 0 ? Math.round((wins / totalFights) * 100) : 0;

  const recordRows: InfoRowData[] = useMemo(() => ([
    {
      label: "Victorias",
      value: String(wins),
      valueColor: colors.success,
      icon: "award",
    },
    {
      label: "Empates",
      value: String(draws),
      valueColor: colors.warning,
      icon: "minus",
    },
    {
      label: "Derrotas",
      value: String(losses),
      valueColor: colors.danger,
      icon: "x",
    },
    {
      label: "Total peleas",
      value: String(totalFights),
      icon: "activity",
    },
    {
      label: "% victorias",
      value: totalFights > 0 ? `${winRate}%` : "—",
      valueColor: colors.success,
      icon: "percent",
    },
  ]), [wins, draws, losses, totalFights, winRate]);

  const trajectoryRows: InfoRowData[] = useMemo(() => {
    const rows: InfoRowData[] = [];
    const eventsCount = typeof totalTrajectoryEvents === "number" ? totalTrajectoryEvents : trajectoryEvents.length;
    rows.push({
      label: "Sucesos totales",
      value: `${eventsCount} hitos`,
      icon: "list",
    });
    if (typeof uniqueTrajectoryDays === "number") {
      rows.push({
        label: "Días registrados",
        value: `${uniqueTrajectoryDays} días`,
        icon: "calendar",
      });
    }
    if (lastTrajectoryEvent) {
      rows.push({
        label: "Último suceso",
        value: formatDate(lastTrajectoryEvent.event_date),
        icon: "clock",
      });
    }
    return rows;
  }, [totalTrajectoryEvents, uniqueTrajectoryDays, lastTrajectoryEvent, trajectoryEvents.length]);

  const paymentPageSize = isDesktop ? PAYMENT_PAGE_SIZE_DESKTOP : PAYMENT_PAGE_SIZE_MOBILE;
  const paymentHistory = useMemo(
    () => ({
      idPrefix,
      payments,
      isDesktop,
      pageSize: paymentPageSize,
    }),
    [idPrefix, payments, isDesktop, paymentPageSize],
  );

  const heroNode = (
    <View
      nativeID={`${idPrefix}-hero`}
      style={[styles.hero, isDesktop ? desktopStyles.hero : mobileStyles.hero]}
      testID={`${idPrefix}-hero`}
    >
      <View
        nativeID={`${idPrefix}-photo-block`}
        style={styles.photoBlock}
        testID={`${idPrefix}-photo-block`}
      >
        {student.photo_url ? (
          <Image
            accessibilityLabel={`Foto de ${student.first_name} ${student.last_name}`}
            source={{ uri: student.photo_url }}
            style={styles.photo}
            testID={`${idPrefix}-photo`}
          />
        ) : (
          <View
            accessibilityLabel={`Iniciales del alumno ${student.first_name} ${student.last_name}`}
            style={styles.photoPlaceholder}
            testID={`${idPrefix}-photo-placeholder`}
          >
            <Text style={styles.photoInitials} accessible={false}>
              {student.first_name.charAt(0)}
              {student.last_name.charAt(0)}
            </Text>
          </View>
        )}
      </View>
      <View
        nativeID={`${idPrefix}-hero-copy`}
        style={[styles.heroCopy, !isDesktop && { alignItems: "center" }]}
        testID={`${idPrefix}-hero-copy`}
      >
        <Text
          nativeID={`${idPrefix}-name`}
          style={[styles.heroName, !isDesktop && { textAlign: "center" }]}
          testID={`${idPrefix}-name`}
        >
          {student.first_name} {student.last_name}
        </Text>
        <Text
          nativeID={`${idPrefix}-code`}
          style={[styles.heroCode, !isDesktop && { textAlign: "center" }]}
          testID={`${idPrefix}-code`}
        >
          Código {student.unique_code}
        </Text>
        <View
          style={[styles.heroBadges, !isDesktop && { justifyContent: "center" }]}
        >
          <AppBadge
            label={formatPaymentStatus(student.payment_status)}
            tone={getStudentPaymentTone(student.payment_status)}
          />
          <AppBadge
            label={formatStudentStatus(student.status)}
            tone={getStudentStatusTone(student.status)}
          />
          {student.is_minor ? <AppBadge label="Menor de edad" tone="neutral" /> : null}
        </View>
        <View style={[styles.heroBelt, !isDesktop && { alignSelf: "center" }]}>
          <BeltIndicator
            beltLevel={student.current_belt_level}
            size="md"
            stripe={student.current_stripe}
            testID={`${idPrefix}-belt`}
          />
        </View>
        {onQrPress ? (
          <Pressable
            accessibilityLabel="Ver credencial QR de asistencia"
            accessibilityRole="button"
            hitSlop={TOUCH_HIT_SLOP}
            onPress={onQrPress}
            style={(state) => {
              const hovered = (state as typeof state & { hovered?: boolean }).hovered;
              return [
                styles.qrCta,
                hovered ? styles.qrCtaHovered : null,
                state.pressed ? styles.qrCtaPressed : null,
              ];
            }}
            testID={`${idPrefix}-qr-cta`}
          >
            <View style={styles.qrCtaIconDot}>
              <Ionicons name="qr-code" size={16} color={colors.gold} />
            </View>
            <View style={styles.qrCtaCopy}>
              <Text style={styles.qrCtaTitle}>Credencial QR de asistencia</Text>
              <Text style={styles.qrCtaSubtitle}>
                Mostrar o compartir el código permanente del alumno
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.gold} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  const slideGeneral = (
    <View style={styles.slideInner} nativeID={`${idPrefix}-slide-general`} testID={`${idPrefix}-slide-general`}>
      {heroNode}
      <View
        style={[
          styles.twoColGrid,
          isDesktop ? desktopStyles.twoColGrid : mobileStyles.twoColGrid,
        ]}
      >
        <InfoListSection
          idPrefix={`${idPrefix}-status`}
          title="Estado y cobro"
          subtitle="Estatus operativo y condiciones económicas"
          rows={statusRows}
        />
        <InfoListSection
          idPrefix={`${idPrefix}-profile`}
          title="Perfil deportivo"
          subtitle="Datos generales del alumno en el dojo"
          rows={profileRows}
        />
      </View>
    </View>
  );

  const slideRecord = (
    <View style={styles.slideInner} nativeID={`${idPrefix}-slide-record`} testID={`${idPrefix}-slide-record`}>
      <InfoListSection
        idPrefix={`${idPrefix}-record-summary`}
        title="Récord deportivo"
        subtitle={totalFights > 0 ? `${totalFights} peleas registradas · ${winRate}% de victorias` : "Estadísticas de victorias, empates y derrotas"}
        rows={recordRows}
        emptyConfig={EMPTY_FIGHTS}
      />
      <PaginatedListSection
        idPrefix={`${idPrefix}-fight-records`}
        title="Historial de peleas"
        subtitle="Eventos deportivos individuales: torneos y exámenes"
        items={fightRecords}
        pageSize={FIGHT_PAGE_SIZE}
        keyExtractor={(item) => `fight-${item.id}`}
        emptyConfig={EMPTY_FIGHTS}
        headerRight={
          onEditFightRecord ? (
            <Pressable
              accessibilityLabel="Editar récord deportivo"
              accessibilityRole="link"
              hitSlop={TOUCH_HIT_SLOP}
              onPress={onEditFightRecord}
              style={(state) => {
                const hovered = (state as typeof state & { hovered?: boolean }).hovered;
                return [
                  styles.headerInlineLink,
                  hovered ? styles.headerInlineLinkHovered : null,
                  state.pressed ? styles.headerInlineLinkPressed : null,
                ];
              }}
              testID={`${idPrefix}-fight-records-edit-link`}
            >
              <Feather name="edit-3" size={12} color={colors.wood} />
              <Text style={styles.headerInlineLinkLabel}>Editar</Text>
            </Pressable>
          ) : undefined
        }
        renderItem={(record, index) => (
          <FightRecordRow
            idPrefix={`${idPrefix}-fight-records`}
            record={record}
            index={index}
          />
        )}
      />
    </View>
  );

  const slideContact = (
    <View style={styles.slideInner} nativeID={`${idPrefix}-slide-contact`} testID={`${idPrefix}-slide-contact`}>
      <InfoListSection
        idPrefix={`${idPrefix}-contact`}
        title="Contacto y observaciones"
        subtitle="Vías de comunicación y notas del alumno"
        rows={contactRows}
        emptyConfig={EMPTY_CONTACT}
      />

      {medicalChunks.length === 0 ? (
        <InfoListSection
          idPrefix={`${idPrefix}-medical`}
          title="Ficha médica"
          subtitle="Información clínica relevante para proteger la integridad del alumno"
          rows={[]}
          emptyConfig={EMPTY_MEDICAL}
        />
      ) : (
        <View nativeID={`${idPrefix}-medical-block`} style={styles.section} testID={`${idPrefix}-medical-block`}>
          <SectionHeader
            idPrefix={`${idPrefix}-medical`}
            title="Ficha médica"
            subtitle="Información clínica relevante para proteger la integridad del alumno"
          />
          {medicalChunks.map((chunk, chunkIndex) => {
            const labels = ["Datos básicos", "Alergias y padecimientos", "Médico y vacunas"];
            const chunkTitle = labels[chunkIndex] ?? `Bloque ${chunkIndex + 1}`;
            const chunkId = `${idPrefix}-medical-chunk-${chunkIndex}`;
            return (
              <View key={chunkId} style={styles.medicalChunk}>
                <Text style={styles.medicalChunkTitle}>{chunkTitle}</Text>
                <View style={styles.infoList}>
                  {chunk.map((row, rowIndex) => (
                    <InfoRow
                      key={`${chunkId}-row-${rowIndex}`}
                      idPrefix={`${chunkId}-row-${rowIndex}`}
                      label={row.label}
                      value={row.value}
                      icon={row.icon}
                      isLast={rowIndex === chunk.length - 1}
                    />
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      )}

      <PaginatedListSection
        idPrefix={`${idPrefix}-emergency-contacts`}
        title="Contactos de emergencia"
        subtitle="Personas a contactar en caso de incidente durante la clase"
        items={emergencyContacts}
        pageSize={4}
        keyExtractor={(item) => `emergency-${item.id}`}
        emptyConfig={EMPTY_CONTACTS}
        renderItem={(contact, index) => (
          <EmergencyContactRow
            idPrefix={`${idPrefix}-emergency-contacts`}
            contact={contact}
            index={index}
          />
        )}
      />
    </View>
  );

  const slideDocs = (
    <View style={styles.slideInner} nativeID={`${idPrefix}-slide-docs`} testID={`${idPrefix}-slide-docs`}>
      <PaginatedListSection
        idPrefix={`${idPrefix}-documents`}
        title="Documentos"
        subtitle="Waivers, consentimientos y archivos adjuntos del alumno"
        items={documents}
        pageSize={4}
        keyExtractor={(item) => `doc-${item.id}`}
        emptyConfig={EMPTY_DOCUMENTS}
        renderItem={(document, index) => (
          <DocumentRow
            idPrefix={`${idPrefix}-documents`}
            document={document}
            index={index}
          />
        )}
      />

      {student.is_minor ? (
        <PaginatedListSection
          idPrefix={`${idPrefix}-authorized-persons`}
          title="Personas autorizadas"
          subtitle="Personas con DNI verificado habilitadas para retirar al menor"
          items={authorizedPersons}
          pageSize={4}
          keyExtractor={(item) => `auth-${item.id}`}
          emptyConfig={EMPTY_AUTHORIZED}
          renderItem={(person, index) => (
            <AuthorizedPersonRow
              idPrefix={`${idPrefix}-authorized-persons`}
              person={person}
              index={index}
            />
          )}
        />
      ) : null}
    </View>
  );

  const slidePayments = (
    <View style={styles.slideInner} nativeID={`${idPrefix}-slide-payments`} testID={`${idPrefix}-slide-payments`}>
      <View
        nativeID={`${idPrefix}-payments-block`}
        style={styles.section}
        testID={`${idPrefix}-payments-block`}
      >
        <SectionHeader
          idPrefix={`${idPrefix}-payments`}
          title="Pagos e historial financiero"
          subtitle="Resumen y línea de tiempo de movimientos económicos"
        />
        {paymentSummaryRows.length > 0 ? (
          <View
            nativeID={`${idPrefix}-payments-summary`}
            style={styles.infoList}
            testID={`${idPrefix}-payments-summary`}
          >
            {paymentSummaryRows.map((row, index) => (
              <InfoRow
                key={`${idPrefix}-payments-summary-row-${index}`}
                idPrefix={`${idPrefix}-payments-summary-row-${index}`}
                label={row.label}
                value={row.value}
                icon={row.icon}
                isLast={index === paymentSummaryRows.length - 1}
              />
            ))}
          </View>
        ) : null}

        <PaymentHistoryList {...paymentHistory} />
      </View>

      {(totalTrajectoryEvents !== undefined || trajectoryEvents.length > 0 || lastTrajectoryEvent) && (
        <InfoListSection
          idPrefix={`${idPrefix}-trajectory-summary`}
          title="Trayectoria e hitos"
          subtitle="Resumen de sucesos, días registrados y último hito"
          rows={trajectoryRows}
          emptyConfig={EMPTY_TRAJECTORY}
        />
      )}

      {lastTrajectoryEvent && onOpenLastEvent && (
        <View nativeID={`${idPrefix}-last-event-block`} style={styles.section} testID={`${idPrefix}-last-event-block`}>
          <View style={styles.lastEventCard}>
            <View style={styles.lastEventTopRow}>
              <Feather name="award" size={14} color={colors.gold} />
              <Text style={styles.lastEventLabel}>Último suceso registrado</Text>
            </View>
            <Text style={styles.lastEventDate}>
              {formatDate(lastTrajectoryEvent.event_date)}
            </Text>
            <Text style={styles.lastEventContent} numberOfLines={4}>
              {lastTrajectoryEvent.content}
            </Text>
            <Pressable
              accessibilityRole="link"
              hitSlop={TOUCH_HIT_SLOP}
              onPress={onOpenLastEvent}
              style={(state) => {
                const hovered = (state as typeof state & { hovered?: boolean }).hovered;
                return [
                  styles.lastEventLink,
                  hovered ? styles.lastEventLinkHovered : null,
                  state.pressed ? styles.lastEventLinkPressed : null,
                ];
              }}
              testID={`${idPrefix}-last-event-link`}
            >
              <Text style={styles.lastEventLinkLabel}>Abrir en calendario</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.wood} />
            </Pressable>
          </View>
        </View>
      )}

      {onGoToTrajectory && (
        <View style={styles.section}>
          <Pressable
            accessibilityLabel="Ir a la trayectoria completa"
            accessibilityRole="link"
            hitSlop={TOUCH_HIT_SLOP}
            onPress={onGoToTrajectory}
            style={(state) => {
              const hovered = (state as typeof state & { hovered?: boolean }).hovered;
              return [
                styles.goTrajectoryCta,
                hovered ? styles.goTrajectoryCtaHovered : null,
                state.pressed ? styles.goTrajectoryCtaPressed : null,
              ];
            }}
            testID={`${idPrefix}-go-trajectory-cta`}
          >
            <View style={styles.goTrajectoryIcon}>
              <Feather name="calendar" size={16} color={colors.gold} />
            </View>
            <View style={styles.goTrajectoryCopy}>
              <Text style={styles.goTrajectoryTitle}>Abrir trayectoria completa</Text>
              <Text style={styles.goTrajectorySubtitle}>Calendario con todos los hitos y recuerdos</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.gold} />
          </Pressable>
        </View>
      )}
    </View>
  );

  const slides = [
    { key: "general", title: "General", content: slideGeneral },
    { key: "record", title: "Récord deportivo", content: slideRecord },
    { key: "contact", title: "Contacto y médica", content: slideContact },
    { key: "docs", title: "Documentos", content: slideDocs },
    { key: "payments", title: "Pagos y trayectoria", content: slidePayments },
  ];

  return (
    <View nativeID={idPrefix} style={styles.root} testID={idPrefix}>
      <HorizontalCarousel idPrefix={idPrefix}>
        {slides}
      </HorizontalCarousel>
    </View>
  );
}

function PaymentHistoryList({
  idPrefix,
  payments,
  isDesktop,
  pageSize,
}: {
  idPrefix: string;
  payments: Payment[];
  isDesktop: boolean;
  pageSize: number;
}) {
  const { page, totalPages, pageStart, pageEnd, paginatedItems, setPage } = usePaginatedList(
    payments,
    pageSize,
  );
  const hasItems = payments.length > 0;

  return (
    <View style={styles.historyWrap}>
      <View style={styles.historyHeaderRow}>
        <Text style={styles.historyTitle}>Historial de pagos</Text>
        {hasItems ? (
          <Text style={styles.historyMeta}>
            {pageStart}-{pageEnd} de {payments.length}
          </Text>
        ) : null}
      </View>

      <View
        style={[
          styles.infoList,
          hasItems
            ? [styles.paymentsHistoryList, isDesktop ? styles.paymentsHistoryDesktop : null]
            : styles.infoListEmpty,
        ]}
      >
        {hasItems && isDesktop ? (
          <View style={styles.desktopPaymentHead} pointerEvents="none">
            <Text
              style={[
                styles.paymentCell,
                styles.paymentColAmount,
                styles.desktopPaymentHeadText,
              ]}
            >
              Monto
            </Text>
            <Text
              style={[
                styles.paymentCell,
                styles.paymentColDate,
                styles.desktopPaymentHeadText,
              ]}
            >
              Fecha
            </Text>
            <Text
              style={[
                styles.paymentCell,
                styles.paymentColPeriod,
                styles.desktopPaymentHeadText,
              ]}
            >
              Período
            </Text>
            <Text
              style={[
                styles.paymentCell,
                styles.paymentColMethod,
                styles.desktopPaymentHeadText,
              ]}
            >
              Método
            </Text>
            <Text
              style={[
                styles.paymentCell,
                styles.paymentColStatus,
                styles.desktopPaymentHeadText,
              ]}
            >
              Estado
            </Text>
          </View>
        ) : null}

        {hasItems ? (
          paginatedItems.map((payment, localIndex) => {
            const absoluteIndex = (page - 1) * pageSize + localIndex;
            const isLast = localIndex === paginatedItems.length - 1;
            return (
              <View key={payment.id} style={isLast || !isDesktop ? null : styles.listItemDivider}>
                {isDesktop ? (
                  <PaymentRowDesktop
                    idPrefix={idPrefix}
                    payment={payment}
                    index={absoluteIndex}
                  />
                ) : (
                  <PaymentRowMobile
                    idPrefix={idPrefix}
                    payment={payment}
                    index={absoluteIndex}
                  />
                )}
              </View>
            );
          })
        ) : (
          <EmptyInline config={EMPTY_PAYMENTS} />
        )}
      </View>

      {hasItems && totalPages > 1 ? (
        <PaginationControls
          idPrefix={`${idPrefix}-pagination`}
          page={page}
          totalPages={totalPages}
          pageStart={pageStart}
          pageEnd={pageEnd}
          total={payments.length}
          onPrev={() => setPage(page - 1)}
          onNext={() => setPage(page + 1)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.xl,
    width: "100%",
  },
  hero: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomColor: colors.borderStrong,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  photoBlock: {
    alignItems: "center",
  },
  photo: {
    borderRadius: radius.pill,
    borderColor: colors.borderStrong,
    borderWidth: 1,
    height: 96,
    width: 96,
  },
  photoPlaceholder: {
    alignItems: "center",
    backgroundColor: colors.woodSoft,
    borderRadius: radius.pill,
    borderColor: colors.border,
    borderWidth: 1,
    height: 96,
    justifyContent: "center",
    width: 96,
  },
  photoInitials: {
    color: colors.woodStrong,
    fontFamily: typography.headingFamily,
    fontSize: 32,
    fontWeight: "800",
  },
  heroCopy: {
    flex: 1,
    gap: spacing.sm,
    minWidth: 0,
  },
  heroName: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: typography.subtitleSize,
    fontWeight: "800",
    letterSpacing: 0.2,
    lineHeight: 24,
  },
  heroCode: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: typography.captionSize,
    lineHeight: 18,
  },
  heroBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  heroBelt: {
    marginTop: 4,
  },
  qrCta: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderColor: colors.gold,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: MIN_TOUCH_TARGET + 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    width: "100%",
  },
  qrCtaHovered: {
    backgroundColor: colors.goldSoft,
  },
  qrCtaPressed: {
    opacity: 0.9,
    backgroundColor: colors.goldSoft,
  },
  qrCtaIconDot: {
    alignItems: "center",
    aspectRatio: 1,
    backgroundColor: colors.goldSoft,
    borderRadius: radius.pill,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  qrCtaCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  qrCtaTitle: {
    color: colors.woodStrong,
    fontFamily: typography.headingFamily,
    fontSize: typography.bodySize,
    fontWeight: "700",
    lineHeight: 20,
  },
  qrCtaSubtitle: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: typography.captionSize,
    lineHeight: 18,
  },
  twoColGrid: {
    gap: spacing.md,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  sectionHeaderCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: typography.bodySize,
    fontWeight: "800",
    letterSpacing: 0.2,
    lineHeight: 22,
  },
  sectionSubtitle: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: typography.captionSize,
    lineHeight: 18,
  },
  sectionMeta: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
    marginTop: 4,
  },
  infoList: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    borderColor: colors.border,
    borderWidth: 1,
    overflow: "hidden",
  },
  infoListEmpty: {
    padding: spacing.xl,
  },
  emptyInlineWrap: {
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  emptyIconDot: {
    alignItems: "center",
    aspectRatio: 1,
    backgroundColor: colors.woodSoft,
    borderRadius: radius.pill,
    height: 40,
    justifyContent: "center",
    marginBottom: 4,
    width: 40,
  },
  emptyTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: typography.bodySize,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyDescription: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: typography.captionSize,
    lineHeight: 18,
    textAlign: "center",
  },
  emptyHint: {
    color: colors.wood,
    fontFamily: typography.headingFamily,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.1,
    marginTop: 4,
    textAlign: "center",
  },
  infoRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  infoRowBorder: {
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoRowLabelBlock: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    width: "45%",
  },
  infoRowIcon: {
    opacity: 0.9,
  },
  infoRowLabel: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.15,
    textTransform: "uppercase",
  },
  infoRowValue: {
    color: colors.text,
    fontFamily: typography.bodyFamily,
    flex: 1,
    fontSize: typography.bodySize,
    fontWeight: "600",
    lineHeight: 22,
    textAlign: "right",
  },
  listItemDivider: {
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  medicalChunk: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  medicalChunkTitle: {
    color: colors.wood,
    fontFamily: typography.headingFamily,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
    paddingHorizontal: 4,
    textTransform: "uppercase",
  },
  itemWithHeader: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  contactRowHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  contactAvatar: {
    alignItems: "center",
    aspectRatio: 1,
    backgroundColor: colors.infoSoft,
    borderRadius: radius.pill,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  contactAvatarText: {
    color: colors.info,
    fontFamily: typography.headingFamily,
    fontSize: 16,
    fontWeight: "800",
  },
  contactRowHeaderCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  itemName: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: typography.bodySize,
    fontWeight: "700",
    lineHeight: 20,
  },
  itemSubtitle: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: typography.captionSize,
    lineHeight: 18,
  },
  itemFields: {
    gap: 0,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderColor: colors.border,
    borderWidth: 1,
    overflow: "hidden",
  },
  documentRowTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  documentIconBlock: {
    alignItems: "center",
    aspectRatio: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderColor: colors.border,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  documentTopCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  personRowTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  personAvatar: {
    alignItems: "center",
    aspectRatio: 1,
    backgroundColor: colors.successSoft,
    borderRadius: radius.pill,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  personAvatarText: {
    color: colors.success,
    fontFamily: typography.headingFamily,
    fontSize: 16,
    fontWeight: "800",
  },
  personTopCopy: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  personStatusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  fightRowTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  fightIconBlock: {
    alignItems: "center",
    aspectRatio: 1,
    borderRadius: radius.md,
    borderColor: colors.border,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  fightTopCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  historyWrap: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  historyHeaderRow: {
    alignItems: "baseline",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  historyTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.2,
    lineHeight: 20,
  },
  historyMeta: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
    lineHeight: 18,
  },
  paymentsHistoryList: {
    marginTop: spacing.xs,
  },
  paymentsHistoryDesktop: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  desktopPaymentHead: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderBottomColor: colors.borderStrong,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  desktopPaymentHeadText: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  desktopPaymentRow: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  desktopPaymentRowAlt: {
    backgroundColor: colors.surface,
  },
  paymentCell: {
    minWidth: 0,
  },
  paymentColAmount: {
    flex: 1.2,
    gap: 2,
  },
  paymentColDate: {
    flex: 1.5,
  },
  paymentColPeriod: {
    flex: 1.8,
  },
  paymentColMethod: {
    flex: 1,
  },
  paymentColStatus: {
    alignItems: "flex-end",
    flex: 0.9,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  paymentAmount: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 20,
  },
  paymentMeta: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
    lineHeight: 16,
  },
  paymentText: {
    color: colors.text,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  mobilePaymentRow: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  mobilePaymentTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  mobilePaymentAmountBlock: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  mobilePaymentAmount: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 22,
  },
  pagination: {
    alignItems: "center",
    borderTopColor: colors.borderStrong,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  paginationMeta: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.2,
  },
  pagLink: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  pagLinkDisabled: {
    opacity: 0.45,
  },
  pagLinkHovered: {
    backgroundColor: colors.woodSoft,
  },
  pagLinkPressed: {
    opacity: 0.75,
    backgroundColor: colors.woodSoft,
  },
  pagLinkLabel: {
    color: colors.wood,
    fontFamily: typography.headingFamily,
    fontSize: 12,
    fontWeight: "700",
    textDecorationLine: "underline",
    letterSpacing: 0.2,
  },
  carouselRoot: {
    gap: spacing.md,
    width: "100%",
  },
  carouselNavRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  carouselNavBtn: {
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    borderColor: colors.border,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  carouselNavBtnDisabled: {
    opacity: 0.4,
  },
  carouselNavBtnHovered: {
    backgroundColor: colors.woodSoft,
  },
  carouselNavBtnPressed: {
    backgroundColor: colors.woodSoft,
    opacity: 0.85,
  },
  carouselDots: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    flex: 1,
    justifyContent: "center",
  },
  carouselDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.borderStrong,
  },
  carouselDotActive: {
    width: 24,
    backgroundColor: colors.wood,
    borderRadius: 4,
  },
  carouselSlideLabel: {
    flex: 1,
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
    textAlign: "right",
  },
  carouselViewport: {
    minHeight: 200,
    width: "100%",
  },
  carouselSlide: {
    gap: spacing.lg,
    width: "100%",
  },
  carouselSlideHidden: {
    display: "none",
  },
  slideInner: {
    gap: spacing.md,
    width: "100%",
  },
  headerInlineLink: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  headerInlineLinkHovered: {
    backgroundColor: colors.woodSoft,
  },
  headerInlineLinkPressed: {
    backgroundColor: colors.woodSoft,
    opacity: 0.85,
  },
  headerInlineLinkLabel: {
    color: colors.wood,
    fontFamily: typography.headingFamily,
    fontSize: 12,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  lastEventCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    borderColor: colors.gold,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  lastEventTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  lastEventLabel: {
    color: colors.woodStrong,
    fontFamily: typography.headingFamily,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  lastEventDate: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: typography.captionSize,
    lineHeight: 18,
  },
  lastEventContent: {
    color: colors.text,
    fontFamily: typography.bodyFamily,
    fontSize: typography.bodySize,
    fontWeight: "500",
    lineHeight: 22,
  },
  lastEventLink: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: radius.sm,
    flexDirection: "row",
    gap: 4,
    marginTop: spacing.xs,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  lastEventLinkHovered: {
    backgroundColor: colors.goldSoft,
  },
  lastEventLinkPressed: {
    backgroundColor: colors.goldSoft,
    opacity: 0.85,
  },
  lastEventLinkLabel: {
    color: colors.wood,
    fontFamily: typography.headingFamily,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.1,
    textDecorationLine: "underline",
  },
  goTrajectoryCta: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: colors.surface,
    borderColor: colors.gold,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: MIN_TOUCH_TARGET + 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  goTrajectoryCtaHovered: {
    backgroundColor: colors.goldSoft,
  },
  goTrajectoryCtaPressed: {
    backgroundColor: colors.goldSoft,
    opacity: 0.9,
  },
  goTrajectoryIcon: {
    alignItems: "center",
    aspectRatio: 1,
    backgroundColor: colors.goldSoft,
    borderRadius: radius.pill,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  goTrajectoryCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  goTrajectoryTitle: {
    color: colors.woodStrong,
    fontFamily: typography.headingFamily,
    fontSize: typography.bodySize,
    fontWeight: "700",
    lineHeight: 20,
  },
  goTrajectorySubtitle: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: typography.captionSize,
    lineHeight: 18,
  },
});

const mobileStyles = StyleSheet.create({
  hero: {
    alignItems: "center",
    flexDirection: "column",
  },
  twoColGrid: {
    flexDirection: "column",
  },
  pagination: {
    flexDirection: "column",
  },
  carouselViewport: {
    minHeight: 300,
  },
});

const desktopStyles = StyleSheet.create({
  hero: {
    alignItems: "flex-start",
    flexDirection: "row",
  },
  twoColGrid: {
    flexDirection: "row",
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
