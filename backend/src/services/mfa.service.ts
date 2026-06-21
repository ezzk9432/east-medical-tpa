/**
 * MFA Service — TOTP-based 2FA (Google Authenticator, Authy, etc.)
 * Uses speakeasy for TOTP generation/verification.
 */
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { env } from "../config/env";
import { encrypt, decrypt } from "./encryption.service";

export interface MFASetupResult {
  secret: string;       // encrypted — store in DB
  otpauthUrl: string;   // for QR code
  qrDataUrl: string;    // base64 PNG for the frontend
  backupCodes: string[]; // one-time backup codes
}

/**
 * Generate a new TOTP secret for a user.
 * Returns the encrypted secret (store in users.mfaSecret) and a QR code.
 */
export async function setupMFA(userEmail: string): Promise<MFASetupResult> {
  const secretObj = speakeasy.generateSecret({
    name: `${env.mfaIssuer} (${userEmail})`,
    issuer: env.mfaIssuer,
    length: 32,
  });

  const qrDataUrl = await QRCode.toDataURL(secretObj.otpauth_url!);

  // Generate 8 backup codes (one-time use — in production store hashed)
  const backupCodes = Array.from({ length: 8 }, () =>
    Math.random().toString(36).slice(2, 10).toUpperCase()
  );

  return {
    secret: encrypt(secretObj.base32) as string, // encrypted for DB storage
    otpauthUrl: secretObj.otpauth_url!,
    qrDataUrl,
    backupCodes,
  };
}

/**
 * Verify a TOTP token against an encrypted stored secret.
 * Allows ±1 window (30 sec slack).
 */
export function verifyTOTP(encryptedSecret: string, token: string): boolean {
  const rawSecret = decrypt(encryptedSecret);
  if (!rawSecret || rawSecret === "[decryption error]") return false;

  return speakeasy.totp.verify({
    secret: rawSecret,
    encoding: "base32",
    token,
    window: 1,
  });
}
