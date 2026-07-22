package com.school.sis.auth;

import com.school.sis.audit.service.AuditService;
import com.school.sis.auth.entity.LoginRateLimit;
import com.school.sis.auth.entity.RefreshToken;
import com.school.sis.auth.entity.User;
import com.school.sis.auth.repository.LoginRateLimitRepository;
import com.school.sis.auth.repository.UserRepository;
import com.school.sis.auth.security.JwtProperties;
import com.school.sis.auth.security.JwtService;
import com.school.sis.auth.security.SisUserDetails;
import com.school.sis.auth.service.LoginProtectionService;
import com.school.sis.auth.service.PasswordSecurityService;
import com.school.sis.auth.service.TokenHashService;
import com.school.sis.common.exception.BusinessRuleException;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Method;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AuthenticationSecurityTests {
    private final TokenHashService hashes = new TokenHashService();

    @Test
    void generatedCredentialsAndChosenPasswordsFollowSeparatePolicies() {
        PasswordSecurityService passwords = new PasswordSecurityService();
        String temporary = passwords.temporaryPassword();
        assertThat(temporary).hasSize(20).matches(".*[A-Za-z].*").matches(".*\\d.*");
        passwords.validateChosenPassword("CollegePass2026");
        assertThatThrownBy(() -> passwords.validateChosenPassword("short7"))
                .isInstanceOf(BusinessRuleException.class).extracting("code").isEqualTo("PASSWORD_POLICY_FAILED");
        assertThatThrownBy(() -> passwords.validateChosenPassword("letterswithoutnumber"))
                .isInstanceOf(BusinessRuleException.class);
    }

    @Test
    void refreshTokensAreHashedAndRotatedWithinOneStableSession() {
        User user = user();
        Instant now = Instant.now();
        UUID sessionId = UUID.randomUUID();
        String firstRaw = "first-secret-refresh-token";
        RefreshToken session = new RefreshToken(sessionId, hashes.sha256(firstRaw), user,
                now.plus(Duration.ofDays(7)), now.plus(Duration.ofDays(30)), "10.0.0.1", "browser");
        String secondRaw = "second-secret-refresh-token";
        session.rotate(hashes.sha256(secondRaw), now.plus(Duration.ofDays(7)), "10.0.0.2");

        assertThat(session.getId()).isEqualTo(sessionId);
        assertThat(session.getTokenHash()).hasSize(64).isNotEqualTo(firstRaw).isNotEqualTo(secondRaw);
        assertThat(session.getLastIp()).isEqualTo("10.0.0.2");
        assertThat(session.getExpiresAt()).isBeforeOrEqualTo(session.getAbsoluteExpiresAt());
    }

    @Test
    void accessJwtCarriesStableSessionAndSecurityVersionClaims() {
        User user = user(); user.setSecurityVersion(7);
        UUID sessionId = UUID.randomUUID();
        JwtService jwt = new JwtService(new JwtProperties(
                "test_secret_test_secret_test_secret_test_secret_test_secret", 900, 604800));
        SisUserDetails details = new SisUserDetails(user, sessionId);
        String token = jwt.createAccessToken(details);
        assertThat(jwt.sessionId(token)).isEqualTo(sessionId);
        assertThat(jwt.securityVersion(token)).isEqualTo(7);
        assertThat(jwt.isValid(token, details)).isTrue();
        user.incrementSecurityVersion();
        assertThat(jwt.isValid(token, new SisUserDetails(user, sessionId))).isFalse();
    }

    @Test
    void fifthKnownIdentityFailureLocksForFifteenMinutesAndAuditsEveryAttempt() throws Exception {
        UserRepository users = mock(UserRepository.class);
        LoginRateLimitRepository rates = mock(LoginRateLimitRepository.class);
        AuditService audit = mock(AuditService.class);
        User user = user();
        AtomicReference<LoginRateLimit> savedRate = new AtomicReference<>();
        when(users.findByEmailIgnoreCaseOrUsernameIgnoreCase("known", "known")).thenReturn(Optional.of(user));
        when(rates.findByIpHashForUpdate(any())).thenAnswer(call -> Optional.ofNullable(savedRate.get()));
        when(rates.save(any())).thenAnswer(call -> { LoginRateLimit value = call.getArgument(0); savedRate.set(value); return value; });
        LoginProtectionService protection = new LoginProtectionService(users, rates, hashes, audit);

        for (int attempt = 1; attempt < 5; attempt++) assertThat(protection.recordFailure("known", "10.0.0.8")).isZero();
        assertThat(protection.recordFailure("known", "10.0.0.8")).isBetween(890L, 900L);
        assertThat(user.getFailedLoginAttempts()).isEqualTo(5);
        assertThat(user.getLockedUntil()).isAfter(Instant.now().plus(Duration.ofMinutes(14)));
        verify(audit, times(5)).log(eq(user), eq("LOGIN_FAILED"), eq("AUTH"), eq("User"), eq(user.getId()), isNull(), any());

        Method method = LoginProtectionService.class.getMethod("recordFailure", String.class, String.class);
        Transactional transaction = method.getAnnotation(Transactional.class);
        assertThat(transaction.propagation()).isEqualTo(Propagation.REQUIRES_NEW);
    }

    @Test
    void twentiethUnknownIdentityFailureThrottlesIpWithoutCreatingAccountState() {
        UserRepository users = mock(UserRepository.class);
        LoginRateLimitRepository rates = mock(LoginRateLimitRepository.class);
        AuditService audit = mock(AuditService.class);
        AtomicReference<LoginRateLimit> savedRate = new AtomicReference<>();
        when(users.findByEmailIgnoreCaseOrUsernameIgnoreCase("unknown", "unknown")).thenReturn(Optional.empty());
        when(rates.findByIpHashForUpdate(any())).thenAnswer(call -> Optional.ofNullable(savedRate.get()));
        when(rates.save(any())).thenAnswer(call -> { LoginRateLimit value = call.getArgument(0); savedRate.set(value); return value; });
        LoginProtectionService protection = new LoginProtectionService(users, rates, hashes, audit);

        for (int attempt = 1; attempt < 20; attempt++) assertThat(protection.recordFailure("unknown", "10.0.0.9")).isZero();
        assertThat(protection.recordFailure("unknown", "10.0.0.9")).isBetween(890L, 900L);
        assertThat(savedRate.get().getFailedAttempts()).isEqualTo(20);
        verify(audit, times(20)).log(isNull(User.class), eq("LOGIN_FAILED"), eq("AUTH"), eq("User"), isNull(), isNull(), any());
    }

    @Test
    void successfulLoginResetsOnlyTheIdentityAndCannotEraseTheSharedIpFailureWindow() {
        UserRepository users = mock(UserRepository.class);
        LoginRateLimitRepository rates = mock(LoginRateLimitRepository.class);
        AuditService audit = mock(AuditService.class);
        User user = user();
        user.setFailedLoginAttempts(4);
        user.setFailedLoginWindowStartedAt(Instant.now());
        user.setLockedUntil(Instant.now().plusSeconds(30));
        when(users.findById(user.getId())).thenReturn(Optional.of(user));
        LoginProtectionService protection = new LoginProtectionService(users, rates, hashes, audit);

        protection.recordSuccess(user);

        assertThat(user.getFailedLoginAttempts()).isZero();
        assertThat(user.getFailedLoginWindowStartedAt()).isNull();
        assertThat(user.getLockedUntil()).isNull();
        assertThat(user.getLastLoginAt()).isNotNull();
        verifyNoInteractions(rates);
    }

    private User user() {
        User user = new User();
        ReflectionTestUtils.setField(user, "id", UUID.randomUUID());
        user.setUsername("known"); user.setEmail("known@example.edu"); user.setFullName("Known User");
        user.setPasswordHash("hash"); user.setActive(true);
        return user;
    }
}
