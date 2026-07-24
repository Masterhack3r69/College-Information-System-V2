# Faculty Portal

## Purpose

Give linked faculty users a self-service workspace limited to their assigned classes and advising assignments.

## Status

Partially Implemented

## Main Users

Users with the `FACULTY` role, `FACULTY_PORTAL_ACCESS`, and a linked `faculty_id`.

## Current Features

- Dashboard, assigned classes, roster, term-selectable schedule, meeting-level locations, latest schedule changes, profile, and password change.
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
- Schedule terms are limited to assigned current/historical terms; the default is the configured active portal term.
- Class and student totals count confirmed enrollment subjects only.
- Schedule and change endpoints expose only assigned schedules, include Sunday, and return the five latest applicable changes.

## Frontend Implementation

Routes exist under `/faculty`: dashboard, classes, class workspace, schedule, grades, corrections, advising, and profile. Shared password/session management uses `/account/security`; the duplicate profile password form was removed. The shell follows [[Frontend Design System]] with the shared 15 rem collapsible navigation, 72 px sticky header, semantic colors, and compact controls while preserving faculty-only labels and permission filtering. `/faculty/attendance`, `/faculty/content`, and `/faculty/reports` currently use `FacultySectionIndex`, which redirects to `/faculty/classes`; the actual functions live inside a class workspace.

## Backend Implementation

`FacultyPortalController`, `FacultyPortalService`, `FacultyPortalAccess`, gradebook services, and correction controllers/services. Permission checks are applied at controller and ownership-service levels.

## Database Entities

Faculty/users, class schedules and meetings, enrollments/subjects, attendance sessions/entries/history, class announcements/materials, advising assignments/notes, gradebooks, correction requests/history.

## API Endpoints

All self-service endpoints are under `/api/v1/faculty/me`, including `/dashboard`, `/classes`, `/schedule`, `/schedule/terms`, `/schedule/changes`, `/profile`, class `/gradebook`, `/attendance`, `/announcements`, `/materials`, `/advising`, `/locked-grades`, and `/grade-corrections`.

## Known Gaps

- Top-level attendance, content, and reports are navigation redirects rather than dedicated index pages.
- A focused scheduling browser case covers assigned Sunday meetings, change history, and mobile overflow; the complete faculty class-workspace lifecycle still lacks one comprehensive browser suite.

## Related Notes

- [[Grading]]
- [[Authentication and Roles]]
- [[Student Portal]]
- [[Scheduling]]
- [[Users and Accounts]]
- [[Frontend Design System]]
