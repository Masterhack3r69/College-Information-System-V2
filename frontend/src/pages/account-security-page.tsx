import { useState } from "react"
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  GraduationCap,
  KeyRound,
  Laptop,
  LogOut,
  MonitorSmartphone,
  ShieldCheck,
  Smartphone,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth"
import {
  useMySessions,
  useRevokeMySession,
  useRevokeOtherSessions,
} from "@/hooks/use-account-security"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

function deviceIcon(agent?: string) {
  return /mobile|android|iphone/i.test(agent ?? "") ? Smartphone : Laptop
}
function deviceName(agent?: string) {
  if (!agent) return "Unknown device"
  if (/iphone|ipad/i.test(agent)) return "iOS device"
  if (/android/i.test(agent)) return "Android device"
  if (/windows/i.test(agent)) return "Windows computer"
  if (/macintosh/i.test(agent)) return "Mac computer"
  return "Web browser"
}
function when(value?: string) {
  return value
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "Not available"
}

export default function AccountSecurityPage() {
  const { user, changePassword, portalHome, logout } = useAuth()
  const navigate = useNavigate(),
    sessions = useMySessions(),
    revoke = useRevokeMySession(),
    revokeOthers = useRevokeOtherSessions()
  const [current, setCurrent] = useState(""),
    [next, setNext] = useState(""),
    [confirm, setConfirm] = useState(""),
    [busy, setBusy] = useState(false)
  const active = (sessions.data ?? []).filter(
    (session) =>
      !session.revokedAt && new Date(session.absoluteExpiresAt) > new Date()
  )
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (next !== confirm) return toast.error("Passwords do not match")
    setBusy(true)
    try {
      await changePassword(current, next)
      setCurrent("")
      setNext("")
      setConfirm("")
      toast.success("Password changed and other sessions signed out")
      navigate(portalHome(), { replace: true })
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className="min-h-screen overflow-x-hidden bg-surface text-foreground">
      <header className="border-b bg-primary text-white">
        <div className="mx-auto flex h-18 max-w-6xl items-center justify-between gap-3 px-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-10 place-items-center rounded-md border border-white/25 bg-background/10">
              <GraduationCap />
            </div>
            <div className="min-w-0">
              <p className="font-semibold">College CIS</p>
              <p className="text-xs text-info">Account Security</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="shrink-0 px-2 text-white hover:bg-background/10 hover:text-white sm:px-4"
            onClick={() => void logout()}
          >
            <LogOut />
            Sign out
          </Button>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-5 md:py-12">
        <Button
          variant="ghost"
          className="mb-5 -ml-3 text-muted-foreground"
          onClick={() => navigate(portalHome())}
          disabled={user?.passwordChangeRequired}
        >
          <ArrowLeft />
          Back to workspace
        </Button>
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <ShieldCheck className="size-8 text-primary" />
            <h1 className="min-w-0 text-2xl font-semibold tracking-tight sm:text-3xl">
              Account Security
            </h1>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Manage your password and the devices signed in to {user?.email}.
          </p>
          {user?.passwordChangeRequired ? (
            <div className="mt-5 flex max-w-2xl items-start gap-3 border-l-4 border-warning-foreground/30 bg-warning px-4 py-3 text-sm text-warning-foreground">
              <Clock3 className="mt-0.5 size-4 shrink-0" />
              <span>
                Your temporary password must be replaced before you can open the
                rest of the system.
              </span>
            </div>
          ) : null}
        </div>
        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
          <section className="min-w-0 border bg-background p-4 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <div className="grid size-10 place-items-center rounded-md bg-info text-primary">
                <KeyRound className="size-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold">Change password</h2>
                <p className="mt-1 break-words text-sm text-muted-foreground">
                  All other sessions will be revoked immediately.
                </p>
              </div>
            </div>
            <form onSubmit={submit} className="mt-7 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="security-current">Current password</Label>
                <Input
                  id="security-current"
                  type="password"
                  autoComplete="current-password"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="security-new">New password</Label>
                <Input
                  id="security-new"
                  type="password"
                  autoComplete="new-password"
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                />
                <p className="break-words text-xs leading-5 text-muted-foreground">
                  12–128 characters with at least one letter and one number.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="security-confirm">Confirm new password</Label>
                <Input
                  id="security-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
              <Button
                className="w-full bg-primary hover:bg-primary/90"
                disabled={busy || !current || next.length < 12 || !confirm}
              >
                <ShieldCheck />
                Update password
              </Button>
            </form>
          </section>
          <section className="min-w-0 border bg-background shadow-sm">
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 p-4 sm:p-6">
              <div className="min-w-0">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <MonitorSmartphone className="size-5 text-primary" />
                  Active sessions
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {active.length} signed-in{" "}
                  {active.length === 1 ? "device" : "devices"}
                </p>
              </div>
              <Button
                variant="outline"
                disabled={
                  active.filter((s) => !s.current).length === 0 ||
                  revokeOthers.isPending
                }
                onClick={() =>
                  void revokeOthers
                    .mutateAsync()
                    .then((count) =>
                      toast.success(
                        `${count} other session${count === 1 ? "" : "s"} revoked`
                      )
                    )
                }
              >
                Revoke all others
              </Button>
            </div>
            <Separator />
            <div className="divide-y">
              {sessions.isLoading ? (
                <p className="p-6 text-sm text-muted-foreground">Loading sessions…</p>
              ) : active.length === 0 ? (
                <div className="grid place-items-center p-10 text-center">
                  <CheckCircle2 className="size-8 text-success-foreground" />
                  <p className="mt-3 font-medium">No other active sessions</p>
                </div>
              ) : (
                active.map((session) => {
                  const Icon = deviceIcon(session.userAgent)
                  return (
                    <div
                      key={session.id}
                      className="flex min-w-0 items-start gap-3 p-4 sm:gap-4 sm:p-5"
                    >
                      <div className="grid size-10 shrink-0 place-items-center rounded-full bg-muted">
                        <Icon className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">
                            {deviceName(session.userAgent)}
                          </p>
                          {session.current ? (
                            <Badge className="bg-success text-success-foreground hover:bg-success">
                              Current session
                            </Badge>
                          ) : null}
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {session.userAgent ?? "User agent unavailable"}
                        </p>
                        <p className="mt-2 break-words text-xs text-muted-foreground">
                          Last used {when(session.lastUsedAt)} · IP{" "}
                          {session.lastIp ?? "unavailable"}
                        </p>
                      </div>
                      {!session.current ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="shrink-0 px-2 text-destructive sm:px-3"
                          disabled={revoke.isPending}
                          onClick={() =>
                            void revoke
                              .mutateAsync(session.id)
                              .then(() => toast.success("Session revoked"))
                          }
                        >
                          Revoke
                        </Button>
                      ) : null}
                    </div>
                  )
                })
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
