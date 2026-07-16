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

public interface ClassScheduleRepository extends JpaRepository<ClassSchedule, UUID>, JpaSpecificationExecutor<ClassSchedule> {
    java.util.List<ClassSchedule> findBySectionIdAndSchoolYearIdAndSemesterIdAndStatus(
            UUID sectionId, UUID schoolYearId, UUID semesterId, com.school.sis.schedule.entity.ScheduleStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select schedule from ClassSchedule schedule where schedule.id in :ids order by schedule.id")
    List<ClassSchedule> lockByIds(@Param("ids") Set<UUID> ids);
}
