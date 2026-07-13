import { BookOpen, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { openPdf } from "@/lib/api"
import {
  useStudentAttendance,
  useStudentGrades,
  useStudentProgress,
} from "@/hooks/use-student-portal"
export default function StudentAcademicsPage() {
  const grades = useStudentGrades(),
    progress = useStudentProgress(),
    attendance = useStudentAttendance()
  const p = progress.data
  const pct = p?.requiredUnits
    ? Math.round((Number(p.completedUnits) / Number(p.requiredUnits)) * 100)
    : 0
  return (
    <div className="mx-auto max-w-[1180px] p-5 md:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-semibold text-[#092f66]">
            <BookOpen />
            Academics
          </h1>
          <p className="mt-2 text-slate-600">
            Curriculum progress, posted grades, and attendance.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => void openPdf("/student/me/grade-report")}
        >
          <Download data-icon="inline-start" />
          Unofficial grade report
        </Button>
      </div>
      <Tabs defaultValue="progress" className="mt-7">
        <TabsList>
          <TabsTrigger value="progress">Curriculum Progress</TabsTrigger>
          <TabsTrigger value="grades">Posted Grades</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
        </TabsList>
        <TabsContent value="progress">
          <section className="mt-5 rounded-lg border p-6">
            <p className="text-sm text-slate-600">Completed units</p>
            <p className="mt-2 text-4xl font-semibold text-[#0f7d82]">
              {p?.completedUnits ?? 0}
              <span className="text-base font-normal text-slate-500">
                {" "}
                of {p?.requiredUnits ?? 0}
              </span>
            </p>
            <Progress value={pct} className="mt-5" />
            <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500">Courses completed</p>
                <p className="text-xl font-semibold">
                  {p?.completedCourses ?? 0}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Curriculum completion</p>
                <p className="text-xl font-semibold">{pct}%</p>
              </div>
            </div>
          </section>
        </TabsContent>
        <TabsContent value="grades">
          <div className="mt-5 overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Term</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Units</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grades.data?.map((x) => (
                  <TableRow key={x.id}>
                    <TableCell>
                      {x.schoolYear} · {x.semesterName.replaceAll("_", " ")}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{x.courseCode}</p>
                      <p className="text-xs text-slate-500">{x.courseTitle}</p>
                    </TableCell>
                    <TableCell>{x.units}</TableCell>
                    <TableCell className="font-semibold text-[#0f7d82]">
                      {x.grade}
                    </TableCell>
                    <TableCell>{x.remarks}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        <TabsContent value="attendance">
          <div className="mt-5 overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Meetings</TableHead>
                  <TableHead>Present</TableHead>
                  <TableHead>Late</TableHead>
                  <TableHead>Absent</TableHead>
                  <TableHead>Excused</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendance.data?.map((x, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">
                      {x.courseCode}
                    </TableCell>
                    <TableCell>{x.meetings}</TableCell>
                    <TableCell>{x.present}</TableCell>
                    <TableCell>{x.late}</TableCell>
                    <TableCell>{x.absent}</TableCell>
                    <TableCell>{x.excused}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {attendance.data?.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">
                Attendance is not currently available.
              </p>
            ) : null}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
