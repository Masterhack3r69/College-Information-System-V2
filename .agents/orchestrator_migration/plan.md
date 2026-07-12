# Project Plan: Student Enrollment Migration

## Objective
Analyze frontend, backend, and database schema to determine required fields for student enrollment, and develop/execute an automated migration script/process to enroll 19 applicant students (4 first-year, 5 second-year, 5 third-year, 5 fourth-year) for the first semester.

## Architecture & System Context
- **Frontend**: React-based Vite project containing student profiling and enrollment forms/routes.
- **Backend**: Spring Boot Java application handling students, contacts, enrollments, curriculums, sections, and schedules.
- **Database**: PostgreSQL database containing tables for student profiles, academic status, contacts, education history, sections, schedules, and enrollments.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | R1: Schema Analysis | Analyze DB schema, entity definitions, and API endpoints to extract all required and optional fields for student creation and enrollment. Generate Schema Analysis Report. | None | DONE |
| 2 | R2: Migration Automation | Develop a migration script (SQL/Python/Java) to insert/enroll 19 applicant students with the required year-level distribution. | M1 | DONE |
| 3 | Verification & Auditing | Verify exactly 19 student records exist with correct year-level distribution. Run Forensic Auditor to ensure no cheating/integrity issues. | M2 | DONE |

## Interface Contracts / Key Requirements
- **Required Fields**: Determined in Milestone 1.
- **Student Count**: Exactly 19.
- **Distribution**: 4 first-year, 5 second-year, 5 third-year, 5 fourth-year.
- **Semester**: First Semester.
- **Mock Data**: Realistic data for names, contacts, academic records, etc.

## Code Layout
- Backend Source: `c:\Users\PC\Projects\cis\src`
- Frontend Source: `c:\Users\PC\Projects\cis\frontend`
- Migration Scripts: `c:\Users\PC\Projects\cis\migration` (or other appropriate directory under the project)
