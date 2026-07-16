package com.school.sis.academic.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public final class AcademicExceptionRequests {
    private AcademicExceptionRequests() {}

    public record CaseRequest(@NotNull UUID studentId, @NotBlank String evaluationType, String sourceInstitution,
                              UUID fromCurriculumId, @NotNull UUID targetCurriculumId, String reason) {}
    public record SourceCourse(@NotBlank String sourceType, UUID sourceReferenceId, @NotBlank String courseCode,
                               @NotBlank String courseTitle, @NotNull @DecimalMin("0") BigDecimal creditUnits,
                               String sourceGrade, String sourceRemarks, String termLabel, String schoolYearLabel) {}
    public record Match(@NotNull UUID targetCourseId, @NotEmpty List<UUID> sourceCourseIds,
                        @NotBlank String status, @DecimalMin("0") BigDecimal recommendedUnits,
                        @NotBlank String rationale) {}
    public record Reason(@NotBlank String reason) {}
    public record DocumentLink(@NotNull UUID documentId) {}
    public record Policy(@NotBlank String academicStatus, @NotNull UUID schoolYearId, UUID programId,
                         boolean enrollmentAllowed, @DecimalMin("0.01") BigDecimal maximumUnits,
                         boolean requiresApproval, boolean active) {}
    public record EligibilityApproval(@NotBlank String reason) {}
    public record RequirementGroup(@NotNull UUID curriculumId, @NotBlank String groupCode, @NotBlank String groupName,
                                   @NotBlank String requirementType, Integer requiredCourseCount,
                                   @DecimalMin("0.01") BigDecimal requiredUnits, @NotEmpty List<UUID> curriculumCourseIds,
                                   boolean active) {}
}

