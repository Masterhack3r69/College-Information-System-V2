# Scheduling Data Dictionary

## `class_schedules`

Stable offering identity linked to section, course, primary faculty, and term.

| Field | Type | Required | Description |
|---|---|---:|---|
| `id` | UUID | Yes | Stable identifier retained by enrollment, gradebook, attendance, and reports |
| `section_id` | UUID | Yes | Term section; frozen after activation |
| `course_id` | UUID | Yes | Offered course; frozen after activation |
| `faculty_id` | UUID | Yes | Primary faculty |
| `room_id` | UUID | No | Deprecated uniform-room compatibility value |
| `school_year_id` / `semester_id` | UUID | Yes | Frozen term identity |
| `capacity` | Integer | Yes | Offering capacity |
| `status` | Varchar | Yes | `DRAFT`, `ACTIVE`, `CANCELLED`, `ARCHIVED` |
| `version` | Bigint | Yes | Optimistic concurrency token |

A partial unique index permits only one `DRAFT`/`ACTIVE` schedule for a section/course pair.

## `schedule_meetings`

| Field | Type | Required | Description |
|---|---|---:|---|
| `room_id` | UUID | Conditional | Required for onsite/hybrid; prohibited for online |
| `component_type` | Varchar | Yes | `LECTURE`, `LABORATORY`, `COMBINED` |
| `delivery_mode` | Varchar | Yes | `ONSITE`, `ONLINE`, `HYBRID` |
| `location_details` | Text | No | Online link label or location guidance |
| `revision_number` | Integer | Yes | Meeting-set revision |
| `active` | Boolean | Yes | Current meeting flag |
| `effective_from` / `effective_to` | Timestamptz | Yes/No | Historical effectivity |

Existing V20 meetings are backfilled to the schedule room, `ONSITE`, and a component inferred from catalog lecture/laboratory hours.

## `rooms`

V21 adds optional `building` and `room_type`. `room_type` is required by create/edit services and for rooms used by newly activated onsite/hybrid meetings.

## `sections`

V21 adds nullable `maximum_capacity`. Existing values are backfilled from the greater of schedule capacity and confirmed section population. Unused legacy sections remain unconfigured and cannot receive an activated schedule until set. API responses derive the current confirmed count.

## `schedule_change_history`

Append-only change evidence with schedule, action, reason, JSONB before/after snapshots, JSONB acknowledged warnings, actor, and timestamp. Actions are `CREATED`, `UPDATED`, `ACTIVATED`, `REVISED`, `CANCELLED`, `ARCHIVED`, and `COPIED`.

## `schedule_resource_reservations`

One row per active meeting and resource (`ROOM`, `FACULTY`, `SECTION`). Rows include term, day, time range, schedule, and meeting. A GiST exclusion constraint rejects overlapping ranges for the same resource and term, including concurrent transactions.

## `schedule_load_policies`

| Field | Type | Required | Description |
|---|---|---:|---|
| `school_year_id` / `semester_id` | UUID | Yes | Policy term |
| `faculty_type` | Varchar | No | Null is the term default |
| `maximum_weekly_contact_hours` | Numeric | Yes | Warning threshold |
| `maximum_active_classes` | Integer | No | Optional class-count threshold |
| `active` | Boolean | Yes | Active policy selector |

Only one active default or faculty-type policy may exist per term.

## Related Notes

- [[Scheduling]]
- [[Scheduling Endpoints]]
- [[Database Overview]]

