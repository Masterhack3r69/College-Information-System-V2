package com.school.sis.fee.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record PaymentVoidRequest(@NotNull UUID requestId, @NotBlank String reason) {}
