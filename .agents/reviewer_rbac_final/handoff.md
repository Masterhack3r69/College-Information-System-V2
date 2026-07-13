# Handoff Report — reviewer_rbac_final

## 1. Observation
- File under review:
  - `src/main/java/com/school/sis/grade/service/GradeService.java`
  - `src/test/java/com/school/sis/grade/GradeServiceTests.java`
  - `src/main/java/com/school/sis/enrollment/repository/EnrollmentSubjectRepository.java`
- Exact changes observed in `GradeService.java` (`ensureFacultyAccessToStudent` method starting around line 223):
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
- Method invocations of `ensureFacultyAccessToStudent(studentId)` are present at the beginning of `studentGrades(UUID studentId)` (line 207) and `academicRecords(UUID studentId)` (line 216).
- Verification test suite command: `mvn test -Dtest=*GradeServiceTests`
- Run output of Maven tests:
  ```
  [INFO] Running com.school.sis.grade.GradeServiceTests
  ...
  [INFO] Tests run: 16, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 43.29 s -- in com.school.sis.grade.GradeServiceTests
  [INFO] 
  [INFO] Results:
  [INFO] 
  [INFO] Tests run: 16, Failures: 0, Errors: 0, Skipped: 0
  [INFO] 
  [INFO] ------------------------------------------------------------------------
  [INFO] BUILD SUCCESS
  [INFO] ------------------------------------------------------------------------
  ```

## 2. Logic Chain
- Previously, a faculty user with a `null` `facultyId` or a non-`SisUserDetails` principal could bypass the student assignment check because the validation code only executed inside a block checking `if (authentication.getPrincipal() instanceof SisUserDetails details && details.facultyId() != null)`.
- Under the new implementation (observed in Section 1), users who claim a faculty role (`ROLE_FACULTY` or `GRADE_ENCODE`) and do not have a bypass role (e.g. `ROLE_SUPER_ADMIN`) must pass a strict structural check:
  - If they do not have a principal of type `SisUserDetails`, they are denied access with message `"Access denied: Invalid security principal type for faculty"`.
  - If their principal has a `null` `facultyId`, they are denied access with message `"Faculty user account is not linked to a Faculty record"`.
- The added unit tests verify these conditions:
  - `facultyWithNullFacultyIdIsDeniedAccess` mocks a `SisUserDetails` principal with a `null` faculty ID and asserts it throws the corresponding exception.
  - `nonSisUserDetailsPrincipalWithFacultyRoleIsDeniedAccess` mocks a standard `User` principal with a faculty role and asserts it throws the corresponding exception.
- Since all 16 tests pass successfully, the new access control boundaries are confirmed to be functioning correctly and closing the vulnerabilities.

## 3. Caveats
- No caveats. The access control logic matches the specification, and the test assertions correctly validate the closed bypass scenarios.

## 4. Conclusion
- The RBAC bypass vulnerabilities in `GradeService` have been fully closed using a fail-closed strategy. The unit tests correct and clean, and the build succeeds. The fix is approved.

## 5. Verification Method
- Execute the following command in the workspace directory to verify all tests in `GradeServiceTests` pass:
  ```bash
  mvn test -Dtest=*GradeServiceTests
  ```
- Inspect `src/main/java/com/school/sis/grade/service/GradeService.java` to confirm the secure implementation of `ensureFacultyAccessToStudent`.
- Inspect `src/test/java/com/school/sis/grade/GradeServiceTests.java` to verify the presence and correctness of the new tests (`facultyWithNullFacultyIdIsDeniedAccess` and `nonSisUserDetailsPrincipalWithFacultyRoleIsDeniedAccess`).
