import type { CaseStatus, PaymentStatus, Currency } from "../types";

export function caseStatusTone(status: CaseStatus): "teal" | "amber" | "rose" | "slate" {
  switch (status) {
    case "CLOSED":
      return "slate";
    case "CANCELLED":
      return "rose";
    case "MONEY_PROCESS":
      return "amber";
    default:
      return "teal";
  }
}

export function caseStatusLabel(status: CaseStatus): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function paymentStatusTone(status: PaymentStatus): "teal" | "amber" | "rose" | "slate" {
  switch (status) {
    case "PAID":
      return "teal";
    case "PENDING":
      return "amber";
    case "REJECTED":
      return "rose";
    default:
      return "slate";
  }
}

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  EUR: "€",
  EGP: "E£",
  USD: "$",
  GBP: "£",
};

export function formatMoney(amount: number, currency: Currency = "EUR"): string {
  return `${CURRENCY_SYMBOLS[currency]}${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
