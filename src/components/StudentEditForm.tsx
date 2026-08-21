import { Feather, Ionicons } from "@expo/vector-icons";
import { memo, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppDateInput } from "@/components/AppDateInput";
import { AppInput, type AppInputProps } from "@/components/AppInput";
import { AppSelect, type AppSelectProps } from "@/components/AppSelect";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import {
  formatCurrency,
  formatDate,
  formatPaymentStatus,
  formatStudentStatus,
} from "@/utils/format";

import type {
  Branch,
  MartialClass,
  Payment,
  PaymentStatus,
  Student,
  StudentStatus,
  StudentUpdatePayload,
} from "@/types/api";

export interface EditableFields {
  first_name: string;
  last_name: string;
  birth_date: string;
  birth_place: string;
  height_cm: string;
  enrollment_date: string;
  branch_id: string;
  primary_class_id: string;
  monthly_fee: string;
  currency: string;
  next_payment_date: string;
  payment_status: PaymentStatus | "";
  status: StudentStatus | "";
  guardian_name: string;
  guardian_phone: string;
  phone: string;
  email: string;
  is_minor: string;
  notes: string;
  rd_victorias: string;
  rd_empates: string;
  rd_derrotas: string;
}

export function studentToEditable(student: Student): EditableFields {
  return {
    first_name: student.first_name ?? "",
    last_name: student.last_name ?? "",
    birth_date: student.birth_date ? formatDate(student.birth_date) : "",
    birth_place: student.birth_place ?? "",
    height_cm: student.height_cm != null ? String(student.height_cm) : "",
    enrollment_date: student.enrollment_date ? formatDate(student.enrollment_date) : "",
    branch_id: student.branch_id ? String(student.branch_id) : "",
    primary_class_id: student.primary_class_id ? String(student.primary_class_id) : "",
    monthly_fee: student.monthly_fee ?? "",
    currency: student.currency ?? "",
    next_payment_date: student.next_payment_date ? formatDate(student.next_payment_date) : "",
    payment_status: student.payment_status ?? "",
    status: student.status ?? "",
    guardian_name: student.guardian_name ?? "",
    guardian_phone: student.guardian_phone ?? "",
    phone: student.phone ?? "",
    email: student.email ?? "",
    is_minor: student.is_minor ? "yes" : "no",
    notes: student.notes ?? "",
    rd_victorias: String(student.rd_victorias ?? 0),
    rd_empates: String(student.rd_empates ?? 0),
    rd_derrotas: String(student.rd_derrotas ?? 0),
  };
}

export function editableToPayload(
  fields: EditableFields,
  original: Student,
): Partial<StudentUpdatePayload> {
  const payload: Partial<StudentUpdatePayload> = {};

  const asString = (value: string): string | undefined => (value && value.trim().length > 0 ? value.trim() : undefined);
  const asNullableString = (value: string): string | null | undefined => {
    if (!value || value.trim().length === 0) return null;
    return value.trim();
  };
  const asNumber = (value: string): number | undefined => {
    if (!value || value.trim().length === 0) return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  };
  const asNullableNumber = (value: string): number | null | undefined => {
    if (!value || value.trim().length === 0) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };
  const asSelectId = (value: string): number | null | undefined => {
    if (!value || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };

  if (fields.first_name !== (original.first_name ?? "")) payload.first_name = asString(fields.first_name);
  if (fields.last_name !== (original.last_name ?? "")) payload.last_name = asString(fields.last_name);
  if (formatDate(original.birth_date) !== fields.birth_date) {
    payload.birth_date = asString(fields.birth_date);
  }
  if (fields.birth_place !== (original.birth_place ?? "")) payload.birth_place = asNullableString(fields.birth_place);
  if (String(original.height_cm ?? "") !== fields.height_cm) payload.height_cm = asNullableNumber(fields.height_cm);
  if (formatDate(original.enrollment_date) !== fields.enrollment_date) {
    payload.enrollment_date = asString(fields.enrollment_date);
  }
  if (String(original.branch_id ?? "") !== fields.branch_id) payload.branch_id = asSelectId(fields.branch_id) ?? undefined;
  if (String(original.primary_class_id ?? "") !== fields.primary_class_id) {
    payload.primary_class_id = asSelectId(fields.primary_class_id);
  }
  if ((original.monthly_fee ?? "") !== fields.monthly_fee) payload.monthly_fee = asNullableString(fields.monthly_fee);
  if ((original.currency ?? "") !== fields.currency) payload.currency = asNullableString(fields.currency);
  if (formatDate(original.next_payment_date) !== fields.next_payment_date) {
    payload.next_payment_date = asNullableString(fields.next_payment_date);
  }
  if (fields.payment_status !== "" && fields.payment_status !== (original.payment_status ?? "")) {
    payload.payment_status = fields.payment_status;
  }
  if (fields.status !== "" && fields.status !== (original.status ?? "")) payload.status = fields.status;
  if ((original.guardian_name ?? "") !== fields.guardian_name) payload.guardian_name = asNullableString(fields.guardian_name);
  if ((original.guardian_phone ?? "") !== fields.guardian_phone) payload.guardian_phone = asNullableString(fields.guardian_phone);
  if ((original.phone ?? "") !== fields.phone) payload.phone = asNullableString(fields.phone);
  if ((original.email ?? "") !== fields.email) payload.email = asNullableString(fields.email);
  if ((original.is_minor ? "yes" : "no") !== fields.is_minor) payload.is_minor = fields.is_minor === "yes";
  if ((original.notes ?? "") !== fields.notes) payload.notes = asNullableString(fields.notes);
  if (String(original.rd_victorias ?? 0) !== fields.rd_victorias) payload.rd_victorias = asNumber(fields.rd_victorias) ?? 0;
  if (String(original.rd_empates ?? 0) !== fields.rd_empates) payload.rd_empates = asNumber(fields.rd_empates) ?? 0;
  if (String(original.rd_derrotas ?? 0) !== fields.rd_derrotas) payload.rd_derrotas = asNumber(fields.rd_derrotas) ?? 0;

  return payload;
}

const CURRENCY_OPTIONS = [
  { label: "Pesos mexicanos (MXN)", value: "MXN" },
  { label: "Dólares estadounidenses (USD)", value: "USD" },
  { label: "Euros (EUR)", value: "EUR" },
  { label: "Pesos colombianos (COP)", value: "COP" },
  { label: "Pesos argentinos (ARS)", value: "ARS" },
  { label: "Pesos chilenos (CLP)", value: "CLP" },
  { label: "Soles peruanos (PEN)", value: "PEN" },
  { label: "Reales brasileños (BRL)", value: "BRL" },
];

const STATUS_OPTIONS: Array<{ label: string; value: StudentStatus }> = [
  { label: "Activo", value: "active" },
  { label: "Congelado", value: "frozen" },
  { label: "Inactivo", value: "inactive" },
];

const PAYMENT_STATUS_OPTIONS: Array<{ label: string; value: PaymentStatus }> = [
  { label: "Al día", value: "up_to_date" },
  { label: "Pago parcial", value: "partial" },
  { label: "Proximo a vencer", value: "due_soon" },
  { label: "Retrasado", value: "late" },
  { label: "Vencido", value: "overdue" },
];

interface StudentEditFormProps {
  student: Student;
  payments: Payment[];
  branch: Branch | null;
  primaryClass: MartialClass | null;
  branches: Branch[];
  classes: MartialClass[];
  idPrefix?: string;
  isEditing?: boolean;
  isSubmitting?: boolean;
  fields: EditableFields | null;
  onFieldChange?: <K extends keyof EditableFields>(key: K, value: EditableFields[K]) => void;
  onViewPayments?: () => void;
}

interface ReadRowProps {
  label: string;
  value?: string | number | null;
  idPrefix: string;
  isLast?: boolean;
  defaultValue?: string;
}

const ReadRow = memo(function ReadRow({
  label,
  value,
  idPrefix,
  isLast = false,
  defaultValue = "—",
}: ReadRowProps) {
  const display =
    value === undefined || value === null || value === "" ? defaultValue : String(value);
  return (
    <View
      nativeID={idPrefix}
      style={[styles.row, isLast ? styles.rowLast : null]}
      testID={idPrefix}
    >
      <View style={styles.rowLabelWrap}>
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <View style={styles.rowValueWrap}>
        <Text style={styles.rowValue} numberOfLines={2}>
          {display}
        </Text>
      </View>
    </View>
  );
});

interface FieldRowProps {
  children: React.ReactNode;
  idPrefix: string;
  isLast?: boolean;
}

const FieldRow = memo(function FieldRow({ children, idPrefix, isLast = false }: FieldRowProps) {
  return (
    <View
      nativeID={idPrefix}
      style={[styles.row, isLast ? styles.rowLast : null]}
      testID={idPrefix}
    >
      {children}
    </View>
  );
});

interface FormSectionHeaderProps {
  title: string;
  subtitle?: string;
  idPrefix?: string;
  iconName?: keyof typeof Feather.glyphMap;
}

const FormSectionHeader = memo(function FormSectionHeader({
  title,
  subtitle,
  idPrefix,
  iconName,
}: FormSectionHeaderProps) {
  const baseId = idPrefix ?? "student-edit-section-header";
  return (
    <View
      nativeID={`${baseId}-wrap`}
      style={styles.sectionHeader}
      testID={`${baseId}-wrap`}
    >
      <View style={styles.sectionHeaderIconWrap}>
        {iconName ? <Feather name={iconName} size={14} color={colors.wood} /> : null}
      </View>
      <View style={styles.sectionHeaderCopy}>
        <Text nativeID={`${baseId}-title`} style={styles.sectionTitle} testID={`${baseId}-title`}>
          {title}
        </Text>
        {subtitle ? (
          <Text nativeID={`${baseId}-subtitle`} style={styles.sectionSubtitle} testID={`${baseId}-subtitle`}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
});

function UnderlinedAppInput(props: AppInputProps) {
  return (
    <View style={styles.cell}>
      <AppInput
        wrapperClassName="student-edit-input-wrapper"
        containerClassName="student-edit-input-container"
        inputClassName="student-edit-input"
        labelClassName="student-edit-input-label"
        errorClassName="student-edit-input-error"
        {...props}
      />
    </View>
  );
}

function UnderlinedAppSelect(props: AppSelectProps) {
  return (
    <View style={styles.cell}>
      <AppSelect {...props} />
    </View>
  );
}

export function StudentEditForm({
  student,
  payments,
  branch,
  primaryClass,
  branches,
  classes,
  idPrefix = "student-edit-form",
  isEditing = false,
  fields,
  onFieldChange,
  onViewPayments,
}: StudentEditFormProps) {
  const { isDesktop } = useResponsiveLayout();

  const branchOptions = useMemo(
    () =>
      branches
        .filter((b) => b.is_active !== false)
        .map((b) => ({ label: b.name, value: String(b.id) })),
    [branches],
  );

  const classOptions = useMemo(
    () =>
      classes
        .filter((c) => c.is_active !== false)
        .map((c) => ({ label: c.name, value: String(c.id) })),
    [classes],
  );

  const minorOptions = [
    { label: "No (mayor de edad)", value: "no" },
    { label: "Sí (menor de edad)", value: "yes" },
  ];

  const effectiveFields: EditableFields = fields ?? studentToEditable(student);

  const effectiveStatus = (effectiveFields.status || student.status) as StudentStatus;
  const effectivePaymentStatus = (effectiveFields.payment_status || student.payment_status) as PaymentStatus;
  const effectiveCurrency = effectiveFields.currency || student.currency || undefined;
  const effectiveIsMinor = effectiveFields.is_minor === "yes" || student.is_minor;
  const nextPaymentLabel =
    effectiveFields.next_payment_date ||
    (student.next_payment_date ? formatDate(student.next_payment_date) : "") ||
    "—";

  const setField = useMemo(() => {
    if (!isEditing || !onFieldChange) return undefined;
    return onFieldChange;
  }, [isEditing, onFieldChange]);

  const personalItems: FieldSpec[] = [
    { key: "first_name", label: "Nombre", readValue: effectiveFields.first_name || student.first_name },
    { key: "last_name", label: "Apellidos", readValue: effectiveFields.last_name || student.last_name },
    {
      key: "birth_date",
      label: "Fecha de nacimiento",
      readValue: effectiveFields.birth_date || (student.birth_date ? formatDate(student.birth_date) : null),
      type: "date",
    },
    { key: "birth_place", label: "Lugar de nacimiento", readValue: effectiveFields.birth_place || student.birth_place },
    {
      key: "height_cm",
      label: "Altura (cm)",
      readValue: effectiveFields.height_cm || (student.height_cm != null ? String(student.height_cm) : null),
      type: "numeric",
    },
    {
      key: "enrollment_date",
      label: "Fecha de inscripción",
      readValue: effectiveFields.enrollment_date || (student.enrollment_date ? formatDate(student.enrollment_date) : null),
      type: "date",
    },
  ];
  const contactItems: FieldSpec[] = [
    { key: "phone", label: "Teléfono principal", readValue: effectiveFields.phone || student.phone, type: "phone" },
    { key: "email", label: "Email", readValue: effectiveFields.email || student.email, type: "email" },
    { key: "guardian_name", label: "Nombre del tutor", readValue: effectiveFields.guardian_name || student.guardian_name },
    { key: "guardian_phone", label: "Teléfono del tutor", readValue: effectiveFields.guardian_phone || student.guardian_phone, type: "phone" },
    {
      key: "is_minor",
      label: "¿Es menor de edad?",
      readValue: effectiveIsMinor ? "Sí (menor de edad)" : "No (mayor de edad)",
      type: "select",
      selectOptions: minorOptions,
      selectValue: effectiveFields.is_minor,
    },
  ];
  const sportItems: FieldSpec[] = [
    {
      key: "branch_id",
      label: "Sucursal",
      readValue: branch?.name ?? effectiveFields.branch_id,
      type: "select",
      selectOptions: branchOptions,
      selectValue: effectiveFields.branch_id,
    },
    {
      key: "primary_class_id",
      label: "Clase principal",
      readValue: primaryClass?.name ?? effectiveFields.primary_class_id,
      type: "select",
      selectOptions: classOptions,
      selectValue: effectiveFields.primary_class_id,
    },
    {
      key: "rd_victorias",
      label: "Victorias",
      readValue: effectiveFields.rd_victorias || String(student.rd_victorias ?? 0),
      type: "numeric",
    },
    {
      key: "rd_empates",
      label: "Empates",
      readValue: effectiveFields.rd_empates || String(student.rd_empates ?? 0),
      type: "numeric",
    },
    {
      key: "rd_derrotas",
      label: "Derrotas",
      readValue: effectiveFields.rd_derrotas || String(student.rd_derrotas ?? 0),
      type: "numeric",
    },
  ];
  const adminItems: FieldSpec[] = [
    {
      key: "monthly_fee",
      label: "Mensualidad",
      readValue: effectiveFields.monthly_fee || student.monthly_fee,
      type: "currency",
      currency: effectiveCurrency,
    },
    {
      key: "currency",
      label: "Moneda",
      readValue: effectiveFields.currency || student.currency,
      type: "select",
      selectOptions: CURRENCY_OPTIONS,
      selectValue: effectiveFields.currency,
    },
    {
      key: "status",
      label: "Estatus del alumno",
      readValue: formatStudentStatus(effectiveStatus),
      type: "select",
      selectOptions: STATUS_OPTIONS as unknown as SelectItem[],
      selectValue: effectiveFields.status,
    },
    {
      key: "payment_status",
      label: "Estatus de pago",
      readValue: formatPaymentStatus(effectivePaymentStatus),
      type: "select",
      selectOptions: PAYMENT_STATUS_OPTIONS as unknown as SelectItem[],
      selectValue: effectiveFields.payment_status,
    },
    {
      key: "next_payment_date",
      label: "Próximo pago",
      readValue: nextPaymentLabel,
      type: "date",
    },
  ];
  const notesItems: FieldSpec[] = [
    { key: "notes", label: "Notas generales", readValue: effectiveFields.notes || student.notes, multiline: true },
  ];

  const lastPayment = payments[0] ?? null;

  return (
    <View nativeID={idPrefix} style={styles.root} testID={idPrefix}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator
        style={styles.scroll}
      >
        <View
          nativeID={`${idPrefix}-personal-section`}
          style={styles.section}
          testID={`${idPrefix}-personal-section`}
        >
          <FormSectionHeader
            iconName="user"
            idPrefix={`${idPrefix}-personal-header`}
            subtitle="Nombre, fecha y lugar de nacimiento."
            title="Datos personales"
          />
          <SectionFields
            idPrefix={`${idPrefix}-personal`}
            isDesktop={isDesktop}
            isEditing={isEditing}
            items={personalItems}
            fields={effectiveFields}
            onFieldChange={setField}
          />
        </View>

        <View
          nativeID={`${idPrefix}-contact-section`}
          style={styles.section}
          testID={`${idPrefix}-contact-section`}
        >
          <FormSectionHeader
            iconName="phone"
            idPrefix={`${idPrefix}-contact-header`}
            subtitle="Teléfonos, email y persona tutora."
            title="Contacto y tutor"
          />
          <SectionFields
            idPrefix={`${idPrefix}-contact`}
            isDesktop={isDesktop}
            isEditing={isEditing}
            items={contactItems}
            fields={effectiveFields}
            onFieldChange={setField}
          />
        </View>

        <View
          nativeID={`${idPrefix}-sport-section`}
          style={styles.section}
          testID={`${idPrefix}-sport-section`}
        >
          <FormSectionHeader
            iconName="activity"
            idPrefix={`${idPrefix}-sport-header`}
            subtitle="Sucursal, clase principal y record deportivo."
            title="Perfil deportivo"
          />
          <SectionFields
            idPrefix={`${idPrefix}-sport`}
            isDesktop={isDesktop}
            isEditing={isEditing}
            items={sportItems}
            fields={effectiveFields}
            onFieldChange={setField}
          />
        </View>

        <View
          nativeID={`${idPrefix}-admin-section`}
          style={styles.section}
          testID={`${idPrefix}-admin-section`}
        >
          <FormSectionHeader
            iconName="dollar-sign"
            idPrefix={`${idPrefix}-admin-header`}
            subtitle="Colegiatura, estatus financiero y próximos cobros."
            title="Cobranza y estatus"
          />
          <SectionFields
            idPrefix={`${idPrefix}-admin`}
            isDesktop={isDesktop}
            isEditing={isEditing}
            items={adminItems}
            fields={effectiveFields}
            onFieldChange={setField}
          />
          <View style={styles.adminSummaryRow}>
            <SummaryTile label="Total pagos" value={String(payments.length)} />
            <SummaryTile
              label="Último pago"
              value={
                lastPayment
                  ? formatCurrency(lastPayment.amount, lastPayment.currency)
                  : "—"
              }
            />
            <SummaryTile label="Siguiente" value={nextPaymentLabel} />
          </View>
          {onViewPayments ? (
            <View nativeID={`${idPrefix}-admin-view-payments-wrap`} style={styles.viewPaymentsRow} testID={`${idPrefix}-admin-view-payments-wrap`}>
              <Pressable
                accessibilityLabel="Ver historial de pagos del alumno"
                accessibilityRole="link"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                nativeID={`${idPrefix}-admin-view-payments-link`}
                onPress={onViewPayments}
                style={({ hovered, pressed }) => [
                  styles.viewPaymentsLink,
                  hovered ? styles.viewPaymentsLinkHovered : null,
                  pressed ? styles.viewPaymentsLinkPressed : null,
                  { minHeight: 36, minWidth: 36 },
                ]}
                testID={`${idPrefix}-admin-view-payments-link`}
              >
                <Feather name="list" size={14} color={colors.wood} />
                <Text style={styles.viewPaymentsLinkLabel}>Ver pagos</Text>
                <Feather name="chevron-right" size={14} color={colors.textMuted} />
              </Pressable>
            </View>
          ) : null}
        </View>

        <View
          nativeID={`${idPrefix}-notes-section`}
          style={styles.section}
          testID={`${idPrefix}-notes-section`}
        >
          <FormSectionHeader
            iconName="file-text"
            idPrefix={`${idPrefix}-notes-header`}
            subtitle="Notas internas sobre el alumno."
            title="Notas y observaciones"
          />
          <SectionFields
            idPrefix={`${idPrefix}-notes`}
            isDesktop={isDesktop}
            isEditing={isEditing}
            items={notesItems}
            fields={effectiveFields}
            onFieldChange={setField}
          />
        </View>

        <View style={styles.footerSpacer} />
      </ScrollView>
    </View>
  );
}

type SelectItem = { label: string; value: string };

interface FieldSpec {
  key: keyof EditableFields;
  label: string;
  readValue?: string | number | null;
  type?: "text" | "numeric" | "phone" | "email" | "date" | "select" | "currency";
  multiline?: boolean;
  selectOptions?: SelectItem[];
  selectValue?: string;
  currency?: string;
}

interface SectionFieldsProps {
  idPrefix: string;
  items: FieldSpec[];
  fields: EditableFields;
  isEditing: boolean;
  isDesktop: boolean;
  onFieldChange: (<K extends keyof EditableFields>(key: K, value: EditableFields[K]) => void) | undefined;
}

function SectionFields({
  idPrefix,
  items,
  fields,
  isEditing,
  isDesktop,
  onFieldChange,
}: SectionFieldsProps) {
  if (!isEditing) {
    return (
      <View nativeID={`${idPrefix}-list`} style={styles.list} testID={`${idPrefix}-list`}>
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          let displayValue = item.readValue;
          if (item.type === "currency" && (item.readValue || item.currency)) {
            const raw = item.readValue ?? "";
            if (String(raw).trim().length > 0) {
              displayValue = formatCurrency(raw as number | string, item.currency);
            }
          }
          return (
            <ReadRow
              idPrefix={`${idPrefix}-row-${String(item.key)}`}
              isLast={isLast}
              key={`${idPrefix}-row-${String(item.key)}`}
              label={item.label}
              value={displayValue}
            />
          );
        })}
      </View>
    );
  }

  if (!isDesktop) {
    return (
      <View nativeID={`${idPrefix}-edit-list`} style={styles.list} testID={`${idPrefix}-edit-list`}>
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <FieldRow
              idPrefix={`${idPrefix}-edit-row-${String(item.key)}`}
              isLast={isLast}
              key={`${idPrefix}-edit-row-${String(item.key)}`}
            >
              <EditableCell
                idPrefix={`${idPrefix}-edit-${String(item.key)}`}
                spec={item}
                fields={fields}
                onFieldChange={onFieldChange}
              />
            </FieldRow>
          );
        })}
      </View>
    );
  }

  return (
    <View
      nativeID={`${idPrefix}-edit-grid`}
      style={[styles.list, desktopStyles.grid]}
      testID={`${idPrefix}-edit-grid`}
    >
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <View
            key={`${idPrefix}-edit-cell-${String(item.key)}`}
            style={[styles.gridCell, isLast ? styles.gridCellLast : null]}
          >
            <FieldRow
              idPrefix={`${idPrefix}-edit-row-${String(item.key)}`}
              isLast={true}
            >
              <EditableCell
                idPrefix={`${idPrefix}-edit-${String(item.key)}`}
                spec={item}
                fields={fields}
                onFieldChange={onFieldChange}
              />
            </FieldRow>
          </View>
        );
      })}
    </View>
  );
}

interface EditableCellProps {
  idPrefix: string;
  spec: FieldSpec;
  fields: EditableFields;
  onFieldChange: (<K extends keyof EditableFields>(key: K, value: EditableFields[K]) => void) | undefined;
}

function EditableCell({ idPrefix, spec, fields, onFieldChange }: EditableCellProps) {
  const fieldKey = spec.key;
  const currentValue = fields[fieldKey];
  const editable = onFieldChange != null;

  if (!editable) {
    return null;
  }

  switch (spec.type) {
    case "numeric":
      return (
        <UnderlinedAppInput
          editable={editable}
          keyboardType="numeric"
          label={spec.label}
          nativeID={`${idPrefix}-input`}
          onChangeText={(v) => onFieldChange(fieldKey, v as never)}
          testID={`${idPrefix}-input`}
          value={String(currentValue)}
        />
      );
    case "phone":
      return (
        <UnderlinedAppInput
          editable={editable}
          keyboardType="phone-pad"
          label={spec.label}
          nativeID={`${idPrefix}-input`}
          onChangeText={(v) => onFieldChange(fieldKey, v as never)}
          testID={`${idPrefix}-input`}
          value={String(currentValue)}
        />
      );
    case "email":
      return (
        <UnderlinedAppInput
          autoCapitalize="none"
          editable={editable}
          keyboardType="email-address"
          label={spec.label}
          nativeID={`${idPrefix}-input`}
          onChangeText={(v) => onFieldChange(fieldKey, v as never)}
          testID={`${idPrefix}-input`}
          value={String(currentValue)}
        />
      );
    case "date":
      return (
        <View style={styles.cell}>
          <AppDateInput
            editable={editable}
            label={spec.label}
            nativeID={`${idPrefix}-input`}
            onChangeText={(v) => onFieldChange(fieldKey, v as never)}
            testID={`${idPrefix}-input`}
            value={String(currentValue)}
          />
        </View>
      );
    case "select":
      return (
        <UnderlinedAppSelect
          enabled={editable}
          items={spec.selectOptions ?? []}
          label={spec.label}
          nativeID={`${idPrefix}-select`}
          onValueChange={(v) => onFieldChange(fieldKey, v as never)}
          testID={`${idPrefix}-select`}
          value={spec.selectValue ?? String(currentValue)}
        />
      );
    case "currency":
      return (
        <UnderlinedAppInput
          editable={editable}
          keyboardType="numbers-and-punctuation"
          label={spec.label}
          nativeID={`${idPrefix}-input`}
          onChangeText={(v) => onFieldChange(fieldKey, v as never)}
          rightAdornment={
            spec.currency ? (
              <Text style={styles.inputCurrencySuffix}>{spec.currency}</Text>
            ) : null
          }
          testID={`${idPrefix}-input`}
          value={String(currentValue)}
        />
      );
    default:
      if (spec.multiline) {
        return (
          <UnderlinedAppInput
            editable={editable}
            label={spec.label}
            multiline
            nativeID={`${idPrefix}-input`}
            numberOfLines={4}
            onChangeText={(v) => onFieldChange(fieldKey, v as never)}
            style={{ minHeight: 104, textAlignVertical: "top" }}
            testID={`${idPrefix}-input`}
            value={String(currentValue)}
          />
        );
      }
      const autoCapitalize =
        fieldKey === "first_name" || fieldKey === "last_name" || fieldKey === "birth_place" || fieldKey === "guardian_name"
          ? "words"
          : "none";
      return (
        <UnderlinedAppInput
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          editable={editable}
          label={spec.label}
          nativeID={`${idPrefix}-input`}
          onChangeText={(v) => onFieldChange(fieldKey, v as never)}
          testID={`${idPrefix}-input`}
          value={String(currentValue)}
        />
      );
  }
}

interface SummaryTileProps {
  label: string;
  value: string;
}

function SummaryTile({ label, value }: SummaryTileProps) {
  return (
    <View style={styles.summaryTile}>
      <Text style={styles.summaryTileLabel}>{label}</Text>
      <Text style={styles.summaryTileValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: "100%",
  },
  scroll: {
    flex: 1,
    width: "100%",
  },
  scrollContent: {
    flexGrow: 1,
    gap: spacing.lg,
    paddingBottom: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xl,
    paddingTop: spacing.md,
  },
  section: {
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.lg,
    width: "100%",
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm,
    width: "100%",
  },
  sectionHeaderIconWrap: {
    alignItems: "center",
    borderRadius: spacing.sm,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  sectionHeaderCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  sectionSubtitle: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
    lineHeight: 17,
  },
  list: {
    width: "100%",
  },
  row: {
    alignItems: "stretch",
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
    paddingBottom: spacing.sm,
    paddingTop: spacing.sm,
    width: "100%",
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowLabelWrap: {
    marginBottom: 4,
  },
  rowLabel: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  rowValueWrap: {
    minHeight: 24,
  },
  rowValue: {
    color: colors.text,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  cell: {
    width: "100%",
  },
  inputCurrencySuffix: {
    color: colors.wood,
    fontFamily: typography.headingFamily,
    fontSize: 13,
    fontWeight: "700",
    paddingRight: spacing.md,
  },
  adminSummaryRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
    width: "100%",
  },
  viewPaymentsRow: {
    marginTop: spacing.sm,
    width: "100%",
  },
  viewPaymentsLink: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  viewPaymentsLinkHovered: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.borderStrong,
  },
  viewPaymentsLinkPressed: {
    backgroundColor: colors.surfaceAlt,
    opacity: 0.9,
  },
  viewPaymentsLinkLabel: {
    color: colors.wood,
    fontFamily: typography.headingFamily,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  summaryTile: {
    alignItems: "flex-start",
    borderColor: colors.border,
    borderRadius: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  summaryTileLabel: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 9.5,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  summaryTileValue: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 14,
    fontWeight: "700",
  },
  footerSpacer: {
    height: spacing.xl,
  },
  gridCell: {
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    width: "50%",
  },
  gridCellLast: {
    borderBottomWidth: 0,
  },
});

const desktopStyles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
});
