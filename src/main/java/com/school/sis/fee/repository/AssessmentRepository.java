package com.school.sis.fee.repository;

import com.school.sis.fee.entity.Assessment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import jakarta.persistence.LockModeType;

import java.util.Optional;
import java.util.UUID;

public interface AssessmentRepository extends JpaRepository<Assessment, UUID>, JpaSpecificationExecutor<Assessment> {
    boolean existsByEnrollmentId(UUID enrollmentId);
    Optional<Assessment> findByEnrollmentId(UUID enrollmentId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select assessment from Assessment assessment where assessment.id = :id")
    Optional<Assessment> findByIdForUpdate(UUID id);
}
