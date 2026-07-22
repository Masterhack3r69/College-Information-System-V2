package com.school.sis.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AuditReasonRequest(@NotNull Long version, @NotBlank @Size(max = 500) String auditReason) {}
