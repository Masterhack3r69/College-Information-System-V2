package com.school.sis.schedule.dto;

import com.school.sis.schedule.entity.ScheduleChangeAction;

import java.time.Instant;
import java.util.UUID;

public record ScheduleLatestChangeResponse(
        UUID id,
        ScheduleChangeAction action,
        String reason,
        String actorName,
        Instant changedAt
) {
}
