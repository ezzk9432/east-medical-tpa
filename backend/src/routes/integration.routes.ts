import { Router } from "express";
import express from "express";
import {
  stripeWebhook,
  paymobWebhook,
  submitHospitalClaim,
  getHospitalClaimStatus,
  listWebhookEvents,
} from "../controllers/integration.controller";
import { requireAuth } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";

const router = Router();

// Stripe webhook — raw body needed for signature verification
router.post("/webhooks/stripe", express.raw({ type: "application/json" }), stripeWebhook);

// Paymob webhook
router.post("/webhooks/paymob", paymobWebhook);

// Hospital system integration (authenticated)
router.post("/hospital/submit-claim", requireAuth, requireRole("CASE_MANAGER", "ADMIN"), submitHospitalClaim);
router.get("/hospital/claim-status/:claimRef", requireAuth, getHospitalClaimStatus);

// Debug: list webhook events (admin only)
router.get("/webhooks", requireAuth, requireRole("ADMIN"), listWebhookEvents);

export default router;
