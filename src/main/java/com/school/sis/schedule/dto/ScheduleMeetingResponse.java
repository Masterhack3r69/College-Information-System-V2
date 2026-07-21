package com.school.sis.schedule.dto;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.UUID;
import java.time.Instant;
import com.school.sis.schedule.entity.ScheduleComponentType;
import com.school.sis.schedule.entity.ScheduleDeliveryMode;

public record ScheduleMeetingResponse(
        UUID id,
        DayOfWeek dayOfWeek,
        LocalTime startTime,
        LocalTime endTime,
        ScheduleComponentType componentType,
        ScheduleDeliveryMode deliveryMode,
        UUID roomId,
        String roomCode,
        String roomName,
        String locationDetails,
        int revisionNumber,
        boolean active,
        Instant effectiveFrom,
        Instant effectiveTo
) {
    public ScheduleMeetingResponse(UUID id, DayOfWeek dayOfWeek, LocalTime startTime, LocalTime endTime) {
        this(id, dayOfWeek, startTime, endTime, ScheduleComponentType.COMBINED,
                ScheduleDeliveryMode.ONSITE, null, null, null, null, 1, true, null, null);
    }
}
