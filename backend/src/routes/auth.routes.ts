import { Router } from "express";
import { login, refresh, logout, createUser } from "../controllers/auth.controller";
import { requireAuth } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";

const router = Router();

router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", requireAuth, logout);

// Only admins can create new users (replaces the Lovable "Acting as" demo switcher)
router.post("/users", requireAuth, requireRole("ADMIN"), createUser);

export default router;
