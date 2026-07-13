import { useState } from "react"
import { useForm, Controller, type Path } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Edit, Plus, Search, Loader2 } from "lucide-react"
import { ApiError } from "@/lib/api"
import type { Faculty } from "@/lib/types"
import {
  useFaculty,
  useCreateFaculty,
  useUpdateFaculty,
  useUpdateFacultyStatus,
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

const facultySchema = z.object({
  employeeNumber: z.string().min(1, "Employee number is required").trim(),
  firstName: z.string().min(1, "First name is required").trim(),
  middleName: z.string().optional().or(z.literal("")),
  lastName: z.string().min(1, "Last name is required").trim(),
  suffix: z.string().optional().or(z.literal("")),
  email: z.string().min(1, "Email is required").email("Invalid email address").trim(),
  contactNumber: z.string().optional().or(z.literal("")),
  departmentId: z.string().min(1, "Department is required"),
  employmentStatus: z.enum(["FULL_TIME", "PART_TIME", "CONTRACTUAL", "VISITING_LECTURER", "INACTIVE"]),
  facultyType: z.enum(["INSTRUCTOR", "PROFESSOR", "LECTURER", "DEAN", "PROGRAM_HEAD"]),
  specialization: z.string().optional().or(z.literal("")),
})

type FacultyFormValues = z.infer<typeof facultySchema>

const EMPLOYMENT_STATUSES = [
  { value: "FULL_TIME", label: "Full Time" },
  { value: "PART_TIME", label: "Part Time" },
  { value: "CONTRACTUAL", label: "Contractual" },
  { value: "VISITING_LECTURER", label: "Visiting Lecturer" },
  { value: "INACTIVE", label: "Inactive" },
]

const FACULTY_TYPES = [
  { value: "INSTRUCTOR", label: "Instructor" },
  { value: "PROFESSOR", label: "Professor" },
  { value: "LECTURER", label: "Lecturer" },
  { value: "DEAN", label: "Dean" },
  { value: "PROGRAM_HEAD", label: "Program Head" },
]

export function FacultyTab() {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(0)
  const size = 10

  const { data, isLoading } = useFaculty(search, page, size)
  const departmentsQuery = useDepartments("", 0, 100)
  const createMutation = useCreateFaculty()
  const updateMutation = useUpdateFaculty()
  const statusMutation = useUpdateFacultyStatus()

  const [isOpen, setIsOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Faculty | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FacultyFormValues>({
    resolver: zodResolver(facultySchema),
    defaultValues: {
      employeeNumber: "",
      firstName: "",
      middleName: "",
      lastName: "",
      suffix: "",
      email: "",
      contactNumber: "",
      departmentId: "",
      employmentStatus: "FULL_TIME",
      facultyType: "INSTRUCTOR",
      specialization: "",
    },
  })

  const openCreateModal = () => {
    setEditingItem(null)
    reset({
      employeeNumber: "",
      firstName: "",
      middleName: "",
      lastName: "",
      suffix: "",
      email: "",
      contactNumber: "",
      departmentId: "",
      employmentStatus: "FULL_TIME",
      facultyType: "INSTRUCTOR",
      specialization: "",
    })
    setIsOpen(true)
  }

  const openEditModal = (item: Faculty) => {
    setEditingItem(item)
    reset({
      employeeNumber: item.employeeNumber,
      firstName: item.firstName,
      middleName: item.middleName || "",
      lastName: item.lastName,
      suffix: item.suffix || "",
      email: item.email,
      contactNumber: item.contactNumber || "",
      departmentId: item.departmentId,
      employmentStatus: item.employmentStatus,
      facultyType: item.facultyType,
      specialization: item.specialization || "",
    })
    setIsOpen(true)
  }

  const handleToggleStatus = async (item: Faculty) => {
    const newStatus = item.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"
    try {
      await statusMutation.mutateAsync({ id: item.id, status: newStatus })
      toast.success(`Status updated to ${newStatus.toLowerCase()} for faculty ${item.lastName}`)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to update faculty status")
    }
  }

  const onSubmit = async (values: FacultyFormValues) => {
    try {
      if (editingItem) {
        await updateMutation.mutateAsync({
          id: editingItem.id,
          ...values,
          status: editingItem.status,
          departmentCode: editingItem.departmentCode,
        })
        toast.success("Faculty updated successfully")
      } else {
        await createMutation.mutateAsync({
          ...values,
          status: "ACTIVE",
        })
        toast.success("Faculty created successfully")
      }
      setIsOpen(false)
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.errors && error.errors.length > 0) {
          error.errors.forEach((err) => {
            setError(err.field as Path<FacultyFormValues>, {
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
          <h2 className="text-xl font-semibold text-[#0b1f3a]">Faculty</h2>
          <p className="text-sm text-muted-foreground">Manage faculty members, employment status, and specializations.</p>
        </div>
        <Button onClick={openCreateModal} className="bg-[#0b1f3a] text-white hover:bg-[#0b1f3a]/90">
          <Plus className="mr-2 h-4 w-4" /> New Faculty
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search name, email, or employee number..."
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
              <TableHead>Employee No.</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Employment Status</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading faculty...
                  </div>
                </TableCell>
              </TableRow>
            ) : !data?.items.length ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  No faculty members found.
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((item) => {
                const fullName = [
                  item.lastName,
                  item.suffix ? ` ${item.suffix},` : ",",
                  item.firstName,
                  item.middleName,
                ]
                  .filter(Boolean)
                  .join(" ")

                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.employeeNumber}</TableCell>
                    <TableCell>{fullName}</TableCell>
                    <TableCell>{item.email}</TableCell>
                    <TableCell>{item.departmentCode || "—"}</TableCell>
                    <TableCell>
                      {FACULTY_TYPES.find((f) => f.value === item.facultyType)?.label || item.facultyType}
                    </TableCell>
                    <TableCell>
                      {EMPLOYMENT_STATUSES.find((s) => s.value === item.employmentStatus)?.label || item.employmentStatus}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item)}
                          disabled={statusMutation.isPending}
                          className={cn(
                            "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
                            item.status === "ACTIVE" ? "bg-[#0b1f3a]" : "bg-input"
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
                        <Edit className="h-4 w-4 text-[#0b1f3a]" />
                        <span className="sr-only">Edit</span>
                      </Button>
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
            Showing {data.items.length} of {data.totalElements} faculty members
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Faculty" : "New Faculty"}</DialogTitle>
            <DialogDescription>
              Fill out the form below to {editingItem ? "update" : "create"} the faculty member.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employeeNumber">Employee Number</Label>
                <Input
                  id="employeeNumber"
                  placeholder="e.g. EMP-2026-0001"
                  {...register("employeeNumber")}
                  className={cn(errors.employeeNumber && "border-destructive focus-visible:ring-destructive")}
                />
                {errors.employeeNumber && (
                  <p className="text-xs text-destructive">{errors.employeeNumber.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="e.g. faculty@school.edu"
                  {...register("email")}
                  className={cn(errors.email && "border-destructive focus-visible:ring-destructive")}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  placeholder="First name"
                  {...register("firstName")}
                  className={cn(errors.firstName && "border-destructive focus-visible:ring-destructive")}
                />
                {errors.firstName && (
                  <p className="text-xs text-destructive">{errors.firstName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Last name"
                  {...register("lastName")}
                  className={cn(errors.lastName && "border-destructive focus-visible:ring-destructive")}
                />
                {errors.lastName && (
                  <p className="text-xs text-destructive">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="middleName">Middle Name</Label>
                <Input
                  id="middleName"
                  placeholder="Optional middle name"
                  {...register("middleName")}
                  className={cn(errors.middleName && "border-destructive focus-visible:ring-destructive")}
                />
                {errors.middleName && (
                  <p className="text-xs text-destructive">{errors.middleName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="suffix">Suffix</Label>
                <Input
                  id="suffix"
                  placeholder="e.g. Jr., III (Optional)"
                  {...register("suffix")}
                  className={cn(errors.suffix && "border-destructive focus-visible:ring-destructive")}
                />
                {errors.suffix && (
                  <p className="text-xs text-destructive">{errors.suffix.message}</p>
                )}
              </div>
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
                <Label htmlFor="employmentStatus">Employment Status</Label>
                <Controller
                  control={control}
                  name="employmentStatus"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <SelectTrigger
                        id="employmentStatus"
                        className={cn(errors.employmentStatus && "border-destructive focus-visible:ring-destructive")}
                      >
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {EMPLOYMENT_STATUSES.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.employmentStatus && (
                  <p className="text-xs text-destructive">{errors.employmentStatus.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="facultyType">Faculty Type</Label>
                <Controller
                  control={control}
                  name="facultyType"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <SelectTrigger
                        id="facultyType"
                        className={cn(errors.facultyType && "border-destructive focus-visible:ring-destructive")}
                      >
                        <SelectValue placeholder="Select Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {FACULTY_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.facultyType && (
                  <p className="text-xs text-destructive">{errors.facultyType.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactNumber">Contact Number</Label>
                <Input
                  id="contactNumber"
                  placeholder="Optional contact number"
                  {...register("contactNumber")}
                  className={cn(errors.contactNumber && "border-destructive focus-visible:ring-destructive")}
                />
                {errors.contactNumber && (
                  <p className="text-xs text-destructive">{errors.contactNumber.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialization">Specialization</Label>
              <Input
                id="specialization"
                placeholder="Optional specialization (e.g. Data Science, Web Development)"
                {...register("specialization")}
                className={cn(errors.specialization && "border-destructive focus-visible:ring-destructive")}
              />
              {errors.specialization && (
                <p className="text-xs text-destructive">{errors.specialization.message}</p>
              )}
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#0b1f3a] text-white hover:bg-[#0b1f3a]/90" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingItem ? "Save Changes" : "Create Faculty"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
