## Challenge Summary

**Overall risk assessment**: CRITICAL

## Challenges

### [Critical] Challenge 1: Null Faculty ID Bypass on Faculty Accounts

- **Assumption challenged**: The implementation assumes that checking `details.facultyId() != null` is sufficient to identify faculty members, and that a null `facultyId` means the user is not a faculty member.
- **Attack scenario**: If a user has the `ROLE_FACULTY` authority but their account is not properly linked to a `Faculty` entity (resulting in `facultyId` being `null`), the security checks in `GradeService.studentGrades` and `GradeService.academicRecords` will skip the assignment checks entirely. The user can access any student's grades and academic records.
- **Blast radius**: High. Unassigned or misconfigured faculty users can query grades and records for all students in the system.
- **Mitigation**: Instead of checking if `facultyId != null`, the security helper `ensureFacultyAccessToStudent` should explicitly verify if the user has `ROLE_FACULTY` authority. If they have the faculty role and `facultyId` is null, they should be blocked immediately (since they cannot have any assigned students).

### [Critical] Challenge 2: Non-SisUserDetails Principal Bypass

- **Assumption challenged**: The implementation assumes that the authenticated principal is always an instance of `SisUserDetails`.
- **Attack scenario**: If an authenticated principal belongs to a different class (e.g. `org.springframework.security.core.userdetails.User` or another customized OAuth2/JWT principal), the check `authentication.getPrincipal() instanceof SisUserDetails` evaluates to `false`. The entire security method `ensureFacultyAccessToStudent` is skipped without executing any checks, allowing the principal to view all student grades and academic records if they have `STUDENT_VIEW` authority.
- **Blast radius**: High. Any integration, alternative authentication path, or test using standard Spring Security principals bypasses the data-level filtering completely.
- **Mitigation**: Check authorities/roles directly from the `Authentication` object rather than relying on typecasting the principal to `SisUserDetails`. If the user has `ROLE_FACULTY` authority, enforce the restriction regardless of the principal class.

## Stress Test Results

- **Faculty accessing unassigned student's grades/records** → Expected: Blocked with `BusinessRuleException` → Actual: Blocked → **PASS**
- **Faculty accessing assigned student's grades/records** → Expected: Allowed access → Actual: Allowed → **PASS**
- **Faculty with bypass roles (registrar, super admin, dean, program head, read-only staff) accessing unassigned students** → Expected: Allowed access → Actual: Allowed → **PASS**
- **Faculty attempting to encode, submit, or view unassigned class grades** → Expected: Blocked with `BusinessRuleException` → Actual: Blocked → **PASS**
- **Non-faculty account with `STUDENT_VIEW` authority accessing student grades/records** → Expected: Allowed access → Actual: Allowed → **PASS**
- **Faculty with null `facultyId` accessing unassigned student grades/records** → Expected: Blocked with `BusinessRuleException` → Actual: Bypassed/Allowed → **FAIL** (Confirmed by test `facultyAccountWithNullFacultyIdCanBypassAccessCheck`)
- **Non-SisUserDetails principal with `ROLE_FACULTY` accessing unassigned student grades/records** → Expected: Blocked with `BusinessRuleException` → Actual: Bypassed/Allowed → **FAIL** (Confirmed by test `nonSisUserDetailsPrincipalCanBypassAccessCheck`)

## Unchallenged Areas

- **General Student Directory Access** — Out of scope. Basic student retrieval and listing are not restricted by data-level assignment as faculty need to view basic student information for general directories. Only grades and academic records are restricted.
