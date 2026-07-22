package com.school.sis.auth.service;

import com.school.sis.auth.dto.AuthResponse;
import com.school.sis.auth.dto.LoginRequest;
import com.school.sis.auth.dto.RefreshRequest;
import com.school.sis.auth.dto.UserSummary;
import com.school.sis.auth.dto.PasswordChangeRequest;
import com.school.sis.auth.dto.SessionResponse;
import com.school.sis.auth.entity.RefreshToken;
import com.school.sis.auth.entity.User;
import com.school.sis.auth.repository.RefreshTokenRepository;
import com.school.sis.auth.repository.UserRepository;
import com.school.sis.auth.security.JwtProperties;
import com.school.sis.auth.security.JwtService;
import com.school.sis.auth.security.SisUserDetails;
import com.school.sis.audit.service.AuditService;
import com.school.sis.common.exception.BusinessRuleException;
import com.school.sis.common.exception.AuthRateLimitException;
import com.school.sis.common.exception.AuthSecurityException;
import com.school.sis.common.exception.NotFoundException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Comparator;
import java.util.Map;
import java.util.UUID;
import java.util.ArrayList;
import java.time.Duration;
import java.util.List;

@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final JwtProperties jwtProperties;
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final AuditService auditService;
    private final LoginProtectionService loginProtection;
    private final TokenHashService tokenHashes;
    private final PasswordSecurityService passwordSecurity;
    private final PasswordEncoder passwordEncoder;
    private final ClientRequestContext requestContext;
    private final SecureRandom secureRandom = new SecureRandom();

    public AuthService(
            AuthenticationManager authenticationManager,
            JwtService jwtService,
            JwtProperties jwtProperties,
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            AuditService auditService,
            LoginProtectionService loginProtection,
            TokenHashService tokenHashes,
            PasswordSecurityService passwordSecurity,
            PasswordEncoder passwordEncoder,
            ClientRequestContext requestContext
    ) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.jwtProperties = jwtProperties;
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.auditService = auditService;
        this.loginProtection = loginProtection;
        this.tokenHashes = tokenHashes;
        this.passwordSecurity = passwordSecurity;
        this.passwordEncoder = passwordEncoder;
        this.requestContext = requestContext;
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        String ipAddress = requestContext.ipAddress();
        loginProtection.checkAllowed(request.usernameOrEmail(), ipAddress);
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.usernameOrEmail(), request.password())
            );
            SisUserDetails userDetails = (SisUserDetails) authentication.getPrincipal();
            User user = userRepository.findByEmailIgnoreCaseOrUsernameIgnoreCase(userDetails.getUsername(), userDetails.getUsername())
                    .orElseThrow(() -> new NotFoundException("User not found"));
            if (user.isMustChangePassword() && user.getTemporaryPasswordExpiresAt() != null
                    && !user.getTemporaryPasswordExpiresAt().isAfter(Instant.now())) {
                throw new AuthSecurityException("TEMPORARY_PASSWORD_EXPIRED",
                        "The temporary credential has expired. Contact an account administrator.");
            }
            loginProtection.recordSuccess(user);
            User refreshed = userRepository.findById(user.getId()).orElse(user);
            AuthResponse response = issueTokens(refreshed);
            auditService.log(user, "LOGIN_SUCCESS", "AUTH", "User", user.getId(), null,
                    Map.of("username", user.getUsername()));
            return response;
        } catch (AuthenticationException exception) {
            long retryAfter = loginProtection.recordFailure(request.usernameOrEmail(), ipAddress);
            if (retryAfter > 0) throw new AuthRateLimitException(retryAfter);
            throw exception;
        }
    }

    @Transactional
    public AuthResponse refresh(RefreshRequest request) {
        RefreshToken refreshToken = refreshTokenRepository.findByTokenHashForUpdate(tokenHashes.sha256(request.refreshToken()))
                .orElseThrow(() -> new AuthSecurityException("SESSION_REVOKED", "The session is expired or revoked"));
        if (!refreshToken.isUsable()) {
            throw new AuthSecurityException("SESSION_REVOKED", "The session is expired or revoked");
        }
        if (!refreshToken.getUser().isActive()) {
            throw new AuthSecurityException("SESSION_REVOKED", "The session is expired or revoked");
        }
        String raw = randomToken();
        refreshToken.rotate(tokenHashes.sha256(raw), Instant.now().plus(Duration.ofDays(7)), requestContext.ipAddress());
        auditService.log(refreshToken.getUser(), "SESSION_REFRESHED", "AUTH", "RefreshToken", refreshToken.getId(), null,
                Map.of("sessionId", refreshToken.getId()));
        return authenticationFor(refreshToken.getUser(), refreshToken.getId(), raw);
    }

    @Transactional
    public void logout(RefreshRequest request) {
        refreshTokenRepository.findByTokenHashForUpdate(tokenHashes.sha256(request.refreshToken())).ifPresent(refreshToken -> {
            User user = refreshToken.getUser();
            refreshToken.revoke("USER_LOGOUT");
            auditService.log(user, "LOGOUT", "AUTH", "User", user.getId(), null,
                    Map.of("username", user.getUsername()));
        });
    }

    @Transactional(readOnly = true)
    public List<SessionResponse> sessions(SisUserDetails principal) {
        return refreshTokenRepository.findAllByUserId(principal.id()).stream()
                .map(session -> SessionResponse.from(session, principal.sessionId())).toList();
    }

    @Transactional
    public void revokeSession(SisUserDetails principal, UUID sessionId) {
        RefreshToken session = refreshTokenRepository.findByIdAndUserId(sessionId, principal.id())
                .orElseThrow(() -> new NotFoundException("Session not found"));
        if (session.getRevokedAt() == null) session.revoke("USER_REVOKED");
        auditService.log(principal, "SESSION_REVOKED", "AUTH", "RefreshToken", sessionId, null,
                Map.of("scope", "SELF", "current", sessionId.equals(principal.sessionId())));
    }

    @Transactional
    public int revokeOtherSessions(SisUserDetails principal) {
        int count = refreshTokenRepository.revokeOthersByUserId(principal.id(), principal.sessionId(), Instant.now(),
                "USER_REVOKED_OTHERS");
        auditService.log(principal, "OTHER_SESSIONS_REVOKED", "AUTH", "User", principal.id(), null,
                Map.of("sessionCount", count));
        return count;
    }

    @Transactional
    public AuthResponse changePassword(SisUserDetails principal, PasswordChangeRequest request) {
        User user = userRepository.findById(principal.id()).orElseThrow(() -> new NotFoundException("User not found"));
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new AuthSecurityException("CURRENT_PASSWORD_INVALID", "Current password is incorrect");
        }
        passwordSecurity.validateChosenPassword(request.newPassword());
        if (passwordEncoder.matches(request.newPassword(), user.getPasswordHash())) {
            throw new BusinessRuleException("PASSWORD_REUSE_NOT_ALLOWED", "New password must differ from the current password");
        }
        RefreshToken current = refreshTokenRepository.findByIdAndUserId(principal.sessionId(), user.getId())
                .orElseThrow(() -> new AuthSecurityException("SESSION_REVOKED", "The session is expired or revoked"));
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setMustChangePassword(false);
        user.setTemporaryPasswordExpiresAt(null);
        user.setPasswordChangedAt(Instant.now());
        user.incrementSecurityVersion();
        refreshTokenRepository.revokeOthersByUserId(user.getId(), current.getId(), Instant.now(), "PASSWORD_CHANGED");
        String raw = randomToken();
        current.rotate(tokenHashes.sha256(raw), Instant.now().plus(Duration.ofDays(7)), requestContext.ipAddress());
        auditService.log(user, "PASSWORD_CHANGED", "AUTH", "User", user.getId(), null,
                Map.of("otherSessionsRevoked", true));
        return authenticationFor(user, current.getId(), raw);
    }

    public UserSummary summarize(SisUserDetails userDetails) {
        User user = userRepository.findByEmailIgnoreCaseOrUsernameIgnoreCase(userDetails.getUsername(), userDetails.getUsername())
                .orElseThrow(() -> new NotFoundException("User not found"));
        return toSummary(user);
    }

    private AuthResponse issueTokens(User user) {
        String rawToken = randomToken();
        Instant now = Instant.now();
        RefreshToken refreshToken = new RefreshToken(
                UUID.randomUUID(),
                tokenHashes.sha256(rawToken),
                user,
                now.plus(Duration.ofDays(7)),
                now.plus(Duration.ofDays(30)),
                requestContext.ipAddress(),
                requestContext.userAgent()
        );
        refreshTokenRepository.save(refreshToken);
        return authenticationFor(user, refreshToken.getId(), rawToken);
    }

    private AuthResponse authenticationFor(User user, UUID sessionId, String rawRefreshToken) {
        SisUserDetails userDetails = new SisUserDetails(user, sessionId);
        String accessToken = jwtService.createAccessToken(userDetails);
        return new AuthResponse(
                accessToken,
                rawRefreshToken,
                jwtProperties.accessExpirationSeconds(),
                toSummary(user)
        );
    }

    @Scheduled(cron = "0 20 3 * * *")
    @Transactional
    public void cleanOldSessions() {
        refreshTokenRepository.deleteExpiredBefore(Instant.now().minus(Duration.ofDays(30)));
    }

    private String randomToken() {
        byte[] bytes = new byte[48];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private UserSummary toSummary(User user) {
        var roleNames = user.getRoles().stream().map(role -> role.getName()).sorted().toList();
        var permissionNames = user.getRoles().stream()
                .flatMap(role -> role.getPermissions().stream())
                .map(permission -> permission.getName()).distinct().sorted().toList();
        var portals = new ArrayList<String>();
        if (permissionNames.contains("FACULTY_PORTAL_ACCESS") && user.getFaculty() != null) portals.add("FACULTY");
        if (roleNames.stream().anyMatch(role -> !role.equals("FACULTY") && !role.equals("STUDENT"))) portals.add("ADMIN");
        if (permissionNames.contains("STUDENT_PORTAL_ACCESS") && user.getStudent() != null) portals.add("STUDENT");
        if (portals.isEmpty()) portals.add("ADMIN");
        return new UserSummary(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                roleNames,
                permissionNames,
                user.getFaculty() == null ? null : user.getFaculty().getId(),
                user.getStudent() == null ? null : user.getStudent().getId(),
                user.isMustChangePassword(),
                portals,
                portals.contains("FACULTY") ? "FACULTY" : portals.getFirst()
        );
    }
}
