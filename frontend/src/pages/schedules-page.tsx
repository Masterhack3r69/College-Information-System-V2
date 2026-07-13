import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, CalendarDays, Edit, Loader2, Plus, Search, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { api, ApiError } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import type { CurriculumDetailResponse, Faculty, Meeting, PageResponse, Program, Room, Schedule, ScheduleConflictResponse, ScheduleRequest, SchoolYear, Section, Semester } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]
const emptyMeeting = (): Meeting => ({ dayOfWeek: "MONDAY", startTime: "08:00", endTime: "09:00" })
const emptyForm = (): ScheduleRequest => ({ sectionId: "", courseId: "", facultyId: "", roomId: "", capacity: 30, status: "DRAFT", meetings: [emptyMeeting()] })
const normalizeSemester = (value: string) => value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_")
const CALENDAR_HOUR_HEIGHT = 60
const CALENDAR_FALLBACK_RANGE = { start: 8 * 60, end: 17 * 60 }
const CALENDAR_COLORS = [
  "border-blue-200/80 bg-blue-50/90 text-blue-950",
  "border-emerald-200/80 bg-emerald-50/90 text-emerald-950",
  "border-amber-200/80 bg-amber-50/90 text-amber-950",
  "border-violet-200/80 bg-violet-50/90 text-violet-950",
  "border-rose-200/80 bg-rose-50/90 text-rose-950",
  "border-cyan-200/80 bg-cyan-50/90 text-cyan-950",
]

type CalendarEntry = {
  schedule: Schedule
  meeting: Meeting
  start: number
  end: number
  lane: number
  laneCount: number
}

function timeToMinutes(time: string) {
  const [hours, minutes = 0] = time.split(":").map(Number)
  return hours * 60 + minutes
}

function formatCalendarTime(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return `${String(hours).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
}

function calendarColor(code: string) {
  let hash = 0
  for (let index = 0; index < code.length; index += 1) hash = code.charCodeAt(index) + ((hash << 5) - hash)
  return CALENDAR_COLORS[Math.abs(hash) % CALENDAR_COLORS.length]
}

function calendarRange(items: Schedule[]) {
  let earliest = Number.POSITIVE_INFINITY
  let latest = Number.NEGATIVE_INFINITY
  for (const schedule of items) {
    for (const meeting of schedule.meetings) {
      const start = timeToMinutes(meeting.startTime)
      const end = timeToMinutes(meeting.endTime)
      if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
        earliest = Math.min(earliest, start)
        latest = Math.max(latest, end)
      }
    }
  }
  if (!Number.isFinite(earliest) || !Number.isFinite(latest)) return CALENDAR_FALLBACK_RANGE
  return {
    start: Math.max(0, Math.floor((earliest - 30) / 30) * 30),
    end: Math.min(24 * 60, Math.ceil((latest + 30) / 30) * 30),
  }
}

function layoutDay(items: Schedule[], day: string): CalendarEntry[] {
  const entries = items.flatMap(schedule => schedule.meetings
    .filter(meeting => meeting.dayOfWeek === day)
    .map(meeting => ({ schedule, meeting, start: timeToMinutes(meeting.startTime), end: timeToMinutes(meeting.endTime), lane: 0, laneCount: 1 })))
    .filter(entry => Number.isFinite(entry.start) && Number.isFinite(entry.end) && entry.end > entry.start)
    .sort((left, right) => left.start - right.start || left.end - right.end)

  const result: CalendarEntry[] = []
  let group: CalendarEntry[] = []
  let groupEnd = -1
  const flushGroup = () => {
    if (!group.length) return
    const laneEnds: number[] = []
    for (const entry of group) {
      let lane = laneEnds.findIndex(end => end <= entry.start)
      if (lane < 0) lane = laneEnds.length
      laneEnds[lane] = entry.end
      entry.lane = lane
    }
    const laneCount = laneEnds.length
    group.forEach(entry => { entry.laneCount = laneCount })
    result.push(...group)
    group = []
  }

  for (const entry of entries) {
    if (group.length && entry.start >= groupEnd) flushGroup()
    group.push(entry)
    groupEnd = Math.max(groupEnd, entry.end)
  }
  flushGroup()
  return result
}

export function SchedulesPage() {
  const { can } = useAuth()
  const qc = useQueryClient()
  const [search, setSearch] = useState("")
  const [schoolYearId, setSchoolYearId] = useState("")
  const [semesterId, setSemesterId] = useState("")
  const [programId, setProgramId] = useState("all")
  const [curriculumId, setCurriculumId] = useState("all")
  const [sectionId, setSectionId] = useState("all")
  const [facultyId, setFacultyId] = useState("all")
  const [roomId, setRoomId] = useState("all")
  const [status, setStatus] = useState("all")
  const [view, setView] = useState<"table" | "weekly">("table")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Schedule | null>(null)
  const [form, setForm] = useState<ScheduleRequest>(emptyForm)
  const [conflicts, setConflicts] = useState<ScheduleConflictResponse | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<Schedule | null>(null)

  const years = useQuery({ queryKey: ["school-years", "schedule"], queryFn: () => api<PageResponse<SchoolYear>>("/school-years?size=50") })
  const semesters = useQuery({ queryKey: ["semesters", "schedule"], queryFn: () => api<PageResponse<Semester>>("/semesters?size=20") })
  const programs = useQuery({ queryKey: ["programs", "schedule"], queryFn: () => api<PageResponse<Program>>("/programs?size=200") })
  const sections = useQuery({ queryKey: ["sections", "schedule"], queryFn: () => api<PageResponse<Section>>("/sections?size=500") })
  const faculty = useQuery({ queryKey: ["faculty", "schedule"], queryFn: () => api<PageResponse<Faculty>>("/faculty?size=500") })
  const rooms = useQuery({ queryKey: ["rooms", "schedule"], queryFn: () => api<PageResponse<Room>>("/rooms?size=500") })

  useEffect(() => { if (!schoolYearId && years.data?.items.length) setSchoolYearId(years.data.items.find(item => item.active)?.id ?? years.data.items[0].id) }, [schoolYearId, years.data])
  useEffect(() => { if (!semesterId && semesters.data?.items.length) setSemesterId(semesters.data.items.find(item => item.active)?.id ?? semesters.data.items[0].id) }, [semesterId, semesters.data])

  const params = new URLSearchParams({ size: "500" })
  if (search) params.set("search", search)
  if (schoolYearId) params.set("schoolYearId", schoolYearId)
  if (semesterId) params.set("semesterId", semesterId)
  if (programId !== "all") params.set("programId", programId)
  if (sectionId !== "all") params.set("sectionId", sectionId)
  if (status !== "all") params.set("status", status)
  const schedules = useQuery({ queryKey: ["schedules", params.toString()], queryFn: () => api<PageResponse<Schedule>>(`/schedules?${params}`), enabled: !!schoolYearId && !!semesterId })

  const schedulableSections = sections.data?.items.filter(item => item.status === "ACTIVE" && item.curriculumId) ?? []
  const selectedSection = schedulableSections.find(item => item.id === form.sectionId)
  const curriculum = useQuery({ queryKey: ["curriculum-detail", selectedSection?.curriculumId], queryFn: () => api<CurriculumDetailResponse>(`/curricula/${selectedSection!.curriculumId}`), enabled: !!selectedSection?.curriculumId })
  const eligibleCourses = useMemo(() => curriculum.data?.courses.filter(item => item.yearLevel === selectedSection?.yearLevel && normalizeSemester(item.semester) === normalizeSemester(selectedSection?.semesterName ?? "")) ?? [], [curriculum.data, selectedSection])
  const visibleSections = sections.data?.items.filter(item => item.status === "ACTIVE" && item.curriculumId && item.schoolYearId === schoolYearId && item.semesterId === semesterId && (programId === "all" || item.programId === programId)) ?? []
  const curriculumOptions = Array.from(new Map(visibleSections.filter(item => item.curriculumId).map(item => [item.curriculumId!, item.curriculumCode!])).entries())
  const displayedSchedules = (schedules.data?.items ?? []).filter(item => (curriculumId === "all" || item.curriculumId === curriculumId) && (facultyId === "all" || item.facultyId === facultyId) && (roomId === "all" || item.roomId === roomId))

  const saveMutation = useMutation({
    mutationFn: async () => {
      const section = sections.data?.items.find(item => item.id === form.sectionId)
      if (!section) throw new Error("Select a section")
      const conflict = await api<ScheduleConflictResponse>("/schedules/check-conflict", { method: "POST", body: JSON.stringify({ ignoreScheduleId: editing?.id ?? null, sectionId: form.sectionId, facultyId: form.facultyId, roomId: form.roomId, schoolYearId: section.schoolYearId, semesterId: section.semesterId, meetings: form.meetings }) })
      setConflicts(conflict)
      if (conflict.hasConflicts) throw new Error("Resolve schedule conflicts before saving")
      return api<Schedule>(editing ? `/schedules/${editing.id}` : "/schedules", { method: editing ? "PUT" : "POST", body: JSON.stringify(form) })
    },
    onSuccess: () => { toast.success(editing ? "Schedule updated" : "Schedule created"); setDialogOpen(false); void qc.invalidateQueries({ queryKey: ["schedules"] }) },
    onError: error => toast.error(error instanceof ApiError || error instanceof Error ? error.message : "Unable to save schedule"),
  })
  const archiveMutation = useMutation({ mutationFn: (id: string) => api(`/schedules/${id}`, { method: "DELETE" }), onSuccess: () => { toast.success("Schedule archived"); setArchiveTarget(null); void qc.invalidateQueries({ queryKey: ["schedules"] }) }, onError: error => toast.error(error instanceof ApiError ? error.message : "Unable to archive schedule") })

  const openCreate = () => { setEditing(null); setForm(emptyForm()); setConflicts(null); setDialogOpen(true) }
  const openEdit = (item: Schedule) => { setEditing(item); setForm({ sectionId: item.sectionId, courseId: item.courseId, facultyId: item.facultyId, roomId: item.roomId, capacity: item.capacity, status: item.status as ScheduleRequest["status"], meetings: item.meetings.map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime: startTime.slice(0, 5), endTime: endTime.slice(0, 5) })) }); setConflicts(null); setDialogOpen(true) }
  const updateMeeting = (index: number, values: Partial<Meeting>) => setForm(current => ({ ...current, meetings: current.meetings.map((item, itemIndex) => itemIndex === index ? { ...item, ...values } : item) }))

  return <div className="mx-auto max-w-[1540px] p-4 md:p-6 lg:p-7">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-2xl font-semibold tracking-tight text-[#0b1f3a]">Schedules</h1><p className="mt-1 text-sm text-muted-foreground">Create and manage class schedules by academic term.</p></div>{can("SCHEDULE_MANAGE") && <Button onClick={openCreate} className="bg-[#0969da] hover:bg-[#075dbf]"><Plus/>New Schedule</Button>}</div>
    <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      <div className="relative"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground"/><Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search course, section, faculty or room" className="pl-9"/></div>
      <FilterSelect value={schoolYearId} onChange={setSchoolYearId} placeholder="School year" items={years.data?.items.map(item => ({ value: item.id, label: item.schoolYear })) ?? []}/>
      <FilterSelect value={semesterId} onChange={setSemesterId} placeholder="Semester" items={semesters.data?.items.map(item => ({ value: item.id, label: item.name })) ?? []}/>
      <FilterSelect value={programId} onChange={value => { setProgramId(value); setCurriculumId("all"); setSectionId("all") }} placeholder="Program" items={[{ value: "all", label: "All Programs" }, ...(programs.data?.items.map(item => ({ value: item.id, label: item.programCode })) ?? [])]}/>
      <FilterSelect value={curriculumId} onChange={setCurriculumId} placeholder="Curriculum" items={[{ value: "all", label: "All Curricula" }, ...curriculumOptions.map(([value,label]) => ({ value, label }))]}/>
      <FilterSelect value={sectionId} onChange={setSectionId} placeholder="Section" items={[{ value: "all", label: "All Sections" }, ...visibleSections.map(item => ({ value: item.id, label: item.sectionCode }))]}/>
      <FilterSelect value={facultyId} onChange={setFacultyId} placeholder="Faculty" items={[{ value: "all", label: "All Faculty" }, ...(faculty.data?.items.map(item => ({ value: item.id, label: `${item.firstName} ${item.lastName}` })) ?? [])]}/>
      <FilterSelect value={roomId} onChange={setRoomId} placeholder="Room" items={[{ value: "all", label: "All Rooms" }, ...(rooms.data?.items.map(item => ({ value: item.id, label: item.roomCode })) ?? [])]}/>
      <FilterSelect value={status} onChange={setStatus} placeholder="Status" items={[{ value: "all", label: "All Statuses" }, ...["DRAFT", "ACTIVE", "CANCELLED", "ARCHIVED"].map(value => ({ value, label: value }))]}/>
    </div>
    <div className="mb-4 inline-flex rounded-md border p-1"><Button size="sm" variant={view === "table" ? "default" : "ghost"} onClick={() => setView("table")}>Table</Button><Button size="sm" variant={view === "weekly" ? "default" : "ghost"} onClick={() => setView("weekly")}><CalendarDays/>Weekly</Button></div>
    {view === "table" ? <ScheduleTable items={displayedSchedules} loading={schedules.isLoading} manageable={can("SCHEDULE_MANAGE")} onEdit={openEdit} onArchive={setArchiveTarget}/> : <WeeklyView items={displayedSchedules}/>} 
    <ScheduleDialog open={dialogOpen} onOpenChange={setDialogOpen} form={form} setForm={setForm} section={selectedSection} sections={schedulableSections} courses={eligibleCourses} faculty={faculty.data?.items.filter(item => item.status === "ACTIVE") ?? []} rooms={rooms.data?.items.filter(item => item.status === "ACTIVE") ?? []} conflicts={conflicts} saving={saveMutation.isPending} onSave={() => saveMutation.mutate()} updateMeeting={updateMeeting}/>
    <AlertDialog open={!!archiveTarget} onOpenChange={open => !open && setArchiveTarget(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Archive this schedule?</AlertDialogTitle><AlertDialogDescription>It will disappear from active scheduling but remain available to historical enrollment records.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => archiveTarget && archiveMutation.mutate(archiveTarget.id)}>Archive</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>
}

function FilterSelect({ value, onChange, placeholder, items }: { value: string; onChange: (value: string) => void; placeholder: string; items: { value: string; label: string }[] }) { return <Select value={value} onValueChange={onChange}><SelectTrigger><SelectValue placeholder={placeholder}/></SelectTrigger><SelectContent>{items.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select> }
function ScheduleTable({ items, loading, manageable, onEdit, onArchive }: { items: Schedule[]; loading: boolean; manageable: boolean; onEdit: (item: Schedule) => void; onArchive: (item: Schedule) => void }) { return <div className="overflow-hidden rounded-lg border"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Course</TableHead><TableHead>Section</TableHead><TableHead>Faculty</TableHead><TableHead>Room</TableHead><TableHead>Meetings</TableHead><TableHead>Capacity</TableHead><TableHead>Status</TableHead>{manageable && <TableHead className="text-right">Actions</TableHead>}</TableRow></TableHeader><TableBody>{loading ? <TableRow><TableCell colSpan={8} className="h-32 text-center"><Loader2 className="mx-auto animate-spin"/></TableCell></TableRow> : items.length ? items.map(item => <TableRow key={item.id}><TableCell><p className="font-medium text-[#0b1f3a]">{item.courseCode}</p><p className="max-w-60 text-xs text-muted-foreground">{item.courseTitle}</p></TableCell><TableCell>{item.sectionCode}</TableCell><TableCell>{item.facultyName}</TableCell><TableCell>{item.roomCode}</TableCell><TableCell className="whitespace-nowrap text-xs space-y-1">{item.meetings.map((m, i) => <div key={i}>{m.dayOfWeek.slice(0, 3)} {m.startTime.slice(0, 5)}–{m.endTime.slice(0, 5)}</div>)}</TableCell><TableCell>{item.enrolledCount} / {item.capacity}</TableCell><TableCell><Badge variant={item.status === "ACTIVE" ? "default" : "secondary"}>{item.status}</Badge></TableCell>{manageable && <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => onEdit(item)} aria-label={`Edit ${item.courseCode}`}><Edit/></Button><Button variant="ghost" size="icon" onClick={() => onArchive(item)} aria-label={`Archive ${item.courseCode}`}><Trash2/></Button></TableCell>}</TableRow>) : <TableRow><TableCell colSpan={8} className="h-32 text-center text-muted-foreground">No schedules match the selected term and filters.</TableCell></TableRow>}</TableBody></Table></div></div> }
function WeeklyView({ items }: { items: Schedule[] }) {
  const range = useMemo(() => calendarRange(items), [items])
  const dayEntries = useMemo(() => new Map(DAYS.map(day => [day, layoutDay(items, day)])), [items])
  const ticks = useMemo(() => Array.from(
    { length: Math.floor((range.end - range.start) / 30) + 1 },
    (_, index) => range.start + index * 30,
  ), [range.end, range.start])
  const calendarHeight = ((range.end - range.start) / 60) * CALENDAR_HOUR_HEIGHT

  return <div className="max-h-[70vh] overflow-auto rounded-lg border bg-white shadow-sm">
    <div className="min-w-[860px]">
      <div className="sticky top-0 z-30 grid grid-cols-[58px_repeat(6,minmax(120px,1fr))] border-b bg-slate-50/95 backdrop-blur-sm">
        <div className="sticky left-0 z-40 border-r bg-slate-50/95 px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Time</div>
        {DAYS.map(day => <div key={day} className="border-r px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-700 last:border-r-0">{day.slice(0, 3)}</div>)}
      </div>
      <div className="relative grid grid-cols-[58px_repeat(6,minmax(120px,1fr))]" style={{ height: calendarHeight }}>
        <div className="sticky left-0 z-20 border-r bg-slate-50/95">
          {ticks.map((tick, index) => {
            const top = ((tick - range.start) / 60) * CALENDAR_HOUR_HEIGHT
            const showLabel = tick % 60 === 0 || index === 0
            return <div key={tick} className="absolute w-full" style={{ top }}>
              {showLabel ? <span className="block -translate-y-1/2 pr-2 text-right text-[10px] font-medium tabular-nums text-muted-foreground">{formatCalendarTime(tick)}</span> : null}
            </div>
          })}
        </div>
        {DAYS.map(day => <div key={day} className="relative border-r last:border-r-0">
          {ticks.map(tick => {
            const top = ((tick - range.start) / 60) * CALENDAR_HOUR_HEIGHT
            return <div key={tick} className={`absolute w-full border-t ${tick % 60 === 0 ? "border-slate-200" : "border-dashed border-slate-100"}`} style={{ top }}/>
          })}
          {dayEntries.get(day)?.map(entry => {
            const top = ((entry.start - range.start) / 60) * CALENDAR_HOUR_HEIGHT
            const height = ((entry.end - entry.start) / 60) * CALENDAR_HOUR_HEIGHT
            const laneWidth = 100 / entry.laneCount
            const label = `${entry.schedule.courseCode}, section ${entry.schedule.sectionCode}, ${entry.meeting.startTime.slice(0, 5)} to ${entry.meeting.endTime.slice(0, 5)}, room ${entry.schedule.roomCode}`
            return <div
              key={`${entry.schedule.id}-${entry.meeting.id ?? `${entry.meeting.startTime}-${entry.lane}`}`}
              className={`absolute overflow-hidden rounded border px-1.5 py-1 text-[10px] leading-[1.15] shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-shadow hover:z-10 hover:shadow-md ${calendarColor(entry.schedule.courseCode)}`}
              style={{ top, height, left: `calc(${entry.lane * laneWidth}% + 3px)`, width: `calc(${laneWidth}% - 6px)` }}
              title={`${entry.schedule.courseCode} · ${entry.schedule.courseTitle}\n${entry.meeting.startTime.slice(0, 5)}–${entry.meeting.endTime.slice(0, 5)}\n${entry.schedule.roomCode}`}
              aria-label={label}
            >
              <p className="truncate font-semibold">{entry.schedule.courseCode} <span className="font-normal opacity-70">· {entry.schedule.sectionCode}</span></p>
              <p className="mt-0.5 truncate tabular-nums opacity-80">{entry.meeting.startTime.slice(0, 5)}–{entry.meeting.endTime.slice(0, 5)} · {entry.schedule.roomCode}</p>
            </div>
          })}
        </div>)}
      </div>
    </div>
  </div>
}

function ScheduleDialog({ open, onOpenChange, form, setForm, section, sections, courses, faculty, rooms, conflicts, saving, onSave, updateMeeting }: { open: boolean; onOpenChange: (open: boolean) => void; form: ScheduleRequest; setForm: React.Dispatch<React.SetStateAction<ScheduleRequest>>; section?: Section; sections: Section[]; courses: CurriculumDetailResponse["courses"]; faculty: Faculty[]; rooms: Room[]; conflicts: ScheduleConflictResponse | null; saving: boolean; onSave: () => void; updateMeeting: (index: number, values: Partial<Meeting>) => void }) { const valid = form.sectionId && form.courseId && form.facultyId && form.roomId && form.capacity > 0 && form.meetings.length > 0 && form.meetings.every(item => item.dayOfWeek && item.startTime && item.endTime && item.endTime > item.startTime); return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{section ? "Schedule details" : "New Schedule"}</DialogTitle><DialogDescription>Select a section first; curriculum and term details are derived automatically.</DialogDescription></DialogHeader><div className="space-y-5"><Field label="Section"><FilterSelect value={form.sectionId} onChange={value => setForm(current => ({ ...current, sectionId: value, courseId: "" }))} placeholder="Select section" items={sections.map(item => ({ value: item.id, label: `${item.sectionCode} · ${item.curriculumCode}` }))}/></Field>{section && <dl className="grid grid-cols-2 gap-3 rounded-md border bg-slate-50 p-3 text-sm sm:grid-cols-4"><Meta label="Curriculum" value={section.curriculumCode ?? "—"}/><Meta label="Year" value={`Year ${section.yearLevel}`}/><Meta label="School Year" value={section.schoolYear}/><Meta label="Semester" value={section.semesterName}/></dl>}<div className="grid gap-4 sm:grid-cols-2"><Field label="Course"><FilterSelect value={form.courseId} onChange={value => setForm(current => ({ ...current, courseId: value }))} placeholder="Eligible course" items={courses.map(item => ({ value: item.courseId, label: `${item.courseCode} — ${item.courseTitle}` }))}/></Field><Field label="Faculty"><FilterSelect value={form.facultyId} onChange={value => setForm(current => ({ ...current, facultyId: value }))} placeholder="Select faculty" items={faculty.map(item => ({ value: item.id, label: `${item.firstName} ${item.lastName}` }))}/></Field><Field label="Room"><FilterSelect value={form.roomId} onChange={value => setForm(current => ({ ...current, roomId: value }))} placeholder="Select room" items={rooms.map(item => ({ value: item.id, label: item.roomCode }))}/></Field><Field label="Capacity"><Input type="number" min={1} value={form.capacity} onChange={event => setForm(current => ({ ...current, capacity: Number(event.target.value) }))}/></Field><Field label="Status"><FilterSelect value={form.status} onChange={value => setForm(current => ({ ...current, status: value as ScheduleRequest["status"] }))} placeholder="Status" items={["DRAFT","ACTIVE","CANCELLED"].map(value => ({ value, label: value }))}/></Field></div><div><div className="mb-2 flex items-center justify-between"><Label>Meetings</Label><Button type="button" variant="outline" size="sm" onClick={() => setForm(current => ({ ...current, meetings: [...current.meetings, emptyMeeting()] }))}><Plus/>Add Meeting</Button></div><div className="space-y-2">{form.meetings.map((meeting,index) => <div key={index} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2"><FilterSelect value={meeting.dayOfWeek} onChange={value => updateMeeting(index,{dayOfWeek:value})} placeholder="Day" items={DAYS.map(value => ({value,label:value.slice(0,3)}))}/><Input type="time" value={meeting.startTime} onChange={event => updateMeeting(index,{startTime:event.target.value})}/><Input type="time" value={meeting.endTime} onChange={event => updateMeeting(index,{endTime:event.target.value})}/><Button type="button" variant="ghost" size="icon" disabled={form.meetings.length===1} onClick={() => setForm(current => ({...current,meetings:current.meetings.filter((_,itemIndex)=>itemIndex!==index)}))}><X/></Button></div>)}</div></div>{conflicts?.hasConflicts && <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800"><div className="mb-2 flex items-center gap-2 font-semibold"><AlertTriangle className="size-4"/>Schedule conflict detected</div>{conflicts.conflicts.map((item,index)=><p key={`${item.scheduleId}-${index}`}>{item.conflictType}: {item.courseCode} · {item.sectionCode}, {item.dayOfWeek} {item.existingStartTime.slice(0,5)}–{item.existingEndTime.slice(0,5)}</p>)}</div>}</div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={onSave} disabled={!valid || saving}>{saving&&<Loader2 className="animate-spin"/>}Save Schedule</Button></DialogFooter></DialogContent></Dialog> }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-2"><Label>{label}</Label>{children}</div> }
function Meta({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div> }
