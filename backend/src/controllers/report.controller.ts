import { Request, Response } from "express";
import { prisma } from "../config/prisma";

export async function getDashboardSummary(req: Request, res: Response) {
  const [
    totalCases,
    openCases,
    closedCases,
    urgentCases,
    totalProviders,
    activeContracts,
    pendingPayments,
    paidPaymentsAgg,
  ] = await Promise.all([
    prisma.case.count(),
    prisma.case.count({ where: { status: { notIn: ["CLOSED", "CANCELLED"] } } }),
    prisma.case.count({ where: { status: "CLOSED" } }),
    prisma.case.count({ where: { isUrgent: true, status: { notIn: ["CLOSED", "CANCELLED"] } } }),
    prisma.provider.count({ where: { isActive: true } }),
    prisma.contract.count({ where: { isActive: true } }),
    prisma.payment.count({ where: { status: "PENDING" } }),
    prisma.payment.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }),
  ]);

  const casesByStatus = await prisma.case.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  return res.json({
    totalCases,
    openCases,
    closedCases,
    urgentCases,
    totalProviders,
    activeContracts,
    pendingPayments,
    totalPaidAmount: paidPaymentsAgg._sum.amount ?? 0,
    casesByStatus: casesByStatus.map((c: { status: string; _count: { _all: number } }) => ({
      status: c.status,
      count: c._count._all,
    })),
  });
}

export async function getCaseAgingReport(req: Request, res: Response) {
  const openCases = await prisma.case.findMany({
    where: { status: { notIn: ["CLOSED", "CANCELLED"] } },
    select: { id: true, caseNumber: true, status: true, createdAt: true, patient: { select: { fullName: true } } },
  });

  const now = Date.now();
  const aged = openCases
    .map((c: { id: string; caseNumber: string; status: string; createdAt: Date; patient: { fullName: string } }) => ({
      ...c,
      ageDays: Math.floor((now - c.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
    }))
    .sort((a: { ageDays: number }, b: { ageDays: number }) => b.ageDays - a.ageDays);

  return res.json(aged);
}

export async function getFinancialSummaryReport(req: Request, res: Response) {
  const { startDate, endDate } = req.query as Record<string, string>;

  const where: any = {};
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const services = await prisma.caseService.findMany({
    where,
    select: { priceIn: true, priceOut: true, exchangeRate: true, currency: true, status: true },
  });

  const totals = services.reduce(
    (
      acc: { totalPriceIn: number; totalPriceOut: number; totalMargin: number },
      s: { priceIn: unknown; priceOut: unknown; exchangeRate: unknown }
    ) => {
      const priceIn = Number(s.priceIn) * Number(s.exchangeRate);
      const priceOut = Number(s.priceOut) * Number(s.exchangeRate);
      acc.totalPriceIn += priceIn;
      acc.totalPriceOut += priceOut;
      acc.totalMargin += priceOut - priceIn;
      return acc;
    },
    { totalPriceIn: 0, totalPriceOut: 0, totalMargin: 0 }
  );

  return res.json({
    serviceCount: services.length,
    totalPriceIn: Math.round(totals.totalPriceIn * 100) / 100,
    totalPriceOut: Math.round(totals.totalPriceOut * 100) / 100,
    totalMargin: Math.round(totals.totalMargin * 100) / 100,
  });
}
