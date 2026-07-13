import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type {
  PageResponse,
  CurriculumRequest,
  CurriculumResponse,
  CurriculumCourseRequest,
  CurriculumCourseResponse,
  CurriculumDetailResponse,
  CurriculumChecklistResponse,
} from "@/lib/types"

export function useCurricula(search?: string, page?: number, size?: number) {
  return useQuery({
    queryKey: ["curricula", search, page, size],
    queryFn: () => {
      const params = new URLSearchParams()
      if (search) params.append("search", search)
      if (page !== undefined) params.append("page", String(page))
      if (size !== undefined) params.append("size", String(size))
      const query = params.toString() ? `?${params.toString()}` : ""
      return api<PageResponse<CurriculumResponse>>(`/curricula${query}`)
    },
  })
}

export function useCurriculum(id: string) {
  return useQuery({
    queryKey: ["curriculum", id],
    queryFn: () => api<CurriculumDetailResponse>(`/curricula/${id}`),
    enabled: !!id,
  })
}

export function useCreateCurriculum() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CurriculumRequest) =>
      api<CurriculumResponse>("/curricula", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["curricula"] })
    },
  })
}

export function useUpdateCurriculum() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & CurriculumRequest) =>
      api<CurriculumResponse>(`/curricula/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["curricula"] })
      queryClient.invalidateQueries({ queryKey: ["curriculum", data.id] })
      queryClient.invalidateQueries({ queryKey: ["curriculum-checklist", data.id] })
    },
  })
}

export function useActivateCurriculum() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api<CurriculumResponse>(`/curricula/${id}/activate`, {
        method: "POST",
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["curricula"] })
      queryClient.invalidateQueries({ queryKey: ["curriculum", data.id] })
      queryClient.invalidateQueries({ queryKey: ["curriculum-checklist", data.id] })
    },
  })
}

export function useCurriculumChecklist(id: string) {
  return useQuery({
    queryKey: ["curriculum-checklist", id],
    queryFn: () => api<CurriculumChecklistResponse>(`/curricula/${id}/checklist`),
    enabled: !!id,
  })
}

export function useAddCurriculumCourse(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CurriculumCourseRequest) =>
      api<CurriculumCourseResponse>(`/curricula/${id}/courses`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["curriculum", id] })
      queryClient.invalidateQueries({ queryKey: ["curriculum-checklist", id] })
    },
  })
}

export function useUpdateCurriculumCourse(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ ccId, ...data }: { ccId: string } & CurriculumCourseRequest) =>
      api<CurriculumCourseResponse>(`/curricula/${id}/courses/${ccId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["curriculum", id] })
      queryClient.invalidateQueries({ queryKey: ["curriculum-checklist", id] })
    },
  })
}

export function useDeleteCurriculumCourse(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ccId: string) =>
      api<void>(`/curricula/${id}/courses/${ccId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["curriculum", id] })
      queryClient.invalidateQueries({ queryKey: ["curriculum-checklist", id] })
    },
  })
}
