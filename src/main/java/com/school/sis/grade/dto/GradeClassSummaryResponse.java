package com.school.sis.grade.dto;
import com.school.sis.grade.entity.GradeStatus; import java.util.UUID;
public record GradeClassSummaryResponse(UUID scheduleId,UUID courseId,String courseCode,String courseTitle,String sectionCode,UUID facultyId,String facultyName,UUID programId,String programCode,UUID departmentId,String departmentCode,UUID schoolYearId,String schoolYear,UUID semesterId,String semesterName,int enrolledCount,int completedCount,GradeStatus status,String latestCorrectionReason,boolean initialized){}
