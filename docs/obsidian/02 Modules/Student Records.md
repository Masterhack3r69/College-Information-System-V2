# Student Records

## Purpose

Maintain the registrar-facing student profile, academic assignment, contacts, family and education background, document metadata, and academic-record view.

## Status

Implemented

## Main Users

Registrar and Super Admin; read-only staff may view through `STUDENT_VIEW`.

## Current Features

- Search and filter students; create, view, update, and change status.
- Capture personal, contact, family, educational, and academic data.
- Assign program, curriculum, year level, school year, classification, and academic status.
- Upload document metadata/files and verify submitted documents.
- View confirmed enrollment and locked academic records from the student detail page.
- View the derived academic plan, evaluation cases, posted credits, policy approvals, and persisted graduation audits from `Academic Exceptions`.
- Record `SECOND_DEGREE` as an admission origin without changing load classification or academic standing.
- Provision a student account for eligible enrolled students when provisioning is enabled.

## Main Workflow

Create profile → complete nested student data → assign academic placement → upload and verify documents → use the record in scheduling/enrollment/records workflows.

## Business Rules

- Student number is unique.
- Program, curriculum, and academic references must resolve to current records.
- Document verification records status, remarks, verifier, and timestamp.
- Student portal ownership is based on `users.student_id`, not a supplied student ID.
- Direct program/curriculum reassignment is not the curriculum-migration workflow. Migration requires an approved `CURRICULUM_MIGRATION` evaluation case.
- Internal academic records remain the source of institutional grades and GPA; approved prior study is stored separately as course credits.

## Frontend Implementation

Routes: `/admin/students` and `/admin/students/:id`. The large `students-page.tsx` provides list, form, detail, document, and academic-record workflows.

## Backend Implementation

`StudentController` delegates to `StudentService`; repository and JPA entities cover students and nested profile records. Access uses `STUDENT_VIEW`, `STUDENT_CREATE`, and `STUDENT_UPDATE`.

## Database Entities

`students`, `student_contacts`, `student_family_background`, `student_educational_background`, `student_documents`, plus related program/curriculum/school-year entities.

## API Endpoints

- `GET|POST /api/v1/students`
- `GET|PUT /api/v1/students/{id}`
- `PATCH /api/v1/students/{id}/status`
- `POST|GET /api/v1/students/{id}/documents`
- `PATCH /api/v1/students/{id}/documents/{documentId}/verify`
- `GET /api/v1/students/{id}/academic-records`
- `GET /api/v1/students/{id}/academic-plan`
- `GET /api/v1/students/{id}/graduation-audits`
- `POST /api/v1/students/{id}/graduation-audits`
- `GET /api/v1/students/{id}/eligibility-approvals`
- Academic evaluation endpoints documented in [[Academic Exceptions]]

## Known Gaps

- No separate admissions application/intake workflow exists.
- Readmission administration, international compliance, bridging-plan administration, and special/non-degree student records are not implemented.
- Persistent file storage is local filesystem only.

## Related Notes

- [[Enrollment]]
- [[Student Portal]]
- [[Database Overview]]
- [[Academic Exceptions]]
