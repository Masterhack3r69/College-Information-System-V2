## Review Summary

**Verdict**: APPROVE

Overall, the RBAC changes implemented in `EnrollmentSubjectRepository`, `GradeService`, and `GradeServiceTests` are highly robust and correct. They successfully satisfy the requirements that Teacher/Faculty accounts can only access academic functions (such as viewing student grades, viewing/encoding/submitting class grades, and viewing academic records) for their assigned classes and students, and are blocked for unassigned ones.

The tests compile, build, and pass successfully.

---

## Findings

### [Minor] Finding 1: GradeService.list lacks service-layer check for faculty assignment
- **What**: The `list` method in `GradeService` does not perform any role-based checking or faculty assignment validation at the service layer.
- **Where**: `src/main/java/com/school/sis/grade/service/GradeService.java` (Line 90)
- **Why**: An unassigned faculty could theoretically query all grades if they bypass the controller layer.
- **Suggestion**: As a defense-in-depth measure, consider adding a check inside the service layer or validating that if a non-admin/faculty user is calling `list`, the criteria is restricted to their assigned `facultyId`. However, this is currently mitigated because the endpoint in `GradeController.java` is annotated with `@PreAuthorize("hasAuthority('GRADE_APPROVE')")` which Faculty accounts do not possess.

---

## Verified Claims

- **Faculty cannot access unassigned student grades or academic records** → verified via unit tests `facultyCannotAccessUnassignedStudentGradesAndRecords` and inspection of `ensureFacultyAccessToStudent` method → **PASS**
- **Faculty can access assigned student grades and academic records** → verified via unit test `facultyCanAccessAssignedStudentGradesAndRecords` and query logic → **PASS**
- **Faculty cannot encode grades for unassigned classes** → verified via unit test `facultyCanEncodeAssignedClassButNotAnotherClass` and `ensureCanEncodeSchedule` method → **PASS**
- **Query correctness for checking assignment** → verified via `isFacultyAssignedToStudent` query join conditions on enrolled and confirmed states → **PASS**

---

## Coverage Gaps

- **Lack of service-layer restriction on GradeService.list** — risk level: **Low** — recommendation: **Accept risk** as it is properly secured at the API controller layer by requiring the `GRADE_APPROVE` authority.

---

## Unverified Items

- None. All security paths and assertions have been verified by executing the project test suite (`mvn test -Dtest=GradeServiceTests`).
