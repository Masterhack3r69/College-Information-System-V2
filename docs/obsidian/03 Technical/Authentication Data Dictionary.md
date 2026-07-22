# Authentication Data Dictionary

## `users`

Stores login identity, domain links, password state, login protection, and concurrency/security versions.

| Field | Type | Required | Description |
|---|---|---:|---|
| `id` | UUID | Yes | Primary account identifier |
| `username` / `email` | Varchar | Yes | Unique login identifiers |
| `password_hash` | Text | Yes | BCrypt hash only |
| `full_name` | Text | Yes | System name or linked-domain mirror |
| `active` | Boolean | Yes | Authentication/status gate |
| `faculty_id` / `student_id` | UUID | No | Exclusive optional domain link |
| `must_change_password` | Boolean | Yes | Forces shared security-center routing |
| `temporary_password_expires_at` | Timestamptz | No | One-time credential expiry; null for normal/grandfathered credentials |
| `failed_login_attempts` | Integer | Yes | Current known-identity window count |
| `failed_login_window_started_at` | Timestamptz | No | Start of the 15-minute identity window |
| `locked_until` | Timestamptz | No | Temporary account lock expiry |
| `last_login_at` / `password_changed_at` | Timestamptz | No | Security activity timestamps |
| `security_version` | Bigint | Yes | Invalidates issued access JWTs when advanced |
| `version` | Bigint | Yes | Optimistic account update token |

Constraint `ck_users_single_domain_identity` prohibits simultaneous faculty/student links. Partial unique indexes keep each domain record linked to at most one account.

## `refresh_tokens`

Stable server-side sessions. V23 renames plaintext `token` to `token_hash` and hashes every existing value with SHA-256 without invalidating compatible clients.

| Field | Type | Required | Description |
|---|---|---:|---|
| `id` | UUID | Yes | Stable `sid` for the session and access JWT |
| `user_id` | UUID | Yes | Owning account |
| `token_hash` | Char(64) | Yes | Lowercase SHA-256 refresh-token hash |
| `user_agent` | Text | No | Device/browser evidence |
| `created_ip` / `last_ip` | Varchar | No | Initial and latest network address |
| `created_at` / `last_used_at` | Timestamptz | Yes | Session activity timestamps |
| `idle_expires_at` | Timestamptz | Yes | Seven-day inactivity boundary for new sessions |
| `absolute_expires_at` | Timestamptz | Yes | 30-day lifetime boundary for new sessions |
| `revoked_at` / `revocation_reason` | Timestamptz / Varchar | No | Revocation evidence |

Refresh rotation updates the hash in place under a row lock. Indexes cover user listing and idle/absolute/revoked cleanup.

## `auth_login_rate_limits`

Persistent IP failure windows.

| Field | Type | Required | Description |
|---|---|---:|---|
| `key_hash` | Char(64) | Yes | SHA-256 of the normalized rate-limit key |
| `failure_count` | Integer | Yes | Failures in the current 15-minute window |
| `window_started_at` | Timestamptz | Yes | Current window start |
| `blocked_until` | Timestamptz | No | IP throttle expiry |
| `updated_at` | Timestamptz | Yes | Cleanup/diagnostic timestamp |

Raw IPs are not used as primary keys. Audit events retain the request IP separately through the established audit model.

## `roles`, `permissions`, and `user_roles`

- `roles.version` is the optimistic RBAC update token.
- V23 renames permission ID `00000000-0000-0000-0000-000000000107` from `USER_MANAGE` to `ACCOUNT_MANAGE`.
- V23 adds `RBAC_MANAGE` and the migration-managed `ACCOUNT_ADMIN` role.
- `ACCOUNT_ADMIN` receives only `ACCOUNT_MANAGE`; `SUPER_ADMIN` receives both.
- V23 assigns `ACCOUNT_ADMIN` to no users.

## Migration Guarantees

- Accounts, roles, links, user-role assignments, audit history, and sessions are preserved.
- Existing refresh-token values are replaced by SHA-256 hashes in the same rows.
- Existing linked-identity mismatches do not fail migration and are exposed for reconciliation.
- Existing `must_change_password` users receive no invented temporary-password expiry.

## Related Notes

- [[Users and Accounts]]
- [[Authentication and Roles]]
- [[Authentication Endpoints]]
- [[Database Overview]]

