package com.school.sis.auth.entity;

import com.school.sis.common.audit.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "refresh_tokens")
public class RefreshToken extends AuditableEntity {

    @Id
    private UUID id;

    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Column(name = "absolute_expires_at", nullable = false)
    private Instant absoluteExpiresAt;

    @Column(name = "last_used_at", nullable = false)
    private Instant lastUsedAt;

    @Column(name = "created_ip", length = 80)
    private String createdIp;

    @Column(name = "last_ip", length = 80)
    private String lastIp;

    @Column(name = "user_agent")
    private String userAgent;

    @Column(name = "revoked_reason", length = 160)
    private String revokedReason;

    protected RefreshToken() {
    }

    public RefreshToken(UUID id, String tokenHash, User user, Instant expiresAt,
                        Instant absoluteExpiresAt, String ipAddress, String userAgent) {
        this.id = id;
        this.tokenHash = tokenHash;
        this.user = user;
        this.expiresAt = expiresAt;
        this.absoluteExpiresAt = absoluteExpiresAt;
        this.lastUsedAt = Instant.now();
        this.createdIp = ipAddress;
        this.lastIp = ipAddress;
        this.userAgent = userAgent;
    }

    public UUID getId() {
        return id;
    }

    public String getTokenHash() {
        return tokenHash;
    }

    public User getUser() {
        return user;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public Instant getRevokedAt() {
        return revokedAt;
    }

    public Instant getAbsoluteExpiresAt() { return absoluteExpiresAt; }
    public Instant getLastUsedAt() { return lastUsedAt; }
    public String getCreatedIp() { return createdIp; }
    public String getLastIp() { return lastIp; }
    public String getUserAgent() { return userAgent; }
    public String getRevokedReason() { return revokedReason; }

    public boolean isUsable() {
        Instant now = Instant.now();
        return revokedAt == null && expiresAt.isAfter(now) && absoluteExpiresAt.isAfter(now);
    }

    public void revoke(String reason) {
        this.revokedAt = Instant.now();
        this.revokedReason = reason;
    }

    public void rotate(String newTokenHash, Instant idleExpiresAt, String ipAddress) {
        this.tokenHash = newTokenHash;
        this.expiresAt = idleExpiresAt.isBefore(absoluteExpiresAt) ? idleExpiresAt : absoluteExpiresAt;
        this.lastUsedAt = Instant.now();
        this.lastIp = ipAddress;
    }
}
