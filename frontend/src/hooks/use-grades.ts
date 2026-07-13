import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type {
  Gradebook,
  GradeClassSummary,
  GradeRemark,
  GradeStatus,
  GradingScale,
  GradingTemplate,
  PageResponse,
  ScoreStatus,
} from "@/lib/types"
const qs = (values: Record<string, string | number | undefined>) => {
  const p = new URLSearchParams()
  Object.entries(values).forEach(([k, v]) => {
    if (v !== undefined && v !== "") p.set(k, String(v))
  })
  return p.size ? `?${p}` : ""
}
export function useGradeClasses(filters: {
  scope: string
  schoolYearId?: string
  semesterId?: string
  status?: GradeStatus
  search?: string
  page: number
  size: number
}) {
  return useQuery({
    queryKey: ["grade-classes", filters],
    queryFn: () =>
      api<PageResponse<GradeClassSummary>>(`/gradebooks/classes${qs(filters)}`),
  })
}
export function useGradebook(scheduleId?: string) {
  return useQuery({
    queryKey: ["gradebook", scheduleId],
    queryFn: () => api<Gradebook>(`/gradebooks/class/${scheduleId}`),
    enabled: Boolean(scheduleId),
    retry: false,
  })
}
export function useGradingScales() {
  return useQuery({
    queryKey: ["grading-scales"],
    queryFn: () => api<GradingScale[]>("/grading-setup/scales"),
  })
}
export function useGradingTemplates(programId?: string, courseId?: string) {
  return useQuery({
    queryKey: ["grading-templates", programId, courseId],
    queryFn: () =>
      api<GradingTemplate[]>(
        `/grading-setup/templates${qs({ programId, courseId })}`
      ),
  })
}
function gradeMutation<T>(fn: (v: T) => Promise<Gradebook>) {
  return () => {
    const c = useQueryClient()
    return useMutation({
      mutationFn: fn,
      onSuccess: (d) => {
        c.setQueryData(["gradebook", d.scheduleId], d)
        void c.invalidateQueries({ queryKey: ["grade-classes"] })
        void c.invalidateQueries({ queryKey: ["student-academic-records"] })
      },
    })
  }
}
export const useInitializeGradebook = gradeMutation<{
  scheduleId: string
  templateId: string
}>((v) =>
  api(`/gradebooks/class/${v.scheduleId}/initialize`, {
    method: "POST",
    body: JSON.stringify({ templateId: v.templateId }),
  })
)
export const useSaveGradebookItem = gradeMutation<{
  scheduleId: string
  id?: string
  categoryId: string
  title: string
  maximumScore: number
  dueDate?: string
  sortOrder: number
}>((v) =>
  api(`/gradebooks/class/${v.scheduleId}/items${v.id ? `/${v.id}` : ""}`, {
    method: v.id ? "PUT" : "POST",
    body: JSON.stringify(v),
  })
)
export const useArchiveGradebookItem = gradeMutation<{
  scheduleId: string
  id: string
}>((v) =>
  api(`/gradebooks/class/${v.scheduleId}/items/${v.id}`, { method: "DELETE" })
)
export const useSaveGradebookScores = gradeMutation<{
  scheduleId: string
  scores: {
    itemId: string
    enrollmentSubjectId: string
    score?: number
    status: ScoreStatus
  }[]
}>((v) =>
  api(`/gradebooks/class/${v.scheduleId}/scores`, {
    method: "PUT",
    body: JSON.stringify({ scores: v.scores }),
  })
)
export const useSaveGradeOverride = gradeMutation<{
  scheduleId: string
  enrollmentSubjectId: string
  remark: GradeRemark
  reason: string
}>((v) =>
  api(`/gradebooks/class/${v.scheduleId}/overrides`, {
    method: "PUT",
    body: JSON.stringify(v),
  })
)
export const useRemoveGradeOverride = gradeMutation<{
  scheduleId: string
  enrollmentSubjectId: string
}>((v) =>
  api(`/gradebooks/class/${v.scheduleId}/overrides/${v.enrollmentSubjectId}`, {
    method: "DELETE",
  })
)
export const useSubmitGradebook = gradeMutation<string>((id) =>
  api(`/gradebooks/class/${id}/submit`, { method: "POST" })
)
export const useApproveGradebook = gradeMutation<string>((id) =>
  api(`/gradebooks/class/${id}/approve`, { method: "POST" })
)
export const useLockGradebook = gradeMutation<string>((id) =>
  api(`/gradebooks/class/${id}/lock`, { method: "POST" })
)
export const useReturnGradebook = gradeMutation<{
  scheduleId: string
  reason: string
}>((v) =>
  api(`/gradebooks/class/${v.scheduleId}/return`, {
    method: "POST",
    body: JSON.stringify({ reason: v.reason }),
  })
)
export function useSaveGradingScale() {
  const c = useQueryClient()
  return useMutation({
    mutationFn: (v: Omit<GradingScale, "id"> & { id?: string }) =>
      api<GradingScale>(`/grading-setup/scales${v.id ? `/${v.id}` : ""}`, {
        method: v.id ? "PUT" : "POST",
        body: JSON.stringify(v),
      }),
    onSuccess: () => void c.invalidateQueries({ queryKey: ["grading-scales"] }),
  })
}
export function useSaveGradingTemplate() {
  const c = useQueryClient()
  return useMutation({
    mutationFn: (
      v: Omit<
        GradingTemplate,
        "id" | "programCode" | "courseCode" | "scaleName"
      > & { id?: string }
    ) =>
      api<GradingTemplate>(
        `/grading-setup/templates${v.id ? `/${v.id}` : ""}`,
        { method: v.id ? "PUT" : "POST", body: JSON.stringify(v) }
      ),
    onSuccess: () =>
      void c.invalidateQueries({ queryKey: ["grading-templates"] }),
  })
}
