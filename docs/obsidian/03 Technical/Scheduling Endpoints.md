# Scheduling Endpoints

## Administrative Schedule API

Base path: `/api/v1/schedules`

| Method | Path | Purpose | Permission |
|---|---|---|---|
| `GET` | `/schedules` | Scoped, filterable schedule list | `SCHEDULE_VIEW` |
| `POST` | `/schedules` | Create draft | `SCHEDULE_MANAGE` |
| `GET` | `/schedules/{id}` | Scoped detail | `SCHEDULE_VIEW` |
| `PUT` | `/schedules/{id}` | Version-checked draft edit | `SCHEDULE_MANAGE` |
| `POST` | `/schedules/{id}/activate` | Validate and publish | `SCHEDULE_MANAGE` |
| `POST` | `/schedules/{id}/revise` | Reasoned active revision | `SCHEDULE_REVISE` |
| `POST` | `/schedules/{id}/cancel` | Reasoned cancellation | `SCHEDULE_MANAGE` |
| `POST` | `/schedules/{id}/archive` | Terminal archive | `SCHEDULE_MANAGE` |
| `GET` | `/schedules/{id}/history` | Change snapshots and actor | Scoped `SCHEDULE_VIEW` |
| `POST` | `/schedules/check-conflict` | Administrative precheck | `SCHEDULE_MANAGE` |
| `GET` | `/schedules/timetables/sections/{sectionId}` | Scoped section timetable | `SCHEDULE_VIEW` |
| `GET` | `/schedules/timetables/faculty/{facultyId}/load` | Scoped teaching load | `SCHEDULE_VIEW` |
| `GET` | `/schedules/timetables/rooms` | Occupancy from visible schedules | `SCHEDULE_VIEW` |
| `POST` | `/schedules/copy-term/preview` | Validate copy selection | `SCHEDULE_MANAGE` |
| `POST` | `/schedules/copy-term` | Atomic draft copy | `SCHEDULE_MANAGE` |

`DELETE /schedules/{id}` remains for one compatibility release and performs an archive.

## Meeting Contract

Meeting requests and responses include `dayOfWeek`, `startTime`, `endTime`, `componentType`, `deliveryMode`, `roomId`, and `locationDetails`. Responses also include room labels, revision number, active state, and effective timestamps.

Schedule responses include optimistic `version`, enrollment/activity/grade-lock indicators, identity lock, compatible top-level room, room summary, load warnings, latest change, and active meetings.

## Lifecycle Requests

Activation, cancellation, and archive send `expectedVersion`, optional/required `reason` according to the operation, `acknowledgeLoadWarning`, and `acknowledgedWarnings`. Revision also sends faculty, capacity, and the complete replacement set of active meetings.

## Load Policies

Base path: `/api/v1/schedule-load-policies`

- `GET` by school year and semester: `SCHEDULE_VIEW`
- `POST`, `PUT`, `DELETE`: `SCHEDULE_POLICY_MANAGE`

A policy includes term, optional faculty type, maximum weekly contact hours, optional maximum active classes, and active state.

## Portal Endpoints

- Faculty: `/api/v1/faculty/me/schedule`, `/schedule/terms`, and `/schedule/changes`, with optional term filters.
- Student: `/api/v1/student/me/schedule`, `/schedule/terms`, and `/schedule/changes`, with server-owned confirmed-enrollment scope.

## Stable Business Codes

`SCHEDULE_CONFLICT`, `SCHEDULE_VERSION_CONFLICT`, `DUPLICATE_SCHEDULE`, `SCHEDULE_IDENTITY_LOCKED`, `ROOM_CAPACITY_EXCEEDED`, `SECTION_CAPACITY_EXCEEDED`, `CAPACITY_BELOW_ENROLLED`, `FACULTY_LOAD_WARNING`, `SCHEDULE_GRADE_LOCKED`, `SCHEDULE_FACULTY_LOCKED`, `ROOM_PROFILE_INCOMPLETE`, and `SECTION_CAPACITY_NOT_CONFIGURED`.

Validation/business failures use the standard API error envelope. Optimistic, duplicate, and reservation conflicts return HTTP 409.

## Related Notes

- [[Scheduling]]
- [[Scheduling Data Dictionary]]
- [[Authentication and Roles]]

