package com.school.sis.academic.service;

import com.school.sis.academic.dto.AcademicPlanResponse;
import com.school.sis.academic.entity.StudentCourseCredit;
import com.school.sis.academic.repository.StudentCourseCreditRepository;
import com.school.sis.common.exception.NotFoundException;
import com.school.sis.curriculum.entity.CurriculumCourse;
import com.school.sis.curriculum.entity.RequiredStatus;
import com.school.sis.curriculum.repository.CurriculumCourseRepository;
import com.school.sis.grade.entity.AcademicRecord;
import com.school.sis.grade.entity.GradeRemark;
import com.school.sis.grade.entity.GradeStatus;
import com.school.sis.grade.repository.AcademicRecordRepository;
import com.school.sis.student.entity.Student;
import com.school.sis.student.repository.StudentRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class AcademicProgressService {
    private final StudentRepository students;
    private final CurriculumCourseRepository curriculumCourses;
    private final AcademicRecordRepository records;
    private final StudentCourseCreditRepository credits;
    private final JdbcTemplate jdbc;

    public AcademicProgressService(StudentRepository students, CurriculumCourseRepository curriculumCourses,
                                   AcademicRecordRepository records, StudentCourseCreditRepository credits,
                                   JdbcTemplate jdbc) {
        this.students = students;
        this.curriculumCourses = curriculumCourses;
        this.records = records;
        this.credits = credits;
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public boolean hasSatisfiedCourse(UUID studentId, UUID courseId) {
        return records.existsByStudentIdAndCourseIdAndGradeStatusAndRemarksIn(
                studentId, courseId, GradeStatus.LOCKED, Set.of(GradeRemark.PASSED))
                || credits.existsByStudentIdAndTargetCourseIdAndActiveTrue(studentId, courseId);
    }

    @Transactional(readOnly = true)
    public AcademicPlanResponse plan(UUID studentId) {
        Student student = students.findById(studentId).orElseThrow(() -> new NotFoundException("Student not found"));
        List<CurriculumCourse> requirements = curriculumCourses
                .findByCurriculumIdOrderByYearLevelAscSemesterAscSortOrderAsc(student.getCurriculum().getId());
        List<AcademicRecord> academicRecords = records
                .findByStudentIdOrderBySchoolYearSchoolYearAscSemesterSortOrderAscCourseCodeAsc(studentId);
        List<StudentCourseCredit> activeCredits = credits.findByStudentIdAndActiveTrueOrderByPostedAtDesc(studentId);

        Map<UUID, AcademicRecord> latestByCourse = new HashMap<>();
        academicRecords.forEach(record -> latestByCourse.merge(record.getCourse().getId(), record,
                (existing, candidate) -> existing.getGradeStatus() == GradeStatus.LOCKED
                        && existing.getRemarks() == GradeRemark.PASSED ? existing : candidate));
        Map<UUID, StudentCourseCredit> creditByCourse = new HashMap<>();
        activeCredits.forEach(credit -> creditByCourse.put(credit.getTargetCourse().getId(), credit));
        Set<UUID> enrolled = enrolledCourseIds(studentId);
        Set<UUID> pending = pendingCourseIds(studentId);

        List<AcademicPlanResponse.Item> items = new ArrayList<>();
        int completed = 0, credited = 0, missing = 0, pendingCount = 0;
        BigDecimal earnedUnits = BigDecimal.ZERO;
        for (CurriculumCourse requirement : requirements) {
            UUID courseId = requirement.getCourse().getId();
            AcademicRecord record = latestByCourse.get(courseId);
            StudentCourseCredit credit = creditByCourse.get(courseId);
            String status;
            String detail = null;
            if (record != null && record.getGradeStatus() == GradeStatus.LOCKED && record.getRemarks() == GradeRemark.PASSED) {
                status = "COMPLETED"; completed++; earnedUnits = earnedUnits.add(record.getEarnedUnits());
                detail = record.getFinalGrade() == null ? "Passed" : "Grade " + record.getFinalGrade();
            } else if (credit != null) {
                status = "CREDITED"; credited++; earnedUnits = earnedUnits.add(credit.getCreditedUnits());
                detail = credit.getSourceLabel();
            } else if (enrolled.contains(courseId)) {
                status = "ENROLLED"; detail = "Currently enrolled";
            } else if (pending.contains(courseId)) {
                status = "PENDING_EVALUATION"; pendingCount++; detail = "Awaiting evaluation decision";
            } else if (record != null) {
                status = "FAILED"; missing++; detail = record.getRemarks().name();
            } else if (requirement.getRequiredStatus() != RequiredStatus.REQUIRED) {
                status = "OPTIONAL";
            } else {
                status = "MISSING"; missing++;
            }
            items.add(new AcademicPlanResponse.Item(requirement.getId(), courseId,
                    requirement.getCourse().getCourseCode(), requirement.getCourse().getCourseTitle(),
                    requirement.getCourse().getCreditUnits(), requirement.getYearLevel(), requirement.getSemester(),
                    requirement.getRequiredStatus(), status, detail));
        }

        List<AcademicPlanResponse.Credit> creditViews = activeCredits.stream().map(credit ->
                new AcademicPlanResponse.Credit(credit.getId(), credit.getTargetCourse().getId(),
                        credit.getTargetCourse().getCourseCode(), credit.getTargetCourse().getCourseTitle(),
                        credit.getCreditedUnits(), credit.getSourceLabel(), credit.getPostedAt())).toList();
        return new AcademicPlanResponse(studentId, student.getCurriculum().getId(),
                student.getCurriculum().getCurriculumCode(), completed, credited, missing, pendingCount,
                earnedUnits, items, creditViews);
    }

    private Set<UUID> enrolledCourseIds(UUID studentId) {
        return new HashSet<>(jdbc.query("""
                select distinct cs.course_id from enrollment_subjects es
                join enrollments e on e.id=es.enrollment_id
                join class_schedules cs on cs.id=es.class_schedule_id
                where e.student_id=? and e.status in ('DRAFT','SUBMITTED','CONFIRMED') and es.status='ENROLLED'
                """, (rs, row) -> rs.getObject(1, UUID.class), studentId));
    }

    private Set<UUID> pendingCourseIds(UUID studentId) {
        try {
            return new HashSet<>(jdbc.query("""
                    select distinct m.target_course_id from academic_evaluation_cases c
                    join academic_evaluation_matches m on m.case_id=c.id
                    where c.student_id=? and c.status in ('PENDING_ACADEMIC_REVIEW','PENDING_REGISTRAR_APPROVAL')
                      and m.status in ('PENDING','RECOMMENDED')
                    """, (rs, row) -> rs.getObject(1, UUID.class), studentId));
        } catch (org.springframework.jdbc.BadSqlGrammarException ignored) {
            return Set.of();
        }
    }
}
