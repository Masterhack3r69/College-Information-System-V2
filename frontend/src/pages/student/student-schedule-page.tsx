import { useState } from "react"
import { CalendarDays, History, MapPin } from "lucide-react"
import { useStudentSchedule, useStudentScheduleChanges, useStudentScheduleTerms } from "@/hooks/use-student-portal"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

const days=["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"]

export default function StudentSchedulePage(){
  const [chosen,setChosen]=useState("")
  const terms=useStudentScheduleTerms()
  const selected=terms.data?.find(term=>`${term.schoolYearId}|${term.semesterId}`===chosen)??terms.data?.find(term=>term.active)??terms.data?.[0]
  const schedule=useStudentSchedule(selected?.schoolYearId,selected?.semesterId)
  const changes=useStudentScheduleChanges(selected?.schoolYearId,selected?.semesterId)
  if(schedule.isLoading)return <div className="p-8"><Skeleton className="h-96 w-full"/></div>
  return <main className="mx-auto flex max-w-[1100px] flex-col gap-6 p-5 md:p-8">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="flex items-center gap-3 text-3xl font-semibold text-[#092f66]"><CalendarDays/>Class Schedule</h1><p className="mt-2 text-slate-600">Your confirmed classes, meeting locations, and instructors.</p></div><Select value={selected?`${selected.schoolYearId}|${selected.semesterId}`:""} onValueChange={setChosen}><SelectTrigger className="w-64"><SelectValue placeholder="Select enrolled term"/></SelectTrigger><SelectContent>{terms.data?.map(term=><SelectItem key={`${term.schoolYearId}-${term.semesterId}`} value={`${term.schoolYearId}|${term.semesterId}`}>{term.schoolYear} · {term.semesterName.replaceAll("_"," ")}{term.active?" · Active":""}</SelectItem>)}</SelectContent></Select></header>
    {changes.data?.length?<Alert><History/><AlertTitle>Recent changes to your classes</AlertTitle><AlertDescription><div className="mt-1 flex flex-col gap-2">{changes.data.map(change=><p key={change.id}><Badge variant="outline" className="mr-2">{change.action}</Badge>{change.courseCode}/{change.sectionCode}{change.reason?` — ${change.reason}`:""}</p>)}</div></AlertDescription></Alert>:null}
    <div className="flex flex-col gap-5">{days.map(day=>{const rows=schedule.data?.filter(item=>item.dayOfWeek===day)??[];return rows.length?<section key={day} className="overflow-hidden rounded-lg border"><h2 className="border-b bg-slate-50 px-5 py-3 font-semibold">{title(day)}</h2>{rows.map(item=><article key={`${item.scheduleId}-${item.startTime}`} className="grid gap-3 border-b p-5 last:border-0 sm:grid-cols-[130px_1fr_220px]"><p className="font-semibold text-[#0f7d82]">{item.startTime.slice(0,5)}–{item.endTime.slice(0,5)}</p><div><p className="font-semibold">{item.courseCode} · {item.courseTitle}</p><p className="text-sm text-slate-500">{item.sectionCode} · {item.faculty} · {item.componentType}</p></div><p className="flex items-center gap-2 text-sm"><MapPin/>{item.deliveryMode==="ONLINE"?item.locationDetails||"Online":item.roomCode||"Room pending"}</p></article>)}</section>:null})}</div>
  </main>
}
function title(value:string){return value[0]+value.slice(1).toLowerCase()}
