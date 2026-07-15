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
  return useMutation({ mutationFn: ({ assessmentId, ...body }: { assessmentId: string; requestId: string; amount: number; paymentMethod: PaymentMethod; externalReference?: string; remarks?: string }) => api<Payment>(`/assessments/${assessmentId}/payments`, { method: "POST", body: JSON.stringify(body) }), onSuccess: payment => { void client.invalidateQueries({ queryKey: ["assessment", payment.assessmentId] }); void client.invalidateQueries({ queryKey: ["assessments"] }); void client.invalidateQueries({ queryKey: ["finance-dashboard"] }) } })
}
export function useVoidPayment() {
  const client = useQueryClient()
  return useMutation({ mutationFn: (variables: { paymentId: string; assessmentId: string; reason: string }) => api<Record<string, unknown>>(`/assessment-payments/${variables.paymentId}/void`, { method: "POST", body: JSON.stringify({ requestId: crypto.randomUUID(), reason: variables.reason }) }), onSuccess: (_, variables) => { void client.invalidateQueries({ queryKey: ["assessment", variables.assessmentId] }); void client.invalidateQueries({ queryKey: ["assessments"] }); void client.invalidateQueries({ queryKey: ["finance-approvals"] }) } })
}

export type FinanceRecord = Record<string, unknown>
export function useFinanceDashboard() { return useQuery({ queryKey: ["finance-dashboard"], queryFn: () => api<FinanceRecord>("/finance/dashboard") }) }
export function useReceiptSeries() { return useQuery({ queryKey: ["finance-receipt-series"], queryFn: () => api<FinanceRecord[]>("/finance/receipt-series") }) }
export function useCashierSessions() { return useQuery({ queryKey: ["finance-sessions"], queryFn: () => api<FinanceRecord[]>("/finance/cashier-sessions") }) }
export function useCurrentCashierSession(enabled = true) { return useQuery({ queryKey: ["finance-current-session"], queryFn: () => api<FinanceRecord>("/finance/cashier-sessions/current"), enabled, retry: false }) }
export function useFinanceApprovals() {
  return useQuery({ queryKey: ["finance-approvals"], queryFn: async () => {
    const [voids, adjustments, refunds, cancellations] = await Promise.all([
      api<FinanceRecord[]>("/finance/payment-void-requests?status=REQUESTED"),
      api<FinanceRecord[]>("/finance/adjustments?status=REQUESTED"),
      api<FinanceRecord[]>("/finance/refunds?status=REQUESTED"),
      api<FinanceRecord[]>("/finance/cancellation-requests?status=REQUESTED"),
    ])
    return { voids, adjustments, refunds, cancellations }
  } })
}
export function useInstallmentTemplates() { return useQuery({ queryKey: ["finance-installment-templates"], queryFn: () => api<FinanceRecord[]>("/finance/installment-templates") }) }
export function useAssessmentAdjustments(id?: string) { return useQuery({ queryKey: ["assessment-adjustments", id], queryFn: () => api<FinanceRecord[]>(`/assessments/${id}/adjustments`), enabled: Boolean(id) }) }
export function useAssessmentRefunds(id?: string) { return useQuery({ queryKey: ["assessment-refunds", id], queryFn: () => api<FinanceRecord[]>(`/finance/refunds?assessmentId=${id}`), enabled: Boolean(id) }) }
export function useAssessmentPlan(id?: string) { return useQuery({ queryKey: ["assessment-plan", id], queryFn: () => api<FinanceRecord>(`/assessments/${id}/installment-plan`), enabled: Boolean(id), retry: false }) }
export function useFinanceMutation<T extends Record<string, unknown> = Record<string, unknown>>(path: string, method = "POST") {
  const client = useQueryClient()
  return useMutation({ mutationFn: (body: T) => api<FinanceRecord>(path, { method, body: JSON.stringify(body) }), onSuccess: () => {
    void client.invalidateQueries({ queryKey: ["finance-dashboard"] }); void client.invalidateQueries({ queryKey: ["finance-sessions"] })
    void client.invalidateQueries({ queryKey: ["finance-current-session"] }); void client.invalidateQueries({ queryKey: ["finance-approvals"] })
    void client.invalidateQueries({ queryKey: ["finance-receipt-series"] }); void client.invalidateQueries({ queryKey: ["finance-installment-templates"] }); void client.invalidateQueries({ queryKey: ["assessments"] })
  } })
}
export function useFinanceAction() {
  const client = useQueryClient()
  return useMutation({ mutationFn: ({ path, method = "POST", body }: { path: string; method?: string; body?: Record<string, unknown> }) => api<FinanceRecord>(path, { method, body: body ? JSON.stringify(body) : undefined }), onSuccess: () => {
    for (const key of [["finance-dashboard"], ["finance-sessions"], ["finance-current-session"], ["finance-approvals"], ["finance-receipt-series"], ["finance-installment-templates"], ["assessment-adjustments"], ["assessment-refunds"], ["assessment-plan"], ["assessment"], ["assessments"]]) void client.invalidateQueries({ queryKey: key })
  } })
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
