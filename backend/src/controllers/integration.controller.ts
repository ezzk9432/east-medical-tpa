/**
 * External Integration Controller
 * Handles:
 *  1. Stripe payment webhook (payment.succeeded / payment.failed)
 *  2. Paymob payment webhook
 *  3. Hospital system claim submission (outbound)
 *  4. Hospital system claim status poll (inbound)
 */
import { Request, Response } from "express";
import crypto from "crypto";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { writeAuditLog } from "../services/auditLog.service";

// ─── Stripe Webhook ──────────────────────────────────────

export async function stripeWebhook(req: Request, res: Response) {
  // Verify Stripe signature
  const sig = req.headers["stripe-signature"] as string;
  if (env.stripeWebhookSecret && sig) {
    const hmac = crypto
      .createHmac("sha256", env.stripeWebhookSecret)
      .update(req.body as Buffer)
      .digest("hex");
    // In production use the official stripe library: stripe.webhooks.constructEvent(...)
    // Here we do a basic HMAC check
    const expected = `sha256=${hmac}`;
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return res.status(400).json({ error: "Invalid Stripe signature" });
    }
  }

  let event: any;
  try {
    event = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString()) : req.body;
  } catch {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  // Store raw event for idempotency / replay
  await prisma.webhookEvent.create({
    data: {
      source: "stripe",
      eventType: event.type ?? "unknown",
      payload: event,
    },
  });

  // Handle payment success
  if (event.type === "payment_intent.succeeded") {
    const pi = event.data?.object;
    const paymentRef = pi?.metadata?.eastMedicalPaymentId;

    if (paymentRef) {
      await prisma.payment.updateMany({
        where: { id: paymentRef },
        data: {
          status: "PAID",
          gatewayTxnId: pi.id,
          gatewayProvider: "stripe",
          paidAt: new Date(),
        },
      });
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const pi = event.data?.object;
    const paymentRef = pi?.metadata?.eastMedicalPaymentId;
    if (paymentRef) {
      await prisma.payment.updateMany({
        where: { id: paymentRef },
        data: { status: "REJECTED", gatewayProvider: "stripe", gatewayTxnId: pi.id },
      });
    }
  }

  await prisma.webhookEvent.updateMany({
    where: { source: "stripe", payload: { path: ["id"], equals: event.id } },
    data: { processed: true, processedAt: new Date() },
  });

  return res.json({ received: true });
}

// ─── Paymob Webhook ──────────────────────────────────────

export async function paymobWebhook(req: Request, res: Response) {
  const body = req.body as any;

  await prisma.webhookEvent.create({
    data: {
      source: "paymob",
      eventType: body?.type ?? "transaction",
      payload: body,
    },
  });

  const txn = body?.obj;
  if (txn?.success === true && txn?.order?.merchant_order_id) {
    await prisma.payment.updateMany({
      where: { id: txn.order.merchant_order_id },
      data: {
        status: "PAID",
        gatewayTxnId: String(txn.id),
        gatewayProvider: "paymob",
        paidAt: new Date(),
      },
    });
  }

  return res.json({ received: true });
}

// ─── Hospital System Integration ─────────────────────────

/**
 * POST /api/integrations/hospital/submit-claim
 * Submits a case service as a claim to the connected hospital system.
 */
export async function submitHospitalClaim(req: Request, res: Response) {
  const { caseServiceId } = req.body;
  if (!caseServiceId) return res.status(400).json({ error: "caseServiceId required" });

  const service = await prisma.caseService.findUnique({
    where: { id: caseServiceId },
    include: { case: { include: { patient: true, contract: true } }, provider: true },
  });

  if (!service) return res.status(404).json({ error: "Service not found" });

  if (!env.hospitalApiUrl) {
    // Return mock response when hospital API not configured
    const mockClaimRef = `MOCK-CLM-${Date.now()}`;
    await prisma.caseService.update({
      where: { id: caseServiceId },
      data: { externalClaimRef: mockClaimRef },
    });
    await writeAuditLog({
      action: "UPDATE",
      entityType: "CaseService",
      entityId: caseServiceId,
      userId: req.user!.id,
      details: { action: "hospital_claim_submitted", claimRef: mockClaimRef, mock: true },
      ipAddress: req.ip ?? undefined,
    });
    return res.json({ claimRef: mockClaimRef, status: "submitted", mock: true });
  }

  try {
    // Real hospital API call — Node 18+ has native fetch, no dependency needed
    const payload = {
      patientName: service.case.patient.fullName,
      caseNumber: service.case.caseNumber,
      serviceType: service.serviceType,
      amount: service.priceOut,
      currency: service.currency,
      providerName: service.provider?.name,
      contractNumber: service.case.contract?.contractNumber,
    };

    const resp = await fetch(`${env.hospitalApiUrl}/claims`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": env.hospitalApiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) throw new Error(`Hospital API error: ${resp.status}`);

    const data = (await resp.json()) as any;
    const claimRef = data.claimId ?? data.referenceNumber;

    await prisma.caseService.update({
      where: { id: caseServiceId },
      data: { externalClaimRef: claimRef },
    });

    await writeAuditLog({
      action: "UPDATE",
      entityType: "CaseService",
      entityId: caseServiceId,
      userId: req.user!.id,
      details: { action: "hospital_claim_submitted", claimRef },
      ipAddress: req.ip ?? undefined,
    });

    return res.json({ claimRef, status: "submitted" });
  } catch (err: any) {
    return res.status(502).json({ error: `Hospital API failed: ${err.message}` });
  }
}

/**
 * GET /api/integrations/hospital/claim-status/:claimRef
 * Poll claim status from the hospital system.
 */
export async function getHospitalClaimStatus(req: Request, res: Response) {
  const { claimRef } = req.params;

  if (!env.hospitalApiUrl) {
    // Mock response
    const statuses = ["pending", "approved", "processing", "paid"];
    const mockStatus = statuses[Math.floor(Math.random() * statuses.length)];
    return res.json({ claimRef, status: mockStatus, mock: true });
  }

  try {
    const resp = await fetch(`${env.hospitalApiUrl}/claims/${claimRef}`, {
      headers: { "X-Api-Key": env.hospitalApiKey },
    });
    if (!resp.ok) throw new Error(`Hospital API error: ${resp.status}`);
    const data = await resp.json();
    return res.json(data);
  } catch (err: any) {
    return res.status(502).json({ error: `Hospital API failed: ${err.message}` });
  }
}

/**
 * GET /api/integrations/webhooks
 * List recent webhook events (admin only, for debugging).
 */
export async function listWebhookEvents(req: Request, res: Response) {
  const events = await prisma.webhookEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, source: true, eventType: true, processed: true, processedAt: true, error: true, createdAt: true },
  });
  return res.json(events);
}
