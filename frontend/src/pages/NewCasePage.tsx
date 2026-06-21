import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCase } from "../api/cases";
import { Card, CardBody, CardHeader, Input, Label, Select } from "../components/ui";
import { Button } from "../components/Button";
import { PageHeader } from "../components/PageHeader";
import type { CaseType, CaseTypeDetail, ArrivalChannel, Currency } from "../types";

const CASE_TYPES: CaseType[] = ["MEDICAL", "DENTAL", "TRAVEL", "LEGAL", "OTHER"];
const CASE_TYPE_DETAILS: CaseTypeDetail[] = [
  "SIMPLE_MEDICAL_OUTPATIENT",
  "LIGHT_ASSISTANCE_CASE",
  "HOSPITALIZATION",
  "EMERGENCY",
  "REPATRIATION",
  "EVACUATION",
  "OTHER",
];
const ARRIVAL_CHANNELS: ArrivalChannel[] = ["PHONE", "EMAIL", "PORTAL", "APP", "WALK_IN", "OTHER"];

export function NewCasePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Patient
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState("");
  const [nationality, setNationality] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");
  const [province, setProvince] = useState("");
  const [county, setCounty] = useState("");

  // Case classification
  const [isUrgent, setIsUrgent] = useState(false);
  const [caseType, setCaseType] = useState<CaseType | "">("MEDICAL");
  const [caseTypeDetail, setCaseTypeDetail] = useState<CaseTypeDetail | "">("");
  const [arrivalChannel, setArrivalChannel] = useState<ArrivalChannel | "">("");

  // Caller / intake
  const [callerName, setCallerName] = useState("");
  const [callerPhone, setCallerPhone] = useState("");
  const [callerEmail, setCallerEmail] = useState("");
  const [tourAgency, setTourAgency] = useState("");
  const [customerReference, setCustomerReference] = useState("");
  const [description, setDescription] = useState("");

  // Warranty
  const [warrantyStatus, setWarrantyStatus] = useState("");
  const [warrantyCurrency, setWarrantyCurrency] = useState<Currency>("EUR");
  const [warrantyLimitAmount, setWarrantyLimitAmount] = useState("");

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
        gender: gender || undefined,
        nationality: nationality || undefined,
        passportNumber: passportNumber || undefined,
        policyNumber: policyNumber || undefined,
        phone: phone || undefined,
        email: email || undefined,
        country: country || undefined,
        province: province || undefined,
        county: county || undefined,
      },
      isUrgent,
      caseType: caseType || undefined,
      caseTypeDetail: caseTypeDetail || undefined,
      arrivalChannel: arrivalChannel || undefined,
      callerName: callerName || undefined,
      callerPhone: callerPhone || undefined,
      callerEmail: callerEmail || undefined,
      tourAgency: tourAgency || undefined,
      customerReference: customerReference || undefined,
      description: description || undefined,
      warrantyStatus: warrantyStatus || undefined,
      warrantyCurrency: warrantyLimitAmount ? warrantyCurrency : undefined,
      warrantyLimitAmount: warrantyLimitAmount ? Number(warrantyLimitAmount) : undefined,
    });
  }

  return (
    <div className="p-8">
      <PageHeader title="New case" subtitle="Create a new medical assistance case" />

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        <Card>
          <CardHeader className="font-medium text-slate-700">Case classification</CardHeader>
          <CardBody className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="caseType">Case type</Label>
              <Select id="caseType" value={caseType} onChange={(e) => setCaseType(e.target.value as CaseType)}>
                {CASE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="caseTypeDetail">Case type detail</Label>
              <Select
                id="caseTypeDetail"
                value={caseTypeDetail}
                onChange={(e) => setCaseTypeDetail(e.target.value as CaseTypeDetail)}
              >
                <option value="">— select —</option>
                {CASE_TYPE_DETAILS.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="arrivalChannel">Arrival channel</Label>
              <Select
                id="arrivalChannel"
                value={arrivalChannel}
                onChange={(e) => setArrivalChannel(e.target.value as ArrivalChannel)}
              >
                <option value="">— select —</option>
                {ARRIVAL_CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {c.replace(/_/g, " ")}
                  </option>
                ))}
              </Select>
            </div>

            <label className="col-span-3 flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={isUrgent}
                onChange={(e) => setIsUrgent(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-teal-700"
              />
              Mark as urgent
            </label>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="font-medium text-slate-700">Patient information</CardHeader>
          <CardBody className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="gender">Gender</Label>
              <Select id="gender" value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="">— —</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="nationality">Nationality</Label>
              <Input id="nationality" value={nationality} onChange={(e) => setNationality(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="passport">Passport number</Label>
              <Input id="passport" value={passportNumber} onChange={(e) => setPassportNumber(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="policy">Policy number</Label>
              <Input id="policy" value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="province">Province</Label>
              <Input id="province" value={province} onChange={(e) => setProvince(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="county">County</Label>
              <Input id="county" value={county} onChange={(e) => setCounty(e.target.value)} />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="font-medium text-slate-700">Caller / intake details</CardHeader>
          <CardBody className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="callerName">Caller name</Label>
              <Input id="callerName" value={callerName} onChange={(e) => setCallerName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="callerPhone">Caller phone</Label>
              <Input id="callerPhone" value={callerPhone} onChange={(e) => setCallerPhone(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="callerEmail">Caller email</Label>
              <Input
                id="callerEmail"
                type="email"
                value={callerEmail}
                onChange={(e) => setCallerEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="tourAgency">Tour agency</Label>
              <Input id="tourAgency" value={tourAgency} onChange={(e) => setTourAgency(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="customerReference">Customer reference</Label>
              <Input
                id="customerReference"
                value={customerReference}
                onChange={(e) => setCustomerReference(e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                rows={3}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="font-medium text-slate-700">Warranty (optional)</CardHeader>
          <CardBody className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="warrantyStatus">Status</Label>
              <Input id="warrantyStatus" value={warrantyStatus} onChange={(e) => setWarrantyStatus(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="warrantyLimit">Limit amount</Label>
              <Input
                id="warrantyLimit"
                type="number"
                step="0.01"
                value={warrantyLimitAmount}
                onChange={(e) => setWarrantyLimitAmount(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="warrantyCurrency">Currency</Label>
              <Select
                id="warrantyCurrency"
                value={warrantyCurrency}
                onChange={(e) => setWarrantyCurrency(e.target.value as Currency)}
              >
                <option value="EUR">EUR</option>
                <option value="EGP">EGP</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
              </Select>
            </div>
          </CardBody>
        </Card>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Creating…" : "Create case"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
