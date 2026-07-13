# Grading

## Purpose

Configure weighted grading, record scores, review and lock gradebooks, create academic records, and correct locked grades through an auditable workflow.

## Status

Implemented

## Main Users

Assigned faculty encode and submit; deans review; registrar locks; Super Admin can perform all seeded actions.

## Current Features

- Grading scales, bands, templates, categories, assessment items, scores, and result overrides.
- Class gradebook initialization, editing, computation, submission, return, approval, and locking.
- Locked grade data copied into academic records.
- Faculty correction requests, department review, registrar posting, and history.

## Main Workflow

Configure template → initialize class gradebook → create items and encode scores → submit → department review/approval → registrar lock → create academic records. Locked changes use correction requests.

## Business Rules

- Faculty access is limited to officially assigned class schedules.
- Submitted gradebooks are not freely editable; returned gradebooks can be corrected.
- Only approved gradebooks can be locked.
- Locked-grade correction requires a documented reason and staged review/posting.
- Department reviewers are restricted to their department unless Super Admin.

## Frontend Implementation

Admin/faculty gradebook UI uses `/admin/grades` and `/faculty/grades`; faculty class workspaces link directly to gradebooks. Setup is at `/admin/setup/grading`; correction queues use `/faculty/grade-corrections` and `/admin/grade-corrections`.

## Backend Implementation

`GradebookController`, `GradeController`, `GradingSetupController`, portal endpoints, `GradebookService`, `GradeService`, and correction services. Authorities include `GRADE_ENCODE`, `GRADE_REVIEW`, `GRADE_APPROVE`, and `GRADE_LOCK`.

## Database Entities

Grading scales/templates/categories, class gradebooks/categories, assessment items, scores, result overrides, grades, status histories, academic records, and correction request/history tables.

## API Endpoints

- `/api/v1/grading-setup/*`
- `/api/v1/gradebooks/classes` and `/gradebooks/class/{scheduleId}/*`
- Legacy grade views under `/api/v1/grades/*`
- Faculty gradebooks/corrections under `/api/v1/faculty/me/*`
- Administrative corrections under `/api/v1/grade-corrections/*`

## Known Gaps

- Full browser tests for the review/lock/correction workflow were not found.

## Related Notes

- [[Faculty Portal]]
- [[Student Records]]
- [[Authentication and Roles]]

