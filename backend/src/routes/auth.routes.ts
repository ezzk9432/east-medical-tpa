import { Router } from "express";
import { login, refresh, logout, createUser, listUsers } from "../controllers/auth.controller";
import { getMFASetup, verifyMFASetup, verifyMFALogin, disableMFA } from "../controllers/mfa.controller";
import { requireAuth } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";

const router = Router();

// Public
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/mfa/verify", verifyMFALogin); // MFA step after login

// Authenticated
router.post("/logout", requireAuth, logout);
router.get("/mfa/setup", requireAuth, getMFASetup);
router.post("/mfa/verify-setup", requireAuth, verifyMFASetup);
router.delete("/mfa", requireAuth, disableMFA);
router.delete("/mfa/:userId", requireAuth, requireRole("ADMIN"), disableMFA);

// Admin only
router.post("/users", requireAuth, requireRole("ADMIN"), createUser);
router.get("/users", requireAuth, requireRole("ADMIN"), listUsers);

export default router;
