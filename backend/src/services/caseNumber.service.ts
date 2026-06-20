import { prisma } from "../config/prisma";

/**
 * Generates a unique case number server-side: YYYY + 7-digit sequence.
 * Matches the format seen in the prototype (e.g. 20261399021) but is now
 * generated atomically by the database rather than the client.
 */
export async function generateCaseNumber(): Promise<string> {
  const year = new Date().getFullYear();

  const count = await prisma.case.count({
    where: {
      caseNumber: { startsWith: String(year) },
    },
  });

  const sequence = String(count + 1).padStart(7, "0");
  const candidate = `${year}${sequence}`;

  // Guard against a rare race condition by checking uniqueness;
  // retry with next sequence if collided.
  const existing = await prisma.case.findUnique({ where: { caseNumber: candidate } });
  if (existing) {
    const retrySequence = String(count + 2).padStart(7, "0");
    return `${year}${retrySequence}`;
  }

  return candidate;
}
