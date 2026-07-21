package com.school.sis.schedule.entity;

import com.fasterxml.jackson.databind.JsonNode;
import com.school.sis.auth.entity.User;
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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "schedule_change_history")
public class ScheduleChangeHistory {
    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "schedule_id", nullable = false)
    private ClassSchedule schedule;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private ScheduleChangeAction action;

    private String reason;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "before_snapshot", columnDefinition = "jsonb")
    private JsonNode beforeSnapshot;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "after_snapshot", columnDefinition = "jsonb")
    private JsonNode afterSnapshot;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "acknowledged_warnings", nullable = false, columnDefinition = "jsonb")
    private JsonNode acknowledgedWarnings;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id")
    private User actor;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @PrePersist
    void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public ClassSchedule getSchedule() { return schedule; }
    public void setSchedule(ClassSchedule schedule) { this.schedule = schedule; }
    public ScheduleChangeAction getAction() { return action; }
    public void setAction(ScheduleChangeAction action) { this.action = action; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public JsonNode getBeforeSnapshot() { return beforeSnapshot; }
    public void setBeforeSnapshot(JsonNode beforeSnapshot) { this.beforeSnapshot = beforeSnapshot; }
    public JsonNode getAfterSnapshot() { return afterSnapshot; }
    public void setAfterSnapshot(JsonNode afterSnapshot) { this.afterSnapshot = afterSnapshot; }
    public JsonNode getAcknowledgedWarnings() { return acknowledgedWarnings; }
    public void setAcknowledgedWarnings(JsonNode acknowledgedWarnings) { this.acknowledgedWarnings = acknowledgedWarnings; }
    public User getActor() { return actor; }
    public void setActor(User actor) { this.actor = actor; }
    public Instant getCreatedAt() { return createdAt; }
}
