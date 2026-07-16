package com.school.sis.academic.entity;

import com.school.sis.auth.entity.User;
import com.school.sis.common.audit.AuditableEntity;
import com.school.sis.setup.entity.Program;
import com.school.sis.setup.entity.SchoolYear;
import com.school.sis.student.entity.AcademicStatus;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "enrollment_eligibility_policies")
public class EnrollmentEligibilityPolicy extends AuditableEntity {
    @Id private UUID id;
    @Enumerated(EnumType.STRING) @Column(name = "academic_status", nullable = false) private AcademicStatus academicStatus;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "school_year_id") private SchoolYear schoolYear;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "program_id") private Program program;
    @Column(name = "enrollment_allowed", nullable = false) private boolean enrollmentAllowed = true;
    @Column(name = "maximum_units") private BigDecimal maximumUnits;
    @Column(name = "requires_approval", nullable = false) private boolean requiresApproval;
    @Column(nullable = false) private boolean active = true;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "created_by") private User createdBy;
    @PrePersist void prePersist() { if (id == null) id = UUID.randomUUID(); }
    public UUID getId() { return id; }
}
