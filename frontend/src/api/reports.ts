import { api } from "./client";
import type { DashboardSummary } from "../types";

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await api.get<DashboardSummary>("/reports/dashboard");
  return data;
}

export async function getCaseAgingReport() {
  const { data } = await api.get("/reports/case-aging");
  return data;
}
