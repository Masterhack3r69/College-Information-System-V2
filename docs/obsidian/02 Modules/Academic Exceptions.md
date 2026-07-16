# Academic Exceptions

#status/completed #type/feature #module/enrollment

## Status

Completed through Flyway V20 on 2026-07-16.

## Purpose

Provide one auditable workflow for transfer, shifting, second-degree, and explicit curriculum-migration evaluation while keeping admission origin, load classification, academic standing, and derived academic conditions separate.

## Users and Roles

- Registrar creates cases, prepares source evidence, submits cases, gives final approval, posts credits, reverses credits, approves policy exceptions, and runs graduation audits.
- Dean or Program Head reviews grouped equivalencies only within the department linked to their faculty record.
- Super Admin inherits both review and approval capabilities.
- Faculty has no general evaluation or administrative enrollment permission.
- Students see only their academic plan, credits, evaluation summaries, and persisted graduation-audit summaries.

## Evaluation Workflow

`DRAFT → PENDING_ACADEMIC_REVIEW → PENDING_REGISTRAR_APPROVAL → APPROVED`

- Either review stage may return or reject a case with a reason.
- Returning a case invalidates its equivalency decisions so academic review must record fresh recommendations before it can be forwarded again.
- One or more source courses may satisfy one target curriculum course.
- A source course cannot be reused by another recommended equivalency in the same case.
- At least one reviewed match is required before forwarding; at least one recommended match is required before final approval.
- Registrar approval atomically posts credits and changes program/curriculum only for `SHIFT` or `CURRICULUM_MIGRATION` cases.

## Credit Rules

- One active credit is allowed per student and target course.
- Credits satisfy prerequisites and curriculum completion.
- Source grades are informational and never become internal grades or institutional GPA inputs.
- Approved credit rows have no update endpoint. Corrections use an audited reversal row.
- A credit cannot be reversed while the same course is in a confirmed active enrollment.
- A credit cannot be posted over an institutional passed record or reversed after it satisfied a confirmed prerequisite/corequisite.

## Academic Plan

`GET /api/v1/students/{id}/academic-plan` derives each curriculum row as:

- `COMPLETED`
- `CREDITED`
- `ENROLLED`
- `FAILED`
- `MISSING`
- `PENDING_EVALUATION`
- `OPTIONAL`

The plan powers back-subject identification, deficiencies, retake prevention, prerequisite checks, student academics, and graduation audit.

## Curriculum Migration

- A migration case records source and target curricula.
- The source curriculum must equal the student's current assignment and must differ from the target.
- Passed internal records and active existing credits are imported as mapping sources.
- Case detail previews recommended mappings, unmapped source records, new target deficiencies, and elective groups.
- Approval posts target credits and changes the student assignment in the same transaction.
- Original academic records remain unchanged; migration never occurs merely because a curriculum is inactive.

## Eligibility Policies

Policies are scoped by academic status, school year, and optional program. A program policy overrides the school-wide policy for the same year/status.

Fields: `enrollmentAllowed`, `maximumUnits`, `requiresApproval`, and `active`.

Each approval snapshots the policy ID and maximum units with approver, reason, and timestamp.

## Electives and Graduation Audit

- Elective groups measure either required course count or required unit total.
- An elective curriculum course belongs to at most one group.
- Required courses remain individually mandatory; optional courses do not block completion.
- Any ungrouped `ELECTIVE` row makes an audit `CONFIGURATION_INCOMPLETE`.
- Audits persist required/earned units and issue rows for missing, failed, enrolled, pending-evaluation, unmet-group, and configuration conditions.
- Audit eligibility is academic only; Finance, document, disciplinary, and institutional clearance remain separate.

## Permissions

- `ACADEMIC_EVALUATION_VIEW`
- `ACADEMIC_EVALUATION_REVIEW`
- `ACADEMIC_EVALUATION_APPROVE`
- `ACADEMIC_POLICY_MANAGE`
- `GRADUATION_AUDIT_VIEW`

## Administrative API

- `GET|POST /api/v1/academic-evaluations`
- `GET|PUT /api/v1/academic-evaluations/{id}`
- `POST /api/v1/academic-evaluations/{id}/source-courses`
- `PUT|DELETE /api/v1/academic-evaluations/{id}/source-courses/{sourceId}`
- `POST /api/v1/academic-evaluations/{id}/documents|submit|matches|forward|approve|return|reject`
- `POST /api/v1/student-course-credits/{id}/reverse`
- `GET /api/v1/students/{id}/academic-plan`

## Frontend

- `/admin/academic-evaluations`: Registrar management and scoped Dean/Program Head review queue.
- Student detail `Academic Exceptions`: plan, evaluation cases, credits, policy approvals, and graduation audits.
- `/admin/setup/policies`: academic-standing policies and elective groups.
- `/student/academics`: academic plan, posted credits, pending evaluations, and audit summaries.

## Database Changes

- V18: enrollment authorization cleanup and activity/history indexes.
- V19: evaluation cases, source courses, grouped matches, history, documents, credits, reversals, and permissions.
- V20: elective groups, eligibility policies/approvals, graduation audits/issues, and permissions.

See [[Database Overview]] and [[ADR-003 Unified Academic Evaluation and Credit Posting]].

## Validation and Audit

- State transitions use locked case rows and compare-and-update status changes.
- Credit posting, curriculum reassignment, history, and audit-log writes are transactional.
- Reviewer scope resolves target-curriculum program department against the authenticated faculty link.
- Source ownership, document ownership, target-curriculum membership, grouped-source reuse, and active-credit uniqueness are validated.

## Test Cases

- [x] Approved transfer credit satisfies an enrollment prerequisite.
- [x] Grouped equivalency posts one target credit.
- [x] Lower-year back subjects work without bypassing corequisites.
- [x] Probation missing-policy and maximum-unit behavior.
- [x] Live PostgreSQL workflow from draft through posted credit.
- [x] Graduation audit returns `CONFIGURATION_INCOMPLETE` for ungrouped electives.
- [x] Cancellation readiness detects grade and locked-record activity.
- [x] Desktop and mobile-width browser checks.
- [ ] Automated multi-session final-seat race test in CI.
- [ ] Automated cross-account Dean/Program Head/Registrar browser suite.

## Assumptions

- Admission intake and readmission decisions occur before these academic evaluations.
- `SECOND_DEGREE` is an admission origin; its load classification and academic standing remain separate fields.
- Finance assessment generation remains outside enrollment confirmation.

## Open Questions

- Institutional policy must define evidence standards and equivalency thresholds per program.
- Institutional policy must define when a returning student is required to migrate curricula.

## Related Notes

- [[Enrollment]]
- [[Student Records]]
- [[Academic Setup]]
- [[Student Portal]]
- [[User Roles]]
