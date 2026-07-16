import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { AlertCircle, CheckCircle2, Clock3, GraduationCap, Loader2, Plus, Send, Trash2, Users } from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import {
  type ClassMeeting,
  useAvailableClasses,
  useStudentEnrollment,
  useStudentProfile,
} from "@/hooks/use-student-portal"

const flexibleClassifications = new Set(["IRREGULAR", "TRANSFEREE", "RETURNEE", "CROSS_ENROLLEE", "GRADUATING"])

function meetingsLabel(meetings: ClassMeeting[] | undefined) {
  if (!Array.isArray(meetings) || meetings.length === 0) return "Meeting time to be arranged"
  return meetings.map((meeting) => `${meeting.dayOfWeek.slice(0, 3)} ${meeting.startTime?.slice(0, 5)}–${meeting.endTime?.slice(0, 5)}`).join(" · ")
}

export default function StudentEnrollmentPage() {
  const enrollment = useStudentEnrollment()
  const classes = useAvailableClasses()
  const profile = useStudentProfile()
  const queryClient = useQueryClient()
  const [busyKey, setBusyKey] = useState<string>()

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["student-enrollment"] }),
      queryClient.invalidateQueries({ queryKey: ["student-available-classes"] }),
      queryClient.invalidateQueries({ queryKey: ["student-academic-plan"] }),
      queryClient.invalidateQueries({ queryKey: ["student-dashboard"] }),
    ])
  }

  async function createDraft() {
    const firstClass = classes.data?.[0]
    const flexible = flexibleClassifications.has(profile.data?.classification ?? "")
    if (!firstClass && !flexible) return toast.error("No eligible section is available")
    setBusyKey("create")
    try {
      await api("/student/me/enrollment", {
        method: "POST",
        body: JSON.stringify({
          yearLevel: profile.data?.yearLevel,
          sectionId: flexible ? undefined : firstClass?.sectionId,
        }),
      })
      await refresh()
      toast.success("Enrollment draft created")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to start enrollment")
    } finally {
      setBusyKey(undefined)
    }
  }

  async function add(scheduleId: string) {
    if (!enrollment.data?.id) return
    setBusyKey(scheduleId)
    try {
      await api(`/student/me/enrollment/${enrollment.data.id}/subjects`, {
        method: "POST",
        body: JSON.stringify({ scheduleId }),
      })
      await refresh()
      toast.success("Course added to your selected load")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to add course")
    } finally {
      setBusyKey(undefined)
    }
  }

  async function drop(subjectId: string) {
    if (!enrollment.data?.id) return
    setBusyKey(subjectId)
    try {
      await api(`/student/me/enrollment/${enrollment.data.id}/subjects/${subjectId}`, { method: "DELETE" })
      await refresh()
      toast.success("Course removed from your selected load")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to remove course")
    } finally {
      setBusyKey(undefined)
    }
  }

  async function submit() {
    if (!enrollment.data?.id) return
    setBusyKey("submit")
    try {
      await api(`/student/me/enrollment/${enrollment.data.id}/submit`, { method: "POST" })
      await refresh()
      toast.success("Enrollment submitted for registrar review")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to submit enrollment")
    } finally {
      setBusyKey(undefined)
    }
  }

  const current = enrollment.data
  const editable = current?.status === "DRAFT"
  const selected = current?.subjects?.filter((subject) => subject.status === "ENROLLED") ?? []
  const blockers = current?.validation?.blockingIssues ?? []

  return (
    <div className="mx-auto max-w-[1180px] p-5 md:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-semibold text-[#092f66]"><GraduationCap />Enrollment</h1>
          <p className="mt-2 text-slate-600">Build a valid load from normal-term courses, back subjects, deficiencies, and electives.</p>
        </div>
        {current?.status === "DRAFT" ? (
          <Button onClick={() => void submit()} disabled={busyKey === "submit" || !current.validation?.valid}>
            {busyKey === "submit" ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Send data-icon="inline-start" />}
            Submit for review
          </Button>
        ) : null}
      </div>

      <section className="mt-7 rounded-xl border bg-slate-50/50 p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm text-slate-500">Current enrollment</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <p className="text-xl font-semibold">{current?.sectionCode ?? (current ? "Mixed-section load" : "No active draft")}</p>
              {current?.status ? <Badge variant="outline">{current.status}</Badge> : null}
            </div>
            {current ? <p className="mt-1 text-sm text-slate-500">{current.schoolYear} · {current.semesterName.replaceAll("_", " ")} · {current.totalCreditUnits ?? 0} units</p> : null}
          </div>
          {!current ? (
            <Button onClick={() => void createDraft()} disabled={busyKey === "create" || profile.isLoading || classes.isLoading}>
              {busyKey === "create" ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <CheckCircle2 data-icon="inline-start" />}
              Start enrollment
            </Button>
          ) : null}
        </div>
      </section>

      {blockers.length ? (
        <Alert variant="destructive" className="mt-5">
          <AlertCircle />
          <AlertTitle>{blockers.length} issue{blockers.length === 1 ? "" : "s"} must be resolved</AlertTitle>
          <AlertDescription><ul className="mt-2 list-disc space-y-1 pl-5">{blockers.map((issue) => <li key={`${issue.code}-${issue.message}`}>{issue.message}</li>)}</ul></AlertDescription>
        </Alert>
      ) : current?.validation?.valid ? (
        <Alert className="mt-5 border-emerald-200 bg-emerald-50 text-emerald-900"><CheckCircle2 /><AlertTitle>Selected load is valid</AlertTitle><AlertDescription>It is ready to submit for Registrar review.</AlertDescription></Alert>
      ) : null}

      <section className="mt-6 overflow-hidden rounded-xl border">
        <header className="flex items-center justify-between border-b px-5 py-4">
          <div><h2 className="font-semibold">Selected load</h2><p className="text-sm text-slate-500">{selected.length} course{selected.length === 1 ? "" : "s"}</p></div>
          <Badge variant="secondary">{current?.totalCreditUnits ?? 0} units</Badge>
        </header>
        {selected.length ? <div className="divide-y">{selected.map((subject) => (
          <article key={subject.id} className="grid gap-3 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
            <div><p className="font-semibold">{subject.courseCode} · {subject.courseTitle}</p><p className="mt-1 text-sm text-slate-500"><Clock3 className="mr-1 inline size-3.5" />{meetingsLabel(subject.meetings)} · {subject.sectionCode} · {subject.roomCode ?? "TBA"}</p></div>
            {editable ? <Button variant="ghost" size="sm" onClick={() => void drop(subject.id)} disabled={busyKey === subject.id}>{busyKey === subject.id ? <Loader2 className="animate-spin" /> : <Trash2 />}<span className="sm:sr-only">Remove {subject.courseCode}</span></Button> : null}
          </article>
        ))}</div> : <p className="p-8 text-center text-sm text-slate-500">Start a draft and choose courses below.</p>}
      </section>

      <section className="mt-6 overflow-hidden rounded-xl border">
        <header className="border-b px-5 py-4"><h2 className="font-semibold">Available classes</h2><p className="text-sm text-slate-500">Course rules, seat availability, and schedule conflicts are checked when you add and submit.</p></header>
        <div className="divide-y">
          {classes.data?.map((item) => (
            <article key={item.scheduleId} className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_230px_145px] lg:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{item.courseCode} · {item.courseTitle}</p><Badge variant={item.backSubject ? "destructive" : item.requiredStatus === "ELECTIVE" ? "secondary" : "outline"}>{item.recommendationType.replaceAll("_", " ")}</Badge></div>
                <p className="mt-1 text-sm text-slate-500">Year {item.curriculumYearLevel} · {item.requiredStatus} · {item.units} units</p>
                <p className="mt-2 text-sm"><Clock3 className="mr-1 inline size-3.5 text-slate-400" />{meetingsLabel(item.meetings)}</p>
              </div>
              <div className="text-sm"><p>{item.sectionCode} · {item.roomCode ?? "TBA"}</p><p className="mt-1 text-slate-500">{item.faculty || "Faculty TBA"}</p><p className="mt-1"><Users className="mr-1 inline size-3.5 text-slate-400" />{Math.max(0, Number(item.availableSeats))} seats available</p></div>
              <Button variant={item.selected ? "secondary" : "outline"} disabled={!editable || item.selected || Number(item.availableSeats) <= 0 || busyKey === item.scheduleId} onClick={() => void add(item.scheduleId)}>
                {busyKey === item.scheduleId ? <Loader2 className="animate-spin" data-icon="inline-start" /> : item.selected ? <CheckCircle2 data-icon="inline-start" /> : <Plus data-icon="inline-start" />}
                {item.selected ? "Selected" : "Add course"}
              </Button>
            </article>
          ))}
          {!classes.isLoading && !classes.data?.length ? <p className="p-8 text-center text-sm text-slate-500">No unsatisfied curriculum courses are currently offered.</p> : null}
        </div>
      </section>
    </div>
  )
}
