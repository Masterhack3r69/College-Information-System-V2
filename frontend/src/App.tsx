import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom"
import { BookOpenCheck, CalendarDays, ClipboardList, FileText, GraduationCap, Home, LogOut, Settings, ShieldCheck, Users, WalletCards } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { LoginPage } from "@/pages/login-page"
import { EnrollmentPage } from "@/pages/enrollment-page"
import { SchedulesPage } from "@/pages/schedules-page"
import { StudentsPage, StudentDetailPage } from "@/pages/students-page"
import { SetupLayout } from "@/pages/setup/setup-layout"
import { DepartmentsTab } from "@/pages/setup/departments-tab"
import { ProgramsTab } from "@/pages/setup/programs-tab"
import { CoursesTab } from "@/pages/setup/courses-tab"
import { FacultyTab } from "@/pages/setup/faculty-tab"
import { RoomsTab } from "@/pages/setup/rooms-tab"
import { SchoolYearsTab } from "@/pages/setup/school-years-tab"
import { SemestersTab } from "@/pages/setup/semesters-tab"
import { SectionsTab } from "@/pages/setup/sections-tab"
import { CurriculaTab } from "@/pages/setup/curricula-tab"
import { CurriculumBuilder } from "@/pages/setup/curriculum-builder"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Link } from "react-router-dom"
import { FinancePage } from "@/pages/finance-page"
import { GradesPage } from "@/pages/grades-page"
import { GradingSetupPage } from "@/pages/setup/grading-setup-page"

const nav = [
  { to: "/", label: "Overview", icon: Home }, { to: "/students", label: "Students", icon: Users, permission: "STUDENT_VIEW" },
  { to: "/enrollment", label: "Enrollment", icon: ClipboardList, permission: "ENROLLMENT_VIEW" },
  { to: "/schedules", label: "Schedules", icon: CalendarDays, permission: "SCHEDULE_VIEW" },
  { to: "/finance", label: "Finance", icon: WalletCards, permission: "FINANCE_VIEW" },
  { to: "/grades", label: "Grades", icon: BookOpenCheck, anyPermissions: ["GRADE_ENCODE", "GRADE_REVIEW", "GRADE_LOCK", "GRADE_APPROVE"] }, { to: "/reports", label: "Reports", icon: FileText, permission: "REPORT_GENERATE" },
  { to: "/setup", label: "Academic Setup", icon: Settings, permission: "ACADEMIC_SETUP_VIEW" },
]

function Guard({ permission, anyPermissions }: { permission?: string; anyPermissions?: string[] }) { const { user, ready, can } = useAuth(); if (!ready) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading workspace…</div>; if (!user) return <Navigate to="/login" replace />; if (permission && !can(permission)) return <Forbidden />; if (anyPermissions && !anyPermissions.some(can)) return <Forbidden />; return <Outlet /> }
function Forbidden() { return <div className="grid min-h-[70vh] place-items-center text-center"><div><ShieldCheck className="mx-auto mb-4 size-10 text-muted-foreground"/><h1 className="text-2xl font-semibold">Access restricted</h1><p className="mt-2 text-muted-foreground">Your account does not have permission to view this workspace.</p></div></div> }

function AppShell() {
  const { user, logout, can } = useAuth(); const location = useLocation()
  return <SidebarProvider style={{ "--sidebar-width": "13.75rem" } as React.CSSProperties}>
    <Sidebar collapsible="icon" className="border-r bg-slate-50/80">
      <SidebarHeader className="h-[76px] justify-center border-b px-4"><div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-md bg-[#0d2b4d] text-white"><GraduationCap className="size-5"/></div><div className="group-data-[collapsible=icon]:hidden"><p className="text-sm font-semibold text-[#0b1f3a]">College SIS</p><p className="text-xs text-muted-foreground">Registrar portal</p></div></div></SidebarHeader>
      <SidebarContent><SidebarGroup className="pt-5"><SidebarMenu>{nav.filter(x => (!x.permission || can(x.permission)) && (!x.anyPermissions || x.anyPermissions.some(can))).map(item => <SidebarMenuItem key={item.to}><SidebarMenuButton asChild isActive={item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to)} tooltip={item.label}><Link to={item.to}><item.icon/><span>{item.label}</span></Link></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarGroup></SidebarContent>
      <SidebarFooter className="border-t p-3"><SidebarMenu><SidebarMenuItem><SidebarMenuButton tooltip="Settings"><Settings/><span>Settings</span></SidebarMenuButton></SidebarMenuItem><SidebarMenuItem><SidebarMenuButton onClick={() => void logout()} tooltip="Sign out"><LogOut/><span>Sign out</span></SidebarMenuButton></SidebarMenuItem></SidebarMenu></SidebarFooter>
    </Sidebar>
    <SidebarInset><header className="flex h-[76px] items-center justify-between border-b bg-white px-4 md:px-7"><div className="flex items-center gap-3"><SidebarTrigger/><div className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex"><CalendarDays className="size-4"/><span>Current academic term</span></div></div><div className="flex items-center gap-3"><Avatar className="size-9"><AvatarFallback>{user?.fullName.split(" ").map(x => x[0]).slice(0,2).join("")}</AvatarFallback></Avatar><div className="hidden sm:block"><p className="text-sm font-medium">{user?.fullName}</p><p className="text-xs text-muted-foreground">{user?.roles[0]?.replaceAll("_", " ")}</p></div></div></header><main className="min-h-[calc(100vh-76px)] bg-white"><Outlet/></main></SidebarInset>
  </SidebarProvider>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<Guard />}>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/enrollment" replace />} />
          
          <Route element={<Guard permission="STUDENT_VIEW" />} >
            <Route path="students" element={<StudentsPage />} />
            <Route path="students/:id" element={<StudentDetailPage />} />
          </Route>
          
          <Route element={<Guard permission="ENROLLMENT_VIEW" />} >
            <Route path="enrollment" element={<EnrollmentPage />} />
          </Route>

          <Route element={<Guard permission="SCHEDULE_VIEW" />}>
            <Route path="schedules" element={<SchedulesPage />} />
          </Route>

          <Route element={<Guard permission="FINANCE_VIEW" />}>
            <Route path="finance" element={<FinancePage />} />
          </Route>

          <Route element={<Guard anyPermissions={["GRADE_ENCODE", "GRADE_REVIEW", "GRADE_LOCK", "GRADE_APPROVE"]} />}>
            <Route path="grades" element={<GradesPage />} />
          </Route>

          <Route element={<Guard permission="ACADEMIC_SETUP_VIEW" />} >
            <Route path="setup" element={<SetupLayout />}>
              <Route index element={<Navigate to="departments" replace />} />
              <Route path="departments" element={<DepartmentsTab />} />
              <Route path="programs" element={<ProgramsTab />} />
              <Route path="courses" element={<CoursesTab />} />
              <Route path="faculty" element={<FacultyTab />} />
              <Route path="rooms" element={<RoomsTab />} />
              <Route path="school-years" element={<SchoolYearsTab />} />
              <Route path="semesters" element={<SemestersTab />} />
              <Route path="sections" element={<SectionsTab />} />
              <Route path="curricula" element={<CurriculaTab />} />
              <Route path="curricula/:id" element={<CurriculumBuilder />} />
              <Route path="grading" element={<GradingSetupPage />} />
            </Route>
          </Route>

          <Route path="*" element={
            <div className="p-8">
              <h1 className="text-2xl font-semibold">Coming in the next workflow slice</h1>
              <p className="mt-2 text-muted-foreground">This navigation area is permission-aware and ready for its dedicated module.</p>
            </div>
          } />
        </Route>
      </Route>
    </Routes>
  )
}
