## Challenge Summary

**Overall risk assessment**: MEDIUM

While the implemented RBAC access controls are correct under expected conditions, a few security/logical assumptions could be challenged under adversarial conditions or administrative errors.

---

## Challenges

### [High] Challenge 1: Bypassing Faculty Check via Null `facultyId`
- **Assumption challenged**: Every user account with `ROLE_FACULTY` is correctly linked to a `Faculty` record (i.e., `user.faculty_id` is not null).
- **Attack scenario**: 
  1. An administrator creates a user account, assigns them the `FACULTY` role (which grants them permissions like `GRADE_ENCODE` and potentially `STUDENT_VIEW`), but leaves the `faculty_id` field in the user record null (e.g., due to an incomplete setup flow).
  2. The faculty user logs in. Their principal `SisUserDetails` has `facultyId() == null`.
  3. When they call `studentGrades` or `academicRecords`, the check `if (facultyId != null)` inside `ensureFacultyAccessToStudent` evaluates to `false` and is completely bypassed.
  4. As a result, this faculty user gains unrestricted read access to *all* student grades and academic records in the database, breaking the core RBAC requirement.
- **Blast radius**: High. It allows reading academic profiles for all students.
- **Mitigation**: Update `ensureFacultyAccessToStudent` to enforce that if a user has a faculty-specific authority/role (e.g., `ROLE_FACULTY` or `GRADE_ENCODE`) but `facultyId` is null, access is denied. Alternatively, validate user entity integrity upon creation/update to ensure that users with `ROLE_FACULTY` must have a non-null `facultyId`.

### [Medium] Challenge 2: Indefinite Historic Access to Student Records
- **Assumption challenged**: A teacher's access to a student's records should remain active indefinitely after a semester ends or after the class is completed.
- **Attack scenario**:
  1. Faculty A teaches Student S in a specific class schedule during Semester 1.
  2. Semester 1 ends, and grades are locked. Student S moves on to Semester 2 classes.
  3. In Semester 2, Student S is not enrolled in any classes taught by Faculty A.
  4. However, the database still contains the Semester 1 `EnrollmentSubject` record with status `ENROLLED` (since the class is completed, not dropped).
  5. As a result, the query `isFacultyAssignedToStudent` will continue to return `true` for Faculty A and Student S indefinitely. Faculty A retains full access to Student S's current and future academic records and grades.
- **Blast radius**: Medium. Teachers can track and view academic records of former students indefinitely, which might violate student privacy principles.
- **Mitigation**: Add a temporal or term-based check to `isFacultyAssignedToStudent` so that a faculty member only has access to a student's general records if they are currently assigned to them in an active/current school year and semester, or restrict access to only the grades/records corresponding to their own classes rather than the entire student academic history.

---

## Stress Test Results

- **Attempt to query unassigned student's records (with active assignment on other student)** → returns 403 / BusinessRuleException ("Faculty can only access assigned students") → **PASS**
- **Attempt to query unassigned student's records (with null facultyId but having ROLE_FACULTY)** → bypasses check and returns records → **FAIL** (This confirms Challenge 1).

---

## Unchallenged Areas

- **Gradebook security** — The gradebook service implements strong checks that verify the user is the assigned faculty for the class schedule. It is well-hardened.
