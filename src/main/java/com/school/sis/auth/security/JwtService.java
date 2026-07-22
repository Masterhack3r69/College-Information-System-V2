package com.school.sis.auth.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Map;
import java.util.UUID;

@Service
public class JwtService {

    private final JwtProperties properties;
    private final SecretKey signingKey;

    public JwtService(JwtProperties properties) {
        this.properties = properties;
        this.signingKey = Keys.hmacShaKeyFor(properties.secret().getBytes(StandardCharsets.UTF_8));
    }

    public String createAccessToken(SisUserDetails userDetails) {
        if (userDetails.sessionId() == null) throw new IllegalArgumentException("A session is required for access tokens");
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(userDetails.getUsername())
                .claims(Map.of(
                        "userId", userDetails.id().toString(),
                        "email", userDetails.email(),
                        "fullName", userDetails.fullName(),
                        "sid", userDetails.sessionId().toString(),
                        "securityVersion", userDetails.securityVersion()
                ))
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(properties.accessExpirationSeconds())))
                .signWith(signingKey)
                .compact();
    }

    public String subject(String token) {
        return claims(token).getSubject();
    }

    public boolean isValid(String token, SisUserDetails userDetails) {
        Claims claims = claims(token);
        return claims.getSubject().equals(userDetails.getUsername())
                && claims.getExpiration().after(Date.from(Instant.now()))
                && securityVersion(token) == userDetails.securityVersion();
    }

    public UUID sessionId(String token) { return UUID.fromString(claims(token).get("sid", String.class)); }

    public long securityVersion(String token) {
        Number value = claims(token).get("securityVersion", Number.class);
        return value == null ? -1 : value.longValue();
    }

    private Claims claims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
