## Challenge Summary

**Overall risk assessment**: CRITICAL

The test cases in `GradeServiceTests.java` successfully verify the implemented functionality, but they confirm a key design vulnerability: a fail-open security posture for non-faculty users. In addition, there is a mismatch between the database permissions seeded for faculty and the permissions assumed in the tests, as well as a lack of service-level authorization in PDF report generation.

---

## Challenges

### [Critical] Challenge 1: Insecure Direct Object Reference (IDOR / BOLA) via Fail-Open Authorization in `GradeService`

- **Assumption challenged**: The assumption that restricting only accounts with `ROLE_FACULTY` or `GRADE_ENCODE` to assigned students is sufficient, and that anyone else can bypass this check safely.
- **Attack scenario**: A student user or a low-privilege user is granted `STUDENT_VIEW` (e.g., to view their own profile). Because they do not have the `ROLE_FACULTY` or `GRADE_ENCODE` roles, they bypass `ensureFacultyAccessToStudent` entirely. They can query `/api/v1/grades/student/{studentId}` or `/api/v1/students/{id}/academic-records` for any student ID in the system and retrieve their full grades and academic records.
- **Blast radius**: Complete leakage of all students' grades and academic records to any authenticated user with the `STUDENT_VIEW` permission (including students, cashiers, etc., if granted).
- **Mitigation**: Implement a strict fail-closed check in `ensureFacultyAccessToStudent`. Deny access by default unless explicitly allowed. The check should verify:
  1. The user has a bypass role (e.g. `ROLE_REGISTRAR`, `ROLE_SUPER_ADMIN`).
  2. The user is the student themselves (e.g. check if `principal.id() == student.getUserId()`).
  3. The user is an assigned faculty member.
  All other users should be rejected immediately.

### [Medium] Challenge 2: Missing `STUDENT_VIEW` Permission for Faculty in DB Seed vs Test Assumptions

- **Assumption challenged**: The assumption that a faculty member can access `/api/v1/grades/student/{studentId}` under normal conditions.
- **Attack scenario**: The test `facultyCanAccessAssignedStudentGradesAndRecords` grants the mocked principal `STUDENT_VIEW`. However, in the database seeds (`V1__foundation_auth_and_setup.sql`), the `FACULTY` role is NOT granted the `STUDENT_VIEW` permission. In production, a faculty member trying to access this endpoint will be blocked by the controller-level `@PreAuthorize("hasAuthority('STUDENT_VIEW')")`, meaning they cannot view their assigned students' individual grade histories.
- **Blast radius**: Faculty are locked out of viewing individual student grades/records despite the service layer allowing it.
- **Mitigation**: Adjust the controller's `@PreAuthorize` check to allow faculty (e.g., `@PreAuthorize("hasAnyAuthority('STUDENT_VIEW', 'GRADE_ENCODE')")`), or update the seed data to grant `STUDENT_VIEW` to faculty.

### [High] Challenge 3: Complete Authorization Bypass via PDF Report Endpoints (`ReportService`)

- **Assumption challenged**: The assumption that PDF generation endpoints are secure because they are protected by `REPORT_GENERATE`.
- **Attack scenario**: If a faculty member or another user is granted `REPORT_GENERATE` (e.g. to download their own class lists or grade sheets as PDFs), they can access `/api/v1/reports/students/{id}/grade-slip`. The `ReportService.gradeSlip` method queries `academicRecordRepository` directly without any faculty assignment or ownership checks.
- **Blast radius**: Any user with `REPORT_GENERATE` can download the grade slip or student profile PDF of any student in the system, bypassing all the access restrictions implemented in `GradeService`.
- **Mitigation**: Implement similar access checks (verifying bypass roles or faculty assignments) in `ReportService` before generating individual student reports.

### [Low] Challenge 4: REST Non-Conformance for Non-Existent Students in `GradeService`

- **Assumption challenged**: The assumption that querying grades for an invalid/non-existent student ID is safely handled by returning an empty list.
- **Attack scenario**: An authorized user (e.g. registrar) requests grades for a non-existent student ID. The service layer does not check if the student exists and returns a `200 OK` response with an empty list `[]` instead of a `404 Not Found` error.
- **Blast radius**: Misleading API responses, which mask client-side bugs or incorrect UUID inputs.
- **Mitigation**: Add a check in `GradeService.studentGrades` to verify student existence using `studentRepository.existsById(studentId)` and throw `NotFoundException` if not found.

---

## Stress Test Results

- **BOLA Bypass Scenario**: A mock principal with `STUDENT_VIEW` and no bypass roles/faculty roles tries to fetch another student's grades.
  - *Expected behavior*: Denied with a security exception (fail-closed).
  - *Actual/predicted behavior*: Allowed, returning the student's grades and academic records successfully (fail-open).
  - *Result*: **FAIL** (Confirmed empirically via `GradeServiceAdversarialTests`).

- **Faculty Roster Mismatch Scenario**: A real faculty member with default permissions (no `STUDENT_VIEW`) calls `/api/v1/grades/student/{studentId}`.
  - *Expected behavior*: Access allowed for their assigned students.
  - *Actual/predicted behavior*: Denied by the controller-level Spring Security annotation.
  - *Result*: **FAIL** (Confirmed by seed analysis).

---

## Unchallenged Areas

- **Gradebook Calculation**: The weighted gradebook calculations and band logic are out of scope for this adversarial check and were not challenged.
- **Audit Logging**: The audit logging of grade changes was not analyzed for data integrity or log injection.
