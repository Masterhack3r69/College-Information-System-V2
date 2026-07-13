import { useState } from "react"
import { useForm, Controller, type Path, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Edit, Plus, Search, Loader2 } from "lucide-react"
import { ApiError } from "@/lib/api"
import type { Program } from "@/lib/types"
import {
  usePrograms,
  useCreateProgram,
  useUpdateProgram,
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

const programSchema = z.object({
  programCode: z.string().min(1, "Program code is required").trim(),
  programName: z.string().min(1, "Program name is required").trim(),
  departmentId: z.string().min(1, "Department is required"),
  degreeType: z.enum(["BACHELOR", "ASSOCIATE", "DIPLOMA", "CERTIFICATE", "GRADUATE_PROGRAM"]),
  programDuration: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? undefined : val),
    z.coerce.number().optional()
  ),
  description: z.string().optional().or(z.literal("")),
})

type ProgramFormValues = z.infer<typeof programSchema>

const DEGREE_TYPES = [
  { value: "BACHELOR", label: "Bachelor" },
  { value: "ASSOCIATE", label: "Associate" },
  { value: "DIPLOMA", label: "Diploma" },
  { value: "CERTIFICATE", label: "Certificate" },
  { value: "GRADUATE_PROGRAM", label: "Graduate Program" },
]

export function ProgramsTab() {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(0)
  const size = 10

  const { data, isLoading } = usePrograms(search, page, size)
  const departmentsQuery = useDepartments("", 0, 100)
  const createMutation = useCreateProgram()
  const updateMutation = useUpdateProgram()

  const [isOpen, setIsOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Program | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ProgramFormValues>({
    resolver: zodResolver(programSchema) as unknown as Resolver<ProgramFormValues>,
    defaultValues: {
      programCode: "",
      programName: "",
      departmentId: "",
      degreeType: "BACHELOR",
      programDuration: undefined,
      description: "",
    },
  })

  const openCreateModal = () => {
    setEditingItem(null)
    reset({
      programCode: "",
      programName: "",
      departmentId: "",
      degreeType: "BACHELOR",
      programDuration: undefined,
      description: "",
    })
    setIsOpen(true)
  }

  const openEditModal = (item: Program) => {
    setEditingItem(item)
    reset({
      programCode: item.programCode,
      programName: item.programName,
      departmentId: item.departmentId,
      degreeType: item.degreeType,
      programDuration: item.programDuration,
      description: item.description || "",
    })
    setIsOpen(true)
  }

  const onSubmit = async (values: ProgramFormValues) => {
    try {
      if (editingItem) {
        await updateMutation.mutateAsync({
          id: editingItem.id,
          ...values,
          status: editingItem.status,
          departmentCode: editingItem.departmentCode,
        })
        toast.success("Program updated successfully")
      } else {
        await createMutation.mutateAsync({
          ...values,
          status: "ACTIVE",
        })
        toast.success("Program created successfully")
      }
      setIsOpen(false)
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.errors && error.errors.length > 0) {
          error.errors.forEach((err) => {
            setError(err.field as Path<ProgramFormValues>, {
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
          <h2 className="text-xl font-semibold text-[#0b1f3a]">Programs</h2>
          <p className="text-sm text-muted-foreground">Manage academic programs and degree offerings.</p>
        </div>
        <Button onClick={openCreateModal} className="bg-[#0b1f3a] text-white hover:bg-[#0b1f3a]/90">
          <Plus className="mr-2 h-4 w-4" /> New Program
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
              <TableHead>Department</TableHead>
              <TableHead>Degree Type</TableHead>
              <TableHead>Duration (Yrs)</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading programs...
                  </div>
                </TableCell>
              </TableRow>
            ) : !data?.items.length ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  No programs found.
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.programCode}</TableCell>
                  <TableCell>{item.programName}</TableCell>
                  <TableCell>{item.departmentCode || "—"}</TableCell>
                  <TableCell>
                    {DEGREE_TYPES.find((d) => d.value === item.degreeType)?.label || item.degreeType}
                  </TableCell>
                  <TableCell>{item.programDuration !== undefined ? item.programDuration : "—"}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{item.description || "—"}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold",
                        item.status === "ACTIVE"
                          ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20"
                          : "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20"
                      )}
                    >
                      {item.status === "ACTIVE" ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEditModal(item)}>
                      <Edit className="h-4 w-4 text-[#0b1f3a]" />
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
            Showing {data.items.length} of {data.totalElements} programs
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
            <DialogTitle>{editingItem ? "Edit Program" : "New Program"}</DialogTitle>
            <DialogDescription>
              Fill out the form below to {editingItem ? "update" : "create"} the academic program.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="programCode">Program Code</Label>
              <Input
                id="programCode"
                placeholder="e.g. BSCS"
                {...register("programCode")}
                className={cn(errors.programCode && "border-destructive focus-visible:ring-destructive")}
              />
              {errors.programCode && (
                <p className="text-xs text-destructive">{errors.programCode.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="programName">Program Name</Label>
              <Input
                id="programName"
                placeholder="e.g. Bachelor of Science in Computer Science"
                {...register("programName")}
                className={cn(errors.programName && "border-destructive focus-visible:ring-destructive")}
              />
              {errors.programName && (
                <p className="text-xs text-destructive">{errors.programName.message}</p>
              )}
            </div>

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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="degreeType">Degree Type</Label>
                <Controller
                  control={control}
                  name="degreeType"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <SelectTrigger
                        id="degreeType"
                        className={cn(errors.degreeType && "border-destructive focus-visible:ring-destructive")}
                      >
                        <SelectValue placeholder="Select Degree Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {DEGREE_TYPES.map((dt) => (
                          <SelectItem key={dt.value} value={dt.value}>
                            {dt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.degreeType && (
                  <p className="text-xs text-destructive">{errors.degreeType.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="programDuration">Program Duration (Years)</Label>
                <Input
                  id="programDuration"
                  type="number"
                  placeholder="e.g. 4"
                  {...register("programDuration")}
                  className={cn(errors.programDuration && "border-destructive focus-visible:ring-destructive")}
                />
                {errors.programDuration && (
                  <p className="text-xs text-destructive">{errors.programDuration.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
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
              <Button type="submit" className="bg-[#0b1f3a] text-white hover:bg-[#0b1f3a]/90" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingItem ? "Save Changes" : "Create Program"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
