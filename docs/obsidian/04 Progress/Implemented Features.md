# Implemented Features

## Authentication and Administration

- [x] Session-bound JWT login, SHA-256 refresh rotation, logout, current-user context, and immediate revocation
- [x] BCrypt passwords, 12–128 policy, generated expiring temporary credentials, and forced shared security-center change
- [x] Unified account directory, protected delegated account administration, RBAC separation, status/reset/unlock/session/activity, and linked identity reconciliation
- [x] Persistent known-identity/IP login protection and durable failed-login audit
- [x] Permission-aware frontend routing plus backend method authorization
- [x] Searchable audit logs

## Academic Setup

- [x] Department, program, course, faculty, room, school-year, semester, and section workflows
- [x] Curriculum versioning, course links, prerequisites/corequisites, checklist, and activation
- [x] Draft activation/revision/cancel/archive scheduling lifecycle with meeting-level rooms/components/modes, scoped views, history, teaching loads, atomic term copy, and database-enforced resource conflicts
- [x] Grading scale and weighted template configuration

## Student Records and Enrollment

- [x] Student profiles with nested details, academic assignment, search, and status
- [x] Student document upload metadata and verification
- [x] Administrative draft/validate/confirm/cancel enrollment workflow
- [x] Student draft/select/validate/submit enrollment workflow with term-window enforcement

## Finance and Grading

- Controlled Finance suite: derived assessment ledgers, independent approvals, refunds/reversals, cancellation resolution, installments, managed OR series, cashier sessions/closeout, reports/exports, and student-owned receipt PDFs.

- [x] Fee setup and itemized assessment generation/recalculation
- [x] Payments, unique official receipts, balances, and controlled voids
- [x] Gradebook items, scores, overrides, computation, submit/review/approve/lock
- [x] Locked academic records and grade-correction workflow

## Faculty Portal

- [x] Dashboard, assigned classes/rosters, schedule, profile, and security
- [x] Class attendance, gradebook, announcements, and materials
- [x] Advising list/notes and locked-grade correction requests

## Student Portal

- [x] Dashboard, profile, enrollment, schedule, academics, attendance, and finance
- [x] Announcements, class materials, forms, service requests, and fulfillment downloads
- [x] Registrar portal settings, announcements, forms, request handling, and enrollment returns

## Reports and Tests

- [x] PDF student, enrollment, assessment, receipt, class, grade-sheet, and grade-slip reports
- [x] Backend unit/integration suite: 108 passed, plus direct PostgreSQL V20→V23 migration/API smoke when four Testcontainers tests were locally skipped
- [x] Frontend TypeScript production build
- [x] PostgreSQL V20→V22 scheduling backfill and competing-reservation transaction tests
- [x] Focused Users & Accounts Playwright suite: 6 passed, including 375 px security center

## Related Notes

- [[MVP Dashboard]]
- [[MVP Completion Checklist]]
- [[Known Issues]]
- [[Scheduling]]
- [[Users and Accounts]]
