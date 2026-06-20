import { Request, Response, NextFunction } from "express";
import { UserRole } from "@prisma/client";

/**
 * Restricts a route to a specific set of roles. Must run after requireAuth.
 * ADMIN is always allowed through, regardless of the list passed in,
 * since admins have full access per the SRS permissions matrix.
 *
 * Usage: router.post("/cases", requireAuth, requireRole("CASE_MANAGER", "ADMIN"), handler)
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (req.user.role === "ADMIN" || allowedRoles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({
      error: "Forbidden: your role does not have permission to perform this action",
    });
  };
}
