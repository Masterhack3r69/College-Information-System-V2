package com.school.sis.schedule.repository;

import com.school.sis.schedule.entity.ScheduleChangeHistory;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ScheduleChangeHistoryRepository extends JpaRepository<ScheduleChangeHistory, UUID> {
    List<ScheduleChangeHistory> findByScheduleIdOrderByCreatedAtDesc(UUID scheduleId);
    List<ScheduleChangeHistory> findByScheduleIdOrderByCreatedAtDesc(UUID scheduleId, Pageable pageable);
}
