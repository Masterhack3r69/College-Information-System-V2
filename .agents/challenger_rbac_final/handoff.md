# Handoff Report: GradeService RBAC Security Verification

## 1. Observation
- Verified that `GradeServiceTests.java` compiles and runs successfully with `mvn test -Dtest=GradeServiceTests` executing all 16 tests:
  ```
  [INFO] Running com.school.sis.grade.GradeServiceTests
  ...
  [INFO] Tests run: 16, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 46.95 s -- in com.school.sis.grade.GradeServiceTests
  ```
- In `GradeService.java`, the method `ensureFacultyAccessToStudent` (lines 223-250) has the following structure:
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
- In `GradeServiceTests.java`, test case `nonFacultyAccountWithoutBypassRolesCanAccessStudentGradesIfTheyHaveStudentView` (lines 514-538) mocks a user with only `STUDENT_VIEW` authority and asserts that they can view grades without exceptions, proving that non-faculty and non-bypass roles are allowed to access grades:
  ```java
      @Test
      void nonFacultyAccountWithoutBypassRolesCanAccessStudentGradesIfTheyHaveStudentView() {
          ...
          Collection<GrantedAuthority> authorities = List.of(
                  new SimpleGrantedAuthority("STUDENT_VIEW")
          );
          ...
          List<com.school.sis.grade.dto.GradeResponse> grades = gradeService.studentGrades(student.getId());
          assertThat(grades).isNotNull();
      }
  ```
- In the DB seeds (`V1__foundation_auth_and_setup.sql`), the role `FACULTY` has only `ACADEMIC_SETUP_VIEW` and `GRADE_ENCODE` permissions (lines 215-216). It does not have `STUDENT_VIEW`.
- In `GradeController.java`, the endpoint `/student/{studentId}` has `@PreAuthorize("hasAuthority('STUDENT_VIEW')")` (line 89).
- In `ReportService.java`, the methods `studentProfile` and `gradeSlip` do not perform any faculty assignment or ownership checks (lines 96-149, 314-334).

---

## 2. Logic Chain
- **Step 1 (BOLA)**: Based on the implementation of `ensureFacultyAccessToStudent` (Observation 2), the faculty assignment check is only triggered if the user has `ROLE_FACULTY` or `GRADE_ENCODE` (`if (hasFacultyRole && !hasBypassRole)`). If the user does not have these roles but has `STUDENT_VIEW` (Observation 3), they bypass the check entirely. This confirms a fail-open posture.
- **Step 2 (Faculty lockout)**: Based on `V1__foundation_auth_and_setup.sql` (Observation 4), a faculty user lacks the `STUDENT_VIEW` permission. Consequently, when attempting to call `/api/v1/grades/student/{studentId}` (Observation 5), they will be blocked by the Spring Security controller PreAuthorize annotation, preventing them from accessing individual student grade slips in production, even though the service layer's custom checks are mocked with `STUDENT_VIEW` in tests.
- **Step 3 (Report Bypass)**: Based on `ReportService.java` (Observation 6), if a user is granted `REPORT_GENERATE` (e.g. to download their class list/grade sheet PDFs), they can access the `/api/v1/reports/students/{id}/grade-slip` endpoint. Since `ReportService` doesn't enforce any assignment checks, they can generate and view any student's grade slip PDF, bypassing all the access control checks in `GradeService`.

---

## 3. Caveats
- No other service implementations (e.g., Cashier or Enrollment Services) were checked for similar BOLA vulnerabilities.
- Direct endpoint testing was not performed; instead, service-level integration tests and DB seed analyses were used to determine the production behavior.

---

## 4. Conclusion
The new test cases in `GradeServiceTests.java` correctly assert the behavior defined in the implementation, but they confirm a critical BOLA vulnerability where any user with `STUDENT_VIEW` who is not a faculty member can bypass assignment checks to view arbitrary student grades. Furthermore, faculty members are locked out of viewing individual student grades in production due to a mismatch between database seed permissions and endpoint security constraints. Lastly, report endpoints allow complete bypass of the grade authorization checks.

---

## 5. Verification Method
1. Run the test suite:
   ```powershell
   mvn test -Dtest=GradeServiceTests
   ```
2. Inspect the test `nonFacultyAccountWithoutBypassRolesCanAccessStudentGradesIfTheyHaveStudentView` in `GradeServiceTests.java` (lines 514-538) to verify that it expects successful retrieval of records for non-bypass, non-faculty users.
3. Compare the permissions granted to `FACULTY` in `V1__foundation_auth_and_setup.sql` against the `@PreAuthorize` annotation on `/student/{studentId}` in `GradeController.java` to confirm the faculty lockout.
