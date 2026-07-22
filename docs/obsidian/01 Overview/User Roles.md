# User Roles

Roles and permissions are seeded by Flyway. Backend `@PreAuthorize` checks are authoritative; frontend navigation also hides or guards routes by permission.

| Role | Purpose and accessible areas | Important restrictions | Status |
|---|---|---|---|
| `SUPER_ADMIN` | All seeded permissions; protected accounts, RBAC, audit, setup, records, finance, grading, portals | Cannot self-deactivate/self-demote or remove/deactivate the last active Super Admin | Implemented |
| `ACCOUNT_ADMIN` | Unified account directory, staff creation/reset, safe role assignment, status, unlock, sessions, and activity | Cannot mutate protected accounts, assign protected roles, or access role/permission mutation; assigned to no users by V23 | Implemented |
| `REGISTRAR` | Setup, students, enrollment approval, academic-evaluation final approval, policies, graduation audit, reports, grade locking, student-portal administration | Cannot record academic equivalency recommendations unless separately granted review permission; no Finance payment/faculty portal permission by default | Implemented |
| `DEAN` | Department gradebook review, academic-evaluation view/review, and graduation audit | Evaluation and audit services limit access to the linked faculty department; no administrative enrollment records | Implemented |
| `PROGRAM_HEAD` | Department academic-evaluation view/review and graduation audit | Requires linked `faculty_id`; no administrative enrollment records or final credit posting | Implemented |
| `FACULTY` | Assigned classes, attendance, grade encoding, content, reports, advising, profile, corrections | Requires linked `faculty_id`; services verify class assignment | Implemented |
| `FINANCE_MANAGER` | Fee/template/receipt setup, approvals, closeout, finance reports, and all finance workspaces | Requesters cannot approve their own sensitive action; refund approvers cannot disburse | Implemented |
| `CASHIER` | Assessment/payment viewing, session operation, payment posting, request workflows, approved void execution, refund disbursement | Cannot approve sensitive requests or closeout | Implemented |
| `STUDENT` | Own portal profile, enrollment, academics, attendance, finance, content, and requests | Requires linked `student_id`; access helpers enforce ownership | Implemented |
| `READ_ONLY_STAFF` | Academic setup and student viewing | No mutation permissions | Backend Only |

## Authorization Notes

- Administrative frontend routes require the `ADMIN` portal plus matching permissions.
- Faculty routes require `FACULTY_PORTAL_ACCESS` and a linked faculty record.
- Student routes require `STUDENT_PORTAL_ACCESS` and a linked student record.
- A required password change for any role forces navigation to `/account/security`; `/student/account/password` redirects there.
- Hiding frontend controls is not the only control: controllers and ownership helpers enforce backend authorization.
- Finance uses distinct `FINANCE_*` request, approval, disbursement, setup, session, and reporting permissions. `SUPER_ADMIN` receives all; `FINANCE_MANAGER` and `CASHIER` receive their bounded sets.
- V18 removes `ENROLLMENT_VIEW` from `DEAN`, `PROGRAM_HEAD`, and `FACULTY`; administrative enrollment records belong to Registrar/Super Admin.
- Academic evaluation uses `ACADEMIC_EVALUATION_VIEW`, `ACADEMIC_EVALUATION_REVIEW`, and `ACADEMIC_EVALUATION_APPROVE` as separate capabilities.
- Eligibility setup uses `ACADEMIC_POLICY_MANAGE`; academic graduation audit uses `GRADUATION_AUDIT_VIEW`.
- School-year and semester names are authenticated reference data for portal term filters. Setup creation and editing still require `ACADEMIC_SETUP_MANAGE`.
- `ACCOUNT_MANAGE` and `RBAC_MANAGE` are separate capabilities. `ACCOUNT_ADMIN` receives only `ACCOUNT_MANAGE`; `SUPER_ADMIN` receives both.
- `SUPER_ADMIN`, `ACCOUNT_ADMIN`, `ACCOUNT_MANAGE`, and `RBAC_MANAGE` are protected migration-managed definitions.

## Account Security Permission Matrix

| Action | Super Admin | Account Admin | Other authenticated roles |
|---|---:|---:|---:|
| View unified directory | Yes | Yes | No |
| Mutate ordinary staff accounts | Yes | Yes | No |
| View protected accounts | Yes | Read only | No |
| Assign/remove `ACCOUNT_ADMIN` | Yes | No | No |
| Assign/remove `SUPER_ADMIN` | Another Super Admin | No | No |
| Edit non-protected role permissions | Yes | No | No |
| Reconcile linked identity conflict | Yes | No | No |
| Change own password / manage own sessions | Yes | Yes | Yes |

## Academic Exception Permission Matrix

| Action | Super Admin | Registrar | Dean | Program Head | Faculty | Student |
|---|---:|---:|---:|---:|---:|---:|
| View administrative enrollment | Yes | Yes | No | No | No | Own only |
| Prepare/submit evaluation case | Yes | Yes | No | No | No | View own summary |
| Review grouped equivalency | Yes | No | Department | Department | No | No |
| Final approval/post credit | Yes | Yes | No | No | No | No |
| Manage eligibility policy | Yes | Yes | No | No | No | No |
| Run/view academic graduation audit | Yes | Yes | Department | Department | No | Own summary |

> Verification still needed: the desired frontend experience for `READ_ONLY_STAFF` remains undefined.

## Related Notes

- [[Authentication and Roles]]
- [[Faculty Portal]]
- [[Student Portal]]
- [[Academic Exceptions]]
- [[Users and Accounts]]
