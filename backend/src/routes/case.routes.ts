import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";
import {
  createCase,
  listCases,
  getCase,
  updateCase,
  addCaseNote,
  cloneCase,
  addCaseDiagnosis,
  removeCaseDiagnosis,
  getCaseReport,
} from "../controllers/case.controller";

const router = Router();

router.use(requireAuth);

// Case Manager + Admin can create/edit cases. Medical Staff, Finance, Viewer can view.
router.post("/", requireRole("CASE_MANAGER"), createCase);
router.get("/", listCases); // all authenticated roles can list (filtered by RLS-equivalent logic later)
router.get("/:id", getCase);
router.get("/:id/report", getCaseReport);
router.patch("/:id", requireRole("CASE_MANAGER"), updateCase);
router.post("/:id/clone", requireRole("CASE_MANAGER"), cloneCase);
router.post("/:id/notes", requireRole("CASE_MANAGER", "MEDICAL_STAFF"), addCaseNote);
router.post("/:id/diagnoses", requireRole("CASE_MANAGER", "MEDICAL_STAFF"), addCaseDiagnosis);
router.delete("/:id/diagnoses/:diagnosisId", requireRole("CASE_MANAGER", "MEDICAL_STAFF"), removeCaseDiagnosis);

export default router;
