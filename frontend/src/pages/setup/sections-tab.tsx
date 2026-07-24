import { useState } from "react"
import { useForm, Controller, type Path, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Edit, Plus, Search, Loader2 } from "lucide-react"
import { ApiError } from "@/lib/api"
import type { Section } from "@/lib/types"
import {
  useSections,
  useCreateSection,
  useUpdateSection,
  useUpdateSectionStatus,
  usePrograms,
  useSchoolYears,
  useSemesters,
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
import { useCurricula } from "@/hooks/use-curriculum"

const sectionSchema = z.object({
  sectionCode: z.string().min(1, "Section code is required").trim(),
  programId: z.string().min(1, "Program is required"),
  curriculumId: z.string().min(1, "Curriculum is required"),
  schoolYearId: z.string().min(1, "School year is required"),
  semesterId: z.string().min(1, "Semester is required"),
  yearLevel: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? undefined : val),
    z.coerce.number().int("Year level must be an integer").min(1, "Year level must be at least 1")
  ),
  maximumCapacity: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? undefined : val),
    z.coerce.number().int("Capacity must be an integer").min(1, "Maximum capacity is required")
  ),
})

type SectionFormValues = z.infer<typeof sectionSchema>

export function SectionsTab() {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(0)
  const size = 10

  const { data, isLoading } = useSections(search, page, size)
  const programsQuery = usePrograms("", 0, 100)
  const curriculaQuery = useCurricula("", 0, 1000)
  const schoolYearsQuery = useSchoolYears(0, 100)
  const semestersQuery = useSemesters(0, 100)

  const createMutation = useCreateSection()
  const updateMutation = useUpdateSection()
  const statusMutation = useUpdateSectionStatus()

  const [isOpen, setIsOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Section | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SectionFormValues>({
    resolver: zodResolver(sectionSchema) as unknown as Resolver<SectionFormValues>,
    defaultValues: {
      sectionCode: "",
      programId: "",
      curriculumId: "",
      schoolYearId: "",
      semesterId: "",
      yearLevel: undefined,
      maximumCapacity: 40,
    },
  })

  const openCreateModal = () => {
    setEditingItem(null)
    reset({
      sectionCode: "",
      programId: "",
      curriculumId: "",
      schoolYearId: "",
      semesterId: "",
      yearLevel: undefined,
      maximumCapacity: 40,
    })
    setIsOpen(true)
  }

  const openEditModal = (item: Section) => {
    setEditingItem(item)
    reset({
      sectionCode: item.sectionCode,
      programId: item.programId,
      curriculumId: item.curriculumId || "",
      schoolYearId: item.schoolYearId,
      semesterId: item.semesterId,
      yearLevel: item.yearLevel,
      maximumCapacity: item.maximumCapacity ?? 40,
    })
    setIsOpen(true)
  }

  const handleToggleStatus = async (item: Section) => {
    const newStatus = item.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"
    try {
      await statusMutation.mutateAsync({ id: item.id, status: newStatus })
      toast.success(`Status updated to ${newStatus.toLowerCase()} for section ${item.sectionCode}`)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to update section status")
    }
  }

  const onSubmit = async (values: SectionFormValues) => {
    try {
      if (editingItem) {
        await updateMutation.mutateAsync({
          id: editingItem.id,
          ...values,
          status: editingItem.status,
          programCode: editingItem.programCode,
          curriculumCode: editingItem.curriculumCode,
          schoolYear: editingItem.schoolYear,
          semesterName: editingItem.semesterName,
        })
        toast.success("Section updated successfully")
      } else {
        await createMutation.mutateAsync({
          ...values,
          status: "ACTIVE",
        })
        toast.success("Section created successfully")
      }
      setIsOpen(false)
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.errors && error.errors.length > 0) {
          error.errors.forEach((err) => {
            setError(err.field as Path<SectionFormValues>, {
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

  const programs = programsQuery.data?.items || []
  const selectedProgramId = watch("programId")
  const curricula = curriculaQuery.data?.items.filter((item) => item.programId === selectedProgramId) || []
  const schoolYears = schoolYearsQuery.data?.items.filter((sy) => sy.active || sy.id === editingItem?.schoolYearId) || []
  const semesters = semestersQuery.data?.items.filter((sem) => sem.active || sem.id === editingItem?.semesterId) || []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Sections</h2>
          <p className="text-sm text-muted-foreground">Manage sections, year levels, and class organization.</p>
        </div>
        <Button onClick={openCreateModal} className="bg-primary text-white hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" /> New Section
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search section code..."
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
              <TableHead>Section Code</TableHead>
              <TableHead>Program</TableHead>
              <TableHead>Curriculum</TableHead>
              <TableHead>School Year</TableHead>
              <TableHead>Semester</TableHead>
              <TableHead>Year Level</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading sections...
                  </div>
                </TableCell>
              </TableRow>
            ) : !data?.items.length ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  No sections found.
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.sectionCode}</TableCell>
                  <TableCell>{item.programCode || "—"}</TableCell>
                  <TableCell>{item.curriculumCode || <span className="text-warning-foreground">Needs setup</span>}</TableCell>
                  <TableCell>{item.schoolYear || "—"}</TableCell>
                  <TableCell>{item.semesterName || "—"}</TableCell>
                  <TableCell>{item.yearLevel}</TableCell>
                  <TableCell>{item.confirmedCount ?? 0} / {item.maximumCapacity ?? <span className="text-warning-foreground">Not configured</span>}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(item)}
                        disabled={statusMutation.isPending}
                        className={cn(
                          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
                          item.status === "ACTIVE" ? "bg-primary" : "bg-input"
                        )}
                      >
                        <span
                          className={cn(
                            "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform",
                            item.status === "ACTIVE" ? "translate-x-4" : "translate-x-0.5"
                          )}
                        />
                      </button>
                      <span className="text-xs font-medium text-muted-foreground">
                        {item.status === "ACTIVE" ? "Active" : "Inactive"}
                      </span>
                    </div>
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
            Showing {data.items.length} of {data.totalElements} sections
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
            <DialogTitle>{editingItem ? "Edit Section" : "New Section"}</DialogTitle>
            <DialogDescription>
              Fill out the form below to {editingItem ? "update" : "create"} the section.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sectionCode">Section Code</Label>
              <Input
                id="sectionCode"
                placeholder="e.g. BSCS-1A"
                {...register("sectionCode")}
                className={cn(errors.sectionCode && "border-destructive focus-visible:ring-destructive")}
              />
              {errors.sectionCode && (
                <p className="text-xs text-destructive">{errors.sectionCode.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="programId">Program</Label>
              <Controller
                control={control}
                name="programId"
                render={({ field }) => (
                  <Select onValueChange={(val) => {
                    field.onChange(val);
                    setValue("curriculumId", "");
                  }} value={field.value || ""}>
                    <SelectTrigger
                      id="programId"
                      className={cn(errors.programId && "border-destructive focus-visible:ring-destructive")}
                    >
                      <SelectValue placeholder="Select Program" />
                    </SelectTrigger>
                    <SelectContent>
                      {programsQuery.isLoading ? (
                        <div className="flex items-center justify-center p-2 text-xs text-muted-foreground">
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" /> Loading programs...
                        </div>
                      ) : programs.length === 0 ? (
                        <div className="p-2 text-xs text-muted-foreground">No programs available</div>
                      ) : (
                        programs.map((prog) => (
                          <SelectItem key={prog.id} value={prog.id}>
                            {prog.programCode} - {prog.programName}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.programId && (
                <p className="text-xs text-destructive">{errors.programId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="curriculumId">Curriculum</Label>
              <Controller
                control={control}
                name="curriculumId"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || ""} disabled={!selectedProgramId}>
                    <SelectTrigger id="curriculumId">
                      <SelectValue placeholder={selectedProgramId ? "Select Curriculum" : "Select a program first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {curricula.map((item) => (
                        <SelectItem key={item.id} value={item.id}>{item.curriculumName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.curriculumId && <p className="text-xs text-destructive">{errors.curriculumId.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="schoolYearId">School Year</Label>
                <Controller
                  control={control}
                  name="schoolYearId"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <SelectTrigger
                        id="schoolYearId"
                        className={cn(errors.schoolYearId && "border-destructive focus-visible:ring-destructive")}
                      >
                        <SelectValue placeholder="Select School Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {schoolYearsQuery.isLoading ? (
                          <div className="flex items-center justify-center p-2 text-xs text-muted-foreground">
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" /> Loading school years...
                          </div>
                        ) : schoolYears.length === 0 ? (
                          <div className="p-2 text-xs text-muted-foreground">No school years available</div>
                        ) : (
                          schoolYears.map((sy) => (
                            <SelectItem key={sy.id} value={sy.id}>
                              {sy.schoolYear}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.schoolYearId && (
                  <p className="text-xs text-destructive">{errors.schoolYearId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="semesterId">Semester</Label>
                <Controller
                  control={control}
                  name="semesterId"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <SelectTrigger
                        id="semesterId"
                        className={cn(errors.semesterId && "border-destructive focus-visible:ring-destructive")}
                      >
                        <SelectValue placeholder="Select Semester" />
                      </SelectTrigger>
                      <SelectContent>
                        {semestersQuery.isLoading ? (
                          <div className="flex items-center justify-center p-2 text-xs text-muted-foreground">
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" /> Loading semesters...
                          </div>
                        ) : semesters.length === 0 ? (
                          <div className="p-2 text-xs text-muted-foreground">No semesters available</div>
                        ) : (
                          semesters.map((sem) => (
                            <SelectItem key={sem.id} value={sem.id}>
                              {sem.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.semesterId && (
                  <p className="text-xs text-destructive">{errors.semesterId.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="yearLevel">Year Level</Label>
              <Input
                id="yearLevel"
                type="number"
                placeholder="e.g. 1"
                {...register("yearLevel")}
                className={cn(errors.yearLevel && "border-destructive focus-visible:ring-destructive")}
              />
              {errors.yearLevel && (
                <p className="text-xs text-destructive">{errors.yearLevel.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="maximumCapacity">Maximum Capacity</Label>
              <Input id="maximumCapacity" type="number" min={1} placeholder="e.g. 40" {...register("maximumCapacity")} className={cn(errors.maximumCapacity && "border-destructive focus-visible:ring-destructive")}/>
              {errors.maximumCapacity && <p className="text-xs text-destructive">{errors.maximumCapacity.message}</p>}
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary text-white hover:bg-primary/90" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingItem ? "Save Changes" : "Create Section"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
