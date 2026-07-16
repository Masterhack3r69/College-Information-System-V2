package com.school.sis.enrollment.dto;

import java.util.List;

public record EnrollmentCancellationReadinessResponse(
        boolean ready,
        boolean financeResolved,
        boolean hasAttendance,
        boolean hasGrades,
        boolean hasLockedAcademicRecords,
        List<EnrollmentValidationIssueResponse> blockers
) {}
