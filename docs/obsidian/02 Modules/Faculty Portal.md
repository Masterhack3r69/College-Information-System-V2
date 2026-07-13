# Faculty Portal

## Purpose

Give linked faculty users a self-service workspace limited to their assigned classes and advising assignments.

## Status

Partially Implemented

## Main Users

Users with the `FACULTY` role, `FACULTY_PORTAL_ACCESS`, and a linked `faculty_id`.

## Current Features

- Dashboard, assigned classes, roster, schedule, profile, and password change.
- Weighted gradebook initialization, score entry, and submission.
- Attendance draft/finalize/reopen workflows.
- Class announcements and learning-material upload.
- Adviser list and advising notes.
- Locked-grade correction request and status tracking.

## Main Workflow

Sign in → portal selected from available portals → open an assigned class → manage roster-related attendance, gradebook, or content → submit controlled records → use correction workflow after locking.

## Business Rules

- Every class-specific service checks faculty assignment.
- Finalized attendance is read-only until reopened with a reason.
- Gradebook actions follow the status workflow in [[Grading]].
- Content statuses are `DRAFT`, `PUBLISHED`, or `ARCHIVED`; only published content is student-visible.
- Password changes require the current password and revoke other refresh tokens.

## Frontend Implementation

Routes exist under `/faculty`: dashboard, classes, class workspace, schedule, grades, corrections, advising, and profile. `/faculty/attendance`, `/faculty/content`, and `/faculty/reports` currently use `FacultySectionIndex`, which redirects to `/faculty/classes`; the actual functions live inside a class workspace.

## Backend Implementation

`FacultyPortalController`, `FacultyPortalService`, `FacultyPortalAccess`, gradebook services, and correction controllers/services. Permission checks are applied at controller and ownership-service levels.

## Database Entities

Faculty/users, class schedules and meetings, enrollments/subjects, attendance sessions/entries/history, class announcements/materials, advising assignments/notes, gradebooks, correction requests/history.

## API Endpoints

All self-service endpoints are under `/api/v1/faculty/me`, including `/dashboard`, `/classes`, `/schedule`, `/profile`, class `/gradebook`, `/attendance`, `/announcements`, `/materials`, `/advising`, `/locked-grades`, and `/grade-corrections`.

## Known Gaps

- Top-level attendance, content, and reports are navigation redirects rather than dedicated index pages.
- Portal behavior has access-helper unit tests, but no comprehensive faculty browser suite was found.

## Related Notes

- [[Grading]]
- [[Authentication and Roles]]
- [[Student Portal]]

