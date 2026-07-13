import { useState } from "react"
import { Navigate, useNavigate } from "react-router-dom"
import { GraduationCap, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { toast } from "sonner"
export default function StudentPasswordPage() {
  const { user, refreshUser } = useAuth(),
    navigate = useNavigate(),
    [current, setCurrent] = useState(""),
    [next, setNext] = useState(""),
    [confirm, setConfirm] = useState(""),
    [busy, setBusy] = useState(false)
  if (!user?.studentId) return <Navigate to="/" replace />
  async function submit() {
    if (next !== confirm) {
      toast.error("Passwords do not match")
      return
    }
    setBusy(true)
    try {
      await api("/student/me/password", {
        method: "PUT",
        body: JSON.stringify({
          currentPassword: current,
          newPassword: next,
          refreshToken: sessionStorage.getItem("sis.refreshToken"),
        }),
      })
      await refreshUser()
      toast.success("Password changed")
      navigate("/student/dashboard", { replace: true })
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-5">
      <section className="w-full max-w-md rounded-xl border bg-white p-7 shadow-sm">
        <div className="grid size-12 place-items-center rounded-md border-2 border-[#0c3872] text-[#0c3872]">
          <GraduationCap />
        </div>
        <h1 className="mt-6 text-2xl font-semibold text-[#092f66]">
          Secure your student account
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          You must replace the initial student-number password before using the
          portal.
        </p>
        <FieldGroup className="mt-6">
          <Field>
            <FieldLabel>Current password</FieldLabel>
            <Input
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel>New password</FieldLabel>
            <Input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
            <FieldDescription>
              At least 8 characters with a letter and number.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel>Confirm new password</FieldLabel>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </Field>
          <Button
            onClick={() => void submit()}
            disabled={!current || !next || !confirm || busy}
          >
            <ShieldCheck data-icon="inline-start" />
            Change password and continue
          </Button>
        </FieldGroup>
      </section>
    </main>
  )
}
