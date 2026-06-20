import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getDashboardSummary } from "../api/reports";
import { Card, CardBody } from "../components/ui";
import { Badge } from "../components/ui";
import { caseStatusLabel, caseStatusTone, formatMoney } from "../components/format";
import { PageHeader } from "../components/PageHeader";

export function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: getDashboardSummary,
  });

  return (
    <div className="p-8">
      <PageHeader title="Dashboard" subtitle="Live overview of cases, providers, contracts, and payments" />

      {isLoading && <p className="text-sm text-slate-500">Loading…</p>}
      {error && <p className="text-sm text-rose-600">Could not load dashboard data.</p>}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Open cases" value={data.openCases} />
            <StatCard label="Urgent cases" value={data.urgentCases} accent="rose" />
            <StatCard label="Active contracts" value={data.activeContracts} />
            <StatCard label="Active providers" value={data.totalProviders} />
            <StatCard label="Closed cases" value={data.closedCases} />
            <StatCard label="Pending payments" value={data.pendingPayments} accent="amber" />
            <StatCard label="Total paid" value={formatMoney(data.totalPaidAmount)} />
            <StatCard label="Total cases" value={data.totalCases} />
          </div>

          <div className="mt-8">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Cases by status</h2>
            <Card>
              <CardBody className="flex flex-wrap gap-3">
                {data.casesByStatus.map((c) => (
                  <Badge key={c.status} tone={caseStatusTone(c.status)}>
                    {caseStatusLabel(c.status)}: {c.count}
                  </Badge>
                ))}
                {data.casesByStatus.length === 0 && (
                  <p className="text-sm text-slate-400">No cases yet.</p>
                )}
              </CardBody>
            </Card>
          </div>

          <div className="mt-6">
            <Link to="/cases/new" className="text-sm font-medium text-teal-700 hover:underline">
              + Create a new case
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: "rose" | "amber";
}) {
  return (
    <Card>
      <CardBody>
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
        <div
          className={
            "mt-1 text-2xl font-semibold " +
            (accent === "rose" ? "text-rose-600" : accent === "amber" ? "text-amber-600" : "text-slate-900")
          }
        >
          {value}
        </div>
      </CardBody>
    </Card>
  );
}
