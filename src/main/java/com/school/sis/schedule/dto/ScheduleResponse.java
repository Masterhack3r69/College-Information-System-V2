package com.school.sis.schedule.dto;

import com.school.sis.schedule.entity.ScheduleStatus;

import java.util.List;
import java.util.UUID;
import java.math.BigDecimal;
import java.time.Instant;

public record ScheduleResponse(
        UUID id,
        UUID sectionId,
        String sectionCode,
        UUID programId,
        String programCode,
        UUID curriculumId,
        String curriculumCode,
        int yearLevel,
        UUID courseId,
        String courseCode,
        String courseTitle,
        BigDecimal creditUnits,
        UUID facultyId,
        String facultyName,
        UUID roomId,
        String roomCode,
        UUID schoolYearId,
        String schoolYear,
        UUID semesterId,
        String semesterName,
        Integer capacity,
        long enrolledCount,
        long availableSeats,
        ScheduleStatus status,
        long version,
        boolean hasEnrollmentActivity,
        boolean gradebookSubmitted,
        boolean gradebookLocked,
        boolean identityLocked,
        String roomSummary,
        List<ScheduleWarningResponse> warnings,
        ScheduleLatestChangeResponse latestChange,
        List<ScheduleMeetingResponse> meetings
) {
}
