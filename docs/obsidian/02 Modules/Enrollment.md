# Enrollment

## Purpose

Build, validate, submit, confirm, or cancel a student's term enrollment and selected class schedules.

## Status

Implemented

## Main Users

Registrar, Super Admin, and students through self-service.

## Current Features

- Administrative enrollment search, draft creation/update, subject add/drop, validation, confirmation, cancellation, and history.
- Student self-service draft, available-class selection, subject changes, validation, and submission.
- Registrar student-portal administration can return a submitted enrollment to draft.
- Confirmed enrollment integrates with assessment generation, rosters, schedules, and portals.

## Main Workflow

Draft → select section/classes → validate → student submit or registrar confirm → generate assessment. Cancellation or return-to-draft follows controlled endpoints.

## Business Rules

- Only draft enrollments are editable.
- Validation checks schedule conflicts, duplicate subjects, capacity, prerequisites/corequisites, and enrollment consistency.
- Student enrollment requires an enabled/open portal term window and ownership of the enrollment.
- Student submission moves `DRAFT` to `SUBMITTED`; administrative confirmation produces `CONFIRMED`.
- Status changes are recorded in `enrollment_status_history`.

## Frontend Implementation

Administrative route `/admin/enrollment`; student route `/student/enrollment`; portal administration at `/admin/student-portal`.

## Backend Implementation

`EnrollmentController` and `EnrollmentService`; `StudentPortalController/Service` wrap self-service with ownership and window checks.

## Database Entities

`enrollments`, `enrollment_subjects`, `enrollment_status_history`, class schedules, sections, students, school years, and semesters.

## API Endpoints

- `GET|POST /api/v1/enrollments`
- `GET|PUT /api/v1/enrollments/{id}`
- `POST /api/v1/enrollments/{id}/subjects`
- `DELETE /api/v1/enrollments/{id}/subjects/{subjectId}`
- `POST /api/v1/enrollments/{id}/validate|confirm|cancel`
- Student equivalents under `/api/v1/student/me/enrollment`

## Known Gaps

- No completed cross-role E2E test proves the full student-submit → registrar-confirm → assessment lifecycle.

## Related Notes

- [[Student Records]]
- [[Billing]]
- [[Student Portal]]

