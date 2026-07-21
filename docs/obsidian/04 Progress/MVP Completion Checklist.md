# MVP Completion Checklist

## Project Setup

- [x] Maven backend and Vite frontend builds are configured.
- [x] Docker Compose defines PostgreSQL, backend, frontend, and Redis.
- [ ] Decide whether Redis belongs in the MVP stack.

## Authentication

- [x] Login, refresh rotation, logout, and current-user endpoints.
- [x] BCrypt password handling and forced student password change.
- [ ] Replace all local defaults with production secrets before deployment.

## User Roles

- [x] Backend permissions and frontend guards for active workflows.
- [x] Seed scoped academic-evaluation and graduation-audit permissions for `PROGRAM_HEAD`.
- [ ] Verify desired `READ_ONLY_STAFF` frontend experience.

## Student Records

- [x] Profiles, nested data, documents, verification, status, and records view.
- [ ] Confirm whether a separate admissions workflow is required for MVP.

## Academic Setup

- [x] Master data, curriculum, schedules, conflicts, and grading setup.
- [x] Eligibility policies and elective requirement groups.
- [ ] Rerun academic-setup E2E suite against current code.

## Enrollment

- [x] Administrative draft, validation, confirmation, cancellation, and history.
- [x] Student self-service draft and submission with enrollment window.
- [x] Mixed-year back subjects, approved-credit prerequisites, corequisites, policy gates, seat locks, history, return-to-draft, and cancellation readiness.
- [ ] Add full student-submit → registrar-confirm E2E coverage.

## Academic Exceptions

- [x] Unified transfer, shifting, second-degree, and curriculum-migration evaluation workflow.
- [x] Department-scoped grouped equivalency review and Registrar credit posting.
- [x] Derived academic plan, posted credit reversal, explicit migration impact, and persisted graduation audit.
- [ ] Add automated cross-account role/browser coverage and final-seat race test.

## Grading

- [x] Weighted gradebook and submit/review/approve/lock workflow.
- [x] Academic records and grade-correction workflow.
- [ ] Add cross-role grade workflow browser tests.

## Billing

- [x] Fee setup, assessments, payments, receipts, balances, and voids.
- [ ] Add cashier lifecycle browser tests.

## Faculty Portal

- [x] Assigned classes, attendance, gradebook, content, advising, profile, corrections.
- [ ] Decide on dedicated attendance/content/report index pages.
- [ ] Add faculty portal browser tests.

## Student Portal

- [x] Enrollment, schedule, academics, finance, content, requests, profile, security.
- [x] Registrar portal administration.
- [x] Academic plan, credits, pending evaluations, and graduation-audit summaries.
- [ ] Add student portal browser tests.

## Validation

- [x] Bean Validation, frontend form validation, and business-rule exceptions.
- [ ] Verify all portal forms expose server field errors consistently.

## Security

- [x] Stateless JWT authentication, permission checks, and ownership helpers.
- [ ] Add production HTTPS, secret management, rate limiting decision, and security review.

## Testing

- [x] Backend suite passes: 100 tests, 0 failures/errors/skips, including Testcontainers PostgreSQL coverage.
- [x] Frontend production build passes.
- [ ] Fix frontend lint: 42 errors and 9 warnings in the latest run.
- [x] Apply and validate Flyway V1–V22 against the live PostgreSQL 16 Docker Compose database.
- [x] Run local Testcontainers on Docker Desktop 29 with `-Dapi.version=1.44`.
- [x] Run focused desktop and 375 px browser checks for enrollment academic and scheduling surfaces with no console errors.
- [ ] Run and stabilize full Playwright suite.

## Deployment

- [x] Local Docker Compose deployment.
- [ ] Define production target, backups/restore, durable file storage, monitoring, and HTTPS.

## Documentation

- [x] MVP Obsidian vault reflects verified code through V20 as of 2026-07-16.
- [ ] Keep notes synchronized as remaining items are implemented.

## Related Notes

- [[MVP Dashboard]]
- [[In Progress]]
- [[Known Issues]]
