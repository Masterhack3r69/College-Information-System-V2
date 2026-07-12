package com.school.sis.grade.dto;
import com.school.sis.grade.entity.GradeRemark; import com.school.sis.setup.entity.ActiveStatus; import java.math.BigDecimal; import java.util.*;
public record GradingScaleResponse(UUID id,String scaleCode,String scaleName,int version,ActiveStatus status,List<Band> bands){public record Band(UUID id,BigDecimal minimumPercentage,BigDecimal maximumPercentage,BigDecimal gradePoint,GradeRemark remark){}}
