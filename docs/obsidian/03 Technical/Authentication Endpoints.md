# Authentication Endpoints

All responses use the standard `ApiResponse` envelope. Login and refresh are anonymous; every other endpoint requires a valid active session.

## Authentication and Self-Service

| Method | Path | Purpose | Allowed users | Audit behavior |
|---|---|---|---|---|
| `POST` | `/api/v1/auth/login` | Authenticate and create a session | Anonymous | Success/failure; no secrets |
| `POST` | `/api/v1/auth/refresh` | Lock and rotate the session token hash | Anonymous with usable refresh token | Session refresh |
| `POST` | `/api/v1/auth/logout` | Revoke the submitted session | Authenticated | Logout |
| `GET` | `/api/v1/auth/me` | Current user/roles/permissions/portals | Authenticated | None |
| `GET` | `/api/v1/auth/sessions` | List own usable sessions and current marker | Authenticated | None |
| `DELETE` | `/api/v1/auth/sessions/{sessionId}` | Revoke one owned session | Authenticated owner | Session revocation |
| `POST` | `/api/v1/auth/sessions/revoke-others` | Revoke every session except current | Authenticated | Revoke-others count |
| `PUT` | `/api/v1/auth/password` | Verify current password, change it, advance security version, revoke other sessions, and return refreshed tokens | Authenticated | Password change |

`PUT /auth/password` accepts `currentPassword` and `newPassword`; the new value must be 12–128 characters with a letter and number.

## Account Directory (`ACCOUNT_MANAGE`)

| Method | Path | Purpose / important request fields |
|---|---|---|
| `GET` | `/api/v1/users` | Paged directory; `search`, `roleId`, `facultyId`, `active`, `accountType`, `locked`, `forcedChange` |
| `GET` | `/api/v1/users/summary` | Active/inactive/locked/forced-change and account-type totals |
| `GET` | `/api/v1/users/assignable-roles` | Caller-safe role catalog; protected roles excluded for Account Admin |
| `GET` | `/api/v1/users/faculty-options` | Unlinked faculty choices for account linking |
| `POST` | `/api/v1/users` | Create system/faculty account; no `initialPassword`; returns account plus one-time credential |
| `GET` | `/api/v1/users/{id}` | Expanded account detail |
| `PUT` | `/api/v1/users/{id}` | Change allowed identity/link/roles with `version` and `auditReason` |
| `PATCH` | `/api/v1/users/{id}/status` | Activate/deactivate with `active`, `version`, and `auditReason` |
| `POST` | `/api/v1/users/{id}/reset-password` | Reset with `version`/`auditReason`; returns one-time credential |
| `POST` | `/api/v1/users/{id}/unlock` | Clear persisted login lock with `version`/`auditReason` |
| `GET` | `/api/v1/users/{id}/sessions` | List account sessions |
| `DELETE` | `/api/v1/users/{id}/sessions/{sessionId}` | Revoke account session with `auditReason` |
| `POST` | `/api/v1/users/{id}/sessions/revoke-all` | Advance security version and revoke all sessions with reason/version |
| `GET` | `/api/v1/users/{id}/security-activity` | Account security audit history |

Account responses include type, domain link identity, roles, active/forced/temporary/lock state, last login, identity sync status, active session count, protection flag, and version.

## Super-Admin Identity Operations

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/users/identity-conflicts` | List mismatched or blocked linked identities |
| `POST` | `/api/v1/users/{id}/reconcile-identity` | Apply canonical domain name/email with `version` and `auditReason` |

## RBAC (`RBAC_MANAGE`)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/roles` | Full migration-managed role catalog |
| `GET` | `/api/v1/permissions` | Permission catalog |
| `PUT` | `/api/v1/roles/{id}/permissions` | Replace non-protected role permissions with `version` and `auditReason` |

## Stable Security Codes

- `AUTH_RATE_LIMITED`, `AUTHENTICATION_FAILED`, `TEMPORARY_PASSWORD_EXPIRED`, `SESSION_REVOKED`
- `STALE_ACCOUNT`, `STALE_ROLE`, `AUDIT_REASON_REQUIRED`
- `PROTECTED_ACCOUNT`, `PROTECTED_ROLE`, `PROTECTED_PERMISSION`, `SUPER_ADMIN_REQUIRED`
- `SELF_DEACTIVATION_NOT_ALLOWED`, `SELF_DEMOTION_NOT_ALLOWED`, `LAST_SUPER_ADMIN_REQUIRED`
- `SYSTEM_MANAGED_STUDENT_ACCOUNT`, `SYSTEM_MANAGED_STUDENT_ROLE`
- `IDENTITY_EMAIL_CONFLICT`, `IDENTITY_USERNAME_CONFLICT`, `DOMAIN_EMAIL_REQUIRED`
- `PASSWORD_POLICY_FAILED`, `PASSWORD_REUSE_NOT_ALLOWED`, `CURRENT_PASSWORD_INVALID`

## Related Notes

- [[Users and Accounts]]
- [[Authentication and Roles]]
- [[Authentication Data Dictionary]]
- [[User Roles]]

