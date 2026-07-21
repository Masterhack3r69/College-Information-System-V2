package com.school.sis.schedule.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public record ScheduleRevisionRequest(
        @NotNull Long expectedVersion,
        @NotBlank String reason,
        @NotNull UUID facultyId,
        @NotNull @Positive Integer capacity,
        @NotNull @Size(min = 1) List<@Valid ScheduleMeetingRequest> meetings,
        boolean acknowledgeLoadWarning,
        List<String> acknowledgedWarnings
) {
}
