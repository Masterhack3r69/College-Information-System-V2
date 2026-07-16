import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Download,
  FileClock,
  Filter,
  Loader2,
  Search,
  ShieldCheck,
  TriangleAlert,
  UserRound,
  X,
  Eye,
  Play,
  Ban,
  Undo2,
  KeyRound,
} from "lucide-react"
import { toast } from "sonner"
import { api, ApiError, openPdf } from "@/lib/api"
import type {
  Assessment,
  Enrollment,
  EnrollmentValidation,
  PageResponse,
  Schedule,
  Student,
  StudentSummary,
  Section,
} from "@/lib/types"
import { useAuth } from "@/lib/auth"
import { useAcademicTerm } from "@/lib/academic-term-context"

type EnrollmentHistoryEntry = { id: string; fromStatus?: string; toStatus: string; remarks?: string; changedAt: string }
type CancellationReadiness = { ready: boolean; financeResolved: boolean; hasAttendance: boolean; hasGrades: boolean; hasLockedAcademicRecords: boolean; blockers: { code: string; message: string }[] }
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const meetings = (schedule: {
  meetings: { dayOfWeek: string; startTime: string; endTime: string }[]
}) => (
  <div className="space-y-0.5">
    {schedule.meetings.map((m, i) => (
      <div key={i}>
        {m.dayOfWeek.slice(0, 3)} {m.startTime.slice(0, 5)}–
        {m.endTime.slice(0, 5)}
      </div>
    ))}
  </div>
)

function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0
  const parts = timeStr.split(":")
  const hours = parseInt(parts[0], 10) || 0
  const minutes = parseInt(parts[1], 10) || 0
  return hours * 60 + minutes
}

function hasFrontendMeetingConflict(s1: Schedule, s2: Schedule): boolean {
  if (!s1.meetings || !s2.meetings) return false
  for (const m1 of s1.meetings) {
    for (const m2 of s2.meetings) {
      if (m1.dayOfWeek.toUpperCase() === m2.dayOfWeek.toUpperCase()) {
        const start1 = timeToMinutes(m1.startTime)
        const end1 = timeToMinutes(m1.endTime)
        const start2 = timeToMinutes(m2.startTime)
        const end2 = timeToMinutes(m2.endTime)

        if (start1 < end2 && start2 < end1) {
          return true
        }
      }
    }
  }
  return false
}

export function EnrollmentPage() {
  const qc = useQueryClient()
  const { can } = useAuth()
  const academicTerm = useAcademicTerm()

  // Tab state
  const [activeTab, setActiveTab] = useState("builder")

  // Builder States
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<string>()
  const yearId = academicTerm.schoolYearId
  const semesterId = academicTerm.semesterId
  const [yearLevelOverride, setYearLevelOverride] = useState<number>()
  const [sectionChoice, setSectionChoice] = useState("")

  // Records Tab States
  const [recSearch, setRecSearch] = useState("")
  const [recYearId, setRecYearId] = useState("ALL")
  const [recSemesterId, setRecSemesterId] = useState("ALL")
  const [recStatus, setRecStatus] = useState("ALL")
  const [recPage, setRecPage] = useState(0)
  const [recSize] = useState(10)

  // Dialog/Sheet states
  const [inspectingId, setInspectingId] = useState<string | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState("")
  const [returnReason, setReturnReason] = useState("")
  const [approvalReason, setApprovalReason] = useState("")
  const [provisionedCredentials, setProvisionedCredentials] = useState<{
    username: string
    initialPassword: string
  } | null>(null)

  // Queries for active builder
  const students = useQuery({
    queryKey: ["students", search],
    queryFn: () =>
      api<PageResponse<StudentSummary>>(
        `/students?search=${encodeURIComponent(search)}&size=8`
      ),
  })
  const student = useQuery({
    queryKey: ["student", selectedId],
    queryFn: () => api<Student>(`/students/${selectedId}`),
    enabled: !!selectedId,
  })
  const sections = useQuery({
    queryKey: ["sections", "enrollment"],
    queryFn: () => api<PageResponse<Section>>("/sections?size=500"),
  })

  const yearLevel = yearLevelOverride ?? student.data?.academic.yearLevel ?? 1

  const existing = useQuery({
    queryKey: ["enrollment", selectedId, yearId, semesterId],
    queryFn: async () => {
      const page = await api<PageResponse<{ id: string; status: string }>>(
        `/enrollments?studentId=${selectedId}&schoolYearId=${yearId}&semesterId=${semesterId}&size=10`
      )
      const active = page.items.find((x) => x.status !== "CANCELLED")
      if (!active) return null
      return api<Enrollment>(`/enrollments/${active.id}`)
    },
    enabled: !!selectedId && !!yearId && !!semesterId,
  })
  const flexible =
    student.data?.academic.classification === "IRREGULAR" ||
    student.data?.academic.classification === "CROSS_ENROLLEE"
  const eligibleSections =
    sections.data?.items.filter(
      (x) =>
        x.status === "ACTIVE" &&
        x.programId === student.data?.academic.programId &&
        x.curriculumId === student.data?.academic.curriculumId &&
        x.schoolYearId === yearId &&
        x.semesterId === semesterId &&
        x.yearLevel === yearLevel
    ) ?? []
  const assignmentReady = flexible
    ? !!sectionChoice
    : !!sectionChoice && sectionChoice !== "__mixed__"
  const scheduleSectionQuery =
    sectionChoice && sectionChoice !== "__mixed__"
      ? `&sectionId=${sectionChoice}`
      : ""
  const schedules = useQuery({
    queryKey: [
      "schedules",
      yearId,
      semesterId,
      student.data?.academic.programId,
      yearLevel,
      sectionChoice,
    ],
    queryFn: () =>
      api<PageResponse<Schedule>>(
        `/schedules?schoolYearId=${yearId}&semesterId=${semesterId}&programId=${student.data!.academic.programId}${scheduleSectionQuery}&status=ACTIVE&size=100`
      ),
    enabled:
      !!yearId &&
      !!semesterId &&
      !!student.data?.academic.programId &&
      assignmentReady,
  })
  const enrollment = existing.data
  const selectedScheduleIds = new Set(
    enrollment?.subjects
      .filter((x) => x.status === "ENROLLED")
      .map((x) => x.scheduleId)
  )
  const assessment = useQuery({
    queryKey: ["assessment", enrollment?.id],
    queryFn: () => api<Assessment>(`/enrollments/${enrollment!.id}/assessment`),
    enabled: enrollment?.status === "CONFIRMED",
    retry: false,
  })

  // Active builder Mutations
  const refreshEnrollment = () =>
    qc.invalidateQueries({
      queryKey: ["enrollment", selectedId, yearId, semesterId],
    })
  const create = useMutation({
    mutationFn: () =>
      api<Enrollment>("/enrollments", {
        method: "POST",
        body: JSON.stringify({
          studentId: selectedId,
          schoolYearId: yearId,
          semesterId,
          yearLevel,
          sectionId: sectionChoice === "__mixed__" ? null : sectionChoice,
          remarks: "",
        }),
      }),
    onSuccess: () => {
      toast.success("Draft enrollment created")
      void refreshEnrollment()
    },
    onError: notify,
  })
  const add = useMutation({
    mutationFn: (scheduleId: string) =>
      api<Enrollment>(`/enrollments/${enrollment!.id}/subjects`, {
        method: "POST",
        body: JSON.stringify({ scheduleId }),
      }),
    onSuccess: refreshEnrollment,
    onError: notify,
  })
  const drop = useMutation({
    mutationFn: (subjectId: string) =>
      api<Enrollment>(`/enrollments/${enrollment!.id}/subjects/${subjectId}`, {
        method: "DELETE",
      }),
    onSuccess: refreshEnrollment,
    onError: notify,
  })
  const validate = useMutation({
    mutationFn: () =>
      api<EnrollmentValidation>(`/enrollments/${enrollment!.id}/validate`, {
        method: "POST",
      }),
    onSuccess: () => {
      toast.success("Enrollment validation completed")
      void refreshEnrollment()
    },
    onError: notify,
  })
  const confirm = useMutation({
    mutationFn: () =>
      api<{
        enrollment: Enrollment
        account: {
          created: boolean
          username: string
          initialPassword?: string
          passwordChangeRequired: boolean
        }
      }>(`/enrollments/${enrollment!.id}/confirm`, { method: "POST" }),
    onSuccess: (result) => {
      toast.success("Enrollment confirmed")
      if (result.account.created && result.account.initialPassword) {
        setProvisionedCredentials({
          username: result.account.username,
          initialPassword: result.account.initialPassword,
        })
      }
      void refreshEnrollment()
    },
    onError: notify,
  })
  const validation = validate.data ?? enrollment?.validation

  // Records Tab Query
  const recordsParams = new URLSearchParams()
  if (recSearch.trim()) recordsParams.append("search", recSearch.trim())
  if (recYearId && recYearId !== "ALL")
    recordsParams.append("schoolYearId", recYearId)
  if (recSemesterId && recSemesterId !== "ALL")
    recordsParams.append("semesterId", recSemesterId)
  if (recStatus && recStatus !== "ALL")
    recordsParams.append("status", recStatus)
  recordsParams.append("page", String(recPage))
  recordsParams.append("size", String(recSize))

  const enrollmentsQuery = useQuery({
    queryKey: [
      "enrollments",
      recSearch,
      recYearId,
      recSemesterId,
      recStatus,
      recPage,
      recSize,
    ],
    queryFn: () =>
      api<PageResponse<Enrollment>>(`/enrollments?${recordsParams.toString()}`),
  })

  // Inspect detail queries
  const inspectingEnrollment = useQuery({
    queryKey: ["enrollment-detail", inspectingId],
    queryFn: () => api<Enrollment>(`/enrollments/${inspectingId}`),
    enabled: !!inspectingId,
  })

  const inspectingStudent = useQuery({
    queryKey: ["student-detail", inspectingEnrollment.data?.studentId],
    queryFn: () =>
      api<Student>(`/students/${inspectingEnrollment.data?.studentId}`),
    enabled: !!inspectingEnrollment.data?.studentId,
  })

  const inspectingAssessment = useQuery({
    queryKey: ["assessment-detail", inspectingId],
    queryFn: () => api<Assessment>(`/enrollments/${inspectingId}/assessment`),
    enabled:
      !!inspectingId && inspectingEnrollment.data?.status === "CONFIRMED",
    retry: false,
  })

  const enrollmentHistory = useQuery({
    queryKey: ["enrollment-history", inspectingId],
    queryFn: () => api<EnrollmentHistoryEntry[]>(`/enrollments/${inspectingId}/history`),
    enabled: !!inspectingId,
  })

  const cancellationReadiness = useQuery({
    queryKey: ["enrollment-cancellation-readiness", cancellingId],
    queryFn: () => api<CancellationReadiness>(`/enrollments/${cancellingId}/cancellation-readiness`),
    enabled: !!cancellingId,
  })

  // Cancel Mutation
  const cancel = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api<Enrollment>(`/enrollments/${id}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => {
      toast.success("Enrollment cancelled")
      void qc.invalidateQueries({ queryKey: ["enrollments"] })
      void qc.invalidateQueries({ queryKey: ["enrollment-detail"] })
      void qc.invalidateQueries({ queryKey: ["enrollment-history"] })
      void qc.invalidateQueries({ queryKey: ["enrollment-cancellation-readiness"] })
      void refreshEnrollment()
    },
    onError: notify,
  })

  const returnToDraft = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => api<Enrollment>(`/enrollments/${id}/return-to-draft`, { method: "POST", body: JSON.stringify({ reason }) }),
    onSuccess: async () => { toast.success("Enrollment returned to draft"); setReturnReason(""); await Promise.all([qc.invalidateQueries({ queryKey: ["enrollments"] }), qc.invalidateQueries({ queryKey: ["enrollment-detail"] }), qc.invalidateQueries({ queryKey: ["enrollment-history"] })]) },
    onError: notify,
  })

  const approveEligibility = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => api(`/enrollments/${id}/eligibility-approval`, { method: "POST", body: JSON.stringify({ reason }) }),
    onSuccess: async () => { toast.success("Enrollment eligibility approved"); setApprovalReason(""); await qc.invalidateQueries({ queryKey: ["enrollment-detail"] }) },
    onError: notify,
  })

  function toggle(schedule: Schedule) {
    if (!enrollment) return
    const subject = enrollment.subjects.find(
      (x) => x.scheduleId === schedule.id && x.status === "ENROLLED"
    )
    if (subject) drop.mutate(subject.id)
    else add.mutate(schedule.id)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return <Badge variant="secondary">DRAFT</Badge>
      case "CONFIRMED":
        return (
          <Badge
            className="border-emerald-600/20 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            variant="outline"
          >
            CONFIRMED
          </Badge>
        )
      case "CANCELLED":
        return <Badge variant="destructive">CANCELLED</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const summary = (
    <EnrollmentSummary
      enrollment={enrollment}
      assessment={assessment.data}
      assessmentPending={assessment.isError}
      canReport={can("REPORT_GENERATE")}
      onRemove={(id) => drop.mutate(id)}
      onCancel={(id) => setCancellingId(id)}
    />
  )

  return (
    <div className="mx-auto max-w-[1540px] p-4 md:p-6 lg:p-7">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#0b1f3a]">
            Enrollment Workspace
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Build, validate, and confirm a student’s academic load.
          </p>
        </div>
        {activeTab === "builder" && enrollment && (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="lg:hidden">
                Summary{" "}
                {enrollment && (
                  <Badge className="ml-1">{enrollment.subjectCount}</Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Enrollment Summary</SheetTitle>
              </SheetHeader>
              <div className="p-4">{summary}</div>
            </SheetContent>
          </Sheet>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="builder">Enroll Student</TabsTrigger>
          <TabsTrigger value="records">Enrollment Records</TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="space-y-4">
          <div className="mb-4 grid gap-3 md:grid-cols-[1fr_220px_200px]">
            <div className="relative">
              <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
              <Input
                aria-label="Search students"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                placeholder="Search student number or name"
              />
            </div>
            <Select value={yearId} onValueChange={(value) => academicTerm.setTerm(value, semesterId)}>
              <SelectTrigger>
                <SelectValue placeholder="School year" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {academicTerm.schoolYears.map((x) => (
                    <SelectItem key={x.id} value={x.id}>
                      {x.schoolYear}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Select value={semesterId} onValueChange={(value) => academicTerm.setTerm(yearId, value)}>
              <SelectTrigger>
                <SelectValue placeholder="Semester" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {academicTerm.semesters.map((x) => (
                    <SelectItem key={x.id} value={x.id}>
                      {x.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {!selectedId && (
            <section className="rounded-lg border">
              <div className="border-b px-4 py-3 text-sm font-medium">
                Select a student
              </div>
              {students.isLoading ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Searching students…
                </div>
              ) : students.data?.items.length ? (
                students.data.items.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSelectedId(s.id)
                      setYearLevelOverride(undefined)
                      setSectionChoice("")
                    }}
                    className="flex w-full items-center justify-between border-b px-4 py-3 text-left last:border-0 hover:bg-slate-50"
                  >
                    <span>
                      <b className="font-medium text-[#0b1f3a]">{s.fullName}</b>
                      <span className="ml-3 text-sm text-muted-foreground">
                        {s.studentNumber} · {s.programCode}
                      </span>
                    </span>
                    <Badge variant="outline">{s.status}</Badge>
                  </button>
                ))
              ) : (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  No students found. Try another name or student number.
                </div>
              )}
            </section>
          )}

          {selectedId && student.data && (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="min-w-0 space-y-4">
                <StudentContext
                  student={student.data}
                  onClear={() => {
                    setSelectedId(undefined)
                    setYearLevelOverride(undefined)
                    setSectionChoice("")
                  }}
                />

                {!enrollment && (
                  <section className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Enrollment Year Level
                      </label>
                      <Select
                        value={String(yearLevel)}
                        onValueChange={(value) => {
                          setYearLevelOverride(Number(value))
                          setSectionChoice("")
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6].map((value) => (
                            <SelectItem key={value} value={String(value)}>
                              Year {value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Section</label>
                      <Select
                        value={sectionChoice}
                        onValueChange={setSectionChoice}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select section" />
                        </SelectTrigger>
                        <SelectContent>
                          {flexible && (
                            <SelectItem value="__mixed__">
                              Mixed sections
                            </SelectItem>
                          )}
                          {eligibleSections.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.sectionCode}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {eligibleSections.length
                          ? `${eligibleSections.length} matching section(s)`
                          : "No active sections match this curriculum and term."}
                      </p>
                    </div>
                  </section>
                )}

                {!enrollment ? (
                  <div className="rounded-lg border border-dashed p-10 text-center">
                    <CalendarDays className="mx-auto mb-3 size-8 text-muted-foreground" />
                    <h2 className="font-medium">No enrollment for this term</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Assign a section, then create a draft to select class
                      schedules.
                    </p>
                    <Button
                      className="mt-5"
                      onClick={() => create.mutate()}
                      disabled={
                        !yearId ||
                        !semesterId ||
                        !assignmentReady ||
                        create.isPending
                      }
                    >
                      {create.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Create draft enrollment
                    </Button>
                  </div>
                ) : (
                  <>
                    <ScheduleTable
                      schedules={schedules.data?.items ?? []}
                      selected={selectedScheduleIds}
                      locked={enrollment.status !== "DRAFT"}
                      busy={add.isPending || drop.isPending}
                      onToggle={toggle}
                    />

                    <ValidationPanel validation={validation} />

                    <div className="flex justify-end gap-3 rounded-lg border p-4">
                      <Button
                        variant="outline"
                        onClick={() => validate.mutate()}
                        disabled={
                          validate.isPending || enrollment.status !== "DRAFT"
                        }
                      >
                        {validate.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        <ShieldCheck className="mr-1.5 h-4 w-4" />
                        Validate Enrollment
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            disabled={
                              !validation?.valid ||
                              !["DRAFT", "SUBMITTED"].includes(
                                enrollment.status
                              )
                            }
                          >
                            <CheckCircle2 className="mr-1.5 h-4 w-4" />
                            Confirm Enrollment
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Confirm this enrollment?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This locks the selected subjects and makes the
                              enrollment available for assessment and official
                              reports.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Review again</AlertDialogCancel>
                            <AlertDialogAction onClick={() => confirm.mutate()}>
                              Confirm enrollment
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </>
                )}
              </div>
              <aside className="hidden lg:block">{summary}</aside>
            </div>
          )}
        </TabsContent>

        <TabsContent value="records" className="space-y-4">
          {/* Records Filters */}
          <div className="mb-4 grid gap-3 sm:grid-cols-2 md:grid-cols-5">
            <div className="relative md:col-span-2">
              <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
              <Input
                aria-label="Search records"
                value={recSearch}
                onChange={(e) => {
                  setRecSearch(e.target.value)
                  setRecPage(0)
                }}
                className="pl-9"
                placeholder="Search name, number, or program"
              />
            </div>

            <Select
              value={recYearId}
              onValueChange={(val) => {
                setRecYearId(val)
                setRecPage(0)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="School Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="ALL">All School Years</SelectItem>
                  {academicTerm.schoolYears.map((x) => (
                    <SelectItem key={x.id} value={x.id}>
                      {x.schoolYear}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select
              value={recSemesterId}
              onValueChange={(val) => {
                setRecSemesterId(val)
                setRecPage(0)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Semester" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="ALL">All Semesters</SelectItem>
                  {academicTerm.semesters.map((x) => (
                    <SelectItem key={x.id} value={x.id}>
                      {x.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select
              value={recStatus}
              onValueChange={(val) => {
                setRecStatus(val)
                setRecPage(0)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="SUBMITTED">Submitted</SelectItem>
                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Records Table */}
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Program & Year</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollmentsQuery.isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-32 text-center text-muted-foreground"
                    >
                      <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-primary" />
                      Loading enrollment records...
                    </TableCell>
                  </TableRow>
                ) : enrollmentsQuery.data?.items.length ? (
                  enrollmentsQuery.data.items.map((item) => {
                    const displaySection = item.sectionCode
                      ?.toUpperCase()
                      .startsWith("MIXED")
                      ? "Mixed sections"
                      : item.sectionCode || "—"

                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <p className="text-sm font-semibold text-[#0b1f3a]">
                            {item.studentName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.studentNumber}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{item.programCode}</p>
                          <p className="text-xs text-muted-foreground">
                            Year {item.yearLevel}
                          </p>
                        </TableCell>
                        <TableCell className="text-sm">
                          {displaySection}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{item.schoolYear}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.semesterName}
                          </p>
                        </TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setInspectingId(item.id)}
                              title="Inspect Details"
                            >
                              <Eye className="mr-1 h-4 w-4 text-[#0b1f3a]" />
                              Inspect
                            </Button>

                            {item.status === "DRAFT" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedId(item.studentId)
                                  academicTerm.setTerm(item.schoolYearId, item.semesterId)
                                  setYearLevelOverride(item.yearLevel)
                                  setSectionChoice(
                                    item.sectionId ?? "__mixed__"
                                  )
                                  setActiveTab("builder")
                                }}
                                title="Resume Draft"
                                className="text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
                              >
                                <Play className="mr-1 h-4 w-4" />
                                Resume
                              </Button>
                            )}

                            {(item.status === "DRAFT" ||
                              item.status === "CONFIRMED") && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setCancellingId(item.id)}
                                title="Cancel Enrollment"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Ban className="mr-1 h-4 w-4" />
                                Cancel
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-32 text-center text-muted-foreground"
                    >
                      No enrollment records found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Records Pagination */}
          {!enrollmentsQuery.isLoading &&
            enrollmentsQuery.data &&
            enrollmentsQuery.data.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {enrollmentsQuery.data.items.length} of{" "}
                  {enrollmentsQuery.data.totalElements} records
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRecPage((p) => Math.max(0, p - 1))}
                    disabled={recPage === 0}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {recPage + 1} of {enrollmentsQuery.data.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setRecPage((p) =>
                        Math.min(enrollmentsQuery.data.totalPages - 1, p + 1)
                      )
                    }
                    disabled={recPage >= enrollmentsQuery.data.totalPages - 1}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
        </TabsContent>
      </Tabs>

      {/* Inspect dialog / sheet */}
      <Dialog
        open={!!inspectingId}
        onOpenChange={(open) => {
          if (!open) setInspectingId(null)
        }}
      >
        <DialogContent className="max-h-[90vh] w-full max-w-2xl overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Enrollment Details</DialogTitle>
            <DialogDescription>
              Detailed view of student enrollment record and class schedules.
            </DialogDescription>
          </DialogHeader>
          {cancellationReadiness.isLoading ? <div className="flex items-center gap-2 rounded-md border p-3 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Checking Finance and academic activity…</div> : cancellationReadiness.data && !cancellationReadiness.data.ready ? <Alert variant="destructive"><Ban /><AlertTitle>Cancellation is blocked</AlertTitle><AlertDescription><ul className="mt-2 list-disc space-y-1 pl-5">{cancellationReadiness.data.blockers.map((blocker) => <li key={blocker.code}>{blocker.message}</li>)}</ul></AlertDescription></Alert> : cancellationReadiness.data?.ready ? <Alert><CheckCircle2 /><AlertTitle>Ready to cancel</AlertTitle><AlertDescription>No attendance, grade, locked academic, or unresolved Finance activity was found.</AlertDescription></Alert> : null}

          {inspectingEnrollment.isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : inspectingEnrollment.data ? (
            <div className="mt-4 space-y-6">
              {/* Student details and Academic profile */}
              <section className="rounded-lg border bg-slate-50/50 p-4">
                <h3 className="mb-3 text-sm font-semibold text-[#0b1f3a]">
                  Student Details & Academic Profile
                </h3>
                <div className="grid gap-4 text-sm sm:grid-cols-2 md:grid-cols-3">
                  <div>
                    <span className="block text-xs text-muted-foreground">
                      Student Name
                    </span>
                    <span className="font-medium">
                      {inspectingEnrollment.data.studentName}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs text-muted-foreground">
                      Student Number
                    </span>
                    <span className="font-medium">
                      {inspectingEnrollment.data.studentNumber}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs text-muted-foreground">
                      Program
                    </span>
                    <span className="font-medium">
                      {inspectingEnrollment.data.programCode}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs text-muted-foreground">
                      Year Level
                    </span>
                    <span className="font-medium">
                      Year {inspectingEnrollment.data.yearLevel}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs text-muted-foreground">
                      Classification
                    </span>
                    <span className="font-medium">
                      {inspectingStudent.data?.academic.classification?.replaceAll(
                        "_",
                        " "
                      ) ?? "—"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs text-muted-foreground">
                      Academic Status
                    </span>
                    <span className="font-medium">
                      {inspectingStudent.data?.academic.academicStatus?.replaceAll(
                        "_",
                        " "
                      ) ?? "—"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs text-muted-foreground">
                      Curriculum Code
                    </span>
                    <span className="font-medium">
                      {inspectingStudent.data?.academic.curriculumCode ?? "—"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs text-muted-foreground">
                      Term
                    </span>
                    <span className="font-medium">
                      {inspectingEnrollment.data.schoolYear} /{" "}
                      {inspectingEnrollment.data.semesterName}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs text-muted-foreground">
                      Status
                    </span>
                    <div className="mt-0.5">
                      {getStatusBadge(inspectingEnrollment.data.status)}
                    </div>
                  </div>
                </div>
              </section>

              {/* Enrolled subjects in a table */}
              <section className="overflow-hidden rounded-lg border">
                <div className="border-b bg-slate-50 px-4 py-2 text-sm font-medium text-[#0b1f3a]">
                  Enrolled Subjects
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Room</TableHead>
                      <TableHead>Faculty</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead className="text-right">Units</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inspectingEnrollment.data.subjects?.length ? (
                      inspectingEnrollment.data.subjects.map((sub) => (
                        <TableRow key={sub.id}>
                          <TableCell>
                            <p className="text-xs font-medium">
                              {sub.courseCode}
                            </p>
                            <p
                              className="max-w-40 truncate text-[10px] text-muted-foreground"
                              title={sub.courseTitle}
                            >
                              {sub.courseTitle}
                            </p>
                          </TableCell>
                          <TableCell className="text-xs">
                            {sub.sectionCode}
                          </TableCell>
                          <TableCell className="text-xs">
                            {sub.roomCode}
                          </TableCell>
                          <TableCell className="text-xs">
                            {sub.facultyName}
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            {meetings(sub)}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {sub.creditUnits}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="py-6 text-center text-sm text-muted-foreground"
                        >
                          No subjects enrolled.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                <div className="flex justify-between border-t bg-slate-50/50 px-4 py-3 text-sm font-semibold">
                  <span>Total Units</span>
                  <span>{inspectingEnrollment.data.totalCreditUnits}</span>
                </div>
              </section>

              <section className="rounded-lg border bg-slate-50/50 p-4">
                <h3 className="mb-3 text-sm font-semibold text-[#0b1f3a]">Status History</h3>
                <div className="space-y-4">{enrollmentHistory.data?.map((entry) => (
                  <div key={entry.id} className="relative pb-2 pl-6 before:absolute before:top-2 before:bottom-0 before:left-2 before:w-0.5 before:bg-slate-200 last:before:hidden">
                    <div className="absolute top-1 left-0 flex h-4 w-4 items-center justify-center rounded-full border border-[#0f7d82] bg-white"><div className="h-1.5 w-1.5 rounded-full bg-[#0f7d82]" /></div>
                    <div className="flex flex-wrap items-center justify-between gap-2"><div className="text-xs font-semibold text-slate-700">{entry.toStatus.replaceAll("_", " ")}</div><time className="text-[10px] text-muted-foreground">{new Date(entry.changedAt).toLocaleString()}</time></div>
                    <div className="text-xs text-muted-foreground">{entry.remarks || "No remarks recorded"}</div>
                  </div>
                ))}{!enrollmentHistory.isLoading && !enrollmentHistory.data?.length ? <p className="text-xs text-muted-foreground">No history entries are available.</p> : null}</div>
              </section>

              {inspectingEnrollment.data.status === "SUBMITTED" ? <section className="rounded-lg border p-4"><h3 className="text-sm font-semibold">Return for correction</h3><p className="mt-1 text-xs text-muted-foreground">Return the submitted load to the student with a reason.</p><div className="mt-3 flex gap-2"><Input value={returnReason} onChange={(event) => setReturnReason(event.target.value)} placeholder="Reason for returning to draft" /><Button variant="outline" disabled={!returnReason.trim() || returnToDraft.isPending} onClick={() => returnToDraft.mutate({ id: inspectingEnrollment.data.id, reason: returnReason })}><Undo2 />Return to draft</Button></div></section> : null}

              {[...(inspectingEnrollment.data.validation?.blockingIssues ?? []), ...(inspectingEnrollment.data.validation?.warnings ?? [])].some((issue) => issue.code === "ACADEMIC_POLICY_APPROVAL_REQUIRED") ? <section className="rounded-lg border border-amber-200 bg-amber-50/50 p-4"><h3 className="flex items-center gap-2 text-sm font-semibold"><KeyRound className="size-4" />Academic-policy approval</h3><p className="mt-1 text-xs text-muted-foreground">Record Registrar authorization before confirmation.</p><div className="mt-3 flex gap-2"><Input value={approvalReason} onChange={(event) => setApprovalReason(event.target.value)} placeholder="Approval reason and conditions" /><Button disabled={!approvalReason.trim() || approveEligibility.isPending} onClick={() => approveEligibility.mutate({ id: inspectingEnrollment.data.id, reason: approvalReason })}>Approve eligibility</Button></div></section> : null}

              {/* Download buttons (only if status is CONFIRMED) */}
              {inspectingEnrollment.data.status === "CONFIRMED" && (
                <section className="flex flex-col gap-3 rounded-lg border bg-slate-50/50 p-4 sm:flex-row">
                  <Button
                    variant="outline"
                    className="flex-1"
                    disabled={!can("REPORT_GENERATE")}
                    onClick={() =>
                      void openPdf(
                        `/reports/enrollments/${inspectingEnrollment.data.id}/form`
                      )
                    }
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Enrollment Form (PDF)
                  </Button>
                  {inspectingAssessment.data ? (
                    <Button
                      variant="outline"
                      className="flex-1"
                      disabled={!can("REPORT_GENERATE")}
                      onClick={() =>
                        void openPdf(
                          `/reports/assessments/${inspectingAssessment.data.id}`
                        )
                      }
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Assessment (PDF)
                    </Button>
                  ) : (
                    <div className="flex flex-1 items-center justify-center gap-2 rounded-md border border-dashed p-2 text-xs text-muted-foreground">
                      <FileClock className="h-4 w-4" />
                      <span>Assessment report not generated yet</span>
                    </div>
                  )}
                </section>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!provisionedCredentials}
        onOpenChange={(open) => !open && setProvisionedCredentials(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Student portal account created</DialogTitle>
            <DialogDescription>
              Give these one-time credentials directly to the student. They are
              not stored in plaintext and will not be shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 rounded-lg border bg-slate-50 p-4 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Username</span>
              <code>{provisionedCredentials?.username}</code>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Initial password</span>
              <code>{provisionedCredentials?.initialPassword}</code>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setProvisionedCredentials(null)}>
              I have recorded it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel reason dialog */}
      <Dialog
        open={!!cancellingId}
        onOpenChange={(open) => {
          if (!open) {
            setCancellingId(null)
            setCancelReason("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Enrollment</DialogTitle>
            <DialogDescription>
              Please enter the reason for cancelling this enrollment. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="cancel-reason">
              Cancellation Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="cancel-reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Enter cancellation remarks..."
              className="min-h-[100px]"
              required
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancellingId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!cancelReason.trim() || cancel.isPending || !cancellationReadiness.data?.ready}
              onClick={() => {
                if (cancellingId && cancelReason.trim()) {
                  cancel.mutate(
                    { id: cancellingId, reason: cancelReason },
                    {
                      onSuccess: () => {
                        setCancellingId(null)
                        setCancelReason("")
                      },
                    }
                  )
                }
              }}
            >
              {cancel.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirm Cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StudentContext({
  student,
  onClear,
}: {
  student: Student
  onClear: () => void
}) {
  return (
    <>
      <section className="flex items-center justify-between rounded-lg border p-4">
        <div className="flex items-center gap-4">
          <div className="grid size-11 place-items-center rounded-full border bg-slate-50">
            <UserRound className="size-5 text-[#0b315c]" />
          </div>
          <div>
            <h2 className="font-semibold text-[#0b1f3a]">
              {student.personal.fullName}
            </h2>
            <p className="text-sm text-muted-foreground">
              {student.personal.studentNumber} · {student.academic.programCode}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClear}
          aria-label="Clear selected student"
        >
          <X />
        </Button>
      </section>

      <section className="rounded-lg border p-4">
        <h3 className="mb-4 text-sm font-semibold text-[#0b1f3a]">
          Academic Profile
        </h3>
        <dl className="grid gap-4 text-sm sm:grid-cols-3 lg:grid-cols-5">
          <Stat label="Program" value={student.academic.programCode} />
          <Stat label="Curriculum" value={student.academic.curriculumCode} />
          <Stat label="Current Year" value={`${student.academic.yearLevel}`} />
          <Stat
            label="Classification"
            value={student.academic.classification ?? "—"}
          />
          <Stat
            label="Academic Status"
            value={student.academic.academicStatus ?? "—"}
          />
        </dl>
      </section>
    </>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{value.replaceAll("_", " ")}</dd>
    </div>
  )
}

function ScheduleTable({
  schedules,
  selected,
  locked,
  busy,
  onToggle,
}: {
  schedules: Schedule[]
  selected: Set<string>
  locked: boolean
  busy: boolean
  onToggle: (s: Schedule) => void
}) {
  const [showFilters, setShowFilters] = useState(false)
  const [filterCourse, setFilterCourse] = useState("")
  const [filterSection, setFilterSection] = useState("")
  const [filterDay, setFilterDay] = useState("ALL")
  const [filterAvailability, setFilterAvailability] = useState("ALL") // "ALL" | "AVAILABLE"

  // Filter schedules list client-side
  const filteredSchedules = schedules.filter((s) => {
    // 1. Course Code / Title filter
    if (filterCourse.trim()) {
      const q = filterCourse.toLowerCase().trim()
      if (
        !s.courseCode.toLowerCase().includes(q) &&
        !s.courseTitle.toLowerCase().includes(q)
      ) {
        return false
      }
    }

    // 2. Section filter
    if (filterSection.trim()) {
      const q = filterSection.toLowerCase().trim()
      if (!s.sectionCode.toLowerCase().includes(q)) {
        return false
      }
    }

    // 3. Day of Week filter
    if (filterDay !== "ALL") {
      const hasDay = s.meetings?.some(
        (m) => m.dayOfWeek.toUpperCase() === filterDay.toUpperCase()
      )
      if (!hasDay) return false
    }

    // 4. Availability filter
    if (filterAvailability === "AVAILABLE") {
      if (s.availableSeats <= 0) return false
    }

    return true
  })

  return (
    <section className="overflow-hidden rounded-lg border">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-[#0b1f3a]">
            Available Class Schedules
          </h2>
          <p className="text-xs text-muted-foreground">
            Choose schedules for the selected academic term.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="mr-1.5 h-3.5 w-3.5" />
          Filter
        </Button>
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 gap-3 border-b bg-slate-50 p-4 sm:grid-cols-2 md:grid-cols-4">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground">
              Course Code / Title
            </label>
            <Input
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
              placeholder="Filter course..."
              className="h-8 bg-white text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground">
              Section
            </label>
            <Input
              value={filterSection}
              onChange={(e) => setFilterSection(e.target.value)}
              placeholder="Filter section..."
              className="h-8 bg-white text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground">
              Day of Week
            </label>
            <Select value={filterDay} onValueChange={setFilterDay}>
              <SelectTrigger className="h-8 bg-white text-xs">
                <SelectValue placeholder="All Days" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Days</SelectItem>
                <SelectItem value="MONDAY">Monday</SelectItem>
                <SelectItem value="TUESDAY">Tuesday</SelectItem>
                <SelectItem value="WEDNESDAY">Wednesday</SelectItem>
                <SelectItem value="THURSDAY">Thursday</SelectItem>
                <SelectItem value="FRIDAY">Friday</SelectItem>
                <SelectItem value="SATURDAY">Saturday</SelectItem>
                <SelectItem value="SUNDAY">Sunday</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground">
              Availability
            </label>
            <Select
              value={filterAvailability}
              onValueChange={setFilterAvailability}
            >
              <SelectTrigger className="h-8 bg-white text-xs">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="AVAILABLE">Available Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Course</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Days / Time</TableHead>
              <TableHead>Room</TableHead>
              <TableHead>Faculty</TableHead>
              <TableHead>Units</TableHead>
              <TableHead>Available</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSchedules.length ? (
              filteredSchedules.map((s) => {
                const isSelected = selected.has(s.id)
                const isFull = s.availableSeats <= 0
                const hasConflict =
                  !isSelected &&
                  Array.from(selected).some((selId) => {
                    const selSched = schedules.find((x) => x.id === selId)
                    return selSched
                      ? hasFrontendMeetingConflict(selSched, s)
                      : false
                  })

                return (
                  <TableRow
                    key={s.id}
                    data-state={isSelected ? "selected" : undefined}
                  >
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        disabled={
                          locked ||
                          busy ||
                          (!isSelected && (isFull || hasConflict))
                        }
                        onCheckedChange={() => onToggle(s)}
                        aria-label={`Select ${s.courseCode}`}
                      />
                    </TableCell>
                    <TableCell>
                      <p className="text-xs font-medium">{s.courseCode}</p>
                      <p
                        className="max-w-52 truncate text-[10px] text-muted-foreground"
                        title={s.courseTitle}
                      >
                        {s.courseTitle}
                      </p>
                    </TableCell>
                    <TableCell className="text-xs">{s.sectionCode}</TableCell>
                    <TableCell className="text-[11px] whitespace-nowrap">
                      {meetings(s)}
                    </TableCell>
                    <TableCell className="text-xs">{s.roomCode}</TableCell>
                    <TableCell className="text-xs">{s.facultyName}</TableCell>
                    <TableCell className="text-xs">{s.creditUnits}</TableCell>
                    <TableCell className="text-xs">
                      <span
                        className={
                          s.availableSeats < 5
                            ? "font-semibold text-amber-600"
                            : "font-semibold text-emerald-600"
                        }
                      >
                        {s.availableSeats} / {s.capacity}
                      </span>
                    </TableCell>
                    <TableCell>
                      {isSelected ? (
                        <Badge className="bg-emerald-600 font-medium text-white">
                          Selected
                        </Badge>
                      ) : isFull ? (
                        <Badge variant="destructive">Full</Badge>
                      ) : hasConflict ? (
                        <Badge
                          variant="outline"
                          className="border-amber-500 bg-amber-50 font-medium text-amber-600"
                        >
                          Conflict
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-emerald-500 bg-emerald-50 font-medium text-emerald-600"
                        >
                          Available
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="h-32 text-center text-sm text-muted-foreground"
                >
                  No active schedules match the filter criteria.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}

function ValidationPanel({
  validation,
}: {
  validation?: EnrollmentValidation
}) {
  if (!validation)
    return (
      <Alert>
        <ShieldCheck />
        <AlertTitle>Ready for validation</AlertTitle>
        <AlertDescription>
          Validate after selecting the student’s complete academic load.
        </AlertDescription>
      </Alert>
    )
  return (
    <section className="space-y-3 rounded-lg border p-4">
      <h2 className="text-sm font-semibold">Validation Results</h2>
      {validation.blockingIssues.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>
            Blocking issues ({validation.blockingIssues.length})
          </AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4">
              {validation.blockingIssues.map((x, i) => (
                <li key={i}>{x.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      {validation.warnings.length > 0 && (
        <Alert className="border-amber-200 text-amber-800">
          <TriangleAlert />
          <AlertTitle>Warnings ({validation.warnings.length})</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4">
              {validation.warnings.map((x, i) => (
                <li key={i}>{x.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      {validation.valid && (
        <Alert className="border-emerald-200 text-emerald-800">
          <CheckCircle2 />
          <AlertTitle>Enrollment is valid</AlertTitle>
          <AlertDescription>No blocking issues were found.</AlertDescription>
        </Alert>
      )}
    </section>
  )
}

function EnrollmentSummary({
  enrollment,
  assessment,
  assessmentPending,
  canReport,
  onRemove,
  onCancel,
}: {
  enrollment?: Enrollment | null
  assessment?: Assessment
  assessmentPending: boolean
  canReport: boolean
  onRemove: (id: string) => void
  onCancel: (id: string) => void
}) {
  return (
    <div className="sticky top-5 space-y-4">
      <section className="rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-[#0b1f3a]">Enrollment Summary</h2>
          {enrollment && <Badge>{enrollment.subjectCount}</Badge>}
        </div>

        {!enrollment ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Create a draft to start building an academic load.
          </p>
        ) : (
          <>
            <div className="mt-4 space-y-2">
              {enrollment.subjects
                .filter((x) => x.status === "ENROLLED")
                .map((s) => (
                  <div key={s.id} className="rounded-md border p-3">
                    <div className="flex justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{s.courseCode}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.courseTitle}
                        </p>
                      </div>
                      {enrollment.status === "DRAFT" && (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => onRemove(s.id)}
                          aria-label={`Remove ${s.courseCode}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                      <span>
                        {s.sectionCode} · {s.roomCode}
                      </span>
                      <span>{s.creditUnits} units</span>
                    </div>
                  </div>
                ))}
            </div>

            <div className="mt-4 flex justify-between border-t pt-4 text-sm font-semibold">
              <span>Total Units</span>
              <span className="text-lg">{enrollment.totalCreditUnits}</span>
            </div>

            <div className="mt-4 flex items-center justify-between border-t pt-4">
              <Badge variant="outline">{enrollment.status}</Badge>
              {enrollment.status === "DRAFT" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => onCancel(enrollment.id)}
                >
                  Cancel Draft
                </Button>
              )}
            </div>
          </>
        )}
      </section>

      {enrollment?.status === "CONFIRMED" && (
        <section className="rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-semibold">Documents</h3>
          <Button
            variant="outline"
            className="mb-2 w-full justify-start"
            disabled={!canReport}
            onClick={() =>
              void openPdf(`/reports/enrollments/${enrollment.id}/form`)
            }
          >
            <Download className="mr-2 h-4 w-4" />
            Enrollment Form (PDF)
          </Button>
          {assessment ? (
            <Button
              variant="outline"
              className="w-full justify-start"
              disabled={!canReport}
              onClick={() =>
                void openPdf(`/reports/assessments/${assessment.id}`)
              }
            >
              <Download className="mr-2 h-4 w-4" />
              Assessment (PDF)
            </Button>
          ) : (
            <div className="flex items-center gap-3 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              <FileClock className="size-5" />
              <span>
                {assessmentPending
                  ? "Awaiting cashier assessment"
                  : "Checking assessment…"}
              </span>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

function notify(error: unknown) {
  toast.error(
    error instanceof ApiError
      ? error.message
      : "The request could not be completed"
  )
}
