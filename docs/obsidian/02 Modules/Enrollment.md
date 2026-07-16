# Enrollment

## Purpose

Build, validate, submit, approve, confirm, return, or cancel a student's term load while preserving academic, capacity, Finance, and audit rules.

## Status

Implemented through Flyway V20. See [[Academic Exceptions]].

## Main Users

- `REGISTRAR` and `SUPER_ADMIN`: administrative enrollment records and approval.
- `STUDENT`: owned self-service enrollment during an open portal window.
- `DEAN` and `PROGRAM_HEAD`: scoped academic-equivalency review only; they do not receive administrative `ENROLLMENT_VIEW`.

## Main Workflow

`DRAFT → SUBMITTED → CONFIRMED`

- Student or Registrar creates a draft and selects schedules.
- Student may add/drop and submit; Registrar may return `SUBMITTED` to `DRAFT` with a reason.
- Registrar records any required academic-policy approval, then confirms.
- Finance assessment generation remains a separate Finance-owned action after confirmation.
- Cancellation is allowed only when Finance is resolved and no attendance, grade, or locked academic activity exists.

## Validation Rules

- Only `DRAFT` enrollments are editable; `DRAFT` and `SUBMITTED` are confirmable.
- Active-enrollment uniqueness includes `DRAFT`, `SUBMITTED`, and `CONFIRMED` for the same student and term.
- A course cannot be selected twice through different schedules.
- Schedule term, program, curriculum, status, section rules, meeting conflicts, and seats are validated.
- Confirmation locks all selected `class_schedules` in stable ID order before recalculating confirmed occupancy.
- Capacity counts exclude the enrollment being validated, preventing self-count rejection.
- Prerequisites are satisfied only by passed locked internal records or active approved course credits.
- Corequisites must already be satisfied or selected in the same load.
- `REQUIRED` curriculum courses are mandatory for regular loads. `OPTIONAL` and `ELECTIVE` courses remain selectable and do not individually block confirmation.
- Completed or credited courses cannot be retaken.
- Irregular, transferee, returnee, cross-enrollee, graduating, shiftee, and second-degree origins may select unsatisfied lower/current-year curriculum courses. Prerequisites remain enforced.
- `DISMISSED` and `GRADUATED` students cannot enroll. `PROBATION` and `ON_LEAVE` fail closed with `ACADEMIC_POLICY_NOT_CONFIGURED` unless an active policy exists.
- Policy unit limits are blocking validation issues. Required approval is shown as a warning and blocks confirmation until Registrar approval is persisted.

## Cancellation Rules

`GET /api/v1/enrollments/{id}/cancellation-readiness` reports all blockers.

- Any `attendance_entries` row linked to an enrollment subject blocks cancellation.
- Any grade row blocks cancellation, including a draft grade.
- A locked academic record blocks cancellation.
- An assessment must satisfy the Finance resolution rules documented in [[Billing]].
- Cancellation never deletes grades, attendance, Finance transactions, or academic records.

## Frontend

- `/admin/enrollment`: creation, selected load, validation, confirmation, records, real status history, return-to-draft, policy approval, cancellation readiness, and reports.
- `/student/enrollment`: normal recommendations, back subjects, electives, meetings, seats, selected load, validation, add/drop, and submission.

Independent page data uses TanStack Query keys and invalidates enrollment, available-class, plan, dashboard, history, and readiness data after mutations.

## API Endpoints

- `GET|POST /api/v1/enrollments`
- `GET|PUT /api/v1/enrollments/{id}`
- `POST /api/v1/enrollments/{id}/subjects`
- `DELETE /api/v1/enrollments/{id}/subjects/{subjectId}`
- `POST /api/v1/enrollments/{id}/validate|confirm|cancel|return-to-draft|eligibility-approval`
- `GET /api/v1/enrollments/{id}/history|cancellation-readiness`
- Student-owned equivalents under `/api/v1/student/me/enrollment`

## Database Entities

`enrollments`, `enrollment_subjects`, `enrollment_status_history`, `enrollment_eligibility_policies`, `enrollment_eligibility_approvals`, class schedules, students, curricula, academic records, and approved course credits.

## Verification

- Enrollment service tests cover regular load behavior, optional-course semantics, duplicate courses, lower-year back subjects, corequisites, approved-credit prerequisites, probation fail-closed behavior, and maximum units.
- PostgreSQL applied V18–V20 and Hibernate validated the schema.
- Desktop and 375 px browser checks passed without horizontal overflow or console errors.

## Out of Scope

Admissions intake, special/non-degree enrollment, international compliance, bridging-plan administration, and institutional graduation clearance are separate future modules.

## Related Notes

- [[Academic Exceptions]]
- [[Student Records]]
- [[Academic Setup]]
- [[Billing]]
- [[Student Portal]]
