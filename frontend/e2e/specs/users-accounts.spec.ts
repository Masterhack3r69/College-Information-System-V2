import { expect, test, type Page, type Route } from "@playwright/test"

const superAdminRole = {
  id: "role-admin",
  name: "SUPER_ADMIN",
  description: "Full system administrator",
  permissions: [
    { id: "permission-users", name: "USER_MANAGE", description: "Can manage system users" },
    { id: "permission-students", name: "STUDENT_VIEW", description: "Can view student records" },
  ],
}
const registrarRole = {
  id: "role-registrar",
  name: "REGISTRAR",
  description: "Registrar staff",
  permissions: [{ id: "permission-students", name: "STUDENT_VIEW", description: "Can view student records" }],
}

function success(data: unknown, message = "Success") {
  return { success: true, message, data, timestamp: new Date().toISOString() }
}

async function mockAdministration(page: Page, permissions = ["USER_MANAGE"]) {
  let users = [{
    id: "user-admin",
    username: "admin",
    email: "admin@sis.local",
    fullName: "System Administrator",
    active: true,
    roles: [superAdminRole],
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  }]
  let roles = [superAdminRole, registrarRole]
  await page.addInitScript(() => sessionStorage.setItem("sis.refreshToken", "test-refresh-token"))
  await page.route("**/api/v1/**", async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname
    if (path.endsWith("/auth/me")) {
      await route.fulfill({ json: success({ id: "user-admin", username: "admin", email: "admin@sis.local", fullName: "System Administrator", roles: ["SUPER_ADMIN"], permissions }) })
      return
    }
    if (path.endsWith("/roles") && request.method() === "GET") {
      await route.fulfill({ json: success(roles) }); return
    }
    if (path.endsWith("/permissions")) {
      await route.fulfill({ json: success(superAdminRole.permissions) }); return
    }
    if (path.endsWith("/users/faculty-options")) {
      await route.fulfill({ json: success({ items: [{ id: "faculty-ada", employeeNumber: "EMP-001", fullName: "Ada Lovelace", email: "ada@example.edu", status: "ACTIVE" }], page: 0, size: 30, totalElements: 1, totalPages: 1 }) }); return
    }
    if (path.endsWith("/users") && request.method() === "GET") {
      const search = (url.searchParams.get("search") ?? "").toLowerCase()
      const active = url.searchParams.get("active")
      const roleId = url.searchParams.get("roleId")
      const items = users.filter((user) => (!search || `${user.fullName} ${user.username} ${user.email}`.toLowerCase().includes(search))
        && (active === null || user.active === (active === "true"))
        && (!roleId || user.roles.some((role) => role.id === roleId)))
      await route.fulfill({ json: success({ items, page: 0, size: 10, totalElements: items.length, totalPages: items.length ? 1 : 0 }) }); return
    }
    if (path.endsWith("/users") && request.method() === "POST") {
      const body = request.postDataJSON()
      const faculty = body.facultyId === "faculty-ada"
      const created = { id: "user-jane", username: body.username, email: body.email, fullName: body.fullName, active: true,
        facultyId: faculty ? "faculty-ada" : undefined, facultyName: faculty ? "Ada Lovelace" : undefined,
        roles: roles.filter((role) => body.roleIds.includes(role.id)), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      users = [...users, created]
      await route.fulfill({ json: success(created) }); return
    }
    if (path.includes("/reset-password")) {
      await route.fulfill({ json: success(null) }); return
    }
    if (path.endsWith("/status") && request.method() === "PATCH") {
      const id = path.split("/").at(-2)
      const active = request.postDataJSON().active
      users = users.map((user) => user.id === id ? { ...user, active, updatedAt: new Date().toISOString() } : user)
      await route.fulfill({ json: success(users.find((user) => user.id === id)) }); return
    }
    if (path.includes("/roles/") && path.endsWith("/permissions") && request.method() === "PUT") {
      const id = path.split("/").at(-2)
      const permissionIds: string[] = request.postDataJSON().permissionIds
      roles = roles.map((role) => role.id === id ? { ...role, permissions: superAdminRole.permissions.filter((permission) => permissionIds.includes(permission.id)) } : role)
      await route.fulfill({ json: success(roles.find((role) => role.id === id)) }); return
    }
    await route.fulfill({ status: 404, json: { success: false, message: `Unhandled ${request.method()} ${path}` } })
  })
}

test.describe("Users & Accounts administration", () => {
  test("creates a faculty-linked user and manages password and status", async ({ page }) => {
    await mockAdministration(page)
    await page.goto("/administration/users")
    await expect(page.getByRole("heading", { name: "Users & Accounts" })).toBeVisible()

    await page.getByRole("button", { name: "New user" }).click()
    await page.getByLabel("Full name").fill("Jane Admin")
    await page.getByLabel("Username").fill("jane.admin")
    await page.getByLabel("Email").fill("jane@example.edu")
    await page.getByLabel("Initial password").fill("temporary123")
    await page.getByLabel("Registrar").check()
    await page.getByRole("combobox", { name: "Faculty link" }).click()
    await page.getByRole("option", { name: /Ada Lovelace/ }).click()
    await page.getByRole("button", { name: "Create user" }).click()

    await expect(page.getByText("Jane Admin", { exact: true })).toBeVisible()
    await expect(page.getByText("Ada Lovelace", { exact: true })).toBeVisible()
    await page.getByRole("button", { name: "Actions for Jane Admin" }).click()
    await page.getByRole("menuitem", { name: "Edit user" }).click()
    await expect(page.getByLabel("Full name")).toHaveValue("Jane Admin")
    await expect(page.getByLabel("Faculty link")).toContainText("Ada Lovelace")
    await page.getByRole("button", { name: "Cancel" }).click()

    await page.getByRole("button", { name: "Actions for Jane Admin" }).click()
    await page.getByRole("menuitem", { name: "Reset password" }).click()
    await page.getByLabel("New password").fill("replacement123")
    await page.getByLabel("Confirm password").fill("replacement123")
    await page.getByRole("button", { name: "Reset password" }).click()
    await expect(page.getByText("Password reset for Jane Admin")).toBeVisible()

    await page.getByRole("button", { name: "Actions for Jane Admin" }).click()
    await page.getByRole("menuitem", { name: "Deactivate" }).click()
    await page.getByRole("button", { name: "Deactivate" }).click()
    await expect(page.getByText("Jane Admin is now inactive.")).toBeVisible()
  })

  test("locks SUPER_ADMIN permissions and saves another role", async ({ page }) => {
    await mockAdministration(page)
    await page.goto("/administration/users")
    await page.getByRole("tab", { name: "Roles & Permissions" }).click()
    await expect(page.getByText("System-managed role")).toBeVisible()
    await expect(page.getByRole("button", { name: "Save permissions" })).toHaveCount(0)

    await page.getByRole("button", { name: /Registrar/ }).click()
    await page.getByLabel("User Manage").check()
    await page.getByRole("button", { name: "Save permissions" }).click()
    await expect(page.getByText("Registrar permissions updated")).toBeVisible()
  })

  test("blocks users without USER_MANAGE", async ({ page }) => {
    await mockAdministration(page, ["STUDENT_VIEW"])
    await page.goto("/administration/users")
    await expect(page.getByRole("heading", { name: "Access restricted" })).toBeVisible()
  })
})
