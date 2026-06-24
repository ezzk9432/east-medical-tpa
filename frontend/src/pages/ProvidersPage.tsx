import { useState } from "react";
import type { FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listProviders, createProvider } from "../api/providers";
import { Card, CardBody, CardHeader, Input, Label, Select, Badge } from "../components/ui";
import { Button } from "../components/Button";
import { PageHeader } from "../components/PageHeader";

const PROVIDER_TYPES = [
  "Hospital",
  "Clinic",
  "Doctor",
  "Pharmacy",
  "Laboratory",
  "Ambulance",
  "Dental",
  "Physiotherapy",
  "Other",
];

export function ProvidersPage() {
  const queryClient = useQueryClient();
  const { data: providers, isLoading } = useQuery({
    queryKey: ["providers"],
    queryFn: () => listProviders(),
  });
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState("");
  const [type, setType] = useState("Hospital");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: createProvider,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["providers"] });
      setShowForm(false);
      setName(""); setType("Hospital"); setCountry(""); setCity("");
      setPhone(""); setEmail(""); setAddress(""); setError(null);
    },
    onError: (err: any) => setError(err?.response?.data?.error ?? "Failed to save provider."),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    createMutation.mutate({
      name,
      type,
      country,
      city: city || undefined,
      phone: phone || undefined,
      email: email || undefined,
      address: address || undefined,
    });
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Providers"
        subtitle="Hospitals, clinics, and medical providers"
        actions={
          <Button onClick={() => { setShowForm((v) => !v); setError(null); }}>
            {showForm ? "Close" : "+ Add provider"}
          </Button>
        }
      />

      {showForm && (
        <Card className="mb-6 max-w-2xl">
          <CardHeader className="font-medium text-slate-700">New provider</CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Provider name *</Label>
                  <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cairo International Hospital" />
                </div>
                <div>
                  <Label htmlFor="type">Type *</Label>
                  <Select id="type" value={type} onChange={(e) => setType(e.target.value)}>
                    {PROVIDER_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="country">Country *</Label>
                  <Input id="country" required value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. Egypt" />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Cairo" />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+20 2 xxxx xxxx" />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@hospital.com" />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full address" />
                </div>
              </div>

              {error && <p className="text-sm text-rose-600">{error}</p>}

              <div className="flex gap-3">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Saving…" : "Save provider"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
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
              <th className="px-4 py-3">Country / City</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">Loading…</td>
              </tr>
            )}
            {!isLoading && providers?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">No providers yet. Click "+ Add provider" to create one.</td>
              </tr>
            )}
            {providers?.map((p) => (
              <tr key={p.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                <td className="px-4 py-3 text-slate-600">{p.type}</td>
                <td className="px-4 py-3 text-slate-600">
                  {p.country}{p.city ? `, ${p.city}` : ""}
                </td>
                <td className="px-4 py-3 text-slate-600">{p.phone || "—"}</td>
                <td className="px-4 py-3 text-slate-600">{p.email || "—"}</td>
                <td className="px-4 py-3">
                  <Badge tone={p.isActive ? "teal" : "slate"}>
                    {p.isActive ? "Active" : "Inactive"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
