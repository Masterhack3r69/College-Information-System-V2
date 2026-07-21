package com.school.sis.schedule.entity;

import com.school.sis.auth.entity.User;
import com.school.sis.common.audit.AuditableEntity;
import com.school.sis.setup.entity.FacultyType;
import com.school.sis.setup.entity.SchoolYear;
import com.school.sis.setup.entity.Semester;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "schedule_load_policies")
public class ScheduleLoadPolicy extends AuditableEntity {
    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "school_year_id", nullable = false)
    private SchoolYear schoolYear;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "semester_id", nullable = false)
    private Semester semester;

    @Enumerated(EnumType.STRING)
    @Column(name = "faculty_type", length = 40)
    private FacultyType facultyType;

    @Column(name = "maximum_weekly_contact_hours", nullable = false, precision = 6, scale = 2)
    private BigDecimal maximumWeeklyContactHours;

    @Column(name = "maximum_active_classes")
    private Integer maximumActiveClasses;

    @Column(nullable = false)
    private boolean active = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @PrePersist
    void prePersist() {
        if (id == null) id = UUID.randomUUID();
    }

    public UUID getId() { return id; }
    public SchoolYear getSchoolYear() { return schoolYear; }
    public void setSchoolYear(SchoolYear schoolYear) { this.schoolYear = schoolYear; }
    public Semester getSemester() { return semester; }
    public void setSemester(Semester semester) { this.semester = semester; }
    public FacultyType getFacultyType() { return facultyType; }
    public void setFacultyType(FacultyType facultyType) { this.facultyType = facultyType; }
    public BigDecimal getMaximumWeeklyContactHours() { return maximumWeeklyContactHours; }
    public void setMaximumWeeklyContactHours(BigDecimal maximumWeeklyContactHours) { this.maximumWeeklyContactHours = maximumWeeklyContactHours; }
    public Integer getMaximumActiveClasses() { return maximumActiveClasses; }
    public void setMaximumActiveClasses(Integer maximumActiveClasses) { this.maximumActiveClasses = maximumActiveClasses; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public User getCreatedBy() { return createdBy; }
    public void setCreatedBy(User createdBy) { this.createdBy = createdBy; }
}
