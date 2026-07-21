package com.school.sis.schedule.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record FacultyLoadResponse(
        UUID facultyId,
        String facultyName,
        String facultyType,
        long activeClasses,
        long confirmedStudents,
        BigDecimal weeklyContactHours,
        BigDecimal maximumWeeklyContactHours,
        Integer maximumActiveClasses,
        BigDecimal remainingHours,
        boolean overloaded,
        boolean policyConfigured
) {
}
