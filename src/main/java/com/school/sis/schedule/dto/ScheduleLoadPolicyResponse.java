package com.school.sis.schedule.dto;

import com.school.sis.setup.entity.FacultyType;

import java.math.BigDecimal;
import java.util.UUID;

public record ScheduleLoadPolicyResponse(
        UUID id,
        UUID schoolYearId,
        String schoolYear,
        UUID semesterId,
        String semesterName,
        FacultyType facultyType,
        BigDecimal maximumWeeklyContactHours,
        Integer maximumActiveClasses,
        boolean active
) {
}
