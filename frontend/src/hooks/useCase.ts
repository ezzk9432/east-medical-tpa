import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCase, updateCase, addCaseNote } from "../api/cases";
import { createCaseService } from "../api/caseServices";
import { listDocuments, uploadDocument } from "../api/caseServices";
import type { CaseStatus, DocumentCategory } from "../types";

export function useCase(id: string) {
  return useQuery({ queryKey: ["case", id], queryFn: () => getCase(id), enabled: !!id });
}

export function useUpdateCaseStatus(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: CaseStatus) => updateCase(id, { status }),
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
    mutationFn: ({ category, file }: { category: DocumentCategory; file: File }) =>
      uploadDocument(caseId, category, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["documents", caseId] }),
  });
}
