package com.school.sis.schedule.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.school.sis.schedule.entity.ScheduleChangeAction;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ScheduleChangeHistoryResponse(
        UUID id,
        UUID scheduleId,
        ScheduleChangeAction action,
        String reason,
        JsonNode beforeSnapshot,
        JsonNode afterSnapshot,
        List<String> acknowledgedWarnings,
        UUID actorId,
        String actorName,
        Instant changedAt
) {
}
