# ADR-004: Schedule Revisions and Resource Reservations

## Status

Accepted

## Date

2026-07-21

## Context

Schedules are referenced by enrollment, attendance, gradebooks, reports, and Finance. Deleting/replacing an active schedule would break identity and history. Application-only conflict checks also leave a race where two valid requests can reserve the same room, faculty member, or section concurrently.

## Decision

- Preserve the `class_schedules.id` for its full lifecycle.
- Edit only drafts directly. Revise active schedules through a reasoned, optimistic-version endpoint.
- Freeze course, section, and term identity after activation.
- Retire previous meetings with revision/effective metadata; do not delete historical meetings.
- Record JSONB before/after history with actor, reason, and acknowledged warnings.
- Materialize active room, faculty, and section meeting ranges in `schedule_resource_reservations`.
- Use PostgreSQL GiST exclusion constraints as the authoritative concurrency boundary, with detailed service prechecks for usability.
- Copy terms as one revalidated transaction that creates drafts only.

## Alternatives Considered

- Replace active schedules with new schedule IDs: rejected because downstream ownership and history would fragment.
- Rely only on application conflict queries: rejected because check-then-write races remain.
- Lock every resource row during planning: rejected because it increases coupling and still needs a stable range representation.
- Automatic scheduling engine: excluded from this release.

## Consequences

### Positive

- Enrollment, attendance, gradebook, report, and Finance references remain stable.
- Historical schedule changes are explainable in the application.
- Concurrent resource claims cannot both commit.
- Stale clients receive a deterministic version conflict.

### Negative

- PostgreSQL-specific range/exclusion behavior is now required.
- Revisions add meeting/history rows and require archival/retention awareness.
- Activation and revision have more validation and transaction work.
- The legacy top-level room needs a compatibility-removal follow-up.

## Related Notes

- [[Scheduling]]
- [[Scheduling Data Dictionary]]
- [[Scheduling Test Cases]]

