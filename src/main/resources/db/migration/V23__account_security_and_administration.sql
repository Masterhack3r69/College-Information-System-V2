-- Users & Accounts security and delegated administration upgrade.
-- Existing accounts, role assignments, audit history, and refresh sessions are preserved.

UPDATE permissions
SET name = 'ACCOUNT_MANAGE',
    description = 'Can administer non-protected user accounts and account security'
WHERE id = '00000000-0000-0000-0000-000000000101';

INSERT INTO permissions (id, name, description)
VALUES ('00000000-0000-0000-0000-000000000167', 'RBAC_MANAGE',
        'Can manage protected roles and role permission assignments')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description;

INSERT INTO roles (id, name, description)
VALUES ('00000000-0000-0000-0000-000000000210', 'ACCOUNT_ADMIN',
        'Delegated administrator for non-protected user accounts')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description;

INSERT INTO role_permissions (role_id, permission_id)
VALUES ('00000000-0000-0000-0000-000000000210',
        '00000000-0000-0000-0000-000000000101')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
VALUES ('00000000-0000-0000-0000-000000000201',
        '00000000-0000-0000-0000-000000000167')
ON CONFLICT DO NOTHING;

ALTER TABLE users
    ADD COLUMN security_version BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN version BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN failed_login_window_started_at TIMESTAMPTZ,
    ADD COLUMN locked_until TIMESTAMPTZ,
    ADD COLUMN last_login_at TIMESTAMPTZ,
    ADD COLUMN password_changed_at TIMESTAMPTZ,
    ADD COLUMN temporary_password_expires_at TIMESTAMPTZ;

ALTER TABLE users
    ADD CONSTRAINT ck_users_single_domain_identity
        CHECK (faculty_id IS NULL OR student_id IS NULL),
    ADD CONSTRAINT ck_users_failed_login_attempts_non_negative
        CHECK (failed_login_attempts >= 0);

ALTER TABLE roles
    ADD COLUMN version BIGINT NOT NULL DEFAULT 0;

ALTER TABLE refresh_tokens RENAME COLUMN token TO token_hash;

-- V1 enabled pgcrypto. Hash stored legacy values in place so every existing raw
-- refresh token remains usable through the new hash lookup without retaining it.
UPDATE refresh_tokens
SET token_hash = encode(digest(token_hash, 'sha256'), 'hex');

ALTER TABLE refresh_tokens
    ALTER COLUMN token_hash TYPE VARCHAR(64),
    ADD COLUMN absolute_expires_at TIMESTAMPTZ,
    ADD COLUMN last_used_at TIMESTAMPTZ,
    ADD COLUMN created_ip VARCHAR(80),
    ADD COLUMN last_ip VARCHAR(80),
    ADD COLUMN user_agent TEXT,
    ADD COLUMN revoked_reason VARCHAR(160);

UPDATE refresh_tokens
SET absolute_expires_at = expires_at,
    last_used_at = created_at
WHERE absolute_expires_at IS NULL OR last_used_at IS NULL;

ALTER TABLE refresh_tokens
    ALTER COLUMN absolute_expires_at SET NOT NULL,
    ALTER COLUMN last_used_at SET NOT NULL;

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_session_expiry
    ON refresh_tokens(expires_at, absolute_expires_at, revoked_at);

CREATE TABLE auth_login_rate_limits (
    ip_hash VARCHAR(64) PRIMARY KEY,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    window_started_at TIMESTAMPTZ,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_auth_login_rate_limits_attempts_non_negative
        CHECK (failed_attempts >= 0)
);

CREATE INDEX idx_users_account_directory
    ON users(active, locked_until, must_change_password);

CREATE INDEX idx_users_last_login_at ON users(last_login_at DESC);
