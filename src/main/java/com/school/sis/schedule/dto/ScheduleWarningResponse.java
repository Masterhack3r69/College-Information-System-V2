package com.school.sis.schedule.dto;

public record ScheduleWarningResponse(
        String code,
        String message,
        boolean requiresOverride
) {
}
