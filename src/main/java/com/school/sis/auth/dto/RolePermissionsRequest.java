package com.school.sis.auth.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.Set;
import java.util.UUID;

public record RolePermissionsRequest(@NotNull Set<UUID> permissionIds, @NotNull Long version,
                                     @NotBlank @Size(max = 500) String auditReason) {}
