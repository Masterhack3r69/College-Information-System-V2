package com.school.sis.audit.repository;

import com.school.sis.audit.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.UUID;
import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, UUID>, JpaSpecificationExecutor<AuditLog> {
    List<AuditLog> findTop50ByEntityTypeAndEntityIdOrderByCreatedAtDesc(String entityType, UUID entityId);
}
