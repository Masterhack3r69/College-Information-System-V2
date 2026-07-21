# MVP Dashboard

## Current Status

The College Student Information System is a working full-stack MVP under active development. [[Scheduling]] is operational through PostgreSQL Flyway V22 with stable schedule identity, meeting-level components/locations, controlled revisions, database-safe resource reservations, scoped views, teaching loads, term copy, and in-app history. Finance modernization is implemented through V17; enrollment and [[Academic Exceptions]] through V20. The clean backend suite passes 100 tests with no skips, the frontend production build passes, and a clean Docker database applied and Hibernate-validated V1–V22.

## Current Development Focus

- Complete end-to-end verification across registrar, cashier, faculty, and student workflows.
- Extend the passing focused scheduling Playwright suite into a seeded live-stack multi-account run.
- Add automated multi-thread PostgreSQL and browser regression coverage for [[Finance Modernization]].
- Add automated cross-account academic-evaluation and concurrent final-seat confirmation coverage.
- Configure institution-approved probation, leave, equivalency, migration, and elective policies.
- Harden deployment, secrets, file storage, and operational setup.
- Replace generic faculty navigation redirects with dedicated attendance, content, and report views where needed.
- Address frontend bundle size and stale project documentation.

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

## Partially Implemented Modules

- Faculty attendance, content, and reports work inside class workspaces, but their top-level routes redirect to the class list.
- Focused enrollment/academic desktop and mobile checks pass; full cross-role lifecycle automation is incomplete.
- Admissions, special/non-degree, international compliance, bridging plans, readmission administration, and institutional graduation clearance remain separate future modules.
- Deployment is local Docker Compose rather than production-hardened hosting.

## Main Blockers

- Testcontainers on Docker Desktop 29 requires API compatibility `-Dapi.version=1.44`; with it, V20 upgrade and reservation-race tests run successfully.
- Existing Playwright artifacts record academic-setup failures and require a fresh configured E2E run to determine current status.
- Frontend lint currently reports 42 errors and 9 warnings.
- Default development credentials and fallback JWT/database values must not be used in production.

## MVP Completion Summary

Core records, setup, operational scheduling, hardened enrollment, academic exceptions/credits, controlled finance, gradebook, portals, report, audit, and user administration exist. Remaining MVP work is primarily institutional policy configuration, integrated cross-role automation, deferred admissions/compliance modules, and security/deployment hardening.

## Important Notes

- [[MVP Overview]]
- [[MVP Scope]]
- [[Implemented Features]]
- [[In Progress]]
- [[Known Issues]]
- [[MVP Completion Checklist]]
