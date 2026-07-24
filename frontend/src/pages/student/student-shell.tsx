import { Link, Outlet, useLocation, useNavigate } from "react-router-dom"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { useAuth } from "@/lib/auth"
import {
  Bell,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  FileText,
  GraduationCap,
  KeyRound,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react"

const items = [
  { to: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/student/enrollment", label: "Enrollment", icon: GraduationCap },
  { to: "/student/schedule", label: "Schedule", icon: CalendarDays },
  { to: "/student/academics", label: "Academics", icon: BookOpen },
  { to: "/student/finance", label: "Finance", icon: WalletCards },
  { to: "/student/announcements", label: "Announcements", icon: Bell },
  { to: "/student/documents", label: "Documents", icon: FileText },
]
export function StudentShell() {
  const { user, logout, switchPortal } = useAuth(),
    location = useLocation(),
    navigate = useNavigate()
  const initials = user?.fullName
    .split(" ")
    .map((x) => x[0])
    .slice(0, 2)
    .join("")
  return (
    <SidebarProvider
      style={{ "--sidebar-width": "15rem" } as React.CSSProperties}
    >
      <Sidebar collapsible="icon" className="border-r bg-sidebar">
        <SidebarHeader className="h-18 justify-center border-b px-4">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-xs">
              <GraduationCap className="size-5" />
            </div>
            <div className="group-data-[collapsible=icon]:hidden">
              <p className="text-sm font-semibold text-foreground">
                College CIS
              </p>
              <p className="text-xs text-muted-foreground">Student portal</p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="py-3">
            <SidebarMenu>
              {items.map((x) => (
                <SidebarMenuItem key={x.to}>
                  <SidebarMenuButton
                    asChild
                    tooltip={x.label}
                    isActive={location.pathname.startsWith(x.to)}
                    className="text-sm"
                  >
                    <Link to={x.to}>
                      <x.icon />
                      <span>{x.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t p-3">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Profile & Security"
                isActive={location.pathname.startsWith("/student/profile")}
              >
                <Link to="/student/profile">
                  <UserRound />
                  <span>Profile & Security</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Account Security"
              >
                <Link to="/account/security">
                  <KeyRound />
                  <span>Account Security</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => void logout()}
                tooltip="Sign out"
              >
                <LogOut />
                <span>Sign out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset className="bg-background">
        <header className="sticky top-0 z-20 flex h-18 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm md:px-8">
          <div className="flex items-center gap-3">
            <SidebarTrigger />
            <CalendarDays className="size-4 text-primary" />
            <span className="hidden text-sm font-medium sm:inline">
              First Semester · AY 2026–2027
            </span>
          </div>
          <div className="flex items-center gap-4">
            {(user?.availablePortals.length ?? 0) > 1 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="hidden sm:flex">
                    <UsersRound />
                    Student portal
                    <ChevronDown />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuGroup>
                    {user?.availablePortals.map((portal) => (
                      <DropdownMenuItem
                        key={portal}
                        onSelect={() => navigate(switchPortal(portal))}
                      >
                        {portal === "ADMIN" ? (
                          <ShieldCheck />
                        ) : portal === "FACULTY" ? (
                          <UsersRound />
                        ) : (
                          <ClipboardList />
                        )}
                        {portal[0] + portal.slice(1).toLowerCase()} Portal
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
            <Avatar className="size-9">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium md:inline">
              {user?.fullName}
            </span>
          </div>
        </header>
        <main className="min-h-[calc(100vh-4.5rem)]">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
