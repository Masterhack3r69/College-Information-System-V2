## Forensic Audit Report

**Work Product**: Grade Service RBAC (Role-Based Access Control) Implementation
**Profile**: General Project
**Verdict**: CLEAN

### Phase Results
- **Hardcoded output detection**: PASS — No hardcoded test results, expected outputs, or verification bypasses found in the source code or test classes.
- **Facade detection**: PASS — Code implementations contain authentic logic querying the database and context authorities. Methods like `ensureFacultyAccessToStudent` check the active user principal roles against `SisUserDetails` and `EnrollmentSubjectRepository.isFacultyAssignedToStudent` mapping correctly.
- **Pre-populated artifact detection**: PASS — No pre-populated logs, result files, or verification artifacts exist in the workspace.
- **Build and run**: PASS — Successfully built the project and executed the test suite `mvn test -Dtest=GradeServiceTests`.
- **Output verification**: PASS — Output matches expected behavior. All 16 unit tests for service limits and RBAC restrictions executed and passed.
- **Dependency audit**: PASS — Core logic for grade encoding and security access checks is written from scratch using standard Spring Boot Security and Spring Data JPA, without relying on third-party frameworks to circumvent implementation.

---

### Evidence

#### 1. Repository Access Check Query (`EnrollmentSubjectRepository.java`)
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

#### 2. Access Enforcement Check (`GradeService.java`)
```java
private void ensureFacultyAccessToStudent(UUID studentId) {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    if (authentication != null) {
        boolean hasFacultyRole = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(a -> a.equals("ROLE_FACULTY") || a.equals("GRADE_ENCODE"));
        boolean hasBypassRole = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(a -> a.equals("ROLE_SUPER_ADMIN") ||
                               a.equals("ROLE_REGISTRAR") ||
                               a.equals("ROLE_DEAN") ||
                               a.equals("ROLE_PROGRAM_HEAD") ||
                               a.equals("ROLE_READ_ONLY_STAFF"));
        if (hasFacultyRole && !hasBypassRole) {
            if (!(authentication.getPrincipal() instanceof SisUserDetails details)) {
                throw new BusinessRuleException("Access denied: Invalid security principal type for faculty");
            }
            UUID facultyId = details.facultyId();
            if (facultyId == null) {
                throw new BusinessRuleException("Faculty user account is not linked to a Faculty record");
            }
            boolean assigned = enrollmentSubjectRepository.isFacultyAssignedToStudent(facultyId, studentId);
            if (!assigned) {
                throw new BusinessRuleException("Faculty can only access assigned students");
            }
        }
    }
}
```

#### 3. Test Execution Logs
```text
[INFO] Running com.school.sis.grade.GradeServiceTests
...
[INFO] Tests run: 16, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 40.03 s -- in com.school.sis.grade.GradeServiceTests
[INFO] 
[INFO] Results:
[INFO] 
[INFO] Tests run: 16, Failures: 0, Errors: 0, Skipped: 0
[INFO] 
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
```
