import { useState } from "react";
import type { FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listContracts, createContract } from "../api/contracts";
import { Card, CardBody, Input, Label, Select, Badge } from "../components/ui";
import { Button } from "../components/Button";
import { PageHeader } from "../components/PageHeader";
import { formatDate, formatMoney } from "../components/format";
import type { Currency } from "../types";

export function ContractsPage() {
  const queryClient = useQueryClient();
  const { data: contracts, isLoading } = useQuery({ queryKey: ["contracts"], queryFn: () => listContracts() });
  const [showForm, setShowForm] = useState(false);

  const [contractNumber, setContractNumber] = useState("");
  const [insurerName, setInsurerName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [deductiblePct, setDeductiblePct] = useState("0");
  const [guaranteedAmount, setGuaranteedAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("EUR");
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: createContract,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      setShowForm(false);
      setContractNumber("");
      setInsurerName("");
    },
    onError: (err: any) => setError(err?.response?.data?.error ?? "Failed to create contract."),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    createMutation.mutate({
      contractNumber,
      insurerName,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      deductiblePct: Number(deductiblePct),
      guaranteedAmount: guaranteedAmount ? Number(guaranteedAmount) : undefined,
      currency,
    });
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Contracts"
        subtitle="Insurance contracts and policy terms"
        actions={<Button onClick={() => setShowForm((v) => !v)}>{showForm ? "Close" : "+ Add contract"}</Button>}
      />

      {showForm && (
        <Card className="mb-6 max-w-2xl">
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="contractNumber">Contract number</Label>
                  <Input
                    id="contractNumber"
                    required
                    value={contractNumber}
                    onChange={(e) => setContractNumber(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="insurerName">Insurer name</Label>
                  <Input
                    id="insurerName"
                    required
                    value={insurerName}
                    onChange={(e) => setInsurerName(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="startDate">Start date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="deductiblePct">Deductible %</Label>
                  <Input
                    id="deductiblePct"
                    type="number"
                    step="0.01"
                    value={deductiblePct}
                    onChange={(e) => setDeductiblePct(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="guaranteedAmount">Guaranteed amount</Label>
                  <Input
                    id="guaranteedAmount"
                    type="number"
                    step="0.01"
                    value={guaranteedAmount}
                    onChange={(e) => setGuaranteedAmount(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Select id="currency" value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
                    <option value="EUR">EUR</option>
                    <option value="EGP">EGP</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                  </Select>
                </div>
              </div>

              {error && <p className="text-sm text-rose-600">{error}</p>}

              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Saving…" : "Save contract"}
              </Button>
            </form>
          </CardBody>
        </Card>
      )}

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Contract #</th>
              <th className="px-4 py-3">Insurer</th>
              <th className="px-4 py-3">Period</th>
              <th className="px-4 py-3">Deductible</th>
              <th className="px-4 py-3">Guaranteed</th>
              <th className="px-4 py-3">Status</th>
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
            {contracts?.map((c) => (
              <tr key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">{c.contractNumber}</td>
                <td className="px-4 py-3 text-slate-600">{c.insurerName}</td>
                <td className="px-4 py-3 text-slate-600">
                  {formatDate(c.startDate)} – {formatDate(c.endDate)}
                </td>
                <td className="px-4 py-3 text-slate-600">{c.deductiblePct}%</td>
                <td className="px-4 py-3 text-slate-600">
                  {c.guaranteedAmount ? formatMoney(c.guaranteedAmount, c.currency) : "—"}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={c.isActive ? "teal" : "slate"}>{c.isActive ? "Active" : "Inactive"}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
