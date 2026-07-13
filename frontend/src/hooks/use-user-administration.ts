import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type {
  AdminUser,
  FacultyAccountOption,
  PageResponse,
  Permission,
  Role,
  UserAccountRequest,
} from "@/lib/types"

type UserFilters = {
  search?: string
  roleId?: string
  active?: boolean
  page: number
  size: number
}

export function useAdminUsers(filters: UserFilters) {
  return useQuery({
    queryKey: ["admin-users", filters],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(filters.page),
        size: String(filters.size),
        sort: "fullName,asc",
      })
      if (filters.search) params.set("search", filters.search)
      if (filters.roleId) params.set("roleId", filters.roleId)
      if (filters.active !== undefined) params.set("active", String(filters.active))
      return api<PageResponse<AdminUser>>(`/users?${params}`)
    },
  })
}

export function useRoles() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: () => api<Role[]>("/roles"),
  })
}

export function usePermissions() {
  return useQuery({
    queryKey: ["permissions"],
    queryFn: () => api<Permission[]>("/permissions"),
  })
}

export function useFacultyAccountOptions(search: string, includeFacultyId?: string) {
  return useQuery({
    queryKey: ["faculty-account-options", search, includeFacultyId],
    queryFn: () => {
      const params = new URLSearchParams({ page: "0", size: "30", sort: "lastName,asc" })
      if (search) params.set("search", search)
      if (includeFacultyId) params.set("includeFacultyId", includeFacultyId)
      return api<PageResponse<FacultyAccountOption>>(`/users/faculty-options?${params}`)
    },
  })
}

function invalidateUsers(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
    queryClient.invalidateQueries({ queryKey: ["faculty-account-options"] }),
  ])
}

export function useCreateAdminUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: UserAccountRequest) =>
      api<AdminUser>("/users", { method: "POST", body: JSON.stringify(request) }),
    onSuccess: () => invalidateUsers(queryClient),
  })
}

export function useUpdateAdminUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: UserAccountRequest }) =>
      api<AdminUser>(`/users/${id}`, { method: "PUT", body: JSON.stringify(request) }),
    onSuccess: () => invalidateUsers(queryClient),
  })
}

export function useSetAdminUserStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api<AdminUser>(`/users/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ active }),
      }),
    onSuccess: () => invalidateUsers(queryClient),
  })
}

export function useResetAdminUserPassword() {
  return useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      api<void>(`/users/${id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ newPassword }),
      }),
  })
}

export function useUpdateRolePermissions() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, permissionIds }: { id: string; permissionIds: string[] }) =>
      api<Role>(`/roles/${id}/permissions`, {
        method: "PUT",
        body: JSON.stringify({ permissionIds }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["roles"] }),
  })
}
