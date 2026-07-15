import { lazy, Suspense } from "react"
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom"
import { BookOpenCheck, CalendarDays, ClipboardList, FileText, GraduationCap, Home, LogOut, Settings, ShieldCheck, UserRoundCog, Users, WalletCards } from "lucide-react"
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
import { GradesPage } from "@/pages/grades-page"
import { GradingSetupPage } from "@/pages/setup/grading-setup-page"
import { UsersAccountsPage } from "@/pages/users-accounts-page"
import { GradeCorrectionsAdminPage } from "@/pages/grade-corrections-admin-page"
import { FacultyShell } from "@/pages/faculty/faculty-shell"

const FacultyDashboardPage=lazy(()=>import("@/pages/faculty/faculty-dashboard-page"))
const FacultyClassesPage=lazy(()=>import("@/pages/faculty/faculty-classes-page"))
const FacultyClassWorkspace=lazy(()=>import("@/pages/faculty/faculty-class-workspace"))
const FacultySchedulePage=lazy(()=>import("@/pages/faculty/faculty-schedule-page"))
const FacultyAdvisingPage=lazy(()=>import("@/pages/faculty/faculty-advising-page"))
const FacultyProfilePage=lazy(()=>import("@/pages/faculty/faculty-profile-page"))
const FacultyCorrectionsPage=lazy(()=>import("@/pages/faculty/faculty-corrections-page"))
const FacultySectionIndex=lazy(()=>import("@/pages/faculty/faculty-section-index"))
const StudentShell=lazy(()=>import("@/pages/student/student-shell").then(m=>({default:m.StudentShell})))
const StudentDashboardPage=lazy(()=>import("@/pages/student/student-dashboard-page"))
const StudentEnrollmentPage=lazy(()=>import("@/pages/student/student-enrollment-page"))
const StudentSchedulePage=lazy(()=>import("@/pages/student/student-schedule-page"))
const StudentAcademicsPage=lazy(()=>import("@/pages/student/student-academics-page"))
const StudentFinancePage=lazy(()=>import("@/pages/student/student-finance-page"))
const FinancePage=lazy(()=>import("@/pages/finance-page").then(module=>({default:module.FinancePage})))
const StudentAnnouncementsPage=lazy(()=>import("@/pages/student/student-announcements-page"))
const StudentDocumentsPage=lazy(()=>import("@/pages/student/student-documents-page"))
const StudentProfilePage=lazy(()=>import("@/pages/student/student-profile-page"))
const StudentPasswordPage=lazy(()=>import("@/pages/student/student-password-page"))
const StudentPortalAdminPage=lazy(()=>import("@/pages/student-portal-admin-page").then(m=>({default:m.StudentPortalAdminPage})))

const nav = [
  { to: "/admin", label: "Overview", icon: Home }, { to: "/admin/students", label: "Students", icon: Users, permission: "STUDENT_VIEW" },
  { to: "/admin/enrollment", label: "Enrollment", icon: ClipboardList, permission: "ENROLLMENT_VIEW" },
  { to: "/admin/schedules", label: "Schedules", icon: CalendarDays, permission: "SCHEDULE_VIEW" },
  { to: "/admin/finance", label: "Finance", icon: WalletCards, permission: "FINANCE_VIEW" },
  { to: "/admin/grades", label: "Grades", icon: BookOpenCheck, anyPermissions: ["GRADE_ENCODE", "GRADE_REVIEW", "GRADE_LOCK", "GRADE_APPROVE"] }, { to: "/admin/reports", label: "Reports", icon: FileText, permission: "REPORT_GENERATE" },
  { to: "/admin/setup", label: "Academic Setup", icon: Settings, permission: "ACADEMIC_SETUP_VIEW" },
  { to: "/admin/administration/users", label: "Users & Accounts", icon: UserRoundCog, permission: "USER_MANAGE" },
  { to: "/admin/grade-corrections", label: "Grade Corrections", icon: BookOpenCheck, anyPermissions: ["GRADE_REVIEW", "GRADE_LOCK"] },
  { to: "/admin/student-portal", label: "Student Portal", icon: GraduationCap, permission: "STUDENT_PORTAL_ADMIN" },
]

function Guard({ permission, anyPermissions }: { permission?: string; anyPermissions?: string[] }) { const { user, ready, can } = useAuth(); if (!ready) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading workspace…</div>; if (!user) return <Navigate to="/login" replace />; if (permission && !can(permission)) return <Forbidden />; if (anyPermissions && !anyPermissions.some(can)) return <Forbidden />; return <Outlet /> }
function Forbidden() { return <div className="grid min-h-[70vh] place-items-center text-center"><div><ShieldCheck className="mx-auto mb-4 size-10 text-muted-foreground"/><h1 className="text-2xl font-semibold">Access restricted</h1><p className="mt-2 text-muted-foreground">Your account does not have permission to view this workspace.</p></div></div> }

function AppShell() {
  const { user, logout, can } = useAuth(); const location = useLocation()
  return <SidebarProvider style={{ "--sidebar-width": "13.75rem" } as React.CSSProperties}>
    <Sidebar collapsible="icon" className="border-r bg-slate-50/80">
      <SidebarHeader className="h-[76px] justify-center border-b px-4"><div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-md bg-[#0d2b4d] text-white"><GraduationCap className="size-5"/></div><div className="group-data-[collapsible=icon]:hidden"><p className="text-sm font-semibold text-[#0b1f3a]">College SIS</p><p className="text-xs text-muted-foreground">Registrar portal</p></div></div></SidebarHeader>
      <SidebarContent><SidebarGroup className="pt-5"><SidebarMenu>{nav.filter(x => (!x.permission || can(x.permission)) && (!x.anyPermissions || x.anyPermissions.some(can))).map(item => <SidebarMenuItem key={item.to}><SidebarMenuButton asChild isActive={item.to === "/admin" ? location.pathname === "/admin" : location.pathname.startsWith(item.to)} tooltip={item.label}><Link to={item.to}><item.icon/><span>{item.label}</span></Link></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarGroup></SidebarContent>
      <SidebarFooter className="border-t p-3"><SidebarMenu><SidebarMenuItem><SidebarMenuButton tooltip="Settings"><Settings/><span>Settings</span></SidebarMenuButton></SidebarMenuItem><SidebarMenuItem><SidebarMenuButton onClick={() => void logout()} tooltip="Sign out"><LogOut/><span>Sign out</span></SidebarMenuButton></SidebarMenuItem></SidebarMenu></SidebarFooter>
    </Sidebar>
    <SidebarInset><header className="flex h-[76px] items-center justify-between border-b bg-white px-4 md:px-7"><div className="flex items-center gap-3"><SidebarTrigger/><div className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex"><CalendarDays className="size-4"/><span>Current academic term</span></div></div><div className="flex items-center gap-3"><Avatar className="size-9"><AvatarFallback>{user?.fullName.split(" ").map(x => x[0]).slice(0,2).join("")}</AvatarFallback></Avatar><div className="hidden sm:block"><p className="text-sm font-medium">{user?.fullName}</p><p className="text-xs text-muted-foreground">{user?.roles[0]?.replaceAll("_", " ")}</p></div></div></header><main className="min-h-[calc(100vh-76px)] bg-white"><Outlet/></main></SidebarInset>
  </SidebarProvider>
}

function PortalHome(){const {user,portalHome}=useAuth();return user?<Navigate to={portalHome()} replace/>:<Navigate to="/login" replace/>}
function AdminGuard(){const {user,ready}=useAuth();if(!ready)return <div className="grid min-h-screen place-items-center">Loading workspace…</div>;if(!user)return <Navigate to="/login" replace/>;if(!user.availablePortals.includes("ADMIN"))return <Forbidden/>;return <Outlet/>}
function FacultyGuard(){const {user,ready,can}=useAuth();if(!ready)return <div className="grid min-h-screen place-items-center">Loading workspace…</div>;if(!user)return <Navigate to="/login" replace/>;if(!can("FACULTY_PORTAL_ACCESS")||!user.facultyId)return <Forbidden/>;return <Outlet/>}
function StudentGuard(){const {user,ready,can}=useAuth(),location=useLocation();if(!ready)return <div className="grid min-h-screen place-items-center">Loading workspace…</div>;if(!user)return <Navigate to="/login" replace/>;if(!can("STUDENT_PORTAL_ACCESS")||!user.studentId)return <Forbidden/>;if(user.passwordChangeRequired&&location.pathname!=="/student/account/password")return <Navigate to="/student/account/password" replace/>;return <Outlet/>}
function LazyOutlet(){return <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading workspace…</div>}><Outlet/></Suspense>}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route index element={<PortalHome/>}/>
      <Route element={<AdminGuard />}>
        <Route path="admin" element={<AppShell />}>
          <Route index element={<Navigate to="enrollment" replace />} />
          
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
            <Route path="finance" element={<Suspense fallback={<div className="p-8">Loading finance…</div>}><FinancePage /></Suspense>} />
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

          <Route element={<Guard permission="USER_MANAGE" />}>
            <Route path="administration/users" element={<UsersAccountsPage />} />
          </Route>
          <Route element={<Guard anyPermissions={["GRADE_REVIEW","GRADE_LOCK"]}/>}><Route path="grade-corrections" element={<GradeCorrectionsAdminPage/>}/></Route>
          <Route element={<Guard permission="STUDENT_PORTAL_ADMIN"/>}><Route path="student-portal" element={<Suspense fallback={<div className="p-8">Loading…</div>}><StudentPortalAdminPage/></Suspense>}/></Route>

          <Route path="*" element={
            <div className="p-8">
              <h1 className="text-2xl font-semibold">Coming in the next workflow slice</h1>
              <p className="mt-2 text-muted-foreground">This navigation area is permission-aware and ready for its dedicated module.</p>
            </div>
          } />
        </Route>
      </Route>
      <Route element={<FacultyGuard/>}><Route path="faculty" element={<FacultyShell/>}><Route element={<LazyOutlet/>}><Route index element={<Navigate to="dashboard" replace/>}/><Route path="dashboard" element={<FacultyDashboardPage/>}/><Route path="classes" element={<FacultyClassesPage/>}/><Route path="classes/:id" element={<FacultyClassWorkspace/>}/><Route path="schedule" element={<FacultySchedulePage/>}/><Route path="attendance" element={<FacultySectionIndex/>}/><Route path="grades" element={<GradesPage/>}/><Route path="grade-corrections" element={<FacultyCorrectionsPage/>}/><Route path="content" element={<FacultySectionIndex/>}/><Route path="reports" element={<FacultySectionIndex/>}/><Route path="advising" element={<FacultyAdvisingPage/>}/><Route path="profile" element={<FacultyProfilePage/>}/></Route></Route></Route>
      <Route element={<StudentGuard/>}><Route path="student/account/password" element={<Suspense fallback={<div className="p-8">Loading…</div>}><StudentPasswordPage/></Suspense>}/><Route path="student" element={<Suspense fallback={<div className="p-8">Loading…</div>}><StudentShell/></Suspense>}><Route element={<LazyOutlet/>}><Route index element={<Navigate to="dashboard" replace/>}/><Route path="dashboard" element={<StudentDashboardPage/>}/><Route path="enrollment" element={<StudentEnrollmentPage/>}/><Route path="schedule" element={<StudentSchedulePage/>}/><Route path="academics" element={<StudentAcademicsPage/>}/><Route path="finance" element={<StudentFinancePage/>}/><Route path="announcements" element={<StudentAnnouncementsPage/>}/><Route path="documents" element={<StudentDocumentsPage/>}/><Route path="profile" element={<StudentProfilePage/>}/></Route></Route></Route>
      {['students','enrollment','schedules','finance','grades','reports','setup','administration'].map(path=><Route key={path} path={`${path}/*`} element={<Navigate to={`/admin/${path}`} replace/>}/>)}
    </Routes>
  )
}
