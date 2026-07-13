# Academic Setup

## Purpose

Define the master data and term structures used by scheduling, enrollment, finance, and grading.

## Status

Implemented

## Main Users

Registrar and Super Admin. Faculty can read school years and semesters through `FACULTY_CLASS_VIEW`.

## Current Features

- CRUD/search for departments, programs, courses, faculty, rooms, school years, semesters, and sections.
- Status changes for departments, faculty, rooms, and sections.
- Curriculum creation/versioning, course assignment, prerequisite/corequisite links, checklist totals, and activation.
- Class schedules with meetings, filters, conflict checks, and archive behavior.
- Grading scales and weighted grading templates.

## Main Workflow

Create master data → define curriculum → create term and sections → schedule eligible courses/faculty/rooms → configure grading.

## Business Rules

- Codes and key identifiers are unique according to migration constraints and services.
- Schedules reject overlapping room, faculty, and section meetings in the same term.
- Curriculum activation validates curriculum content and status transitions.
- Weighted grading templates require midterm plus final weights to equal 100; scale bands are constrained to valid ranges.

## Frontend Implementation

`/admin/setup/*` includes departments, programs, courses, faculty, rooms, school years, semesters, sections, curricula/builder, and grading. Scheduling is at `/admin/schedules`.

## Backend Implementation

Spring controllers/services/repositories under `setup`, `curriculum`, `schedule`, and `grade`. Permissions include `ACADEMIC_SETUP_VIEW`, `ACADEMIC_SETUP_MANAGE`, `CURRICULUM_VIEW`, `CURRICULUM_MANAGE`, `SCHEDULE_VIEW`, and `SCHEDULE_MANAGE`.

## Database Entities

Departments, programs, courses, faculty, rooms, school years, semesters, sections, curricula and curriculum courses, class schedules and meetings, grading scales/templates/categories.

## API Endpoints

- `/api/v1/departments`, `/programs`, `/courses`, `/faculty`, `/rooms`, `/school-years`, `/semesters`, `/sections`
- `/api/v1/curricula` and curriculum course/checklist/activation subpaths
- `/api/v1/schedules` and `POST /api/v1/schedules/check-conflict`
- `/api/v1/grading-setup/scales` and `/grading-setup/templates`

## Known Gaps

- Existing Playwright artifacts show failures in academic-setup tests; a fresh run against a configured stack is needed.

## Related Notes

- [[Enrollment]]
- [[Grading]]
- [[Database Overview]]

