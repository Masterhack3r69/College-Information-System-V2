package com.school.sis.academic.repository;

import com.school.sis.academic.entity.StudentCourseCredit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface StudentCourseCreditRepository extends JpaRepository<StudentCourseCredit, UUID> {
    boolean existsByStudentIdAndTargetCourseIdAndActiveTrue(UUID studentId, UUID courseId);
    List<StudentCourseCredit> findByStudentIdAndActiveTrueOrderByPostedAtDesc(UUID studentId);
}

