import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCase,
  updateCase,
  addCaseNote,
  addCaseDiagnosis,
  removeCaseDiagnosis,
  cloneCase,
  getCaseReport,
  type UpdateCaseInput,
} from "../api/cases";
import { createCaseService, generateInvoice } from "../api/caseServices";
import { listDocuments, uploadDocument } from "../api/caseServices";
import type { DocumentCategory } from "../types";

export function useCase(id: string) {
  return useQuery({ queryKey: ["case", id], queryFn: () => getCase(id), enabled: !!id });
}

export function useUpdateCase(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updates: UpdateCaseInput) => updateCase(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case", id] });
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}

export function useAddNote(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => addCaseNote(id, content),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["case", id] }),
  });
}

export function useAddDiagnosis(caseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { label: string; icdCode?: string; notes?: string }) => addCaseDiagnosis(caseId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["case", caseId] }),
  });
}

export function useRemoveDiagnosis(caseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (diagnosisId: string) => removeCaseDiagnosis(caseId, diagnosisId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["case", caseId] }),
  });
}

export function useCloneCase(id: string) {
  return useMutation({
    mutationFn: (cloneServices: boolean) => cloneCase(id, cloneServices),
  });
}

export function useCaseReport(id: string, enabled: boolean) {
  return useQuery({ queryKey: ["case-report", id], queryFn: () => getCaseReport(id), enabled });
}

export function useCreateCaseService(caseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCaseService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case", caseId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}

export function useDocuments(caseId: string) {
  return useQuery({ queryKey: ["documents", caseId], queryFn: () => listDocuments(caseId), enabled: !!caseId });
}

export function useUploadDocument(caseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      category,
      file,
      caseServiceId,
    }: {
      category: DocumentCategory;
      file: File;
      caseServiceId?: string;
    }) => uploadDocument(caseId, category, file, caseServiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", caseId] });
      queryClient.invalidateQueries({ queryKey: ["case", caseId] });
    },
  });
}

export function useGenerateInvoice(caseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (caseServiceId: string) => generateInvoice(caseServiceId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["case", caseId] }),
  });
}
