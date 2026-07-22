package com.school.sis.auth.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record UserResponse(
        UUID id,
        String username,
        String email,
        String fullName,
        boolean active,
        String accountType,
        UUID facultyId,
        String employeeNumber,
        String facultyName,
        String facultyEmail,
        UUID studentId,
        String studentNumber,
        String studentName,
        String studentEmail,
        String identitySyncStatus,
        boolean mustChangePassword,
        Instant temporaryPasswordExpiresAt,
        boolean locked,
        Instant lockedUntil,
        Instant lastLoginAt,
        long activeSessionCount,
        boolean protectedAccount,
        long version,
        List<RoleResponse> roles,
        Instant createdAt,
        Instant updatedAt
) {}
