import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { PageResponse, Department, ActiveStatus, Room, SchoolYear, Semester, Program, Course, Faculty, Section } from "@/lib/types"

// Departments
export function useDepartments(search?: string, page?: number, size?: number) {
  return useQuery({
    queryKey: ["departments", search, page, size],
    queryFn: () => {
      const params = new URLSearchParams()
      if (search) params.append("search", search)
      if (page !== undefined) params.append("page", String(page))
      if (size !== undefined) params.append("size", String(size))
      const query = params.toString() ? `?${params.toString()}` : ""
      return api<PageResponse<Department>>(`/departments${query}`)
    },
  })
}

export function useCreateDepartment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Department, "id">) =>
      api<Department>("/departments", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] })
    },
  })
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Department) =>
      api<Department>(`/departments/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] })
    },
  })
}

export function useUpdateDepartmentStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ActiveStatus }) =>
      api<Department>(`/departments/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] })
    },
  })
}

// Rooms
export function useRooms(search?: string, page?: number, size?: number) {
  return useQuery({
    queryKey: ["rooms", search, page, size],
    queryFn: () => {
      const params = new URLSearchParams()
      if (search) params.append("search", search)
      if (page !== undefined) params.append("page", String(page))
      if (size !== undefined) params.append("size", String(size))
      const query = params.toString() ? `?${params.toString()}` : ""
      return api<PageResponse<Room>>(`/rooms${query}`)
    },
  })
}

export function useCreateRoom() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Room, "id">) =>
      api<Room>("/rooms", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] })
    },
  })
}

export function useUpdateRoom() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Room) =>
      api<Room>(`/rooms/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] })
    },
  })
}

export function useUpdateRoomStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ActiveStatus }) =>
      api<Room>(`/rooms/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] })
    },
  })
}

// School Years
export function useSchoolYears(page?: number, size?: number) {
  return useQuery({
    queryKey: ["school-years", page, size],
    queryFn: () => {
      const params = new URLSearchParams()
      if (page !== undefined) params.append("page", String(page))
      if (size !== undefined) params.append("size", String(size))
      const query = params.toString() ? `?${params.toString()}` : ""
      return api<PageResponse<SchoolYear>>(`/school-years${query}`)
    },
  })
}

export function useCreateSchoolYear() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<SchoolYear, "id">) =>
      api<SchoolYear>("/school-years", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-years"] })
    },
  })
}

export function useUpdateSchoolYear() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: SchoolYear) =>
      api<SchoolYear>(`/school-years/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-years"] })
    },
  })
}

// Semesters
export function useSemesters(page?: number, size?: number) {
  return useQuery({
    queryKey: ["semesters", page, size],
    queryFn: () => {
      const params = new URLSearchParams()
      if (page !== undefined) params.append("page", String(page))
      if (size !== undefined) params.append("size", String(size))
      const query = params.toString() ? `?${params.toString()}` : ""
      return api<PageResponse<Semester>>(`/semesters${query}`)
    },
  })
}

export function useCreateSemester() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Semester, "id">) =>
      api<Semester>("/semesters", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["semesters"] })
    },
  })
}

export function useUpdateSemester() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Semester) =>
      api<Semester>(`/semesters/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["semesters"] })
    },
  })
}

// Programs
export function usePrograms(search?: string, page?: number, size?: number) {
  return useQuery({
    queryKey: ["programs", search, page, size],
    queryFn: () => {
      const params = new URLSearchParams()
      if (search) params.append("search", search)
      if (page !== undefined) params.append("page", String(page))
      if (size !== undefined) params.append("size", String(size))
      const query = params.toString() ? `?${params.toString()}` : ""
      return api<PageResponse<Program>>(`/programs${query}`)
    },
  })
}

export function useCreateProgram() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Program, "id" | "departmentCode">) =>
      api<Program>("/programs", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] })
    },
  })
}

export function useUpdateProgram() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Program) =>
      api<Program>(`/programs/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] })
    },
  })
}

// Courses
export function useCourses(search?: string, page?: number, size?: number) {
  return useQuery({
    queryKey: ["courses", search, page, size],
    queryFn: () => {
      const params = new URLSearchParams()
      if (search) params.append("search", search)
      if (page !== undefined) params.append("page", String(page))
      if (size !== undefined) params.append("size", String(size))
      const query = params.toString() ? `?${params.toString()}` : ""
      return api<PageResponse<Course>>(`/courses${query}`)
    },
  })
}

export function useCreateCourse() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Course, "id" | "departmentCode">) =>
      api<Course>("/courses", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] })
    },
  })
}

export function useUpdateCourse() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Course) =>
      api<Course>(`/courses/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] })
    },
  })
}

// Faculty
export function useFaculty(search?: string, page?: number, size?: number) {
  return useQuery({
    queryKey: ["faculty", search, page, size],
    queryFn: () => {
      const params = new URLSearchParams()
      if (search) params.append("search", search)
      if (page !== undefined) params.append("page", String(page))
      if (size !== undefined) params.append("size", String(size))
      const query = params.toString() ? `?${params.toString()}` : ""
      return api<PageResponse<Faculty>>(`/faculty${query}`)
    },
  })
}

export function useCreateFaculty() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Faculty, "id" | "departmentCode">) =>
      api<Faculty>("/faculty", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faculty"] })
    },
  })
}

export function useUpdateFaculty() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Faculty) =>
      api<Faculty>(`/faculty/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faculty"] })
    },
  })
}

export function useUpdateFacultyStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ActiveStatus }) =>
      api<Faculty>(`/faculty/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faculty"] })
    },
  })
}

// Sections
export function useSections(search?: string, page?: number, size?: number) {
  return useQuery({
    queryKey: ["sections", search, page, size],
    queryFn: () => {
      const params = new URLSearchParams()
      if (search) params.append("search", search)
      if (page !== undefined) params.append("page", String(page))
      if (size !== undefined) params.append("size", String(size))
      const query = params.toString() ? `?${params.toString()}` : ""
      return api<PageResponse<Section>>(`/sections${query}`)
    },
  })
}

export function useCreateSection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Section, "id" | "programCode" | "curriculumCode" | "schoolYear" | "semesterName">) =>
      api<Section>("/sections", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sections"] })
    },
  })
}

export function useUpdateSection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Section) =>
      api<Section>(`/sections/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sections"] })
    },
  })
}

export function useUpdateSectionStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ActiveStatus }) =>
      api<Section>(`/sections/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sections"] })
    },
  })
}
