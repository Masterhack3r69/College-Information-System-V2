package com.school.sis.schedule.dto;

import java.util.List;
import java.util.UUID;

public record ScheduleCopyPreviewResponse(
        boolean executable,
        List<Item> items,
        List<String> globalIssues
) {
    public record Item(
            UUID sourceScheduleId,
            UUID targetSectionId,
            String courseCode,
            String sourceSectionCode,
            String targetSectionCode,
            boolean copyable,
            List<String> issues
    ) {}
}
