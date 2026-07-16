package com.school.sis.academic.dto;

import com.school.sis.curriculum.entity.RequiredStatus;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record AcademicPlanResponse(
        UUID studentId,
        UUID curriculumId,
        String curriculumCode,
        int completedCourses,
        int creditedCourses,
        int missingCourses,
        int pendingEvaluations,
        BigDecimal earnedUnits,
        List<Item> items,
        List<Credit> credits
) {
    public record Item(UUID curriculumCourseId, UUID courseId, String courseCode, String courseTitle,
                       BigDecimal creditUnits, int yearLevel, String semester, RequiredStatus requirement,
                       String status, String detail) {}
    public record Credit(UUID id, UUID courseId, String courseCode, String courseTitle, BigDecimal creditedUnits,
                         String sourceLabel, java.time.Instant postedAt) {}
}

