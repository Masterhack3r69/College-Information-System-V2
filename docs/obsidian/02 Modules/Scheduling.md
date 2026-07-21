# Scheduling

## Status

Completed through Flyway V22. #status/completed #module/scheduling

## Purpose

Plan and publish course offerings while preserving schedule identity, enrollment/gradebook links, historical meetings, resource availability, and accountable revisions.

## Users and Scope

| User | Read scope | Mutations |
|---|---|---|
| Super Admin | All schedules | Full lifecycle, copy, policy, override |
| Registrar | All schedules | Full lifecycle, copy, policy, override |
| Dean / Program Head | Linked department | None |
| Faculty | Assigned schedules | None through administrative APIs |
| Student | Confirmed owned enrollments | None |

Administrative mutations require `SCHEDULE_MANAGE`, published revisions require `SCHEDULE_REVISE`, teaching-load policy changes require `SCHEDULE_POLICY_MANAGE`, and overload acknowledgement requires `SCHEDULE_OVERRIDE` plus a reason.

## Lifecycle

`DRAFT → ACTIVE → CANCELLED | ARCHIVED`

- Create and `PUT` operate only on `DRAFT`.
- Activation performs complete resource, capacity, meeting, conflict, and load validation before creating reservations.
- `ACTIVE` schedules are changed only through a reasoned, version-checked revision. Course, section, and term identity stay frozen.
- Cancellation requires a reason and no consuming enrollment or class activity.
- Archive is terminal. An active consumed schedule can be archived only after its term is inactive.
- Deprecated `DELETE` archives instead of deleting the schedule row.

## Meeting Model

Every active meeting has an explicit day, time, component (`LECTURE`, `LABORATORY`, `COMBINED`), delivery mode (`ONSITE`, `ONLINE`, `HYBRID`), revision, and effective period. Onsite/hybrid meetings require an active room with type and capacity; online meetings must not have a room. Sunday is supported throughout.

The top-level schedule room is compatibility-only and is populated only when all active meetings use the same room. Revisions retire old meetings instead of deleting them, preserving attendance references.

## Activation and Revision Rules

- Course, section, faculty, and required room/capacity profiles must be active and configured.
- Capacity cannot exceed the section maximum or any onsite/hybrid room, and cannot fall below confirmed schedule occupancy.
- Meetings in one request cannot overlap or duplicate each other.
- Active room, faculty, and section ranges cannot overlap in the same term.
- Faculty changes stop after gradebook submission; all revisions stop after grade locking.
- Optimistic schedule versions reject stale edits with `SCHEDULE_VERSION_CONFLICT`.
- Deactivation of a room, faculty member, course, or section is blocked while an active schedule references it.

## Database-Safe Conflict Prevention

Conflict prechecks return actionable room/faculty/section details. Activation and revision also write one reservation row per active meeting/resource. PostgreSQL exclusion constraints are the final concurrency boundary; a competing transaction is returned as HTTP `409 SCHEDULE_CONFLICT`.

See [[ADR-004 Schedule Revisions and Resource Reservations]].

## Teaching Loads

Weekly contact hours are calculated from active meeting durations. The load view reports active classes, confirmed students, policy limit, remaining hours, and overload state. A faculty-type policy overrides the term default. Missing policy is informational; overload requires `SCHEDULE_OVERRIDE`, explicit acknowledgement, and a reason.

## Term Copy

Term copy is preview-then-atomic. Target sections are matched by program, section code, and year level. The preview reports missing sections, incompatible curricula, inactive resources, incomplete profiles, and duplicate offerings. Execution revalidates and creates every selected draft or none.

## Frontend

`/admin/schedules` provides Planner, Section timetable, Faculty load, Room availability, and History views; day-pattern shortcuts expand into explicit meetings. Revision locks identity fields and retains capacity/conflict/load/version errors on screen. Load-policy setup and term copy use controlled dialogs.

Faculty and student schedule pages default to their configured portal term, offer only assigned/enrolled historical terms, use meeting-level locations, include Sunday, and display the five latest applicable changes.

## Exclusions

No automatic timetable generation, CSV import, email/SMS delivery, room-course compatibility policy, or separate component rosters are included.

## Related Notes

- [[Scheduling Endpoints]]
- [[Scheduling Data Dictionary]]
- [[Academic Setup]]
- [[Enrollment]]
- [[Faculty Portal]]
- [[Student Portal]]
- [[Authentication and Roles]]
- [[Scheduling Test Cases]]

