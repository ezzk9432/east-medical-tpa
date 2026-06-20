import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { writeAuditLog } from "../services/auditLog.service";

const createPaymentSchema = z.object({
  caseServiceId: z.string().uuid(),
  amount: z.number().min(0),
  currency: z.enum(["EUR", "EGP", "USD", "GBP"]).default("EUR"),
  paymentGroupId: z.string().uuid().optional(),
});

export async function createPayment(req: Request, res: Response) {
  const parsed = createPaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
  }

  const { caseServiceId, amount, currency, paymentGroupId } = parsed.data;

  const service = await prisma.caseService.findUnique({ where: { id: caseServiceId }, include: { payment: true } });
  if (!service) {
    return res.status(404).json({ error: "Case service not found" });
  }
  if (service.payment) {
    return res.status(409).json({ error: "A payment already exists for this case service" });
  }

  const payment = await prisma.payment.create({
    data: { caseServiceId, amount, currency, paymentGroupId, status: "PENDING" },
  });

  await writeAuditLog({
    action: "CREATE",
    entityType: "Payment",
    entityId: payment.id,
    userId: req.user!.id,
    details: { caseServiceId, amount },
    ipAddress: req.ip ?? undefined,
  });

  return res.status(201).json(payment);
}

const updatePaymentStatusSchema = z.object({
  status: z.enum(["PENDING", "PROCESSED", "PAID", "REJECTED"]),
  paymentRef: z.string().optional(),
});

export async function updatePaymentStatus(req: Request, res: Response) {
  const id = String(req.params.id);
  const parsed = updatePaymentStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
  }

  const existing = await prisma.payment.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: "Payment not found" });
  }

  const data: any = { status: parsed.data.status };
  if (parsed.data.paymentRef) data.paymentRef = parsed.data.paymentRef;
  if (parsed.data.status === "PAID") data.paidAt = new Date();

  const updated = await prisma.payment.update({ where: { id }, data });

  // If all payments for a case's services are PAID, move case to MONEY_PROCESS or CLOSED
  // (kept simple here — refine business rule as needed)

  await writeAuditLog({
    action: "UPDATE",
    entityType: "Payment",
    entityId: id,
    userId: req.user!.id,
    details: { before: existing.status, after: data.status },
    ipAddress: req.ip ?? undefined,
  });

  return res.json(updated);
}

export async function listPayments(req: Request, res: Response) {
  const { status, paymentGroupId } = req.query as Record<string, string>;

  const where: any = {};
  if (status) where.status = status;
  if (paymentGroupId) where.paymentGroupId = paymentGroupId;

  const payments = await prisma.payment.findMany({
    where,
    include: { caseService: { include: { case: { include: { patient: true } } } }, paymentGroup: true },
    orderBy: { createdAt: "desc" },
  });

  return res.json(payments);
}

export async function createPaymentGroup(req: Request, res: Response) {
  const schema = z.object({ name: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  const group = await prisma.paymentGroup.create({ data: { name: parsed.data.name } });

  await writeAuditLog({
    action: "CREATE",
    entityType: "PaymentGroup",
    entityId: group.id,
    userId: req.user!.id,
    ipAddress: req.ip ?? undefined,
  });

  return res.status(201).json(group);
}
