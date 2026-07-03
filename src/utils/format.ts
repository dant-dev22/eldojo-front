import type { PaymentMethod, PaymentRecordStatus, PaymentStatus } from "@/types/api";

export function formatDate(value: string | null): string {
  if (!value) {
    return "No disponible";
  }

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export function formatPaymentStatus(status: PaymentStatus): string {
  switch (status) {
    case "up_to_date":
      return "Al corriente";
    case "due_soon":
      return "Próximo a vencer";
    case "overdue":
      return "Vencido";
    case "late":
      return "Pago vencido";
    case "partial":
      return "Pago parcial";
    case "waived":
      return "Exento";
    default:
      return status;
  }
}

export function formatDateTime(value: string | null): string {
  if (!value) {
    return "No disponible";
  }

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatCurrency(amount: number | string | null | undefined, currency = "MXN"): string {
  if (amount === null || amount === undefined || amount === "") {
    return "No disponible";
  }

  const numericAmount = typeof amount === "number" ? amount : Number(amount);

  if (Number.isNaN(numericAmount)) {
    return `${amount} ${currency}`;
  }

  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount);
}

export function formatPaymentMethod(method: PaymentMethod): string {
  switch (method) {
    case "cash":
      return "Efectivo";
    case "transfer":
      return "Transferencia";
    case "card":
      return "Tarjeta";
    case "other":
      return "Otro";
    default:
      return method;
  }
}

export function formatPaymentRecordStatus(status: PaymentRecordStatus): string {
  switch (status) {
    case "paid":
      return "Pagado";
    case "pending":
      return "Pendiente";
    case "void":
      return "Anulado";
    default:
      return status;
  }
}
