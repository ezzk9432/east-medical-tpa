import { api } from "./client";
import type { PaymentStatus, Currency } from "../types";

export interface Payment {
  id: string;
  caseServiceId: string;
  status: PaymentStatus;
  amount: number;
  currency: Currency;
  paymentRef?: string | null;
  paidAt?: string | null;
  createdAt: string;
  caseService?: {
    case?: { caseNumber: string; patient?: { fullName: string } };
    serviceType: string;
  };
}

export async function listPayments(status?: PaymentStatus): Promise<Payment[]> {
  const { data } = await api.get<Payment[]>("/payments", { params: { status } });
  return data;
}

export async function updatePaymentStatus(id: string, status: PaymentStatus, paymentRef?: string) {
  const { data } = await api.patch(`/payments/${id}/status`, { status, paymentRef });
  return data;
}
