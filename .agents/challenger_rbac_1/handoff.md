# Handoff Report

## 1. Observation
- **Exact File Paths and Line Numbers**:
  - `src/main/java/com/school/sis/grade/service/GradeService.java`:
    - Method `ensureFacultyAccessToStudent(UUID)` lines 223–244:
      ```java
      private void ensureFacultyAccessToStudent(UUID studentId) {
          Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
          if (authentication != null && authentication.getPrincipal() instanceof SisUserDetails details) {
              UUID facultyId = details.facultyId();
              if (facultyId != null) {
                  boolean hasBypassRole = details.getAuthorities().stream()
                          .map(GrantedAuthority::getAuthority)
                          .anyMatch(a -> a.equals("ROLE_SUPER_ADMIN") ||
                                         a.equals("ROLE_REGISTRAR") ||
                                         a.equals("ROLE_DEAN") ||
                                         a.equals("ROLE_PROGRAM_HEAD") ||
                                         a.equals("ROLE_READ_ONLY_STAFF"));
                  if (hasBypassRole) {
                      return;
                  }
                  boolean assigned = enrollmentSubjectRepository.isFacultyAssignedToStudent(facultyId, studentId);
                  if (!assigned) {
                      throw new BusinessRuleException("Faculty can only access assigned students");
                  }
              }
          }
      }
      ```
  - `src/test/java/com/school/sis/grade/GradeServiceTests.java`:
    - Lines 427–600 contain newly implemented access control verification tests.
    - Two additional test cases verifying bypass vulnerabilities were added:
      1. `facultyAccountWithNullFacultyIdCanBypassAccessCheck` (lines 541–569)
      2. `nonSisUserDetailsPrincipalCanBypassAccessCheck` (lines 572–598)
- **Tool Commands and Results**:
  - Proposed and executed `mvn clean test -Dtest=GradeServiceTests` which finished with `BUILD SUCCESS` and `Tests run: 16, Failures: 0, Errors: 0, Skipped: 0`.

## 2. Logic Chain
1. The helper method `ensureFacultyAccessToStudent` only triggers the assignment-checking logic if:
   - `authentication.getPrincipal()` is an instance of `com.school.sis.auth.security.SisUserDetails`.
   - `details.facultyId()` is not null.
2. If the user's account has `ROLE_FACULTY` but their `facultyId` is null (such as due to account misconfiguration or database inconsistency), the check `facultyId != null` is false. The code exits the method without throwing `BusinessRuleException`, resulting in full access to all students' grades and academic records. This has been empirically proven in test `facultyAccountWithNullFacultyIdCanBypassAccessCheck`.
3. If the user logs in through another authentication provider or method that populates the `SecurityContext` with a non-`SisUserDetails` principal class (e.g., standard Spring `User` or customized principals), the check `principal instanceof SisUserDetails` is false. The method exits without executing any validation, allowing the user to bypass the restriction completely. This has been empirically proven in test `nonSisUserDetailsPrincipalCanBypassAccessCheck`.
4. While normal, correctly-configured Faculty accounts are restricted from accessing unassigned student records, these two bypass conditions allow access to restricted records under specific edge cases.

## 3. Caveats
- The tests mock the security context programmatically using Spring Security's `SecurityContextHolder`.
- We have not modified any implementation files (per review-only constraint).
- The bypass roles verified (`ROLE_SUPER_ADMIN`, `ROLE_REGISTRAR`, `ROLE_DEAN`, `ROLE_PROGRAM_HEAD`, `ROLE_READ_ONLY_STAFF`) are hardcoded in the bypass list and depend on authority naming conventions.

## 4. Conclusion
- The Faculty access control limits successfully block correctly-configured Faculty accounts from retrieving unassigned student grades and academic records.
- However, two critical bypass vulnerabilities exist:
  1. A Faculty account with a null `facultyId` completely bypasses data-level checks.
  2. A principal that is not an instance of `SisUserDetails` completely bypasses checks.
- It is highly recommended to block release until the mitigations outlined in `challenge.md` are implemented in `GradeService.java`.

## 5. Verification Method
- Execute the test command at the project root (`c:\Users\PC\Projects\cis`):
  ```bash
  mvn clean test -Dtest=GradeServiceTests
  ```
- Check that the test output reports:
  ```
  [INFO] Tests run: 16, Failures: 0, Errors: 0, Skipped: 0
  [INFO] BUILD SUCCESS
  ```
- Inspect `src/test/java/com/school/sis/grade/GradeServiceTests.java` from lines 427–600 to review the test scenarios (Bypass roles, unassigned class encoding/submissions/views, null faculty ID bypass, and non-SisUserDetails principal bypass).
