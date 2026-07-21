package com.school.sis.schedule.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public record ScheduleCopyTermRequest(
        @NotNull UUID sourceSchoolYearId,
        @NotNull UUID sourceSemesterId,
        @NotNull UUID targetSchoolYearId,
        @NotNull UUID targetSemesterId,
        @NotEmpty List<UUID> scheduleIds
) {
}
