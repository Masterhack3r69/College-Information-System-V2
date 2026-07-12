package com.school.sis.grade.dto;
import com.school.sis.grade.entity.*; import jakarta.validation.Valid; import jakarta.validation.constraints.*; import java.math.BigDecimal; import java.time.LocalDate; import java.util.*;
public final class GradebookRequests {private GradebookRequests(){}
 public record Initialize(@NotNull UUID templateId){} public record Item(UUID id,@NotNull UUID categoryId,@NotBlank String title,@NotNull @DecimalMin("0.01") BigDecimal maximumScore,LocalDate dueDate,@Min(0) int sortOrder){} public record Scores(@NotEmpty @Valid List<Score> scores){} public record Score(@NotNull UUID itemId,@NotNull UUID enrollmentSubjectId,BigDecimal score,@NotNull ScoreStatus status){} public record Override(@NotNull UUID enrollmentSubjectId,@NotNull GradeRemark remark,@NotBlank String reason){} public record Return(@NotBlank String reason){}
}
