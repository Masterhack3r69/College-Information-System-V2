package com.school.sis.auth.repository;

import com.school.sis.auth.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import jakarta.persistence.LockModeType;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select session from RefreshToken session join fetch session.user where session.tokenHash = :tokenHash")
    Optional<RefreshToken> findByTokenHashForUpdate(String tokenHash);

    @Query("select session from RefreshToken session where session.id = :id and session.user.id = :userId")
    Optional<RefreshToken> findByIdAndUserId(UUID id, UUID userId);

    @Query("select session from RefreshToken session where session.user.id = :userId order by session.lastUsedAt desc")
    List<RefreshToken> findAllByUserId(UUID userId);

    @Query("select count(session) from RefreshToken session where session.user.id = :userId and session.revokedAt is null and session.expiresAt > :now and session.absoluteExpiresAt > :now")
    long countUsableByUserId(UUID userId, Instant now);

    @Modifying
    @Query("update RefreshToken session set session.revokedAt = :now, session.revokedReason = :reason where session.user.id = :userId and session.revokedAt is null")
    int revokeAllByUserId(UUID userId, Instant now, String reason);

    @Modifying
    @Query("update RefreshToken session set session.revokedAt = :now, session.revokedReason = :reason where session.user.id = :userId and session.id <> :exceptId and session.revokedAt is null")
    int revokeOthersByUserId(UUID userId, UUID exceptId, Instant now, String reason);

    @Modifying
    @Query("delete from RefreshToken session where (session.revokedAt is not null and session.revokedAt < :cutoff) or session.expiresAt < :cutoff or session.absoluteExpiresAt < :cutoff")
    int deleteExpiredBefore(Instant cutoff);
}
