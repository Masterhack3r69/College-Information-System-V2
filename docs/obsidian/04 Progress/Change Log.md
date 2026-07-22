# Change Log

## 2026-07-22

### Added

- V23 protected delegated account administration with `ACCOUNT_MANAGE`, `RBAC_MANAGE`, migration-managed `ACCOUNT_ADMIN`, optimistic user/role versions, persistent login protection, and linked-identity reconciliation.
- SHA-256 stable session records with user-agent/IP evidence, seven-day idle/30-day absolute expiry, session/security-version access JWT claims, immediate revocation, and scheduled retention cleanup.
- Server-generated 20-character one-time credentials, 24/72-hour expiry, shared `/account/security`, unified directory/detail workspaces, protected RBAC, identity conflicts, and login-throttle countdowns.
- Account-security backend regressions and six focused Super Admin/Account Admin/unauthorized/student browser tests.

### Changed

- `USER_MANAGE` is renamed in place to `ACCOUNT_MANAGE`; full role/permission APIs now require `RBAC_MANAGE`.
- Faculty/student records are authoritative for linked account name/email, and linked fields are read-only in Users & Accounts.
- User-chosen passwords are standardized at 12–128 characters with a letter and number; all forced-change users route through the shared security center.
- The shadcn sidebar inset and security center now contain wide content without page-level horizontal overflow.

### Fixed

- Self-deactivation/demotion, last-Super-Admin removal, protected-role escalation, stale account/role overwrites, plaintext refresh storage, lingering access after revocation, and rollback-lost failed-login audits.
- V20 rollout was unblocked by archiving 94 legacy active schedules belonging to inactive school years after a full pre-upgrade backup; no schedule rows or downstream links were deleted.

### Documentation

- Added [[Users and Accounts]], [[Authentication Data Dictionary]], [[Authentication Endpoints]], [[Users and Accounts Test Cases]], and [[ADR-005 Delegated Account Administration and Immediate Session Revocation]].
- Updated [[Authentication and Roles]], [[User Roles]], [[Database Overview]], [[Backend Structure]], [[Frontend Structure]], [[Implemented Features]], [[In Progress]], and [[MVP Dashboard]].

## 2026-07-21

### Added

- V21–V22 meeting-level scheduling, room/section profiles, optimistic schedule versions, JSONB change history, exclusion-protected resource reservations, and term/faculty-type load policies.
- Draft activation, controlled active revision, reasoned cancel/archive, scoped timetable/load/availability/history APIs, atomic term copy, stable business codes, and resource-deactivation guards.
- Administrative scheduling planner/history/load/policy/copy workspace plus faculty/student term schedules and five-change views.
- Representative V20 migration/backfill, two-transaction reservation-race tests, and focused Registrar/Dean/Faculty/Student scheduling Playwright coverage.

### Changed

- Schedule identity is preserved after publication; revisions retire meetings and retain downstream enrollment, attendance, gradebook, report, and Finance relationships.
- Schedule reads are server-scoped by role/department/assignment/ownership; mutation permissions belong only to Registrar and Super Admin.
- Faculty class/student counts use confirmed enrollment, and portal schedules use meeting-level locations with Sunday support.

### Fixed

- Application-only conflict races, stale meeting-only revisions that did not advance the schedule version, online-only request compatibility, active-resource deactivation, and top-level room assumptions.

### Documentation

- Added [[Scheduling]], [[Scheduling Endpoints]], [[Scheduling Data Dictionary]], [[Scheduling Test Cases]], and [[ADR-004 Schedule Revisions and Resource Reservations]].
- Updated [[Academic Setup]], [[Enrollment]], [[Faculty Portal]], [[Student Portal]], [[Authentication and Roles]], [[Database Overview]], [[Known Issues]], [[In Progress]], and [[MVP Dashboard]].

## 2026-07-16

### Added

- V18–V20 enrollment hardening, academic evaluations, grouped equivalencies, immutable course credits/reversals, academic plans, eligibility policies/approvals, elective groups, and graduation audits.
- Registrar/Super Admin evaluation management, department-scoped Dean/Program Head review queue, student academic-exception detail, student enrollment/academic surfaces, and eligibility/elective setup.
- `SECOND_DEGREE` admission origin and explicit curriculum-migration impact/approval workflow.
- Interactive administrative academic-term selector with per-user session persistence and shared module defaults.

### Changed

- Administrative enrollment records are limited to Registrar and Super Admin; academic reviewers use dedicated scoped permissions.
- Enrollment confirmation locks schedules and recounts seats; prerequisites use internal passed records plus approved credits; corequisites and duplicate courses are enforced.
- Only `REQUIRED` courses are individually mandatory. Flexible student types may combine valid lower/current-year curriculum courses.
- Probation and leave fail closed without configured policies; required approval creates a per-enrollment policy snapshot.
- Student academics now distinguishes internal grades, posted credits, pending evaluations, deficiencies, and audit results.
- Enrollment and scheduling term filters now stay synchronized with the administrative header; Finance, grading, and policy pages inherit the selected working term.

### Fixed

- Self-counting capacity validation, duplicate course selection across schedules, missing corequisite checks, optional/elective mandatory-load errors, unguarded cancellation after academic activity, stale equivalency decisions after a returned case, hard-coded enrollment history, broken student-list profile navigation, and the inert `Current academic term` header placeholder.

### Documentation

- Added [[Academic Exceptions]] and [[ADR-003 Unified Academic Evaluation and Credit Posting]].
- Updated [[Enrollment]], [[Student Records]], [[Academic Setup]], [[Student Portal]], [[User Roles]], [[Database Overview]], [[Known Issues]], [[MVP Completion Checklist]], [[In Progress]], and [[MVP Dashboard]].
- Recorded admissions, special/non-degree, international compliance, bridging administration, readmission administration, and institutional graduation clearance as separate future scope.

## 2026-07-15

### Added

- Finance Manager role, granular permissions, immutable adjustment/refund/cancellation ledgers, installments, managed receipt series, cashier sessions, approval queue, reports, and student receipt access.
- Representative 15-item college fee catalog with active-year rules, BSIT overrides, and year-level charges.

### Changed

- Payments now require idempotency IDs, an open session, and server-allocated OR numbers; assessments derive gross/refund/net/balance/credit totals under lock.
- Enrollment cancellation now requires resolved Finance state when an assessment exists.
- Fee selection uses the enrollment year and most-specific rule per fee item.
- V17 intentionally resets all development Finance transactions and setup before installing the new fee catalog.

### Fixed

- Concurrent overpayment exposure, orphaned assessed-enrollment cancellation, mutable direct voiding, current-balance receipt output, and missing student receipt ownership checks.

### Documentation

- Updated [[Billing]], [[Enrollment]], [[Student Portal]], [[User Roles]], [[Database Overview]], [[Known Issues]], and [[MVP Dashboard]].
- Documented the V17 reset boundaries, seeded rates, and required production approval.
