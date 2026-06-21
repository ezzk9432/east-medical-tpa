import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { verifyPassword, hashPassword } from "../utils/password";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { writeAuditLog } from "../services/auditLog.service";
import { env } from "../config/env";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
  }

  const { email, password } = parsed.data;
  const ipAddress = req.ip ?? undefined;

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.isActive) {
    await writeAuditLog({
      action: "LOGIN_FAILURE",
      entityType: "User",
      details: { email, reason: "user not found or inactive" },
      ipAddress,
    });
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const validPassword = await verifyPassword(password, user.passwordHash);

  if (!validPassword) {
    await writeAuditLog({
      action: "LOGIN_FAILURE",
      entityType: "User",
      entityId: user.id,
      userId: user.id,
      details: { email, reason: "invalid password" },
      ipAddress,
    });
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const accessToken = signAccessToken({ sub: user.id, role: user.role, email: user.email });
  const refreshToken = signRefreshToken(user.id);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // matches JWT_REFRESH_EXPIRES_IN default

  await prisma.refreshToken.create({
    data: { token: refreshToken, userId: user.id, expiresAt },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await writeAuditLog({
    action: "LOGIN_SUCCESS",
    entityType: "User",
    entityId: user.id,
    userId: user.id,
    ipAddress,
  });

  return res.json({
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
  });
}

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export async function refresh(req: Request, res: Response) {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  const { refreshToken } = parsed.data;

  try {
    const payload = verifyRefreshToken(refreshToken);

    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      return res.status(401).json({ error: "Refresh token is invalid or expired" });
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: "User not found or inactive" });
    }

    const accessToken = signAccessToken({ sub: user.id, role: user.role, email: user.email });
    return res.json({ accessToken });
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }
}

const logoutSchema = z.object({
  refreshToken: z.string().min(1),
});

export async function logout(req: Request, res: Response) {
  const parsed = logoutSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  await prisma.refreshToken.updateMany({
    where: { token: parsed.data.refreshToken },
    data: { revoked: true },
  });

  if (req.user) {
    await writeAuditLog({
      action: "LOGOUT",
      entityType: "User",
      entityId: req.user.id,
      userId: req.user.id,
      ipAddress: req.ip ?? undefined,
    });
  }

  return res.status(204).send();
}

// Seed/admin-only user creation. In production this route should itself be
// protected by requireRole("ADMIN") — wired up in routes/auth.routes.ts.
const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(1),
  role: z.enum(["CASE_MANAGER", "MEDICAL_STAFF", "FINANCE", "ADMIN", "VIEWER"]),
});

export async function createUser(req: Request, res: Response) {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
  }

  const { email, password, fullName, role } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "A user with this email already exists" });
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: { email, passwordHash, fullName, role },
  });

  await writeAuditLog({
    action: "CREATE",
    entityType: "User",
    entityId: user.id,
    userId: req.user?.id,
    details: { email, role },
    ipAddress: req.ip ?? undefined,
  });

  return res.status(201).json({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
  });
}

export async function listUsers(req: Request, res: Response) {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, fullName: true, role: true, isActive: true, mfaEnabled: true, lastLoginAt: true, createdAt: true, updatedAt: true },
    orderBy: { createdAt: "desc" },
  });
  return res.json(users);
}
