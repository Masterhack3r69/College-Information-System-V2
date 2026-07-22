import { expect, test, type Page, type Route } from "@playwright/test"

const accountPermission = {
  id: "permission-account",
  name: "ACCOUNT_MANAGE",
  description: "Can administer accounts",
}
const rbacPermission = {
  id: "permission-rbac",
  name: "RBAC_MANAGE",
  description: "Can manage role permissions",
}
const studentView = {
  id: "permission-students",
  name: "STUDENT_VIEW",
  description: "Can view student records",
}
const roles = {
  super: {
    id: "role-super",
    name: "SUPER_ADMIN",
    description: "Full system administrator",
    permissions: [accountPermission, rbacPermission, studentView],
    version: 0,
    protectedRole: true,
  },
  account: {
    id: "role-account",
    name: "ACCOUNT_ADMIN",
    description: "Delegated account administrator",
    permissions: [accountPermission],
    version: 0,
    protectedRole: true,
  },
  registrar: {
    id: "role-registrar",
    name: "REGISTRAR",
    description: "Registrar staff",
    permissions: [studentView],
    version: 2,
    protectedRole: false,
  },
}
const baseAccount = {
  active: true,
  accountType: "SYSTEM" as const,
  identitySyncStatus: "SYNCED",
  mustChangePassword: false,
  locked: false,
  activeSessionCount: 1,
  protectedAccount: false,
  version: 0,
  lastLoginAt: undefined as string | undefined,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-07-20T00:00:00Z",
}
const superAccount = {
  ...baseAccount,
  id: "user-super",
  username: "admin",
  email: "admin@sis.local",
  fullName: "System Administrator",
  protectedAccount: true,
  roles: [roles.super],
  lastLoginAt: "2026-07-22T10:00:00Z",
}
const registrarAccount = {
  ...baseAccount,
  id: "user-registrar",
  username: "registrar",
  email: "registrar@example.edu",
  fullName: "Maria Santos",
  roles: [roles.registrar],
  mustChangePassword: true,
  temporaryPasswordExpiresAt: "2026-07-23T10:00:00Z",
  lastLoginAt: "2026-07-21T10:00:00Z",
}

function success(data: unknown, message = "Success") {
  return { success: true, message, data, timestamp: new Date().toISOString() }
}
function currentUser(
  kind:
    | "SUPER_ADMIN"
    | "ACCOUNT_ADMIN"
    | "UNAUTHORIZED"
    | "STUDENT" = "SUPER_ADMIN",
  forced = false
) {
  const isSuper = kind === "SUPER_ADMIN",
    isAccount = kind === "ACCOUNT_ADMIN",
    isStudent = kind === "STUDENT"
  return {
    id: isStudent ? "student-user" : isAccount ? "account-user" : "user-super",
    username: isStudent ? "2026-0001" : isAccount ? "account.admin" : "admin",
    email: isStudent
      ? "student@example.edu"
      : isAccount
        ? "account.admin@example.edu"
        : "admin@sis.local",
    fullName: isStudent
      ? "Ana Reyes"
      : isAccount
        ? "Account Administrator"
        : "System Administrator",
    roles: isStudent ? ["STUDENT"] : isAccount ? ["ACCOUNT_ADMIN"] : [kind],
    permissions: isSuper
      ? ["ACCOUNT_MANAGE", "RBAC_MANAGE", "STUDENT_VIEW"]
      : isAccount
        ? ["ACCOUNT_MANAGE"]
        : isStudent
          ? ["STUDENT_PORTAL_ACCESS"]
          : ["STUDENT_VIEW"],
    facultyId: null,
    studentId: isStudent ? "student-1" : null,
    passwordChangeRequired: forced,
    availablePortals: isStudent ? ["STUDENT"] : ["ADMIN"],
    defaultPortal: isStudent ? "STUDENT" : "ADMIN",
  }
}

async function mockAdministration(
  page: Page,
  kind: "SUPER_ADMIN" | "ACCOUNT_ADMIN" | "UNAUTHORIZED" = "SUPER_ADMIN"
) {
  let accounts = [superAccount, registrarAccount]
  let roleCatalog = [roles.super, roles.account, roles.registrar]
  const identityConflicts = [
    {
      userId: "faculty-user",
      username: "faculty.old",
      accountType: "FACULTY",
      accountName: "Legacy Faculty",
      authoritativeName: "Ada Lovelace",
      accountEmail: "old@example.edu",
      authoritativeEmail: "ada@example.edu",
      status: "MISMATCH",
      version: 1,
    },
  ]
  await page.addInitScript(() =>
    sessionStorage.setItem("sis.refreshToken", "test-refresh-token")
  )
  await page.route("**/api/v1/**", async (route: Route) => {
    const request = route.request(),
      url = new URL(request.url()),
      path = url.pathname
    if (path.endsWith("/auth/me")) {
      await route.fulfill({ json: success(currentUser(kind)) })
      return
    }
    if (path.endsWith("/users/summary")) {
      await route.fulfill({
        json: success({
          total: accounts.length,
          active: accounts.filter((x) => x.active).length,
          inactive: accounts.filter((x) => !x.active).length,
          locked: accounts.filter((x) => x.locked).length,
          forcedChange: accounts.filter((x) => x.mustChangePassword).length,
          system: accounts.length,
          faculty: 0,
          student: 0,
        }),
      })
      return
    }
    if (path.endsWith("/users/assignable-roles")) {
      await route.fulfill({
        json: success(
          kind === "SUPER_ADMIN"
            ? roleCatalog
            : roleCatalog.filter((role) => !role.protectedRole)
        ),
      })
      return
    }
    if (path.endsWith("/users/faculty-options")) {
      await route.fulfill({
        json: success({
          items: [
            {
              id: "faculty-ada",
              employeeNumber: "EMP-001",
              fullName: "Ada Lovelace",
              email: "ada@example.edu",
              status: "ACTIVE",
            },
          ],
          page: 0,
          size: 50,
          totalElements: 1,
          totalPages: 1,
        }),
      })
      return
    }
    if (path.endsWith("/users/identity-conflicts")) {
      await route.fulfill({ json: success(identityConflicts) })
      return
    }
    if (path.endsWith("/permissions")) {
      await route.fulfill({
        json: success([accountPermission, rbacPermission, studentView]),
      })
      return
    }
    if (path.endsWith("/roles") && request.method() === "GET") {
      await route.fulfill({ json: success(roleCatalog) })
      return
    }
    if (path.endsWith("/users") && request.method() === "GET") {
      const search = (url.searchParams.get("search") ?? "").toLowerCase(),
        type = url.searchParams.get("accountType"),
        active = url.searchParams.get("active")
      const items = accounts.filter(
        (account) =>
          (!search ||
            `${account.fullName} ${account.username} ${account.email}`
              .toLowerCase()
              .includes(search)) &&
          (!type || account.accountType === type) &&
          (active === null || account.active === (active === "true"))
      )
      await route.fulfill({
        json: success({
          items,
          page: 0,
          size: 20,
          totalElements: items.length,
          totalPages: 1,
        }),
      })
      return
    }
    if (path.endsWith("/users") && request.method() === "POST") {
      const body = request.postDataJSON()
      const account = {
        ...baseAccount,
        id: "user-new",
        username: body.username,
        email: body.email,
        fullName: body.fullName,
        roles: roleCatalog.filter((role) => body.roleIds.includes(role.id)),
        mustChangePassword: true,
        temporaryPasswordExpiresAt: "2026-07-23T12:00:00Z",
        activeSessionCount: 0,
        lastLoginAt: "2026-07-22T12:00:00Z",
      }
      accounts = [...accounts, account]
      await route.fulfill({
        json: success({
          account,
          temporaryPassword: "A7!temporarySecureX",
          expiresAt: "2026-07-23T12:00:00Z",
        }),
      })
      return
    }
    if (path.match(/\/users\/[^/]+\/sessions$/)) {
      await route.fulfill({
        json: success([
          {
            id: "session-1",
            current: false,
            userAgent: "Mozilla/5.0 (Windows NT 10.0)",
            createdIp: "10.0.0.1",
            lastIp: "10.0.0.1",
            createdAt: "2026-07-20T10:00:00Z",
            lastUsedAt: "2026-07-22T10:00:00Z",
            idleExpiresAt: "2026-07-29T10:00:00Z",
            absoluteExpiresAt: "2026-08-19T10:00:00Z",
          },
        ]),
      })
      return
    }
    if (path.endsWith("/security-activity")) {
      await route.fulfill({
        json: success([
          {
            id: "audit-1",
            action: "LOGIN_SUCCESS",
            module: "AUTH",
            entityType: "User",
            createdAt: "2026-07-22T10:00:00Z",
            ipAddress: "10.0.0.1",
          },
        ]),
      })
      return
    }
    if (path.endsWith("/reset-password")) {
      const account =
        accounts.find((item) => path.includes(item.id)) ?? registrarAccount
      await route.fulfill({
        json: success({
          account: {
            ...account,
            version: account.version + 1,
            mustChangePassword: true,
          },
          temporaryPassword: "R8!replacementSecure",
          expiresAt: "2026-07-23T13:00:00Z",
        }),
      })
      return
    }
    if (path.endsWith("/status")) {
      const id = path.split("/").at(-2),
        body = request.postDataJSON()
      accounts = accounts.map((account) =>
        account.id === id
          ? { ...account, active: body.active, version: account.version + 1 }
          : account
      )
      await route.fulfill({
        json: success(accounts.find((account) => account.id === id)),
      })
      return
    }
    if (
      path.includes("/roles/") &&
      path.endsWith("/permissions") &&
      request.method() === "PUT"
    ) {
      const id = path.split("/").at(-2),
        body = request.postDataJSON()
      roleCatalog = roleCatalog.map((role) =>
        role.id === id
          ? {
              ...role,
              permissions: [
                accountPermission,
                rbacPermission,
                studentView,
              ].filter((permission) =>
                body.permissionIds.includes(permission.id)
              ),
              version: role.version + 1,
            }
          : role
      )
      await route.fulfill({
        json: success(roleCatalog.find((role) => role.id === id)),
      })
      return
    }
    if (path.endsWith("/reconcile-identity")) {
      await route.fulfill({ json: success(registrarAccount) })
      return
    }
    if (
      request.method() === "DELETE" ||
      path.endsWith("/revoke-all") ||
      path.endsWith("/unlock")
    ) {
      await route.fulfill({
        json: success(request.method() === "DELETE" ? null : 1),
      })
      return
    }
    await route.fulfill({
      status: 404,
      json: {
        success: false,
        message: `Unhandled ${request.method()} ${path}`,
      },
    })
  })
}

test.describe("Users & Accounts administration", () => {
  test("Super Admin creates an account and must acknowledge its one-time credential", async ({
    page,
  }) => {
    await mockAdministration(page)
    await page.goto("/admin/administration/users")
    await expect(
      page.getByRole("heading", { name: "Users & Accounts" })
    ).toBeVisible()
    await expect(page.getByText(/Active · of 2 total/)).toBeVisible()
    await page.getByRole("button", { name: "Create account" }).click()
    await page.getByLabel("Username").fill("jane.admin")
    await page.getByLabel("Full name").fill("Jane Admin")
    await page.getByLabel("Email").fill("jane@example.edu")
    await page.getByLabel("REGISTRAR").check()
    await page.getByLabel("Audit reason").fill("New registrar staff account")
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click()
    await expect(
      page.getByRole("heading", { name: "Copy this temporary credential now" })
    ).toBeVisible()
    await expect(page.getByText("A7!temporarySecureX")).toBeVisible()
    await expect(page.getByRole("button", { name: "Done" })).toBeDisabled()
    await page.getByText("I copied the credential").click()
    await page.getByRole("button", { name: "Done" }).click()
    await expect(page.getByText("Jane Admin", { exact: true })).toBeVisible()
  })

  test("Account Admin sees protected accounts as read-only and cannot open RBAC workspaces", async ({
    page,
  }) => {
    await mockAdministration(page, "ACCOUNT_ADMIN")
    await page.goto("/admin/administration/users")
    await expect(page.getByRole("tab", { name: "Roles" })).toHaveCount(0)
    await expect(
      page.getByRole("tab", { name: /Identity conflicts/ })
    ).toHaveCount(0)
    await page.getByText("System Administrator", { exact: true }).click()
    await expect(
      page.getByText("Only a Super Admin may change this protected account.")
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: /Edit identity/ })
    ).toHaveCount(0)
  })

  test("Super Admin can inspect protected RBAC and identity conflict workspaces", async ({
    page,
  }) => {
    await mockAdministration(page)
    await page.goto("/admin/administration/users")
    await page.getByRole("tab", { name: "Roles" }).click()
    await expect(page.getByText("System managed")).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Save permissions" })
    ).toBeDisabled()
    await page.getByRole("tab", { name: /Identity conflicts/ }).click()
    await expect(page.getByText("Legacy Faculty")).toBeVisible()
    await expect(page.getByRole("button", { name: "Reconcile" })).toBeEnabled()
  })

  test("blocks users without ACCOUNT_MANAGE", async ({ page }) => {
    await mockAdministration(page, "UNAUTHORIZED")
    await page.goto("/admin/administration/users")
    await expect(
      page.getByRole("heading", { name: "Access restricted" })
    ).toBeVisible()
  })
})

test.describe("Shared Account Security", () => {
  test("forced-change student is redirected and the center fits a 375px viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.addInitScript(() =>
      sessionStorage.setItem("sis.refreshToken", "student-refresh")
    )
    await page.route("**/api/v1/**", async (route) => {
      const path = new URL(route.request().url()).pathname
      if (path.endsWith("/auth/me")) {
        await route.fulfill({ json: success(currentUser("STUDENT", true)) })
        return
      }
      if (path.endsWith("/auth/sessions")) {
        await route.fulfill({
          json: success([
            {
              id: "student-session",
              current: true,
              userAgent: "Mozilla/5.0 (iPhone)",
              createdIp: "10.0.0.5",
              lastIp: "10.0.0.5",
              createdAt: "2026-07-22T09:00:00Z",
              lastUsedAt: "2026-07-22T10:00:00Z",
              idleExpiresAt: "2026-07-29T10:00:00Z",
              absoluteExpiresAt: "2026-08-21T10:00:00Z",
            },
          ]),
        })
        return
      }
      await route.fulfill({
        status: 404,
        json: { success: false, message: "Unhandled" },
      })
    })
    await page.goto("/student/dashboard")
    await expect(page).toHaveURL(/\/account\/security$/)
    await expect(
      page.getByRole("heading", { name: "Account Security" })
    ).toBeVisible()
    await expect(
      page.getByText("temporary password must be replaced")
    ).toBeVisible()
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth
    )
    expect(overflow).toBe(false)
  })

  test("login honors Retry-After without exposing an identity result", async ({
    page,
  }) => {
    await page.route("**/api/v1/auth/login", (route) =>
      route.fulfill({
        status: 429,
        headers: { "Retry-After": "90" },
        json: {
          success: false,
          code: "AUTH_RATE_LIMITED",
          message: "Too many login attempts. Try again later.",
          timestamp: new Date().toISOString(),
        },
      })
    )
    await page.goto("/login")
    await page.getByLabel("Username or email").fill("someone@example.edu")
    await page.getByLabel("Password").fill("wrong-password")
    await page.getByRole("button", { name: "Sign in" }).click()
    await expect(page.getByText(/Try again in 1:2[89]/)).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Sign in temporarily paused" })
    ).toBeDisabled()
  })
})
