package com.school.sis.auth.entity;

import com.school.sis.common.audit.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "auth_login_rate_limits")
public class LoginRateLimit extends AuditableEntity {
    @Id
    @Column(name = "ip_hash", length = 64)
    private String ipHash;

    @Column(name = "failed_attempts", nullable = false)
    private int failedAttempts;

    @Column(name = "window_started_at")
    private Instant windowStartedAt;

    @Column(name = "locked_until")
    private Instant lockedUntil;

    protected LoginRateLimit() {}

    public LoginRateLimit(String ipHash) { this.ipHash = ipHash; }
    public String getIpHash() { return ipHash; }
    public int getFailedAttempts() { return failedAttempts; }
    public void setFailedAttempts(int failedAttempts) { this.failedAttempts = failedAttempts; }
    public Instant getWindowStartedAt() { return windowStartedAt; }
    public void setWindowStartedAt(Instant value) { this.windowStartedAt = value; }
    public Instant getLockedUntil() { return lockedUntil; }
    public void setLockedUntil(Instant value) { this.lockedUntil = value; }
}
