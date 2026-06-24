import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAgingReport, getFinancialReport } from "../api/reports";
import { Card, CardBody, CardHeader, Badge } from "../components/ui";
import { PageHeader } from "../components/PageHeader";
import { Button } from "../components/Button";
import { caseStatusTone, formatMoney, formatDate } from "../components/format";
import { exportToCsv, exportToExcel } from "../utils/export";

type Tab = "aging" | "financial";

export function ReportsPage() {
  const [tab, setTab] = useState<Tab>("aging");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const agingQ = useQuery({
    queryKey: ["report-aging"],
    queryFn: getAgingReport,
  });

  const financialQ = useQuery({
    queryKey: ["report-financial", startDate, endDate],
    queryFn: () => getFinancialReport({ startDate: startDate || undefined, endDate: endDate || undefined }),
  });

  function handleExportAging(format: "csv" | "xlsx") {
    const rows = (agingQ.data ?? []).map((c) => ({
      "Case Number": c.caseNumber,
      "Patient": c.patient.fullName,
      "Status": c.status.replace(/_/g, " "),
      "Created": formatDate(c.createdAt),
      "Age (days)": c.ageDays,
    }));
    const filename = `case-aging-report-${new Date().toISOString().slice(0, 10)}`;
    if (format === "csv") exportToCsv(rows, filename);
    else exportToExcel(rows, filename, "Case Aging");
  }

  function handleExportFinancial(format: "csv" | "xlsx") {
    if (!financialQ.data) return;
    const rows = [
      {
        "Period From": startDate || "All time",
        "Period To": endDate || "All time",
        "Service Count": financialQ.data.serviceCount,
        "Total Cost (In)": financialQ.data.totalPriceIn,
        "Total Billed (Out)": financialQ.data.totalPriceOut,
        "Gross Margin": financialQ.data.totalMargin,
      },
    ];
    const filename = `financial-summary-${new Date().toISOString().slice(0, 10)}`;
    if (format === "csv") exportToCsv(rows, filename);
    else exportToExcel(rows, filename, "Financial Summary");
  }

  return (
    <div className="p-8">
      <PageHeader title="Reports" subtitle="Operational and financial insights" />

      {/* Tab nav */}
      <div className="mb-6 flex gap-2 border-b border-slate-200">
        {(["aging", "financial"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors " +
              (tab === t
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-700")
            }
          >
            {t === "aging" ? "Case Aging" : "Financial Summary"}
          </button>
        ))}
      </div>

      {/* Case Aging */}
      {tab === "aging" && (
        <Card className="overflow-hidden">
          <CardHeader className="flex items-center justify-between">
            <div className="font-medium text-slate-700">
              Open Cases by Age
              <span className="ml-2 text-xs font-normal text-slate-400">cases not yet closed/cancelled, oldest first</span>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => handleExportAging("csv")} disabled={!agingQ.data?.length}>
                Export CSV
              </Button>
              <Button variant="secondary" size="sm" onClick={() => handleExportAging("xlsx")} disabled={!agingQ.data?.length}>
                Export Excel
              </Button>
            </div>
          </CardHeader>
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Case #</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Age</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {agingQ.isLoading && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>
              )}
              {agingQ.data?.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-medium text-teal-700">{c.caseNumber}</td>
                  <td className="px-4 py-3 text-slate-700">{c.patient.fullName}</td>
                  <td className="px-4 py-3">
                    <Badge tone={caseStatusTone(c.status as any)}>{c.status.replace(/_/g, " ")}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(c.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span className={
                      "font-semibold " +
                      (c.ageDays > 30 ? "text-rose-600" : c.ageDays > 14 ? "text-amber-600" : "text-slate-700")
                    }>
                      {c.ageDays}d
                    </span>
                    {c.ageDays > 30 && <span className="ml-1 text-xs text-rose-500">⚠ overdue</span>}
                  </td>
                </tr>
              ))}
              {!agingQ.isLoading && agingQ.data?.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No open cases.</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      )}

      {/* Financial Summary */}
      {tab === "financial" && (
        <div>
          <div className="mb-4 flex flex-wrap gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-500">From</span>
              <input
                type="date"
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-500">To</span>
              <input
                type="date"
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </label>
          </div>

          {financialQ.isLoading && <p className="text-sm text-slate-400">Loading…</p>}
          {financialQ.data && (
            <>
              <div className="mb-3 flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => handleExportFinancial("csv")}>
                  Export CSV
                </Button>
                <Button variant="secondary" size="sm" onClick={() => handleExportFinancial("xlsx")}>
                  Export Excel
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <FinCard label="Services" value={String(financialQ.data.serviceCount)} />
                <FinCard label="Total Cost (In)" value={formatMoney(financialQ.data.totalPriceIn)} colorClass="text-rose-700" />
                <FinCard label="Total Billed (Out)" value={formatMoney(financialQ.data.totalPriceOut)} colorClass="text-slate-900" />
                <FinCard
                  label="Gross Margin"
                  value={formatMoney(financialQ.data.totalMargin)}
                  colorClass={financialQ.data.totalMargin >= 0 ? "text-teal-700" : "text-rose-700"}
                  sub={
                    financialQ.data.totalPriceOut > 0
                      ? `${((financialQ.data.totalMargin / financialQ.data.totalPriceOut) * 100).toFixed(1)}%`
                      : undefined
                  }
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function FinCard({ label, value, colorClass = "text-slate-900", sub }: {
  label: string; value: string; colorClass?: string; sub?: string;
}) {
  return (
    <Card>
      <CardBody>
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
        <div className={`mt-1 text-xl font-bold ${colorClass}`}>{value}</div>
        {sub && <div className="text-xs text-slate-400">{sub}</div>}
      </CardBody>
    </Card>
  );
}
