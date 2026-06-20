import { api } from "./client";
import type { Provider } from "../types";

export async function listProviders(search?: string): Promise<Provider[]> {
  const { data } = await api.get<Provider[]>("/providers", { params: { search } });
  return data;
}

export async function createProvider(input: Omit<Provider, "id" | "isActive">): Promise<Provider> {
  const { data } = await api.post<Provider>("/providers", input);
  return data;
}
