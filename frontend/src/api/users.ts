import { api } from "./client";
import type { User } from "../types";

export interface CreateUserInput {
  email: string;
  password: string;
  fullName: string;
  role: User["role"];
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const { data } = await api.post<User>("/auth/users", input);
  return data;
}
