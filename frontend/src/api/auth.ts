import { api } from "./client";
import type { User } from "../types";

interface LoginSuccess {
  mfaRequired?: false;
  accessToken: string;
  refreshToken: string;
  user: User;
}

interface LoginMFAChallenge {
  mfaRequired: true;
  tempToken: string;
}

export type LoginResponse = LoginSuccess | LoginMFAChallenge;

export async function loginRequest(email: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>("/auth/login", { email, password });
  return data;
}

interface MFAVerifySuccess {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export async function mfaVerifyRequest(tempToken: string, totpCode: string): Promise<MFAVerifySuccess> {
  const { data } = await api.post<MFAVerifySuccess>("/auth/mfa/verify", {
    tempToken,
    token: totpCode,
  });
  return data;
}

export async function logoutRequest(refreshToken: string): Promise<void> {
  await api.post("/auth/logout", { refreshToken });
}
