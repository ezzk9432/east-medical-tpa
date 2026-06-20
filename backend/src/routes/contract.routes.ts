import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";
import { createContract, listContracts, getContract, updateContract } from "../controllers/contract.controller";

const router = Router();

router.use(requireAuth);

router.post("/", requireRole("FINANCE"), createContract);
router.get("/", listContracts);
router.get("/:id", getContract);
router.patch("/:id", requireRole("FINANCE"), updateContract);

export default router;
