# User Roles

Roles and permissions are seeded by Flyway. Backend `@PreAuthorize` checks are authoritative; frontend navigation also hides or guards routes by permission.

| Role | Purpose and accessible areas | Important restrictions | Status |
|---|---|---|---|
| `SUPER_ADMIN` | All seeded permissions; accounts, audit, setup, records, finance, grading, portals | No module restriction in the seeded permission set | Implemented |
| `REGISTRAR` | Setup, students, enrollment approval, reports, grade locking, student-portal administration | Does not receive finance payment or faculty portal permissions by default | Implemented |
| `DEAN` | Gradebook department review through `GRADE_REVIEW` | Review service limits non-super-admin reviewers to their faculty department | Partially Implemented |
| `PROGRAM_HEAD` | Role exists | No permissions are seeded for this role in migrations | Backend Only |
| `FACULTY` | Assigned classes, attendance, grade encoding, content, reports, advising, profile, corrections | Requires linked `faculty_id`; services verify class assignment | Implemented |
| `CASHIER` | Assessment/payment viewing, generation, recording, voiding | No student or enrollment mutation permission by default | Implemented |
| `STUDENT` | Own portal profile, enrollment, academics, attendance, finance, content, and requests | Requires linked `student_id`; access helpers enforce ownership | Implemented |
| `READ_ONLY_STAFF` | Academic setup and student viewing | No mutation permissions | Backend Only |

## Authorization Notes

- Administrative frontend routes require the `ADMIN` portal plus matching permissions.
- Faculty routes require `FACULTY_PORTAL_ACCESS` and a linked faculty record.
- Student routes require `STUDENT_PORTAL_ACCESS` and a linked student record.
- A required student password change forces navigation to `/student/account/password`.
- Hiding frontend controls is not the only control: controllers and ownership helpers enforce backend authorization.

> Verification needed: The intended MVP permissions for `PROGRAM_HEAD` and the desired frontend experience for `READ_ONLY_STAFF` are not defined beyond the seeded role records.

## Related Notes

- [[Authentication and Roles]]
- [[Faculty Portal]]
- [[Student Portal]]

