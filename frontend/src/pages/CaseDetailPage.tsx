import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  useCase,
  useUpdateCase,
  useAddNote,
  useDocuments,
  useUploadDocument,
  useCloneCase,
  useGenerateInvoice,
} from "../hooks/useCase";
import { Card, CardBody, CardHeader, Badge, Select } from "../components/ui";
import { Button } from "../components/Button";
import { caseStatusLabel, caseStatusTone, formatDate, formatMoney } from "../components/format";
import { PageHeader } from "../components/PageHeader";
import { NewCaseServiceForm } from "../components/NewCaseServiceForm";
import { DiagnosisPanel } from "../components/DiagnosisPanel";
import { ActivityFeed } from "../components/ActivityFeed";
import { DocumentChecklist } from "../components/DocumentChecklist";
import type { CaseStatus, DocumentCategory } from "../types";

const STATUS_FLOW: CaseStatus[] = ["NEW", "HAS_SERVICE", "ASSIST_CLOSE", "MONEY_PROCESS", "CLOSED", "CANCELLED"];

const DOC_CATEGORIES: DocumentCategory[] = [
  "MEDICAL_REPORT",
  "LAB_REPORT",
  "POLICY",
  "PASSPORT",
  "INVOICE",
  "OTHER",
];

export function CaseDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data: caseData, isLoading } = useCase(id);
  const updateCase = useUpdateCase(id);
  const addNote = useAddNote(id);
  const { data: documents } = useDocuments(id);
  const uploadDoc = useUploadDocument(id);
  const cloneCase = useCloneCase(id);
  const generateInvoice = useGenerateInvoice(id);

  const [noteText, setNoteText] = useState("");
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [docCategory, setDocCategory] = useState<DocumentCategory>("MEDICAL_REPORT");
  const [docCaseServiceId, setDocCaseServiceId] = useState<string>("");

  if (isLoading) return <div className="p-8 text-sm text-slate-500">Loading case…</div>;
  if (!caseData) return <div className="p-8 text-sm text-rose-600">Case not found.</div>;

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      uploadDoc.mutate({ category: docCategory, file, caseServiceId: docCaseServiceId || undefined });
      e.target.value = "";
    }
  }

  function handleClone() {
    cloneCase.mutate(true, {
      onSuccess: (newCase) => navigate(`/cases/${newCase.id}`),
    });
  }

  return (
    <div className="p-8">
      <PageHeader
        title={`Case ${caseData.caseNumber}`}
        subtitle={caseData.patient?.fullName}
        actions={
          <div className="flex items-center gap-2">
            {caseData.isUrgent && <Badge tone="rose">Urgent</Badge>}
            <Badge tone={caseStatusTone(caseData.status)}>{caseStatusLabel(caseData.status)}</Badge>
            <Button variant="secondary" size="sm" onClick={handleClone} disabled={cloneCase.isPending}>
              {cloneCase.isPending ? "Cloning…" : "Clone case"}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          {/* Case classification + caller info */}
          <Card>
            <CardHeader className="font-medium text-slate-700">Case details</CardHeader>
            <CardBody className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Field label="Case type" value={caseData.caseType} />
              <Field label="Case type detail" value={caseData.caseTypeDetail?.replace(/_/g, " ")} />
              <Field label="Arrival channel" value={caseData.arrivalChannel} />
              <Field label="Caller name" value={caseData.callerName} />
              <Field label="Caller phone" value={caseData.callerPhone} />
              <Field label="Caller email" value={caseData.callerEmail} />
              <Field label="Tour agency" value={caseData.tourAgency} />
              <Field label="Customer reference" value={caseData.customerReference} />
              {caseData.description && (
                <div className="col-span-2">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Description</div>
                  <div className="text-slate-800">{caseData.description}</div>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Patient info */}
          <Card>
            <CardHeader className="font-medium text-slate-700">Patient information</CardHeader>
            <CardBody className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Field label="Full name" value={caseData.patient?.fullName} />
              <Field label="Gender" value={caseData.patient?.gender} />
              <Field label="Nationality" value={caseData.patient?.nationality} />
              <Field label="Passport number" value={caseData.patient?.passportNumber} />
              <Field label="Policy number" value={caseData.patient?.policyNumber} />
              <Field label="Phone" value={caseData.patient?.phone} />
              <Field label="Email" value={caseData.patient?.email} />
              <Field label="Country" value={caseData.patient?.country} />
              <Field label="Province" value={caseData.patient?.province} />
              <Field label="County" value={caseData.patient?.county} />
            </CardBody>
          </Card>

          {/* Diagnosis */}
          <Card>
            <CardHeader className="font-medium text-slate-700">Diagnosis</CardHeader>
            <CardBody>
              <DiagnosisPanel caseId={caseData.id} diagnoses={caseData.diagnoses ?? []} />
            </CardBody>
          </Card>

          {/* Case services */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <span className="font-medium text-slate-700">Case services</span>
              <Button size="sm" onClick={() => setShowServiceForm((v) => !v)}>
                {showServiceForm ? "Close" : "+ Add service"}
              </Button>
            </CardHeader>
            <CardBody>
              {showServiceForm && (
                <NewCaseServiceForm caseId={caseData.id} onDone={() => setShowServiceForm(false)} />
              )}

              {(caseData.caseServices?.length ?? 0) === 0 && !showServiceForm && (
                <p className="text-sm text-slate-400">No services added yet.</p>
              )}

              <div className="mt-3 space-y-3">
                {caseData.caseServices?.map((svc) => (
                  <div key={svc.id} className="rounded-md border border-slate-100 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-800">{svc.serviceType}</span>
                      <Badge tone="slate">{svc.status}</Badge>
                    </div>
                    {svc.provider && <div className="text-slate-500">{svc.provider.name}</div>}
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-slate-600">
                      <div>Price in: {formatMoney(svc.priceIn, svc.currency)}</div>
                      <div>Price out: {formatMoney(svc.priceOut, svc.currency)}</div>
                      <div>Discount: {svc.discountPct}%</div>
                    </div>
                    <div className="mt-2">
                      {svc.invoice?.pdfUrl ? (
                        <a
                          href={svc.invoice.pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-medium text-teal-700 hover:underline"
                        >
                          Download invoice {svc.invoice.invoiceNumber} (PDF)
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => generateInvoice.mutate(svc.id)}
                          disabled={generateInvoice.isPending}
                          className="text-xs font-medium text-teal-700 hover:underline disabled:text-slate-400"
                        >
                          {generateInvoice.isPending ? "Generating invoice…" : "Generate invoice"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader className="font-medium text-slate-700">Documents</CardHeader>
            <CardBody>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Select
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value as DocumentCategory)}
                  className="max-w-[180px]"
                >
                  {DOC_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.replace(/_/g, " ")}
                    </option>
                  ))}
                </Select>
                <Select
                  value={docCaseServiceId}
                  onChange={(e) => setDocCaseServiceId(e.target.value)}
                  className="max-w-[200px]"
                >
                  <option value="">No linked service</option>
                  {caseData.caseServices?.map((svc) => (
                    <option key={svc.id} value={svc.id}>
                      {svc.provider?.name ?? svc.serviceType} ({formatDate(svc.serviceDate)})
                    </option>
                  ))}
                </Select>
                <label>
                  <span className="cursor-pointer rounded-md bg-teal-700 px-4 py-2 text-sm text-white hover:bg-teal-800">
                    {uploadDoc.isPending ? "Uploading…" : "Upload file"}
                  </span>
                  <input type="file" className="hidden" onChange={handleFileSelect} />
                </label>
              </div>

              {(documents?.length ?? 0) === 0 && <p className="text-sm text-slate-400">No documents uploaded.</p>}

              <ul className="divide-y divide-slate-100">
                {documents?.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <span className="font-medium text-slate-800">{doc.fileName}</span>
                      <span className="ml-2 text-xs text-slate-400">{doc.category.replace(/_/g, " ")}</span>
                      {doc.caseServiceId && <span className="ml-2 text-xs text-teal-600">linked to service</span>}
                    </div>
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-teal-700 hover:underline"
                    >
                      View
                    </a>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader className="font-medium text-slate-700">Notes</CardHeader>
            <CardBody>
              <div className="mb-3 flex gap-2">
                <input
                  className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Add a note…"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                />
                <Button
                  size="sm"
                  disabled={!noteText.trim() || addNote.isPending}
                  onClick={() => {
                    addNote.mutate(noteText);
                    setNoteText("");
                  }}
                >
                  Add
                </Button>
              </div>
              <ul className="space-y-2">
                {caseData.notes?.map((note) => (
                  <li key={note.id} className="rounded-md bg-slate-50 p-2 text-sm">
                    <div>{note.content}</div>
                    <div className="mt-1 text-xs text-slate-400">{formatDate(note.createdAt)}</div>
                  </li>
                ))}
                {(caseData.notes?.length ?? 0) === 0 && (
                  <p className="text-sm text-slate-400">No notes yet.</p>
                )}
              </ul>
            </CardBody>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="font-medium text-slate-700">Status</CardHeader>
            <CardBody>
              <Select
                value={caseData.status}
                onChange={(e) => updateCase.mutate({ status: e.target.value as CaseStatus })}
                disabled={updateCase.isPending}
              >
                {STATUS_FLOW.map((s) => (
                  <option key={s} value={s}>
                    {caseStatusLabel(s)}
                  </option>
                ))}
              </Select>
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="font-medium text-slate-700">Document checklist</CardHeader>
            <CardBody>
              <DocumentChecklist caseData={caseData} />
            </CardBody>
          </Card>

          {(caseData.warrantyStatus || caseData.warrantyLimitAmount) && (
            <Card>
              <CardHeader className="font-medium text-slate-700">Warranty</CardHeader>
              <CardBody className="space-y-2 text-sm">
                <Field label="Status" value={caseData.warrantyStatus} />
                {caseData.warrantyLimitAmount != null && (
                  <Field
                    label="Limit"
                    value={formatMoney(caseData.warrantyLimitAmount, caseData.warrantyCurrency ?? "EUR")}
                  />
                )}
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader className="font-medium text-slate-700">Case info</CardHeader>
            <CardBody className="space-y-2 text-sm">
              <Field label="Created" value={formatDate(caseData.createdAt)} />
              <Field label="Last updated" value={formatDate(caseData.updatedAt)} />
              {caseData.closedAt && <Field label="Closed" value={formatDate(caseData.closedAt)} />}
              {caseData.contract && <Field label="Contract" value={caseData.contract.contractNumber} />}
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="font-medium text-slate-700">Activity</CardHeader>
            <CardBody>
              <ActivityFeed activities={caseData.activities ?? []} />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className="text-slate-800">{value || "—"}</div>
    </div>
  );
}
