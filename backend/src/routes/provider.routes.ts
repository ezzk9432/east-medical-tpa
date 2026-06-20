import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";
import { createProvider, listProviders, getProvider, updateProvider } from "../controllers/provider.controller";

const router = Router();

router.use(requireAuth);

router.post("/", requireRole("CASE_MANAGER", "FINANCE"), createProvider);
router.get("/", listProviders);
router.get("/:id", getProvider);
router.patch("/:id", requireRole("CASE_MANAGER", "FINANCE"), updateProvider);

export default router;
