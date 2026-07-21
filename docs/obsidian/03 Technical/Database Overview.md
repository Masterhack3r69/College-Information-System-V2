# Database Overview

PostgreSQL 16 is the production/development database. Flyway migrations `V1` through `V22` are the physical schema and development-seed source of truth.

| Entity group | Purpose | Main relationships | Status |
|---|---|---|---|
| Users, roles, permissions, refresh tokens | Identity, RBAC, token lifecycle | Users ↔ roles ↔ permissions; user may link faculty/student | Implemented |
| Departments, programs, courses, faculty | Academic master data | Programs/courses/faculty belong to departments | Implemented |
| School years, semesters, curricula, sections | Academic structure and term placement | Curriculum belongs to program; sections reference curriculum and term | Implemented |
| Class schedules, revised meetings, reservations, history, load policies | Plan and publish stable course offerings | Course, section, faculty, meeting room, term; exclusion-protected resources | Implemented |
| Students and profile tables | Personal, contact, family, education, documents | Student references program/curriculum/term; nested one-to-one/one-to-many data | Implemented |
| Enrollments, subjects, status history | Term enrollment and class selection | Student/term/section plus scheduled subjects | Implemented |
| Academic evaluations and course credits | Prior-study evidence, grouped equivalencies, review history, immutable posted credits, reversals, and document links | Case belongs to student/target curriculum; matches group source courses into target course; credit references approved case/match | Implemented |
| Eligibility policies and approvals | Standing-based enrollment gates, unit limits, and approval snapshots | Policy belongs to year/status and optional program; approval belongs to enrollment/policy/user | Implemented |
| Elective groups and graduation audits | Measurable elective completion and persisted academic audit results/issues | Groups own eligible curriculum-course rows; audits belong to student/curriculum | Implemented |
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
- `student_course_credits` has a partial unique index allowing only one active credit per student/target course; corrections create one reversal row.
- Evaluation source courses can participate in only one recommended match per case through service-level locked-case validation.
- Active eligibility policy scope uses a PostgreSQL expression/partial unique index so global `NULL` program scope is unique.
- Each elective curriculum row belongs to at most one requirement group.
- Schedule rows are pessimistically locked before final seat recount and enrollment confirmation.
- Open section/course offerings are unique; `class_schedules.version` rejects stale scheduling changes.
- Active room/faculty/section meeting ranges use PostgreSQL GiST exclusion constraints; meeting revisions/history retain effective and JSONB change evidence.
- `assessments.version` provides optimistic conflict detection while mutation services take a pessimistic row lock.
- Financial request/disbursement UUIDs are unique for idempotency; legacy payment linkage remains nullable.
- Fee-rule identical scopes use PostgreSQL null-aware uniqueness.
- V17 performs an intentional development-only Finance reset and seeds a representative fee catalog for active school years.
- V18 removes inappropriate academic-role enrollment grants and adds attendance/history indexes used by cancellation readiness.
- V19 adds academic evaluations, grouped matches, decision history, documents, course credits/reversals, and evaluation permissions.
- V20 adds elective groups, eligibility policies/approval snapshots, graduation audits/issues, and policy/audit permissions.
- V21 adds meeting-level components/delivery/rooms, capacity profiles, history, resource reservations, scheduling permissions, and optimistic versions.
- V22 adds term/faculty-type teaching-load policies.

## V21–V22 Scheduling Summary

See [[Scheduling Data Dictionary]] for field-level detail and [[ADR-004 Schedule Revisions and Resource Reservations]] for the concurrency decision.

## V19 Entity Summary

| Table | Purpose | Important constraints |
|---|---|---|
| `academic_evaluation_cases` | Stateful transfer/shift/second-degree/migration case | Checked type/status; migration requires source curriculum |
| `academic_evaluation_source_courses` | External/internal/credit evidence | Non-negative informational units |
| `academic_evaluation_matches` | One target-course recommendation | Unique case + target course |
| `academic_evaluation_match_sources` | Group one/many sources into a match | Composite primary key |
| `academic_evaluation_history` | Actor, reason, and state transition | Required actor and timestamp |
| `student_course_credits` | Approved completion ledger | Unique match; one active student + target course |
| `student_course_credit_reversals` | Immutable correction evidence | One reversal per credit |
| `academic_evaluation_document_links` | Existing student evidence links | Composite case + document key |

## V20 Entity Summary

| Table | Purpose | Important constraints |
|---|---|---|
| `curriculum_requirement_groups` | Course-count or unit-total elective rule | Exactly one measurement value |
| `curriculum_requirement_group_courses` | Eligible elective membership | One group per curriculum-course row |
| `enrollment_eligibility_policies` | Standing/year/program policy | One active scope; positive optional maximum |
| `enrollment_eligibility_approvals` | Per-enrollment policy snapshot | One approval per enrollment |
| `graduation_audits` | Persisted academic eligibility result | Checked result and required actor |
| `graduation_audit_issues` | Missing/failed/enrolled/pending/elective issues | Checked issue type |

## Related Notes

- [[Backend Structure]]
- [[Academic Setup]]
- [[Enrollment]]
- [[Finance Data Dictionary]]
- [[Academic Exceptions]]
- [[Scheduling]]
