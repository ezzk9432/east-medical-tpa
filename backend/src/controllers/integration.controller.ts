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

/**
 * Verifies a Stripe webhook signature using their documented scheme:
 *   1. Extract `t` (timestamp) and `v1` (signature) from the header
 *      format: "t=1234567890,v1=abc123..."
 *   2. Compute HMAC-SHA256 of "<t>.<rawBody>" using the webhook secret
 *   3. Compare computed vs v1 with timingSafeEqual (same-length buffers)
 *
 * Returns false (never throws) so the caller can produce a clean 400.
 */
function verifyStripeSignature(
  rawBody: Buffer,
  sigHeader: string,
  secret: string
): boolean {
  try {
    const parts: Record<string, string> = {};
    for (const part of sigHeader.split(",")) {
      const [k, v] = part.split("=");
      if (k && v) parts[k.trim()] = v.trim();
    }

    const timestamp = parts["t"];
    const v1 = parts["v1"];

    // Reject if header is malformed or timestamp is missing
    if (!timestamp || !v1) return false;

    // Reject replays older than 5 minutes
    const age = Math.abs(Date.now() / 1000 - parseInt(timestamp, 10));
    if (age > 300) return false;

    const signedPayload = `${timestamp}.${rawBody.toString("utf8")}`;
    const expectedHex = crypto
      .createHmac("sha256", secret)
      .update(signedPayload)
      .digest("hex");

    const expectedBuf = Buffer.from(expectedHex, "hex");
    const receivedBuf = Buffer.from(v1, "hex");

    // timingSafeEqual requires equal lengths — reject immediately if different
    if (expectedBuf.length !== receivedBuf.length) return false;

    return crypto.timingSafeEqual(expectedBuf, receivedBuf);
  } catch {
    return false;
  }
}

export async function stripeWebhook(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"] as string | undefined;

  if (env.stripeWebhookSecret) {
    if (!sig) {
      return res.status(400).json({ error: "Missing Stripe-Signature header" });
    }
    if (!verifyStripeSignature(req.body as Buffer, sig, env.stripeWebhookSecret)) {
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

/**
 * Verifies Paymob's webhook HMAC using their documented field-concatenation
 * scheme (v1 API). Paymob concatenates specific transaction fields in a fixed
 * order, HMAC-SHA512s the result with your HMAC secret from the dashboard,
 * and sends it as `body.obj.hmac`.
 *
 * Field order (from Paymob docs):
 *   amount_cents, created_at, currency, error_occured, has_parent_transaction,
 *   id, integration_id, is_3d_secure, is_auth, is_capture, is_refunded,
 *   is_standalone_payment, is_voided, order.id, owner, pending,
 *   source_data.pan, source_data.sub_type, source_data.type, success
 *
 * Returns false (never throws) on any problem.
 */
function verifyPaymobHmac(txn: Record<string, any>, secret: string): boolean {
  try {
    const fields = [
      txn["amount_cents"],
      txn["created_at"],
      txn["currency"],
      txn["error_occured"],
      txn["has_parent_transaction"],
      txn["id"],
      txn["integration_id"],
      txn["is_3d_secure"],
      txn["is_auth"],
      txn["is_capture"],
      txn["is_refunded"],
      txn["is_standalone_payment"],
      txn["is_voided"],
      txn["order"]?.["id"],
      txn["owner"],
      txn["pending"],
      txn["source_data"]?.["pan"],
      txn["source_data"]?.["sub_type"],
      txn["source_data"]?.["type"],
      txn["success"],
    ];

    const concatenated = fields.map((v) => String(v ?? "")).join("");
    const computed = crypto
      .createHmac("sha512", secret)
      .update(concatenated)
      .digest("hex");

    const received = String(txn["hmac"] ?? "");

    // Constant-time compare; both are hex strings so same charset — lengths will
    // match for any valid HMAC, but we guard anyway to prevent throw.
    const computedBuf = Buffer.from(computed, "hex");
    const receivedBuf = Buffer.from(received, "hex");
    if (computedBuf.length !== receivedBuf.length) return false;

    return crypto.timingSafeEqual(computedBuf, receivedBuf);
  } catch {
    return false;
  }
}

export async function paymobWebhook(req: Request, res: Response) {
  const body = req.body as any;
  const txn = body?.obj;

  // ── Signature verification ───────────────────────────────
  if (env.paymobHmacSecret) {
    if (!txn) {
      return res.status(400).json({ error: "Missing transaction object" });
    }
    if (!verifyPaymobHmac(txn, env.paymobHmacSecret)) {
      // Log the rejection for diagnostics but don't reveal details
      console.warn("[Paymob] Webhook HMAC verification failed — rejecting request");
      return res.status(400).json({ error: "Invalid webhook signature" });
    }
  } else {
    // Warn loudly in production if the secret is not configured, but don't
    // hard-reject (allows local dev without Paymob credentials).
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[Paymob] PAYMOB_HMAC_SECRET is not set — webhook signature is NOT verified. " +
        "This is a SECURITY RISK. Set it in your .env immediately."
      );
    }
  }
  // ────────────────────────────────────────────────────────

  await prisma.webhookEvent.create({
    data: {
      source: "paymob",
      eventType: body?.type ?? "transaction",
      payload: body,
    },
  });

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
