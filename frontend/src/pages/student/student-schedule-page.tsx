import { CalendarDays, MapPin } from "lucide-react"
import { useStudentSchedule } from "@/hooks/use-student-portal"
import { Skeleton } from "@/components/ui/skeleton"
const days = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
]
export default function StudentSchedulePage() {
  const q = useStudentSchedule()
  if (q.isLoading)
    return (
      <div className="p-8">
        <Skeleton className="h-96 w-full" />
      </div>
    )
  return (
    <div className="mx-auto max-w-[1100px] p-5 md:p-8">
      <h1 className="flex items-center gap-3 text-3xl font-semibold text-[#092f66]">
        <CalendarDays />
        Class Schedule
      </h1>
      <p className="mt-2 text-slate-600">
        Your confirmed classes, rooms, and instructors.
      </p>
      <div className="mt-7 flex flex-col gap-5">
        {days.map((day) => {
          const rows = q.data?.filter((x) => x.dayOfWeek === day) ?? []
          return rows.length ? (
            <section key={day} className="overflow-hidden rounded-lg border">
              <h2 className="border-b bg-slate-50 px-5 py-3 font-semibold">
                {day[0] + day.slice(1).toLowerCase()}
              </h2>
              {rows.map((x) => (
                <article
                  key={`${x.scheduleId}-${x.startTime}`}
                  className="grid gap-3 border-b p-5 last:border-0 sm:grid-cols-[130px_1fr_180px]"
                >
                  <p className="font-semibold text-[#0f7d82]">
                    {x.startTime.slice(0, 5)}–{x.endTime.slice(0, 5)}
                  </p>
                  <div>
                    <p className="font-semibold">
                      {x.courseCode} · {x.courseTitle}
                    </p>
                    <p className="text-sm text-slate-500">
                      {x.sectionCode} · {x.faculty}
                    </p>
                  </div>
                  <p className="flex items-center gap-2 text-sm">
                    <MapPin />
                    {x.roomCode}
                  </p>
                </article>
              ))}
            </section>
          ) : null
        })}
      </div>
    </div>
  )
}
