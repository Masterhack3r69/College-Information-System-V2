import { useState } from "react"
import { useForm, Controller, type Path, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Edit, Plus, Search, Loader2, CheckCircle2, ExternalLink, AlertTriangle } from "lucide-react"
import { Link } from "react-router-dom"
import { ApiError } from "@/lib/api"
import type { CurriculumResponse } from "@/lib/types"
import {
  useCurricula,
  useCreateCurriculum,
  useUpdateCurriculum,
  useActivateCurriculum,
} from "@/hooks/use-curriculum"
import { usePrograms } from "@/hooks/use-setup"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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

const curriculumSchema = z.object({
  curriculumCode: z.string().min(1, "Curriculum code is required").max(60, "Curriculum code must not exceed 60 characters").trim(),
  curriculumName: z.string().min(1, "Curriculum name is required").trim(),
  programId: z.string().min(1, "Program is required"),
  effectiveSchoolYear: z.string().min(1, "Effective school year is required").max(20, "Effective school year must not exceed 20 characters").trim(),
  version: z.string().min(1, "Version is required").max(40, "Version must not exceed 40 characters").trim(),
  status: z.enum(["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"]),
  description: z.string().optional().or(z.literal("")),
})

type CurriculumFormValues = z.infer<typeof curriculumSchema>

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "ARCHIVED", label: "Archived" },
]

export function CurriculaTab() {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(0)
  const size = 10

  const { data, isLoading } = useCurricula(search, page, size)
  const programsQuery = usePrograms("", 0, 100)
  
  const createMutation = useCreateCurriculum()
  const updateMutation = useUpdateCurriculum()
  const activateMutation = useActivateCurriculum()

  const [isOpen, setIsOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CurriculumResponse | null>(null)

  const [isActivateOpen, setIsActivateOpen] = useState(false)
  const [activatingItem, setActivatingItem] = useState<CurriculumResponse | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CurriculumFormValues>({
    resolver: zodResolver(curriculumSchema) as unknown as Resolver<CurriculumFormValues>,
    defaultValues: {
      curriculumCode: "",
      curriculumName: "",
      programId: "",
      effectiveSchoolYear: "",
      version: "",
      status: "DRAFT",
      description: "",
    },
  })

  const openCreateModal = () => {
    setEditingItem(null)
    reset({
      curriculumCode: "",
      curriculumName: "",
      programId: "",
      effectiveSchoolYear: "",
      version: "",
      status: "DRAFT",
      description: "",
    })
    setIsOpen(true)
  }

  const openEditModal = (item: CurriculumResponse) => {
    setEditingItem(item)
    reset({
      curriculumCode: item.curriculumCode,
      curriculumName: item.curriculumName,
      programId: item.programId,
      effectiveSchoolYear: item.effectiveSchoolYear,
      version: item.version,
      status: item.status,
      description: item.description || "",
    })
    setIsOpen(true)
  }

  const openActivateModal = (item: CurriculumResponse) => {
    setActivatingItem(item)
    setIsActivateOpen(true)
  }

  const handleActivateConfirm = async () => {
    if (!activatingItem) return
    try {
      await activateMutation.mutateAsync(activatingItem.id)
      toast.success(`Curriculum ${activatingItem.curriculumCode} activated successfully`)
      setIsActivateOpen(false)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to activate curriculum")
    }
  }

  const onSubmit = async (values: CurriculumFormValues) => {
    try {
      if (editingItem) {
        await updateMutation.mutateAsync({
          id: editingItem.id,
          ...values,
        })
        toast.success("Curriculum updated successfully")
      } else {
        await createMutation.mutateAsync(values)
        toast.success("Curriculum created successfully")
      }
      setIsOpen(false)
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.errors && error.errors.length > 0) {
          error.errors.forEach((err) => {
            setError(err.field as Path<CurriculumFormValues>, {
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Curricula</h2>
          <p className="text-sm text-muted-foreground">Manage academic curriculum structures, term course links, and prerequisites.</p>
        </div>
        <Button onClick={openCreateModal} className="bg-primary text-white hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" /> New Curriculum
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search code or name..."
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
              <TableHead>Name</TableHead>
              <TableHead>Program</TableHead>
              <TableHead>School Year</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[150px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading curricula...
                  </div>
                </TableCell>
              </TableRow>
            ) : !data?.items.length ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No curricula found.
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((item) => {
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.curriculumCode}</TableCell>
                    <TableCell>{item.curriculumName}</TableCell>
                    <TableCell>{item.programCode}</TableCell>
                    <TableCell>{item.effectiveSchoolYear}</TableCell>
                    <TableCell>{item.version}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold",
                          item.status === "ACTIVE" && "bg-success text-success-foreground ring-1 ring-inset ring-success-foreground/20",
                          item.status === "DRAFT" && "bg-warning text-warning-foreground ring-1 ring-inset ring-warning-foreground/20",
                          item.status === "INACTIVE" && "bg-destructive/10 text-destructive ring-1 ring-inset ring-destructive/20",
                          item.status === "ARCHIVED" && "bg-muted text-muted-foreground ring-1 ring-inset ring-muted-foreground/20"
                        )}
                      >
                        {item.status.charAt(0) + item.status.slice(1).toLowerCase()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {(item.status === "DRAFT" || item.status === "INACTIVE") && (
                          <Button variant="ghost" size="icon" onClick={() => openActivateModal(item)} title="Activate Curriculum">
                            <CheckCircle2 className="h-4 w-4 text-success-foreground" />
                            <span className="sr-only">Activate</span>
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" asChild title="Open Builder">
                          <Link to={`/setup/curricula/${item.id}`}>
                            <ExternalLink className="h-4 w-4 text-foreground" />
                            <span className="sr-only">Open Builder</span>
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEditModal(item)} title="Edit Curriculum">
                          <Edit className="h-4 w-4 text-foreground" />
                          <span className="sr-only">Edit</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {!isLoading && data && data.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Showing {data.items.length} of {data.totalElements} curricula
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

      {/* Create / Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Curriculum" : "New Curriculum"}</DialogTitle>
            <DialogDescription>
              Fill out the form below to {editingItem ? "update" : "create"} the curriculum structure.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="curriculumCode">Curriculum Code</Label>
              <Input
                id="curriculumCode"
                placeholder="e.g. BSCS-2026"
                {...register("curriculumCode")}
                className={cn(errors.curriculumCode && "border-destructive focus-visible:ring-destructive")}
              />
              {errors.curriculumCode && (
                <p className="text-xs text-destructive">{errors.curriculumCode.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="curriculumName">Curriculum Name</Label>
              <Input
                id="curriculumName"
                placeholder="e.g. Computer Science Curriculum 2026"
                {...register("curriculumName")}
                className={cn(errors.curriculumName && "border-destructive focus-visible:ring-destructive")}
              />
              {errors.curriculumName && (
                <p className="text-xs text-destructive">{errors.curriculumName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="programId">Program</Label>
              <Controller
                control={control}
                name="programId"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || ""}>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="effectiveSchoolYear">School Year</Label>
                <Input
                  id="effectiveSchoolYear"
                  placeholder="e.g. 2026-2027"
                  {...register("effectiveSchoolYear")}
                  className={cn(errors.effectiveSchoolYear && "border-destructive focus-visible:ring-destructive")}
                />
                {errors.effectiveSchoolYear && (
                  <p className="text-xs text-destructive">{errors.effectiveSchoolYear.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="version">Version</Label>
                <Input
                  id="version"
                  placeholder="e.g. 1.0"
                  {...register("version")}
                  className={cn(errors.version && "border-destructive focus-visible:ring-destructive")}
                />
                {errors.version && (
                  <p className="text-xs text-destructive">{errors.version.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <SelectTrigger
                      id="status"
                      className={cn(errors.status && "border-destructive focus-visible:ring-destructive")}
                    >
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((st) => (
                        <SelectItem key={st.value} value={st.value}>
                          {st.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.status && (
                <p className="text-xs text-destructive">{errors.status.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description"
                {...register("description")}
                className={cn(errors.description && "border-destructive focus-visible:ring-destructive")}
              />
              {errors.description && (
                <p className="text-xs text-destructive">{errors.description.message}</p>
              )}
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary text-white hover:bg-primary/90" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingItem ? "Save Changes" : "Create Curriculum"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Activation Confirmation Dialog */}
      <Dialog open={isActivateOpen} onOpenChange={setIsActivateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-warning-foreground">
              <AlertTriangle className="h-5 w-5" /> Activate Curriculum
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to activate the curriculum <strong>{activatingItem?.curriculumCode}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm text-muted-foreground space-y-2 py-2">
            <p>
              Activating this curriculum will set its status to <strong>ACTIVE</strong>.
            </p>
            <p className="font-semibold text-destructive">
              Note: Any other currently active curriculum under the program "{activatingItem?.programCode}" will automatically be set to INACTIVE.
            </p>
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setIsActivateOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-success-foreground text-white hover:bg-success-foreground/90"
              onClick={handleActivateConfirm}
              disabled={activateMutation.isPending}
            >
              {activateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Activation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
