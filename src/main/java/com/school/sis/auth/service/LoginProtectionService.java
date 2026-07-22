package com.school.sis.auth.service;

import com.school.sis.audit.service.AuditService;
import com.school.sis.auth.entity.LoginRateLimit;
import com.school.sis.auth.entity.User;
import com.school.sis.auth.repository.LoginRateLimitRepository;
import com.school.sis.auth.repository.UserRepository;
import com.school.sis.common.exception.AuthRateLimitException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;

@Service
public class LoginProtectionService {
    private static final Duration WINDOW = Duration.ofMinutes(15);
    private static final Duration LOCK = Duration.ofMinutes(15);
    private final UserRepository users;
    private final LoginRateLimitRepository rates;
    private final TokenHashService hashes;
    private final AuditService audit;

    public LoginProtectionService(UserRepository users, LoginRateLimitRepository rates,
                                  TokenHashService hashes, AuditService audit) {
        this.users = users; this.rates = rates; this.hashes = hashes; this.audit = audit;
    }

    @Transactional(readOnly = true)
    public void checkAllowed(String identity, String ipAddress) {
        Instant now = Instant.now();
        users.findByEmailIgnoreCaseOrUsernameIgnoreCase(identity, identity)
                .filter(user -> user.getLockedUntil() != null && user.getLockedUntil().isAfter(now))
                .ifPresent(user -> { throw limited(user.getLockedUntil(), now); });
        rates.findById(ipHash(ipAddress))
                .filter(rate -> rate.getLockedUntil() != null && rate.getLockedUntil().isAfter(now))
                .ifPresent(rate -> { throw limited(rate.getLockedUntil(), now); });
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public long recordFailure(String identity, String ipAddress) {
        Instant now = Instant.now();
        User user = users.findByEmailIgnoreCaseOrUsernameIgnoreCase(identity, identity).orElse(null);
        Instant userLockedUntil = null;
        if (user != null) {
            if (expired(user.getFailedLoginWindowStartedAt(), now)) {
                user.setFailedLoginAttempts(0);
                user.setFailedLoginWindowStartedAt(now);
            } else if (user.getFailedLoginWindowStartedAt() == null) {
                user.setFailedLoginWindowStartedAt(now);
            }
            user.setFailedLoginAttempts(user.getFailedLoginAttempts() + 1);
            if (user.getFailedLoginAttempts() >= 5) {
                userLockedUntil = now.plus(LOCK);
                user.setLockedUntil(userLockedUntil);
            }
        }

        String ipHash = ipHash(ipAddress);
        LoginRateLimit rate = rates.findByIpHashForUpdate(ipHash).orElseGet(() -> new LoginRateLimit(ipHash));
        if (expired(rate.getWindowStartedAt(), now)) {
            rate.setFailedAttempts(0);
            rate.setWindowStartedAt(now);
        } else if (rate.getWindowStartedAt() == null) {
            rate.setWindowStartedAt(now);
        }
        rate.setFailedAttempts(rate.getFailedAttempts() + 1);
        Instant ipLockedUntil = null;
        if (rate.getFailedAttempts() >= 20) {
            ipLockedUntil = now.plus(LOCK);
            rate.setLockedUntil(ipLockedUntil);
        }
        rates.save(rate);
        audit.log(user, "LOGIN_FAILED", "AUTH", "User", user == null ? null : user.getId(), null,
                Map.of("knownIdentity", user != null, "ipThrottled", ipLockedUntil != null,
                        "identityLocked", userLockedUntil != null));
        Instant lockedUntil = ipLockedUntil != null ? ipLockedUntil : userLockedUntil;
        return lockedUntil == null ? 0 : Math.max(1, Duration.between(now, lockedUntil).toSeconds());
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordSuccess(User user) {
        User managed = users.findById(user.getId()).orElse(user);
        managed.setFailedLoginAttempts(0);
        managed.setFailedLoginWindowStartedAt(null);
        managed.setLockedUntil(null);
        managed.setLastLoginAt(Instant.now());
    }

    private boolean expired(Instant started, Instant now) { return started == null || started.plus(WINDOW).isBefore(now); }
    private String ipHash(String ip) { return hashes.sha256(ip == null || ip.isBlank() ? "unknown" : ip); }
    private AuthRateLimitException limited(Instant until, Instant now) {
        return new AuthRateLimitException(Math.max(1, Duration.between(now, until).toSeconds()));
    }
}
