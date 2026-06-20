import { api } from "./client";
import type { Case, PaginatedResponse } from "../types";

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
    nationality?: string;
    passportNumber?: string;
    policyNumber?: string;
    phone?: string;
    email?: string;
  };
  contractId?: string;
  isUrgent?: boolean;
}

export async function createCase(input: CreateCaseInput): Promise<Case> {
  const { data } = await api.post<Case>("/cases", input);
  return data;
}

export async function updateCase(id: string, updates: Partial<Pick<Case, "status" | "isUrgent">>): Promise<Case> {
  const { data } = await api.patch<Case>(`/cases/${id}`, updates);
  return data;
}

export async function addCaseNote(id: string, content: string) {
  const { data } = await api.post(`/cases/${id}/notes`, { content });
  return data;
}
