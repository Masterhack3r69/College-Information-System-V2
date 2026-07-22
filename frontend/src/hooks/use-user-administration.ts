import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type {
  AccountDirectorySummary,
  AccountSession,
  AdminUser,
  FacultyAccountOption,
  IdentityConflict,
  PageResponse,
  Permission,
  ProvisionedUser,
  Role,
  SecurityActivity,
  UserAccountRequest,
} from "@/lib/types"

export type UserFilters = {
  search?: string
  roleId?: string
  active?: boolean
  accountType?: string
  locked?: boolean
  forcedChange?: boolean
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
      Object.entries(filters).forEach(([key, value]) => {
        if (
          !["page", "size"].includes(key) &&
          value !== undefined &&
          value !== ""
        )
          params.set(key, String(value))
      })
      return api<PageResponse<AdminUser>>(`/users?${params}`)
    },
  })
}
export function useAccountSummary() {
  return useQuery({
    queryKey: ["account-summary"],
    queryFn: () => api<AccountDirectorySummary>("/users/summary"),
  })
}
export function useAssignableRoles() {
  return useQuery({
    queryKey: ["assignable-roles"],
    queryFn: () => api<Role[]>("/users/assignable-roles"),
  })
}
export function useRoles(enabled = true) {
  return useQuery({
    queryKey: ["roles"],
    queryFn: () => api<Role[]>("/roles"),
    enabled,
  })
}
export function usePermissions(enabled = true) {
  return useQuery({
    queryKey: ["permissions"],
    queryFn: () => api<Permission[]>("/permissions"),
    enabled,
  })
}
export function useIdentityConflicts(enabled = true) {
  return useQuery({
    queryKey: ["identity-conflicts"],
    queryFn: () => api<IdentityConflict[]>("/users/identity-conflicts"),
    enabled,
  })
}
export function useAccountSessions(id?: string) {
  return useQuery({
    queryKey: ["account-sessions", id],
    queryFn: () => api<AccountSession[]>(`/users/${id}/sessions`),
    enabled: !!id,
  })
}
export function useAccountActivity(id?: string) {
  return useQuery({
    queryKey: ["account-activity", id],
    queryFn: () => api<SecurityActivity[]>(`/users/${id}/security-activity`),
    enabled: !!id,
  })
}
export function useFacultyAccountOptions(
  search: string,
  includeFacultyId?: string
) {
  return useQuery({
    queryKey: ["faculty-account-options", search, includeFacultyId],
    queryFn: () => {
      const p = new URLSearchParams({
        page: "0",
        size: "50",
        sort: "lastName,asc",
      })
      if (search) p.set("search", search)
      if (includeFacultyId) p.set("includeFacultyId", includeFacultyId)
      return api<PageResponse<FacultyAccountOption>>(
        `/users/faculty-options?${p}`
      )
    },
  })
}

function invalidateDirectory(client: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    client.invalidateQueries({ queryKey: ["admin-users"] }),
    client.invalidateQueries({ queryKey: ["account-summary"] }),
    client.invalidateQueries({ queryKey: ["assignable-roles"] }),
    client.invalidateQueries({ queryKey: ["identity-conflicts"] }),
    client.invalidateQueries({ queryKey: ["faculty-account-options"] }),
  ])
}
export function useCreateAdminUser() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (request: UserAccountRequest) =>
      api<ProvisionedUser>("/users", {
        method: "POST",
        body: JSON.stringify(request),
      }),
    onSuccess: () => invalidateDirectory(client),
  })
}
export function useUpdateAdminUser() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      request,
    }: {
      id: string
      request: UserAccountRequest
    }) =>
      api<AdminUser>(`/users/${id}`, {
        method: "PUT",
        body: JSON.stringify(request),
      }),
    onSuccess: () => invalidateDirectory(client),
  })
}
export function useSetAdminUserStatus() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      active,
      version,
      auditReason,
    }: {
      id: string
      active: boolean
      version: number
      auditReason: string
    }) =>
      api<AdminUser>(`/users/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ active, version, auditReason }),
      }),
    onSuccess: () => invalidateDirectory(client),
  })
}
export function useResetAdminUserPassword() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      version,
      auditReason,
    }: {
      id: string
      version: number
      auditReason: string
    }) =>
      api<ProvisionedUser>(`/users/${id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ version, auditReason }),
      }),
    onSuccess: () => invalidateDirectory(client),
  })
}
export function useUnlockAdminUser() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      version,
      auditReason,
    }: {
      id: string
      version: number
      auditReason: string
    }) =>
      api<AdminUser>(`/users/${id}/unlock`, {
        method: "POST",
        body: JSON.stringify({ version, auditReason }),
      }),
    onSuccess: () => invalidateDirectory(client),
  })
}
export function useRevokeAccountSession() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({
      userId,
      sessionId,
      auditReason,
    }: {
      userId: string
      sessionId: string
      auditReason: string
    }) =>
      api<void>(`/users/${userId}/sessions/${sessionId}`, {
        method: "DELETE",
        body: JSON.stringify({ auditReason }),
      }),
    onSuccess: (_d, v) => {
      void client.invalidateQueries({
        queryKey: ["account-sessions", v.userId],
      })
      void invalidateDirectory(client)
    },
  })
}
export function useRevokeAllAccountSessions() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({
      userId,
      version,
      auditReason,
    }: {
      userId: string
      version: number
      auditReason: string
    }) =>
      api<number>(`/users/${userId}/sessions/revoke-all`, {
        method: "POST",
        body: JSON.stringify({ version, auditReason }),
      }),
    onSuccess: (_d, v) => {
      void client.invalidateQueries({
        queryKey: ["account-sessions", v.userId],
      })
      void invalidateDirectory(client)
    },
  })
}
export function useUpdateRolePermissions() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      permissionIds,
      version,
      auditReason,
    }: {
      id: string
      permissionIds: string[]
      version: number
      auditReason: string
    }) =>
      api<Role>(`/roles/${id}/permissions`, {
        method: "PUT",
        body: JSON.stringify({ permissionIds, version, auditReason }),
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["roles"] }),
  })
}
export function useReconcileIdentity() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      version,
      auditReason,
    }: {
      id: string
      version: number
      auditReason: string
    }) =>
      api<AdminUser>(`/users/${id}/reconcile-identity`, {
        method: "POST",
        body: JSON.stringify({ version, auditReason }),
      }),
    onSuccess: () => invalidateDirectory(client),
  })
}
