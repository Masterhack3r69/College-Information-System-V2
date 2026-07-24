import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Edit, Plus, Search, Loader2 } from "lucide-react"
import { ApiError } from "@/lib/api"
import type { Department } from "@/lib/types"
import {
  useDepartments,
  useCreateDepartment,
  useUpdateDepartment,
  useUpdateDepartmentStatus,
} from "@/hooks/use-setup"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

const departmentSchema = z.object({
  departmentCode: z.string().min(1, "Department code is required").trim(),
  departmentName: z.string().min(1, "Department name is required").trim(),
  dean: z.string().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
})

type DepartmentFormValues = z.infer<typeof departmentSchema>

export function DepartmentsTab() {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(0)
  const size = 10

  const { data, isLoading } = useDepartments(search, page, size)
  const createMutation = useCreateDepartment()
  const updateMutation = useUpdateDepartment()
  const statusMutation = useUpdateDepartmentStatus()

  const [isOpen, setIsOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Department | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      departmentCode: "",
      departmentName: "",
      dean: "",
      description: "",
    },
  })

  const openCreateModal = () => {
    setEditingItem(null)
    reset({
      departmentCode: "",
      departmentName: "",
      dean: "",
      description: "",
    })
    setIsOpen(true)
  }

  const openEditModal = (item: Department) => {
    setEditingItem(item)
    reset({
      departmentCode: item.departmentCode,
      departmentName: item.departmentName,
      dean: item.dean || "",
      description: item.description || "",
    })
    setIsOpen(true)
  }

  const handleToggleStatus = async (item: Department) => {
    const newStatus = item.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"
    try {
      await statusMutation.mutateAsync({ id: item.id, status: newStatus })
      toast.success(`Status updated to ${newStatus.toLowerCase()} for department ${item.departmentCode}`)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to update department status")
    }
  }

  const onSubmit = async (values: DepartmentFormValues) => {
    try {
      if (editingItem) {
        await updateMutation.mutateAsync({
          id: editingItem.id,
          ...values,
          status: editingItem.status,
        })
        toast.success("Department updated successfully")
      } else {
        await createMutation.mutateAsync({
          ...values,
          status: "ACTIVE",
        })
        toast.success("Department created successfully")
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
          <h2 className="text-xl font-semibold text-foreground">Departments</h2>
          <p className="text-sm text-muted-foreground">Manage college departments and their deans.</p>
        </div>
        <Button onClick={openCreateModal} className="bg-primary text-white hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" /> New Department
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
              <TableHead>Dean</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading departments...
                  </div>
                </TableCell>
              </TableRow>
            ) : !data?.items.length ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No departments found.
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.departmentCode}</TableCell>
                  <TableCell>{item.departmentName}</TableCell>
                  <TableCell>{item.dean || "—"}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{item.description || "—"}</TableCell>
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
            Showing {data.items.length} of {data.totalElements} departments
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
            <DialogTitle>{editingItem ? "Edit Department" : "New Department"}</DialogTitle>
            <DialogDescription>
              Fill out the form below to {editingItem ? "update" : "create"} the department.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="departmentCode">Department Code</Label>
              <Input
                id="departmentCode"
                placeholder="e.g. CCS"
                {...register("departmentCode")}
                className={cn(errors.departmentCode && "border-destructive focus-visible:ring-destructive")}
              />
              {errors.departmentCode && (
                <p className="text-xs text-destructive">{errors.departmentCode.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="departmentName">Department Name</Label>
              <Input
                id="departmentName"
                placeholder="e.g. College of Computer Studies"
                {...register("departmentName")}
                className={cn(errors.departmentName && "border-destructive focus-visible:ring-destructive")}
              />
              {errors.departmentName && (
                <p className="text-xs text-destructive">{errors.departmentName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dean">Dean</Label>
              <Input
                id="dean"
                placeholder="e.g. John Doe, PhD"
                {...register("dean")}
                className={cn(errors.dean && "border-destructive focus-visible:ring-destructive")}
              />
              {errors.dean && (
                <p className="text-xs text-destructive">{errors.dean.message}</p>
              )}
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
              <Button type="submit" className="bg-primary text-white hover:bg-primary/90" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingItem ? "Save Changes" : "Create Department"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
