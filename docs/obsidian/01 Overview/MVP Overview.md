# MVP Overview

## System

**Name:** College Student Information System / Student Information System MVP

**Purpose:** Manage college academic setup, student profiles, schedules, enrollment, assessments and payments, grades, academic records, faculty workflows, and student self-service through one backend.

## Target Users

Super administrators, registrars, deans, program heads, faculty members, cashiers, students, and read-only staff. See [[User Roles]].

## Technology Stack

- Backend: Java 21, Spring Boot 3.3.7, Spring MVC, Spring Data JPA, Spring Security, Jakarta Validation.
- Database: PostgreSQL 16 with Flyway migrations `V1` through `V15`; H2 is used by most backend tests.
- Authentication: BCrypt passwords, JWT access tokens, persisted refresh tokens, permission authorities.
- Frontend: React 19, TypeScript, Vite 8, React Router 7, TanStack Query 5, React Hook Form, Zod, Tailwind CSS 4, shadcn/ui.
- Documents and reports: local filesystem storage and PDFBox-generated PDFs.

## Deployment Approach

Docker Compose starts PostgreSQL, Redis, the Spring Boot backend, and an Nginx-served frontend. Hot-reload development uses Vite on port `5173` and the backend on port `8080`. Redis is provisioned but no Redis integration was found in application code.

## Main MVP Capabilities

- Permission-aware administration for academic setup and accounts.
- Student profiles, documents, schedules, enrollment, finance, gradebooks, reports, and audit logs.
- Faculty class, attendance, gradebook, content, advising, correction, profile, and schedule workflows.
- Student enrollment, schedule, academic, finance, content, request, profile, and password workflows.

## Current Limitations

- Local storage and local Docker Compose are not production deployment solutions.
- Full browser verification across every role is not present.
- Some older root documentation understates current portal and frontend implementation.
- The production frontend emits a large main-chunk warning.

## Related Notes

- [[System Architecture]]
- [[Authentication and Roles]]
- [[MVP Scope]]

