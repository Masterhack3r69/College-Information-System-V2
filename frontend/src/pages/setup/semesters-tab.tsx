import { useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Edit, Plus, Loader2 } from "lucide-react"
import { ApiError } from "@/lib/api"
import type { Semester } from "@/lib/types"
import {
  useSemesters,
  useCreateSemester,
  useUpdateSemester,
} from "@/hooks/use-setup"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
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

const semesterSchema = z.object({
  name: z.string().min(1, "Name is required").trim(),
  sortOrder: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? undefined : val),
    z.coerce.number().int("Sort order must be an integer").min(1, "Sort order must be greater than or equal to 1")
  ),
  active: z.boolean(),
})

type SemesterFormValues = z.infer<typeof semesterSchema>

export function SemestersTab() {
  const [page, setPage] = useState(0)
  const size = 10

  const { data, isLoading } = useSemesters(page, size)
  const createMutation = useCreateSemester()
  const updateMutation = useUpdateSemester()

  const [isOpen, setIsOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Semester | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SemesterFormValues>({
    resolver: zodResolver(semesterSchema) as any,
    defaultValues: {
      name: "",
      sortOrder: 1,
      active: false,
    },
  })

  const openCreateModal = () => {
    setEditingItem(null)
    reset({
      name: "",
      sortOrder: 1,
      active: false,
    })
    setIsOpen(true)
  }

  const openEditModal = (item: Semester) => {
    setEditingItem(item)
    reset({
      name: item.name,
      sortOrder: item.sortOrder,
      active: item.active,
    })
    setIsOpen(true)
  }

  const handleToggleActive = async (item: Semester) => {
    try {
      await updateMutation.mutateAsync({
        id: item.id,
        name: item.name,
        sortOrder: item.sortOrder,
        active: !item.active,
      })
      toast.success(`Semester ${item.name} is now ${!item.active ? "active" : "inactive"}`)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to update semester status")
    }
  }

  const onSubmit = async (values: SemesterFormValues) => {
    try {
      if (editingItem) {
        await updateMutation.mutateAsync({
          id: editingItem.id,
          ...values,
        })
        toast.success("Semester updated successfully")
      } else {
        await createMutation.mutateAsync({
          ...values,
        })
        toast.success("Semester created successfully")
      }
      setIsOpen(false)
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.errors && error.errors.length > 0) {
          error.errors.forEach((err) => {
            setError(err.field as any, {
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#0b1f3a]">Semesters</h2>
          <p className="text-sm text-muted-foreground">Manage academic semesters and term settings.</p>
        </div>
        <Button onClick={openCreateModal} className="bg-[#0b1f3a] text-white hover:bg-[#0b1f3a]/90">
          <Plus className="mr-2 h-4 w-4" /> New Semester
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Semester Name</TableHead>
              <TableHead>Sort Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading semesters...
                  </div>
                </TableCell>
              </TableRow>
            ) : !data?.items.length ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No semesters found.
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.sortOrder}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(item)}
                        disabled={updateMutation.isPending}
                        className={cn(
                          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
                          item.active ? "bg-[#0b1f3a]" : "bg-input"
                        )}
                      >
                        <span
                          className={cn(
                            "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform",
                            item.active ? "translate-x-4" : "translate-x-0.5"
                          )}
                        />
                      </button>
                      <span className="text-xs font-medium text-muted-foreground">
                        {item.active ? "Active" : "Inactive"}
                      </span>
                    </div>
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
            Showing {data.items.length} of {data.totalElements} semesters
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
            <DialogTitle>{editingItem ? "Edit Semester" : "New Semester"}</DialogTitle>
            <DialogDescription>
              Fill out the form below to {editingItem ? "update" : "create"} the semester.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Semester Name</Label>
              <Input
                id="name"
                placeholder="e.g. First Semester"
                {...register("name")}
                className={cn(errors.name && "border-destructive focus-visible:ring-destructive")}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input
                id="sortOrder"
                type="number"
                placeholder="e.g. 1"
                {...register("sortOrder")}
                className={cn(errors.sortOrder && "border-destructive focus-visible:ring-destructive")}
              />
              {errors.sortOrder && (
                <p className="text-xs text-destructive">{errors.sortOrder.message}</p>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Controller
                name="active"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="active"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label htmlFor="active" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Mark as active term
              </Label>
              {errors.active && (
                <p className="text-xs text-destructive">{errors.active.message}</p>
              )}
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#0b1f3a] text-white hover:bg-[#0b1f3a]/90" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingItem ? "Save Changes" : "Create Semester"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
