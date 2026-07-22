package com.school.sis.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ReasonRequest(@NotBlank @Size(max = 500) String auditReason) {}
