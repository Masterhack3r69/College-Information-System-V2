package com.school.sis.fee.dto;

import jakarta.validation.constraints.NotBlank;

public record PaymentVoidRequest(@NotBlank String reason) {}
