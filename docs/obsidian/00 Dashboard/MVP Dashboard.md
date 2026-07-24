# MVP Dashboard

## Current Status

The College Student Information System is a working full-stack MVP under active development. [[Users and Accounts]] is operational through PostgreSQL Flyway V23 with protected delegated administration, canonical linked identities, generated temporary credentials, persistent login protection, hashed stable sessions, and immediate revocation. [[Scheduling]] remains operational through V22; Finance modernization through V17; enrollment and [[Academic Exceptions]] through V20. The clean backend suite passes 108 tests with four local Testcontainers skips, direct Docker upgraded the persisted V20 database through V23, and the frontend now uses the shared [[Frontend Design System]] across administrative, faculty, and student portals, including consistent icon-free page tabs. Production build, targeted changed-file lint, focused browser flows, and responsive Students/modal QA pass.

## Current Development Focus

- Complete end-to-end verification across registrar, cashier, faculty, and student workflows.
- Add a persisted `ACCOUNT_ADMIN` live browser account and define the later MFA/email-recovery security phase.
- Extend the passing focused scheduling Playwright suite into a seeded live-stack multi-account run.
- Add automated multi-thread PostgreSQL and browser regression coverage for [[Finance Modernization]].
- Add automated cross-account academic-evaluation and concurrent final-seat confirmation coverage.
- Configure institution-approved probation, leave, equivalency, migration, and elective policies.
- Harden deployment, secrets, file storage, and operational setup.
- Replace generic faculty navigation redirects with dedicated attendance, content, and report views where needed.
- Address frontend bundle size and stale project documentation.
- Continue migrating legacy native selects and isolated page composition to [[Frontend Design System]] primitives when those workflows are touched.

## Working Modules

- [[Student Records]]
- [[Academic Setup]]
- [[Scheduling]]
- [[Enrollment]]
- [[Academic Exceptions]]
- [[Grading]]
- [[Billing]]
- [[Faculty Portal]]
- [[Student Portal]]
- [[Users and Accounts]]

## Partially Implemented Modules

- Faculty attendance, content, and reports work inside class workspaces, but their top-level routes redirect to the class list.
- Focused enrollment/academic desktop and mobile checks pass; full cross-role lifecycle automation is incomplete.
- Admissions, special/non-degree, international compliance, bridging plans, readmission administration, and institutional graduation clearance remain separate future modules.
- Deployment is local Docker Compose rather than production-hardened hosting.

## Main Blockers

- Local Testcontainers named-pipe discovery is unavailable in the latest run, so four PostgreSQL tests skip; direct persisted Docker migration and API smoke passed.
- Existing Playwright artifacts record academic-setup failures and require a fresh configured E2E run to determine current status.
- Changed Users & Accounts files pass targeted lint; repo-wide legacy lint debt remains to be cleared.
- Default development credentials and fallback JWT/database values must not be used in production.

## MVP Completion Summary

Core records, setup, operational scheduling, hardened enrollment, academic exceptions/credits, controlled finance, gradebook, portals, reports, audit, and protected account administration exist. Remaining MVP work is primarily institutional policy configuration, integrated cross-role automation, deferred admissions/compliance modules, MFA/recovery policy, and deployment hardening.

## Important Notes

- [[MVP Overview]]
- [[MVP Scope]]
- [[Implemented Features]]
- [[In Progress]]
- [[Known Issues]]
- [[MVP Completion Checklist]]
