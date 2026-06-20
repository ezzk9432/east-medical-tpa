import { useState } from "react";
import type { FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listProviders, createProvider } from "../api/providers";
import { Card, CardBody, Input, Label } from "../components/ui";
import { Button } from "../components/Button";
import { PageHeader } from "../components/PageHeader";

export function ProvidersPage() {
  const queryClient = useQueryClient();
  const { data: providers, isLoading } = useQuery({ queryKey: ["providers"], queryFn: () => listProviders() });
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState("");
  const [type, setType] = useState("hospital");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");

  const createMutation = useMutation({
    mutationFn: createProvider,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["providers"] });
      setShowForm(false);
      setName("");
      setCountry("");
      setCity("");
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    createMutation.mutate({ name, type, country, city: city || undefined });
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Providers"
        subtitle="Hospitals, clinics, and medical providers"
        actions={<Button onClick={() => setShowForm((v) => !v)}>{showForm ? "Close" : "+ Add provider"}</Button>}
      />

      {showForm && (
        <Card className="mb-6 max-w-xl">
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Input id="type" required value={type} onChange={(e) => setType(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" required value={country} onChange={(e) => setCountry(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
              </div>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Saving…" : "Save provider"}
              </Button>
            </form>
          </CardBody>
        </Card>
      )}

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Country</th>
              <th className="px-4 py-3">City</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            )}
            {providers?.map((p) => (
              <tr key={p.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                <td className="px-4 py-3 text-slate-600">{p.type}</td>
                <td className="px-4 py-3 text-slate-600">{p.country}</td>
                <td className="px-4 py-3 text-slate-600">{p.city || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
