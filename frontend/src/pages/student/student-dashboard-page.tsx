import { Link } from "react-router-dom"
import {
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  MapPin,
  WalletCards,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useStudentDashboard } from "@/hooks/use-student-portal"

const money = (n?: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
    n ?? 0
  )
const time = (v?: string) => v?.slice(0, 5)
export default function StudentDashboardPage() {
  const q = useStudentDashboard()
  if (q.isLoading)
    return (
      <div className="p-8">
        <Skeleton className="h-[700px] w-full" />
      </div>
    )
  const d = q.data
  if (!d) return null
  const first = d.profile.fullName.split(" ")[0]
  const pct = d.progress.requiredUnits
    ? Math.round(
        (Number(d.progress.completedUnits) / Number(d.progress.requiredUnits)) *
          100
      )
    : 0
  return (
    <div className="mx-auto max-w-[1320px] p-5 md:p-8">
      <h1 className="text-3xl font-semibold tracking-tight text-[#092f66] md:text-4xl">
        Good morning, {first}
      </h1>
      <p className="mt-2 text-base text-slate-600">
        Here’s your academic overview for today.
      </p>
      {d.term.portalNotice ? (
        <div className="mt-5 border-l-4 border-[#0f8b8d] bg-teal-50 px-4 py-3 text-sm text-teal-900">
          {d.term.portalNotice}
        </div>
      ) : null}
      <section className="mt-6 flex flex-col justify-between gap-4 rounded-lg border border-[#cfdbe8] p-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <span className="grid size-11 place-items-center rounded-full bg-green-600 text-white">
            <Check />
          </span>
          <div>
            <p className="text-sm text-slate-600">Enrollment Status</p>
            <p className="text-xl font-semibold text-green-700">
              {d.enrollment.status?.replaceAll("_", " ") ?? "Not enrolled"}
            </p>
            <p className="text-sm text-slate-600">
              {d.profile.programCode} · {d.profile.yearLevel} Year
              {d.enrollment.sectionCode
                ? ` · Section ${d.enrollment.sectionCode}`
                : ""}
            </p>
          </div>
        </div>
        <Button asChild variant="ghost">
          <Link to="/student/enrollment">
            View enrollment
            <ChevronRight data-icon="inline-end" />
          </Link>
        </Button>
      </section>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="overflow-hidden rounded-lg border border-[#cfdbe8]">
          <header className="flex h-14 items-center justify-between border-b px-5">
            <h2 className="flex items-center gap-3 font-semibold">
              <CalendarDays />
              Today’s Schedule
            </h2>
            <Button asChild variant="ghost">
              <Link to="/student/schedule">
                View full schedule
                <ChevronRight data-icon="inline-end" />
              </Link>
            </Button>
          </header>
          <div className="p-4">
            {d.schedule.length ? (
              d.schedule.map((x) => (
                <div
                  key={`${x.scheduleId}-${x.startTime}`}
                  className="grid grid-cols-[98px_1fr] border-b py-3 last:border-0"
                >
                  <div className="font-semibold text-[#0f7d82]">
                    {time(x.startTime)}
                    <br />
                    {time(x.endTime)}
                  </div>
                  <div className="border-l-2 border-[#0f8b8d] pl-4">
                    <p className="font-semibold">
                      {x.courseCode} · {x.courseTitle}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                      <MapPin />
                      {x.roomCode}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="py-10 text-center text-sm text-slate-500">
                No classes scheduled today.
              </p>
            )}
          </div>
        </section>
        <section className="overflow-hidden rounded-lg border border-[#cfdbe8]">
          <header className="flex h-14 items-center gap-3 border-b px-5 font-semibold">
            <WalletCards />
            Account Balance
          </header>
          <div className="m-4 rounded-md border border-amber-300 bg-amber-50 p-5">
            <p className="text-sm text-slate-600">Total Balance</p>
            <p className="mt-2 text-3xl font-semibold text-amber-700">
              {money("balance" in d.finance ? Number(d.finance.balance) : 0)}
            </p>
            <Button
              asChild
              variant="outline"
              className="mt-6 w-full justify-between"
            >
              <Link to="/student/finance">
                View assessment
                <ChevronRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </section>
      </div>
      <section className="mt-5 overflow-hidden rounded-lg border border-[#cfdbe8]">
        <header className="flex h-14 items-center justify-between border-b px-5">
          <h2 className="flex items-center gap-3 font-semibold">
            <BookOpen />
            Academic Progress
          </h2>
          <Button asChild variant="ghost">
            <Link to="/student/academics">
              View academics
              <ChevronRight data-icon="inline-end" />
            </Link>
          </Button>
        </header>
        <div className="grid gap-6 p-5 md:grid-cols-2">
          <div>
            <p className="text-sm text-slate-600">Completed Units</p>
            <p className="mt-2 text-3xl font-semibold text-[#0f7d82]">
              {d.progress.completedUnits}
              <span className="text-base font-normal text-slate-600">
                {" "}
                of {d.progress.requiredUnits}
              </span>
            </p>
            <Progress className="mt-4" value={pct} />
          </div>
          <div className="md:border-l md:pl-8">
            <p className="text-sm text-slate-600">Curriculum Progress</p>
            <p className="mt-2 text-3xl font-semibold text-[#0f7d82]">{pct}%</p>
            <p className="text-sm text-green-700">On track</p>
          </div>
        </div>
      </section>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="overflow-hidden rounded-lg border border-[#cfdbe8]">
          <header className="flex h-14 items-center justify-between border-b px-5 font-semibold">
            <span>Recent Grades</span>
            <Button asChild variant="ghost">
              <Link to="/student/academics">
                View all grades
                <ChevronRight data-icon="inline-end" />
              </Link>
            </Button>
          </header>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead>Units</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Posted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {d.grades.map((x) => (
                <TableRow key={x.id}>
                  <TableCell>
                    <p className="font-medium">{x.courseCode}</p>
                    <p className="text-xs text-slate-500">{x.courseTitle}</p>
                  </TableCell>
                  <TableCell>{x.units}</TableCell>
                  <TableCell className="font-semibold text-[#0f7d82]">
                    {x.grade}
                  </TableCell>
                  <TableCell>
                    {new Date(x.postedAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
        <section className="overflow-hidden rounded-lg border border-[#cfdbe8]">
          <header className="flex h-14 items-center justify-between border-b px-5 font-semibold">
            <span className="flex items-center gap-3">
              <Bell />
              Announcements
            </span>
            <Button asChild variant="ghost">
              <Link to="/student/announcements">
                View all
                <ChevronRight data-icon="inline-end" />
              </Link>
            </Button>
          </header>
          <div className="divide-y">
            {d.announcements.map((x) => (
              <article key={x.id} className="p-4">
                <p className="font-medium">{x.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                  {x.body}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
