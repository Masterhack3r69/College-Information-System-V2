import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Edit, Plus, Search, Loader2 } from "lucide-react"
import { ApiError } from "@/lib/api"
import type { Room } from "@/lib/types"
import {
  useRooms,
  useCreateRoom,
  useUpdateRoom,
  useUpdateRoomStatus,
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

const roomSchema = z.object({
  roomCode: z.string().min(1, "Room code is required").trim(),
  roomName: z.string().min(1, "Room name is required").trim(),
  building: z.string().trim().optional(),
  roomType: z.string().min(1, "Room type is required").trim(),
  capacity: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? undefined : val),
    z.coerce.number().int("Capacity must be an integer").min(0, "Capacity must be greater than or equal to 0").optional()
  ),
})

type RoomFormValues = z.infer<typeof roomSchema>

export function RoomsTab() {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(0)
  const size = 10

  const { data, isLoading } = useRooms(search, page, size)
  const createMutation = useCreateRoom()
  const updateMutation = useUpdateRoom()
  const statusMutation = useUpdateRoomStatus()

  const [isOpen, setIsOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Room | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RoomFormValues>({
    resolver: zodResolver(roomSchema) as any,
    defaultValues: {
      roomCode: "",
      roomName: "",
      building: "",
      roomType: "GENERAL",
      capacity: undefined,
    },
  })

  const openCreateModal = () => {
    setEditingItem(null)
    reset({
      roomCode: "",
      roomName: "",
      building: "",
      roomType: "GENERAL",
      capacity: "" as any, // set to empty string for UI
    })
    setIsOpen(true)
  }

  const openEditModal = (item: Room) => {
    setEditingItem(item)
    reset({
      roomCode: item.roomCode,
      roomName: item.roomName,
      building: item.building ?? "",
      roomType: item.roomType ?? "GENERAL",
      capacity: item.capacity ?? ("" as any),
    })
    setIsOpen(true)
  }

  const handleToggleStatus = async (item: Room) => {
    const newStatus = item.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"
    try {
      await statusMutation.mutateAsync({ id: item.id, status: newStatus })
      toast.success(`Status updated to ${newStatus.toLowerCase()} for room ${item.roomCode}`)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to update room status")
    }
  }

  const onSubmit = async (values: RoomFormValues) => {
    try {
      if (editingItem) {
        await updateMutation.mutateAsync({
          id: editingItem.id,
          ...values,
          status: editingItem.status,
        })
        toast.success("Room updated successfully")
      } else {
        await createMutation.mutateAsync({
          ...values,
          status: "ACTIVE",
        })
        toast.success("Room created successfully")
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
          <h2 className="text-xl font-semibold text-[#0b1f3a]">Rooms</h2>
          <p className="text-sm text-muted-foreground">Manage classrooms, laboratories, and capacities.</p>
        </div>
        <Button onClick={openCreateModal} className="bg-[#0b1f3a] text-white hover:bg-[#0b1f3a]/90">
          <Plus className="mr-2 h-4 w-4" /> New Room
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
              <TableHead>Room Code</TableHead>
              <TableHead>Room Name</TableHead>
              <TableHead>Building / Type</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading rooms...
                  </div>
                </TableCell>
              </TableRow>
            ) : !data?.items.length ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No rooms found.
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.roomCode}</TableCell>
                  <TableCell>{item.roomName}</TableCell>
                  <TableCell>{item.building || "—"} · {item.roomType || <span className="text-amber-600">Needs setup</span>}</TableCell>
                  <TableCell>{item.capacity ?? "—"}</TableCell>
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
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {!isLoading && data && data.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Showing {data.items.length} of {data.totalElements} rooms
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
            <DialogTitle>{editingItem ? "Edit Room" : "New Room"}</DialogTitle>
            <DialogDescription>
              Fill out the form below to {editingItem ? "update" : "create"} the classroom or lab.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="roomCode">Room Code</Label>
              <Input
                id="roomCode"
                placeholder="e.g. RM-301"
                {...register("roomCode")}
                className={cn(errors.roomCode && "border-destructive focus-visible:ring-destructive")}
              />
              {errors.roomCode && (
                <p className="text-xs text-destructive">{errors.roomCode.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="roomName">Room Name</Label>
              <Input
                id="roomName"
                placeholder="e.g. Lecture Room 301"
                {...register("roomName")}
                className={cn(errors.roomName && "border-destructive focus-visible:ring-destructive")}
              />
              {errors.roomName && (
                <p className="text-xs text-destructive">{errors.roomName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity (Optional)</Label>
              <Input
                id="capacity"
                type="number"
                placeholder="e.g. 40"
                {...register("capacity")}
                className={cn(errors.capacity && "border-destructive focus-visible:ring-destructive")}
              />
              {errors.capacity && (
                <p className="text-xs text-destructive">{errors.capacity.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="building">Building (Optional)</Label>
                <Input id="building" placeholder="e.g. Science Building" {...register("building")}/>
              </div>
              <div className="space-y-2">
                <Label htmlFor="roomType">Room Type</Label>
                <Input id="roomType" placeholder="e.g. LABORATORY" {...register("roomType")} className={cn(errors.roomType && "border-destructive focus-visible:ring-destructive")}/>
                {errors.roomType && <p className="text-xs text-destructive">{errors.roomType.message}</p>}
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#0b1f3a] text-white hover:bg-[#0b1f3a]/90" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingItem ? "Save Changes" : "Create Room"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
