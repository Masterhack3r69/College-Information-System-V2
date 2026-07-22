package com.school.sis.auth.dto;

import java.time.Instant;

public record ProvisionedUserResponse(UserResponse account, String temporaryPassword, Instant expiresAt) {}
