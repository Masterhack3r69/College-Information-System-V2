package com.school.sis.grade.dto;
import com.school.sis.grade.entity.GradeRemark; import com.school.sis.setup.entity.ActiveStatus; import jakarta.validation.Valid; import jakarta.validation.constraints.*; import java.math.BigDecimal; import java.util.List;
public record GradingScaleRequest(@NotBlank String scaleCode,@NotBlank String scaleName,@Min(1) int version,ActiveStatus status,@NotEmpty @Valid List<Band> bands){public record Band(@NotNull BigDecimal minimumPercentage,@NotNull BigDecimal maximumPercentage,@NotNull BigDecimal gradePoint,@NotNull GradeRemark remark){}}
