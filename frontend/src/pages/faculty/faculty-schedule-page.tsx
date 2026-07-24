import { useState } from "react"
import { CalendarDays, History, MapPin } from "lucide-react"
import { Link } from "react-router-dom"
import { useFacultySchedule, useFacultyScheduleChanges, useFacultyScheduleTerms } from "@/hooks/use-faculty-portal"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const days=["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"]

export default function FacultySchedulePage(){
  const [chosen,setChosen]=useState("")
  const terms=useFacultyScheduleTerms()
  const selected=terms.data?.find(term=>`${term.schoolYearId}|${term.semesterId}`===chosen)??terms.data?.find(term=>term.active)??terms.data?.[0]
  const schedule=useFacultySchedule(selected?.schoolYearId,selected?.semesterId)
  const changes=useFacultyScheduleChanges(selected?.schoolYearId,selected?.semesterId)
  return <main className="mx-auto flex max-w-[1100px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">Teaching Schedule</h1><p className="mt-1 text-muted-foreground">Assigned meeting rooms and times, including historical terms.</p></div><Select value={selected?`${selected.schoolYearId}|${selected.semesterId}`:""} onValueChange={setChosen}><SelectTrigger className="w-64"><SelectValue placeholder="Select term"/></SelectTrigger><SelectContent>{terms.data?.map(term=><SelectItem key={`${term.schoolYearId}-${term.semesterId}`} value={`${term.schoolYearId}|${term.semesterId}`}>{term.schoolYear} · {term.semesterName.replaceAll("_"," ")}{term.active?" · Active":""}</SelectItem>)}</SelectContent></Select></header>
    {changes.data?.length?<Alert><History/><AlertTitle>Recent schedule changes</AlertTitle><AlertDescription><div className="mt-1 flex flex-col gap-2">{changes.data.map(change=><p key={change.id}><Badge variant="outline" className="mr-2">{change.action}</Badge>{change.courseCode}/{change.sectionCode}{change.reason?` — ${change.reason}`:""}</p>)}</div></AlertDescription></Alert>:null}
    <div className="grid gap-4 lg:grid-cols-2">{days.map(day=><section key={day} className="overflow-hidden rounded-lg border"><h2 className="flex items-center gap-2 border-b bg-surface px-4 py-3 font-semibold"><CalendarDays/>{title(day)}</h2><div className="flex min-h-24 flex-col gap-2 p-3">{schedule.data?.filter(item=>item.dayOfWeek===day).map(item=><Link to={`/faculty/classes/${item.scheduleId}`} key={`${item.scheduleId}-${item.startTime}`} className="rounded-md border-l-4 border-l-primary p-3 hover:bg-surface"><p className="font-semibold text-foreground">{item.startTime.slice(0,5)}–{item.endTime.slice(0,5)} · {item.courseCode}</p><p className="text-sm">{item.courseTitle} · {item.sectionCode}</p><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin/>{item.deliveryMode==="ONLINE"?item.locationDetails||"Online":item.roomCode||"Room pending"} · {item.componentType}</p></Link>)}{!schedule.data?.some(item=>item.dayOfWeek===day)?<p className="p-4 text-center text-sm text-muted-foreground">No classes</p>:null}</div></section>)}</div>
  </main>
}
function title(value:string){return value[0]+value.slice(1).toLowerCase()}
