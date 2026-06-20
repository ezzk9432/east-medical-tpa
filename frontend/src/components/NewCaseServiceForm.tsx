import { useState } from "react";
import type { FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { listProviders } from "../api/providers";
import { useCreateCaseService } from "../hooks/useCase";
import { Input, Label, Select } from "./ui";
import { Button } from "./Button";
import type { Currency } from "../types";

export function NewCaseServiceForm({ caseId, onDone }: { caseId: string; onDone: () => void }) {
  const { data: providers } = useQuery({ queryKey: ["providers"], queryFn: () => listProviders() });
  const createService = useCreateCaseService(caseId);

  const [serviceType, setServiceType] = useState("consultation");
  const [providerId, setProviderId] = useState("");
  const [priceIn, setPriceIn] = useState("");
  const [priceOut, setPriceOut] = useState("");
  const [currency, setCurrency] = useState<Currency>("EUR");
  const [exchangeRate, setExchangeRate] = useState("1");
  const [discountPct, setDiscountPct] = useState("0");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    createService.mutate(
      {
        caseId,
        providerId: providerId || undefined,
        serviceType,
        priceIn: Number(priceIn),
        priceOut: Number(priceOut),
        currency,
        exchangeRate: Number(exchangeRate),
        discountPct: Number(discountPct),
      },
      {
        onSuccess: onDone,
        onError: (err: any) => setError(err?.response?.data?.error ?? "Failed to add service."),
      }
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 space-y-3 rounded-md border border-slate-200 bg-slate-50 p-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="serviceType">Service type</Label>
          <Input id="serviceType" required value={serviceType} onChange={(e) => setServiceType(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="provider">Provider</Label>
          <Select id="provider" value={providerId} onChange={(e) => setProviderId(e.target.value)}>
            <option value="">— none —</option>
            {providers?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3">
        <div>
          <Label htmlFor="priceIn">Price in</Label>
          <Input
            id="priceIn"
            type="number"
            step="0.01"
            required
            value={priceIn}
            onChange={(e) => setPriceIn(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="priceOut">Price out</Label>
          <Input
            id="priceOut"
            type="number"
            step="0.01"
            required
            value={priceOut}
            onChange={(e) => setPriceOut(e.target.value)}
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
        <div>
          <Label htmlFor="exchangeRate">Exchange rate</Label>
          <Input
            id="exchangeRate"
            type="number"
            step="0.000001"
            value={exchangeRate}
            onChange={(e) => setExchangeRate(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="discount">Discount %</Label>
          <Input
            id="discount"
            type="number"
            step="0.01"
            value={discountPct}
            onChange={(e) => setDiscountPct(e.target.value)}
          />
        </div>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={createService.isPending}>
          {createService.isPending ? "Adding…" : "Add service"}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
