# Authentication and Roles

## Login Flow

1. `POST /api/v1/auth/login` accepts username/email and password.
2. Spring Authentication validates the BCrypt password and active user.
3. The backend returns a short-lived access JWT, a persisted refresh token, and user/portal/permission context.
4. The frontend holds the access token in memory and refresh token in `sessionStorage`.
5. On one `401`, the API client calls `POST /api/v1/auth/refresh`, rotates the refresh token, and retries.
6. Logout revokes the submitted refresh token.

## Password Handling

- BCrypt hashes are stored; plaintext passwords are not stored.
- Faculty and student password changes require the current password and enforce at least eight characters with a letter and number.
- Student provisioning can create initial accounts with `must_change_password`; the frontend forces the password page.
- Administrative password reset is permission-protected and audited.

## Role Enforcement

- `@PreAuthorize` checks named permissions on controllers.
- `FacultyPortalAccess` validates the linked faculty record and assigned schedule/adviser ownership.
- `StudentPortalAccess` derives the linked student and validates enrollment/request ownership.
- The frontend guards routes and filters navigation, but backend checks remain authoritative.
- Finance separates routine posting/session operation from request, approval, disbursement, receipt/template setup, closeout, and reporting permissions. Separation-of-duties checks also compare actor IDs in the service transaction.

See [[User Roles]] for the seeded role matrix.

## Protected Endpoints

Only `/api/v1/auth/login` and `/api/v1/auth/refresh` are anonymous. All other requests require authentication; permission-specific endpoints add method security.

## Known Security Gaps

- Default fallback database credentials and JWT secret exist for local development; production must override them.
- Access tokens live in JavaScript memory and refresh tokens in `sessionStorage`, so XSS prevention remains important.
- CSRF is disabled because the API uses bearer tokens rather than cookie authentication.
- No verified rate limiting, MFA, HTTPS termination, or production secret manager is present.

## Related Notes

- [[User Roles]]
- [[Faculty Portal]]
- [[Student Portal]]
