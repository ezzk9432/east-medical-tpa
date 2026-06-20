import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";
import { getDashboardSummary, getCaseAgingReport, getFinancialSummaryReport } from "../controllers/report.controller";

const router = Router();

router.use(requireAuth);

router.get("/dashboard", getDashboardSummary);
router.get("/case-aging", getCaseAgingReport);
router.get("/financial-summary", requireRole("FINANCE", "ADMIN"), getFinancialSummaryReport);

export default router;
