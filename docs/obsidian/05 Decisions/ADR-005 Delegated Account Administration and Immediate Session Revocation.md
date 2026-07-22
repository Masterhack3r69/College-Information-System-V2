# ADR-005: Delegated Account Administration and Immediate Session Revocation

## Status

Accepted

## Date

2026-07-22

## Context

The former `USER_MANAGE` capability mixed routine account operations with role/permission control. Refresh tokens were stored as bearer values, access JWTs remained valid after administrative changes, and login throttling was not persistent. Delegation therefore risked privilege escalation and security actions did not take effect immediately.

## Decision

- Rename the existing permission identity to `ACCOUNT_MANAGE` and add independent `RBAC_MANAGE`.
- Add migration-managed `ACCOUNT_ADMIN` with only `ACCOUNT_MANAGE`; assign it to no users automatically.
- Treat `SUPER_ADMIN`, `ACCOUNT_ADMIN`, `ACCOUNT_MANAGE`, and `RBAC_MANAGE` as protected definitions.
- Enforce protected-account, self-management, and last-active-Super-Admin invariants in the service transaction.
- Use optimistic versions and mandatory reasons for sensitive account/RBAC changes.
- Store only SHA-256 refresh-token hashes and model each row as a stable session with idle/absolute expiry and revocation evidence.
- Put `sid` and user `securityVersion` in access JWTs and verify user/session/version on every authenticated request.
- Advance the security version and revoke sessions on password changes, administrative resets, deactivation, and revoke-all operations.
- Persist known-identity and IP login protection; record failed-login events in an independent transaction.
- Keep faculty/student records authoritative and expose explicit Super-Admin reconciliation rather than silently rewriting migration mismatches.

## Alternatives Considered

- Keep one broad administration permission: rejected because safe delegation cannot exclude RBAC escalation.
- Use a refresh-token blacklist only: rejected because already-issued access JWTs would remain usable.
- Store raw refresh tokens for lookup simplicity: rejected because database disclosure would expose bearer credentials.
- Put all login counters in process memory or Redis: rejected for this release because persistence and transactional auditability are required and Redis is not otherwise used.
- Rewrite linked identities during migration: rejected because email conflicts could silently attach or overwrite the wrong account.

## Consequences

### Positive

- Routine account work can be delegated without permission editing or protected-role assignment.
- Session and password actions invalidate access immediately.
- Database disclosure does not reveal refresh bearer tokens.
- Concurrent/stale administrators receive deterministic conflicts.
- Existing accounts, sessions, links, mismatches, and audit history remain traceable.

### Negative

- Every authenticated request now performs user and session validation.
- Session rotation requires a row lock and cleanup/retention work.
- Administrators must supply reasons for more operations.
- Email recovery and MFA remain a separate security phase.

## Related Notes

- [[Users and Accounts]]
- [[Authentication and Roles]]
- [[Authentication Data Dictionary]]
- [[Authentication Endpoints]]
- [[Users and Accounts Test Cases]]

