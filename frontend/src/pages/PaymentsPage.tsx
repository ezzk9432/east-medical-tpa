import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listPayments, updatePaymentStatus, type Payment } from "../api/payments";
import { Card, Select } from "../components/ui";
import { Button } from "../components/Button";
import { Badge } from "../components/ui";
import { paymentStatusTone, formatMoney, formatDate } from "../components/format";
import { PageHeader } from "../components/PageHeader";
import { useState } from "react";
import type { PaymentStatus } from "../types";

const STATUS_OPTIONS: { value: PaymentStatus | ""; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "PROCESSED", label: "Processed" },
  { value: "PAID", label: "Paid" },
  { value: "REJECTED", label: "Rejected" },
];

export function PaymentsPage() {
  const [status, setStatus] = useState<PaymentStatus | "">("");
  const queryClient = useQueryClient();

  const { data: payments, isLoading } = useQuery({
    queryKey: ["payments", status],
    queryFn: () => listPayments(status || undefined),
  });

  const mutation = useMutation({
    mutationFn: ({ id, newStatus }: { id: string; newStatus: PaymentStatus }) =>
      updatePaymentStatus(id, newStatus),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payments"] }),
  });

  return (
    <div className="p-8">
      <PageHeader title="Money Process" subtitle="Payment tracking and reconciliation" />

      <div className="mb-4">
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as PaymentStatus | "")}
          className="max-w-xs"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Case</th>
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            )}
            {payments?.length === 0 && !isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No payments found.
                </td>
              </tr>
            )}
            {payments?.map((p: Payment) => (
              <tr key={p.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">
                  {p.caseService?.case?.caseNumber ?? "—"}
                </td>
                <td className="px-4 py-3 text-slate-600">{p.caseService?.serviceType ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{formatMoney(p.amount, p.currency)}</td>
                <td className="px-4 py-3">
                  <Badge tone={paymentStatusTone(p.status)}>{p.status}</Badge>
                </td>
                <td className="px-4 py-3 text-slate-500">{formatDate(p.createdAt)}</td>
                <td className="px-4 py-3">
                  {p.status === "PENDING" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => mutation.mutate({ id: p.id, newStatus: "PROCESSED" })}
                    >
                      Mark processed
                    </Button>
                  )}
                  {p.status === "PROCESSED" && (
                    <Button size="sm" onClick={() => mutation.mutate({ id: p.id, newStatus: "PAID" })}>
                      Mark paid
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
