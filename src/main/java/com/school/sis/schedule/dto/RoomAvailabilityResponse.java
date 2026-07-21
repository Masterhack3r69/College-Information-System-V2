package com.school.sis.schedule.dto;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

public record RoomAvailabilityResponse(
        UUID roomId,
        String roomCode,
        String roomName,
        Integer capacity,
        String building,
        String roomType,
        DayOfWeek dayOfWeek,
        List<OccupiedPeriod> occupiedPeriods
) {
    public record OccupiedPeriod(UUID scheduleId, LocalTime startTime, LocalTime endTime, String courseCode, String sectionCode) {}
}
