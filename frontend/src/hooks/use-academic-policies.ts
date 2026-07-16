import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"

export type AcademicPolicy = { id: string; academicStatus: string; schoolYearId: string; schoolYear: string; programId?: string; programCode?: string; enrollmentAllowed: boolean; maximumUnits?: number; requiresApproval: boolean; active: boolean }
export type AcademicPolicyInput = Omit<AcademicPolicy, "id" | "schoolYear" | "programCode">
export type RequirementGroup = { id: string; curriculumId: string; groupCode: string; groupName: string; requirementType: "COURSE_COUNT" | "UNIT_TOTAL"; requiredCourseCount?: number; requiredUnits?: number; curriculumCourseIds: string[]; active: boolean }
export type RequirementGroupInput = Omit<RequirementGroup, "id">

export function useAcademicPolicies(schoolYearId?: string) {
  return useQuery({ queryKey: ["academic-policies", schoolYearId], queryFn: () => api<AcademicPolicy[]>(`/academic-policies${schoolYearId ? `?schoolYearId=${schoolYearId}` : ""}`) })
}
export function useSaveAcademicPolicy() {
  const client = useQueryClient()
  return useMutation({ mutationFn: ({ id, input }: { id?: string; input: AcademicPolicyInput }) => api<AcademicPolicy>(id ? `/academic-policies/${id}` : "/academic-policies", { method: id ? "PUT" : "POST", body: JSON.stringify(input) }), onSuccess: () => client.invalidateQueries({ queryKey: ["academic-policies"] }) })
}
export function useRequirementGroups(curriculumId?: string) {
  return useQuery({ queryKey: ["curriculum-requirement-groups", curriculumId], queryFn: () => api<RequirementGroup[]>(`/curricula/${curriculumId}/requirement-groups`), enabled: !!curriculumId })
}
export function useSaveRequirementGroup() {
  const client = useQueryClient()
  return useMutation({ mutationFn: ({ id, input }: { id?: string; input: RequirementGroupInput }) => api<RequirementGroup>(id ? `/curricula/${input.curriculumId}/requirement-groups/${id}` : `/curricula/${input.curriculumId}/requirement-groups`, { method: id ? "PUT" : "POST", body: JSON.stringify(input) }), onSuccess: (_data, variables) => client.invalidateQueries({ queryKey: ["curriculum-requirement-groups", variables.input.curriculumId] }) })
}
