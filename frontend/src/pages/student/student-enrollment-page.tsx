import { useState } from "react"
import { CheckCircle2, GraduationCap, Send } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import {
  useAvailableClasses,
  useStudentEnrollment,
  useStudentProfile,
} from "@/hooks/use-student-portal"
import { toast } from "sonner"
export default function StudentEnrollmentPage() {
  const enrollment = useStudentEnrollment(),
    classes = useAvailableClasses(),
    profile = useStudentProfile(),
    [busy, setBusy] = useState(false)
  async function createDraft() {
    const sectionId = classes.data?.[0]?.sectionId
    if (!sectionId) return toast.error("No eligible section is available")
    setBusy(true)
    try {
      await api("/student/me/enrollment", {
        method: "POST",
        body: JSON.stringify({ yearLevel: profile.data?.yearLevel, sectionId }),
      })
      await enrollment.refetch()
      toast.success("Enrollment draft created")
    } finally {
      setBusy(false)
    }
  }
  async function submit() {
    if (!enrollment.data?.id) return
    setBusy(true)
    try {
      await api(`/student/me/enrollment/${enrollment.data.id}/submit`, {
        method: "POST",
      })
      await enrollment.refetch()
      toast.success("Enrollment submitted for registrar review")
    } finally {
      setBusy(false)
    }
  }
  const e = enrollment.data
  return (
    <div className="mx-auto max-w-[1100px] p-5 md:p-8">
      <h1 className="flex items-center gap-3 text-3xl font-semibold text-[#092f66]">
        <GraduationCap />
        Enrollment
      </h1>
      <p className="mt-2 text-slate-600">
        Prepare your subjects and submit them for registrar review.
      </p>
      <section className="mt-7 flex flex-col justify-between gap-4 rounded-lg border p-6 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm text-slate-500">Current enrollment</p>
          <div className="mt-2 flex items-center gap-3">
            <p className="text-xl font-semibold">
              {e?.sectionCode ?? "No active draft"}
            </p>
            {e?.status ? <Badge variant="outline">{e.status}</Badge> : null}
          </div>
          {e ? (
            <p className="mt-1 text-sm text-slate-500">
              {e.schoolYear} · {e.semesterName.replaceAll("_", " ")}
            </p>
          ) : null}
        </div>
        {!e ? (
          <Button
            onClick={() => void createDraft()}
            disabled={busy || !classes.data?.length}
          >
            <CheckCircle2 data-icon="inline-start" />
            Start enrollment
          </Button>
        ) : e.status === "DRAFT" ? (
          <Button onClick={() => void submit()} disabled={busy}>
            <Send data-icon="inline-start" />
            Submit for review
          </Button>
        ) : null}
      </section>
      <section className="mt-6 overflow-hidden rounded-lg border">
        <header className="border-b px-5 py-4 font-semibold">
          Eligible classes
        </header>
        <div className="divide-y">
          {classes.data?.map((x) => (
            <article
              key={x.scheduleId}
              className="grid gap-3 p-5 sm:grid-cols-[1fr_160px_150px]"
            >
              <div>
                <p className="font-semibold">
                  {x.courseCode} · {x.courseTitle}
                </p>
                <p className="text-sm text-slate-500">{x.faculty}</p>
              </div>
              <p className="text-sm">{x.sectionCode}</p>
              <p className="text-sm">
                {x.roomCode} · {x.units} units
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
