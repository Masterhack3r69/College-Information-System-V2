# In Progress

## Scheduling Operational Upgrade

### Completed

- V21–V22 schema/backfill, meeting revisions, history, reservations, load policies, section/room profiles, permission cleanup, and optimistic versions.
- Draft/activate/revise/cancel/archive lifecycle, scoped reads, resource deactivation guards, capacity/load rules, timetable views, and atomic term copy.
- Administrative planner plus section, faculty-load, room, history, policy, and copy views.
- Faculty/student term schedule and five-change views with meeting-level rooms and Sunday.
- Representative V20 migration test, two-transaction exclusion test, backend regressions, frontend typecheck/build, clean Docker Flyway/Hibernate startup, and authenticated API smoke.

### Remaining

- Extend the focused cross-role Playwright suite into a seeded live-stack multi-account run.
- Remove the compatibility top-level schedule room after one consumer-migration release.

### Related

- [[Scheduling]]
- [[Scheduling Test Cases]]
- [[ADR-004 Schedule Revisions and Resource Reservations]]

## Cross-Role MVP Verification

### Current State

The backend and frontend production gates pass for the scheduling slice, and the development schema is at V22. Focused academic-exception and scheduling desktop/mobile browser checks pass; full cross-account lifecycle automation remains incomplete.

### Completed

- Backend tests for auth administration, audit, curriculum, scheduling, enrollment, fees, grades, reports, and portal ownership helpers.
- Academic-setup Playwright specifications and helper structure exist.
- Live PostgreSQL API smoke flows for evaluation → grouped match → Registrar approval → posted credit, policy create/list, graduation audit, and cancellation readiness.

### Remaining

- Run a fresh full Playwright suite against the current seeded stack.
- Add end-to-end coverage for Registrar, Dean, Program Head, cashier, faculty, and student lifecycle boundaries.
- Add an automated concurrent final-seat confirmation test.
- Add multi-thread PostgreSQL Finance tests and a full cross-role browser suite.
- Resolve the current ESLint errors and warnings.

### Blockers

- Docker Desktop 29 requires `-Dapi.version=1.44` for Testcontainers 1.20.4; the PostgreSQL tests run with that compatibility setting.

## Enrollment and Academic Exceptions Upgrade

### Completed

- Enrollment hardening: permission cleanup, duplicate-course/corequisite/credit-aware prerequisite checks, mixed-year loads, seat locks, history, return-to-draft, cancellation readiness, and policy enforcement.
- Unified academic evaluation and immutable credit/reversal workflow for transfer, shifting, second-degree, and migration cases.
- Academic plan, explicit migration impact, eligibility policy snapshots, elective groups, and persisted academic graduation audit.
- Registrar, academic reviewer, student-detail, student enrollment/academics, and setup frontend surfaces.
- V18–V20 clean migration on the development PostgreSQL database, full backend suite, frontend build, live API smoke, and focused responsive browser checks.

### Remaining

- Institutional configuration/approval of probation, leave, equivalency, migration, and elective policies.
- Automated cross-account browser suite and final-seat race test.
- Separate future modules for admissions, special/non-degree study, international compliance, bridging plans, readmission administration, and institutional graduation clearance.

### Related

- [[Academic Exceptions]]
- [[Enrollment]]
- [[ADR-003 Unified Academic Evaluation and Credit Posting]]

## Finance Modernization Verification

### Completed

- V16 schema, RBAC, locked ledger services, workflows, administrative/student UI, clean PostgreSQL migration, core service tests, and production frontend build.
- V17 Finance reset applied to the development database with the representative college fee catalog.

### Remaining

- Automated concurrent mutation tests, full permission matrix, representative V15 data migration fixture, PDF content assertions, and browser regression flows.
- Institution-approved replacement or sign-off for the representative fee amounts before production.

### Related

- [[Finance Modernization]]
- [[Finance Test Cases]]
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
