package com.school.sis.academic.entity;

import com.school.sis.auth.entity.User;
import com.school.sis.enrollment.entity.Enrollment;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "enrollment_eligibility_approvals")
public class EnrollmentEligibilityApproval {
    @Id private UUID id;
    @OneToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "enrollment_id", unique = true) private Enrollment enrollment;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "policy_id") private EnrollmentEligibilityPolicy policy;
    @Column(name = "maximum_units_snapshot") private BigDecimal maximumUnitsSnapshot;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "approved_by") private User approvedBy;
    @Column(nullable = false) private String reason;
    @Column(name = "approved_at", nullable = false) private Instant approvedAt = Instant.now();
    @PrePersist void prePersist() { if (id == null) id = UUID.randomUUID(); }
    public UUID getId() { return id; }
}
