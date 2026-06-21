import { api } from "./client";
import type { Case, CaseDiagnosis, PaginatedResponse, CaseType, CaseTypeDetail, ArrivalChannel, Currency } from "../types";

export interface ListCasesParams {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function listCases(params: ListCasesParams = {}): Promise<PaginatedResponse<Case>> {
  const { data } = await api.get<PaginatedResponse<Case>>("/cases", { params });
  return data;
}

export async function getCase(id: string): Promise<Case> {
  const { data } = await api.get<Case>(`/cases/${id}`);
  return data;
}

export interface CreateCaseInput {
  patient: {
    fullName: string;
    gender?: string;
    nationality?: string;
    passportNumber?: string;
    policyNumber?: string;
    phone?: string;
    email?: string;
    country?: string;
    province?: string;
    county?: string;
    district?: string;
  };
  contractId?: string;
  isUrgent?: boolean;
  caseType?: CaseType;
  caseTypeDetail?: CaseTypeDetail;
  arrivalChannel?: ArrivalChannel;
  callerName?: string;
  callerPhone?: string;
  callerEmail?: string;
  tourAgency?: string;
  customerReference?: string;
  description?: string;
  noteForProforma?: string;
  warrantyStatus?: string;
  warrantyCurrency?: Currency;
  warrantyLimitAmount?: number;
}

export async function createCase(input: CreateCaseInput): Promise<Case> {
  const { data } = await api.post<Case>("/cases", input);
  return data;
}

export interface UpdateCaseInput {
  status?: Case["status"];
  isUrgent?: boolean;
  caseType?: CaseType;
  caseTypeDetail?: CaseTypeDetail;
  arrivalChannel?: ArrivalChannel;
  callerName?: string;
  callerPhone?: string;
  callerEmail?: string;
  tourAgency?: string;
  customerReference?: string;
  description?: string;
  noteForProforma?: string;
  warrantyStatus?: string;
  warrantyCurrency?: Currency;
  warrantyLimitAmount?: number;
  hasMedicalReport?: boolean;
  hasMedicalExpenses?: boolean;
  hasPolicyDoc?: boolean;
  hasPassportDoc?: boolean;
}

export async function updateCase(id: string, updates: UpdateCaseInput): Promise<Case> {
  const { data } = await api.patch<Case>(`/cases/${id}`, updates);
  return data;
}

export async function addCaseNote(id: string, content: string) {
  const { data } = await api.post(`/cases/${id}/notes`, { content });
  return data;
}

export async function addCaseDiagnosis(
  id: string,
  input: { label: string; icdCode?: string; notes?: string }
): Promise<CaseDiagnosis> {
  const { data } = await api.post<CaseDiagnosis>(`/cases/${id}/diagnoses`, input);
  return data;
}

export async function removeCaseDiagnosis(caseId: string, diagnosisId: string) {
  await api.delete(`/cases/${caseId}/diagnoses/${diagnosisId}`);
}

export async function cloneCase(id: string, cloneServices = false): Promise<Case> {
  const { data } = await api.post<Case>(`/cases/${id}/clone`, { cloneServices });
  return data;
}

export async function getCaseReport(id: string) {
  const { data } = await api.get(`/cases/${id}/report`);
  return data;
}
