import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { writeAuditLog } from "../services/auditLog.service";
import { getStorageKey } from "../services/fileStorage.service";

const DOCUMENT_CATEGORIES = ["MEDICAL_REPORT", "LAB_REPORT", "POLICY", "PASSPORT", "INVOICE", "OTHER"] as const;

const uploadMetaSchema = z.object({
  caseId: z.string().uuid(),
  caseServiceId: z.string().uuid().optional(),
  category: z.enum(DOCUMENT_CATEGORIES),
});

export async function uploadDocument(req: Request, res: Response) {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const parsed = uploadMetaSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
  }

  const { caseId, caseServiceId, category } = parsed.data;

  const caseExists = await prisma.case.findUnique({ where: { id: caseId } });
  if (!caseExists) {
    return res.status(404).json({ error: "Case not found" });
  }

  // Versioning: if a non-deleted document with the same case+category+filename exists, bump version
  const existingVersion = await prisma.document.findFirst({
    where: { caseId, category, fileName: req.file.originalname, isDeleted: false },
    orderBy: { version: "desc" },
  });

  const document = await prisma.document.create({
    data: {
      caseId,
      caseServiceId,
      category,
      fileName: req.file.originalname,
      fileUrl: getStorageKey(req.file.filename),
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      version: existingVersion ? existingVersion.version + 1 : 1,
      uploadedById: req.user!.id,
    },
  });

  await writeAuditLog({
    action: "CREATE",
    entityType: "Document",
    entityId: document.id,
    userId: req.user!.id,
    details: { caseId, category, fileName: req.file.originalname },
    ipAddress: req.ip ?? undefined,
  });

  return res.status(201).json(document);
}

export async function listDocuments(req: Request, res: Response) {
  const caseId = String(req.query.caseId ?? "");
  if (!caseId) {
    return res.status(400).json({ error: "caseId query parameter is required" });
  }

  const documents = await prisma.document.findMany({
    where: { caseId, isDeleted: false },
    include: { uploadedBy: { select: { id: true, fullName: true } } },
    orderBy: { createdAt: "desc" },
  });

  return res.json(documents);
}

export async function softDeleteDocument(req: Request, res: Response) {
  const id = String(req.params.id);

  const existing = await prisma.document.findUnique({ where: { id } });
  if (!existing || existing.isDeleted) {
    return res.status(404).json({ error: "Document not found" });
  }

  // Soft delete only — never hard-delete, per audit trail requirements
  const updated = await prisma.document.update({ where: { id }, data: { isDeleted: true } });

  await writeAuditLog({
    action: "DELETE",
    entityType: "Document",
    entityId: id,
    userId: req.user!.id,
    details: { fileName: existing.fileName, softDelete: true },
    ipAddress: req.ip ?? undefined,
  });

  return res.json(updated);
}
