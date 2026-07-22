# Student Portal

## Purpose

Provide student-owned access to current enrollment, schedule, academics, finance, announcements, class content, forms, requests, contact profile, and account security.

## Status

Implemented

## Main Users

Users with the `STUDENT` role, `STUDENT_PORTAL_ACCESS`, and a linked `student_id`; registrars administer portal settings/content/requests through `STUDENT_PORTAL_ADMIN`.

## Current Features

- Student dashboard and current portal-term information.
- Contact/emergency profile updates and mandatory initial password change.
- Online enrollment window, selected-load review, normal/back/elective recommendations, seats, meetings, add/drop, validation, and submission.
- Term-selectable confirmed schedule with meeting-level locations and latest schedule changes, locked grades, full academic plan, approved credits, evaluation status, graduation-audit summaries, curriculum progress, and visible finalized attendance.
- All-term assessment itemization, installments, adjustments, gross/refunded/net totals, credits, payment history, and owned receipt PDFs.
- Portal and class announcements, published materials, downloadable forms.
- Document/clearance service requests, cancellation, fulfillment download.
- Registrar controls for term settings, notices, forms, requests, fulfillment, and enrollment return.

## Main Workflow

Provision student account → force password change → enter portal → use enabled term services → view only records linked to the authenticated student. Staff administer shared portal settings and request processing.

## Business Rules

- Ownership comes from the authenticated user's linked student record.
- Enrollment is available only when enabled and within optional opening/closing timestamps.
- Only published announcements/materials/forms are exposed.
- Academic grades shown to students come from locked academic records.
- Approved course credits satisfy prerequisites and completion but never appear as an internal grade or GPA input.
- Completed or credited courses are excluded from available-class recommendations.
- Students may submit a load that still requires Registrar policy approval; confirmation remains blocked until approval is recorded.
- Attendance is shown only when portal settings allow it and sessions are finalized.
- A student may cancel only a `SUBMITTED` service request.
- Student receipt download requires `STUDENT_FINANCE_SELF` and server-side payment ownership validation; each access is audited.
- Schedule terms are limited to confirmed owned enrollments. The configured portal term is the default; Sunday and the five latest applicable schedule changes are included.

## Frontend Implementation

Routes under `/student`: dashboard, enrollment, schedule, academics, finance, announcements, documents/requests, and profile. Shared credential/session management uses `/account/security`; `/student/account/password` redirects there. Registrar administration uses `/admin/student-portal`.

## Backend Implementation

`StudentPortalController`, `StudentPortalAdminController`, `StudentPortalService`, `StudentPortalAccess`, file storage, account provisioning, and audit logging.

## Database Entities

`student_portal_term_settings`, `portal_announcements`, `student_forms`, `student_service_requests`, `student_service_request_history`, users/students, enrollment, academic, finance, attendance, and class-content tables.

## API Endpoints

Student endpoints use `/api/v1/student/me/*`; schedule additions are `/schedule`, `/schedule/terms`, and `/schedule/changes`. Administrative endpoints use `/api/v1/student-portal/admin/*`.

Academic additions: `/academic-plan`, `/course-credits`, `/academic-evaluations`, and `/graduation-audits`. Enrollment detail now returns selected subjects and validation.

Finance receipt: `GET /api/v1/student/me/payments/{paymentId}/receipt`.

## Known Gaps

- A focused scheduling browser case covers confirmed-term ownership fixtures, Sunday, and the latest change banner; the complete student portal still lacks one comprehensive browser suite.
- Focused responsive checks passed, but a signed-in automated student add/drop/submit browser suite remains to be added.
- Files use local filesystem storage.

## Related Notes

- [[Enrollment]]
- [[Billing]]
- [[Authentication and Roles]]
- [[Academic Exceptions]]
- [[Scheduling]]
- [[Users and Accounts]]
