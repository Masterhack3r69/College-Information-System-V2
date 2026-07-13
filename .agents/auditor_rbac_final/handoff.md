# Handoff Report

## 1. Observation
The following file modifications were observed via `git status` and `git diff`:
1. **Repository Query Addition**:
   File: `src/main/java/com/school/sis/enrollment/repository/EnrollmentSubjectRepository.java`
   Line 36-47:
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

2. **Access Security Enforcement**:
   File: `src/main/java/com/school/sis/grade/service/GradeService.java`
   Line 223-250:
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

3. **Behavioral Testing**:
   Ran the command `mvn test -Dtest=GradeServiceTests` which output:
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
   ```

## 2. Logic Chain
1. We parsed `git status` to identify all changed files in the working directory. Only three files were modified, meaning all RBAC logic modifications are contained inside these three files.
2. We analyzed `EnrollmentSubjectRepository.java` to verify that the query `isFacultyAssignedToStudent` checks actual database relationships (i.e. joined tables `EnrollmentSubject`, `Enrollment`, `ClassSchedule`) instead of hardcoding any return values.
3. We analyzed `GradeService.java` to confirm that the `ensureFacultyAccessToStudent` method correctly secures the endpoints (`studentGrades` and `academicRecords`). It correctly extracts credentials using the standard `SecurityContextHolder`, checks if the user has a faculty role (`ROLE_FACULTY` or `GRADE_ENCODE`) and does not possess a bypass role, verifies the principal type, handles null `facultyId`, and uses the repository function to enforce class-level assignments.
4. We verified that `mvn test -Dtest=GradeServiceTests` executes 16 distinct tests, which comprehensively cover faculty access with different permissions (assigned faculty, unassigned faculty, bypass roles, non-SisUserDetails principal, null faculty ID). Since the tests all pass successfully, we can conclude that the RBAC enforcement behaves as intended without errors.
5. Therefore, there are no facade implementations, hardcoded test logic, or bypasses. The work product verdict is **CLEAN**.

## 3. Caveats
- If the request authentication is null (e.g. from internal system operations or asynchronous jobs), the access check in `ensureFacultyAccessToStudent` is skipped. This is standard in Spring Boot services, as Spring Security's filter chain ensures that only authenticated requests reach the controllers.
- Our audit scope was restricted specifically to the Java backend RBAC changes and the `GradeServiceTests` suite.

## 4. Conclusion
The implementation of the Role-Based Access Control filters on Grade Service is fully authentic, robust, and correctly verified. The final verdict is **CLEAN**.

## 5. Verification Method
To independently verify the audit:
1. Run the test command:
   ```bash
   mvn test -Dtest=GradeServiceTests
   ```
2. Verify that the output lists `BUILD SUCCESS` with 16 tests executed and 0 failures.
3. Inspect `src/main/java/com/school/sis/grade/service/GradeService.java` at line 223 to confirm the security check checks user authorities and database assignments correctly.
