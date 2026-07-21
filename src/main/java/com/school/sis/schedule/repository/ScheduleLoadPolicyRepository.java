package com.school.sis.schedule.repository;

import com.school.sis.schedule.entity.ScheduleLoadPolicy;
import com.school.sis.setup.entity.FacultyType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ScheduleLoadPolicyRepository extends JpaRepository<ScheduleLoadPolicy, UUID> {
    List<ScheduleLoadPolicy> findBySchoolYearIdAndSemesterIdAndActiveTrueOrderByFacultyTypeAsc(UUID schoolYearId, UUID semesterId);
    Optional<ScheduleLoadPolicy> findFirstBySchoolYearIdAndSemesterIdAndFacultyTypeAndActiveTrue(
            UUID schoolYearId, UUID semesterId, FacultyType facultyType);
    Optional<ScheduleLoadPolicy> findFirstBySchoolYearIdAndSemesterIdAndFacultyTypeIsNullAndActiveTrue(
            UUID schoolYearId, UUID semesterId);
    boolean existsBySchoolYearIdAndSemesterIdAndFacultyTypeAndActiveTrueAndIdNot(
            UUID schoolYearId, UUID semesterId, FacultyType facultyType, UUID id);
    boolean existsBySchoolYearIdAndSemesterIdAndFacultyTypeIsNullAndActiveTrueAndIdNot(
            UUID schoolYearId, UUID semesterId, UUID id);
}
