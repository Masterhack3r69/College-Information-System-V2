import { useEffect, useState } from "react"
import { Navigate } from "react-router-dom"
import { Clock3, GraduationCap, Loader2 } from "lucide-react"
import { z } from "zod"
import { useAuth } from "@/lib/auth"
import { ApiError } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const schema = z.object({
  identity: z.string().min(1, "Enter your username or email"),
  password: z.string().min(1, "Enter your password"),
})
export function LoginPage() {
  const { user, login, portalHome } = useAuth(),
    [identity, setIdentity] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [retryAfter, setRetryAfter] = useState(0)
  useEffect(() => {
    if (retryAfter <= 0) return
    const timer = window.setInterval(
      () => setRetryAfter((value) => Math.max(0, value - 1)),
      1000
    )
    return () => window.clearInterval(timer)
  }, [retryAfter])
  if (user) return <Navigate to={portalHome()} replace />
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const parsed = schema.safeParse({ identity, password })
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }
    setLoading(true)
    setError("")
    try {
      await login(identity, password)
    } catch (caught) {
      if (caught instanceof ApiError) {
        if (caught.code === "AUTH_RATE_LIMITED")
          setRetryAfter(caught.retryAfter ?? 60)
        setError(
          caught.code === "TEMPORARY_PASSWORD_EXPIRED"
            ? "This temporary credential has expired. Contact an account administrator."
            : caught.message
        )
      } else setError("Unable to sign in")
    } finally {
      setLoading(false)
    }
  }
  const minutes = Math.floor(retryAfter / 60),
    seconds = retryAfter % 60
  return (
    <main className="grid min-h-screen bg-surface lg:grid-cols-[1.05fr_.95fr]">
      <section className="hidden items-center justify-center bg-primary p-16 text-white lg:flex">
        <div className="max-w-lg">
          <div className="mb-8 grid size-14 place-items-center rounded-lg border border-white/20 bg-background/10">
            <GraduationCap className="size-8" />
          </div>
          <h1 className="text-4xl font-semibold tracking-tight">
            Student information, handled with clarity.
          </h1>
          <p className="mt-5 text-lg leading-8 text-muted-foreground/60">
            A focused workspace for registrar enrollment, academic records, and
            official documents.
          </p>
        </div>
      </section>
      <section className="grid place-items-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <GraduationCap className="size-9 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">
            Welcome back
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to the college SIS workspace.
          </p>
          <div className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="identity">Username or email</Label>
              <Input
                id="identity"
                autoComplete="username"
                value={identity}
                onChange={(e) => setIdentity(e.target.value)}
                placeholder="registrar"
                disabled={retryAfter > 0}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={retryAfter > 0}
              />
            </div>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            {retryAfter > 0 ? (
              <div className="flex items-center gap-2 border-l-4 border-warning-foreground/30 bg-warning px-3 py-2 text-sm text-warning-foreground">
                <Clock3 className="size-4" />
                Try again in {minutes}:{seconds.toString().padStart(2, "0")}
              </div>
            ) : null}
            <Button
              className="w-full bg-primary hover:bg-primary/90"
              disabled={loading || retryAfter > 0}
            >
              {loading ? <Loader2 className="animate-spin" /> : null}
              {retryAfter > 0 ? "Sign in temporarily paused" : "Sign in"}
            </Button>
          </div>
          <p className="mt-8 text-center text-xs text-muted-foreground">
            Authorized school personnel only
          </p>
        </form>
      </section>
    </main>
  )
}
