## Challenge Summary

**Overall risk assessment**: HIGH

## Challenges

### [High] Challenge 1: Null Faculty ID Security Bypass

- **Assumption challenged**: The implementation assumes that checking `facultyId != null` is sufficient to identify faculty members, and that if `facultyId` is null, the user is a non-restricted staff member.
- **Attack scenario**: A user with the role `ROLE_FACULTY` whose `facultyId` is not linked or is null in the database (or mock security context) will bypass the `isFacultyAssignedToStudent` check entirely. Since the isolation check is wrapped inside `if (facultyId != null)`, any faculty user with a null faculty ID will skip the check, allowing them to view grades/academic records of *any* student in the system.
- **Blast radius**: Complete data exposure of all student records/grades to any faculty user with a null or unlinked `facultyId`.
- **Mitigation**: The system must verify the roles/authorities rather than just the presence of a non-null `facultyId`. If the user has `ROLE_FACULTY` (or `GRADE_ENCODE`), they must have a valid non-null `facultyId` and must be assigned to the student. If `facultyId` is null, they should be blocked.

### [High] Challenge 2: Non-SisUserDetails Principal Bypass

- **Assumption challenged**: The implementation assumes that the authenticated principal will always be an instance of `SisUserDetails`.
- **Attack scenario**: If the security context contains an alternative principal type (e.g., standard Spring Security `User` or anonymous principal), the check `authentication.getPrincipal() instanceof SisUserDetails` evaluates to `false`. The method silently exits without throwing an exception, failing open and letting the user access any student's grades or academic records.
- **Blast radius**: Service-level access check bypass for non-standard principal authentication objects.
- **Mitigation**: Implement fail-closed logic. If the principal is not of the expected type and the user does not possess explicit bypass authorities, access should be denied by default.
