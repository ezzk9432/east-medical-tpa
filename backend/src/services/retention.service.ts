/**
 * Data Retention Service
 * Runs on a cron schedule. After retentionDays from case closure:
 *  1. Anonymises patient PII fields in closed/cancelled cases
 *  2. Soft-purges documents linked to those cases
 *  3. Stamps case.isPurged = true and logs the action
 *
 * This implements GDPR "right to erasure" / healthcare data retention policies.
 * Audit logs themselves are NEVER purged (regulatory requirement).
 */
import cron from "node-cron";
import { prisma } from "../config/prisma";
import { env } from "../config/env";

const ANON_PLACEHOLDER = "[PURGED]";

export async function runRetentionPurge(): Promise<{ processed: number; purged: number }> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - env.retentionDays);

  // Find closed/cancelled cases past retention period that haven't been purged
  const eligibleCases = await prisma.case.findMany({
    where: {
      isPurged: false,
      status: { in: ["CLOSED", "CANCELLED"] },
      closedAt: { lte: cutoff },
    },
    select: { id: true, patientId: true, caseNumber: true },
  });

  let purged = 0;

  for (const c of eligibleCases) {
    await prisma.$transaction(async (tx: typeof prisma) => {
      // 1. Anonymise patient PII (if no other active cases reference this patient)
      const otherActiveCases = await tx.case.count({
        where: {
          patientId: c.patientId,
          isPurged: false,
          status: { notIn: ["CLOSED", "CANCELLED"] },
        },
      });

      if (otherActiveCases === 0) {
        await tx.patient.update({
          where: { id: c.patientId },
          data: {
            passportNumber: ANON_PLACEHOLDER,
            policyNumber: ANON_PLACEHOLDER,
            phone: ANON_PLACEHOLDER,
            email: ANON_PLACEHOLDER,
            address: ANON_PLACEHOLDER,
            emergencyContact: ANON_PLACEHOLDER,
          },
        });
      }

      // 2. Soft-delete all documents for this case
      await tx.document.updateMany({
        where: { caseId: c.id, isDeleted: false },
        data: { isDeleted: true },
      });

      // 3. Mark case as purged
      await tx.case.update({
        where: { id: c.id },
        data: { isPurged: true },
      });

      // 4. Append audit log (never deleted)
      await tx.auditLog.create({
        data: {
          action: "DELETE",
          entityType: "Case",
          entityId: c.id,
          details: {
            reason: "automated_retention_purge",
            retentionDays: env.retentionDays,
            caseNumber: c.caseNumber,
          },
        },
      });
    });

    purged++;
  }

  return { processed: eligibleCases.length, purged };
}

/**
 * Start the retention cron job.
 * Default: runs daily at 02:00 UTC.
 */
export function startRetentionScheduler() {
  const schedule = process.env.RETENTION_CRON ?? "0 2 * * *";
  console.log(`Data retention scheduler started (${schedule})`);

  cron.schedule(schedule, async () => {
    console.log("[Retention] Starting purge run…");
    try {
      const result = await runRetentionPurge();
      console.log(`[Retention] Done. Processed: ${result.processed}, Purged: ${result.purged}`);
    } catch (err) {
      console.error("[Retention] Purge failed:", err);
    }
  });
}
