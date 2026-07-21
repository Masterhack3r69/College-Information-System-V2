package com.school.sis.schedule.repository;

import com.school.sis.schedule.entity.ClassSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.Optional;

public interface ClassScheduleRepository extends JpaRepository<ClassSchedule, UUID>, JpaSpecificationExecutor<ClassSchedule> {
    java.util.List<ClassSchedule> findBySectionIdAndSchoolYearIdAndSemesterIdAndStatus(
            UUID sectionId, UUID schoolYearId, UUID semesterId, com.school.sis.schedule.entity.ScheduleStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select schedule from ClassSchedule schedule where schedule.id in :ids order by schedule.id")
    List<ClassSchedule> lockByIds(@Param("ids") Set<UUID> ids);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select schedule from ClassSchedule schedule where schedule.id = :id")
    Optional<ClassSchedule> lockById(@Param("id") UUID id);

    @Query("""
            select case when count(schedule) > 0 then true else false end from ClassSchedule schedule
            where schedule.section.id = :sectionId and schedule.course.id = :courseId
              and schedule.status in (com.school.sis.schedule.entity.ScheduleStatus.DRAFT, com.school.sis.schedule.entity.ScheduleStatus.ACTIVE)
              and (:ignoreId is null or schedule.id <> :ignoreId)
            """)
    boolean existsOpenOffering(@Param("sectionId") UUID sectionId, @Param("courseId") UUID courseId,
                               @Param("ignoreId") UUID ignoreId);

    @Query("""
            select case when count(schedule) > 0 then true else false end from ClassSchedule schedule
            where schedule.status = com.school.sis.schedule.entity.ScheduleStatus.ACTIVE
              and (schedule.faculty.id = :resourceId or schedule.course.id = :resourceId
                   or schedule.section.id = :resourceId
                   or exists (select meeting.id from ScheduleMeeting meeting
                              where meeting.classSchedule = schedule and meeting.active = true and meeting.room.id = :resourceId))
            """)
    boolean existsActiveReference(@Param("resourceId") UUID resourceId);

    List<ClassSchedule> findBySchoolYearIdAndSemesterIdAndStatus(UUID schoolYearId, UUID semesterId,
                                                                 com.school.sis.schedule.entity.ScheduleStatus status);

    List<ClassSchedule> findByFacultyIdAndSchoolYearIdAndSemesterIdAndStatus(
            UUID facultyId, UUID schoolYearId, UUID semesterId, com.school.sis.schedule.entity.ScheduleStatus status);
}
