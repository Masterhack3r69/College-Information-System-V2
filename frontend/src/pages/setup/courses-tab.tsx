import { useState } from "react"
import { useForm, Controller, type Path, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Edit, Plus, Search, Loader2 } from "lucide-react"
import { ApiError } from "@/lib/api"
import type { Course } from "@/lib/types"
import {
  useCourses,
  useCreateCourse,
  useUpdateCourse,
  useDepartments,
} from "@/hooks/use-setup"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const courseSchema = z.object({
  courseCode: z.string().min(1, "Course code is required").trim(),
  courseTitle: z.string().min(1, "Course title is required").trim(),
  courseDescription: z.string().optional().or(z.literal("")),
  lectureHoursPerWeek: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? undefined : val),
    z.coerce.number().min(0, "Lecture hours must be greater than or equal to 0")
  ),
  laboratoryHoursPerWeek: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? undefined : val),
    z.coerce.number().min(0, "Laboratory hours must be greater than or equal to 0")
  ),
  creditUnits: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? undefined : val),
    z.coerce.number().min(0, "Credit units must be greater than or equal to 0")
  ),
  courseType: z.enum([
    "MAJOR",
    "PROFESSIONAL_COURSE",
    "GENERAL_EDUCATION",
    "PHYSICAL_EDUCATION",
    "NSTP",
    "ELECTIVE",
    "LABORATORY",
    "SEMINAR",
    "THESIS_CAPSTONE",
  ]),
  departmentId: z.string().min(1, "Department is required"),
})

type CourseFormValues = z.infer<typeof courseSchema>

const COURSE_TYPES = [
  { value: "MAJOR", label: "Major" },
  { value: "PROFESSIONAL_COURSE", label: "Professional Course" },
  { value: "GENERAL_EDUCATION", label: "General Education" },
  { value: "PHYSICAL_EDUCATION", label: "Physical Education" },
  { value: "NSTP", label: "NSTP" },
  { value: "ELECTIVE", label: "Elective" },
  { value: "LABORATORY", label: "Laboratory" },
  { value: "SEMINAR", label: "Seminar" },
  { value: "THESIS_CAPSTONE", label: "Thesis / Capstone" },
]

export function CoursesTab() {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(0)
  const size = 10

  const { data, isLoading } = useCourses(search, page, size)
  const departmentsQuery = useDepartments("", 0, 100)
  const createMutation = useCreateCourse()
  const updateMutation = useUpdateCourse()

  const [isOpen, setIsOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Course | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema) as unknown as Resolver<CourseFormValues>,
    defaultValues: {
      courseCode: "",
      courseTitle: "",
      courseDescription: "",
      lectureHoursPerWeek: 0,
      laboratoryHoursPerWeek: 0,
      creditUnits: 0,
      courseType: "MAJOR",
      departmentId: "",
    },
  })

  const openCreateModal = () => {
    setEditingItem(null)
    reset({
      courseCode: "",
      courseTitle: "",
      courseDescription: "",
      lectureHoursPerWeek: 0,
      laboratoryHoursPerWeek: 0,
      creditUnits: 0,
      courseType: "MAJOR",
      departmentId: "",
    })
    setIsOpen(true)
  }

  const openEditModal = (item: Course) => {
    setEditingItem(item)
    reset({
      courseCode: item.courseCode,
      courseTitle: item.courseTitle,
      courseDescription: item.courseDescription || "",
      lectureHoursPerWeek: item.lectureHoursPerWeek,
      laboratoryHoursPerWeek: item.laboratoryHoursPerWeek,
      creditUnits: item.creditUnits,
      courseType: item.courseType,
      departmentId: item.departmentId,
    })
    setIsOpen(true)
  }

  const onSubmit = async (values: CourseFormValues) => {
    try {
      if (editingItem) {
        await updateMutation.mutateAsync({
          id: editingItem.id,
          ...values,
          status: editingItem.status,
          departmentCode: editingItem.departmentCode,
        })
        toast.success("Course updated successfully")
      } else {
        await createMutation.mutateAsync({
          ...values,
          status: "ACTIVE",
        })
        toast.success("Course created successfully")
      }
      setIsOpen(false)
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.errors && error.errors.length > 0) {
          error.errors.forEach((err) => {
             setError(err.field as Path<CourseFormValues>, {
              type: "server",
              message: err.message,
            })
          })
          toast.error("Please resolve the field validation errors.")
        } else {
          toast.error(error.message)
        }
      } else {
        toast.error("An unexpected error occurred. Please try again.")
      }
    }
  }

  const departments = departmentsQuery.data?.items || []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Courses</h2>
          <p className="text-sm text-muted-foreground">Manage courses, lecture/laboratory hours, and credit units.</p>
        </div>
        <Button onClick={openCreateModal} className="bg-primary text-white hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" /> New Course
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search code or title..."
          className="pl-9"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(0)
          }}
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Lec Hrs</TableHead>
              <TableHead>Lab Hrs</TableHead>
              <TableHead>Units</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading courses...
                  </div>
                </TableCell>
              </TableRow>
            ) : !data?.items.length ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  No courses found.
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.courseCode}</TableCell>
                  <TableCell>{item.courseTitle}</TableCell>
                  <TableCell>
                    {COURSE_TYPES.find((c) => c.value === item.courseType)?.label || item.courseType}
                  </TableCell>
                  <TableCell>{item.lectureHoursPerWeek}</TableCell>
                  <TableCell>{item.laboratoryHoursPerWeek}</TableCell>
                  <TableCell>{item.creditUnits}</TableCell>
                  <TableCell>{item.departmentCode || "—"}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold",
                        item.status === "ACTIVE"
                          ? "bg-success text-success-foreground ring-1 ring-inset ring-success-foreground/20"
                          : "bg-destructive/10 text-destructive ring-1 ring-inset ring-destructive/20"
                      )}
                    >
                      {item.status === "ACTIVE" ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEditModal(item)}>
                      <Edit className="h-4 w-4 text-foreground" />
                      <span className="sr-only">Edit</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {!isLoading && data && data.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Showing {data.items.length} of {data.totalElements} courses
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page + 1} of {data.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(data.totalPages - 1, p + 1))}
              disabled={page >= data.totalPages - 1}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Course" : "New Course"}</DialogTitle>
            <DialogDescription>
              Fill out the form below to {editingItem ? "update" : "create"} the academic course.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="courseCode">Course Code</Label>
              <Input
                id="courseCode"
                placeholder="e.g. CS101"
                {...register("courseCode")}
                className={cn(errors.courseCode && "border-destructive focus-visible:ring-destructive")}
              />
              {errors.courseCode && (
                <p className="text-xs text-destructive">{errors.courseCode.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="courseTitle">Course Title</Label>
              <Input
                id="courseTitle"
                placeholder="e.g. Introduction to Computer Science"
                {...register("courseTitle")}
                className={cn(errors.courseTitle && "border-destructive focus-visible:ring-destructive")}
              />
              {errors.courseTitle && (
                <p className="text-xs text-destructive">{errors.courseTitle.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="departmentId">Department</Label>
                <Controller
                  control={control}
                  name="departmentId"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <SelectTrigger
                        id="departmentId"
                        className={cn(errors.departmentId && "border-destructive focus-visible:ring-destructive")}
                      >
                        <SelectValue placeholder="Select Department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departmentsQuery.isLoading ? (
                          <div className="flex items-center justify-center p-2 text-xs text-muted-foreground">
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" /> Loading departments...
                          </div>
                        ) : departments.length === 0 ? (
                          <div className="p-2 text-xs text-muted-foreground">No departments available</div>
                        ) : (
                          departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.departmentCode} - {dept.departmentName}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.departmentId && (
                  <p className="text-xs text-destructive">{errors.departmentId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="courseType">Course Type</Label>
                <Controller
                  control={control}
                  name="courseType"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <SelectTrigger
                        id="courseType"
                        className={cn(errors.courseType && "border-destructive focus-visible:ring-destructive")}
                      >
                        <SelectValue placeholder="Select Course Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {COURSE_TYPES.map((ct) => (
                          <SelectItem key={ct.value} value={ct.value}>
                            {ct.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.courseType && (
                  <p className="text-xs text-destructive">{errors.courseType.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lectureHoursPerWeek">Lec Hours/Wk</Label>
                <Input
                  id="lectureHoursPerWeek"
                  type="number"
                  placeholder="e.g. 3"
                  {...register("lectureHoursPerWeek")}
                  className={cn(errors.lectureHoursPerWeek && "border-destructive focus-visible:ring-destructive")}
                />
                {errors.lectureHoursPerWeek && (
                  <p className="text-xs text-destructive">{errors.lectureHoursPerWeek.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="laboratoryHoursPerWeek">Lab Hours/Wk</Label>
                <Input
                  id="laboratoryHoursPerWeek"
                  type="number"
                  placeholder="e.g. 0"
                  {...register("laboratoryHoursPerWeek")}
                  className={cn(errors.laboratoryHoursPerWeek && "border-destructive focus-visible:ring-destructive")}
                />
                {errors.laboratoryHoursPerWeek && (
                  <p className="text-xs text-destructive">{errors.laboratoryHoursPerWeek.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="creditUnits">Credit Units</Label>
                <Input
                  id="creditUnits"
                  type="number"
                  placeholder="e.g. 3"
                  {...register("creditUnits")}
                  className={cn(errors.creditUnits && "border-destructive focus-visible:ring-destructive")}
                />
                {errors.creditUnits && (
                  <p className="text-xs text-destructive">{errors.creditUnits.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="courseDescription">Description</Label>
              <Input
                id="courseDescription"
                placeholder="Optional description"
                {...register("courseDescription")}
                className={cn(errors.courseDescription && "border-destructive focus-visible:ring-destructive")}
              />
              {errors.courseDescription && (
                <p className="text-xs text-destructive">{errors.courseDescription.message}</p>
              )}
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary text-white hover:bg-primary/90" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingItem ? "Save Changes" : "Create Course"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
