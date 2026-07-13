# In Progress

## Cross-Role MVP Verification

### Current State

Backend service/security tests pass and the frontend builds. Existing Playwright suites concentrate on academic setup and leave portal lifecycles less covered.

### Completed

- Backend tests for auth administration, audit, curriculum, scheduling, enrollment, fees, grades, reports, and portal ownership helpers.
- Academic-setup Playwright specifications and helper structure exist.

### Remaining

- Run a fresh full Playwright suite against the current seeded stack.
- Add end-to-end coverage for registrar, cashier, faculty, and student lifecycle boundaries.
- Verify PostgreSQL `V1`–`V15` in Testcontainers with Docker available.
- Resolve the current ESLint errors and warnings.

### Blockers

- Docker was unavailable to the latest migration test.
- E2E execution requires a running configured stack and known test state.

## Faculty Navigation Completion

### Current State

Attendance, class content, and reports are available from class workspaces, but the top-level portal routes redirect to `/faculty/classes`.

### Completed

- Assigned class list and workspace.
- Backend attendance/content/report endpoints and permissions.

### Remaining

- Confirm whether dedicated index pages are an MVP requirement.
- If required, implement pages without changing ownership rules.

### Blockers

- Product expectation is not documented.

## Deployment Hardening

### Current State

The stack runs through Docker Compose with local files and environment-driven configuration.

### Completed

- Container builds, PostgreSQL health check, Flyway, Nginx frontend, configurable CORS and storage roots.

### Remaining

- Production secrets, HTTPS, backups, durable storage, monitoring, and restore verification.

### Blockers

- Target hosting environment is not specified.

## Related Notes

- [[Known Issues]]
- [[MVP Completion Checklist]]
- [[MVP Decisions]]
