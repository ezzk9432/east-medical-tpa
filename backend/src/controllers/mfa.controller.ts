import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { setupMFA, verifyTOTP } from "../services/mfa.service";
import { writeAuditLog } from "../services/auditLog.service";
import { signAccessToken } from "../utils/jwt";

/**
 * GET /api/auth/mfa/setup
 * Returns a QR code and backup codes for the authenticated user.
 * The secret is NOT saved yet — user must confirm with verifySetup.
 */
export async function getMFASetup(req: Request, res: Response) {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) return res.status(404).json({ error: "User not found" });
  if (user.mfaEnabled) return res.status(409).json({ error: "MFA is already enabled" });

  const setup = await setupMFA(user.email);

  // Store secret temporarily (pending confirmation)
  await prisma.user.update({
    where: { id: user.id },
    data: { mfaSecret: setup.secret }, // stored encrypted
  });

  return res.json({
    qrDataUrl: setup.qrDataUrl,
    backupCodes: setup.backupCodes,
  });
}

const confirmSchema = z.object({ token: z.string().length(6) });

/**
 * POST /api/auth/mfa/verify-setup
 * Confirm TOTP works before enabling it. Body: { token: "123456" }
 */
export async function verifyMFASetup(req: Request, res: Response) {
  const parsed = confirmSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "token must be a 6-digit string" });

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user || !user.mfaSecret) return res.status(400).json({ error: "Run MFA setup first" });
  if (user.mfaEnabled) return res.status(409).json({ error: "MFA is already active" });

  const valid = verifyTOTP(user.mfaSecret, parsed.data.token);
  if (!valid) return res.status(400).json({ error: "Invalid TOTP token" });

  await prisma.user.update({ where: { id: user.id }, data: { mfaEnabled: true } });

  await writeAuditLog({
    action: "MFA_SETUP",
    entityType: "User",
    entityId: user.id,
    userId: user.id,
    ipAddress: req.ip ?? undefined,
  });

  return res.json({ message: "MFA enabled successfully" });
}

const verifySchema = z.object({ token: z.string().length(6), tempToken: z.string().min(1) });

/**
 * POST /api/auth/mfa/verify
 * Called after login when MFA is enabled. tempToken is issued by login endpoint.
 * Returns a full accessToken on success.
 */
export async function verifyMFALogin(req: Request, res: Response) {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  // Verify the temp token (reuses refresh-token secret for the MFA step token)
  let payload: { sub: string; mfaChallenge: true };
  try {
    const jwt = await import("jsonwebtoken");
    const { env } = await import("../config/env");
    payload = jwt.default.verify(parsed.data.tempToken, env.jwtRefreshSecret) as any;
    if (!payload?.mfaChallenge) throw new Error("not a mfa token");
  } catch {
    return res.status(401).json({ error: "Invalid or expired MFA challenge token" });
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive || !user.mfaEnabled || !user.mfaSecret) {
    return res.status(401).json({ error: "MFA not configured for this user" });
  }

  const valid = verifyTOTP(user.mfaSecret, parsed.data.token);
  if (!valid) {
    await writeAuditLog({
      action: "MFA_VERIFY",
      entityType: "User",
      entityId: user.id,
      userId: user.id,
      details: { success: false },
      ipAddress: req.ip ?? undefined,
    });
    return res.status(401).json({ error: "Invalid TOTP token" });
  }

  const accessToken = signAccessToken({ sub: user.id, role: user.role, email: user.email });

  await writeAuditLog({
    action: "MFA_VERIFY",
    entityType: "User",
    entityId: user.id,
    userId: user.id,
    details: { success: true },
    ipAddress: req.ip ?? undefined,
  });

  return res.json({ accessToken });
}

/**
 * DELETE /api/auth/mfa
 * Disable MFA for the authenticated user (admin can also disable for others).
 */
export async function disableMFA(req: Request, res: Response) {
  const targetId = req.params.userId ?? req.user!.id;
  if (targetId !== req.user!.id && req.user!.role !== "ADMIN") {
    return res.status(403).json({ error: "Only admins can disable MFA for other users" });
  }

  await prisma.user.update({
    where: { id: targetId },
    data: { mfaEnabled: false, mfaSecret: null },
  });

  await writeAuditLog({
    action: "MFA_DISABLE",
    entityType: "User",
    entityId: targetId,
    userId: req.user!.id,
    ipAddress: req.ip ?? undefined,
  });

  return res.json({ message: "MFA disabled" });
}
