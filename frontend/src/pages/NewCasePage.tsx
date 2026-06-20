import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCase } from "../api/cases";
import { Card, CardBody, Input, Label } from "../components/ui";
import { Button } from "../components/Button";
import { PageHeader } from "../components/PageHeader";

export function NewCasePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [nationality, setNationality] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: createCase,
    onSuccess: (newCase) => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      navigate(`/cases/${newCase.id}`);
    },
    onError: (err: any) => {
      setError(err?.response?.data?.error ?? "Failed to create case.");
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    mutation.mutate({
      patient: {
        fullName,
        nationality: nationality || undefined,
        passportNumber: passportNumber || undefined,
        policyNumber: policyNumber || undefined,
        phone: phone || undefined,
      },
      isUrgent,
    });
  }

  return (
    <div className="p-8">
      <PageHeader title="New case" subtitle="Create a new medical assistance case" />

      <Card className="max-w-xl">
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="fullName">Patient full name</Label>
              <Input id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nationality">Nationality</Label>
                <Input id="nationality" value={nationality} onChange={(e) => setNationality(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="passport">Passport number</Label>
                <Input id="passport" value={passportNumber} onChange={(e) => setPassportNumber(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="policy">Policy number</Label>
                <Input id="policy" value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={isUrgent}
                onChange={(e) => setIsUrgent(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-teal-700"
              />
              Mark as urgent
            </label>

            {error && <p className="text-sm text-rose-600">{error}</p>}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Creating…" : "Create case"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
                Cancel
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
