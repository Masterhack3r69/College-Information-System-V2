import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { api, setAccessToken } from "@/lib/api"
import type { AuthResponse, User } from "@/lib/types"

type AuthContextValue = { user: User | null; ready: boolean; login: (identity: string, password: string) => Promise<void>; logout: () => Promise<void>; can: (permission: string) => boolean }
const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null); const [ready, setReady] = useState(false)
  useEffect(() => { const token = sessionStorage.getItem("sis.refreshToken"); if (!token) { setReady(true); return }
    api<User>("/auth/me").then(setUser).catch(() => sessionStorage.removeItem("sis.refreshToken")).finally(() => setReady(true)) }, [])
  async function login(identity: string, password: string) { const result = await api<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify({ usernameOrEmail: identity, password }) }); setAccessToken(result.accessToken); sessionStorage.setItem("sis.refreshToken", result.refreshToken); setUser(result.user) }
  async function logout() { const refreshToken = sessionStorage.getItem("sis.refreshToken"); try { if (refreshToken) await api("/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken }) }) } finally { sessionStorage.removeItem("sis.refreshToken"); setAccessToken(null); setUser(null) } }
  const value = useMemo(() => ({ user, ready, login, logout, can: (p: string) => !!user?.permissions.includes(p) }), [user, ready])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error("AuthProvider missing"); return value }
