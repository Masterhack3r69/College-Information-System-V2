import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"

export type EvaluationStatus = "DRAFT" | "PENDING_ACADEMIC_REVIEW" | "PENDING_REGISTRAR_APPROVAL" | "APPROVED" | "REJECTED" | "RETURNED"
export type EvaluationType = "TRANSFER" | "SHIFT" | "SECOND_DEGREE" | "CURRICULUM_MIGRATION" | "OTHER"
export type EvaluationListItem = { id: string; studentId: string; studentNumber: string; studentName: string; evaluationType: EvaluationType; status: EvaluationStatus; sourceInstitution?: string; targetCurriculumId: string; targetCurriculumCode: string; programCode: string; createdAt: string }
export type EvaluationSource = { id: string; sourceType: string; sourceReferenceId?: string; courseCode: string; courseTitle: string; creditUnits: number; sourceGrade?: string; sourceRemarks?: string; termLabel?: string; schoolYearLabel?: string }
export type EvaluationMatch = { id: string; targetCourseId: string; targetCourseCode: string; targetCourseTitle: string; status: string; recommendedUnits?: number; rationale: string; evaluatedAt?: string; sourceCourseIds: string[] }
export type EvaluationCase = EvaluationListItem & { fromCurriculumId?: string; reason?: string; decisionReason?: string; submittedAt?: string; academicReviewedAt?: string; registrarDecidedAt?: string; sourceCourses: EvaluationSource[]; matches: EvaluationMatch[]; documents: { id: string; documentType: string; fileName: string; verificationStatus: string }[]; history: { id: string; fromStatus?: string; toStatus: string; remarks?: string; changedBy: string; changedAt: string }[]; migrationImpact?: { mappedCourses: Record<string, unknown>[]; unmappedSourceCourses: EvaluationSource[]; newDeficiencies: Record<string, unknown>[]; electiveGroups: Record<string, unknown>[] } }
export type EvaluationCaseInput = { studentId: string; evaluationType: EvaluationType; sourceInstitution?: string; fromCurriculumId?: string; targetCurriculumId: string; reason?: string }

export function useAcademicEvaluations(status?: string, studentId?: string) {
  return useQuery({
    queryKey: ["academic-evaluations", status, studentId],
    queryFn: () => {
      const params = new URLSearchParams()
      if (status) params.set("status", status)
      if (studentId) params.set("studentId", studentId)
      return api<EvaluationListItem[]>(`/academic-evaluations${params.size ? `?${params}` : ""}`)
    },
  })
}
export function useAcademicEvaluation(id?: string) {
  return useQuery({ queryKey: ["academic-evaluation", id], queryFn: () => api<EvaluationCase>(`/academic-evaluations/${id}`), enabled: !!id })
}

function useEvaluationMutation<T>(mutationFn: (input: T) => Promise<unknown>) {
  const client = useQueryClient()
  return useMutation({ mutationFn, onSuccess: async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["academic-evaluations"] }),
      client.invalidateQueries({ queryKey: ["academic-evaluation"] }),
      client.invalidateQueries({ queryKey: ["student-academic-plan"] }),
      client.invalidateQueries({ queryKey: ["student-course-credits"] }),
    ])
  } })
}

export const useCreateEvaluation = () => useEvaluationMutation((input: EvaluationCaseInput) => api<EvaluationCase>("/academic-evaluations", { method: "POST", body: JSON.stringify(input) }))
export const useAddEvaluationSource = () => useEvaluationMutation(({ id, source }: { id: string; source: Omit<EvaluationSource, "id"> }) => api<EvaluationCase>(`/academic-evaluations/${id}/source-courses`, { method: "POST", body: JSON.stringify(source) }))
export const useUpdateEvaluationSource = () => useEvaluationMutation(({ id, sourceId, source }: { id: string; sourceId: string; source: Omit<EvaluationSource, "id"> }) => api<EvaluationCase>(`/academic-evaluations/${id}/source-courses/${sourceId}`, { method: "PUT", body: JSON.stringify(source) }))
export const useRemoveEvaluationSource = () => useEvaluationMutation(({ id, sourceId }: { id: string; sourceId: string }) => api<EvaluationCase>(`/academic-evaluations/${id}/source-courses/${sourceId}`, { method: "DELETE" }))
export const useLinkEvaluationDocument = () => useEvaluationMutation(({ id, documentId }: { id: string; documentId: string }) => api<EvaluationCase>(`/academic-evaluations/${id}/documents`, { method: "POST", body: JSON.stringify({ documentId }) }))
export const useSubmitEvaluation = () => useEvaluationMutation((id: string) => api<EvaluationCase>(`/academic-evaluations/${id}/submit`, { method: "POST" }))
export const useSaveEvaluationMatch = () => useEvaluationMutation(({ id, match }: { id: string; match: { targetCourseId: string; sourceCourseIds: string[]; status: "RECOMMENDED" | "REJECTED"; recommendedUnits?: number; rationale: string } }) => api<EvaluationCase>(`/academic-evaluations/${id}/matches`, { method: "POST", body: JSON.stringify(match) }))
export const useEvaluationTransition = () => useEvaluationMutation(({ id, action, reason }: { id: string; action: "forward" | "approve" | "return" | "reject"; reason: string }) => api<EvaluationCase>(`/academic-evaluations/${id}/${action}`, { method: "POST", body: JSON.stringify({ reason }) }))
