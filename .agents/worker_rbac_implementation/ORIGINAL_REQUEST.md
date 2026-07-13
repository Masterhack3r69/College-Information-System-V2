## 2026-07-13T08:38:46Z
You are the Worker. Your working directory is c:\\Users\\PC\\Projects\\cis\\.agents\\worker_rbac_implementation.
Your task is to implement and verify RBAC / data-level filtering so that Teacher/Faculty accounts can only access academic functions (grading, academic records) for their specifically assigned students.

Please perform the following changes:

1. In `src/main/java/com/school/sis/enrollment/repository/EnrollmentSubjectRepository.java`:
Add the following query method:
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

2. In `src/main/java/com/school/sis/grade/service/GradeService.java`:
- Add the following imports:
```java
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.Authentication;
```
- Add the following helper method to check Faculty access:
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
- In `studentGrades(UUID studentId)`, call `ensureFacultyAccessToStudent(studentId)` at the beginning.
- In `academicRecords(UUID studentId)`, call `ensureFacultyAccessToStudent(studentId)` at the beginning.

3. In `src/test/java/com/school/sis/grade/GradeServiceTests.java`:
- Add these two test cases:
```java
    @Test
    void facultyCanAccessAssignedStudentGradesAndRecords() {
        ScheduleResponse schedule = confirmedClassWithTwoStudents();
        
        SisUserDetails principal = mock(SisUserDetails.class);
        when(principal.id()).thenReturn(UUID.randomUUID());
        when(principal.facultyId()).thenReturn(faculty.getId());
        Collection<GrantedAuthority> authorities = List.of(
                new SimpleGrantedAuthority("GRADE_ENCODE"),
                new SimpleGrantedAuthority("STUDENT_VIEW"),
                new SimpleGrantedAuthority("ROLE_FACULTY")
        );
        doReturn(authorities).when(principal).getAuthorities();

        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal, null, authorities)
        );

        try {
            List<com.school.sis.grade.dto.GradeResponse> grades = gradeService.studentGrades(student.getId());
            assertThat(grades).isNotNull();
            
            List<com.school.sis.grade.dto.AcademicRecordResponse> records = gradeService.academicRecords(student.getId());
            assertThat(records).isNotNull();
        } finally {
            org.springframework.security.core.context.SecurityContextHolder.clearContext();
        }
    }

    @Test
    void facultyCannotAccessUnassignedStudentGradesAndRecords() {
        ScheduleResponse schedule = confirmedClassWithTwoStudents();
        
        SisUserDetails principal = mock(SisUserDetails.class);
        when(principal.id()).thenReturn(UUID.randomUUID());
        when(principal.facultyId()).thenReturn(otherFaculty.getId());
        Collection<GrantedAuthority> authorities = List.of(
                new SimpleGrantedAuthority("GRADE_ENCODE"),
                new SimpleGrantedAuthority("STUDENT_VIEW"),
                new SimpleGrantedAuthority("ROLE_FACULTY")
        );
        doReturn(authorities).when(principal).getAuthorities();

        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal, null, authorities)
        );

        try {
            assertThatThrownBy(() -> gradeService.studentGrades(student.getId()))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessage("Faculty can only access assigned students");

            assertThatThrownBy(() -> gradeService.academicRecords(student.getId()))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessage("Faculty can only access assigned students");
        } finally {
            org.springframework.security.core.context.SecurityContextHolder.clearContext();
        }
    }
```

Run compilation and tests (`mvn clean test -Dtest=GradeServiceTests`) to verify that the implementation compiles and all tests pass perfectly.
Report your findings and the test results in your handoff.md.
