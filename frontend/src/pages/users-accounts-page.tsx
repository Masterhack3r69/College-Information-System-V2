import { useDeferredValue, useMemo, useState } from "react"
import { Controller, useForm, type Path } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Check,
  ChevronsUpDown,
  KeyRound,
  LockKeyhole,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  UserCheck,
  UserRoundCog,
  UserX,
  UsersRound,
} from "lucide-react"
import { toast } from "sonner"
import { ApiError } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import type { AdminUser, FacultyAccountOption, Permission, Role, UserAccountRequest } from "@/lib/types"
import {
  useAdminUsers,
  useCreateAdminUser,
  useFacultyAccountOptions,
  usePermissions,
  useResetAdminUserPassword,
  useRoles,
  useSetAdminUserStatus,
  useUpdateAdminUser,
  useUpdateRolePermissions,
} from "@/hooks/use-user-administration"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

const userSchema = z.object({
  username: z.string().trim().min(1, "Username is required").max(80),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email").max(120),
  fullName: z.string().trim().min(1, "Full name is required").max(255),
  initialPassword: z.string().max(120).optional(),
  roleIds: z.array(z.string()).min(1, "Select at least one role"),
  facultyId: z.string().optional(),
})

const passwordSchema = z
  .object({
    newPassword: z.string().min(8, "Use at least 8 characters").max(120),
    confirmPassword: z.string().min(1, "Confirm the new password"),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  })

type UserFormValues = z.infer<typeof userSchema>
type PasswordFormValues = z.infer<typeof passwordSchema>

const EMPTY_USER_FORM: UserFormValues = {
  username: "",
  email: "",
  fullName: "",
  initialPassword: "",
  roleIds: [],
  facultyId: undefined,
}

function messageFor(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback
}

function readable(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export function UsersAccountsPage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-7">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="size-4" />
          System administration
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Users &amp; Accounts</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Provision staff access, connect faculty identities, and control permissions without removing historical account records.
        </p>
      </div>

      <Tabs defaultValue="users" className="flex flex-col gap-5">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="roles">Roles &amp; Permissions</TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <UsersTab />
        </TabsContent>
        <TabsContent value="roles">
          <RolesPermissionsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function UsersTab() {
  const { user: signedInUser } = useAuth()
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const [roleId, setRoleId] = useState("all")
  const [status, setStatus] = useState("all")
  const [page, setPage] = useState(0)
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [userDialogOpen, setUserDialogOpen] = useState(false)
  const [resetUser, setResetUser] = useState<AdminUser | null>(null)
  const [statusTarget, setStatusTarget] = useState<AdminUser | null>(null)
  const roles = useRoles()
  const users = useAdminUsers({
    search: deferredSearch || undefined,
    roleId: roleId === "all" ? undefined : roleId,
    active: status === "all" ? undefined : status === "active",
    page,
    size: 10,
  })
  const statusMutation = useSetAdminUserStatus()

  function changeFilter(update: () => void) {
    update()
    setPage(0)
  }

  function openCreate() {
    setEditingUser(null)
    setUserDialogOpen(true)
  }

  function openEdit(user: AdminUser) {
    setEditingUser(user)
    setUserDialogOpen(true)
  }

  async function confirmStatusChange() {
    if (!statusTarget) return
    try {
      await statusMutation.mutateAsync({ id: statusTarget.id, active: !statusTarget.active })
      toast.success(`${statusTarget.fullName} is now ${statusTarget.active ? "inactive" : "active"}.`)
      setStatusTarget(null)
    } catch (error) {
      toast.error(messageFor(error, "Unable to update account status"))
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold">System users</h2>
          <p className="text-sm text-muted-foreground">Accounts stay in the audit trail even when access is deactivated.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus data-icon="inline-start" />
          New user
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(16rem,1fr)_14rem_11rem]">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search users"
            className="pl-9"
            placeholder="Search name, username, or email"
            value={search}
            onChange={(event) => changeFilter(() => setSearch(event.target.value))}
          />
        </div>
        <Select value={roleId} onValueChange={(value) => changeFilter(() => setRoleId(value))}>
          <SelectTrigger aria-label="Filter by role"><SelectValue placeholder="All roles" /></SelectTrigger>
          <SelectContent><SelectGroup>
            <SelectItem value="all">All roles</SelectItem>
            {roles.data?.map((role) => <SelectItem key={role.id} value={role.id}>{readable(role.name)}</SelectItem>)}
          </SelectGroup></SelectContent>
        </Select>
        <Select value={status} onValueChange={(value) => changeFilter(() => setStatus(value))}>
          <SelectTrigger aria-label="Filter by status"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent><SelectGroup>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectGroup></SelectContent>
        </Select>
      </div>

      {users.isError ? (
        <Alert variant="destructive">
          <LockKeyhole />
          <AlertTitle>Unable to load users</AlertTitle>
          <AlertDescription>{messageFor(users.error, "Try refreshing the page.")}</AlertDescription>
        </Alert>
      ) : users.isLoading ? (
        <div className="flex flex-col gap-2 rounded-lg border p-4">
          {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-11 w-full" />)}
        </div>
      ) : users.data?.items.length ? (
        <div className="overflow-x-auto rounded-lg border" tabIndex={0} aria-label="System users table">
          <Table className="min-w-[62rem]">
            <TableHeader><TableRow>
              <TableHead>User</TableHead><TableHead>Roles</TableHead><TableHead>Faculty link</TableHead>
              <TableHead>Status</TableHead><TableHead>Updated</TableHead><TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {users.data.items.map((account) => (
                <TableRow key={account.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-sm font-medium">
                        {account.fullName.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{account.fullName}</p>
                        <p className="truncate text-xs text-muted-foreground">@{account.username} · {account.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><div className="flex max-w-xs flex-wrap gap-1">
                    {account.roles.map((role) => <Badge key={role.id} variant="secondary">{readable(role.name)}</Badge>)}
                  </div></TableCell>
                  <TableCell>{account.facultyName ?? <span className="text-muted-foreground">Not linked</span>}</TableCell>
                  <TableCell><Badge variant={account.active ? "default" : "outline"}>{account.active ? "Active" : "Inactive"}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(account.updatedAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label={`Actions for ${account.fullName}`}><MoreHorizontal /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Account actions</DropdownMenuLabel>
                        <DropdownMenuGroup>
                          <DropdownMenuItem onSelect={() => openEdit(account)}><UserRoundCog />Edit user</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setResetUser(account)}><KeyRound />Reset password</DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                          <DropdownMenuItem
                            disabled={account.active && account.id === signedInUser?.id}
                            variant={account.active ? "destructive" : "default"}
                            onSelect={() => setStatusTarget(account)}
                          >
                            {account.active ? <UserX /> : <UserCheck />}
                            {account.active ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <Empty className="min-h-64 border">
          <EmptyHeader><EmptyMedia variant="icon"><UsersRound /></EmptyMedia><EmptyTitle>No users found</EmptyTitle>
            <EmptyDescription>Adjust the filters or create a new system user.</EmptyDescription></EmptyHeader>
        </Empty>
      )}

      {users.data && users.data.totalPages > 0 ? (
        <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground">Showing {users.data.items.length} of {users.data.totalElements} users</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>Previous</Button>
            <span className="text-muted-foreground">Page {page + 1} of {users.data.totalPages}</span>
            <Button variant="outline" size="sm" disabled={page + 1 >= users.data.totalPages} onClick={() => setPage((value) => value + 1)}>Next</Button>
          </div>
        </div>
      ) : null}

      <UserDialog key={editingUser?.id ?? "new-user"} open={userDialogOpen} onOpenChange={setUserDialogOpen} user={editingUser} roles={roles.data ?? []} />
      <PasswordResetDialog user={resetUser} onOpenChange={(open) => { if (!open) setResetUser(null) }} />
      <AlertDialog open={statusTarget !== null} onOpenChange={(open) => { if (!open) setStatusTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{statusTarget?.active ? "Deactivate account?" : "Activate account?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {statusTarget?.active
                ? `${statusTarget.fullName} will lose access immediately and all refresh sessions will be revoked.`
                : `${statusTarget?.fullName} will be able to sign in again with their assigned roles.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmStatusChange()} disabled={statusMutation.isPending}>
              {statusMutation.isPending ? <Spinner data-icon="inline-start" /> : null}
              {statusTarget?.active ? "Deactivate" : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function UserDialog({ open, onOpenChange, user, roles }: { open: boolean; onOpenChange: (open: boolean) => void; user: AdminUser | null; roles: Role[] }) {
  const createMutation = useCreateAdminUser()
  const updateMutation = useUpdateAdminUser()
  const initialValues: UserFormValues = user ? {
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    initialPassword: "",
    roleIds: user.roles.map((role) => role.id),
    facultyId: user.facultyId,
  } : EMPTY_USER_FORM
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<UserFormValues>({ resolver: zodResolver(userSchema), defaultValues: initialValues })

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) reset(initialValues)
    onOpenChange(nextOpen)
  }

  async function submit(values: UserFormValues) {
    if (!user && (!values.initialPassword || values.initialPassword.length < 8)) {
      setError("initialPassword", { message: "Use at least 8 characters" })
      return
    }
    const request: UserAccountRequest = {
      username: values.username,
      email: values.email,
      fullName: values.fullName,
      roleIds: values.roleIds,
      facultyId: values.facultyId || undefined,
      initialPassword: user ? undefined : values.initialPassword,
    }
    try {
      if (user) await updateMutation.mutateAsync({ id: user.id, request })
      else await createMutation.mutateAsync(request)
      toast.success(user ? "User updated successfully" : "User created successfully")
      onOpenChange(false)
    } catch (error) {
      if (error instanceof ApiError && error.errors.length) {
        error.errors.forEach((issue) => setError(issue.field as Path<UserFormValues>, { message: issue.message }))
      }
      toast.error(messageFor(error, "Unable to save user"))
    }
  }

  const pending = createMutation.isPending || updateMutation.isPending
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{user ? "Edit user" : "New system user"}</DialogTitle>
          <DialogDescription>{user ? "Update identity, role, and faculty relationships." : "Create an active account with an initial password."}</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-6" onSubmit={handleSubmit(submit)}>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={!!errors.fullName} className="sm:col-span-2"><FieldLabel htmlFor="fullName">Full name</FieldLabel>
              <Input id="fullName" aria-invalid={!!errors.fullName} autoComplete="name" {...register("fullName")} /><FieldError>{errors.fullName?.message}</FieldError></Field>
            <Field data-invalid={!!errors.username}><FieldLabel htmlFor="username">Username</FieldLabel>
              <Input id="username" aria-invalid={!!errors.username} autoComplete="off" {...register("username")} /><FieldError>{errors.username?.message}</FieldError></Field>
            <Field data-invalid={!!errors.email}><FieldLabel htmlFor="email">Email</FieldLabel>
              <Input id="email" type="email" aria-invalid={!!errors.email} autoComplete="email" {...register("email")} /><FieldError>{errors.email?.message}</FieldError></Field>
            {!user ? <Field data-invalid={!!errors.initialPassword} className="sm:col-span-2"><FieldLabel htmlFor="initialPassword">Initial password</FieldLabel>
              <Input id="initialPassword" type="password" aria-invalid={!!errors.initialPassword} autoComplete="new-password" {...register("initialPassword")} />
              <FieldDescription>Between 8 and 120 characters. The administrator must share it securely.</FieldDescription><FieldError>{errors.initialPassword?.message}</FieldError></Field> : null}
          </FieldGroup>

          <Controller control={control} name="roleIds" render={({ field }) => (
            <FieldSet data-invalid={!!errors.roleIds}><FieldLegend variant="label">Roles</FieldLegend>
              <FieldDescription>Permissions are combined when more than one role is assigned.</FieldDescription>
              <FieldGroup data-slot="checkbox-group" className="grid gap-3 sm:grid-cols-2">
                {roles.map((role) => {
                  const checked = field.value.includes(role.id)
                  return <Field key={role.id} orientation="horizontal">
                    <Checkbox id={`role-${role.id}`} checked={checked} onCheckedChange={(next) => field.onChange(next ? [...field.value, role.id] : field.value.filter((id) => id !== role.id))} />
                    <FieldContent><FieldLabel htmlFor={`role-${role.id}`}>{readable(role.name)}</FieldLabel><FieldDescription>{role.description}</FieldDescription></FieldContent>
                  </Field>
                })}
              </FieldGroup><FieldError>{errors.roleIds?.message}</FieldError>
            </FieldSet>
          )} />

          <Controller control={control} name="facultyId" render={({ field }) => (
            <Field><FieldLabel>Faculty link</FieldLabel><FacultyCombobox value={field.value} includeFacultyId={user?.facultyId} onChange={field.onChange} />
              <FieldDescription>Optional. A faculty record can belong to only one user account.</FieldDescription></Field>
          )} />
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? <Spinner data-icon="inline-start" /> : null}{user ? "Save changes" : "Create user"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function FacultyCombobox({ value, includeFacultyId, onChange }: { value?: string; includeFacultyId?: string; onChange: (value?: string) => void }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const options = useFacultyAccountOptions(deferredSearch, includeFacultyId)
  const selected = options.data?.items.find((option) => option.id === value)
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild><Button type="button" variant="outline" role="combobox" aria-label="Faculty link" aria-expanded={open} className="w-full justify-between font-normal">
      <span className="truncate">{selected ? `${selected.fullName} · ${selected.employeeNumber}` : "No faculty link"}</span><ChevronsUpDown className="text-muted-foreground" />
    </Button></PopoverTrigger>
    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
      <Command shouldFilter={false}><CommandInput placeholder="Search available faculty" value={search} onValueChange={setSearch} />
        <CommandList><CommandGroup>
          <CommandItem value="unlinked" onSelect={() => { onChange(undefined); setOpen(false) }}><Check className={cn("opacity-0", !value && "opacity-100")} />No faculty link</CommandItem>
        </CommandGroup>
        {options.isLoading ? <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground"><Spinner />Loading faculty…</div> : null}
        {!options.isLoading && !options.data?.items.length ? <CommandEmpty>No available faculty found.</CommandEmpty> : null}
        <CommandGroup>
          {options.data?.items.map((option: FacultyAccountOption) => <CommandItem key={option.id} value={option.id} onSelect={() => { onChange(option.id); setOpen(false) }}>
            <Check className={cn("opacity-0", option.id === value && "opacity-100")} /><div className="min-w-0"><p className="truncate">{option.fullName}</p><p className="truncate text-xs text-muted-foreground">{option.employeeNumber} · {option.email}</p></div>
            {option.status === "INACTIVE" ? <Badge variant="outline" className="ml-auto">Inactive</Badge> : null}
          </CommandItem>)}
        </CommandGroup></CommandList>
      </Command>
    </PopoverContent>
  </Popover>
}

function PasswordResetDialog({ user, onOpenChange }: { user: AdminUser | null; onOpenChange: (open: boolean) => void }) {
  const mutation = useResetAdminUserPassword()
  const { register, handleSubmit, reset, formState: { errors } } = useForm<PasswordFormValues>({ resolver: zodResolver(passwordSchema), defaultValues: { newPassword: "", confirmPassword: "" } })
  async function submit(values: PasswordFormValues) {
    if (!user) return
    try {
      await mutation.mutateAsync({ id: user.id, newPassword: values.newPassword })
      toast.success(`Password reset for ${user.fullName}`)
      reset(); onOpenChange(false)
    } catch (error) { toast.error(messageFor(error, "Unable to reset password")) }
  }
  function handleOpenChange(open: boolean) {
    if (!open) reset()
    onOpenChange(open)
  }
  return <Dialog open={user !== null} onOpenChange={handleOpenChange}><DialogContent className="sm:max-w-md">
    <DialogHeader><DialogTitle>Reset password</DialogTitle><DialogDescription>Set a temporary password for {user?.fullName}. All refresh sessions will be revoked.</DialogDescription></DialogHeader>
    <form className="flex flex-col gap-5" onSubmit={handleSubmit(submit)}><FieldGroup>
      <Field data-invalid={!!errors.newPassword}><FieldLabel htmlFor="newPassword">New password</FieldLabel><Input id="newPassword" type="password" autoComplete="new-password" aria-invalid={!!errors.newPassword} {...register("newPassword")} /><FieldError>{errors.newPassword?.message}</FieldError></Field>
      <Field data-invalid={!!errors.confirmPassword}><FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel><Input id="confirmPassword" type="password" autoComplete="new-password" aria-invalid={!!errors.confirmPassword} {...register("confirmPassword")} /><FieldError>{errors.confirmPassword?.message}</FieldError></Field>
    </FieldGroup><DialogFooter><Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? <Spinner data-icon="inline-start" /> : null}Reset password</Button></DialogFooter></form>
  </DialogContent></Dialog>
}

function RolesPermissionsTab() {
  const roles = useRoles()
  const permissions = usePermissions()
  const [selectedRoleId, setSelectedRoleId] = useState<string>()
  const selectedRole = roles.data?.find((role) => role.id === selectedRoleId) ?? roles.data?.[0]
  if (roles.isError || permissions.isError) return <Alert variant="destructive"><LockKeyhole /><AlertTitle>Unable to load access controls</AlertTitle><AlertDescription>{messageFor(roles.error ?? permissions.error, "Try refreshing the page.")}</AlertDescription></Alert>
  if (roles.isLoading || permissions.isLoading) return <div className="grid gap-4 lg:grid-cols-[16rem_1fr]"><Skeleton className="h-96"/><Skeleton className="h-96"/></div>
  return <div className="grid gap-5 lg:grid-cols-[16rem_minmax(0,1fr)]">
    <div className="flex flex-col gap-2 rounded-lg border p-2" aria-label="Roles">
      {roles.data?.map((role) => <Button key={role.id} variant={selectedRole?.id === role.id ? "secondary" : "ghost"} className="h-auto justify-start px-3 py-2 text-left" onClick={() => setSelectedRoleId(role.id)}>
        <span className="min-w-0"><span className="block truncate font-medium">{readable(role.name)}</span><span className="block truncate text-xs font-normal text-muted-foreground">{role.permissions.length} permissions</span></span>
      </Button>)}
    </div>
    {selectedRole ? <RolePermissionEditor key={`${selectedRole.id}-${selectedRole.permissions.map((permission) => permission.id).join("-")}`} role={selectedRole} permissions={permissions.data ?? []} /> : null}
  </div>
}

function RolePermissionEditor({ role, permissions }: { role: Role; permissions: Permission[] }) {
  const mutation = useUpdateRolePermissions()
  const [selected, setSelected] = useState(() => new Set(role.permissions.map((permission) => permission.id)))
  const locked = role.name === "SUPER_ADMIN"
  const groups = useMemo(() => {
    const result = new Map<string, Permission[]>()
    permissions.forEach((permission) => {
      const prefix = permission.name.startsWith("ACADEMIC_SETUP") ? "ACADEMIC_SETUP" : permission.name.split("_")[0]
      result.set(prefix, [...(result.get(prefix) ?? []), permission])
    })
    return [...result.entries()].sort(([left], [right]) => left.localeCompare(right))
  }, [permissions])
  const changed = selected.size !== role.permissions.length || role.permissions.some((permission) => !selected.has(permission.id))
  async function save() {
    try { await mutation.mutateAsync({ id: role.id, permissionIds: [...selected] }); toast.success(`${readable(role.name)} permissions updated`) }
    catch (error) { toast.error(messageFor(error, "Unable to update permissions")) }
  }
  return <div className="flex flex-col gap-5 rounded-lg border p-4 md:p-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-lg font-semibold">{readable(role.name)}</h2><p className="text-sm text-muted-foreground">{role.description}</p></div>
      {!locked ? <Button disabled={!changed || mutation.isPending} onClick={() => void save()}>{mutation.isPending ? <Spinner data-icon="inline-start" /> : null}Save permissions</Button> : null}</div>
    {locked ? <Alert><ShieldCheck /><AlertTitle>System-managed role</AlertTitle><AlertDescription>SUPER_ADMIN always retains full access. Its permissions are read-only to prevent administrative lockout.</AlertDescription></Alert> : null}
    <div className="grid gap-6 xl:grid-cols-2">
      {groups.map(([group, items]) => <FieldSet key={group} disabled={locked}><FieldLegend>{readable(group)}</FieldLegend><FieldGroup data-slot="checkbox-group">
        {items.map((permission) => <Field key={permission.id} orientation="horizontal" data-disabled={locked}>
          <Checkbox id={`permission-${role.id}-${permission.id}`} disabled={locked} checked={selected.has(permission.id)} onCheckedChange={(checked) => setSelected((current) => { const next = new Set(current); if (checked) next.add(permission.id); else next.delete(permission.id); return next })} />
          <FieldContent><FieldLabel htmlFor={`permission-${role.id}-${permission.id}`}>{readable(permission.name)}</FieldLabel><FieldDescription>{permission.description}</FieldDescription></FieldContent>
        </Field>)}
      </FieldGroup></FieldSet>)}
    </div>
  </div>
}
