package com.school.sis.auth.dto;

import com.school.sis.auth.entity.RefreshToken;

import java.time.Instant;
import java.util.UUID;

public record SessionResponse(
        UUID id,
        boolean current,
        String userAgent,
        String createdIp,
        String lastIp,
        Instant createdAt,
        Instant lastUsedAt,
        Instant idleExpiresAt,
        Instant absoluteExpiresAt,
        Instant revokedAt,
        String revokedReason
) {
    public static SessionResponse from(RefreshToken session, UUID currentSessionId) {
        return new SessionResponse(session.getId(), session.getId().equals(currentSessionId), session.getUserAgent(),
                session.getCreatedIp(), session.getLastIp(), session.getCreatedAt(), session.getLastUsedAt(),
                session.getExpiresAt(), session.getAbsoluteExpiresAt(), session.getRevokedAt(), session.getRevokedReason());
    }
}
