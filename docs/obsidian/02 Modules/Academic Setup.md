# Academic Setup

## Purpose

Define the master data and term structures used by scheduling, enrollment, finance, and grading.

## Status

Implemented

## Main Users

Registrar and Super Admin manage setup. School-year and semester reference data is readable by every authenticated user because portal filters and the shared working-term control depend on it; mutations remain restricted to `ACADEMIC_SETUP_MANAGE`.

## Current Features

- CRUD/search for departments, programs, courses, faculty, rooms, school years, semesters, and sections.
- Status changes for departments, faculty, rooms, and sections.
- Curriculum creation/versioning, course assignment, prerequisite/corequisite links, checklist totals, and activation.
- Class schedules with meetings, filters, conflict checks, and archive behavior.
- Grading scales and weighted grading templates.
- Academic-standing enrollment eligibility policies scoped by school year and optional program.
- Elective curriculum requirement groups measured by course count or unit total.
- Administrative working-term selector backed by the configured school years and semesters.

## Main Workflow

Create master data → define curriculum → create term and sections → schedule eligible courses/faculty/rooms → configure grading.

## Business Rules

- Codes and key identifiers are unique according to migration constraints and services.
- Schedules reject overlapping room, faculty, and section meetings in the same term.
- Curriculum activation validates curriculum content and status transitions.
- Weighted grading templates require midterm plus final weights to equal 100; scale bands are constrained to valid ranges.
- A program-specific eligibility policy overrides the school-wide policy for the same academic status and school year.
- Only one active policy may exist per status/year/program scope.
- An elective curriculum course may belong to only one active requirement group.
- Graduation audit is configuration-incomplete while any `ELECTIVE` curriculum course is ungrouped.
- The administrative working term is user-session context. Selecting it never changes school-year or semester master-data flags.
- The active school year and the lowest-sort active semester provide the default when the user has no valid saved selection.

## Frontend Implementation

`/admin/setup/*` includes departments, programs, courses, faculty, rooms, school years, semesters, sections, curricula/builder, grading, and `/admin/setup/policies` for eligibility/elective rules. Scheduling is at `/admin/schedules`. The administrative shell displays the selected year and semester and synchronizes it with enrollment, scheduling, policy setup, and default Finance/grade filters.

## Backend Implementation

Spring controllers/services/repositories under `setup`, `curriculum`, `schedule`, and `grade`. Permissions include `ACADEMIC_SETUP_VIEW`, `ACADEMIC_SETUP_MANAGE`, `CURRICULUM_VIEW`, `CURRICULUM_MANAGE`, `SCHEDULE_VIEW`, and `SCHEDULE_MANAGE`.

## Database Entities

Departments, programs, courses, faculty, rooms, school years, semesters, sections, curricula and curriculum courses, class schedules and meetings, grading scales/templates/categories.

V20 adds `curriculum_requirement_groups`, `curriculum_requirement_group_courses`, and `enrollment_eligibility_policies`.

## API Endpoints

- `/api/v1/departments`, `/programs`, `/courses`, `/faculty`, `/rooms`, `/school-years`, `/semesters`, `/sections`
- Authenticated users may `GET /school-years` and `GET /semesters`; create/update operations retain setup permissions.
- `/api/v1/curricula` and curriculum course/checklist/activation subpaths
- `/api/v1/schedules` and `POST /api/v1/schedules/check-conflict`
- `/api/v1/grading-setup/scales` and `/grading-setup/templates`
- `GET|POST|PUT /api/v1/academic-policies`
- `GET|POST|PUT|DELETE /api/v1/curricula/{id}/requirement-groups`

## Known Gaps

- Existing Playwright artifacts show failures in academic-setup tests; a fresh run against a configured stack is needed.
- Institution-approved probation, leave, and elective rules still need configuration before production use.

## Related Notes

- [[Enrollment]]
- [[Grading]]
- [[Database Overview]]
- [[Academic Exceptions]]
