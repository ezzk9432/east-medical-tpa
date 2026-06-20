import { api } from "./client";
import type { CaseService, CaseDocument, Currency, DocumentCategory } from "../types";

export interface CreateCaseServiceInput {
  caseId: string;
  providerId?: string;
  serviceType: string;
  description?: string;
  priceIn: number;
  priceOut: number;
  currency: Currency;
  exchangeRate: number;
  discountPct: number;
  serviceDate?: string;
}

export async function createCaseService(input: CreateCaseServiceInput): Promise<CaseService> {
  const { data } = await api.post<CaseService>("/case-services", input);
  return data;
}

export async function listCaseServices(caseId: string): Promise<CaseService[]> {
  const { data } = await api.get<CaseService[]>("/case-services", { params: { caseId } });
  return data;
}

export async function generateInvoice(caseServiceId: string) {
  const { data } = await api.post(`/case-services/${caseServiceId}/invoice`);
  return data;
}

export async function listDocuments(caseId: string): Promise<CaseDocument[]> {
  const { data } = await api.get<CaseDocument[]>("/documents", { params: { caseId } });
  return data;
}

export async function uploadDocument(
  caseId: string,
  category: DocumentCategory,
  file: File
): Promise<CaseDocument> {
  const formData = new FormData();
  formData.append("caseId", caseId);
  formData.append("category", category);
  formData.append("file", file);

  const { data } = await api.post<CaseDocument>("/documents", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function deleteDocument(id: string) {
  await api.delete(`/documents/${id}`);
}
