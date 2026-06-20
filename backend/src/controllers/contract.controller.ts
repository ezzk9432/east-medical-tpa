import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { writeAuditLog } from "../services/auditLog.service";

const contractSchema = z.object({
  contractNumber: z.string().min(1),
  insurerName: z.string().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  deductiblePct: z.number().min(0).max(100).default(0),
  guaranteedAmount: z.number().positive().optional(),
  currency: z.enum(["EUR", "EGP", "USD", "GBP"]).default("EUR"),
  notes: z.string().optional(),
});

export async function createContract(req: Request, res: Response) {
  const parsed = contractSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
  }

  const { startDate, endDate, ...rest } = parsed.data;

  if (new Date(endDate) <= new Date(startDate)) {
    return res.status(400).json({ error: "endDate must be after startDate" });
  }

  const existing = await prisma.contract.findUnique({ where: { contractNumber: rest.contractNumber } });
  if (existing) {
    return res.status(409).json({ error: "A contract with this number already exists" });
  }

  const contract = await prisma.contract.create({
    data: { ...rest, startDate: new Date(startDate), endDate: new Date(endDate) },
  });

  await writeAuditLog({
    action: "CREATE",
    entityType: "Contract",
    entityId: contract.id,
    userId: req.user!.id,
    ipAddress: req.ip ?? undefined,
  });

  return res.status(201).json(contract);
}

export async function listContracts(req: Request, res: Response) {
  const { search, isActive } = req.query as Record<string, string>;

  const where: any = {};
  if (search) {
    where.OR = [
      { contractNumber: { contains: search, mode: "insensitive" } },
      { insurerName: { contains: search, mode: "insensitive" } },
    ];
  }
  if (isActive !== undefined) where.isActive = isActive === "true";

  const contracts = await prisma.contract.findMany({ where, orderBy: { startDate: "desc" } });
  return res.json(contracts);
}

export async function getContract(req: Request, res: Response) {
  const id = String(req.params.id);

  const contract = await prisma.contract.findUnique({
    where: { id },
    include: { cases: { take: 20, orderBy: { createdAt: "desc" }, include: { patient: true } } },
  });

  if (!contract) {
    return res.status(404).json({ error: "Contract not found" });
  }

  return res.json(contract);
}

const updateContractSchema = z.object({
  insurerName: z.string().min(1).optional(),
  endDate: z.string().datetime().optional(),
  deductiblePct: z.number().min(0).max(100).optional(),
  guaranteedAmount: z.number().positive().optional(),
  isActive: z.boolean().optional(),
  notes: z.string().optional(),
});

export async function updateContract(req: Request, res: Response) {
  const id = String(req.params.id);
  const parsed = updateContractSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
  }

  const existing = await prisma.contract.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: "Contract not found" });
  }

  const data: any = { ...parsed.data };
  if (data.endDate) data.endDate = new Date(data.endDate);

  const updated = await prisma.contract.update({ where: { id }, data });

  await writeAuditLog({
    action: "UPDATE",
    entityType: "Contract",
    entityId: id,
    userId: req.user!.id,
    details: { before: existing, after: data },
    ipAddress: req.ip ?? undefined,
  });

  return res.json(updated);
}
