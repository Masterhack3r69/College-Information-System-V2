# Handoff Report — worker_rbac_fix

## 1. Observation
- Modified files:
  - `src/main/java/com/school/sis/grade/service/GradeService.java`
  - `src/test/java/com/school/sis/grade/GradeServiceTests.java`
- Verbatim changes in `GradeService.java` (`ensureFacultyAccessToStudent` method starting around line 223):
  - Prior implementation bypassed validation if `facultyId` was null or if the principal was not an instance of `SisUserDetails`.
  - Updated implementation:
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
- Verbatim changes in `GradeServiceTests.java`:
  - Replaced the vulnerable bypass tests with:
    - `facultyWithNullFacultyIdIsDeniedAccess()`: Asserts that a faculty user with a null faculty ID throws a `BusinessRuleException` with message `"Faculty user account is not linked to a Faculty record"`.
    - `nonSisUserDetailsPrincipalWithFacultyRoleIsDeniedAccess()`: Asserts that a standard Spring Security `User` principal with the `ROLE_FACULTY` role throws a `BusinessRuleException` with message `"Access denied: Invalid security principal type for faculty"`.
- Test verification results:
  - Command: `mvn clean test -Dtest=GradeServiceTests`
  - Output: `Tests run: 16, Failures: 0, Errors: 0, Skipped: 0` (Build Success).

## 2. Logic Chain
- Under the original implementation, the access check in `ensureFacultyAccessToStudent` only activated if `authentication.getPrincipal() instanceof SisUserDetails details` was true AND `details.facultyId() != null` was true. This meant any request lacking either of those characteristics completely bypassed the assigned faculty verification even if the user had faculty roles (`ROLE_FACULTY` / `GRADE_ENCODE`).
- By extracting role checks directly from `authentication.getAuthorities()` first, we identify whether the principal claims a faculty role.
- Once a faculty role is identified and bypass roles are ruled out, we fail-closed if:
  - The principal is not of type `SisUserDetails` (throws `Access denied: Invalid security principal type for faculty`).
  - The principal's `facultyId` is null (throws `Faculty user account is not linked to a Faculty record`).
- The added test cases verify these two access control boundaries explicitly by mocking the security context and asserting the expected exceptions are thrown.

## 3. Caveats
- No caveats. The implementation precisely matches the security context requirements and user requests.

## 4. Conclusion
- The security bypass vulnerabilities in the faculty access control implementation have been resolved. The access validation logic now fails-closed when a faculty-roled user lacks a valid `SisUserDetails` principal or has a null faculty ID. The test suite correctly validates these scenarios and passes cleanly.

## 5. Verification Method
- Execute the following command in the workspace directory to verify that compile and all tests in `GradeServiceTests` pass:
  ```bash
  mvn clean test -Dtest=GradeServiceTests
  ```
- Inspect `src/main/java/com/school/sis/grade/service/GradeService.java` to confirm the updated logic of `ensureFacultyAccessToStudent`.
- Inspect `src/test/java/com/school/sis/grade/GradeServiceTests.java` to confirm the presence of the two new test methods: `facultyWithNullFacultyIdIsDeniedAccess` and `nonSisUserDetailsPrincipalWithFacultyRoleIsDeniedAccess`.
