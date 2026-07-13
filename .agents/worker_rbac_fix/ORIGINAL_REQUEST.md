## 2026-07-13T08:44:33Z

You are the Worker. Your working directory is c:\Users\PC\Projects\cis\.agents\worker_rbac_fix.
Your task is to fix security bypass vulnerabilities in the faculty access control implementation.

Specifically:
1. In `src/main/java/com/school/sis/grade/service/GradeService.java`, modify `ensureFacultyAccessToStudent` to verify roles/authorities directly from the `Authentication` object (rather than checking if `facultyId != null`) and fail closed if the principal type is invalid or if the faculty account has a null faculty ID:
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

2. In `src/test/java/com/school/sis/grade/GradeServiceTests.java`, add the following test cases to verify the new access control boundaries:
```java
    @Test
    void facultyWithNullFacultyIdIsDeniedAccess() {
        ScheduleResponse schedule = confirmedClassWithTwoStudents();
        
        SisUserDetails principal = mock(SisUserDetails.class);
        when(principal.id()).thenReturn(UUID.randomUUID());
        when(principal.facultyId()).thenReturn(null); // NULL faculty ID
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
                    .hasMessage("Faculty user account is not linked to a Faculty record");
        } finally {
            org.springframework.security.core.context.SecurityContextHolder.clearContext();
        }
    }

    @Test
    void nonSisUserDetailsPrincipalWithFacultyRoleIsDeniedAccess() {
        ScheduleResponse schedule = confirmedClassWithTwoStudents();
        
        // Mock a standard Spring Security User principal (not SisUserDetails)
        Collection<GrantedAuthority> authorities = List.of(
                new SimpleGrantedAuthority("GRADE_ENCODE"),
                new SimpleGrantedAuthority("STUDENT_VIEW"),
                new SimpleGrantedAuthority("ROLE_FACULTY")
        );
        org.springframework.security.core.userdetails.User principal = new org.springframework.security.core.userdetails.User(
                "testfaculty", "password", authorities
        );

        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal, null, authorities)
        );

        try {
            assertThatThrownBy(() -> gradeService.studentGrades(student.getId()))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessage("Access denied: Invalid security principal type for faculty");
        } finally {
            org.springframework.security.core.context.SecurityContextHolder.clearContext();
        }
    }
```

Run compilation and tests (`mvn clean test -Dtest=GradeServiceTests`) to verify that the implementation compiles and all 11 tests pass perfectly.
Report your findings and the test results in your handoff.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
