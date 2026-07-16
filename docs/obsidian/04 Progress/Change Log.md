# Change Log

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
