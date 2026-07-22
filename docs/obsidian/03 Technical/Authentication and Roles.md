# Authentication and Roles

## Login and Session Flow

1. `POST /api/v1/auth/login` accepts username/email and password with a generic failure response.
2. Persistent user/IP login protection is checked before BCrypt authentication.
3. A successful login creates one stable session row and returns the existing authentication response shape.
4. The access JWT carries `sid` and `securityVersion`. Every authenticated request verifies the user is active, the version still matches, and the session is usable.
5. `POST /api/v1/auth/refresh` hashes the submitted token, locks its session row, rotates the SHA-256 hash in place, and extends the seven-day idle expiry without exceeding the 30-day absolute expiry.
6. Logout, password change, administrative reset, deactivation, and revoke actions mark affected sessions revoked. Access JWTs for those sessions fail immediately with `SESSION_REVOKED`.

The frontend holds the access token in memory and the refresh token in `sessionStorage`. Refresh tokens are never stored in plaintext by the backend.

## Login Protection

- A known identity is locked for 15 minutes after five failures within 15 minutes.
- An IP is throttled for 15 minutes after 20 failures within 15 minutes.
- Throttled requests return HTTP `429`, `AUTH_RATE_LIMITED`, and `Retry-After`.
- Known and unknown identities receive the same generic invalid-credential response.
- A successful login clears only that identity's counters; it cannot erase the shared IP failure window.
- Failed-login audit recording uses an independent transaction so rollback of authentication does not remove the event.
- Administrators with `ACCOUNT_MANAGE` may unlock an account with an audit reason.

## Password Handling

- BCrypt hashes are the only stored password representation.
- User-chosen passwords are 12–128 characters and contain at least one letter and one number.
- Server-generated temporary passwords contain 20 characters and are returned once.
- Administrative creation/reset credentials expire after 24 hours; student enrollment credentials expire after 72 hours.
- Every temporary credential sets `must_change_password`. Existing forced-change student accounts are grandfathered with no artificial expiry.
- Every authenticated role uses `/account/security` for password changes and session management. Forced-change users cannot enter a portal until the password is replaced.

## Delegated Administration and RBAC

- `ACCOUNT_MANAGE` controls account directory, credentials, links, status, unlocks, sessions, and security activity.
- `RBAC_MANAGE` controls the full role/permission catalog and permission mutations.
- `ACCOUNT_ADMIN` contains only `ACCOUNT_MANAGE` and receives no automatic user assignment.
- `SUPER_ADMIN` contains both security permissions.
- Account Admins may view protected accounts but cannot mutate `SUPER_ADMIN` or `ACCOUNT_ADMIN` accounts and receive a safe role catalog without protected roles.
- Only Super Admins may assign/remove `ACCOUNT_ADMIN`; `SUPER_ADMIN` remains assignable only by another Super Admin.
- Self-deactivation, self-demotion, and loss of the last active Super Admin are rejected.
- `SUPER_ADMIN`, `ACCOUNT_ADMIN`, `ACCOUNT_MANAGE`, and `RBAC_MANAGE` are migration-managed and cannot be changed through ordinary role-permission editing.
- Account and role updates use optimistic versions and return `STALE_ACCOUNT` or `STALE_ROLE` on conflict.

## Linked Identity Rules

- An account is exactly one of `SYSTEM`, `FACULTY`, or `STUDENT`; faculty and student links cannot coexist.
- Faculty/student records are authoritative for linked name and email.
- Linked fields are read-only in Users & Accounts and future domain updates synchronize the account in the same transaction.
- Student identity and the `STUDENT` role are system-managed.
- V23 preserves existing mismatches. Super Admins may reconcile them after resolving any `IDENTITY_EMAIL_CONFLICT`.

## Endpoint Protection

Only login and refresh are anonymous. Account APIs require `ACCOUNT_MANAGE`; `/roles`, `/permissions`, and permission mutation require `RBAC_MANAGE`; identity conflict/reconciliation also requires `SUPER_ADMIN`. Portal ownership helpers remain authoritative for faculty assignments and student-owned data.

## Deferred Security Work

- TOTP MFA and email recovery are out of scope for V23.
- Local fallback database credentials and JWT secrets must be replaced before production.
- Bearer tokens remain accessible to frontend JavaScript, so XSS prevention and HTTPS deployment remain required.

## Related Notes

- [[Users and Accounts]]
- [[Authentication Data Dictionary]]
- [[Authentication Endpoints]]
- [[User Roles]]
- [[ADR-005 Delegated Account Administration and Immediate Session Revocation]]
