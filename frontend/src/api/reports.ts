import { api as apiClient } from "./client";
import type { DashboardSummary, CaseStatus } from "../types";

export type { DashboardSummary };

export interface AgingCase {
  id: string;
  caseNumber: string;
  status: CaseStatus;
  createdAt: string;
  patient: { fullName: string };
  ageDays: number;
}

export interface FinancialSummary {
  serviceCount: number;
  totalPriceIn: number;
  totalPriceOut: number;
  totalMargin: number;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await apiClient.get("/reports/dashboard");
  return data;
}

export async function getAgingReport(): Promise<AgingCase[]> {
  const { data } = await apiClient.get("/reports/aging");
  return data;
}

export async function getFinancialReport(params?: { startDate?: string; endDate?: string }): Promise<FinancialSummary> {
  const { data } = await apiClient.get("/reports/financial", { params });
  return data;
}
