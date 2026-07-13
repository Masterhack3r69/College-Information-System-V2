import { NavLink, Outlet } from "react-router-dom"
import { cn } from "@/lib/utils"

const tabs = [
  { to: "departments", label: "Departments" },
  { to: "programs", label: "Programs" },
  { to: "courses", label: "Courses" },
  { to: "faculty", label: "Faculty" },
  { to: "rooms", label: "Rooms" },
  { to: "school-years", label: "School Years" },
  { to: "semesters", label: "Semesters" },
  { to: "sections", label: "Sections" },
  { to: "curricula", label: "Curricula" },
  { to: "grading", label: "Grading" },
]

export function SetupLayout() {
  return (
    <div className="mx-auto max-w-7xl p-4 md:p-7">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#0b1f3a]">Academic Setup</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure college departments, programs, courses, faculty, rooms, and academic terms.
        </p>
      </div>

      <div className="border-b border-border mb-6 overflow-x-auto flex">
        <nav className="flex space-x-6 min-w-max pb-px">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                cn(
                  "border-b-2 px-1 pb-3 text-sm font-medium transition-all duration-200 whitespace-nowrap",
                  isActive
                    ? "border-[#0b1f3a] text-[#0b1f3a] font-semibold"
                    : "border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground"
                )
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="mt-4">
        <Outlet />
      </div>
    </div>
  )
}
