import { expect, test, type Page, type Route } from "@playwright/test"

const currentYear = { id: "year-current", schoolYear: "2026-2027", active: true }
const targetYear = { id: "year-target", schoolYear: "2027-2028", active: false }
const semester = { id: "semester-first", name: "FIRST_SEMESTER", sortOrder: 1, active: true }

const activeSchedule = {
  id: "schedule-bscs",
  sectionId: "section-bscs",
  sectionCode: "BSCS-1A",
  programId: "program-bscs",
  programCode: "BSCS",
  curriculumId: "curriculum-bscs",
  curriculumCode: "BSCS-2026",
  yearLevel: 1,
  courseId: "course-cs101",
  courseCode: "CS101",
  courseTitle: "Programming Fundamentals",
  creditUnits: 3,
  facultyId: "faculty-ada",
  facultyName: "Ada Lovelace",
  roomId: "room-lab",
  roomCode: "LAB-301",
  schoolYearId: currentYear.id,
  schoolYear: currentYear.schoolYear,
  semesterId: semester.id,
  semesterName: semester.name,
  capacity: 40,
  enrolledCount: 32,
  availableSeats: 8,
  status: "ACTIVE",
  version: 4,
  hasEnrollmentActivity: true,
  gradebookSubmitted: false,
  gradebookLocked: false,
  identityLocked: true,
  roomSummary: "LAB-301, Online",
  warnings: [],
  latestChange: { id: "change-1", action: "REVISED", reason: "Move Sunday laboratory", actorName: "Registrar One", changedAt: "2026-07-21T10:00:00Z" },
  meetings: [
    { id: "meeting-sunday", dayOfWeek: "SUNDAY", startTime: "09:00:00", endTime: "11:00:00", componentType: "LABORATORY", deliveryMode: "ONSITE", roomId: "room-lab", roomCode: "LAB-301", roomName: "Computer Laboratory", revisionNumber: 2, active: true, effectiveFrom: "2026-07-21T10:00:00Z" },
    { id: "meeting-online", dayOfWeek: "WEDNESDAY", startTime: "13:00:00", endTime: "14:00:00", componentType: "LECTURE", deliveryMode: "ONLINE", locationDetails: "Institutional LMS", revisionNumber: 2, active: true, effectiveFrom: "2026-07-21T10:00:00Z" },
  ],
}

const pageOf = (items: unknown[]) => ({ items, page: 0, size: 500, totalElements: items.length, totalPages: items.length ? 1 : 0 })
const success = (data: unknown, message = "Success") => ({ success: true, message, data, timestamp: new Date().toISOString() })

type MockUser = {
  id: string
  username: string
  email: string
  fullName: string
  roles: string[]
  permissions: string[]
  facultyId?: string
  studentId?: string
  availablePortals: ("ADMIN" | "FACULTY" | "STUDENT")[]
  defaultPortal: "ADMIN" | "FACULTY" | "STUDENT"
  passwordChangeRequired: boolean
}

async function authenticated(page: Page, user: MockUser, handler: (route: Route, path: string) => Promise<boolean>) {
  await page.addInitScript(() => sessionStorage.setItem("sis.refreshToken", "scheduling-e2e-token"))
  await page.route("**/api/v1/**", async route => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith("/auth/me")) {
      await route.fulfill({ json: success(user) })
      return
    }
    if (await handler(route, path)) return
    await route.fulfill({ status: 404, json: { success: false, message: `Unhandled ${route.request().method()} ${path}` } })
  })
}

async function mockAdministrativeScheduling(page: Page, user: MockUser) {
  let schedule = structuredClone(activeSchedule)
  let revisionReason = ""
  let copied = false
  await authenticated(page, user, async (route, path) => {
    const request = route.request()
    if (path.endsWith("/school-years")) { await route.fulfill({ json: success(pageOf([currentYear, targetYear])) }); return true }
    if (path.endsWith("/semesters")) { await route.fulfill({ json: success(pageOf([semester])) }); return true }
    if (path.endsWith("/programs")) { await route.fulfill({ json: success(pageOf([{ id: "program-bscs", programCode: "BSCS", programName: "BS Computer Science", departmentId: "department-cs", degreeType: "BACHELOR", status: "ACTIVE" }])) }); return true }
    if (path.endsWith("/sections")) { await route.fulfill({ json: success(pageOf([{ id: "section-bscs", sectionCode: "BSCS-1A", programId: "program-bscs", programCode: "BSCS", curriculumId: "curriculum-bscs", curriculumCode: "BSCS-2026", schoolYearId: currentYear.id, schoolYear: currentYear.schoolYear, semesterId: semester.id, semesterName: semester.name, yearLevel: 1, maximumCapacity: 40, confirmedCount: 32, status: "ACTIVE" }])) }); return true }
    if (path.endsWith("/faculty")) { await route.fulfill({ json: success(pageOf([{ id: "faculty-ada", employeeNumber: "FAC-001", firstName: "Ada", lastName: "Lovelace", email: "ada@example.edu", departmentId: "department-cs", facultyType: "INSTRUCTOR", employmentStatus: "FULL_TIME", status: "ACTIVE" }])) }); return true }
    if (path.endsWith("/rooms")) { await route.fulfill({ json: success(pageOf([{ id: "room-lab", roomCode: "LAB-301", roomName: "Computer Laboratory", capacity: 45, building: "Technology Building", roomType: "COMPUTER_LAB", status: "ACTIVE" }])) }); return true }
    if (path.endsWith("/schedules") && request.method() === "GET") { await route.fulfill({ json: success(pageOf([schedule])) }); return true }
    if (path.endsWith("/schedules/schedule-bscs/revise") && request.method() === "POST") {
      revisionReason = request.postDataJSON().reason
      schedule = { ...schedule, version: schedule.version + 1, latestChange: { ...schedule.latestChange, reason: revisionReason } }
      await route.fulfill({ json: success(schedule) }); return true
    }
    if (path.endsWith("/schedules/copy-term/preview")) {
      await route.fulfill({ json: success({ executable: true, warnings: [], items: [{ sourceScheduleId: schedule.id, targetSectionId: "target-section", courseCode: schedule.courseCode, sourceSectionCode: schedule.sectionCode, targetSectionCode: schedule.sectionCode, copyable: true, issues: [] }] }) }); return true
    }
    if (path.endsWith("/schedules/copy-term") && request.method() === "POST") {
      copied = true
      await route.fulfill({ json: success({ createdCount: 1, createdScheduleIds: ["copied-draft"] }) }); return true
    }
    return false
  })
  return { revisionReason: () => revisionReason, copied: () => copied }
}

test.describe("Scheduling operational workspace", () => {
  test("Registrar revises a published schedule and completes atomic term copy preview", async ({ page }) => {
    const state = await mockAdministrativeScheduling(page, {
      id: "registrar-user", username: "registrar", email: "registrar@example.edu", fullName: "Registrar One",
      roles: ["REGISTRAR"], permissions: ["SCHEDULE_VIEW", "SCHEDULE_MANAGE", "SCHEDULE_REVISE", "SCHEDULE_POLICY_MANAGE", "SCHEDULE_OVERRIDE"],
      availablePortals: ["ADMIN"], defaultPortal: "ADMIN", passwordChangeRequired: false,
    })

    await page.goto("/admin/schedules")
    await expect(page.getByRole("heading", { name: "Scheduling workspace" })).toBeVisible()
    await expect(page.getByText("SUN 09:00–11:00 · LAB-301 · LABORATORY")).toBeVisible()

    await page.getByRole("button", { name: "Revise CS101" }).click()
    await expect(page.getByText("Course, section, and term are locked.", { exact: false })).toBeVisible()
    await page.getByPlaceholder("Explain why this lifecycle change is needed").fill("Move Sunday laboratory for maintenance")
    await page.getByRole("button", { name: "Confirm revise" }).click()
    await expect.poll(state.revisionReason).toBe("Move Sunday laboratory for maintenance")

    await page.getByRole("button", { name: "Copy term" }).click()
    await page.getByRole("combobox", { name: "School year" }).click()
    await page.getByRole("option", { name: targetYear.schoolYear }).click()
    await page.getByRole("combobox", { name: "Semester" }).click()
    await page.getByRole("option", { name: "FIRST SEMESTER" }).click()
    await page.getByRole("checkbox").check()
    await page.getByRole("button", { name: "Preview" }).click()
    await expect(page.getByText("Ready to copy")).toBeVisible()
    await page.getByRole("button", { name: "Copy all drafts" }).click()
    await expect.poll(state.copied).toBe(true)
  })

  test("Dean sees a department-scoped read-only planner", async ({ page }) => {
    await mockAdministrativeScheduling(page, {
      id: "dean-user", username: "dean", email: "dean@example.edu", fullName: "Dean Grace Hopper",
      roles: ["DEAN"], permissions: ["SCHEDULE_VIEW"], facultyId: "faculty-dean",
      availablePortals: ["ADMIN"], defaultPortal: "ADMIN", passwordChangeRequired: false,
    })
    await page.goto("/admin/schedules")
    await expect(page.getByText("CS101 · BSCS-1A")).toBeVisible()
    await expect(page.getByRole("button", { name: "New draft" })).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Copy term" })).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Revise CS101" })).toHaveCount(0)
  })

  test("Administrative tabs stay icon-free and contained on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await mockAdministrativeScheduling(page, {
      id: "registrar-mobile", username: "registrar.mobile", email: "registrar.mobile@example.edu", fullName: "Registrar Mobile",
      roles: ["REGISTRAR"], permissions: ["SCHEDULE_VIEW", "SCHEDULE_MANAGE", "SCHEDULE_REVISE"],
      availablePortals: ["ADMIN"], defaultPortal: "ADMIN", passwordChangeRequired: false,
    })

    await page.goto("/admin/schedules")
    const tablist = page.getByRole("tablist")
    await expect(tablist.getByRole("tab")).toHaveCount(5)
    await expect(tablist.locator("svg")).toHaveCount(0)
    const dimensions = await tablist.evaluate(element => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      overflowX: getComputedStyle(element).overflowX,
    }))
    expect(dimensions.overflowX).toBe("auto")
    expect(dimensions.scrollWidth).toBeGreaterThan(dimensions.clientWidth)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => document.documentElement.clientWidth))

    await page.getByRole("tab", { name: "History" }).click()
    await expect(page.getByRole("tab", { name: "History" })).toHaveAttribute("aria-selected", "true")
    await expect(page.getByRole("tabpanel", { name: "History" })).toContainText("Select an offering")
  })

  test("Faculty sees assigned Sunday meetings and recent changes on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await authenticated(page, {
      id: "faculty-user", username: "ada", email: "ada@example.edu", fullName: "Ada Lovelace",
      roles: ["FACULTY"], permissions: ["FACULTY_PORTAL_ACCESS", "SCHEDULE_VIEW"], facultyId: "faculty-ada",
      availablePortals: ["FACULTY"], defaultPortal: "FACULTY", passwordChangeRequired: false,
    }, async (route, path) => {
      if (path.endsWith("/faculty/me/schedule/terms")) { await route.fulfill({ json: success([{ schoolYearId: currentYear.id, schoolYear: currentYear.schoolYear, semesterId: semester.id, semesterName: semester.name, active: true }]) }); return true }
      if (path.endsWith("/faculty/me/schedule/changes")) { await route.fulfill({ json: success([{ id: "faculty-change", action: "REVISED", reason: "Move Sunday laboratory", changedAt: "2026-07-21T10:00:00Z", actorName: "Registrar One", courseCode: "CS101", sectionCode: "BSCS-1A" }]) }); return true }
      if (path.endsWith("/faculty/me/schedule")) { await route.fulfill({ json: success([{ scheduleId: activeSchedule.id, courseCode: activeSchedule.courseCode, courseTitle: activeSchedule.courseTitle, sectionCode: activeSchedule.sectionCode, roomCode: "LAB-301", schoolYear: currentYear.schoolYear, semesterName: semester.name, studentCount: 32, gradeStatus: "DRAFT", attendanceCount: 0, id: "meeting-sunday", dayOfWeek: "SUNDAY", startTime: "09:00:00", endTime: "11:00:00", componentType: "LABORATORY", deliveryMode: "ONSITE" }]) }); return true }
      return false
    })
    await page.goto("/faculty/schedule")
    await expect(page.getByRole("heading", { name: "Teaching Schedule" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Sunday" })).toBeVisible()
    await expect(page.getByText("Move Sunday laboratory", { exact: false })).toBeVisible()
    await expect(page.getByText("LAB-301 · LABORATORY")).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => document.documentElement.clientWidth))
  })

  test("Student sees only confirmed-term Sunday schedule and latest change", async ({ page }) => {
    await authenticated(page, {
      id: "student-user", username: "2026-0001", email: "student@example.edu", fullName: "Student One",
      roles: ["STUDENT"], permissions: ["STUDENT_PORTAL_ACCESS", "STUDENT_ENROLLMENT_SELF"], studentId: "student-one",
      availablePortals: ["STUDENT"], defaultPortal: "STUDENT", passwordChangeRequired: false,
    }, async (route, path) => {
      if (path.endsWith("/student/me/schedule/terms")) { await route.fulfill({ json: success([{ schoolYearId: currentYear.id, schoolYear: currentYear.schoolYear, semesterId: semester.id, semesterName: semester.name, active: true }]) }); return true }
      if (path.endsWith("/student/me/schedule/changes")) { await route.fulfill({ json: success([{ id: "student-change", action: "REVISED", reason: "Move Sunday laboratory", changedAt: "2026-07-21T10:00:00Z", actorName: "Registrar One", courseCode: "CS101", sectionCode: "BSCS-1A" }]) }); return true }
      if (path.endsWith("/student/me/schedule")) { await route.fulfill({ json: success([{ scheduleId: activeSchedule.id, courseCode: activeSchedule.courseCode, courseTitle: activeSchedule.courseTitle, sectionCode: activeSchedule.sectionCode, roomCode: "LAB-301", componentType: "LABORATORY", deliveryMode: "ONSITE", dayOfWeek: "SUNDAY", startTime: "09:00:00", endTime: "11:00:00", faculty: "Ada Lovelace" }]) }); return true }
      return false
    })
    await page.goto("/student/schedule")
    await expect(page.getByRole("heading", { name: "Class Schedule" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Sunday" })).toBeVisible()
    await expect(page.getByText("Recent changes to your classes")).toBeVisible()
    await expect(page.getByText("Move Sunday laboratory", { exact: false })).toBeVisible()
    await expect(page.getByText("LAB-301")).toBeVisible()
  })
})
