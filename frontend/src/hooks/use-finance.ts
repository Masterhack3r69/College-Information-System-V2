import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { Assessment, AssessmentStatus, AssessmentSummary, FeeCategory, FeeItem, FeeItemSummary, PageResponse, Payment, PaymentMethod, PendingAssessmentEnrollment, ActiveStatus } from "@/lib/types"

function queryString(values: Record<string, string | number | undefined>) {
  const params = new URLSearchParams()
  Object.entries(values).forEach(([key, value]) => { if (value !== undefined && value !== "") params.set(key, String(value)) })
  return params.size ? `?${params}` : ""
}

export function useAssessments(filters: { search?: string; schoolYearId?: string; semesterId?: string; status?: AssessmentStatus; page: number; size: number }) {
  return useQuery({ queryKey: ["assessments", filters], queryFn: () => api<PageResponse<AssessmentSummary>>(`/assessments${queryString(filters)}`) })
}
export function usePendingAssessments(filters: { search?: string; schoolYearId?: string; semesterId?: string; programId?: string; page: number; size: number }) {
  return useQuery({ queryKey: ["pending-assessments", filters], queryFn: () => api<PageResponse<PendingAssessmentEnrollment>>(`/assessments/pending-enrollments${queryString(filters)}`) })
}
export function useAssessment(id?: string) {
  return useQuery({ queryKey: ["assessment", id], queryFn: () => api<Assessment>(`/assessments/${id}`), enabled: Boolean(id) })
}
export function useGenerateAssessment() {
  const client = useQueryClient()
  return useMutation({ mutationFn: (enrollmentId: string) => api<Assessment>(`/enrollments/${enrollmentId}/generate-assessment`, { method: "POST" }), onSuccess: () => { void client.invalidateQueries({ queryKey: ["assessments"] }); void client.invalidateQueries({ queryKey: ["pending-assessments"] }) } })
}
export function useRecalculateAssessment() {
  const client = useQueryClient()
  return useMutation({ mutationFn: (id: string) => api<Assessment>(`/assessments/${id}/recalculate`, { method: "POST" }), onSuccess: data => { client.setQueryData(["assessment", data.id], data); void client.invalidateQueries({ queryKey: ["assessments"] }) } })
}
export function usePostPayment() {
  const client = useQueryClient()
  return useMutation({ mutationFn: ({ assessmentId, ...body }: { assessmentId: string; officialReceiptNumber: string; amount: number; paymentMethod: PaymentMethod; externalReference?: string; remarks?: string }) => api<Payment>(`/assessments/${assessmentId}/payments`, { method: "POST", body: JSON.stringify(body) }), onSuccess: payment => { void client.invalidateQueries({ queryKey: ["assessment", payment.assessmentId] }); void client.invalidateQueries({ queryKey: ["assessments"] }) } })
}
export function useVoidPayment() {
  const client = useQueryClient()
  return useMutation({ mutationFn: (variables: { paymentId: string; assessmentId: string; reason: string }) => api<Payment>(`/assessment-payments/${variables.paymentId}/void`, { method: "POST", body: JSON.stringify({ reason: variables.reason }) }), onSuccess: (_, variables) => { void client.invalidateQueries({ queryKey: ["assessment", variables.assessmentId] }); void client.invalidateQueries({ queryKey: ["assessments"] }) } })
}
export function useFees(filters: { search?: string; category?: FeeCategory; status?: ActiveStatus; page: number; size: number }) {
  return useQuery({ queryKey: ["fees", filters], queryFn: () => api<PageResponse<FeeItemSummary>>(`/fees${queryString(filters)}`) })
}
export function useFee(id?: string) { return useQuery({ queryKey: ["fee", id], queryFn: () => api<FeeItem>(`/fees/${id}`), enabled: Boolean(id) }) }
export function useSaveFee() {
  const client = useQueryClient()
  return useMutation({ mutationFn: ({ id, ...body }: FeeItem & { id?: string }) => api<FeeItem>(id ? `/fees/${id}` : "/fees", { method: id ? "PUT" : "POST", body: JSON.stringify(body) }), onSuccess: data => { client.setQueryData(["fee", data.id], data); void client.invalidateQueries({ queryKey: ["fees"] }) } })
}
export function useFeeStatus() {
  const client = useQueryClient()
  return useMutation({ mutationFn: ({ id, status }: { id: string; status: ActiveStatus }) => api<FeeItem>(`/fees/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }), onSuccess: () => void client.invalidateQueries({ queryKey: ["fees"] }) })
}
