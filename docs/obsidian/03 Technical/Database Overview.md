# Database Overview

PostgreSQL 16 is the production/development database. Flyway migrations `V1` through `V17` are the physical schema and development-seed source of truth.

| Entity group | Purpose | Main relationships | Status |
|---|---|---|---|
| Users, roles, permissions, refresh tokens | Identity, RBAC, token lifecycle | Users ↔ roles ↔ permissions; user may link faculty/student | Implemented |
| Departments, programs, courses, faculty | Academic master data | Programs/courses/faculty belong to departments | Implemented |
| School years, semesters, curricula, sections | Academic structure and term placement | Curriculum belongs to program; sections reference curriculum and term | Implemented |
| Class schedules, meetings | Offer courses to sections | Course, section, faculty, room, school year, semester | Implemented |
| Students and profile tables | Personal, contact, family, education, documents | Student references program/curriculum/term; nested one-to-one/one-to-many data | Implemented |
| Enrollments, subjects, status history | Term enrollment and class selection | Student/term/section plus scheduled subjects | Implemented |
| Finance ledgers and controls | Assessments, payments, adjustments, cancellation, refunds, installments, receipt series, and cashier sessions | Immutable transactions converge through the locked assessment; session/series link cash accountability | Implemented |
| Gradebooks, items, scores, grades, academic records | Weighted computation and permanent records | Gradebook belongs to schedule; scores/grades link enrolled subjects | Implemented |
| Attendance, class content, advising | Faculty-owned class operations | All restricted through class schedule or assignment | Implemented |
| Portal settings, announcements, forms, requests | Student portal configuration and self-service | Settings use term; requests belong to student | Implemented |
| Audit logs, generated reports | Traceability and report metadata | Reference users and domain entity identifiers | Implemented |

## Key Constraints

- UUID primary keys and foreign keys are used throughout.
- Unique codes/numbers protect master data, students, receipts, and account links.
- Check constraints enforce state and amount consistency for payments, grading, attendance, portal content, and requests.
- Status history tables preserve enrollment, gradebook, attendance, and request transitions.
- `assessments.version` provides optimistic conflict detection while mutation services take a pessimistic row lock.
- Financial request/disbursement UUIDs are unique for idempotency; legacy payment linkage remains nullable.
- Fee-rule identical scopes use PostgreSQL null-aware uniqueness.
- V17 performs an intentional development-only Finance reset and seeds a representative fee catalog for active school years.

## Related Notes

- [[Backend Structure]]
- [[Academic Setup]]
- [[Enrollment]]
- [[Finance Data Dictionary]]
