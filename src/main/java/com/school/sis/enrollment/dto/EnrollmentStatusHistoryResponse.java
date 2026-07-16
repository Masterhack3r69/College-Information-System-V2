package com.school.sis.enrollment.dto;

import com.school.sis.enrollment.entity.EnrollmentStatus;

import java.time.Instant;
import java.util.UUID;

public record EnrollmentStatusHistoryResponse(
        UUID id,
        EnrollmentStatus fromStatus,
        EnrollmentStatus toStatus,
        String remarks,
        Instant changedAt
) {}
