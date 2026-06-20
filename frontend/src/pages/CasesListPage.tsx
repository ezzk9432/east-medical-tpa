import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { listCases } from "../api/cases";
import { Card } from "../components/ui";
import { Badge, Input, Select } from "../components/ui";
import { Button } from "../components/Button";
import { caseStatusLabel, caseStatusTone, formatDate } from "../components/format";
import { PageHeader } from "../components/PageHeader";
import type { CaseStatus } from "../types";

const STATUS_OPTIONS: { value: CaseStatus | ""; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "NEW", label: "New" },
  { value: "HAS_SERVICE", label: "Has Service" },
  { value: "ASSIST_CLOSE", label: "Assist Close" },
  { value: "MONEY_PROCESS", label: "Money Process" },
  { value: "CLOSED", label: "Closed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function CasesListPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CaseStatus | "">("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["cases", { search, status, page }],
    queryFn: () => listCases({ search: search || undefined, status: status || undefined, page, pageSize: 20 }),
  });

  return (
    <div className="p-8">
      <PageHeader
        title="Cases"
        subtitle="All medical assistance cases"
        actions={
          <Link to="/cases/new">
            <Button>+ New case</Button>
          </Link>
        }
      />

      <div className="mb-4 flex gap-3">
        <Input
          placeholder="Search by case number or patient name…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-sm"
        />
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as CaseStatus | "");
            setPage(1);
          }}
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
              <th className="px-4 py-3">Case #</th>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Urgent</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && data?.data.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No cases found.
                </td>
              </tr>
            )}
            {data?.data.map((c) => (
              <tr key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link to={`/cases/${c.id}`} className="font-medium text-teal-700 hover:underline">
                    {c.caseNumber}
                  </Link>
                </td>
                <td className="px-4 py-3">{c.patient?.fullName}</td>
                <td className="px-4 py-3">
                  <Badge tone={caseStatusTone(c.status)}>{caseStatusLabel(c.status)}</Badge>
                </td>
                <td className="px-4 py-3">{c.isUrgent ? <Badge tone="rose">Urgent</Badge> : "—"}</td>
                <td className="px-4 py-3 text-slate-500">{formatDate(c.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {data && data.pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
          <span>
            Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} total)
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= data.pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
