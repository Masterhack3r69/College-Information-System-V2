import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, Archive, CalendarDays, CheckCircle2, Copy, History, Loader2, Pencil, Plus, Search, ShieldAlert, Trash2, Users, X } from "lucide-react"
import { toast } from "sonner"
import { api, ApiError } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useAcademicTerm } from "@/lib/academic-term-context"
import type { CurriculumDetailResponse, Faculty, FacultyLoad, FacultyType, Meeting, PageResponse, Program, Room, RoomAvailability, Schedule, ScheduleConflictResponse, ScheduleCopyPreview, ScheduleHistory, ScheduleLoadPolicy, ScheduleRequest, Section } from "@/lib/types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]
const FACULTY_TYPES: FacultyType[] = ["INSTRUCTOR", "PROFESSOR", "LECTURER", "DEAN", "PROGRAM_HEAD"]
const normalizeSemester = (value: string) => value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_")
const emptyMeeting = (roomId?: string): Meeting => ({ dayOfWeek: "MONDAY", startTime: "08:00", endTime: "09:00", componentType: "LECTURE", deliveryMode: "ONSITE", roomId })
const emptyForm = (): ScheduleRequest => ({ sectionId: "", courseId: "", facultyId: "", capacity: 30, status: "DRAFT", meetings: [emptyMeeting()] })
const apiMessage = (error: unknown) => error instanceof ApiError || error instanceof Error ? error.message : "The request could not be completed"

type LifecycleAction = "activate" | "cancel" | "archive" | "revise"
type LifecycleState = { action: LifecycleAction; schedule: Schedule } | null

export function SchedulesPage() {
  const { can } = useAuth()
  const academicTerm = useAcademicTerm()
  const qc = useQueryClient()
  const schoolYearId = academicTerm.schoolYearId
  const semesterId = academicTerm.semesterId
  const [tab, setTab] = useState("planner")
  const [search, setSearch] = useState("")
  const [programId, setProgramId] = useState("all")
  const [sectionId, setSectionId] = useState("all")
  const [status, setStatus] = useState("all")
  const [facultyId, setFacultyId] = useState("")
  const [availabilityDay, setAvailabilityDay] = useState("MONDAY")
  const [historyScheduleId, setHistoryScheduleId] = useState("")
  const [draftDialogOpen, setDraftDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Schedule | null>(null)
  const [form, setForm] = useState<ScheduleRequest>(emptyForm)
  const [conflicts, setConflicts] = useState<ScheduleConflictResponse | null>(null)
  const [visibleError, setVisibleError] = useState<string | null>(null)
  const [lifecycle, setLifecycle] = useState<LifecycleState>(null)
  const [reason, setReason] = useState("")
  const [acknowledgeLoad, setAcknowledgeLoad] = useState(false)
  const [copyOpen, setCopyOpen] = useState(false)
  const [selectedCopyIds, setSelectedCopyIds] = useState<string[]>([])
  const [targetSchoolYearId, setTargetSchoolYearId] = useState("")
  const [targetSemesterId, setTargetSemesterId] = useState("")
  const [copyPreview, setCopyPreview] = useState<ScheduleCopyPreview | null>(null)
  const [policyOpen, setPolicyOpen] = useState(false)

  const programs = useQuery({ queryKey: ["programs", "schedule"], queryFn: () => api<PageResponse<Program>>("/programs?size=200") })
  const sections = useQuery({ queryKey: ["sections", "schedule"], queryFn: () => api<PageResponse<Section>>("/sections?size=500") })
  const faculty = useQuery({ queryKey: ["faculty", "schedule"], queryFn: () => api<PageResponse<Faculty>>("/faculty?size=500") })
  const rooms = useQuery({ queryKey: ["rooms", "schedule"], queryFn: () => api<PageResponse<Room>>("/rooms?size=500") })

  const params = new URLSearchParams({ size: "500" })
  if (search) params.set("search", search)
  if (schoolYearId) params.set("schoolYearId", schoolYearId)
  if (semesterId) params.set("semesterId", semesterId)
  if (programId !== "all") params.set("programId", programId)
  if (sectionId !== "all") params.set("sectionId", sectionId)
  if (status !== "all") params.set("status", status)
  const schedules = useQuery({
    queryKey: ["schedules", params.toString()],
    queryFn: () => api<PageResponse<Schedule>>(`/schedules?${params}`),
    enabled: Boolean(schoolYearId && semesterId),
  })

  const scheduleItems = schedules.data?.items ?? []
  const activeFaculty = faculty.data?.items.filter(item => item.status === "ACTIVE") ?? []
  const activeRooms = rooms.data?.items.filter(item => item.status === "ACTIVE") ?? []
  const termSections = sections.data?.items.filter(item => item.schoolYearId === schoolYearId && item.semesterId === semesterId && item.status === "ACTIVE" && item.curriculumId) ?? []
  const selectedSection = sections.data?.items.find(item => item.id === form.sectionId)
  const curriculum = useQuery({ queryKey: ["curriculum-detail", selectedSection?.curriculumId], queryFn: () => api<CurriculumDetailResponse>(`/curricula/${selectedSection!.curriculumId}`), enabled: Boolean(selectedSection?.curriculumId) })
  const eligibleCourses = useMemo(() => curriculum.data?.courses.filter(item => item.yearLevel === selectedSection?.yearLevel && normalizeSemester(item.semester) === normalizeSemester(selectedSection?.semesterName ?? "")) ?? [], [curriculum.data, selectedSection])

  const facultyLoad = useQuery({
    queryKey: ["faculty-load", facultyId, schoolYearId, semesterId],
    queryFn: () => api<FacultyLoad>(`/schedules/timetables/faculty/${facultyId}/load?schoolYearId=${schoolYearId}&semesterId=${semesterId}`),
    enabled: tab === "faculty" && Boolean(facultyId && schoolYearId && semesterId),
  })
  const availability = useQuery({
    queryKey: ["room-availability", schoolYearId, semesterId, availabilityDay],
    queryFn: () => api<RoomAvailability[]>(`/schedules/timetables/rooms?schoolYearId=${schoolYearId}&semesterId=${semesterId}&dayOfWeek=${availabilityDay}`),
    enabled: tab === "rooms" && Boolean(schoolYearId && semesterId),
  })
  const historyQuery = useQuery({
    queryKey: ["schedule-history", historyScheduleId],
    queryFn: () => api<ScheduleHistory[]>(`/schedules/${historyScheduleId}/history`),
    enabled: tab === "history" && Boolean(historyScheduleId),
  })
  const policies = useQuery({
    queryKey: ["schedule-load-policies", schoolYearId, semesterId],
    queryFn: () => api<ScheduleLoadPolicy[]>(`/schedule-load-policies?schoolYearId=${schoolYearId}&semesterId=${semesterId}`),
    enabled: tab === "faculty" && can("SCHEDULE_POLICY_MANAGE") && Boolean(schoolYearId && semesterId),
  })

  const invalidateScheduling = () => {
    void qc.invalidateQueries({ queryKey: ["schedules"] })
    void qc.invalidateQueries({ queryKey: ["faculty-load"] })
    void qc.invalidateQueries({ queryKey: ["room-availability"] })
    void qc.invalidateQueries({ queryKey: ["schedule-history"] })
  }

  const saveDraft = useMutation({
    mutationFn: async () => {
      const section = sections.data?.items.find(item => item.id === form.sectionId)
      if (!section) throw new Error("Select a section")
      const payload = { ...form, status: "DRAFT", expectedVersion: editing?.version, roomId: uniformRoom(form.meetings) }
      const conflict = await api<ScheduleConflictResponse>("/schedules/check-conflict", { method: "POST", body: JSON.stringify({ ignoreScheduleId: editing?.id ?? null, sectionId: form.sectionId, facultyId: form.facultyId, schoolYearId: section.schoolYearId, semesterId: section.semesterId, meetings: form.meetings }) })
      setConflicts(conflict)
      if (conflict.hasConflicts) throw new Error("Resolve the listed conflicts before saving")
      return api<Schedule>(editing ? `/schedules/${editing.id}` : "/schedules", { method: editing ? "PUT" : "POST", body: JSON.stringify(payload) })
    },
    onSuccess: () => { toast.success(editing ? "Draft updated" : "Draft created"); setDraftDialogOpen(false); setVisibleError(null); invalidateScheduling() },
    onError: error => setVisibleError(apiMessage(error)),
  })

  const lifecycleMutation = useMutation({
    mutationFn: async () => {
      if (!lifecycle) throw new Error("Select a schedule action")
      const { action, schedule } = lifecycle
      if (action === "revise") {
        return api<Schedule>(`/schedules/${schedule.id}/revise`, { method: "POST", body: JSON.stringify({ expectedVersion: schedule.version, reason, facultyId: form.facultyId, capacity: form.capacity, meetings: form.meetings, acknowledgeLoadWarning: acknowledgeLoad, acknowledgedWarnings: acknowledgeLoad ? ["FACULTY_LOAD_WARNING"] : [] }) })
      }
      return api<Schedule>(`/schedules/${schedule.id}/${action}`, { method: "POST", body: JSON.stringify({ expectedVersion: schedule.version, reason, acknowledgeLoadWarning: acknowledgeLoad, acknowledgedWarnings: acknowledgeLoad ? ["FACULTY_LOAD_WARNING"] : [] }) })
    },
    onSuccess: result => { toast.success(`Schedule ${lifecycle?.action === "revise" ? "revised" : lifecycle?.action + "d"}`); setLifecycle(null); setReason(""); setAcknowledgeLoad(false); setVisibleError(null); setHistoryScheduleId(result.id); invalidateScheduling() },
    onError: error => setVisibleError(apiMessage(error)),
  })

  const copyMutation = useMutation({
    mutationFn: (execute: boolean) => api<ScheduleCopyPreview | { createdCount:number; createdScheduleIds:string[] }>(execute ? "/schedules/copy-term" : "/schedules/copy-term/preview", { method: "POST", body: JSON.stringify({ sourceSchoolYearId: schoolYearId, sourceSemesterId: semesterId, targetSchoolYearId, targetSemesterId, scheduleIds: selectedCopyIds }) }),
    onSuccess: (result, execute) => {
      if (execute) { toast.success("Selected schedules copied atomically as drafts"); setCopyOpen(false); setCopyPreview(null); setSelectedCopyIds([]); invalidateScheduling() }
      else setCopyPreview(result as ScheduleCopyPreview)
    },
    onError: error => setVisibleError(apiMessage(error)),
  })

  const openCreate = () => { setEditing(null); setForm(emptyForm()); setConflicts(null); setVisibleError(null); setDraftDialogOpen(true) }
  const openDraftEdit = (item: Schedule) => { setEditing(item); setForm(toRequest(item)); setConflicts(null); setVisibleError(null); setDraftDialogOpen(true) }
  const openLifecycle = (action: LifecycleAction, item: Schedule) => { setLifecycle({ action, schedule: item }); setReason(""); setAcknowledgeLoad(false); setVisibleError(null); if (action === "revise") setForm(toRequest(item)) }
  const updateMeeting = (index: number, values: Partial<Meeting>) => setForm(current => ({ ...current, meetings: current.meetings.map((item, itemIndex) => itemIndex === index ? { ...item, ...values } : item) }))

  return <main className="mx-auto flex max-w-[1540px] flex-col gap-5 p-4 md:p-6 lg:p-7">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="text-2xl font-semibold tracking-tight text-[#0b1f3a]">Scheduling workspace</h1><p className="mt-1 text-sm text-muted-foreground">Plan drafts, publish controlled revisions, and inspect resource use by term.</p></div>
      <div className="flex flex-wrap gap-2">
        {can("SCHEDULE_MANAGE") && <Button variant="outline" onClick={() => { setCopyOpen(true); setVisibleError(null) }}><Copy data-icon="inline-start"/>Copy term</Button>}
        {can("SCHEDULE_MANAGE") && <Button onClick={openCreate}><Plus data-icon="inline-start"/>New draft</Button>}
      </div>
    </header>

    {visibleError && <Alert variant="destructive"><ShieldAlert/><AlertTitle>Scheduling action needs attention</AlertTitle><AlertDescription>{visibleError}</AlertDescription></Alert>}

    <TermAndSearchFilters search={search} setSearch={setSearch} schoolYearId={schoolYearId} semesterId={semesterId} academicTerm={academicTerm} programId={programId} setProgramId={setProgramId} programs={programs.data?.items ?? []}/>

    <Tabs value={tab} onValueChange={setTab}>
      <TabsList variant="line" style={{ height: "auto" }} className="grid w-full grid-cols-2 gap-1 overflow-visible sm:flex sm:max-w-full sm:overflow-x-auto">
        <TabsTrigger value="planner"><CalendarDays/>Planner</TabsTrigger>
        <TabsTrigger value="section">Section timetable</TabsTrigger>
        <TabsTrigger value="faculty"><Users/>Faculty load</TabsTrigger>
        <TabsTrigger value="rooms">Room availability</TabsTrigger>
        <TabsTrigger value="history"><History/>History</TabsTrigger>
      </TabsList>

      <TabsContent value="planner" className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-44"><SelectValue placeholder="All statuses"/></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{["DRAFT","ACTIVE","CANCELLED","ARCHIVED"].map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select>
          <p className="self-center text-sm text-muted-foreground">{scheduleItems.length} offerings in the selected term</p>
        </div>
        <ScheduleTable items={scheduleItems} loading={schedules.isLoading} canManage={can("SCHEDULE_MANAGE")} canRevise={can("SCHEDULE_REVISE")} onDraftEdit={openDraftEdit} onLifecycle={openLifecycle} onHistory={id => { setHistoryScheduleId(id); setTab("history") }}/>
      </TabsContent>

      <TabsContent value="section" className="flex flex-col gap-4">
        <Select value={sectionId} onValueChange={setSectionId}><SelectTrigger className="w-full sm:w-80"><SelectValue placeholder="Select a section"/></SelectTrigger><SelectContent><SelectItem value="all">All sections</SelectItem>{termSections.map(item => <SelectItem key={item.id} value={item.id}>{item.sectionCode} · Year {item.yearLevel}</SelectItem>)}</SelectContent></Select>
        <WeeklyTimetable items={scheduleItems.filter(item => sectionId === "all" || item.sectionId === sectionId)}/>
      </TabsContent>

      <TabsContent value="faculty" className="flex flex-col gap-4">
        <div className="flex flex-wrap justify-between gap-2"><Select value={facultyId} onValueChange={setFacultyId}><SelectTrigger className="w-full sm:w-80"><SelectValue placeholder="Select faculty"/></SelectTrigger><SelectContent>{activeFaculty.map(item => <SelectItem key={item.id} value={item.id}>{item.firstName} {item.lastName} · {item.facultyType}</SelectItem>)}</SelectContent></Select>{can("SCHEDULE_POLICY_MANAGE") && <Button variant="outline" onClick={() => setPolicyOpen(true)}><Plus data-icon="inline-start"/>Load policy</Button>}</div>
        <FacultyLoadPanel load={facultyLoad.data} loading={facultyLoad.isLoading}/>
        {can("SCHEDULE_POLICY_MANAGE") && (
          <PolicyTable items={policies.data ?? []} onChanged={() => void qc.invalidateQueries({ queryKey: ["schedule-load-policies"] })}/>
        )}
      </TabsContent>

      <TabsContent value="rooms" className="flex flex-col gap-4">
        <Select value={availabilityDay} onValueChange={setAvailabilityDay}><SelectTrigger className="w-52"><SelectValue/></SelectTrigger><SelectContent>{DAYS.map(day => <SelectItem key={day} value={day}>{title(day)}</SelectItem>)}</SelectContent></Select>
        <RoomAvailabilityTable items={availability.data ?? []} loading={availability.isLoading}/>
      </TabsContent>

      <TabsContent value="history" className="flex flex-col gap-4">
        <Select value={historyScheduleId} onValueChange={setHistoryScheduleId}><SelectTrigger className="w-full sm:w-[420px]"><SelectValue placeholder="Select an offering"/></SelectTrigger><SelectContent>{scheduleItems.map(item => <SelectItem key={item.id} value={item.id}>{item.courseCode} · {item.sectionCode} · {item.status}</SelectItem>)}</SelectContent></Select>
        <HistoryPanel items={historyQuery.data ?? []} loading={historyQuery.isLoading}/>
      </TabsContent>
    </Tabs>

    <ScheduleEditor open={draftDialogOpen} onOpenChange={setDraftDialogOpen} title={editing ? "Edit draft schedule" : "Create draft schedule"} description="Identity fields remain editable until activation. Meetings carry their own component, delivery mode, and room." form={form} setForm={setForm} section={selectedSection} sections={termSections} courses={eligibleCourses} faculty={activeFaculty} rooms={activeRooms} conflicts={conflicts} saving={saveDraft.isPending} onSave={() => saveDraft.mutate()} updateMeeting={updateMeeting}/>
    <LifecycleDialog state={lifecycle} open={Boolean(lifecycle)} onOpenChange={open => !open && setLifecycle(null)} reason={reason} setReason={setReason} acknowledgeLoad={acknowledgeLoad} setAcknowledgeLoad={setAcknowledgeLoad} form={form} setForm={setForm} faculty={activeFaculty} rooms={activeRooms} pending={lifecycleMutation.isPending} onConfirm={() => lifecycleMutation.mutate()} updateMeeting={updateMeeting}/>
    <CopyTermDialog open={copyOpen} onOpenChange={setCopyOpen} schedules={scheduleItems.filter(item => item.status === "ACTIVE" || item.status === "ARCHIVED")} selectedIds={selectedCopyIds} setSelectedIds={setSelectedCopyIds} targetSchoolYearId={targetSchoolYearId} setTargetSchoolYearId={setTargetSchoolYearId} targetSemesterId={targetSemesterId} setTargetSemesterId={setTargetSemesterId} academicTerm={academicTerm} preview={copyPreview} pending={copyMutation.isPending} onPreview={() => copyMutation.mutate(false)} onExecute={() => copyMutation.mutate(true)}/>
    <PolicyDialog open={policyOpen} onOpenChange={setPolicyOpen} schoolYearId={schoolYearId} semesterId={semesterId} onSaved={() => { setPolicyOpen(false); void qc.invalidateQueries({ queryKey: ["schedule-load-policies"] }) }}/>
  </main>
}

function TermAndSearchFilters({ search, setSearch, schoolYearId, semesterId, academicTerm, programId, setProgramId, programs }: { search:string; setSearch:(value:string)=>void; schoolYearId:string; semesterId:string; academicTerm:ReturnType<typeof useAcademicTerm>; programId:string; setProgramId:(value:string)=>void; programs:Program[] }) {
  return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
    <div className="relative"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground"/><Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search course, section, faculty or room" className="pl-9"/></div>
    <Select value={schoolYearId} onValueChange={value => academicTerm.setTerm(value, semesterId)}><SelectTrigger><SelectValue placeholder="School year"/></SelectTrigger><SelectContent>{academicTerm.schoolYears.map(item => <SelectItem key={item.id} value={item.id}>{item.schoolYear}</SelectItem>)}</SelectContent></Select>
    <Select value={semesterId} onValueChange={value => academicTerm.setTerm(schoolYearId, value)}><SelectTrigger><SelectValue placeholder="Semester"/></SelectTrigger><SelectContent>{academicTerm.semesters.map(item => <SelectItem key={item.id} value={item.id}>{item.name.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select>
    <Select value={programId} onValueChange={setProgramId}><SelectTrigger><SelectValue placeholder="Program"/></SelectTrigger><SelectContent><SelectItem value="all">All programs</SelectItem>{programs.map(item => <SelectItem key={item.id} value={item.id}>{item.programCode}</SelectItem>)}</SelectContent></Select>
  </div>
}

function ScheduleTable({ items, loading, canManage, canRevise, onDraftEdit, onLifecycle, onHistory }: { items:Schedule[]; loading:boolean; canManage:boolean; canRevise:boolean; onDraftEdit:(item:Schedule)=>void; onLifecycle:(action:LifecycleAction,item:Schedule)=>void; onHistory:(id:string)=>void }) {
  return <div className="overflow-hidden rounded-lg border"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Offering</TableHead><TableHead>Faculty</TableHead><TableHead>Meetings</TableHead><TableHead>Capacity</TableHead><TableHead>Status</TableHead><TableHead>Latest change</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>
    {loading ? <TableRow><TableCell colSpan={7} className="h-32 text-center"><Loader2 className="mx-auto animate-spin"/></TableCell></TableRow> : items.length ? items.map(item => <TableRow key={item.id}>
      <TableCell><p className="font-medium text-[#0b1f3a]">{item.courseCode} · {item.sectionCode}</p><p className="text-xs text-muted-foreground">{item.courseTitle}</p></TableCell>
      <TableCell>{item.facultyName}</TableCell>
      <TableCell><div className="flex min-w-52 flex-col gap-1 text-xs">{item.meetings.map(meeting => <span key={`${meeting.dayOfWeek}-${meeting.startTime}`}>{meeting.dayOfWeek.slice(0,3)} {meeting.startTime.slice(0,5)}–{meeting.endTime.slice(0,5)} · {meeting.deliveryMode === "ONLINE" ? "Online" : meeting.roomCode ?? "Room pending"} · {meeting.componentType}</span>)}</div></TableCell>
      <TableCell>{item.enrolledCount} / {item.capacity}</TableCell>
      <TableCell><Badge variant={item.status === "ACTIVE" ? "default" : "secondary"}>{item.status}</Badge>{item.warnings?.map(warning => <p key={warning.code} className="mt-1 max-w-48 text-xs text-amber-700">{warning.message}</p>)}</TableCell>
      <TableCell className="text-xs text-muted-foreground">{item.latestChange ? <><p>{item.latestChange.action}</p><p>{new Date(item.latestChange.changedAt).toLocaleString()}</p></> : "—"}</TableCell>
      <TableCell><div className="flex justify-end gap-1">
        <Button size="icon" variant="ghost" onClick={() => onHistory(item.id)} aria-label={`History for ${item.courseCode}`}><History/></Button>
        {canManage && item.status === "DRAFT" && <Button size="icon" variant="ghost" onClick={() => onDraftEdit(item)} aria-label={`Edit ${item.courseCode}`}><Pencil/></Button>}
        {canManage && item.status === "DRAFT" && <Button size="icon" variant="ghost" onClick={() => onLifecycle("activate",item)} aria-label={`Activate ${item.courseCode}`}><CheckCircle2/></Button>}
        {canRevise && item.status === "ACTIVE" && <Button size="icon" variant="ghost" onClick={() => onLifecycle("revise",item)} aria-label={`Revise ${item.courseCode}`}><Pencil/></Button>}
        {canManage && (item.status === "DRAFT" || item.status === "ACTIVE") && <Button size="icon" variant="ghost" onClick={() => onLifecycle("cancel",item)} aria-label={`Cancel ${item.courseCode}`}><Trash2/></Button>}
        {canManage && item.status !== "ARCHIVED" && <Button size="icon" variant="ghost" onClick={() => onLifecycle("archive",item)} aria-label={`Archive ${item.courseCode}`}><Archive/></Button>}
      </div></TableCell>
    </TableRow>) : <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">No schedules match the selected term and filters.</TableCell></TableRow>}
  </TableBody></Table></div></div>
}

function WeeklyTimetable({ items }: { items:Schedule[] }) {
  return <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">{DAYS.map(day => <section key={day} className="overflow-hidden rounded-lg border"><h3 className="border-b bg-muted/50 px-4 py-3 font-medium">{title(day)}</h3><div className="flex min-h-24 flex-col gap-2 p-3">{items.flatMap(schedule => schedule.meetings.filter(meeting => meeting.dayOfWeek === day).map(meeting => <article key={`${schedule.id}-${meeting.startTime}`} className="rounded-md border-l-4 border-l-primary bg-background p-3"><p className="font-medium">{meeting.startTime.slice(0,5)}–{meeting.endTime.slice(0,5)} · {schedule.courseCode}</p><p className="text-xs text-muted-foreground">{schedule.sectionCode} · {schedule.facultyName}</p><p className="mt-1 text-xs">{meeting.deliveryMode === "ONLINE" ? meeting.locationDetails || "Online" : meeting.roomCode}</p></article>))}{!items.some(schedule => schedule.meetings.some(meeting => meeting.dayOfWeek === day)) && <p className="self-center p-5 text-sm text-muted-foreground">Available</p>}</div></section>)}</div>
}

function FacultyLoadPanel({ load, loading }: { load?:FacultyLoad; loading:boolean }) {
  if (loading) return <div className="rounded-lg border p-8 text-center"><Loader2 className="mx-auto animate-spin"/></div>
  if (!load) return <div className="rounded-lg border p-8 text-center text-muted-foreground">Select a faculty member to inspect teaching load.</div>
  return <section className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-5">
    <Metric label="Weekly contact" value={`${load.weeklyContactHours} h`}/><Metric label="Active classes" value={String(load.activeClasses)}/><Metric label="Confirmed students" value={String(load.confirmedStudents)}/><Metric label="Policy limit" value={load.policyConfigured ? `${load.maximumWeeklyContactHours} h` : "Not configured"}/><Metric label="Remaining" value={load.remainingHours == null ? "—" : `${load.remainingHours} h`}/>
    {load.overloaded && <Alert variant="destructive" className="sm:col-span-2 lg:col-span-5"><AlertTriangle/><AlertTitle>Teaching load exceeds policy</AlertTitle><AlertDescription>Activation requires SCHEDULE_OVERRIDE and a reason.</AlertDescription></Alert>}
  </section>
}

function PolicyTable({ items, onChanged }: { items:ScheduleLoadPolicy[]; onChanged:()=>void }) {
  const mutation = useMutation({ mutationFn:(id:string)=>api(`/schedule-load-policies/${id}`,{method:"DELETE"}), onSuccess:()=>{toast.success("Policy deactivated");onChanged()}, onError:error=>toast.error(apiMessage(error)) })
  return <section className="overflow-hidden rounded-lg border"><div className="border-b px-4 py-3"><h3 className="font-medium">Active term load policies</h3></div><Table><TableHeader><TableRow><TableHead>Scope</TableHead><TableHead>Hours</TableHead><TableHead>Classes</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader><TableBody>{items.length ? items.map(item => <TableRow key={item.id}><TableCell>{item.facultyType ?? "Term default"}</TableCell><TableCell>{item.maximumWeeklyContactHours}</TableCell><TableCell>{item.maximumActiveClasses ?? "—"}</TableCell><TableCell className="text-right"><Button size="sm" variant="ghost" onClick={()=>mutation.mutate(item.id)}>Deactivate</Button></TableCell></TableRow>) : <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No policy configured.</TableCell></TableRow>}</TableBody></Table></section>
}

function RoomAvailabilityTable({ items, loading }: { items:RoomAvailability[]; loading:boolean }) {
  return <div className="overflow-hidden rounded-lg border"><Table><TableHeader><TableRow><TableHead>Room</TableHead><TableHead>Profile</TableHead><TableHead>Occupied periods</TableHead></TableRow></TableHeader><TableBody>{loading ? <TableRow><TableCell colSpan={3} className="h-28 text-center"><Loader2 className="mx-auto animate-spin"/></TableCell></TableRow> : items.map(room => <TableRow key={room.roomId}><TableCell><p className="font-medium">{room.roomCode}</p><p className="text-xs text-muted-foreground">{room.roomName}</p></TableCell><TableCell>{room.building ?? "—"} · {room.roomType ?? "Unconfigured"} · {room.capacity ?? "—"} seats</TableCell><TableCell><div className="flex flex-wrap gap-1">{room.occupiedPeriods.length ? room.occupiedPeriods.map(period => <Badge key={`${period.scheduleId}-${period.startTime}`} variant="outline">{period.startTime.slice(0,5)}–{period.endTime.slice(0,5)} {period.courseCode}/{period.sectionCode}</Badge>) : <span className="text-sm text-emerald-700">Available all day</span>}</div></TableCell></TableRow>)}</TableBody></Table></div>
}

function HistoryPanel({ items, loading }: { items:ScheduleHistory[]; loading:boolean }) {
  if (loading) return <div className="rounded-lg border p-8 text-center"><Loader2 className="mx-auto animate-spin"/></div>
  if (!items.length) return <div className="rounded-lg border p-8 text-center text-muted-foreground">Select an offering or no changes have been recorded yet.</div>
  return <div className="flex flex-col gap-3">{items.map(item => <article key={item.id} className="grid gap-2 rounded-lg border p-4 md:grid-cols-[150px_1fr_220px]"><Badge className="w-fit" variant="outline">{item.action}</Badge><div><p className="font-medium">{item.reason || "No reason supplied"}</p>{item.acknowledgedWarnings.length > 0 && <p className="mt-1 text-xs text-amber-700">Acknowledged: {item.acknowledgedWarnings.join(", ")}</p>}</div><p className="text-xs text-muted-foreground md:text-right">{item.actorName || "System"}<br/>{new Date(item.changedAt).toLocaleString()}</p></article>)}</div>
}

function ScheduleEditor({ open, onOpenChange, title: dialogTitle, description, form, setForm, section, sections, courses, faculty, rooms, conflicts, saving, onSave, updateMeeting }: { open:boolean; onOpenChange:(open:boolean)=>void; title:string; description:string; form:ScheduleRequest; setForm:React.Dispatch<React.SetStateAction<ScheduleRequest>>; section?:Section; sections:Section[]; courses:CurriculumDetailResponse["courses"]; faculty:Faculty[]; rooms:Room[]; conflicts:ScheduleConflictResponse|null; saving:boolean; onSave:()=>void; updateMeeting:(index:number,values:Partial<Meeting>)=>void }) {
  const valid = Boolean(form.sectionId && form.courseId && form.facultyId && form.capacity > 0 && form.meetings.length && form.meetings.every(meeting => meeting.dayOfWeek && meeting.startTime < meeting.endTime && (meeting.deliveryMode === "ONLINE" || meeting.roomId)))
  const applyPattern = (days:string[]) => setForm(current => ({ ...current, meetings: days.map(day => ({ ...current.meetings[0], id:undefined, dayOfWeek:day })) }))
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl"><DialogHeader><DialogTitle>{dialogTitle}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader><div className="flex flex-col gap-5">
    <div className="grid gap-4 sm:grid-cols-2"><FormField label="Section"><Picker value={form.sectionId} onChange={value=>setForm(current=>({...current,sectionId:value,courseId:""}))} placeholder="Select section" items={sections.map(item=>({value:item.id,label:`${item.sectionCode} · ${item.curriculumCode}`}))}/></FormField><FormField label="Course"><Picker value={form.courseId} onChange={value=>setForm(current=>({...current,courseId:value}))} placeholder="Eligible course" items={courses.map(item=>({value:item.courseId,label:`${item.courseCode} — ${item.courseTitle}`}))}/></FormField><FormField label="Faculty"><Picker value={form.facultyId} onChange={value=>setForm(current=>({...current,facultyId:value}))} placeholder="Select faculty" items={faculty.map(item=>({value:item.id,label:`${item.firstName} ${item.lastName}`}))}/></FormField><FormField label="Capacity"><Input type="number" min={1} max={section?.maximumCapacity} value={form.capacity} onChange={event=>setForm(current=>({...current,capacity:Number(event.target.value)}))}/><p className="text-xs text-muted-foreground">Section maximum: {section?.maximumCapacity ?? "not configured"}</p></FormField></div>
    <div className="flex flex-wrap items-center gap-2"><Label>Day shortcuts</Label><Button type="button" size="sm" variant="outline" onClick={()=>applyPattern(["MONDAY","WEDNESDAY","FRIDAY"])}>MWF</Button><Button type="button" size="sm" variant="outline" onClick={()=>applyPattern(["TUESDAY","THURSDAY"])}>TTh</Button><Button type="button" size="sm" variant="outline" onClick={()=>applyPattern(["SATURDAY","SUNDAY"])}>Weekend</Button><Button type="button" size="sm" variant="outline" onClick={()=>setForm(current=>({...current,meetings:[...current.meetings,emptyMeeting()]}))}><Plus data-icon="inline-start"/>Meeting</Button></div>
    <div className="flex flex-col gap-3">{form.meetings.map((meeting,index)=><MeetingEditor key={index} meeting={meeting} rooms={rooms} onChange={values=>updateMeeting(index,values)} onRemove={()=>setForm(current=>({...current,meetings:current.meetings.filter((_,i)=>i!==index)}))} removable={form.meetings.length>1}/>)}</div>
    {conflicts?.hasConflicts && <Alert variant="destructive"><AlertTriangle/><AlertTitle>Conflicts found</AlertTitle><AlertDescription><div className="flex flex-col gap-1">{conflicts.conflicts.map((item,index)=><p key={`${item.scheduleId}-${index}`}>{item.conflictType}: {item.courseCode}/{item.sectionCode}, {title(item.dayOfWeek)} {item.existingStartTime.slice(0,5)}–{item.existingEndTime.slice(0,5)}</p>)}</div></AlertDescription></Alert>}
  </div><DialogFooter><Button variant="outline" onClick={()=>onOpenChange(false)}>Close</Button><Button onClick={onSave} disabled={!valid||saving}>{saving&&<Loader2 className="animate-spin"/>}Save draft</Button></DialogFooter></DialogContent></Dialog>
}

function MeetingEditor({ meeting, rooms, onChange, onRemove, removable }: { meeting:Meeting; rooms:Room[]; onChange:(values:Partial<Meeting>)=>void; onRemove:()=>void; removable:boolean }) {
  return <div className="grid gap-3 rounded-lg border p-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_1.2fr_1.3fr_auto]">
    <Picker value={meeting.dayOfWeek} onChange={dayOfWeek=>onChange({dayOfWeek})} placeholder="Day" items={DAYS.map(day=>({value:day,label:title(day)}))}/>
    <Input aria-label="Start time" type="time" value={meeting.startTime} onChange={event=>onChange({startTime:event.target.value})}/>
    <Input aria-label="End time" type="time" value={meeting.endTime} onChange={event=>onChange({endTime:event.target.value})}/>
    <Picker value={meeting.componentType ?? "LECTURE"} onChange={value=>onChange({componentType:value as Meeting["componentType"]})} placeholder="Component" items={["LECTURE","LABORATORY","COMBINED"].map(value=>({value,label:title(value)}))}/>
    <Picker value={meeting.deliveryMode ?? "ONSITE"} onChange={value=>onChange({deliveryMode:value as Meeting["deliveryMode"],roomId:value==="ONLINE"?undefined:meeting.roomId})} placeholder="Delivery" items={["ONSITE","ONLINE","HYBRID"].map(value=>({value,label:title(value)}))}/>
    {meeting.deliveryMode === "ONLINE"
      ? <Input aria-label="Online location" value={meeting.locationDetails ?? ""} onChange={event=>onChange({locationDetails:event.target.value})} placeholder="Meeting link / platform"/>
      : <Picker value={meeting.roomId ?? ""} onChange={roomId=>onChange({roomId})} placeholder="Room" items={rooms.map(room=>({value:room.id,label:`${room.roomCode} · ${room.capacity ?? "?"} seats`}))}/>
    }
    <Button type="button" size="icon" variant="ghost" disabled={!removable} onClick={onRemove} aria-label="Remove meeting"><X/></Button>
  </div>
}

function LifecycleDialog({ state, open, onOpenChange, reason, setReason, acknowledgeLoad, setAcknowledgeLoad, form, setForm, faculty, rooms, pending, onConfirm, updateMeeting }: { state:LifecycleState; open:boolean; onOpenChange:(open:boolean)=>void; reason:string; setReason:(value:string)=>void; acknowledgeLoad:boolean; setAcknowledgeLoad:(value:boolean)=>void; form:ScheduleRequest; setForm:React.Dispatch<React.SetStateAction<ScheduleRequest>>; faculty:Faculty[]; rooms:Room[]; pending:boolean; onConfirm:()=>void; updateMeeting:(index:number,values:Partial<Meeting>)=>void }) {
  if (!state) return null
  const { action, schedule } = state
  const revise = action === "revise"
  const warning = schedule.warnings?.find(item=>item.requiresOverride)
  const needsReason = revise || action === "cancel" || action === "archive" || Boolean(warning)
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className={revise?"max-h-[92vh] overflow-y-auto sm:max-w-4xl":"sm:max-w-lg"}><DialogHeader><DialogTitle>{title(action)} {schedule.courseCode} · {schedule.sectionCode}</DialogTitle><DialogDescription>{revise?"Course, section, and term are locked. Publish a reasoned replacement for the active faculty, capacity, and meetings.":`This explicit lifecycle action is recorded in schedule history at version ${schedule.version}.`}</DialogDescription></DialogHeader><div className="flex flex-col gap-4">
    {warning && <Alert><AlertTriangle/><AlertTitle>{warning.code}</AlertTitle><AlertDescription>{warning.message}</AlertDescription></Alert>}
    {revise && <><div className="grid gap-3 sm:grid-cols-2"><FormField label="Faculty"><Picker value={form.facultyId} onChange={facultyId=>setForm(current=>({...current,facultyId}))} placeholder="Faculty" items={faculty.map(item=>({value:item.id,label:`${item.firstName} ${item.lastName}`}))}/></FormField><FormField label="Capacity"><Input type="number" min={1} value={form.capacity} onChange={event=>setForm(current=>({...current,capacity:Number(event.target.value)}))}/></FormField></div><div className="flex flex-col gap-3">{form.meetings.map((meeting,index)=><MeetingEditor key={index} meeting={meeting} rooms={rooms} onChange={values=>updateMeeting(index,values)} onRemove={()=>setForm(current=>({...current,meetings:current.meetings.filter((_,i)=>i!==index)}))} removable={form.meetings.length>1}/>)}</div><Button type="button" variant="outline" onClick={()=>setForm(current=>({...current,meetings:[...current.meetings,emptyMeeting()]}))}><Plus data-icon="inline-start"/>Add meeting</Button></>}
    <FormField label={needsReason?"Reason (required)":"Activation note (optional)"}><Textarea value={reason} onChange={event=>setReason(event.target.value)} placeholder="Explain why this lifecycle change is needed"/></FormField>
    {warning && <label className="flex items-start gap-2 text-sm"><Checkbox checked={acknowledgeLoad} onCheckedChange={value=>setAcknowledgeLoad(value===true)}/><span>I acknowledge this overload warning and have authority to override it.</span></label>}
  </div><DialogFooter><Button variant="outline" onClick={()=>onOpenChange(false)}>Back</Button><Button onClick={onConfirm} disabled={pending||(needsReason&&!reason.trim())||(Boolean(warning)&&!acknowledgeLoad)}>{pending&&<Loader2 className="animate-spin"/>}Confirm {action}</Button></DialogFooter></DialogContent></Dialog>
}

function CopyTermDialog({ open, onOpenChange, schedules, selectedIds, setSelectedIds, targetSchoolYearId, setTargetSchoolYearId, targetSemesterId, setTargetSemesterId, academicTerm, preview, pending, onPreview, onExecute }: { open:boolean; onOpenChange:(open:boolean)=>void; schedules:Schedule[]; selectedIds:string[]; setSelectedIds:React.Dispatch<React.SetStateAction<string[]>>; targetSchoolYearId:string; setTargetSchoolYearId:(value:string)=>void; targetSemesterId:string; setTargetSemesterId:(value:string)=>void; academicTerm:ReturnType<typeof useAcademicTerm>; preview:ScheduleCopyPreview|null; pending:boolean; onPreview:()=>void; onExecute:()=>void }) {
  const toggle=(id:string)=>setSelectedIds(current=>current.includes(id)?current.filter(value=>value!==id):[...current,id])
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>Atomic term copy</DialogTitle><DialogDescription>Preview section mapping and blockers. Execution revalidates and creates every selected draft or none.</DialogDescription></DialogHeader><div className="flex flex-col gap-4"><div className="grid gap-3 sm:grid-cols-2"><FormField label="Target school year"><Picker value={targetSchoolYearId} onChange={setTargetSchoolYearId} placeholder="School year" items={academicTerm.schoolYears.map(item=>({value:item.id,label:item.schoolYear}))}/></FormField><FormField label="Target semester"><Picker value={targetSemesterId} onChange={setTargetSemesterId} placeholder="Semester" items={academicTerm.semesters.map(item=>({value:item.id,label:item.name.replaceAll("_"," ")}))}/></FormField></div><div className="max-h-64 overflow-y-auto rounded-lg border">{schedules.map(item=><label key={item.id} className="flex items-center gap-3 border-b p-3 last:border-0"><Checkbox checked={selectedIds.includes(item.id)} onCheckedChange={()=>toggle(item.id)}/><span className="flex-1 text-sm"><strong>{item.courseCode}</strong> · {item.sectionCode} · {item.facultyName}</span><Badge variant="outline">{item.status}</Badge></label>)}</div>{preview&&<div className="flex flex-col gap-2">{preview.items.map(item=><Alert key={item.sourceScheduleId} variant={item.copyable?"default":"destructive"}>{item.copyable?<CheckCircle2/>:<AlertTriangle/>}<AlertTitle>{item.courseCode} · {item.sourceSectionCode} → {item.targetSectionCode ?? "No target"}</AlertTitle><AlertDescription>{item.issues.length?item.issues.join("; "):"Ready to copy"}</AlertDescription></Alert>)}</div>}</div><DialogFooter><Button variant="outline" onClick={()=>onOpenChange(false)}>Close</Button><Button variant="outline" onClick={onPreview} disabled={pending||!targetSchoolYearId||!targetSemesterId||!selectedIds.length}>{pending&&<Loader2 className="animate-spin"/>}Preview</Button><Button onClick={onExecute} disabled={pending||!preview?.executable}>Copy all drafts</Button></DialogFooter></DialogContent></Dialog>
}

function PolicyDialog({ open, onOpenChange, schoolYearId, semesterId, onSaved }: { open:boolean; onOpenChange:(open:boolean)=>void; schoolYearId:string; semesterId:string; onSaved:()=>void }) {
  const [facultyType,setFacultyType]=useState("DEFAULT");const [hours,setHours]=useState(18);const [classes,setClasses]=useState("")
  const mutation=useMutation({mutationFn:()=>api("/schedule-load-policies",{method:"POST",body:JSON.stringify({schoolYearId,semesterId,facultyType:facultyType==="DEFAULT"?null:facultyType,maximumWeeklyContactHours:hours,maximumActiveClasses:classes?Number(classes):null,active:true})}),onSuccess:()=>{toast.success("Load policy created");onSaved()},onError:error=>toast.error(apiMessage(error))})
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>New teaching-load policy</DialogTitle><DialogDescription>A faculty-type policy overrides the term default.</DialogDescription></DialogHeader><div className="grid gap-4"><FormField label="Scope"><Picker value={facultyType} onChange={setFacultyType} placeholder="Scope" items={[{value:"DEFAULT",label:"Term default"},...FACULTY_TYPES.map(value=>({value,label:title(value)}))]}/></FormField><FormField label="Maximum weekly contact hours"><Input type="number" min={0.25} step={0.25} value={hours} onChange={event=>setHours(Number(event.target.value))}/></FormField><FormField label="Maximum active classes (optional)"><Input type="number" min={1} value={classes} onChange={event=>setClasses(event.target.value)}/></FormField></div><DialogFooter><Button variant="outline" onClick={()=>onOpenChange(false)}>Cancel</Button><Button onClick={()=>mutation.mutate()} disabled={mutation.isPending||hours<=0}>{mutation.isPending&&<Loader2 className="animate-spin"/>}Create policy</Button></DialogFooter></DialogContent></Dialog>
}

function Picker({ value, onChange, placeholder, items }: { value:string; onChange:(value:string)=>void; placeholder:string; items:{value:string;label:string}[] }) { return <Select value={value} onValueChange={onChange}><SelectTrigger aria-label={placeholder}><SelectValue placeholder={placeholder}/></SelectTrigger><SelectContent>{items.map(item=><SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select> }
function FormField({ label, children }: { label:string; children:React.ReactNode }) { return <div className="flex flex-col gap-2"><Label>{label}</Label>{children}</div> }
function Metric({ label, value }: { label:string; value:string }) { return <div className="rounded-md bg-muted/50 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold">{value}</p></div> }
function title(value:string){return value.toLowerCase().replaceAll("_"," ").replace(/(^|\s)\S/g,letter=>letter.toUpperCase())}
function uniformRoom(meetings:Meeting[]){const ids=meetings.map(meeting=>meeting.roomId).filter(Boolean) as string[];return ids.length===meetings.length&&new Set(ids).size===1?ids[0]:undefined}
function toRequest(item:Schedule):ScheduleRequest{return{sectionId:item.sectionId,courseId:item.courseId,facultyId:item.facultyId,roomId:item.roomId,capacity:item.capacity,status:"DRAFT",expectedVersion:item.version,meetings:item.meetings.map(meeting=>({...meeting,startTime:meeting.startTime.slice(0,5),endTime:meeting.endTime.slice(0,5)}))}}
