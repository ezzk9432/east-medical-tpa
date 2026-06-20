import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";
import {
  createPayment,
  updatePaymentStatus,
  listPayments,
  createPaymentGroup,
} from "../controllers/payment.controller";

const router = Router();

router.use(requireAuth);

router.post("/", requireRole("FINANCE"), createPayment);
router.get("/", requireRole("FINANCE", "ADMIN"), listPayments);
router.patch("/:id/status", requireRole("FINANCE"), updatePaymentStatus);
router.post("/groups", requireRole("FINANCE"), createPaymentGroup);

export default router;
