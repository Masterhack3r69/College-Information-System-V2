import { Link, Outlet, useLocation, useNavigate } from "react-router-dom"
import { BookOpen, CalendarDays, ChartNoAxesColumnIncreasing, ChevronDown, ClipboardCheck, Folder, GraduationCap, LayoutDashboard, LogOut, ShieldCheck, UserRound, UsersRound } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarRail, SidebarTrigger } from "@/components/ui/sidebar"
import { useFacultyDashboard } from "@/hooks/use-faculty-portal"

const items=[
  {to:"/faculty/dashboard",label:"Dashboard",icon:LayoutDashboard},
  {to:"/faculty/classes",label:"My Classes",icon:BookOpen},
  {to:"/faculty/schedule",label:"Schedule",icon:CalendarDays},
  {to:"/faculty/attendance",label:"Attendance",icon:ClipboardCheck,permission:"ATTENDANCE_MANAGE"},
  {to:"/faculty/grades",label:"Grades",icon:GraduationCap,permission:"GRADE_ENCODE"},
  {to:"/faculty/content",label:"Class Content",icon:Folder,permission:"CLASS_CONTENT_MANAGE"},
  {to:"/faculty/reports",label:"Reports",icon:ChartNoAxesColumnIncreasing,permission:"FACULTY_REPORT_VIEW"},
  {to:"/faculty/advising",label:"Advising",icon:UsersRound,permission:"ADVISING_VIEW"},
]

export function FacultyShell(){
  const {user,can,logout,switchPortal}=useAuth(),location=useLocation(),navigate=useNavigate()
  const dashboard=useFacultyDashboard()
  const initials=user?.fullName.split(" ").map(x=>x[0]).slice(0,2).join("")
  return <SidebarProvider style={{"--sidebar-width":"17.25rem"} as React.CSSProperties}>
    <Sidebar collapsible="icon" className="border-r border-[#d6e0eb] bg-[#f6f9fc]">
      <SidebarHeader className="h-[104px] justify-center border-b border-[#d6e0eb] px-5"><div className="flex items-center gap-3"><div className="grid size-11 place-items-center rounded-md border-2 border-[#0c3872] text-[#0c3872]"><GraduationCap/></div><div className="group-data-[collapsible=icon]:hidden"><p className="font-serif text-xl font-semibold text-[#092f66]">College CIS</p><p className="text-sm text-slate-600">Faculty Portal</p></div></div></SidebarHeader>
      <SidebarContent><SidebarGroup className="px-2 pt-4"><SidebarMenu>{items.filter(x=>(!x.permission||can(x.permission))&&(x.label!=="Advising"||dashboard.data?.hasAdvising)).map(x=><SidebarMenuItem key={x.to}><SidebarMenuButton asChild tooltip={x.label} isActive={location.pathname.startsWith(x.to)} className="h-12 rounded-md text-[15px] text-slate-700 data-[active=true]:bg-[#073b7a] data-[active=true]:text-white"><Link to={x.to}><x.icon/><span>{x.label}</span></Link></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarGroup></SidebarContent>
      <SidebarFooter className="border-t border-[#d6e0eb] p-2"><SidebarMenu><SidebarMenuItem><SidebarMenuButton asChild tooltip="Profile & Security" isActive={location.pathname.startsWith("/faculty/profile")} className="h-11"><Link to="/faculty/profile"><UserRound/><span>Profile & Security</span></Link></SidebarMenuButton></SidebarMenuItem><SidebarMenuItem><SidebarMenuButton onClick={()=>void logout()} tooltip="Sign out" className="h-11"><LogOut/><span>Sign out</span></SidebarMenuButton></SidebarMenuItem></SidebarMenu></SidebarFooter><SidebarRail/>
    </Sidebar>
    <SidebarInset className="bg-white"><header className="flex h-[72px] items-center justify-between border-b border-[#d6e0eb] px-4 md:px-8"><div className="flex items-center gap-3"><SidebarTrigger/><CalendarDays className="text-[#0c3872]"/><span className="hidden text-sm font-medium sm:inline">First Semester · AY 2026–2027</span></div><div className="flex items-center gap-4">{(user?.availablePortals.length??0)>1?<DropdownMenu><DropdownMenuTrigger className="flex h-10 items-center gap-2 rounded-md border px-3 text-sm"><UsersRound/>Faculty Portal<ChevronDown/></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuGroup>{user?.availablePortals.map(p=><DropdownMenuItem key={p} onSelect={()=>navigate(switchPortal(p))}>{p==="ADMIN"?<ShieldCheck/>:<UsersRound/>}{p[0]+p.slice(1).toLowerCase()} Portal</DropdownMenuItem>)}</DropdownMenuGroup></DropdownMenuContent></DropdownMenu>:null}<Avatar className="size-10"><AvatarFallback className="bg-[#073b7a] text-white">{initials}</AvatarFallback></Avatar><span className="hidden text-sm font-medium md:inline">{user?.fullName}</span></div></header><main className="min-h-[calc(100vh-72px)]"><Outlet/></main></SidebarInset>
  </SidebarProvider>
}
