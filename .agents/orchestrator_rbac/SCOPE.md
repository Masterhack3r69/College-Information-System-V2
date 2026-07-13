# Scope: RBAC / Data-level filtering for Faculty

## Architecture
- Spring Boot backend security context
- Grading REST endpoints (e.g. `/api/v1/grades` or similar)
- Class/Section assignment entity relations for Faculty
- Student assignments and enrollment relations

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | M1: Codebase Analysis & Authorization Pattern Investigation | Explore existing code, Spring Security config, grading REST endpoints, entity relations (Faculty, Class/Section, Student). | none | PLANNED |
| 2 | M2: Access Control Implementation | Implement data-level authorization checks / filters on academic functions (grading, attendance, etc.) ensuring Faculty can only access their assigned classes/students. | M1 | PLANNED |
| 3 | M3: Verification Test Implementation & Execution | Write and execute integration/unit tests or scripts to verify that unassigned access is blocked and assigned access is allowed. | M2 | PLANNED |
| 4 | M4: Handoff / Final Report | Document findings, implementation details, verification results, and provide final report. | M3 | PLANNED |

## Interface Contracts
### Security Policies / Attributes
- Faculty Role validation: Check if authenticated user has Faculty/Teacher role.
- Class Assignment validation: Ensure Faculty member is assigned to the Class Section for grading/attendance actions.
- Student Validation: Ensure Student is enrolled in a Class Section taught by the Faculty member.
