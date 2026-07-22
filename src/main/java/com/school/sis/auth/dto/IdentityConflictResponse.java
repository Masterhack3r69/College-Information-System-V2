package com.school.sis.auth.dto;

import java.util.UUID;

public record IdentityConflictResponse(UUID userId, String username, String accountType,
                                       String accountName, String authoritativeName,
                                       String accountEmail, String authoritativeEmail,
                                       UUID conflictingUserId, String status, long version) {}
