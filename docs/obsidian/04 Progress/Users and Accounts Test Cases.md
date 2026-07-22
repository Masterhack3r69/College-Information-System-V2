# Users and Accounts Test Cases

## Automated Backend

- [x] Account Admin versus Super Admin protected-account boundaries.
- [x] Protected-role escalation denial, self-deactivation/demotion denial, and last-active-Super-Admin invariant.
- [x] Student account/role immutability and faculty/student identity synchronization conflicts.
- [x] 20-character temporary credential generation, 24/72-hour expiry, BCrypt storage, forced change, and chosen-password policy.
- [x] Known-user five-failure lock, IP twenty-failure throttle, generic errors, identity-only success reset, unlock, and independently committed failed-login audit.
- [x] Refresh-token SHA-256 hashing, stable row rotation, JWT session/security-version claims, single/revoke-all invalidation, and retention cleanup query.
- [x] Optimistic account/role conflicts and audit-reason requirements.

## Migration and Live PostgreSQL

- [x] V22→V23 migration fixture preserves users, roles, links, assignments, audit history, mismatches, and existing refresh compatibility.
- [x] Persisted development database upgraded V20→V23 after archiving 94 legacy `ACTIVE` schedules belonging to inactive school years; a pre-upgrade custom-format backup was retained.
- [x] All 271 existing refresh values became 64-character SHA-256 hashes in place.
- [x] V23 retained 25 users, 25 user-role links, and 613 pre-smoke audit rows; created 10 total roles and no `ACCOUNT_ADMIN` assignment.
- [x] Flyway validated 23 migrations and Hibernate validated the V23 schema on Docker startup.

## Frontend and Browser

- [x] Super Admin create flow and one-time credential acknowledgement.
- [x] Account Admin protected/read-only behavior and absence of RBAC workspaces.
- [x] Super Admin role/permission and identity-conflict workspaces.
- [x] Unauthorized account-directory denial.
- [x] Forced-change routing and shared Account Security at 375 px with no horizontal overflow.
- [x] Login `Retry-After` countdown without identity disclosure.
- [x] Live Docker Super Admin directory/security-center desktop and 375 px checks with no console warnings/errors.

## Validation Evidence

- `mvn clean test`: 108 tests, 0 failures, 0 errors, 4 PostgreSQL tests skipped because local Testcontainers named-pipe discovery was unavailable.
- Direct Docker V20→V23 migration and authenticated API smoke replace the skipped local migration execution evidence.
- `npm run build`: passed; existing main-chunk size warning remains.
- Targeted ESLint for changed account/security files: passed.
- `npx playwright test e2e/specs/users-accounts.spec.ts`: 6 passed.

## Remaining Coverage

- [ ] Add a persisted browser account carrying `ACCOUNT_ADMIN` for a full live-stack delegated-admin flow; current boundary proof uses backend tests and deterministic browser fixtures.
- [ ] Run the repository-wide legacy Playwright suite after unrelated stored academic-setup artifacts are refreshed.

## Related Notes

- [[Users and Accounts]]
- [[Authentication and Roles]]
- [[ADR-005 Delegated Account Administration and Immediate Session Revocation]]
