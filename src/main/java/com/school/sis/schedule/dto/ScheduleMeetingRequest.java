package com.school.sis.schedule.dto;

import jakarta.validation.constraints.NotNull;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.UUID;
import com.school.sis.schedule.entity.ScheduleComponentType;
import com.school.sis.schedule.entity.ScheduleDeliveryMode;

public record ScheduleMeetingRequest(
        @NotNull DayOfWeek dayOfWeek,
        @NotNull LocalTime startTime,
        @NotNull LocalTime endTime,
        ScheduleComponentType componentType,
        ScheduleDeliveryMode deliveryMode,
        UUID roomId,
        String locationDetails
) {
    public ScheduleMeetingRequest(DayOfWeek dayOfWeek, LocalTime startTime, LocalTime endTime) {
        this(dayOfWeek, startTime, endTime, ScheduleComponentType.COMBINED,
                ScheduleDeliveryMode.ONSITE, null, null);
    }
}
