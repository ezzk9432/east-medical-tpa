import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { writeAuditLog } from "../services/auditLog.service";
import { generateCaseNumber } from "../services/caseNumber.service";

const createCaseSchema = z.object({
  patientId: z.string().uuid().optional(),
  patient: z
    .object({
      fullName: z.string().min(1),
      dateOfBirth: z.string().datetime().optional(),
      nationality: z.string().optional(),
      passportNumber: z.string().optional(),
      policyNumber: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional(),
    })
    .optional(),
  contractId: z.string().uuid().optional(),
  isUrgent: z.boolean().optional(),
}).refine((data) => data.patientId || data.patient, {
  message: "Either patientId (existing patient) or patient (new patient details) is required",
});

export async function createCase(req: Request, res: Response) {
  const parsed = createCaseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
  }

  const { patientId, patient, contractId, isUrgent } = parsed.data;

  let resolvedPatientId = patientId;

  if (!resolvedPatientId && patient) {
    const newPatient = await prisma.patient.create({
      data: {
        fullName: patient.fullName,
        dateOfBirth: patient.dateOfBirth ? new Date(patient.dateOfBirth) : undefined,
        nationality: patient.nationality,
        passportNumber: patient.passportNumber,
        policyNumber: patient.policyNumber,
        phone: patient.phone,
        email: patient.email,
      },
    });
    resolvedPatientId = newPatient.id;
  }

  const caseNumber = await generateCaseNumber();

  const newCase = await prisma.case.create({
    data: {
      caseNumber,
      patientId: resolvedPatientId!,
      contractId,
      isUrgent: isUrgent ?? false,
      createdById: req.user!.id,
    },
    include: { patient: true, contract: true },
  });

  await writeAuditLog({
    action: "CREATE",
    entityType: "Case",
    entityId: newCase.id,
    userId: req.user!.id,
    details: { caseNumber: newCase.caseNumber },
    ipAddress: req.ip,
  });

  return res.status(201).json(newCase);
}

export async function listCases(req: Request, res: Response) {
  const { status, search, page = "1", pageSize = "20" } = req.query as Record<string, string>;

  const where: any = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { caseNumber: { contains: search, mode: "insensitive" } },
      { patient: { fullName: { contains: search, mode: "insensitive" } } },
    ];
  }

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const pageSizeNum = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100);

  const [cases, total] = await Promise.all([
    prisma.case.findMany({
      where,
      include: { patient: true, contract: true },
      orderBy: { updatedAt: "desc" },
      skip: (pageNum - 1) * pageSizeNum,
      take: pageSizeNum,
    }),
    prisma.case.count({ where }),
  ]);

  return res.json({
    data: cases,
    pagination: { page: pageNum, pageSize: pageSizeNum, total, totalPages: Math.ceil(total / pageSizeNum) },
  });
}

export async function getCase(req: Request, res: Response) {
  const id = String(req.params.id);

  const caseRecord = await prisma.case.findUnique({
    where: { id },
    include: {
      patient: true,
      contract: true,
      medicalInfo: true,
      caseServices: { include: { provider: true, items: true, invoice: true, payment: true } },
      documents: { where: { isDeleted: false } },
      notes: { orderBy: { createdAt: "desc" } },
      createdBy: { select: { id: true, fullName: true, email: true } },
      assignedTo: { select: { id: true, fullName: true, email: true } },
    },
  });

  if (!caseRecord) {
    return res.status(404).json({ error: "Case not found" });
  }

  await writeAuditLog({
    action: "VIEW",
    entityType: "Case",
    entityId: id,
    userId: req.user!.id,
    ipAddress: req.ip ?? undefined,
  });

  return res.json(caseRecord);
}

const updateCaseSchema = z.object({
  status: z.enum(["NEW", "HAS_SERVICE", "ASSIST_CLOSE", "MONEY_PROCESS", "CLOSED", "CANCELLED"]).optional(),
  isUrgent: z.boolean().optional(),
  assignedToId: z.string().uuid().nullable().optional(),
  contractId: z.string().uuid().nullable().optional(),
});

export async function updateCase(req: Request, res: Response) {
  const id = String(req.params.id);
  const parsed = updateCaseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
  }

  const existing = await prisma.case.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: "Case not found" });
  }

  const data = { ...parsed.data } as any;
  if (data.status === "CLOSED" && existing.status !== "CLOSED") {
    data.closedAt = new Date();
  }

  const updated = await prisma.case.update({
    where: { id },
    data,
    include: { patient: true, contract: true },
  });

  await writeAuditLog({
    action: "UPDATE",
    entityType: "Case",
    entityId: id,
    userId: req.user!.id,
    details: { before: existing, after: data },
    ipAddress: req.ip ?? undefined,
  });

  return res.json(updated);
}

const addNoteSchema = z.object({
  content: z.string().min(1),
});

export async function addCaseNote(req: Request, res: Response) {
  const id = String(req.params.id);
  const parsed = addNoteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  const caseExists = await prisma.case.findUnique({ where: { id } });
  if (!caseExists) {
    return res.status(404).json({ error: "Case not found" });
  }

  const note = await prisma.caseNote.create({
    data: { caseId: id, authorId: req.user!.id, content: parsed.data.content },
  });

  await writeAuditLog({
    action: "CREATE",
    entityType: "CaseNote",
    entityId: note.id,
    userId: req.user!.id,
    details: { caseId: id },
    ipAddress: req.ip ?? undefined,
  });

  return res.status(201).json(note);
}
