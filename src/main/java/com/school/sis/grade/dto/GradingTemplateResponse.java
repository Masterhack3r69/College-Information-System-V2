package com.school.sis.grade.dto;
import com.school.sis.grade.entity.GradingPeriod; import com.school.sis.setup.entity.ActiveStatus; import java.math.BigDecimal; import java.util.*;
public record GradingTemplateResponse(UUID id,String templateCode,String templateName,UUID programId,String programCode,UUID courseId,String courseCode,UUID scaleId,String scaleName,int version,BigDecimal midtermWeight,BigDecimal finalWeight,ActiveStatus status,List<Category> categories){public record Category(UUID id,GradingPeriod period,String categoryName,BigDecimal weight,int sortOrder){}}
