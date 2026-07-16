import { useState } from "react"
import { BookCopy, CheckCircle2, FileClock, Loader2, Plus, Send, ShieldCheck, Undo2, XCircle } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/lib/auth"
import { useCurricula, useCurriculum } from "@/hooks/use-curriculum"
import { useStudentDocuments, useStudents } from "@/hooks/use-students"
import {
  type EvaluationCaseInput,
  type EvaluationCase,
  type EvaluationStatus,
  type EvaluationType,
  useAcademicEvaluation,
  useAcademicEvaluations,
  useAddEvaluationSource,
  useCreateEvaluation,
  useEvaluationTransition,
  useLinkEvaluationDocument,
  useSaveEvaluationMatch,
  useSubmitEvaluation,
} from "@/hooks/use-academic-exceptions"

const statuses: { value: EvaluationStatus | ""; label: string }[] = [
  { value: "", label: "All cases" }, { value: "DRAFT", label: "Draft" },
  { value: "PENDING_ACADEMIC_REVIEW", label: "Academic review" }, { value: "PENDING_REGISTRAR_APPROVAL", label: "Registrar approval" },
  { value: "APPROVED", label: "Approved" }, { value: "RETURNED", label: "Returned" }, { value: "REJECTED", label: "Rejected" },
]

function badgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "APPROVED") return "default"
  if (status === "REJECTED") return "destructive"
  if (status.startsWith("PENDING")) return "secondary"
  return "outline"
}

export default function AcademicEvaluationsPage() {
  const { can } = useAuth()
  const [status, setStatus] = useState("")
  const [selectedId, setSelectedId] = useState<string>()
  const list = useAcademicEvaluations(status)
  const detail = useAcademicEvaluation(selectedId)
  const canApprove = can("ACADEMIC_EVALUATION_APPROVE")
  const canReview = can("ACADEMIC_EVALUATION_REVIEW")

  return <div className="mx-auto max-w-[1440px] p-5 md:p-8">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="flex items-center gap-3 text-3xl font-semibold text-[#092f66]"><BookCopy />Academic evaluations</h1><p className="mt-2 text-slate-600">Review prior study, post auditable credits, and control explicit curriculum migrations.</p></div>{canApprove ? <NewEvaluationDialog onCreated={setSelectedId} /> : null}</div>
    <div className="mt-7 flex flex-wrap gap-2">{statuses.map((option) => <Button key={option.value} size="sm" variant={status === option.value ? "default" : "outline"} onClick={() => setStatus(option.value)}>{option.label}</Button>)}</div>
    <div className="mt-5 grid min-h-[620px] overflow-hidden rounded-xl border lg:grid-cols-[380px_1fr]">
      <aside className="border-b lg:border-b-0 lg:border-r"><header className="border-b p-4 text-sm font-medium text-slate-500">{list.data?.length ?? 0} evaluation case{list.data?.length === 1 ? "" : "s"}</header><div className="max-h-[680px] overflow-y-auto divide-y">{list.data?.map((item) => <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className={`w-full p-4 text-left transition hover:bg-slate-50 ${selectedId === item.id ? "bg-slate-50 ring-1 ring-inset ring-[#0f7d82]" : ""}`}><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{item.studentName}</p><p className="text-xs text-slate-500">{item.studentNumber} · {item.programCode}</p></div><Badge variant={badgeVariant(item.status)}>{item.status.replaceAll("_", " ")}</Badge></div><p className="mt-3 text-sm">{item.evaluationType.replaceAll("_", " ")} → {item.targetCurriculumCode}</p></button>)}{!list.isLoading && !list.data?.length ? <p className="p-8 text-center text-sm text-slate-500">No cases match this queue.</p> : null}</div></aside>
      <main className="min-w-0">{detail.isLoading ? <div className="grid h-full place-items-center"><Loader2 className="animate-spin text-slate-400" /></div> : detail.data ? <CaseWorkspace evaluation={detail.data} canApprove={canApprove} canReview={canReview} /> : <div className="grid h-full place-items-center p-8 text-center"><div><FileClock className="mx-auto size-10 text-slate-300" /><p className="mt-3 font-medium">Select an evaluation case</p><p className="mt-1 text-sm text-slate-500">Its evidence, recommendations, impact, and history will appear here.</p></div></div>}</main>
    </div>
  </div>
}

function NewEvaluationDialog({ onCreated }: { onCreated: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<EvaluationCaseInput>({ studentId: "", evaluationType: "TRANSFER", targetCurriculumId: "" })
  const students = useStudents({}, 0, 100)
  const curricula = useCurricula(undefined, 0, 100)
  const create = useCreateEvaluation()
  async function save() { try { const result = await create.mutateAsync(form) as { id: string }; setOpen(false); onCreated(result.id); toast.success("Academic evaluation created") } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to create evaluation") } }
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button><Plus data-icon="inline-start" />New evaluation</Button></DialogTrigger><DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>Create academic evaluation</DialogTitle><DialogDescription>Registrar creates the case and evidence package before academic review.</DialogDescription></DialogHeader><div className="grid gap-4 py-2 sm:grid-cols-2">
    <Field label="Student"><select className="h-9 w-full rounded-md border bg-transparent px-3 text-sm" value={form.studentId} onChange={(event) => setForm({ ...form, studentId: event.target.value })}><option value="">Select student</option>{students.data?.items.map((student) => <option key={student.id} value={student.id}>{student.studentNumber} · {student.fullName}</option>)}</select></Field>
    <Field label="Evaluation type"><select className="h-9 w-full rounded-md border bg-transparent px-3 text-sm" value={form.evaluationType} onChange={(event) => setForm({ ...form, evaluationType: event.target.value as EvaluationType })}>{["TRANSFER","SHIFT","SECOND_DEGREE","CURRICULUM_MIGRATION","OTHER"].map((type) => <option key={type}>{type}</option>)}</select></Field>
    {form.evaluationType === "CURRICULUM_MIGRATION" ? <Field label="Source curriculum"><select className="h-9 w-full rounded-md border bg-transparent px-3 text-sm" value={form.fromCurriculumId ?? ""} onChange={(event) => setForm({ ...form, fromCurriculumId: event.target.value })}><option value="">Select source</option>{curricula.data?.items.map((curriculum) => <option key={curriculum.id} value={curriculum.id}>{curriculum.curriculumCode}</option>)}</select></Field> : <Field label="Source institution"><Input value={form.sourceInstitution ?? ""} onChange={(event) => setForm({ ...form, sourceInstitution: event.target.value })} /></Field>}
    <Field label="Target curriculum"><select className="h-9 w-full rounded-md border bg-transparent px-3 text-sm" value={form.targetCurriculumId} onChange={(event) => setForm({ ...form, targetCurriculumId: event.target.value })}><option value="">Select target</option>{curricula.data?.items.map((curriculum) => <option key={curriculum.id} value={curriculum.id}>{curriculum.curriculumCode} · {curriculum.programCode}</option>)}</select></Field>
    <div className="sm:col-span-2"><Field label="Reason"><Textarea value={form.reason ?? ""} onChange={(event) => setForm({ ...form, reason: event.target.value })} /></Field></div>
  </div><DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => void save()} disabled={!form.studentId || !form.targetCurriculumId || create.isPending || (form.evaluationType === "CURRICULUM_MIGRATION" && !form.fromCurriculumId)}>{create.isPending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : null}Create case</Button></DialogFooter></DialogContent></Dialog>
}

function CaseWorkspace({ evaluation, canApprove, canReview }: { evaluation: EvaluationCase; canApprove: boolean; canReview: boolean }) {
  return <div className="max-h-[740px] overflow-y-auto p-5 md:p-7"><div className="flex flex-col justify-between gap-3 sm:flex-row"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-semibold">{evaluation.studentName}</h2><Badge variant={badgeVariant(evaluation.status)}>{evaluation.status.replaceAll("_", " ")}</Badge></div><p className="mt-1 text-sm text-slate-500">{evaluation.studentNumber} · {evaluation.evaluationType.replaceAll("_", " ")} · Target {evaluation.targetCurriculumCode}</p></div></div>
    {evaluation.migrationImpact ? <div className="mt-5 grid gap-3 sm:grid-cols-4"><Metric label="Mapped" value={evaluation.migrationImpact.mappedCourses.length} /><Metric label="Unmapped records" value={evaluation.migrationImpact.unmappedSourceCourses.length} /><Metric label="New deficiencies" value={evaluation.migrationImpact.newDeficiencies.length} /><Metric label="Elective groups" value={evaluation.migrationImpact.electiveGroups.length} /></div> : null}
    <section className="mt-6 rounded-xl border"><header className="border-b p-4"><h3 className="font-semibold">Source courses and evidence</h3></header><div className="divide-y">{evaluation.sourceCourses.map((source) => <article key={source.id} className="flex items-start justify-between gap-3 p-4"><div><p className="font-medium">{source.courseCode} · {source.courseTitle}</p><p className="mt-1 text-sm text-slate-500">{source.sourceType.replaceAll("_", " ")} · {source.creditUnits} units{source.sourceGrade ? ` · Grade ${source.sourceGrade}` : ""}</p></div>{evaluation.matches.some((match) => match.sourceCourseIds.includes(source.id) && match.status === "RECOMMENDED") ? <Badge>Mapped</Badge> : <Badge variant="outline">Unmapped</Badge>}</article>)}{!evaluation.sourceCourses.length ? <p className="p-6 text-center text-sm text-slate-500">No source courses added.</p> : null}</div></section>
    {canApprove && ["DRAFT", "RETURNED"].includes(evaluation.status) ? <RegistrarEvidence evaluation={evaluation} /> : null}
    {canReview && evaluation.status === "PENDING_ACADEMIC_REVIEW" ? <AcademicReview evaluation={evaluation} /> : null}
    {(canReview || canApprove) && evaluation.status.startsWith("PENDING") ? <DecisionPanel evaluation={evaluation} canApprove={canApprove} canReview={canReview} /> : null}
    <section className="mt-6 rounded-xl border"><header className="border-b p-4"><h3 className="font-semibold">Decision history</h3></header><div className="divide-y">{evaluation.history.map((entry) => <article key={entry.id} className="grid gap-1 p-4 sm:grid-cols-[190px_1fr]"><p className="text-sm text-slate-500">{new Date(entry.changedAt).toLocaleString()}</p><div><p className="font-medium">{entry.toStatus.replaceAll("_", " ")}</p><p className="text-sm text-slate-500">{entry.changedBy}{entry.remarks ? ` · ${entry.remarks}` : ""}</p></div></article>)}</div></section>
  </div>
}

function RegistrarEvidence({ evaluation }: { evaluation: EvaluationCase }) {
  const [source, setSource] = useState({ sourceType: "EXTERNAL", courseCode: "", courseTitle: "", creditUnits: 3, sourceGrade: "", sourceRemarks: "", termLabel: "", schoolYearLabel: "" })
  const add = useAddEvaluationSource(); const submit = useSubmitEvaluation()
  async function addSource() { try { await add.mutateAsync({ id: evaluation.id, source }); setSource({ ...source, courseCode: "", courseTitle: "", sourceGrade: "", sourceRemarks: "" }); toast.success("Source course added") } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to add source") } }
  async function send() { try { await submit.mutateAsync(evaluation.id); toast.success("Case submitted for academic review") } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to submit case") } }
  return <section className="mt-6 rounded-xl border bg-slate-50/50 p-4"><h3 className="font-semibold">Registrar evidence preparation</h3><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Field label="Course code"><Input value={source.courseCode} onChange={(event) => setSource({ ...source, courseCode: event.target.value })} /></Field><Field label="Course title"><Input value={source.courseTitle} onChange={(event) => setSource({ ...source, courseTitle: event.target.value })} /></Field><Field label="Units"><Input type="number" min="0" step="0.5" value={source.creditUnits} onChange={(event) => setSource({ ...source, creditUnits: Number(event.target.value) })} /></Field><Field label="Source grade"><Input value={source.sourceGrade} onChange={(event) => setSource({ ...source, sourceGrade: event.target.value })} /></Field></div><div className="mt-4 flex flex-wrap justify-between gap-3"><DocumentLinks evaluation={evaluation} /><div className="flex gap-2"><Button variant="outline" onClick={() => void addSource()} disabled={!source.courseCode || !source.courseTitle || add.isPending}>{add.isPending ? <Loader2 className="animate-spin" /> : <Plus />}Add source</Button><Button onClick={() => void send()} disabled={!evaluation.sourceCourses.length || submit.isPending}><Send data-icon="inline-start" />Submit for review</Button></div></div></section>
}

function DocumentLinks({ evaluation }: { evaluation: EvaluationCase }) {
  const documents = useStudentDocuments(evaluation.studentId); const link = useLinkEvaluationDocument()
  const unlinked = documents.data?.filter((document) => !evaluation.documents.some((linked) => linked.id === document.id)) ?? []
  return <div className="flex flex-wrap items-center gap-2"><span className="text-sm text-slate-500">Evidence:</span>{evaluation.documents.map((document) => <Badge key={document.id} variant="outline">{document.documentType}</Badge>)}{unlinked.length ? <select className="h-9 rounded-md border bg-white px-3 text-sm" defaultValue="" onChange={(event) => { if (event.target.value) void link.mutateAsync({ id: evaluation.id, documentId: event.target.value }).then(() => toast.success("Document linked")) }}><option value="">Link student document…</option>{unlinked.map((document) => <option key={document.id} value={document.id}>{document.documentType} · {document.fileName}</option>)}</select> : null}</div>
}

function AcademicReview({ evaluation }: { evaluation: EvaluationCase }) {
  const curriculum = useCurriculum(evaluation.targetCurriculumId); const save = useSaveEvaluationMatch()
  const [targetCourseId, setTargetCourseId] = useState(""); const [sourceIds, setSourceIds] = useState<string[]>([]); const [decision, setDecision] = useState<"RECOMMENDED" | "REJECTED">("RECOMMENDED"); const [rationale, setRationale] = useState(""); const [units, setUnits] = useState<number>()
  async function review() { try { await save.mutateAsync({ id: evaluation.id, match: { targetCourseId, sourceCourseIds: sourceIds, status: decision, recommendedUnits: units, rationale } }); setSourceIds([]); setRationale(""); toast.success("Equivalency decision saved") } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to save decision") } }
  return <section className="mt-6 rounded-xl border border-cyan-200 bg-cyan-50/40 p-4"><h3 className="font-semibold">Academic equivalency review</h3><div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label="Target curriculum course"><select className="h-9 w-full rounded-md border bg-white px-3 text-sm" value={targetCourseId} onChange={(event) => setTargetCourseId(event.target.value)}><option value="">Select target course</option>{curriculum.data?.courses.map((course) => <option key={course.courseId} value={course.courseId}>{course.courseCode} · {course.courseTitle}</option>)}</select></Field><Field label="Decision"><select className="h-9 w-full rounded-md border bg-white px-3 text-sm" value={decision} onChange={(event) => setDecision(event.target.value as typeof decision)}><option>RECOMMENDED</option><option>REJECTED</option></select></Field></div><div className="mt-4"><Label>Grouped source courses</Label><div className="mt-2 grid gap-2 sm:grid-cols-2">{evaluation.sourceCourses.map((source) => <label key={source.id} className="flex items-start gap-2 rounded-md border bg-white p-3 text-sm"><Checkbox checked={sourceIds.includes(source.id)} onCheckedChange={(checked) => setSourceIds(checked ? [...sourceIds, source.id] : sourceIds.filter((id) => id !== source.id))} /><span><span className="font-medium">{source.courseCode}</span><span className="block text-slate-500">{source.courseTitle}</span></span></label>)}</div></div><div className="mt-4 grid gap-3 sm:grid-cols-[140px_1fr_auto] sm:items-end"><Field label="Credited units"><Input type="number" min="0" step="0.5" value={units ?? ""} onChange={(event) => setUnits(event.target.value ? Number(event.target.value) : undefined)} /></Field><Field label="Academic rationale"><Textarea className="min-h-9" value={rationale} onChange={(event) => setRationale(event.target.value)} /></Field><Button onClick={() => void review()} disabled={!targetCourseId || !sourceIds.length || !rationale || save.isPending}>{save.isPending ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}Save decision</Button></div></section>
}

function DecisionPanel({ evaluation, canApprove, canReview }: { evaluation: EvaluationCase; canApprove: boolean; canReview: boolean }) {
  const transition = useEvaluationTransition(); const [reason, setReason] = useState("")
  const academicStage = evaluation.status === "PENDING_ACADEMIC_REVIEW" && canReview
  const registrarStage = evaluation.status === "PENDING_REGISTRAR_APPROVAL" && canApprove
  async function act(action: "forward" | "approve" | "return" | "reject") { try { await transition.mutateAsync({ id: evaluation.id, action, reason }); setReason(""); toast.success(`Evaluation ${action === "forward" ? "forwarded" : `${action}d`}`) } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to update evaluation") } }
  if (!academicStage && !registrarStage) return null
  return <section className="mt-6 rounded-xl border p-4"><div className="flex items-center gap-2"><ShieldCheck className="size-5 text-[#0f7d82]" /><h3 className="font-semibold">{academicStage ? "Academic review decision" : "Registrar final decision"}</h3></div><Field label="Decision reason"><Textarea className="mt-3" value={reason} onChange={(event) => setReason(event.target.value)} /></Field><div className="mt-3 flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={() => void act("return")} disabled={!reason || transition.isPending}><Undo2 />Return</Button><Button variant="destructive" onClick={() => void act("reject")} disabled={!reason || transition.isPending}><XCircle />Reject</Button>{academicStage ? <Button onClick={() => void act("forward")} disabled={!reason || transition.isPending}><Send />Forward to Registrar</Button> : <Button onClick={() => void act("approve")} disabled={!reason || transition.isPending}><CheckCircle2 />Approve and post credits</Button>}</div></section>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="grid gap-1.5"><Label>{label}</Label>{children}</div> }
function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-lg border p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold text-[#0f7d82]">{value}</p></div> }
