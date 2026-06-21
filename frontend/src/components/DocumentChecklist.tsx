import { useUpdateCase } from "../hooks/useCase";
import type { Case } from "../types";

const CHECKLIST_ITEMS: { key: keyof Pick<Case, "hasMedicalReport" | "hasMedicalExpenses" | "hasPolicyDoc" | "hasPassportDoc">; label: string }[] = [
  { key: "hasMedicalReport", label: "Medical Report" },
  { key: "hasMedicalExpenses", label: "Medical Expenses" },
  { key: "hasPolicyDoc", label: "Policy" },
  { key: "hasPassportDoc", label: "Passport" },
];

export function DocumentChecklist({ caseData }: { caseData: Case }) {
  const updateCase = useUpdateCase(caseData.id);

  return (
    <div className="space-y-2">
      {CHECKLIST_ITEMS.map((item) => (
        <label key={item.key} className="flex items-center justify-between text-sm">
          <span className="text-slate-600">{item.label}</span>
          <select
            value={caseData[item.key] ? "Yes" : "No"}
            onChange={(e) => updateCase.mutate({ [item.key]: e.target.value === "Yes" })}
            className="rounded-md border border-slate-300 px-2 py-1 text-xs"
          >
            <option value="No">No</option>
            <option value="Yes">Yes</option>
          </select>
        </label>
      ))}
    </div>
  );
}
