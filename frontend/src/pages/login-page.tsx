import { useState } from "react"
import { Navigate } from "react-router-dom"
import { GraduationCap, Loader2 } from "lucide-react"
import { z } from "zod"
import { useAuth } from "@/lib/auth"
import { ApiError } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const schema = z.object({ identity: z.string().min(1, "Enter your username or email"), password: z.string().min(1, "Enter your password") })
export function LoginPage() {
  const { user, login } = useAuth(); const [identity, setIdentity] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false)
  if (user) return <Navigate to="/enrollment" replace/>
  async function submit(e: React.FormEvent) { e.preventDefault(); const parsed = schema.safeParse({ identity, password }); if (!parsed.success) { setError(parsed.error.issues[0].message); return } setLoading(true); setError(""); try { await login(identity, password) } catch (e) { setError(e instanceof ApiError ? e.message : "Unable to sign in") } finally { setLoading(false) } }
  return <main className="grid min-h-screen bg-slate-50 lg:grid-cols-[1.05fr_.95fr]"><section className="hidden items-center justify-center bg-[#0b2748] p-16 text-white lg:flex"><div className="max-w-lg"><div className="mb-8 grid size-14 place-items-center rounded-xl border border-white/20 bg-white/10"><GraduationCap className="size-8"/></div><h1 className="text-4xl font-semibold tracking-tight">Student information, handled with clarity.</h1><p className="mt-5 text-lg leading-8 text-slate-300">A focused workspace for registrar enrollment, academic records, and official documents.</p></div></section><section className="grid place-items-center p-6"><form onSubmit={submit} className="w-full max-w-sm"><div className="mb-8 lg:hidden"><GraduationCap className="size-9 text-[#0b2748]"/></div><h2 className="text-3xl font-semibold tracking-tight text-[#0b1f3a]">Welcome back</h2><p className="mt-2 text-sm text-muted-foreground">Sign in to the college SIS workspace.</p><div className="mt-8 space-y-5"><div className="space-y-2"><Label htmlFor="identity">Username or email</Label><Input id="identity" autoComplete="username" value={identity} onChange={e => setIdentity(e.target.value)} placeholder="registrar"/></div><div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)}/></div>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button className="w-full bg-[#0969da] hover:bg-[#075dbf]" disabled={loading}>{loading && <Loader2 className="animate-spin"/>}Sign in</Button></div><p className="mt-8 text-center text-xs text-muted-foreground">Authorized school personnel only</p></form></section></main>
}
