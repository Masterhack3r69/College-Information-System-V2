import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { api, setAccessToken } from "@/lib/api"
import type { AuthResponse, Portal, User } from "@/lib/types"

type AuthContextValue = { user: User | null; ready: boolean; login: (identity: string, password: string) => Promise<void>; logout: () => Promise<void>; refreshUser:()=>Promise<User>; can: (permission: string) => boolean; portalHome: () => string; switchPortal: (portal: Portal) => string }
const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null); const [ready, setReady] = useState(() => !sessionStorage.getItem("sis.refreshToken"))
  useEffect(() => { const token = sessionStorage.getItem("sis.refreshToken"); if (!token) return
    api<User>("/auth/me").then(setUser).catch(() => sessionStorage.removeItem("sis.refreshToken")).finally(() => setReady(true)) }, [])
  async function login(identity: string, password: string) { const result = await api<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify({ usernameOrEmail: identity, password }) }); setAccessToken(result.accessToken); sessionStorage.setItem("sis.refreshToken", result.refreshToken); setUser(result.user) }
  async function logout() { const refreshToken = sessionStorage.getItem("sis.refreshToken"); try { if (refreshToken) await api("/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken }) }) } finally { sessionStorage.removeItem("sis.refreshToken"); setAccessToken(null); setUser(null) } }
  async function refreshUser(){const next=await api<User>("/auth/me");setUser(next);return next}
  const home = useCallback((portal?: Portal) => { if(user?.passwordChangeRequired&&user.studentId)return "/student/account/password"; const selected = portal ?? (sessionStorage.getItem("sis.portal") as Portal | null); const valid = selected && user?.availablePortals.includes(selected) ? selected : user?.defaultPortal; return valid === "FACULTY" ? "/faculty/dashboard" : valid === "STUDENT" ? "/student/dashboard" : "/admin" }, [user])
  const switchPortal = useCallback((portal: Portal) => { if (!user?.availablePortals.includes(portal)) return home(); sessionStorage.setItem("sis.portal", portal); return home(portal) }, [home,user])
  const value = useMemo(() => ({ user, ready, login, logout, refreshUser, can: (p: string) => !!user?.permissions.includes(p), portalHome: () => home(), switchPortal }), [user, ready, home, switchPortal])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error("AuthProvider missing"); return value }
