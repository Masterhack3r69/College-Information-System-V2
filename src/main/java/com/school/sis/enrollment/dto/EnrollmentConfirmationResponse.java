package com.school.sis.enrollment.dto;

public record EnrollmentConfirmationResponse(EnrollmentResponse enrollment, Account account) {
    public record Account(boolean created,String username,String initialPassword,boolean passwordChangeRequired) {}
}
