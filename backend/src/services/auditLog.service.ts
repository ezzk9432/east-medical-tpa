import { prisma } from "../config/prisma";
import { AuditAction } from "@prisma/client";

interface AuditLogInput {
  action: AuditAction;
  entityType: string;
  entityId?: string;
  userId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

/**
 * Writes an append-only audit log entry. Never throws — a failed audit write
 * should never block the actual business operation, but it should be logged
 * to stderr so it's not silently lost.
 */
export async function writeAuditLog(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        userId: input.userId,
        details: input.details as any,
        ipAddress: input.ipAddress,
      },
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}
