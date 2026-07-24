import { useState } from "react"
import { useParams, Link } from "react-router-dom"
import { useForm, Controller, useWatch, type Path, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import {
  ArrowLeft,
  Loader2,
  BookOpen,
  Plus,
  Edit,
  Trash2,
  Check,
  ChevronsUpDown,
  Search,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ApiError } from "@/lib/api"
import {
  useCurriculumChecklist,
  useAddCurriculumCourse,
  useUpdateCurriculumCourse,
  useDeleteCurriculumCourse,
} from "@/hooks/use-curriculum"
import { useCourses, usePrograms } from "@/hooks/use-setup"
import type { CurriculumCourseResponse } from "@/lib/types"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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

// Helper function to map year levels
const mapYearLevel = (year: number) => {
  switch (year) {
    case 1:
      return "First Year"
    case 2:
      return "Second Year"
    case 3:
      return "Third Year"
    case 4:
      return "Fourth Year"
    case 5:
      return "Fifth Year"
    default:
      return `${year}th Year`
  }
}

// Helper function to map semesters
const mapSemester = (sem: string) => {
  switch (sem) {
    case "FIRST_SEMESTER":
      return "First Semester"
    case "SECOND_SEMESTER":
      return "Second Semester"
    case "SUMMER":
      return "Summer"
    default:
      return sem
  }
}

const curriculumCourseSchema = z.object({
  yearLevel: z.coerce.number().min(1),
  semester: z.string().min(1),
  courseId: z.string().min(1, "Course selection is required"),
  sortOrder: z.coerce.number().min(1, "Sort order must be greater than or equal to 1"),
  requiredStatus: z.enum(["REQUIRED", "OPTIONAL", "ELECTIVE"] as const),
  prerequisiteCourseIds: z.array(z.string()).default([]),
  corequisiteCourseIds: z.array(z.string()).default([]),
})

type CurriculumCourseFormValues = z.infer<typeof curriculumCourseSchema>

export function CurriculumBuilder() {
  const { id } = useParams<{ id: string }>()
  
  // Queries
  const { data, isLoading, error } = useCurriculumChecklist(id || "")
  const { data: coursesData } = useCourses("", 0, 1000)
  const { data: programsData } = usePrograms("", 0, 1000)

  // Mutations
  const addCourseMutation = useAddCurriculumCourse(id || "")
  const updateCourseMutation = useUpdateCurriculumCourse(id || "")
  const deleteCourseMutation = useDeleteCurriculumCourse(id || "")

  // Modal & Dialog States
  const [isAddEditOpen, setIsAddEditOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<CurriculumCourseResponse | null>(null)
  const [selectedYearLevel, setSelectedYearLevel] = useState<number>(1)
  const [selectedSemester, setSelectedSemester] = useState<string>("FIRST_SEMESTER")
  void selectedYearLevel
  void selectedSemester


  // Delete Confirmation States
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [courseIdToDelete, setCourseIdToDelete] = useState<string | null>(null)

  // Search input states for select dropdowns inside the modal
  const [courseSearch, setCourseSearch] = useState("")
  const [courseSelectOpen, setCourseSelectOpen] = useState(false)
  const [prereqSearch, setPrereqSearch] = useState("")
  const [coreqSearch, setCoreqSearch] = useState("")

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CurriculumCourseFormValues>({
    resolver: zodResolver(curriculumCourseSchema) as unknown as Resolver<CurriculumCourseFormValues>,
    defaultValues: {
      yearLevel: 1,
      semester: "FIRST_SEMESTER",
      courseId: "",
      sortOrder: 1,
      requiredStatus: "REQUIRED",
      prerequisiteCourseIds: [],
      corequisiteCourseIds: [],
    },
  })

  const watchCourseId = useWatch({ control, name: "courseId" })
  const watchPrereqIds = useWatch({ control, name: "prerequisiteCourseIds" }) || []
  const watchCoreqIds = useWatch({ control, name: "corequisiteCourseIds" }) || []

  const courses = coursesData?.items || []
  const programs = programsData?.items || []

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" /> Loading curriculum builder...
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8 text-center">
        <h2 className="text-xl font-semibold text-destructive">Error Loading Curriculum</h2>
        <p className="text-sm text-muted-foreground mt-2">
          {error instanceof Error ? error.message : "The requested curriculum could not be found or loaded."}
        </p>
        <Button asChild className="mt-4 bg-primary text-white hover:bg-primary/90">
          <Link to="/admin/setup/curricula">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Curricula
          </Link>
        </Button>
      </div>
    )
  }

  const { curriculum } = data
  const programName = programs.find((p) => p.id === curriculum.programId)?.programName || ""

  // Open modal for adding a course assignment
  const handleAddCourse = (yearLevel: number, semester: string) => {
    setEditingCourse(null)
    setSelectedYearLevel(yearLevel)
    setSelectedSemester(semester)
    reset({
      yearLevel,
      semester,
      courseId: "",
      sortOrder: 1,
      requiredStatus: "REQUIRED",
      prerequisiteCourseIds: [],
      corequisiteCourseIds: [],
    })
    setCourseSearch("")
    setPrereqSearch("")
    setCoreqSearch("")
    setIsAddEditOpen(true)
  }

  // Open modal for editing a course assignment
  const handleEditCourse = (item: CurriculumCourseResponse) => {
    setEditingCourse(item)
    setSelectedYearLevel(item.yearLevel)
    setSelectedSemester(item.semester)
    reset({
      yearLevel: item.yearLevel,
      semester: item.semester,
      courseId: item.courseId,
      sortOrder: item.sortOrder,
      requiredStatus: item.requiredStatus,
      prerequisiteCourseIds: item.prerequisites?.map((p) => p.id) || [],
      corequisiteCourseIds: item.corequisites?.map((c) => c.id) || [],
    })
    setCourseSearch("")
    setPrereqSearch("")
    setCoreqSearch("")
    setIsAddEditOpen(true)
  }

  // Handle dialog form submission
  const onSubmit = async (values: CurriculumCourseFormValues) => {
    try {
      if (editingCourse) {
        await updateCourseMutation.mutateAsync({
          ccId: editingCourse.id,
          ...values,
        })
        toast.success("Course assignment updated successfully")
      } else {
        await addCourseMutation.mutateAsync(values)
        toast.success("Course assigned successfully")
      }
      setIsAddEditOpen(false)
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.errors && error.errors.length > 0) {
          error.errors.forEach((err) => {
            setError(err.field as Path<CurriculumCourseFormValues>, {
              type: "server",
              message: err.message,
            })
          })
          toast.error("Please resolve the field validation errors.")
        } else {
          setError("root", { type: "server", message: error.message })
          toast.error(error.message)
        }
      } else {
        toast.error("An unexpected error occurred. Please try again.")
      }
    }
  }

  // Remove Course Prompt
  const handlePromptDelete = (ccId: string) => {
    setCourseIdToDelete(ccId)
    setDeleteConfirmOpen(true)
  }

  // Confirm Course Removal
  const handleDeleteConfirm = async () => {
    if (!courseIdToDelete) return
    try {
      await deleteCourseMutation.mutateAsync(courseIdToDelete)
      toast.success("Course assignment removed successfully")
      setDeleteConfirmOpen(false)
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message)
      } else {
        toast.error("An unexpected error occurred.")
      }
    } finally {
      setCourseIdToDelete(null)
    }
  }

  // Course search filtering
  const filteredCourses = courses.filter(
    (c) =>
      c.courseCode.toLowerCase().includes(courseSearch.toLowerCase()) ||
      c.courseTitle.toLowerCase().includes(courseSearch.toLowerCase())
  )

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-md bg-primary text-white">
            <BookOpen className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{curriculum.curriculumName}</h1>
            <div className="text-sm text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>Code: <span className="font-semibold text-foreground">{curriculum.curriculumCode}</span></span>
              <span>&bull;</span>
              <span>Program: <span className="font-semibold text-foreground">{curriculum.programCode} {programName ? `- ${programName}` : ""}</span></span>
              <span>&bull;</span>
              <span>Effective: <span className="font-semibold text-foreground">{curriculum.effectiveSchoolYear}</span></span>
              <span>&bull;</span>
              <span>Version: <span className="font-semibold text-foreground">{curriculum.version}</span></span>
            </div>
            {curriculum.description && (
              <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
                {curriculum.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
              curriculum.status === "ACTIVE" && "bg-success text-success-foreground ring-success-foreground/20",
              curriculum.status === "DRAFT" && "bg-warning text-warning-foreground ring-warning-foreground/20",
              curriculum.status === "INACTIVE" && "bg-destructive/10 text-destructive ring-destructive/20",
              curriculum.status === "ARCHIVED" && "bg-muted text-muted-foreground ring-muted-foreground/20"
            )}
          >
            {curriculum.status.charAt(0) + curriculum.status.slice(1).toLowerCase()}
          </span>
          <Button
            onClick={() => handleAddCourse(1, "FIRST_SEMESTER")}
            className="bg-primary text-white hover:bg-primary/90"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Add Course
          </Button>
          <Button asChild variant="outline">
            <Link to="/admin/setup/curricula">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Curricula
            </Link>
          </Button>
        </div>
      </div>


      {/* Terms Iteration */}
      <div className="space-y-6">
        {data.terms.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No Terms Configured</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
              This curriculum does not have any terms or semesters set up yet.
            </p>
            <Button
              onClick={() => handleAddCourse(1, "FIRST_SEMESTER")}
              className="mt-4 bg-primary text-white hover:bg-primary/90"
            >
              <Plus className="mr-1.5 h-4 w-4" /> Add First Course
            </Button>
          </div>
        ) : (
          data.terms.map((term, index) => {
            const yearName = mapYearLevel(term.yearLevel)
            const semesterName = mapSemester(term.semester)

            return (
              <div key={index} className="bg-background rounded-lg border border-muted p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-muted">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">
                      {yearName} - {semesterName}
                    </h3>
                    <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 mt-1">
                      <span>Total lecture load: <strong className="text-foreground">{term.totalLectureHours} hrs/week</strong></span>
                      <span>Total lab load: <strong className="text-foreground">{term.totalLaboratoryHours} hrs/week</strong></span>
                      <span>Credits: <strong className="text-foreground">{term.totalCreditUnits} units</strong></span>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleAddCourse(term.yearLevel, term.semester)}
                    className="bg-primary text-white hover:bg-primary/90 self-start"
                  >
                    <Plus className="mr-1.5 h-4 w-4" /> Add Course
                  </Button>
                </div>

                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Course Code</TableHead>
                        <TableHead>Descriptive Title</TableHead>
                        <TableHead>Lec / Lab Hrs/Wk</TableHead>
                        <TableHead>Credit Units</TableHead>
                        <TableHead>Pre-requisites</TableHead>
                        <TableHead>Co-requisites</TableHead>
                        <TableHead>Required Status</TableHead>
                        <TableHead className="w-[120px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {term.courses.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="h-20 text-center text-muted-foreground text-sm">
                            No courses assigned to this term. Click "Add Course" to assign one.
                          </TableCell>
                        </TableRow>
                      ) : (
                        term.courses
                          .slice()
                          .sort((a, b) => a.sortOrder - b.sortOrder)
                          .map((course) => (
                            <TableRow key={course.id}>
                              <TableCell className="font-semibold text-foreground">{course.courseCode}</TableCell>
                              <TableCell>{course.courseTitle}</TableCell>
                              <TableCell>
                                {course.lectureHoursPerWeek} / {course.laboratoryHoursPerWeek} hrs/week
                              </TableCell>
                              <TableCell>{course.creditUnits}</TableCell>
                              <TableCell>
                                {course.prerequisites && course.prerequisites.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {course.prerequisites.map((p) => (
                                      <span
                                        key={p.id}
                                        className="inline-flex items-center rounded-md bg-info px-2 py-1 text-xs font-medium text-info-foreground ring-1 ring-inset ring-info-foreground/10"
                                      >
                                        {p.courseCode}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">None</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {course.corequisites && course.corequisites.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {course.corequisites.map((c) => (
                                      <span
                                        key={c.id}
                                        className="inline-flex items-center rounded-md bg-info px-2 py-1 text-xs font-medium text-info-foreground ring-1 ring-inset ring-info-foreground/10"
                                      >
                                        {c.courseCode}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">None</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <span
                                  className={cn(
                                    "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
                                    course.requiredStatus === "REQUIRED" && "bg-success text-success-foreground ring-success-foreground/20",
                                    course.requiredStatus === "OPTIONAL" && "bg-warning text-warning-foreground ring-warning-foreground/20",
                                    course.requiredStatus === "ELECTIVE" && "bg-info text-info-foreground ring-info-foreground/20"
                                  )}
                                >
                                  {course.requiredStatus.charAt(0) + course.requiredStatus.slice(1).toLowerCase()}
                                </span>
                              </TableCell>
                              <TableCell className="text-right space-x-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditCourse(course)}
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handlePromptDelete(course.id)}
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={isAddEditOpen} onOpenChange={setIsAddEditOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>
              {editingCourse ? "Edit Course Assignment" : "Assign Course to Term"}
            </DialogTitle>
            <DialogDescription>
              {editingCourse
                ? "Update course assignment details."
                : "Assign a new course to this curriculum."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Basic Info */}
            <div className="space-y-4">
              {errors.root && (
                <div className="text-sm font-medium text-destructive p-3 bg-destructive/10 rounded-md border border-destructive/20">
                  {errors.root.message}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="yearLevel" className="text-sm font-semibold">Year Level</Label>
                  <Input
                    id="yearLevel"
                    type="number"
                    min="1"
                    {...register("yearLevel", { valueAsNumber: true })}
                  />
                  {errors.yearLevel && (
                    <p className="text-xs font-medium text-destructive mt-1">
                      {errors.yearLevel.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="semester" className="text-sm font-semibold">Semester</Label>
                  <Controller
                    control={control}
                    name="semester"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger id="semester">
                          <SelectValue placeholder="Select semester" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FIRST_SEMESTER">First Semester</SelectItem>
                          <SelectItem value="SECOND_SEMESTER">Second Semester</SelectItem>
                          <SelectItem value="SUMMER">Summer</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.semester && (
                    <p className="text-xs font-medium text-destructive mt-1">
                      {errors.semester.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Course Combobox */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Course</Label>
                <Controller
                  control={control}
                  name="courseId"
                  render={({ field }) => {
                    const selectedCourse = courses.find((c) => c.id === field.value)
                    return (
                      <div className="relative">
                        <Popover open={courseSelectOpen} onOpenChange={setCourseSelectOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={courseSelectOpen}
                              className="w-full justify-between font-normal text-left"
                              type="button"
                              disabled={!!editingCourse}
                            >
                              <span className="truncate">
                                {selectedCourse
                                  ? `${selectedCourse.courseCode} - ${selectedCourse.courseTitle}`
                                  : "Select a course..."}
                              </span>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                            <div className="flex items-center border-b px-3">
                              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                              <Input
                                placeholder="Search course code or title..."
                                value={courseSearch}
                                onChange={(e) => setCourseSearch(e.target.value)}
                                className="flex h-9 w-full rounded-md bg-transparent py-3 text-sm outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none!"
                              />
                            </div>
                            <div className="max-h-[200px] overflow-y-auto p-1">
                              {filteredCourses.length === 0 ? (
                                <div className="py-6 text-center text-sm text-muted-foreground">
                                  No courses found.
                                </div>
                              ) : (
                                filteredCourses.map((course) => {
                                  const isSelected = field.value === course.id
                                  return (
                                    <button
                                      key={course.id}
                                      type="button"
                                      className={cn(
                                        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 px-2 text-sm outline-hidden hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 text-left",
                                        isSelected && "bg-accent text-accent-foreground"
                                      )}
                                      onClick={() => {
                                        field.onChange(course.id)
                                        setCourseSelectOpen(false)
                                        setCourseSearch("")
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4 shrink-0",
                                          isSelected ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      <span className="truncate">
                                        {course.courseCode} - {course.courseTitle}
                                      </span>
                                    </button>
                                  )
                                })
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                        {errors.courseId && (
                          <p className="text-xs font-medium text-destructive mt-1">
                            {errors.courseId.message}
                          </p>
                        )}
                      </div>
                    )
                  }}
                />
              </div>

              {/* Sort Order & Requirement Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sortOrder" className="text-sm font-semibold">Sort Order</Label>
                  <Input
                    id="sortOrder"
                    type="number"
                    min="1"
                    {...register("sortOrder")}
                  />
                  {errors.sortOrder && (
                    <p className="text-xs font-medium text-destructive mt-1">
                      {errors.sortOrder.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="requiredStatus" className="text-sm font-semibold">Requirement Status</Label>
                  <Controller
                    control={control}
                    name="requiredStatus"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger id="requiredStatus">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="REQUIRED">Required</SelectItem>
                          <SelectItem value="OPTIONAL">Optional</SelectItem>
                          <SelectItem value="ELECTIVE">Elective</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.requiredStatus && (
                    <p className="text-xs font-medium text-destructive mt-1">
                      {errors.requiredStatus.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Pre/Co-requisites */}
            <div className="space-y-4">
              {/* Prerequisite Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Prerequisite Courses</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground opacity-50" />
                  <Input
                    placeholder="Search prerequisites..."
                    value={prereqSearch}
                    onChange={(e) => setPrereqSearch(e.target.value)}
                    className="pl-8 h-9"
                  />
                </div>
                <div className="max-h-[160px] overflow-y-auto border border-muted rounded-md p-2 space-y-1.5 bg-surface">
                  {courses
                    .filter(
                      (c) =>
                        c.id !== watchCourseId &&
                        (c.courseCode.toLowerCase().includes(prereqSearch.toLowerCase()) ||
                          c.courseTitle.toLowerCase().includes(prereqSearch.toLowerCase()))
                    )
                    .map((c) => {
                      const isChecked = watchPrereqIds.includes(c.id)
                      return (
                        <label
                          key={c.id}
                          className="flex items-center gap-2 text-xs p-1.5 hover:bg-background border border-transparent hover:border-muted rounded-md cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setValue("prerequisiteCourseIds", [...watchPrereqIds, c.id])
                              } else {
                                setValue(
                                  "prerequisiteCourseIds",
                                  watchPrereqIds.filter((id) => id !== c.id)
                                )
                              }
                            }}
                            className="rounded border-muted-foreground/30 text-foreground focus:ring-primary size-3.5"
                          />
                          <span className="truncate">
                            <strong className="text-foreground font-semibold">{c.courseCode}</strong> &ndash; {c.courseTitle}
                          </span>
                        </label>
                      )
                    })}
                  {courses.filter(
                    (c) =>
                      c.id !== watchCourseId &&
                      (c.courseCode.toLowerCase().includes(prereqSearch.toLowerCase()) ||
                        c.courseTitle.toLowerCase().includes(prereqSearch.toLowerCase()))
                  ).length === 0 && (
                    <div className="text-center text-xs text-muted-foreground py-2">
                      No courses match search.
                    </div>
                  )}
                </div>
              </div>

              {/* Corequisite Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Corequisite Courses</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground opacity-50" />
                  <Input
                    placeholder="Search corequisites..."
                    value={coreqSearch}
                    onChange={(e) => setCoreqSearch(e.target.value)}
                    className="pl-8 h-9"
                  />
                </div>
                <div className="max-h-[160px] overflow-y-auto border border-muted rounded-md p-2 space-y-1.5 bg-surface">
                  {courses
                    .filter(
                      (c) =>
                        c.id !== watchCourseId &&
                        (c.courseCode.toLowerCase().includes(coreqSearch.toLowerCase()) ||
                          c.courseTitle.toLowerCase().includes(coreqSearch.toLowerCase()))
                    )
                    .map((c) => {
                      const isChecked = watchCoreqIds.includes(c.id)
                      return (
                        <label
                          key={c.id}
                          className="flex items-center gap-2 text-xs p-1.5 hover:bg-background border border-transparent hover:border-muted rounded-md cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setValue("corequisiteCourseIds", [...watchCoreqIds, c.id])
                              } else {
                                setValue(
                                  "corequisiteCourseIds",
                                  watchCoreqIds.filter((id) => id !== c.id)
                                )
                              }
                            }}
                            className="rounded border-muted-foreground/30 text-foreground focus:ring-primary size-3.5"
                          />
                          <span className="truncate">
                            <strong className="text-foreground font-semibold">{c.courseCode}</strong> &ndash; {c.courseTitle}
                          </span>
                        </label>
                      )
                    })}
                  {courses.filter(
                    (c) =>
                      c.id !== watchCourseId &&
                      (c.courseCode.toLowerCase().includes(coreqSearch.toLowerCase()) ||
                        c.courseTitle.toLowerCase().includes(coreqSearch.toLowerCase()))
                  ).length === 0 && (
                    <div className="text-center text-xs text-muted-foreground py-2">
                      No courses match search.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="md:col-span-2 pt-4 border-t mt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddEditOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary text-white hover:bg-primary/90"
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingCourse ? "Save Changes" : "Assign Course"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Course Assignment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this course from the curriculum? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteCourseMutation.isPending}
            >
              {deleteCourseMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
