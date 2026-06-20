import { api } from "./client";
import type { Contract } from "../types";

export async function listContracts(search?: string): Promise<Contract[]> {
  const { data } = await api.get<Contract[]>("/contracts", { params: { search } });
  return data;
}

export interface CreateContractInput {
  contractNumber: string;
  insurerName: string;
  startDate: string;
  endDate: string;
  deductiblePct: number;
  guaranteedAmount?: number;
  currency: Contract["currency"];
  notes?: string;
}

export async function createContract(input: CreateContractInput): Promise<Contract> {
  const { data } = await api.post<Contract>("/contracts", input);
  return data;
}
