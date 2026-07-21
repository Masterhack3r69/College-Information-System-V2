package com.school.sis.schedule.dto;

import jakarta.validation.constraints.NotNull;

import java.util.List;

public record ScheduleLifecycleRequest(
        @NotNull Long expectedVersion,
        String reason,
        boolean acknowledgeLoadWarning,
        List<String> acknowledgedWarnings
) {
}
