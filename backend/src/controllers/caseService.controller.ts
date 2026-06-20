import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { writeAuditLog } from "../services/auditLog.service";
import { calculateServiceFinancials, applyGuaranteedAmountCap, buildInvoiceNumber } from "../services/financial.service";

const createServiceSchema = z.object({
  caseId: z.string().uuid(),
  providerId: z.string().uuid().optional(),
  serviceType: z.string().min(1),
  description: z.string().optional(),
  priceIn: z.number().min(0),
  priceOut: z.number().min(0),
  currency: z.enum(["EUR", "EGP", "USD", "GBP"]).default("EUR"),
  exchangeRate: z.number().positive().default(1),
  discountPct: z.number().min(0).max(100).default(0),
  serviceDate: z.string().datetime().optional(),
});

export async function createCaseService(req: Request, res: Response) {
  const parsed = createServiceSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
  }

  const data = parsed.data;

  const caseRecord = await prisma.case.findUnique({
    where: { id: data.caseId },
    include: { contract: true, caseServices: true },
  });

  if (!caseRecord) {
    return res.status(404).json({ error: "Case not found" });
  }

  const deductiblePct = caseRecord.contract ? Number(caseRecord.contract.deductiblePct) : 0;

  const financials = calculateServiceFinancials({
    priceIn: data.priceIn,
    priceOut: data.priceOut,
    exchangeRate: data.exchangeRate,
    discountPct: data.discountPct,
    deductiblePct,
  });

  // Check against contract's guaranteed amount cap, if any
  let capInfo = { cappedAmount: financials.netPayable, capApplied: false, remainingAfter: Infinity };
  if (caseRecord.contract?.guaranteedAmount) {
    const alreadyUsed = caseRecord.caseServices.reduce(
      (sum: number, s: { priceOut: unknown }) => sum + Number(s.priceOut),
      0
    );
    capInfo = applyGuaranteedAmountCap(
      financials.netPayable,
      Number(caseRecord.contract.guaranteedAmount),
      alreadyUsed
    );
  }

  const service = await prisma.caseService.create({
    data: {
      caseId: data.caseId,
      providerId: data.providerId,
      serviceType: data.serviceType,
      description: data.description,
      priceIn: data.priceIn,
      priceOut: data.priceOut,
      currency: data.currency,
      exchangeRate: data.exchangeRate,
      discountPct: data.discountPct,
      deductionAmount: financials.deductibleAmount,
      serviceDate: data.serviceDate ? new Date(data.serviceDate) : undefined,
    },
    include: { provider: true },
  });

  // Move case into HAS_SERVICE status if it was still NEW
  if (caseRecord.status === "NEW") {
    await prisma.case.update({ where: { id: data.caseId }, data: { status: "HAS_SERVICE" } });
  }

  await writeAuditLog({
    action: "CREATE",
    entityType: "CaseService",
    entityId: service.id,
    userId: req.user!.id,
    details: { caseId: data.caseId, financials, capInfo },
    ipAddress: req.ip ?? undefined,
  });

  return res.status(201).json({ ...service, calculated: financials, guaranteedAmountCap: capInfo });
}

export async function listCaseServices(req: Request, res: Response) {
  const caseId = String(req.query.caseId ?? "");
  if (!caseId) {
    return res.status(400).json({ error: "caseId query parameter is required" });
  }

  const services = await prisma.caseService.findMany({
    where: { caseId },
    include: { provider: true, items: true, invoice: true, payment: true },
    orderBy: { createdAt: "desc" },
  });

  return res.json(services);
}

/**
 * Generates (or returns existing) invoice for a case service.
 */
export async function generateInvoice(req: Request, res: Response) {
  const caseServiceId = String(req.params.id);

  const service = await prisma.caseService.findUnique({
    where: { id: caseServiceId },
    include: { invoice: true, case: { include: { contract: true } } },
  });

  if (!service) {
    return res.status(404).json({ error: "Case service not found" });
  }

  if (service.invoice) {
    return res.json(service.invoice);
  }

  const deductiblePct = service.case.contract ? Number(service.case.contract.deductiblePct) : 0;

  const financials = calculateServiceFinancials({
    priceIn: Number(service.priceIn),
    priceOut: Number(service.priceOut),
    exchangeRate: Number(service.exchangeRate),
    discountPct: Number(service.discountPct),
    deductiblePct,
  });

  const invoiceCount = await prisma.invoice.count();
  const invoiceNumber = buildInvoiceNumber(invoiceCount + 1);

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      caseServiceId: service.id,
      amount: financials.netPayable,
      currency: service.currency,
    },
  });

  await writeAuditLog({
    action: "CREATE",
    entityType: "Invoice",
    entityId: invoice.id,
    userId: req.user!.id,
    details: { caseServiceId, financials },
    ipAddress: req.ip ?? undefined,
  });

  return res.status(201).json(invoice);
}
