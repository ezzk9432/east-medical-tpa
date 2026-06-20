import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";
import { upload } from "../services/fileStorage.service";
import { uploadDocument, listDocuments, softDeleteDocument } from "../controllers/document.controller";

const router = Router();

router.use(requireAuth);

router.post("/", requireRole("CASE_MANAGER", "MEDICAL_STAFF", "FINANCE"), upload.single("file"), uploadDocument);
router.get("/", listDocuments);
router.delete("/:id", requireRole("CASE_MANAGER", "ADMIN"), softDeleteDocument);

export default router;
