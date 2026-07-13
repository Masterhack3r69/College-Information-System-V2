import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type {
  PageResponse,
  StudentStatus,
  DocumentVerificationStatus,
  StudentRequest,
  StudentResponse,
  StudentSummary,
  StudentDocumentResponse,
  StudentAcademicRecordsResponse,
  Enrollment,
} from "@/lib/types"

export function useStudents(
  criteria: {
    search?: string
    programId?: string
    yearLevel?: number
    sectionId?: string
    status?: string
    schoolYearAdmitted?: string
    documentStatus?: string
  },
  page?: number,
  size?: number
) {
  return useQuery({
    queryKey: ["students", criteria, page, size],
    queryFn: () => {
      const params = new URLSearchParams()
      if (criteria.search) params.append("search", criteria.search)
      if (criteria.programId) params.append("programId", criteria.programId)
      if (criteria.yearLevel !== undefined && criteria.yearLevel > 0) {
        params.append("yearLevel", String(criteria.yearLevel))
      }
      if (criteria.sectionId) params.append("sectionId", criteria.sectionId)
      if (criteria.status) params.append("status", criteria.status)
      if (criteria.schoolYearAdmitted) params.append("schoolYearAdmitted", criteria.schoolYearAdmitted)
      if (criteria.documentStatus) params.append("documentStatus", criteria.documentStatus)
      if (page !== undefined) params.append("page", String(page))
      if (size !== undefined) params.append("size", String(size))
      const query = params.toString() ? `?${params.toString()}` : ""
      return api<PageResponse<StudentSummary>>(`/students${query}`)
    },
  })
}

export function useStudent(id: string) {
  return useQuery({
    queryKey: ["student", id],
    queryFn: () => api<StudentResponse>(`/students/${id}`),
    enabled: !!id,
  })
}

export function useCreateStudent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: StudentRequest) =>
      api<StudentResponse>("/students", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] })
    },
  })
}

export function useUpdateStudent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: StudentRequest }) =>
      api<StudentResponse>(`/students/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["students"] })
      queryClient.invalidateQueries({ queryKey: ["student", data.personal.id] })
    },
  })
}

export function useUpdateStudentStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: StudentStatus }) =>
      api<StudentResponse>(`/students/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["students"] })
      queryClient.invalidateQueries({ queryKey: ["student", data.personal.id] })
    },
  })
}

export function useUploadStudentDocument(studentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ file, documentType, remarks }: { file: File; documentType: string; remarks?: string }) => {
      const formData = new FormData()
      formData.append("file", file)
      const params = new URLSearchParams()
      params.append("documentType", documentType)
      if (remarks) params.append("remarks", remarks)
      return api<StudentDocumentResponse>(`/students/${studentId}/documents?${params.toString()}`, {
        method: "POST",
        body: formData,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-documents", studentId] })
    },
  })
}

export function useStudentDocuments(studentId: string) {
  return useQuery({
    queryKey: ["student-documents", studentId],
    queryFn: () => api<StudentDocumentResponse[]>(`/students/${studentId}/documents`),
    enabled: !!studentId,
  })
}

export function useVerifyStudentDocument(studentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      documentId,
      status,
      remarks,
    }: {
      documentId: string
      status: DocumentVerificationStatus
      remarks?: string
    }) =>
      api<StudentDocumentResponse>(`/students/${studentId}/documents/${documentId}/verify`, {
        method: "PATCH",
        body: JSON.stringify({ status, remarks }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-documents", studentId] })
    },
  })
}

export function useStudentAcademicRecords(studentId: string) {
  return useQuery({
    queryKey: ["student-academic-records", studentId],
    queryFn: () => api<StudentAcademicRecordsResponse>(`/students/${studentId}/academic-records`),
    enabled: !!studentId,
  })
}

export function useStudentLatestEnrollment(studentId: string) {
  return useQuery({
    queryKey: ["student-latest-enrollment", studentId],
    queryFn: async () => {
      const res = await api<PageResponse<Enrollment>>(`/enrollments?studentId=${studentId}&status=CONFIRMED&size=1&sort=createdAt,desc`)
      return res.items[0] ? api<Enrollment>(`/enrollments/${res.items[0].id}`) : null
    },
    enabled: !!studentId,
  })
}
