package com.school.sis.schedule.dto;

import java.util.List;
import java.util.UUID;

public record ScheduleCopyResultResponse(
        int createdCount,
        List<UUID> createdScheduleIds
) {
}
