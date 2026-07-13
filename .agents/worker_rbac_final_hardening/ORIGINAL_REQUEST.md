## 2026-07-13T08:56:16Z
You are the Worker. Your working directory is c:\Users\PC\Projects\cis\.agents\worker_rbac_final_hardening.
Your task is to perform the final security hardening for Faculty access to student grades and academic records:

1. In `src/main/java/com/school/sis/grade/controller/GradeController.java`:
Update line 89 to allow `GRADE_ENCODE` authority:
```java
    @GetMapping("/student/{studentId}")
    @PreAuthorize("hasAnyAuthority('STUDENT_VIEW', 'GRADE_ENCODE')")
```

2. In `src/main/java/com/school/sis/student/controller/StudentController.java`:
Update line 115 to allow `GRADE_ENCODE` authority:
```java
    @GetMapping("/{id}/academic-records")
    @PreAuthorize("hasAnyAuthority('STUDENT_VIEW', 'GRADE_ENCODE')")
```

3. In `src/test/java/com/school/sis/grade/GradeServiceTests.java`:
Update the mocked authorities for the faculty tests to NOT include `STUDENT_VIEW` (so they only have `GRADE_ENCODE` and `ROLE_FACULTY`), confirming that standard Faculty without `STUDENT_VIEW` can access the endpoints.
Specifically, update the mocked authorities in:
- `facultyCanAccessAssignedStudentGradesAndRecords()`
- `facultyCannotAccessUnassignedStudentGradesAndRecords()`
- `facultyWithNullFacultyIdIsDeniedAccess()`
Make sure they only use:
```java
        Collection<GrantedAuthority> authorities = List.of(
                new SimpleGrantedAuthority("GRADE_ENCODE"),
                new SimpleGrantedAuthority("ROLE_FACULTY")
        );
```

Run compilation and tests (`mvn clean test -Dtest=GradeServiceTests`) to verify that the implementation compiles and all 16 tests pass perfectly.
Report your findings and the test results in your handoff.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
