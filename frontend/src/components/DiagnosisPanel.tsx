import { useState } from "react";
import type { FormEvent } from "react";
import { useAddDiagnosis, useRemoveDiagnosis } from "../hooks/useCase";
import { Button } from "./Button";
import { Input } from "./ui";
import type { CaseDiagnosis } from "../types";

export function DiagnosisPanel({ caseId, diagnoses }: { caseId: string; diagnoses: CaseDiagnosis[] }) {
  const addDiagnosis = useAddDiagnosis(caseId);
  const removeDiagnosis = useRemoveDiagnosis(caseId);
  const [label, setLabel] = useState("");
  const [icdCode, setIcdCode] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    addDiagnosis.mutate(
      { label: label.trim().toUpperCase(), icdCode: icdCode || undefined },
      { onSuccess: () => { setLabel(""); setIcdCode(""); } }
    );
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="mb-3 flex gap-2">
        <Input
          placeholder="Diagnosis (e.g. Upper respiratory tract infection)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="flex-1"
        />
        <Input
          placeholder="ICD code"
          value={icdCode}
          onChange={(e) => setIcdCode(e.target.value)}
          className="max-w-[120px]"
        />
        <Button size="sm" type="submit" disabled={!label.trim() || addDiagnosis.isPending}>
          Add
        </Button>
      </form>

      {diagnoses.length === 0 && <p className="text-sm text-slate-400">No diagnoses recorded.</p>}

      <ul className="space-y-2">
        {diagnoses.map((d) => (
          <li
            key={d.id}
            className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
          >
            <div>
              <span className="font-medium text-slate-800">{d.label}</span>
              {d.icdCode && <span className="ml-2 text-xs text-slate-400">{d.icdCode}</span>}
            </div>
            <button
              onClick={() => removeDiagnosis.mutate(d.id)}
              className="text-xs text-rose-500 hover:underline"
              type="button"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
