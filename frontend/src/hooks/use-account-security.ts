import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { AccountSession } from "@/lib/types"

export function useMySessions() {
  return useQuery({
    queryKey: ["my-sessions"],
    queryFn: () => api<AccountSession[]>("/auth/sessions"),
  })
}
export function useRevokeMySession() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: string) =>
      api<void>(`/auth/sessions/${sessionId}`, { method: "DELETE" }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["my-sessions"] }),
  })
}
export function useRevokeOtherSessions() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: () =>
      api<number>("/auth/sessions/revoke-others", { method: "POST" }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["my-sessions"] }),
  })
}
