# Users and Accounts

## Status

Completed through Flyway V23. #status/completed #module/authentication

## Purpose

Provide one authoritative directory for system, faculty, and student accounts while separating safe account operations from protected RBAC changes and giving every authenticated user a shared security center.

## Users and Roles

| User | Directory access | Account mutations | RBAC mutations |
|---|---|---|---|
| Super Admin | All accounts and conflicts | All except self-deactivation/self-demotion and last-Super-Admin violations | Non-protected roles/permissions; protected definitions remain migration-managed |
| Account Admin | All accounts | Unprotected accounts only; safe assignable roles | None |
| Other authenticated roles | Own security center only | Own password and sessions | None |

## Account Rules

- Accounts are deactivated, never deleted.
- Account type is derived as `SYSTEM`, `FACULTY`, or `STUDENT`.
- A user cannot link both a faculty and student record.
- Linked faculty/student names and emails are read-only mirrors of authoritative domain records.
- Student identity and `STUDENT` role membership are system-managed.
- Existing mismatches remain visible until a Super Admin runs reasoned reconciliation.
- Every account/status/link/role/reset/unlock/admin-session change requires an audit reason and current version.
- Protected accounts are visibly read-only for Account Admins; backend enforcement is authoritative.

## Administration Flow

1. The directory loads summary counts and accounts with account-type, active, locked, and forced-change filters.
2. Opening an account shows canonical identity/link status, roles, sessions, and security activity.
3. Creating a staff account generates a 20-character, 24-hour temporary credential.
4. Resetting a password revokes all sessions, advances the security version, and returns a new one-time credential.
5. Status, unlock, link, role, reconciliation, and session actions require an explicit reason.
6. Stale account or role versions return HTTP `409` and require refresh.

## Identity Synchronization

- Faculty/student updates synchronize linked account name/email transactionally.
- Student number remains the managed username for provisioned student accounts.
- If the canonical domain email belongs to another user, synchronization stops with `IDENTITY_EMAIL_CONFLICT`; administrators must resolve that account first.
- The Identity Conflicts workspace is Super-Admin-only and distinguishes missing domain email, email conflict, and general mismatch.

## Credentials and Sessions

- Staff temporary credentials expire after 24 hours; enrollment credentials expire after 72 hours.
- Existing forced-change student credentials are grandfathered without an expiry.
- Passwords are never logged, cached in query state, or written to browser storage.
- The credential dialog requires copy acknowledgement before closing.
- `/account/security` supports password change, session list, single-session revoke, and revoke-others for every role.
- New sessions have seven-day idle and 30-day absolute expiry; cleanup removes records revoked/expired for more than 30 days.

## Frontend Workspaces

- Overview metrics: active, inactive, locked, forced-change, and directory totals by account type.
- Unified Directory: identity, domain link/sync state, roles, security state, last login, and sessions.
- Account detail: identity, access, sessions, and security activity.
- Super-Admin-only Roles & Permissions and Identity Conflicts tabs.
- Shared responsive Account Security center; old student password routes redirect and the faculty duplicate form is removed.

## Exclusions

No arbitrary role creation/deletion, email recovery, or MFA is included. Roles remain migration-managed.

## Related Notes

- [[Authentication and Roles]]
- [[Authentication Endpoints]]
- [[Authentication Data Dictionary]]
- [[User Roles]]
- [[Users and Accounts Test Cases]]
- [[ADR-005 Delegated Account Administration and Immediate Session Revocation]]

