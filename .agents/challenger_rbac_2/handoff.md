# Handoff Report

## 1. Observation
We reviewed the implementation of the data-level isolation security checks for Faculty in `src/main/java/com/school/sis/grade/service/GradeService.java`. The access check `ensureFacultyAccessToStudent` (lines 223-244) is implemented as follows:
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

We added two adversarial test cases to `src/test/java/com/school/sis/grade/GradeServiceTests.java`:
1. `facultyAccountWithNullFacultyIdCanBypassAccessCheck`: Mocks a user with the role `ROLE_FACULTY` and `STUDENT_VIEW` authority whose `facultyId` is `null` (e.g. unlinked or missing relation).
2. `nonSisUserDetailsPrincipalCanBypassAccessCheck`: Mocks a standard Spring Security `User` principal instead of `SisUserDetails`.

We executed the tests:
- Command: `mvn test -Dtest=GradeServiceTests`
- Output: `[INFO] Tests run: 16, Failures: 0, Errors: 0, Skipped: 0` (showing the two new tests passed successfully without throwing any exception).

## 2. Logic Chain
1. In `ensureFacultyAccessToStudent`, the check for faculty assignment is guarded by two conditions:
   - `authentication.getPrincipal() instanceof SisUserDetails details`
   - `facultyId != null`
2. If either of these conditions is false, the method exits cleanly without throwing any exception (failing open).
3. If a Faculty account's `facultyId` is null (e.g. they are not linked to a faculty entity), the guard `if (facultyId != null)` evaluates to false. The access check is completely skipped, granting them access to any student's grades and academic records (verified by `facultyAccountWithNullFacultyIdCanBypassAccessCheck`).
4. If the authentication principal is a standard Spring Security `User` object (or any other non-`SisUserDetails` class), `authentication.getPrincipal() instanceof SisUserDetails` evaluates to false. The check exits cleanly, allowing the request to proceed (verified by `nonSisUserDetailsPrincipalCanBypassAccessCheck`).
5. This represents a critical fail-open vulnerability that bypasses all data isolation controls for Faculty accounts.

## 3. Caveats
- No caveats. The bypass behavior was empirically verified and reproduced using unit tests on the Spring context.

## 4. Conclusion
The current access control check in `GradeService.java` is not robust and fails open. Anyone with the `ROLE_FACULTY` role whose profile lacks a `facultyId` or anyone authenticated with a standard Spring Security principal type will bypass the data-level isolation rules. The worker's tests did not cover these critical edge cases and were not sufficient to prove the robustness of the protection.

## 5. Verification Method
1. View the newly added tests in `src/test/java/com/school/sis/grade/GradeServiceTests.java`.
2. Run the test command in the project root:
   ```bash
   mvn test -Dtest=GradeServiceTests
   ```
3. Observe that 16 tests run and all of them pass, proving that the bypass assertions successfully execute.
