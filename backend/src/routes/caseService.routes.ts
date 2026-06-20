import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";
import { createCaseService, listCaseServices, generateInvoice } from "../controllers/caseService.controller";

const router = Router();

router.use(requireAuth);

router.post("/", requireRole("CASE_MANAGER", "FINANCE"), createCaseService);
router.get("/", listCaseServices);
router.post("/:id/invoice", requireRole("FINANCE"), generateInvoice);

export default router;
