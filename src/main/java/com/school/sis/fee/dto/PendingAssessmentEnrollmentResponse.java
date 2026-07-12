package com.school.sis.fee.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record PendingAssessmentEnrollmentResponse(
        UUID enrollmentId, UUID studentId, String studentNumber, String studentName,
        UUID programId, String programCode, int yearLevel,
        UUID schoolYearId, String schoolYear, UUID semesterId, String semesterName,
        BigDecimal totalCreditUnits, int subjectCount
) {}
