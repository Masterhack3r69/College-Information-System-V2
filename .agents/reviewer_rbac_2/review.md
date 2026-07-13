## Review Summary

**Verdict**: APPROVE

We have reviewed the RBAC changes implemented in `EnrollmentSubjectRepository.java`, `GradeService.java`, and the associated test suite `GradeServiceTests.java`. The implementation satisfies the RBAC requirements. Teacher/faculty accounts are successfully restricted to academic operations for their assigned classes and students, and are blocked for unassigned ones.

## Findings

No critical, major, or minor findings were detected. The security checks are correctly placed in the service layers, and the repository query properly joins enrollment statuses.

## Verified Claims

- **Faculty cannot access unassigned student grades and records** → verified via running the test case `facultyCannotAccessUnassignedStudentGradesAndRecords` in `GradeServiceTests` → **PASS**
- **Faculty can access assigned student grades and records** → verified via running the test case `facultyCanAccessAssignedStudentGradesAndRecords` in `GradeServiceTests` → **PASS**
- **Faculty can encode grades for assigned classes but not unassigned classes** → verified via running the test case `facultyCanEncodeAssignedClassButNotAnotherClass` in `GradeServiceTests` → **PASS**
- **Non-faculty and bypass roles (admin, registrar, dean, etc.) are allowed to access records according to their permissions** → verified via code trace of `ensureFacultyAccessToStudent` bypass check → **PASS**

## Coverage Gaps

No significant coverage gaps. The test suite covers all expected permissions and boundary status checks.
- *Unexplored area*: Other student fields/endpoints. Risk level: low. Recommendation: accept risk, as they are out of the scope of grade/academic record access control.

## Unverified Items

None. All access control claims were verified programmatically and via test execution.
