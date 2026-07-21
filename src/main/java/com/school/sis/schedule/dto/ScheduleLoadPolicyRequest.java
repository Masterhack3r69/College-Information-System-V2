package com.school.sis.schedule.dto;

import com.school.sis.setup.entity.FacultyType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.util.UUID;

public record ScheduleLoadPolicyRequest(
        @NotNull UUID schoolYearId,
        @NotNull UUID semesterId,
        FacultyType facultyType,
        @NotNull @DecimalMin("0.01") BigDecimal maximumWeeklyContactHours,
        @Positive Integer maximumActiveClasses,
        Boolean active
) {
}
