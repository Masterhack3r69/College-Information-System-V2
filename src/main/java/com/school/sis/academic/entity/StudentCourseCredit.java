package com.school.sis.academic.entity;

import com.school.sis.auth.entity.User;
import com.school.sis.common.audit.AuditableEntity;
import com.school.sis.setup.entity.Course;
import com.school.sis.student.entity.Student;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "student_course_credits")
public class StudentCourseCredit extends AuditableEntity {
    @Id private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "student_id") private Student student;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "target_course_id") private Course targetCourse;
    @Column(name = "evaluation_case_id", nullable = false) private UUID evaluationCaseId;
    @Column(name = "evaluation_match_id", nullable = false, unique = true) private UUID evaluationMatchId;
    @Column(name = "credited_units", nullable = false) private BigDecimal creditedUnits;
    @Column(name = "source_label", nullable = false) private String sourceLabel;
    @Column(nullable = false) private boolean active = true;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "posted_by") private User postedBy;
    @Column(name = "posted_at", nullable = false) private Instant postedAt = Instant.now();

    @PrePersist void prePersist() { if (id == null) id = UUID.randomUUID(); }
    public UUID getId() { return id; }
    public Student getStudent() { return student; }
    public void setStudent(Student value) { student = value; }
    public Course getTargetCourse() { return targetCourse; }
    public void setTargetCourse(Course value) { targetCourse = value; }
    public UUID getEvaluationCaseId() { return evaluationCaseId; }
    public void setEvaluationCaseId(UUID value) { evaluationCaseId = value; }
    public UUID getEvaluationMatchId() { return evaluationMatchId; }
    public void setEvaluationMatchId(UUID value) { evaluationMatchId = value; }
    public BigDecimal getCreditedUnits() { return creditedUnits; }
    public void setCreditedUnits(BigDecimal value) { creditedUnits = value; }
    public String getSourceLabel() { return sourceLabel; }
    public void setSourceLabel(String value) { sourceLabel = value; }
    public boolean isActive() { return active; }
    public void setActive(boolean value) { active = value; }
    public User getPostedBy() { return postedBy; }
    public void setPostedBy(User value) { postedBy = value; }
    public Instant getPostedAt() { return postedAt; }
    public void setPostedAt(Instant value) { postedAt = value; }
}

