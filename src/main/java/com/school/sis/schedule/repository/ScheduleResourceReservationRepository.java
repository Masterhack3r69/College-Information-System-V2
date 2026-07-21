package com.school.sis.schedule.repository;

import com.school.sis.schedule.entity.ScheduleResourceReservation;
import com.school.sis.schedule.entity.ScheduleResourceType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

public interface ScheduleResourceReservationRepository extends JpaRepository<ScheduleResourceReservation, UUID> {
    @Modifying
    void deleteByScheduleId(UUID scheduleId);

    @Query("""
            select reservation from ScheduleResourceReservation reservation
            where reservation.schoolYear.id = :schoolYearId
              and reservation.semester.id = :semesterId
              and reservation.dayOfWeek = :dayOfWeek
              and reservation.resourceType = :resourceType
              and reservation.resourceId = :resourceId
              and reservation.startTime < :endTime
              and reservation.endTime > :startTime
              and (:ignoreScheduleId is null or reservation.schedule.id <> :ignoreScheduleId)
            """)
    List<ScheduleResourceReservation> findOverlaps(
            @Param("schoolYearId") UUID schoolYearId,
            @Param("semesterId") UUID semesterId,
            @Param("dayOfWeek") DayOfWeek dayOfWeek,
            @Param("resourceType") ScheduleResourceType resourceType,
            @Param("resourceId") UUID resourceId,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime,
            @Param("ignoreScheduleId") UUID ignoreScheduleId
    );
}
