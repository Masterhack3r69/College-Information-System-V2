import { useEffect, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { toast } from "sonner"
import {
  AlertTriangle,
  Check,
  Edit3,
  Loader2,
  Lock,
  Plus,
  RotateCcw,
  Search,
  Send,
  Settings2,
} from "lucide-react"
import { ApiError } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import type {
  GradeClassSummary,
  GradeRemark,
  Gradebook,
  GradebookItem,
  GradeStatus,
  ScoreStatus,
} from "@/lib/types"
import {
  useApproveGradebook,
  useArchiveGradebookItem,
  useGradebook,
  useGradeClasses,
  useGradingTemplates,
  useInitializeGradebook,
  useLockGradebook,
  useReturnGradebook,
  useSaveGradebookItem,
  useSaveGradebookScores,
  useSaveGradeOverride,
  useSubmitGradebook,
} from "@/hooks/use-grades"
import { useSchoolYears, useSemesters } from "@/hooks/use-setup"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
const pretty = (v?: string) => v?.replaceAll("_", " ") ?? "—"
const err = (e: unknown) =>
  e instanceof ApiError ? e.message : "Something went wrong"
const statusVariant = (s: string) =>
  s === "LOCKED" || s === "APPROVED"
    ? ("default" as const)
    : s === "RETURNED_FOR_CORRECTION"
      ? ("destructive" as const)
      : ("secondary" as const)
export function GradesPage() {
  const { can } = useAuth()
  const location = useLocation()
  const scopes = [
    can("GRADE_ENCODE") ? { v: "MY", l: "My Classes" } : null,
    can("GRADE_REVIEW") ? { v: "REVIEW", l: "Review Queue" } : null,
    can("GRADE_LOCK") ? { v: "LOCK", l: "Lock Queue" } : null,
  ].filter(Boolean) as { v: string; l: string }[]
  const [scope, setScope] = useState(scopes[0]?.v ?? "MY")
  return (
    <div className="flex flex-col gap-6 p-4 md:p-7">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
        <h1 className="text-2xl font-semibold">Grades</h1>
        <p className="text-sm text-muted-foreground">
          Encode weighted scores, review submitted gradebooks, and lock official
          academic results.
        </p>
        </div>
        {location.pathname.startsWith("/faculty")?<Button asChild variant="outline"><Link to="/faculty/grade-corrections">Locked-grade corrections</Link></Button>:null}
      </div>
      <Tabs value={scope} onValueChange={setScope}>
        <TabsList>
          {scopes.map((s) => (
            <TabsTrigger key={s.v} value={s.v}>
              {s.l}
            </TabsTrigger>
          ))}
        </TabsList>
        {scopes.map((s) => (
          <TabsContent key={s.v} value={s.v} className="mt-5">
            <ClassQueue scope={s.v} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
function ClassQueue({ scope }: { scope: string }) {
  const years = useSchoolYears(0, 100).data?.items ?? [],
    terms = useSemesters(0, 100).data?.items ?? []
  const [year, setYear] = useState("all"),
    [term, setTerm] = useState("all"),
    [status, setStatus] = useState(
      scope === "REVIEW" ? "SUBMITTED" : scope === "LOCK" ? "APPROVED" : "all"
    ),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(0),
    [opened, setOpened] = useState<GradeClassSummary>()
  useEffect(() => {
    const a = years.find((x) => x.active)
    if (a && year === "all") setYear(a.id)
  }, [years, year])
  useEffect(() => {
    const a = terms.find((x) => x.active)
    if (a && term === "all") setTerm(a.id)
  }, [terms, term])
  const q = useGradeClasses({
    scope,
    schoolYearId: year === "all" ? undefined : year,
    semesterId: term === "all" ? undefined : term,
    status: status === "all" ? undefined : (status as GradeStatus),
    search: search || undefined,
    page,
    size: 12,
  })
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-60 flex-1">
          <Search className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search course or section…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
          />
        </div>
        <Filter
          value={year}
          onChange={setYear}
          all="All school years"
          values={years.map((x) => ({ v: x.id, l: x.schoolYear }))}
        />
        <Filter
          value={term}
          onChange={setTerm}
          all="All semesters"
          values={terms.map((x) => ({ v: x.id, l: pretty(x.name) }))}
        />
        <Filter
          value={status}
          onChange={setStatus}
          all="All statuses"
          values={[
            "DRAFT",
            "ENCODED",
            "SUBMITTED",
            "APPROVED",
            "LOCKED",
            "RETURNED_FOR_CORRECTION",
          ].map((v) => ({ v, l: pretty(v) }))}
        />
      </div>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Class</TableHead>
              <TableHead>Faculty</TableHead>
              <TableHead>Term</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.isLoading ? (
              <Row col={6}>
                <Loader2 className="mx-auto animate-spin" />
              </Row>
            ) : !q.data?.items.length ? (
              <Row col={6}>No classes in this queue.</Row>
            ) : (
              q.data.items.map((c) => (
                <TableRow key={c.scheduleId}>
                  <TableCell>
                    <p className="font-medium">
                      {c.courseCode} · {c.sectionCode}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {c.courseTitle}
                    </p>
                  </TableCell>
                  <TableCell>{c.facultyName}</TableCell>
                  <TableCell>
                    {c.schoolYear}
                    <br />
                    <span className="text-xs text-muted-foreground">
                      {pretty(c.semesterName)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {c.completedCount} / {c.enrolledCount}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(c.status)}>
                      {c.initialized ? pretty(c.status) : "NOT INITIALIZED"}
                    </Badge>
                    {c.latestCorrectionReason ? (
                      <p className="mt-1 max-w-52 text-xs text-destructive">
                        {c.latestCorrectionReason}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant={c.initialized ? "outline" : "default"}
                      onClick={() => setOpened(c)}
                    >
                      {c.initialized ? <Edit3 /> : <Settings2 />}
                      {c.initialized
                        ? scope === "MY"
                          ? "Open gradebook"
                          : "Review"
                        : "Initialize"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {q.data && q.data.totalPages > 1 ? (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={!page}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={page + 1 >= q.data.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
      <GradebookDialog
        summary={opened}
        scope={scope}
        onClose={() => setOpened(undefined)}
      />
    </div>
  )
}
function GradebookDialog({
  summary,
  scope,
  onClose,
}: {
  summary?: GradeClassSummary
  scope: string
  onClose: () => void
}) {
  const detail = useGradebook(
    summary?.initialized ? summary.scheduleId : undefined
  )
  const templates = useGradingTemplates(summary?.programId, summary?.courseId)
  const init = useInitializeGradebook()
  const [templateId, setTemplateId] = useState("")
  const [dirty, setDirty] = useState(false)
  const [scores, setScores] = useState<
    Record<string, { status: ScoreStatus; score: string }>
  >({})
  const [itemOpen, setItemOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<GradebookItem>()
  const [confirm, setConfirm] = useState<
    "submit" | "approve" | "lock" | "return"
  >()
  const [reason, setReason] = useState("")
  const [overrideStudent, setOverrideStudent] = useState<string>()
  const [overrideRemark, setOverrideRemark] =
    useState<GradeRemark>("INCOMPLETE")
  const [overrideReason, setOverrideReason] = useState("")
  const saveScores = useSaveGradebookScores(),
    submit = useSubmitGradebook(),
    approve = useApproveGradebook(),
    lock = useLockGradebook(),
    returned = useReturnGradebook(),
    saveOverride = useSaveGradeOverride()
  const book = detail.data
  useEffect(() => {
    if (!book) return
    const next: Record<string, { status: ScoreStatus; score: string }> = {}
    book.students.forEach((s) =>
      s.scores.forEach((x) => {
        next[`${s.enrollmentSubjectId}:${x.itemId}`] = {
          status: x.status,
          score: x.score?.toString() ?? "",
        }
      })
    )
    setScores(next)
    setDirty(false)
  }, [book])
  async function initialize() {
    if (!summary || !templateId) return
    try {
      await init.mutateAsync({ scheduleId: summary.scheduleId, templateId })
      toast.success("Gradebook initialized")
      onClose()
    } catch (e) {
      toast.error(err(e))
    }
  }
  async function save() {
    if (!book) return
    try {
      await saveScores.mutateAsync({
        scheduleId: book.scheduleId,
        scores: Object.entries(scores).map(([key, v]) => {
          const [enrollmentSubjectId, itemId] = key.split(":")
          return {
            enrollmentSubjectId,
            itemId,
            status: v.status,
            score: v.status === "SCORED" ? Number(v.score) : undefined,
          }
        }),
      })
      toast.success("Draft scores saved")
      setDirty(false)
    } catch (e) {
      toast.error(err(e))
    }
  }
  async function action() {
    if (!book || !confirm) return
    try {
      if (confirm === "submit") await submit.mutateAsync(book.scheduleId)
      if (confirm === "approve") await approve.mutateAsync(book.scheduleId)
      if (confirm === "lock") await lock.mutateAsync(book.scheduleId)
      if (confirm === "return")
        await returned.mutateAsync({ scheduleId: book.scheduleId, reason })
      const actionLabel = {
        submit: "submitted",
        approve: "approved",
        lock: "locked",
        return: "returned",
      }[confirm]
      toast.success(`Gradebook ${actionLabel}`)
      setConfirm(undefined)
      setReason("")
    } catch (e) {
      toast.error(err(e))
    }
  }
  async function override() {
    if (!book || !overrideStudent || !overrideReason.trim()) return
    try {
      await saveOverride.mutateAsync({
        scheduleId: book.scheduleId,
        enrollmentSubjectId: overrideStudent,
        remark: overrideRemark,
        reason: overrideReason,
      })
      toast.success("Override saved")
      setOverrideStudent(undefined)
      setOverrideReason("")
    } catch (e) {
      toast.error(err(e))
    }
  }
  function close() {
    if (dirty && !window.confirm("Discard unsaved score changes?")) return
    onClose()
  }
  const eligible = templates.data ?? []
  return (
    <>
      <Dialog
        open={Boolean(summary)}
        onOpenChange={(o) => {
          if (!o) close()
        }}
      >
        <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-[96vw]">
          <DialogHeader>
            <DialogTitle>
              {summary?.courseCode} · {summary?.sectionCode}
            </DialogTitle>
            <DialogDescription>
              {summary?.courseTitle} · {summary?.facultyName}
            </DialogDescription>
          </DialogHeader>
          {summary && !summary.initialized ? (
            <div className="flex flex-col gap-4">
              <Alert>
                <AlertDescription>
                  Select an active grading template matching this program and
                  course.
                </AlertDescription>
              </Alert>
              <Label>Grading template</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {eligible.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.templateName} · v{t.version}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <DialogFooter>
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  disabled={!templateId || init.isPending}
                  onClick={() => void initialize()}
                >
                  Initialize gradebook
                </Button>
              </DialogFooter>
            </div>
          ) : detail.isLoading || !book ? (
            <div className="grid h-48 place-items-center">
              <Loader2 className="animate-spin" />
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <GradebookHeader book={book} />
              {book.latestCorrectionReason ? (
                <Alert variant="destructive">
                  <AlertTriangle />
                  <AlertTitle>Returned for correction</AlertTitle>
                  <AlertDescription>
                    {book.latestCorrectionReason}
                  </AlertDescription>
                </Alert>
              ) : null}
              <div className="flex flex-wrap justify-between gap-2">
                <div className="flex gap-2">
                  {scope === "MY" &&
                  ["DRAFT", "RETURNED_FOR_CORRECTION"].includes(book.status) ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingItem(undefined)
                          setItemOpen(true)
                        }}
                      >
                        <Plus /> Add assessment
                      </Button>
                      <Button
                        disabled={!dirty || saveScores.isPending}
                        onClick={() => void save()}
                      >
                        Save Draft
                      </Button>
                      <Button
                        disabled={dirty || book.validationIssues.length > 0}
                        onClick={() => setConfirm("submit")}
                      >
                        <Send /> Submit
                      </Button>
                    </>
                  ) : null}
                  {scope === "REVIEW" && book.status === "SUBMITTED" ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => setConfirm("return")}
                      >
                        <RotateCcw /> Return
                      </Button>
                      <Button onClick={() => setConfirm("approve")}>
                        <Check /> Approve
                      </Button>
                    </>
                  ) : null}
                  {scope === "LOCK" && book.status === "APPROVED" ? (
                    <Button onClick={() => setConfirm("lock")}>
                      <Lock /> Lock grades
                    </Button>
                  ) : null}
                </div>
                <Badge variant={statusVariant(book.status)}>
                  {pretty(book.status)}
                </Badge>
              </div>
              {book.validationIssues.length ? (
                <Alert>
                  <AlertTriangle />
                  <AlertTitle>Submission requirements</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc pl-4">
                      {book.validationIssues.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              ) : null}
              <GradeMatrix
                book={book}
                scores={scores}
                editable={
                  scope === "MY" &&
                  ["DRAFT", "RETURNED_FOR_CORRECTION"].includes(book.status)
                }
                onScore={(student, item, value) => {
                  setScores((c) => ({ ...c, [`${student}:${item}`]: value }))
                  setDirty(true)
                }}
                onEditItem={(i) => {
                  setEditingItem(i)
                  setItemOpen(true)
                }}
                onOverride={setOverrideStudent}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
      <ItemDialog
        book={book}
        item={editingItem}
        open={itemOpen}
        onClose={() => setItemOpen(false)}
      />
      <AlertDialog
        open={Boolean(confirm)}
        onOpenChange={(o) => {
          if (!o) setConfirm(undefined)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === "return"
                ? "Return gradebook for correction?"
                : confirm === "lock"
                  ? "Lock these official grades?"
                  : `${pretty(confirm)} this gradebook?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "lock"
                ? "Locking creates permanent academic records and cannot be undone."
                : "This action applies to the entire class."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {confirm === "return" ? (
            <Textarea
              placeholder="Required correction reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={confirm === "return" && !reason.trim()}
              onClick={() => void action()}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog
        open={Boolean(overrideStudent)}
        onOpenChange={(o) => {
          if (!o) setOverrideStudent(undefined)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Special grade outcome</DialogTitle>
            <DialogDescription>
              Override the computed numeric result with a documented non-numeric
              outcome.
            </DialogDescription>
          </DialogHeader>
          <Select
            value={overrideRemark}
            onValueChange={(v) => setOverrideRemark(v as GradeRemark)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {["INCOMPLETE", "DROPPED", "WITHDRAWN", "CONDITIONAL"].map(
                  (v) => (
                    <SelectItem key={v} value={v}>
                      {pretty(v)}
                    </SelectItem>
                  )
                )}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Textarea
            placeholder="Required reason"
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
          />
          <DialogFooter>
            <Button
              onClick={() => void override()}
              disabled={!overrideReason.trim()}
            >
              Save override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
function GradebookHeader({ book }: { book: Gradebook }) {
  return (
    <div className="grid grid-cols-2 gap-3 rounded-lg border p-4 md:grid-cols-4">
      <Metric l="Students" v={String(book.students.length)} />
      <Metric l="Midterm weight" v={`${book.midtermWeight}%`} />
      <Metric l="Final weight" v={`${book.finalWeight}%`} />
      <Metric l="Assessments" v={String(book.items.length)} />
    </div>
  )
}
function GradeMatrix({
  book,
  scores,
  editable,
  onScore,
  onEditItem,
  onOverride,
}: {
  book: Gradebook
  scores: Record<string, { status: ScoreStatus; score: string }>
  editable: boolean
  onScore: (
    s: string,
    i: string,
    v: { status: ScoreStatus; score: string }
  ) => void
  onEditItem: (i: GradebookItem) => void
  onOverride: (s: string) => void
}) {
  return (
    <div className="max-h-[58vh] overflow-auto rounded-lg border">
      <Table className="min-w-max">
        <TableHeader className="sticky top-0 bg-background">
          <TableRow>
            <TableHead className="sticky left-0 min-w-52 bg-background">
              Student
            </TableHead>
            {book.items.map((i) => (
              <TableHead key={i.id} className="min-w-32 text-center">
                <button disabled={!editable} onClick={() => onEditItem(i)}>
                  <span className="block text-[10px] text-muted-foreground">
                    {i.period} · {i.categoryName}
                  </span>
                  {i.title}
                  <span className="block text-[10px]">/{i.maximumScore}</span>
                </button>
              </TableHead>
            ))}
            <TableHead>Midterm</TableHead>
            <TableHead>Final</TableHead>
            <TableHead>Percentage</TableHead>
            <TableHead>Grade</TableHead>
            <TableHead>Remark</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {book.students.map((s) => (
            <TableRow key={s.enrollmentSubjectId}>
              <TableCell className="sticky left-0 bg-background">
                <p className="font-medium">{s.studentName}</p>
                <p className="text-xs text-muted-foreground">
                  {s.studentNumber}
                </p>
              </TableCell>
              {book.items.map((i) => {
                const v = scores[`${s.enrollmentSubjectId}:${i.id}`] ?? {
                  status: "PENDING",
                  score: "",
                }
                return (
                  <TableCell key={i.id}>
                    <div className="flex gap-1">
                      <Input
                        className="w-20"
                        type="number"
                        min={0}
                        max={i.maximumScore}
                        disabled={!editable || v.status !== "SCORED"}
                        value={v.score}
                        onChange={(e) =>
                          onScore(s.enrollmentSubjectId, i.id, {
                            ...v,
                            score: e.target.value,
                          })
                        }
                      />
                      <select
                        aria-label={`${i.title} status for ${s.studentName}`}
                        className="rounded-md border bg-background px-1 text-xs"
                        disabled={!editable}
                        value={v.status}
                        onChange={(e) =>
                          onScore(s.enrollmentSubjectId, i.id, {
                            status: e.target.value as ScoreStatus,
                            score: e.target.value === "SCORED" ? v.score : "",
                          })
                        }
                      >
                        <option value="PENDING">Pending</option>
                        <option value="SCORED">Score</option>
                        <option value="ABSENT">Absent</option>
                        <option value="EXCUSED">Excused</option>
                      </select>
                    </div>
                  </TableCell>
                )
              })}
              <TableCell>{s.midtermPercentage.toFixed(2)}%</TableCell>
              <TableCell>{s.finalPeriodPercentage.toFixed(2)}%</TableCell>
              <TableCell className="font-medium">
                {s.finalPercentage.toFixed(2)}%
              </TableCell>
              <TableCell>{s.gradePoint?.toFixed(2) ?? "—"}</TableCell>
              <TableCell>
                <button
                  disabled={!editable}
                  className="text-left"
                  onClick={() => onOverride(s.enrollmentSubjectId)}
                >
                  {pretty(s.remark)}
                  {s.overrideReason ? (
                    <span className="block max-w-40 text-xs text-muted-foreground">
                      {s.overrideReason}
                    </span>
                  ) : null}
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
function ItemDialog({
  book,
  item,
  open,
  onClose,
}: {
  book?: Gradebook
  item?: GradebookItem
  open: boolean
  onClose: () => void
}) {
  const save = useSaveGradebookItem(),
    archive = useArchiveGradebookItem()
  const [form, setForm] = useState({
    categoryId: "",
    title: "",
    maximumScore: "",
    dueDate: "",
    sortOrder: "0",
  })
  useEffect(
    () =>
      setForm({
        categoryId: item?.categoryId ?? book?.categories[0]?.id ?? "",
        title: item?.title ?? "",
        maximumScore: item?.maximumScore?.toString() ?? "",
        dueDate: item?.dueDate ?? "",
        sortOrder:
          item?.sortOrder?.toString() ?? String(book?.items.length ?? 0),
      }),
    [item, book, open]
  )
  async function submit() {
    if (!book) return
    try {
      await save.mutateAsync({
        scheduleId: book.scheduleId,
        id: item?.id,
        categoryId: form.categoryId,
        title: form.title,
        maximumScore: Number(form.maximumScore),
        dueDate: form.dueDate || undefined,
        sortOrder: Number(form.sortOrder),
      })
      toast.success("Assessment saved")
      onClose()
    } catch (e) {
      toast.error(err(e))
    }
  }
  async function remove() {
    if (!book || !item) return
    try {
      await archive.mutateAsync({ scheduleId: book.scheduleId, id: item.id })
      toast.success("Assessment archived")
      onClose()
    } catch (e) {
      toast.error(err(e))
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {item ? "Edit assessment" : "Add assessment"}
          </DialogTitle>
          <DialogDescription>
            Assessment items contribute to their configured weighted category.
          </DialogDescription>
        </DialogHeader>
        <Label>Category</Label>
        <Select
          value={form.categoryId}
          onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {book?.categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.period} · {c.name} ({c.weight}%)
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <Field
            l="Title"
            v={form.title}
            set={(v) => setForm((f) => ({ ...f, title: v }))}
          />
          <Field
            l="Maximum score"
            v={form.maximumScore}
            set={(v) => setForm((f) => ({ ...f, maximumScore: v }))}
            type="number"
          />
          <Field
            l="Due date"
            v={form.dueDate}
            set={(v) => setForm((f) => ({ ...f, dueDate: v }))}
            type="date"
          />
          <Field
            l="Order"
            v={form.sortOrder}
            set={(v) => setForm((f) => ({ ...f, sortOrder: v }))}
            type="number"
          />
        </div>
        <DialogFooter>
          {item ? (
            <Button variant="destructive" onClick={() => void remove()}>
              Archive
            </Button>
          ) : null}
          <Button
            onClick={() => void submit()}
            disabled={
              !form.title || !form.categoryId || Number(form.maximumScore) <= 0
            }
          >
            Save assessment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
function Filter({
  value,
  onChange,
  all,
  values,
}: {
  value: string
  onChange: (v: string) => void
  all: string
  values: { v: string; l: string }[]
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="all">{all}</SelectItem>
          {values.map((x) => (
            <SelectItem key={x.v} value={x.v}>
              {x.l}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
function Row({ col, children }: { col: number; children: React.ReactNode }) {
  return (
    <TableRow>
      <TableCell
        colSpan={col}
        className="h-28 text-center text-muted-foreground"
      >
        {children}
      </TableCell>
    </TableRow>
  )
}
function Metric({ l, v }: { l: string; v: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{l}</p>
      <p className="font-semibold">{v}</p>
    </div>
  )
}
function Field({
  l,
  v,
  set,
  type = "text",
}: {
  l: string
  v: string
  set: (v: string) => void
  type?: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{l}</Label>
      <Input type={type} value={v} onChange={(e) => set(e.target.value)} />
    </div>
  )
}
