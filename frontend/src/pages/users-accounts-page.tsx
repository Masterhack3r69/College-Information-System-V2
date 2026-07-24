import { useState } from "react"
import {
  AlertTriangle,
  Check,
  Clipboard,
  Clock3,
  KeyRound,
  Laptop,
  LockKeyhole,
  MoreHorizontal,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Unlock,
  UserCheck,
  UserCog,
  UserPlus,
  UserX,
} from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth"
import type {
  AccountSession,
  AdminUser,
  FacultyAccountOption,
  IdentityConflict,
  Permission,
  ProvisionedUser,
  Role,
} from "@/lib/types"
import { ApiError } from "@/lib/api"
import {
  useAccountActivity,
  useAccountSessions,
  useAccountSummary,
  useAdminUsers,
  useAssignableRoles,
  useCreateAdminUser,
  useFacultyAccountOptions,
  useIdentityConflicts,
  usePermissions,
  useReconcileIdentity,
  useResetAdminUserPassword,
  useRevokeAccountSession,
  useRevokeAllAccountSessions,
  useRoles,
  useSetAdminUserStatus,
  useUnlockAdminUser,
  useUpdateAdminUser,
  useUpdateRolePermissions,
  type UserFilters,
} from "@/hooks/use-user-administration"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

const initialFilters: UserFilters = { page: 0, size: 20 }
const protectedPermissionNames = new Set(["ACCOUNT_MANAGE", "RBAC_MANAGE"])
function date(value?: string) {
  return value
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "Never"
}
function relative(value?: string) {
  if (!value) return "Never"
  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000)
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return date(value)
}
function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}
function typeTone(type: AdminUser["accountType"]) {
  return type === "STUDENT"
    ? "bg-info text-info-foreground"
    : type === "FACULTY"
      ? "bg-info text-info-foreground"
      : "bg-muted text-foreground"
}
function identityLabel(user: AdminUser) {
  if (user.accountType === "FACULTY")
    return `${user.employeeNumber ?? "Faculty"} · ${user.facultyName ?? "Linked identity"}`
  if (user.accountType === "STUDENT")
    return `${user.studentNumber ?? "Student"} · ${user.studentName ?? "Linked identity"}`
  return "System-managed account"
}

export function UsersAccountsPage() {
  const { user: current, can } = useAuth(),
    [filters, setFilters] = useState<UserFilters>(initialFilters),
    [section, setSection] = useState("directory"),
    [selectedId, setSelectedId] = useState<string>(),
    [editor, setEditor] = useState<AdminUser | "create" | null>(null),
    [credential, setCredential] = useState<ProvisionedUser | null>(null),
    [action, setAction] = useState<{
      kind: "reset" | "status" | "unlock" | "revoke-all" | "revoke-session"
      account: AdminUser
      session?: AccountSession
    } | null>(null),
    [actionReason, setActionReason] = useState("")
  const directory = useAdminUsers(filters),
    summary = useAccountSummary(),
    assignable = useAssignableRoles(),
    rbac = can("RBAC_MANAGE"),
    superAdmin = current?.roles.includes("SUPER_ADMIN") ?? false,
    roles = useRoles(rbac),
    permissions = usePermissions(rbac),
    conflicts = useIdentityConflicts(superAdmin),
    faculty = useFacultyAccountOptions(
      "",
      editor && editor !== "create" ? editor.facultyId : undefined
    )
  const selected = directory.data?.items.find((item) => item.id === selectedId)
  const sessions = useAccountSessions(selectedId),
    activity = useAccountActivity(selectedId)
  const create = useCreateAdminUser(),
    update = useUpdateAdminUser(),
    status = useSetAdminUserStatus(),
    reset = useResetAdminUserPassword(),
    unlock = useUnlockAdminUser(),
    revoke = useRevokeAccountSession(),
    revokeAll = useRevokeAllAccountSessions()
  const workspaceTabs = [
    "directory",
    ...(rbac ? ["roles"] : []),
    ...(superAdmin ? ["conflicts"] : []),
  ]
  function handleError(caught: unknown) {
    toast.error(
      caught instanceof ApiError
        ? caught.message
        : "The account operation could not be completed"
    )
  }
  async function submitEditor(values: EditorValues) {
    try {
      if (editor === "create") {
        const result = await create.mutateAsync(values)
        setCredential(result)
      } else if (editor) {
        await update.mutateAsync({ id: editor.id, request: values })
        toast.success("Account updated")
      }
      setEditor(null)
    } catch (caught) {
      handleError(caught)
    }
  }
  async function confirmAction() {
    if (!action || !actionReason.trim()) return
    try {
      if (action.kind === "reset") {
        setCredential(
          await reset.mutateAsync({
            id: action.account.id,
            version: action.account.version,
            auditReason: actionReason,
          })
        )
      } else if (action.kind === "status") {
        await status.mutateAsync({
          id: action.account.id,
          active: !action.account.active,
          version: action.account.version,
          auditReason: actionReason,
        })
        toast.success(
          `Account ${action.account.active ? "deactivated" : "activated"}`
        )
      } else if (action.kind === "unlock") {
        await unlock.mutateAsync({
          id: action.account.id,
          version: action.account.version,
          auditReason: actionReason,
        })
        toast.success("Account unlocked")
      } else if (action.kind === "revoke-all") {
        const count = await revokeAll.mutateAsync({
          userId: action.account.id,
          version: action.account.version,
          auditReason: actionReason,
        })
        toast.success(`${count} session${count === 1 ? "" : "s"} revoked`)
      } else if (action.session) {
        await revoke.mutateAsync({
          userId: action.account.id,
          sessionId: action.session.id,
          auditReason: actionReason,
        })
        toast.success("Session revoked")
      }
      setAction(null)
      setActionReason("")
    } catch (caught) {
      handleError(caught)
    }
  }
  const metrics = [
    {
      label: "Active",
      value: summary.data?.active ?? 0,
      detail: `of ${summary.data?.total ?? 0} total`,
      icon: UserCheck,
      tone: "text-success-foreground bg-success",
    },
    {
      label: "Inactive",
      value: summary.data?.inactive ?? 0,
      detail: "cannot sign in",
      icon: UserX,
      tone: "text-foreground bg-muted",
    },
    {
      label: "Locked",
      value: summary.data?.locked ?? 0,
      detail: "security holds",
      icon: LockKeyhole,
      tone: "text-destructive bg-destructive/10",
    },
    {
      label: "Must change",
      value: summary.data?.forcedChange ?? 0,
      detail: "temporary passwords",
      icon: KeyRound,
      tone: "text-warning-foreground bg-warning",
    },
  ]
  return (
    <div className="app-page min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[.16em] text-primary uppercase">
            Administration
          </p>
          <h1 className="app-page-title mt-1">
            Users & Accounts
          </h1>
          <p className="app-page-description max-w-2xl">
            Manage account identity, access, credentials, and active sessions
            from one directory.
          </p>
        </div>
        <Button
          onClick={() => setEditor("create")}
        >
          <UserPlus />
          Create account
        </Button>
      </div>
      <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <section
            key={metric.label}
            className="flex min-w-0 items-center gap-4 border bg-background p-4 shadow-sm"
          >
            <div
              className={`grid size-10 place-items-center rounded-md ${metric.tone}`}
            >
              <metric.icon className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-semibold tabular-nums">
                {metric.value}
              </p>
              <p className="text-sm font-medium">
                {metric.label}{" "}
                <span className="font-normal text-muted-foreground">
                  · {metric.detail}
                </span>
              </p>
            </div>
          </section>
        ))}
      </div>
      <Tabs value={section} onValueChange={setSection} className="mt-7 min-w-0">
        <TabsList>
          {workspaceTabs.map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="capitalize"
            >
              {tab === "conflicts"
                ? `Identity conflicts${conflicts.data?.length ? ` (${conflicts.data.length})` : ""}`
                : tab}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="directory" className="mt-0">
          <section className="border-x border-b bg-background">
            <div className="grid gap-3 border-b p-4 md:grid-cols-[minmax(240px,1fr)_180px_180px_180px]">
              <div className="relative">
                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search name, username, or email"
                  value={filters.search ?? ""}
                  onChange={(e) =>
                    setFilters((value) => ({
                      ...value,
                      search: e.target.value,
                      page: 0,
                    }))
                  }
                />
              </div>
              <FilterSelect
                value={filters.accountType ?? "all"}
                onChange={(value) =>
                  setFilters((state) => ({
                    ...state,
                    accountType: value === "all" ? undefined : value,
                    page: 0,
                  }))
                }
                placeholder="All types"
                items={[
                  ["all", "All account types"],
                  ["SYSTEM", "System"],
                  ["FACULTY", "Faculty"],
                  ["STUDENT", "Student"],
                ]}
              />
              <FilterSelect
                value={
                  filters.active === undefined ? "all" : String(filters.active)
                }
                onChange={(value) =>
                  setFilters((state) => ({
                    ...state,
                    active: value === "all" ? undefined : value === "true",
                    page: 0,
                  }))
                }
                placeholder="All statuses"
                items={[
                  ["all", "All statuses"],
                  ["true", "Active"],
                  ["false", "Inactive"],
                ]}
              />
              <FilterSelect
                value={
                  filters.locked
                    ? "locked"
                    : filters.forcedChange
                      ? "forced"
                      : "all"
                }
                onChange={(value) =>
                  setFilters((state) => ({
                    ...state,
                    locked: value === "locked" ? true : undefined,
                    forcedChange: value === "forced" ? true : undefined,
                    page: 0,
                  }))
                }
                placeholder="All security states"
                items={[
                  ["all", "All security states"],
                  ["locked", "Locked"],
                  ["forced", "Must change password"],
                ]}
              />
            </div>
            <div className="max-w-full overflow-x-auto">
              <Table className="min-w-[1020px]">
                <TableHeader>
                  <TableRow className="bg-surface">
                    <TableHead>Account</TableHead>
                    <TableHead>Type & domain link</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Security</TableHead>
                    <TableHead>Last login</TableHead>
                    <TableHead className="w-12">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {directory.isLoading ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-40 text-center text-muted-foreground"
                      >
                        Loading account directory…
                      </TableCell>
                    </TableRow>
                  ) : directory.data?.items.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-40 text-center text-muted-foreground"
                      >
                        No accounts match these filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    directory.data?.items.map((account) => (
                      <TableRow
                        key={account.id}
                        className="cursor-pointer"
                        onClick={() => setSelectedId(account.id)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="grid size-9 place-items-center rounded-full bg-info text-xs font-semibold text-info-foreground">
                              {initials(account.fullName)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">
                                  {account.fullName}
                                </p>
                                {account.protectedAccount ? (
                                  <ShieldCheck className="size-4 text-primary" />
                                ) : null}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {account.username} · {account.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={typeTone(account.accountType)}
                          >
                            {account.accountType}
                          </Badge>
                          <p className="mt-1 max-w-[260px] truncate text-xs text-muted-foreground">
                            {identityLabel(account)}
                          </p>
                          {account.identitySyncStatus !== "SYNCED" ? (
                            <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-warning-foreground">
                              <AlertTriangle className="size-3" />
                              {account.identitySyncStatus.replaceAll("_", " ")}
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <div className="flex max-w-[260px] flex-wrap gap-1">
                            {account.roles.slice(0, 2).map((role) => (
                              <Badge key={role.id} variant="outline">
                                {role.name.replaceAll("_", " ")}
                              </Badge>
                            ))}
                            {account.roles.length > 2 ? (
                              <Badge variant="outline">
                                +{account.roles.length - 2}
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <SecurityState account={account} />
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">
                            {relative(account.lastLoginAt)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {account.activeSessionCount} active session
                            {account.activeSessionCount === 1 ? "" : "s"}
                          </p>
                        </TableCell>
                        <TableCell onClick={(event) => event.stopPropagation()}>
                          <AccountMenu
                            account={account}
                            currentId={current?.id}
                            canMutate={!account.protectedAccount || superAdmin}
                            onEdit={() => setEditor(account)}
                            onAction={(kind) => {
                              setAction({ kind, account })
                              setActionReason("")
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
              <p className="text-muted-foreground">
                {directory.data?.totalElements ?? 0} accounts
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={filters.page === 0}
                  onClick={() =>
                    setFilters((state) => ({ ...state, page: state.page - 1 }))
                  }
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={
                    (directory.data?.page ?? 0) + 1 >=
                    (directory.data?.totalPages ?? 1)
                  }
                  onClick={() =>
                    setFilters((state) => ({ ...state, page: state.page + 1 }))
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          </section>
        </TabsContent>
        {rbac ? (
          <TabsContent value="roles" className="mt-5">
            <RolesWorkspace
              key={(roles.data ?? [])
                .map((role) => `${role.id}:${role.version}`)
                .join("|")}
              roles={roles.data ?? []}
              permissions={permissions.data ?? []}
            />
          </TabsContent>
        ) : null}
        {superAdmin ? (
          <TabsContent value="conflicts" className="mt-5">
            <ConflictsWorkspace conflicts={conflicts.data ?? []} />
          </TabsContent>
        ) : null}
      </Tabs>
      {editor ? (
        <AccountEditor
          key={editor === "create" ? "create" : editor.id}
          open
          account={editor !== "create" ? editor : undefined}
          roles={assignable.data ?? []}
          faculty={faculty.data?.items ?? []}
          onClose={() => setEditor(null)}
          onSubmit={submitEditor}
        />
      ) : null}
      {credential ? (
        <CredentialDialog
          key={`${credential.account.id}:${credential.expiresAt}`}
          credential={credential}
          onClose={() => setCredential(null)}
        />
      ) : null}
      <ActionDialog
        action={action}
        reason={actionReason}
        onReason={setActionReason}
        onClose={() => {
          setAction(null)
          setActionReason("")
        }}
        onConfirm={() => void confirmAction()}
      />
      <AccountDetail
        account={selected}
        open={!!selectedId}
        sessions={sessions.data ?? []}
        activity={activity.data ?? []}
        superAdmin={superAdmin}
        onClose={() => setSelectedId(undefined)}
        onEdit={() => selected && setEditor(selected)}
        onAction={(kind, session) => {
          if (selected) {
            setAction({ kind, account: selected, session })
            setActionReason("")
          }
        }}
      />
    </div>
  )
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  items,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  items: string[][]
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {items.map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
function SecurityState({ account }: { account: AdminUser }) {
  if (!account.active)
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Inactive
      </Badge>
    )
  if (account.locked)
    return (
      <Badge
        variant="outline"
        className="border-destructive/20 bg-destructive/10 text-destructive"
      >
        <LockKeyhole />
        Locked
      </Badge>
    )
  if (account.mustChangePassword)
    return (
      <div>
        <Badge
          variant="outline"
          className="border-warning-foreground/20 bg-warning text-warning-foreground"
        >
          <Clock3 />
          Must change
        </Badge>
        {account.temporaryPasswordExpiresAt ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Expires {date(account.temporaryPasswordExpiresAt)}
          </p>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">
            Grandfathered credential
          </p>
        )}
      </div>
    )
  return (
    <Badge
      variant="outline"
      className="border-success-foreground/20 bg-success text-success-foreground"
    >
      <Check />
      Secure
    </Badge>
  )
}
function AccountMenu({
  account,
  currentId,
  canMutate,
  onEdit,
  onAction,
}: {
  account: AdminUser
  currentId?: string
  canMutate: boolean
  onEdit: () => void
  onAction: (kind: "reset" | "status" | "unlock" | "revoke-all") => void
}) {
  const immutable = account.accountType === "STUDENT"
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          aria-label={`Actions for ${account.fullName}`}
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled={!canMutate || immutable} onSelect={onEdit}>
          <UserCog />
          Edit account
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!canMutate}
          onSelect={() => onAction("reset")}
        >
          <KeyRound />
          Reset password
        </DropdownMenuItem>
        {account.locked ? (
          <DropdownMenuItem
            disabled={!canMutate}
            onSelect={() => onAction("unlock")}
          >
            <Unlock />
            Unlock account
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          disabled={!canMutate || account.id === currentId}
          onSelect={() => onAction("status")}
        >
          {account.active ? <UserX /> : <UserCheck />}
          {account.active ? "Deactivate" : "Activate"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={!canMutate || account.activeSessionCount === 0}
          onSelect={() => onAction("revoke-all")}
          className="text-destructive"
        >
          <ShieldAlert />
          Revoke all sessions
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

type EditorValues = {
  username: string
  email: string
  fullName: string
  roleIds: string[]
  facultyId?: string
  version?: number
  auditReason: string
}
function AccountEditor({
  open,
  account,
  roles,
  faculty,
  onClose,
  onSubmit,
}: {
  open: boolean
  account?: AdminUser
  roles: Role[]
  faculty: FacultyAccountOption[]
  onClose: () => void
  onSubmit: (values: EditorValues) => void
}) {
  const [username, setUsername] = useState(account?.username ?? ""),
    [email, setEmail] = useState(account?.email ?? ""),
    [fullName, setFullName] = useState(account?.fullName ?? ""),
    [facultyId, setFacultyId] = useState<string>(
      account?.facultyId ?? "none"
    ),
    [roleIds, setRoleIds] = useState<string[]>(
      account?.roles.map((role) => role.id) ?? []
    ),
    [reason, setReason] = useState("")
  const linked = facultyId !== "none",
    selectedFaculty = faculty.find((item) => item.id === facultyId),
    effectiveEmail = linked
      ? (selectedFaculty?.email ?? account?.facultyEmail ?? email)
      : email,
    effectiveName = linked
      ? (selectedFaculty?.fullName ?? account?.facultyName ?? fullName)
      : fullName
  function toggle(id: string, checked: boolean) {
    setRoleIds((values) =>
      checked ? [...values, id] : values.filter((value) => value !== id)
    )
  }
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {account ? "Edit account" : "Create account"}
          </DialogTitle>
          <DialogDescription>
            {account
              ? "Update identity linkage and authorized roles."
              : "A 20-character temporary credential will be generated by the server."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 py-2 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="account-username">Username</Label>
            <Input
              id="account-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Account type</Label>
            <Select value={facultyId} onValueChange={setFacultyId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">System account</SelectItem>
                {faculty.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.employeeNumber} · {item.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-name">Full name</Label>
            <Input
              id="account-name"
              value={effectiveName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={linked}
            />
            {linked ? (
              <p className="text-xs text-muted-foreground">
                Read-only; synchronized from Faculty.
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-email">Email</Label>
            <Input
              id="account-email"
              type="email"
              value={effectiveEmail}
              onChange={(e) => setEmail(e.target.value)}
              disabled={linked}
            />
            {linked ? (
              <p className="text-xs text-muted-foreground">
                Read-only; synchronized from Faculty.
              </p>
            ) : null}
          </div>
          <div className="space-y-3 sm:col-span-2">
            <Label>Roles</Label>
            <div className="grid gap-2 border p-3 sm:grid-cols-2">
              {roles.map((role) => (
                <label
                  key={role.id}
                  className="flex items-center gap-3 py-1 text-sm"
                >
                  <Checkbox
                    checked={roleIds.includes(role.id)}
                    onCheckedChange={(checked) =>
                      toggle(role.id, checked === true)
                    }
                  />
                  <span>{role.name.replaceAll("_", " ")}</span>
                  {role.protectedRole ? (
                    <ShieldCheck className="ml-auto size-4 text-primary" />
                  ) : null}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="account-reason">Audit reason</Label>
            <Textarea
              id="account-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this account or its access being changed?"
              maxLength={500}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="bg-primary"
            disabled={
              !username ||
              !effectiveEmail ||
              !effectiveName ||
              roleIds.length === 0 ||
              !reason.trim()
            }
            onClick={() =>
              onSubmit({
                username,
                email: effectiveEmail,
                fullName: effectiveName,
                roleIds,
                facultyId: facultyId === "none" ? undefined : facultyId,
                version: account?.version,
                auditReason: reason.trim(),
              })
            }
          >
            {account ? "Save changes" : "Create account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CredentialDialog({
  credential,
  onClose,
}: {
  credential: ProvisionedUser | null
  onClose: () => void
}) {
  const [ack, setAck] = useState(false)
  return (
    <Dialog
      open={!!credential}
      onOpenChange={(open) => {
        if (!open && ack) onClose()
      }}
    >
      <DialogContent
        onEscapeKeyDown={(event) => !ack && event.preventDefault()}
        onInteractOutside={(event) => !ack && event.preventDefault()}
        className="sm:max-w-lg"
      >
        <DialogHeader>
          <div className="mb-2 grid size-11 place-items-center rounded-md bg-warning text-warning-foreground">
            <KeyRound />
          </div>
          <DialogTitle>Copy this temporary credential now</DialogTitle>
          <DialogDescription>
            It is returned once and cannot be retrieved later. Share it through
            an approved secure channel.
          </DialogDescription>
        </DialogHeader>
        {credential ? (
          <div className="space-y-4">
            <div className="border bg-surface p-4">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Username
              </p>
              <p className="mt-1 font-mono text-sm">
                {credential.account.username}
              </p>
              <Separator className="my-3" />
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Temporary password
              </p>
              <div className="mt-1 flex items-center justify-between gap-3">
                <code className="text-lg font-semibold break-all">
                  {credential.temporaryPassword}
                </code>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() =>
                    void navigator.clipboard
                      .writeText(credential.temporaryPassword)
                      .then(() => toast.success("Credential copied"))
                  }
                >
                  <Clipboard />
                </Button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Expires {date(credential.expiresAt)}
              </p>
            </div>
            <label className="flex items-start gap-3 text-sm">
              <Checkbox
                checked={ack}
                onCheckedChange={(value) => setAck(value === true)}
              />
              <span>
                I copied the credential and understand that it will not be shown
                again.
              </span>
            </label>
          </div>
        ) : null}
        <DialogFooter>
          <Button disabled={!ack} onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ActionDialog({
  action,
  reason,
  onReason,
  onClose,
  onConfirm,
}: {
  action: { kind: string; account: AdminUser; session?: AccountSession } | null
  reason: string
  onReason: (value: string) => void
  onClose: () => void
  onConfirm: () => void
}) {
  const labels: Record<string, [string, string]> = {
    reset: [
      "Reset password",
      "Generate a new 24-hour temporary credential and revoke all sessions.",
    ],
    status: [
      action?.account.active ? "Deactivate account" : "Activate account",
      action?.account.active
        ? "The account will be unable to sign in and all sessions will be revoked."
        : "The account will be allowed to sign in again.",
    ],
    unlock: [
      "Unlock account",
      "Clear the persisted login lock and failed-attempt window.",
    ],
    "revoke-all": [
      "Revoke all sessions",
      "Every access and refresh token for this account will stop working immediately.",
    ],
    "revoke-session": [
      "Revoke session",
      "This device will be signed out immediately.",
    ],
  }
  const copy = action ? labels[action.kind] : ["Confirm action", ""]
  return (
    <Dialog open={!!action} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy[0]}</DialogTitle>
          <DialogDescription>
            {copy[1]} Account: {action?.account.fullName}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="action-reason">Audit reason</Label>
          <Textarea
            id="action-reason"
            value={reason}
            onChange={(e) => onReason(e.target.value)}
            placeholder="Required for security audit history"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={
              action?.kind.includes("revoke") || action?.kind === "status"
                ? "destructive"
                : "default"
            }
            disabled={!reason.trim()}
            onClick={onConfirm}
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AccountDetail({
  account,
  open,
  sessions,
  activity,
  superAdmin,
  onClose,
  onEdit,
  onAction,
}: {
  account?: AdminUser
  open: boolean
  sessions: AccountSession[]
  activity: {
    id: string
    action: string
    createdAt: string
    ipAddress?: string
  }[]
  superAdmin: boolean
  onClose: () => void
  onEdit: () => void
  onAction: (
    kind: "reset" | "status" | "unlock" | "revoke-all" | "revoke-session",
    session?: AccountSession
  ) => void
}) {
  if (!account) return null
  const readOnly =
    (account.protectedAccount && !superAdmin) ||
    account.accountType === "STUDENT"
  return (
    <Sheet open={open} onOpenChange={(value) => !value && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <div className="flex items-start gap-3 pr-8">
            <div className="grid size-11 place-items-center rounded-full bg-info font-semibold text-info-foreground">
              {initials(account.fullName)}
            </div>
            <div>
              <SheetTitle className="flex items-center gap-2">
                {account.fullName}
                {account.protectedAccount ? (
                  <ShieldCheck className="size-4 text-primary" />
                ) : null}
              </SheetTitle>
              <SheetDescription>
                {account.username} · {account.email}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>
        {readOnly ? (
          <div className="mt-5 flex gap-3 border-l-4 border-info-foreground/30 bg-info p-3 text-sm text-info-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" />
            <span>
              {account.accountType === "STUDENT"
                ? "Student identity and role are system-managed."
                : "Only a Super Admin may change this protected account."}
            </span>
          </div>
        ) : null}
        <Tabs defaultValue="identity" className="mt-6">
          <TabsList>
            <TabsTrigger value="identity">Identity</TabsTrigger>
            <TabsTrigger value="access">Access</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>
          <TabsContent value="identity" className="space-y-5 pt-4">
            <Detail label="Account type" value={account.accountType} />
            <Detail label="Domain link" value={identityLabel(account)} />
            <Detail
              label="Identity synchronization"
              value={account.identitySyncStatus.replaceAll("_", " ")}
            />
            <Detail label="Created" value={date(account.createdAt)} />
            <Detail label="Last updated" value={date(account.updatedAt)} />
            {!readOnly ? (
              <Button variant="outline" className="w-full" onClick={onEdit}>
                <UserCog />
                Edit identity and roles
              </Button>
            ) : null}
          </TabsContent>
          <TabsContent value="access" className="space-y-5 pt-4">
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Roles
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {account.roles.map((role) => (
                  <Badge key={role.id} variant="outline">
                    {role.name.replaceAll("_", " ")}
                  </Badge>
                ))}
              </div>
            </div>
            <Separator />
            <SecurityState account={account} />
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                disabled={account.protectedAccount && !superAdmin}
                onClick={() => onAction("reset")}
              >
                <KeyRound />
                Reset password
              </Button>
              {account.locked ? (
                <Button
                  variant="outline"
                  disabled={account.protectedAccount && !superAdmin}
                  onClick={() => onAction("unlock")}
                >
                  <Unlock />
                  Unlock
                </Button>
              ) : (
                <Button
                  variant="outline"
                  disabled={account.protectedAccount && !superAdmin}
                  onClick={() => onAction("status")}
                >
                  {account.active ? <UserX /> : <UserCheck />}
                  {account.active ? "Deactivate" : "Activate"}
                </Button>
              )}
            </div>
          </TabsContent>
          <TabsContent value="sessions" className="pt-4">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {sessions.filter((item) => !item.revokedAt).length} active
                sessions
              </p>
              <Button
                size="sm"
                variant="outline"
                disabled={
                  (account.protectedAccount && !superAdmin) ||
                  account.activeSessionCount === 0
                }
                onClick={() => onAction("revoke-all")}
              >
                Revoke all
              </Button>
            </div>
            <div className="divide-y border">
              {sessions.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  No session history.
                </p>
              ) : (
                sessions.map((session) => (
                  <div key={session.id} className="flex items-start gap-3 p-4">
                    <Laptop className="mt-1 size-5 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">
                          {session.current ? "Current session" : "Web session"}
                        </p>
                        {session.current ? <Badge>Current</Badge> : null}
                        {session.revokedAt ? (
                          <Badge variant="outline">Revoked</Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {session.userAgent ?? "Unknown device"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Last used {date(session.lastUsedAt)} ·{" "}
                        {session.lastIp ?? "IP unavailable"}
                      </p>
                    </div>
                    {!session.revokedAt ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        disabled={account.protectedAccount && !superAdmin}
                        onClick={() => onAction("revoke-session", session)}
                      >
                        Revoke
                      </Button>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </TabsContent>
          <TabsContent value="activity" className="pt-4">
            <div className="divide-y border">
              {activity.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  No recorded security activity.
                </p>
              ) : (
                activity.map((item) => (
                  <div key={item.id} className="p-4">
                    <p className="text-sm font-medium">
                      {item.action.replaceAll("_", " ")}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {date(item.createdAt)}
                      {item.ipAddress ? ` · ${item.ipAddress}` : ""}
                    </p>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  )
}

function RolesWorkspace({
  roles,
  permissions,
}: {
  roles: Role[]
  permissions: Permission[]
}) {
  const mutate = useUpdateRolePermissions(),
    [selectedId, setSelectedId] = useState<string | undefined>(roles[0]?.id),
    [ids, setIds] = useState<string[]>(
      roles[0]?.permissions.map((permission) => permission.id) ?? []
    ),
    [reason, setReason] = useState("")
  const selected = roles.find((role) => role.id === selectedId) ?? roles[0]
  function selectRole(role: Role) {
    setSelectedId(role.id)
    setIds(role.permissions.map((permission) => permission.id))
    setReason("")
  }
  function toggle(id: string, checked: boolean) {
    setIds((values) =>
      checked ? [...values, id] : values.filter((value) => value !== id)
    )
  }
  return (
    <section className="grid min-h-[520px] border bg-background lg:grid-cols-[280px_1fr]">
      <aside className="border-b p-3 lg:border-r lg:border-b-0">
        <p className="px-2 pb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Migration-managed roles
        </p>
        {roles.map((role) => (
          <button
            key={role.id}
            onClick={() => selectRole(role)}
            className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${selected?.id === role.id ? "bg-info font-medium text-primary" : "hover:bg-surface"}`}
          >
            <span>{role.name.replaceAll("_", " ")}</span>
            {role.protectedRole ? <ShieldCheck className="size-4" /> : null}
          </button>
        ))}
      </aside>
      <div className="p-5 sm:p-7">
        {selected ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">
                  {selected.name.replaceAll("_", " ")}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selected.description}
                </p>
              </div>
              {selected.protectedRole ? (
                <Badge className="bg-info text-info-foreground">
                  <ShieldCheck />
                  System managed
                </Badge>
              ) : null}
            </div>
            <div className="mt-6 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {permissions.map((permission) => {
                const locked =
                  selected.protectedRole ||
                  protectedPermissionNames.has(permission.name)
                return (
                  <label
                    key={permission.id}
                    className={`flex items-start gap-3 border p-3 text-sm ${locked ? "bg-surface text-muted-foreground" : ""}`}
                  >
                    <Checkbox
                      checked={ids.includes(permission.id)}
                      disabled={locked}
                      onCheckedChange={(checked) =>
                        toggle(permission.id, checked === true)
                      }
                    />
                    <span>
                      <span className="font-medium">{permission.name}</span>
                      <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                        {permission.description}
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
            <div className="mt-6 space-y-2">
              <Label htmlFor="role-reason">Audit reason</Label>
              <Textarea
                id="role-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={selected.protectedRole}
                placeholder="Why is this permission assignment changing?"
              />
            </div>
            <Button
              className="mt-4"
              disabled={
                selected.protectedRole || !reason.trim() || mutate.isPending
              }
              onClick={() =>
                void mutate
                  .mutateAsync({
                    id: selected.id,
                    permissionIds: ids,
                    version: selected.version,
                    auditReason: reason,
                  })
                  .then(() => {
                    toast.success("Role permissions updated")
                    setReason("")
                  })
                  .catch((error) =>
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : "Unable to update role"
                    )
                  )
              }
            >
              Save permissions
            </Button>
          </>
        ) : null}
      </div>
    </section>
  )
}

function ConflictsWorkspace({ conflicts }: { conflicts: IdentityConflict[] }) {
  const reconcile = useReconcileIdentity(),
    [target, setTarget] = useState<IdentityConflict>(),
    [reason, setReason] = useState("")
  async function submit() {
    if (!target || !reason.trim()) return
    try {
      await reconcile.mutateAsync({
        id: target.userId,
        version: target.version,
        auditReason: reason,
      })
      toast.success("Identity reconciled")
      setTarget(undefined)
      setReason("")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to reconcile identity"
      )
    }
  }
  return (
    <section className="border bg-background">
      <div className="border-b p-5">
        <h2 className="text-lg font-semibold">Preserved identity mismatches</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Review legacy account values against authoritative faculty and student
          records.
        </p>
      </div>
      {conflicts.length === 0 ? (
        <div className="grid place-items-center p-14 text-center">
          <ShieldCheck className="size-9 text-success-foreground" />
          <p className="mt-3 font-medium">
            All linked identities are synchronized
          </p>
        </div>
      ) : (
        <div className="max-w-full overflow-x-auto">
          <Table className="min-w-[850px]">
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Current identity</TableHead>
                <TableHead>Authoritative identity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {conflicts.map((conflict) => (
                <TableRow key={conflict.userId}>
                  <TableCell>
                    <p className="font-medium">{conflict.username}</p>
                    <Badge variant="outline">{conflict.accountType}</Badge>
                  </TableCell>
                  <TableCell>
                    <p>{conflict.accountName}</p>
                    <p className="text-xs text-muted-foreground">
                      {conflict.accountEmail}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p>{conflict.authoritativeName}</p>
                    <p className="text-xs text-muted-foreground">
                      {conflict.authoritativeEmail}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        conflict.status === "EMAIL_CONFLICT"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-warning text-warning-foreground"
                      }
                    >
                      {conflict.status.replaceAll("_", " ")}
                    </Badge>
                    {conflict.conflictingUserId ? (
                      <p className="mt-1 text-xs text-destructive">
                        Resolve account {conflict.conflictingUserId.slice(0, 8)}{" "}
                        first
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!!conflict.conflictingUserId}
                      onClick={() => setTarget(conflict)}
                    >
                      <RefreshCw />
                      Reconcile
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Dialog
        open={!!target}
        onOpenChange={(open) => !open && setTarget(undefined)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reconcile authoritative identity</DialogTitle>
            <DialogDescription>
              This copies the linked domain name and email into{" "}
              {target?.username}. The action is audited.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Audit reason</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for reconciling this legacy mismatch"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(undefined)}>
              Cancel
            </Button>
            <Button disabled={!reason.trim()} onClick={() => void submit()}>
              Reconcile identity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
