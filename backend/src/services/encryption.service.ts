/**
 * Field-Level Encryption Service
 * AES-256-GCM for PII fields (passport, policy numbers, phone, email on Patient).
 * Falls back to plaintext if no ENCRYPTION_KEY set (dev mode).
 */
import crypto from "crypto";
import { env } from "../config/env";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;
const ENCODING = "base64url";

function getKey(): Buffer | null {
  if (!env.encryptionKey) return null;
  const buf = Buffer.from(env.encryptionKey, "base64");
  if (buf.length !== 32) {
    console.warn("ENCRYPTION_KEY must be 32 bytes (base64). Field encryption disabled.");
    return null;
  }
  return buf;
}

let _key: Buffer | null | undefined = undefined;
function key(): Buffer | null {
  if (_key === undefined) _key = getKey();
  return _key;
}

/**
 * Encrypt a plaintext string. Returns "<iv>.<authTag>.<ciphertext>" in base64url.
 * If no key is configured, returns the plaintext unchanged.
 */
export function encrypt(plaintext: string | null | undefined): string | null | undefined {
  if (plaintext == null) return plaintext;
  const k = key();
  if (!k) return plaintext; // dev mode — no encryption

  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, k, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `enc:${iv.toString(ENCODING)}.${tag.toString(ENCODING)}.${enc.toString(ENCODING)}`;
}

/**
 * Decrypt a ciphertext string produced by encrypt().
 * Passthrough if string is not in our enc: format (plaintext legacy data).
 */
export function decrypt(ciphertext: string | null | undefined): string | null | undefined {
  if (ciphertext == null) return ciphertext;
  if (!ciphertext.startsWith("enc:")) return ciphertext; // plaintext / legacy

  const k = key();
  if (!k) return ciphertext; // key not configured — return raw

  try {
    const [ivB, tagB, encB] = ciphertext.slice(4).split(".");
    const iv = Buffer.from(ivB, ENCODING);
    const tag = Buffer.from(tagB, ENCODING);
    const enc = Buffer.from(encB, ENCODING);

    const decipher = crypto.createDecipheriv(ALGO, k, iv);
    decipher.setAuthTag(tag);
    return decipher.update(enc).toString("utf8") + decipher.final("utf8");
  } catch (err) {
    console.error("Field decryption failed:", err);
    return "[decryption error]";
  }
}

/**
 * Encrypt an object's PII fields in-place (modifies and returns the object).
 */
export function encryptPatientPII<T extends {
  passportNumber?: string | null;
  policyNumber?: string | null;
  phone?: string | null;
  email?: string | null;
}>(data: T): T {
  if (data.passportNumber !== undefined) data.passportNumber = encrypt(data.passportNumber) as string;
  if (data.policyNumber !== undefined) data.policyNumber = encrypt(data.policyNumber) as string;
  if (data.phone !== undefined) data.phone = encrypt(data.phone) as string;
  if (data.email !== undefined) data.email = encrypt(data.email) as string;
  return data;
}

/**
 * Decrypt an object's PII fields in-place (modifies and returns the object).
 */
export function decryptPatientPII<T extends {
  passportNumber?: string | null;
  policyNumber?: string | null;
  phone?: string | null;
  email?: string | null;
}>(data: T): T {
  if (data.passportNumber !== undefined) data.passportNumber = decrypt(data.passportNumber) as string;
  if (data.policyNumber !== undefined) data.policyNumber = decrypt(data.policyNumber) as string;
  if (data.phone !== undefined) data.phone = decrypt(data.phone) as string;
  if (data.email !== undefined) data.email = decrypt(data.email) as string;
  return data;
}
