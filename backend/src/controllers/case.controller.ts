import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { writeAuditLog } from "../services/auditLog.service";
import { generateCaseNumber } from "../services/caseNumber.service";
import { encryptPatientPII, decryptPatientPII } from "../services/encryption.service";

/**
 * Decrypts PII on a case's nested patient (mutates and returns the case).
 * Applied at every response point so callers never see raw ciphertext.
 */
function withDecryptedPatient<T extends { patient?: any }>(caseRecord: T): T {
  if (caseRecord.patient) decryptPatientPII(caseRecord.patient);
  return caseRecord;
}

const createCaseSchema = z.object({
  patientId: z.string().uuid().optional(),
  patient: z
    .object({
      fullName: z.string().min(1),
      dateOfBirth: z.string().datetime().optional(),
      gender: z.string().optional(),
      nationality: z.string().optional(),
      passportNumber: z.string().optional(),
      policyNumber: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional(),
      country: z.string().optional(),
      province: z.string().optional(),
      county: z.string().optional(),
      district: z.string().optional(),
    })
    .optional(),
  contractId: z.string().uuid().optional(),
  isUrgent: z.boolean().optional(),

  // Case classification
  caseType: z.enum(["MEDICAL", "DENTAL", "TRAVEL", "LEGAL", "OTHER"]).optional(),
  caseTypeDetail: z
    .enum([
      "SIMPLE_MEDICAL_OUTPATIENT",
      "LIGHT_ASSISTANCE_CASE",
      "HOSPITALIZATION",
      "EMERGENCY",
      "REPATRIATION",
      "EVACUATION",
      "OTHER",
    ])
    .optional(),
  arrivalChannel: z.enum(["PHONE", "EMAIL", "PORTAL", "APP", "WALK_IN", "OTHER"]).optional(),

  // Caller / intake info
  callerName: z.string().optional(),
  callerPhone: z.string().optional(),
  callerEmail: z.string().email().optional(),
  countryCode: z.string().optional(),
  tourAgency: z.string().optional(),
  customerReference: z.string().optional(),
  description: z.string().optional(),
  noteForProforma: z.string().optional(),

  // Warranty
  warrantyStatus: z.string().optional(),
  warrantyCurrency: z.enum(["EUR", "EGP", "USD", "GBP"]).optional(),
  warrantyLimitAmount: z.number().positive().optional(),
}).refine((data) => data.patientId || data.patient, {
  message: "Either patientId (existing patient) or patient (new patient details) is required",
});

export async function createCase(req: Request, res: Response) {
  const parsed = createCaseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
  }

  const { patientId, patient, contractId, isUrgent, ...caseFields } = parsed.data;

  let resolvedPatientId = patientId;

  if (!resolvedPatientId && patient) {
    // Encrypt PII fields before writing to DB
    const encryptedPII = encryptPatientPII({
      passportNumber: patient.passportNumber,
      policyNumber: patient.policyNumber,
      phone: patient.phone,
      email: patient.email,
    });

    const newPatient = await prisma.patient.create({
      data: {
        fullName: patient.fullName,
        dateOfBirth: patient.dateOfBirth ? new Date(patient.dateOfBirth) : undefined,
        gender: patient.gender,
        nationality: patient.nationality,
        passportNumber: encryptedPII.passportNumber,
        policyNumber: encryptedPII.policyNumber,
        phone: encryptedPII.phone,
        email: encryptedPII.email,
        country: patient.country,
        province: patient.province,
        county: patient.county,
        district: patient.district,
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
      ...caseFields,
    },
    include: { patient: true, contract: true },
  });

  // Auto-generated system activity entry, matching the standard system's
  // "Case created by X for Account Y" style timeline post.
  await prisma.caseActivity.create({
    data: {
      caseId: newCase.id,
      message: `Case created by ${req.user!.email}${newCase.contract ? ` for contract ${newCase.contract.insurerName}` : ""}`,
    },
  });

  await writeAuditLog({
    action: "CREATE",
    entityType: "Case",
    entityId: newCase.id,
    userId: req.user!.id,
    details: { caseNumber: newCase.caseNumber },
    ipAddress: req.ip ?? undefined,
  });

  return res.status(201).json(withDecryptedPatient(newCase));
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
    data: cases.map(withDecryptedPatient),
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
      diagnoses: { orderBy: { createdAt: "desc" } },
      caseServices: { include: { provider: true, items: true, invoice: true, payment: true, documents: true } },
      documents: { where: { isDeleted: false } },
      notes: { orderBy: { createdAt: "desc" } },
      activities: { orderBy: { createdAt: "desc" } },
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

  return res.json(withDecryptedPatient(caseRecord));
}

const updateCaseSchema = z.object({
  status: z.enum(["NEW", "HAS_SERVICE", "ASSIST_CLOSE", "MONEY_PROCESS", "CLOSED", "CANCELLED"]).optional(),
  isUrgent: z.boolean().optional(),
  assignedToId: z.string().uuid().nullable().optional(),
  contractId: z.string().uuid().nullable().optional(),
  caseType: z.enum(["MEDICAL", "DENTAL", "TRAVEL", "LEGAL", "OTHER"]).optional(),
  caseTypeDetail: z
    .enum([
      "SIMPLE_MEDICAL_OUTPATIENT",
      "LIGHT_ASSISTANCE_CASE",
      "HOSPITALIZATION",
      "EMERGENCY",
      "REPATRIATION",
      "EVACUATION",
      "OTHER",
    ])
    .optional(),
  arrivalChannel: z.enum(["PHONE", "EMAIL", "PORTAL", "APP", "WALK_IN", "OTHER"]).optional(),
  callerName: z.string().optional(),
  callerPhone: z.string().optional(),
  callerEmail: z.string().email().optional(),
  tourAgency: z.string().optional(),
  customerReference: z.string().optional(),
  description: z.string().optional(),
  noteForProforma: z.string().optional(),
  warrantyStatus: z.string().optional(),
  warrantyCurrency: z.enum(["EUR", "EGP", "USD", "GBP"]).optional(),
  warrantyLimitAmount: z.number().positive().optional(),
  hasMedicalReport: z.boolean().optional(),
  hasMedicalExpenses: z.boolean().optional(),
  hasPolicyDoc: z.boolean().optional(),
  hasPassportDoc: z.boolean().optional(),
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
  if (data.status && data.status !== existing.status) {
    if (data.status === "CLOSED") {
      data.closedAt = new Date();
    }
    await prisma.caseActivity.create({
      data: {
        caseId: id,
        message: `Status changed from ${existing.status} to ${data.status} by ${req.user!.email}`,
      },
    });
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

  return res.json(withDecryptedPatient(updated));
}

const cloneCaseSchema = z.object({
  cloneServices: z.boolean().optional(),
});

/**
 * Clones a case — replicates patient link, contract, classification, and
 * optionally case services — matching the standard system's "Clone Case" button.
 */
export async function cloneCase(req: Request, res: Response) {
  const id = String(req.params.id);
  const parsed = cloneCaseSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  const original = await prisma.case.findUnique({
    where: { id },
    include: { caseServices: true },
  });

  if (!original) {
    return res.status(404).json({ error: "Case not found" });
  }

  const caseNumber = await generateCaseNumber();

  const cloned = await prisma.case.create({
    data: {
      caseNumber,
      patientId: original.patientId,
      contractId: original.contractId,
      caseType: original.caseType,
      caseTypeDetail: original.caseTypeDetail,
      arrivalChannel: original.arrivalChannel,
      callerName: original.callerName,
      callerPhone: original.callerPhone,
      callerEmail: original.callerEmail,
      tourAgency: original.tourAgency,
      createdById: req.user!.id,
      clonedFromId: original.id,
    },
    include: { patient: true, contract: true },
  });

  if (parsed.data.cloneServices) {
    for (const svc of original.caseServices) {
      await prisma.caseService.create({
        data: {
          caseId: cloned.id,
          providerId: svc.providerId,
          serviceType: svc.serviceType,
          description: svc.description,
          priceIn: svc.priceIn,
          priceOut: svc.priceOut,
          currency: svc.currency,
          exchangeRate: svc.exchangeRate,
          discountPct: svc.discountPct,
        },
      });
    }
  }

  await prisma.caseActivity.create({
    data: {
      caseId: cloned.id,
      message: `Case cloned from ${original.caseNumber} by ${req.user!.email}`,
    },
  });

  await writeAuditLog({
    action: "CREATE",
    entityType: "Case",
    entityId: cloned.id,
    userId: req.user!.id,
    details: { clonedFrom: original.caseNumber },
    ipAddress: req.ip ?? undefined,
  });

  return res.status(201).json(withDecryptedPatient(cloned));
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

const addDiagnosisSchema = z.object({
  label: z.string().min(1),
  icdCode: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * Adds a structured diagnosis entry — matches the standard system's
 * multi-select "Diagnose" panel (replaces the old single free-text field).
 */
export async function addCaseDiagnosis(req: Request, res: Response) {
  const id = String(req.params.id);
  const parsed = addDiagnosisSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
  }

  const caseExists = await prisma.case.findUnique({ where: { id } });
  if (!caseExists) {
    return res.status(404).json({ error: "Case not found" });
  }

  const diagnosis = await prisma.caseDiagnosis.create({
    data: { caseId: id, ...parsed.data },
  });

  await writeAuditLog({
    action: "CREATE",
    entityType: "CaseDiagnosis",
    entityId: diagnosis.id,
    userId: req.user!.id,
    details: { caseId: id, label: parsed.data.label },
    ipAddress: req.ip ?? undefined,
  });

  return res.status(201).json(diagnosis);
}

export async function removeCaseDiagnosis(req: Request, res: Response) {
  const diagnosisId = String(req.params.diagnosisId);

  const existing = await prisma.caseDiagnosis.findUnique({ where: { id: diagnosisId } });
  if (!existing) {
    return res.status(404).json({ error: "Diagnosis not found" });
  }

  await prisma.caseDiagnosis.delete({ where: { id: diagnosisId } });

  await writeAuditLog({
    action: "DELETE",
    entityType: "CaseDiagnosis",
    entityId: diagnosisId,
    userId: req.user!.id,
    ipAddress: req.ip ?? undefined,
  });

  return res.status(204).send();
}

/**
 * Per-case summary export — matches the standard system's "Run Report" button.
 * Returns a structured JSON summary; PDF rendering can be layered on later
 * using the same data shape.
 */
export async function getCaseReport(req: Request, res: Response) {
  const id = String(req.params.id);

  const caseRecord = await prisma.case.findUnique({
    where: { id },
    include: {
      patient: true,
      contract: true,
      diagnoses: true,
      caseServices: { include: { provider: true, invoice: true, payment: true } },
      documents: { where: { isDeleted: false } },
    },
  });

  if (!caseRecord) {
    return res.status(404).json({ error: "Case not found" });
  }

  const totalPriceIn = caseRecord.caseServices.reduce(
    (sum: number, s: { priceIn: unknown }) => sum + Number(s.priceIn),
    0
  );
  const totalPriceOut = caseRecord.caseServices.reduce(
    (sum: number, s: { priceOut: unknown }) => sum + Number(s.priceOut),
    0
  );

  await writeAuditLog({
    action: "VIEW",
    entityType: "CaseReport",
    entityId: id,
    userId: req.user!.id,
    ipAddress: req.ip ?? undefined,
  });

  return res.json({
    caseNumber: caseRecord.caseNumber,
    status: caseRecord.status,
    patient: decryptPatientPII({ ...caseRecord.patient }),
    contract: caseRecord.contract,
    diagnoses: caseRecord.diagnoses,
    services: caseRecord.caseServices,
    documentCount: caseRecord.documents.length,
    totals: {
      totalPriceIn: Math.round(totalPriceIn * 100) / 100,
      totalPriceOut: Math.round(totalPriceOut * 100) / 100,
      serviceCount: caseRecord.caseServices.length,
    },
    generatedAt: new Date().toISOString(),
  });
}
