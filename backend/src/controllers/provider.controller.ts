import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { writeAuditLog } from "../services/auditLog.service";

const providerSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  country: z.string().min(1),
  city: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
});

export async function createProvider(req: Request, res: Response) {
  const parsed = providerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
  }

  const provider = await prisma.provider.create({ data: parsed.data });

  await writeAuditLog({
    action: "CREATE",
    entityType: "Provider",
    entityId: provider.id,
    userId: req.user!.id,
    ipAddress: req.ip ?? undefined,
  });

  return res.status(201).json(provider);
}

export async function listProviders(req: Request, res: Response) {
  const { search, country, isActive } = req.query as Record<string, string>;

  const where: any = {};
  if (search) where.name = { contains: search, mode: "insensitive" };
  if (country) where.country = country;
  if (isActive !== undefined) where.isActive = isActive === "true";

  const providers = await prisma.provider.findMany({
    where,
    orderBy: { name: "asc" },
  });

  return res.json(providers);
}

export async function getProvider(req: Request, res: Response) {
  const id = String(req.params.id);

  const provider = await prisma.provider.findUnique({
    where: { id },
    include: { caseServices: { take: 20, orderBy: { createdAt: "desc" } } },
  });

  if (!provider) {
    return res.status(404).json({ error: "Provider not found" });
  }

  return res.json(provider);
}

const updateProviderSchema = providerSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export async function updateProvider(req: Request, res: Response) {
  const id = String(req.params.id);
  const parsed = updateProviderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
  }

  const existing = await prisma.provider.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: "Provider not found" });
  }

  const updated = await prisma.provider.update({ where: { id }, data: parsed.data });

  await writeAuditLog({
    action: "UPDATE",
    entityType: "Provider",
    entityId: id,
    userId: req.user!.id,
    details: { before: existing, after: parsed.data },
    ipAddress: req.ip ?? undefined,
  });

  return res.json(updated);
}
