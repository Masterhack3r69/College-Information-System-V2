# Audit Report — 2026-07-13T16:45:00+08:00

## Forensic Audit Report

**Work Product**: GradeService and EnrollmentSubjectRepository Access Control Implementation
**Profile**: General Project (Integrity Mode: development)
**Verdict**: CLEAN

### Phase Results

- **Hardcoded output detection**: PASS
  No hardcoded expected test results, outputs, or verification bypasses were found in the source code (`GradeService.java`, `EnrollmentSubjectRepository.java`) or in the test suite (`GradeServiceTests.java`). All assertions check actual database records created during test setup.
  
- **Facade detection**: PASS
  No dummy implementations or facade methods were found. The service methods fetch live records, and the repository method performs a real SQL/JPQL count query against the underlying DB schema.
  
- **Pre-populated artifact detection**: PASS
  No pre-populated logs, reports, or test verification outputs were found in the directory prior to running the test suite.
  
- **Behavioral Verification (Build and run)**: PASS
  The project test command `mvn test -Dtest=GradeServiceTests` was executed. The build completed successfully and all 9 test cases passed without errors:
  `Tests run: 9, Failures: 0, Errors: 0, Skipped: 0`
  
- **Dependency audit**: PASS
  No prohibited third-party dependencies are imported for core logic; Spring Security, Spring Data JPA, and the standard JDK are used.

---

## Technical Audit Findings

### 1. Correctness of `EnrollmentSubjectRepository`
The new repository method `isFacultyAssignedToStudent` is defined as:
```java
@Query("""
        SELECT CASE WHEN COUNT(es) > 0 THEN true ELSE false END
        FROM EnrollmentSubject es
        JOIN es.enrollment e
        JOIN es.classSchedule cs
        WHERE e.student.id = :studentId
          AND cs.faculty.id = :facultyId
          AND es.status = com.school.sis.enrollment.entity.EnrollmentSubjectStatus.ENROLLED
          AND e.status = com.school.sis.enrollment.entity.EnrollmentStatus.CONFIRMED
        """)
boolean isFacultyAssignedToStudent(@Param("facultyId") UUID facultyId, @Param("studentId") UUID studentId);
```
This correctly verifies if there is a confirmed enrollment mapping connecting the specific student and the faculty member via any enrolled subject's class schedule.

### 2. Correctness of `GradeService`
The helper method `ensureFacultyAccessToStudent` verifies that:
- For administrative roles (`ROLE_SUPER_ADMIN`, `ROLE_REGISTRAR`, `ROLE_DEAN`, `ROLE_PROGRAM_HEAD`, `ROLE_READ_ONLY_STAFF`), the access control checks are bypassed.
- For faculty users, the user must be assigned to the student via the query method in `EnrollmentSubjectRepository`. If not assigned, a `BusinessRuleException` is thrown.
This check is properly placed at the beginning of the `studentGrades(UUID)` and `academicRecords(UUID)` methods.

---

## Adversarial Review & Risk Analysis

### Challenge 1: Bypassing Faculty Check via Null `facultyId` (Risk: HIGH)
- **Assumption**: Every user account with `ROLE_FACULTY` is correctly linked to a `Faculty` record (i.e. `SisUserDetails.facultyId()` is not null).
- **Attack Scenario**: If an admin configures a User with the `ROLE_FACULTY` role but leaves the linked `faculty` relation null in the database:
  - `SisUserDetails.facultyId()` returns `null`.
  - The check `if (facultyId != null)` inside `ensureFacultyAccessToStudent` evaluates to `false`.
  - The access check is completely bypassed, giving this faculty user unrestricted access to all student grades and academic records.
- **Mitigation**: Update the condition to reject access if the user has `ROLE_FACULTY` (or does not have an admin bypass role) but `facultyId` is null.

### Challenge 2: Indefinite Historic Access to Student Records (Risk: MEDIUM)
- **Assumption**: A faculty member's access to a student's record should remain active indefinitely after a class has concluded.
- **Attack Scenario**: Once a faculty member is assigned to a student in any semester, the `EnrollmentSubject` record status remains `ENROLLED` and the student enrollment remains `CONFIRMED` in history. Thus, `isFacultyAssignedToStudent` will return `true` forever, allowing the teacher to view that student's records in subsequent years even if they no longer teach them.
- **Mitigation**: Constrain the JPQL query in `isFacultyAssignedToStudent` to only consider classes in the active school year/semester or only allow viewing grades corresponding to schedules taught by the faculty.
