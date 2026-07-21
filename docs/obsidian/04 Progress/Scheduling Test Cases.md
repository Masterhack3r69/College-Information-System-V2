# Scheduling Test Cases

## Migration and Database

- [x] Clean PostgreSQL applies V1–V22 and Hibernate validates.
- [x] Representative V20 schedule upgrades without changing schedule ID or top-level room.
- [x] Existing meetings receive room, component, delivery, revision, and active/effective fields.
- [x] Used section capacity backfills; unused legacy section remains unconfigured.
- [x] Duplicate open offerings are rejected.
- [x] Two competing reservation transactions produce exactly one success.
- [x] Scheduling permissions are granted only to Super Admin/Registrar for mutation actions.

## Lifecycle and Validation

- [x] Create/PUT accept drafts only.
- [x] Activation checks inactive/incomplete resources, capacities, intra-request overlap, duplicate offering, and conflicts.
- [x] Sunday and online meetings work; online room is rejected.
- [x] Active revision preserves ID, retires old meetings, records reason, and advances version.
- [x] Stale version is rejected.
- [x] Faculty change after submission and all revision after lock are blocked.
- [x] Teaching-load warning requires permission, acknowledgement, and reason.
- [x] Active resource deactivation is blocked.
- [x] Term copy preview reports blockers and execution is atomic.

## Cross-Module Regression

- [x] Enrollment confirmed-seat behavior.
- [x] Gradebook ownership and status behavior.
- [x] Reports and Finance schedule quantities.
- [x] Archived schedule identity remains available to historical relationships.
- [x] Faculty confirmed counts exclude non-confirmed enrollment.

## Frontend and Portal

- [x] TypeScript typecheck and production build.
- [x] Focused Playwright coverage for Registrar revision/copy, Dean read-only scope, Faculty assigned schedule/change log, Student confirmed schedule/change log, Sunday, and mobile overflow.
- [x] Authenticated Registrar-equivalent smoke: draft → activate → revise → history.
- [x] Desktop and narrow-layout manual browser verification of the scheduling workspace.
- [x] Faculty/student term selector, Sunday rendering, meeting-level locations, and five-change components are implemented.

## Related Notes

- [[Scheduling]]
- [[Known Issues]]
- [[ADR-004 Schedule Revisions and Resource Reservations]]
