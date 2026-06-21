import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { UserRole } from "@prisma/client";

export interface AccessTokenPayload {
  sub: string; // user id
  role: UserRole;
  email: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwtAccessSecret, {
    expiresIn: env.jwtAccessExpiresIn,
  } as jwt.SignOptions);
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshExpiresIn,
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): { sub: string } {
  return jwt.verify(token, env.jwtRefreshSecret) as { sub: string };
}

/**
 * Sign a short-lived MFA challenge token (5 minutes).
 * Uses the refresh secret so we don't need a third secret env var.
 * The payload includes mfaChallenge:true so verifyMFALogin() can distinguish
 * this from a real refresh token.
 */
export function signMFAChallengeToken(userId: string): string {
  return jwt.sign(
    { sub: userId, mfaChallenge: true },
    env.jwtRefreshSecret,
    { expiresIn: "5m" } as jwt.SignOptions
  );
}
