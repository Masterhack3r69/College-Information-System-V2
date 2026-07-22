package com.school.sis.enrollment.dto;

import java.time.Instant;

public record EnrollmentConfirmationResponse(EnrollmentResponse enrollment, Account account) {
    public record Account(boolean created,String username,String initialPassword,Instant expiresAt,
                          boolean passwordChangeRequired) {}
}
