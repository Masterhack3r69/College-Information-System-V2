import { BookOpen, Clock3, Download, FileSearch, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { openPdf } from "@/lib/api"
import {
  useStudentAcademicEvaluations,
  useStudentAcademicPlan,
  useStudentAttendance,
  useStudentCourseCredits,
  useStudentGrades,
  useStudentGraduationAudits,
  useStudentProgress,
} from "@/hooks/use-student-portal"

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (["COMPLETED", "CREDITED", "APPROVED", "ELIGIBLE"].includes(status)) return "default"
  if (["FAILED", "MISSING", "REJECTED", "NOT_ELIGIBLE"].includes(status)) return "destructive"
  if (["ENROLLED", "PENDING_EVALUATION", "PENDING_ACADEMIC_REVIEW", "PENDING_REGISTRAR_APPROVAL"].includes(status)) return "secondary"
  return "outline"
}

export default function StudentAcademicsPage() {
  const grades = useStudentGrades()
  const progress = useStudentProgress()
  const attendance = useStudentAttendance()
  const plan = useStudentAcademicPlan()
  const credits = useStudentCourseCredits()
  const evaluations = useStudentAcademicEvaluations()
  const audits = useStudentGraduationAudits()
  const requiredUnits = Number(progress.data?.requiredUnits ?? 0)
  const earnedUnits = Number(plan.data?.earnedUnits ?? progress.data?.completedUnits ?? 0)
  const pct = requiredUnits ? Math.min(100, Math.round((earnedUnits / requiredUnits) * 100)) : 0

  return (
    <div className="mx-auto max-w-[1220px] p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]"><BookOpen />Academics</h1><p className="mt-2 text-muted-foreground">Academic plan, posted grades, approved credits, evaluations, and graduation audits.</p></div>
        <Button variant="outline" onClick={() => void openPdf("/student/me/grade-report")}><Download data-icon="inline-start" />Unofficial grade report</Button>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Earned units" value={earnedUnits} detail={`${pct}% of listed curriculum units`} />
        <Metric label="Completed courses" value={plan.data?.completedCourses ?? 0} detail="Institutional records" />
        <Metric label="Credited courses" value={plan.data?.creditedCourses ?? 0} detail="Approved prior study" />
        <Metric label="Open requirements" value={plan.data?.missingCourses ?? 0} detail={`${plan.data?.pendingEvaluations ?? 0} pending evaluation`} />
      </div>
      <Progress value={pct} className="mt-4" />

      <Tabs defaultValue="plan" className="mt-7">
        <TabsList>
          <TabsTrigger value="plan">Academic Plan</TabsTrigger><TabsTrigger value="grades">Posted Grades</TabsTrigger>
          <TabsTrigger value="credits">Credits & Evaluations</TabsTrigger><TabsTrigger value="audit">Graduation Audit</TabsTrigger><TabsTrigger value="attendance">Attendance</TabsTrigger>
        </TabsList>

        <TabsContent value="plan"><div className="mt-5 overflow-hidden rounded-lg border"><Table><TableHeader><TableRow><TableHead>Course</TableHead><TableHead>Curriculum term</TableHead><TableHead>Requirement</TableHead><TableHead>Status</TableHead><TableHead>Detail</TableHead></TableRow></TableHeader><TableBody>
          {plan.data?.items.map((item) => <TableRow key={item.curriculumCourseId}><TableCell><p className="font-medium">{item.courseCode}</p><p className="text-xs text-muted-foreground">{item.courseTitle} · {item.creditUnits} units</p></TableCell><TableCell>Year {item.yearLevel} · {item.semester.replaceAll("_", " ")}</TableCell><TableCell>{item.requirement}</TableCell><TableCell><Badge variant={statusVariant(item.status)}>{item.status.replaceAll("_", " ")}</Badge></TableCell><TableCell className="max-w-64 text-sm text-muted-foreground">{item.detail ?? "—"}</TableCell></TableRow>)}
        </TableBody></Table>{!plan.isLoading && !plan.data?.items.length ? <Empty text="No curriculum requirements are available." /> : null}</div></TabsContent>

        <TabsContent value="grades"><div className="mt-5 overflow-hidden rounded-lg border"><Table><TableHeader><TableRow><TableHead>Term</TableHead><TableHead>Course</TableHead><TableHead>Units</TableHead><TableHead>Grade</TableHead><TableHead>Remarks</TableHead></TableRow></TableHeader><TableBody>
          {grades.data?.map((item) => <TableRow key={item.id}><TableCell>{item.schoolYear} · {item.semesterName.replaceAll("_", " ")}</TableCell><TableCell><p className="font-medium">{item.courseCode}</p><p className="text-xs text-muted-foreground">{item.courseTitle}</p></TableCell><TableCell>{item.units}</TableCell><TableCell className="font-semibold text-primary">{item.grade}</TableCell><TableCell>{item.remarks}</TableCell></TableRow>)}
        </TableBody></Table></div></TabsContent>

        <TabsContent value="credits"><div className="mt-5 grid gap-5 lg:grid-cols-2">
          <section className="overflow-hidden rounded-lg border"><header className="border-b p-4"><h2 className="font-semibold">Posted course credits</h2><p className="text-sm text-muted-foreground">Credits satisfy curriculum and prerequisite rules without affecting institutional GPA.</p></header><div className="divide-y">{credits.data?.map((credit) => <article key={credit.id} className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{credit.courseCode} · {credit.courseTitle}</p><p className="mt-1 text-sm text-muted-foreground">{credit.sourceLabel}</p></div><Badge variant={credit.active === false ? "outline" : "default"}>{credit.active === false ? "REVERSED" : `${credit.creditedUnits} UNITS`}</Badge></div></article>)}{!credits.isLoading && !credits.data?.length ? <Empty text="No course credits have been posted." /> : null}</div></section>
          <section className="overflow-hidden rounded-lg border"><header className="border-b p-4"><h2 className="font-semibold">Evaluation cases</h2><p className="text-sm text-muted-foreground">Track transfer, shifting, second-degree, and migration reviews.</p></header><div className="divide-y">{evaluations.data?.map((evaluation) => <article key={evaluation.id} className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{evaluation.evaluationType.replaceAll("_", " ")}</p><p className="mt-1 text-sm text-muted-foreground">Target: {evaluation.targetCurriculumCode} · {evaluation.sourceCourseCount} source courses</p></div><Badge variant={statusVariant(evaluation.status)}>{evaluation.status.replaceAll("_", " ")}</Badge></div></article>)}{!evaluations.isLoading && !evaluations.data?.length ? <Empty text="No academic evaluations are on file." /> : null}</div></section>
        </div></TabsContent>

        <TabsContent value="audit"><div className="mt-5 overflow-hidden rounded-lg border"><div className="divide-y">{audits.data?.map((audit) => <article key={audit.id} className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center"><div className="flex gap-3"><FileSearch className="mt-1 size-5 text-primary" /><div><p className="font-medium">Academic graduation audit</p><p className="mt-1 text-sm text-muted-foreground">{new Date(audit.auditedAt).toLocaleString()} · {audit.earnedUnits} of {audit.totalRequiredUnits} required units</p><p className="mt-1 text-sm text-muted-foreground">{audit.missingRequiredCount} missing required · {audit.unmetElectiveGroupCount} unmet elective groups · {audit.pendingEvaluationCount} pending</p></div></div><Badge variant={statusVariant(audit.result)}>{audit.result.replaceAll("_", " ")}</Badge></article>)}{!audits.isLoading && !audits.data?.length ? <div className="p-10 text-center"><ShieldCheck className="mx-auto size-8 text-muted-foreground/60" /><p className="mt-3 text-sm text-muted-foreground">No graduation audit has been run yet.</p></div> : null}</div></div></TabsContent>

        <TabsContent value="attendance"><div className="mt-5 overflow-hidden rounded-lg border"><Table><TableHeader><TableRow><TableHead>Course</TableHead><TableHead>Meetings</TableHead><TableHead>Present</TableHead><TableHead>Late</TableHead><TableHead>Absent</TableHead><TableHead>Excused</TableHead></TableRow></TableHeader><TableBody>
          {attendance.data?.map((item, index) => <TableRow key={index}><TableCell className="font-medium">{item.courseCode}</TableCell><TableCell>{item.meetings}</TableCell><TableCell>{item.present}</TableCell><TableCell>{item.late}</TableCell><TableCell>{item.absent}</TableCell><TableCell>{item.excused}</TableCell></TableRow>)}
        </TableBody></Table>{attendance.data?.length === 0 ? <Empty text="Attendance is not currently available." /> : null}</div></TabsContent>
      </Tabs>
    </div>
  )
}

function Metric({ label, value, detail }: { label: string; value: number; detail: string }) { return <section className="rounded-lg border p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-semibold text-primary">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></section> }
function Empty({ text }: { text: string }) { return <p className="p-8 text-center text-sm text-muted-foreground"><Clock3 className="mx-auto mb-2 size-5 text-muted-foreground/60" />{text}</p> }
