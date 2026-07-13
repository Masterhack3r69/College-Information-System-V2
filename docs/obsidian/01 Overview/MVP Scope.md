# MVP Scope

## Included in MVP

- Authentication, refresh, logout, current-user context, roles, permissions, and account administration.
- Academic setup: departments, programs, courses, curricula, faculty, rooms, school years, semesters, sections, schedules, grading scales, and grading templates.
- Student records and document verification.
- Registrar and student enrollment workflows.
- Fee setup, assessments, payments, receipts, and voids.
- Gradebooks, review, approval, locking, academic records, and correction requests.
- Faculty portal and student portal workflows.
- PDF reports and audit-log capture/search.

## Partially Included

- Integrated E2E lifecycle tests across portals and administrative roles.
- Dedicated top-level faculty attendance, content, and report pages; the current routes redirect to classes where these features are available per class.
- Production operations: durable object storage, backups, HTTPS, monitoring, and hardened secret management.
- Dashboard depth: faculty and student dashboards exist; the administrative `/admin` route currently redirects to enrollment.

## Excluded from MVP

- Microservices and high-availability infrastructure.
- Native mobile applications.
- Advanced analytics or AI features.
- Enterprise-grade storage and background processing.

## Future Features

- Production hosting and backup procedures.
- Broader automated portal E2E tests.
- Smaller frontend bundles and additional route-level code splitting.
- Dedicated faculty section-level index pages if required after MVP validation.

Admissions is not implemented as a separate module. Initial student creation is handled in [[Student Records]], and no `Admissions.md` note is created to avoid documenting a nonexistent module.

## Related Notes

- [[MVP Completion Checklist]]
- [[In Progress]]
- [[Student Records]]

