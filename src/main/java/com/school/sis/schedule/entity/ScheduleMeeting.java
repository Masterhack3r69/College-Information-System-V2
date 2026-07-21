package com.school.sis.schedule.entity;

import com.school.sis.common.audit.AuditableEntity;
import com.school.sis.setup.entity.Room;
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

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "schedule_meetings")
public class ScheduleMeeting extends AuditableEntity {
    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "class_schedule_id", nullable = false)
    private ClassSchedule classSchedule;

    @Enumerated(EnumType.STRING)
    @Column(name = "day_of_week", nullable = false)
    private DayOfWeek dayOfWeek;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id")
    private Room room;

    @Enumerated(EnumType.STRING)
    @Column(name = "component_type", nullable = false, length = 24)
    private ScheduleComponentType componentType = ScheduleComponentType.COMBINED;

    @Enumerated(EnumType.STRING)
    @Column(name = "delivery_mode", nullable = false, length = 24)
    private ScheduleDeliveryMode deliveryMode = ScheduleDeliveryMode.ONSITE;

    @Column(name = "location_details")
    private String locationDetails;

    @Column(name = "revision_number", nullable = false)
    private int revisionNumber = 1;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "effective_from", nullable = false)
    private Instant effectiveFrom = Instant.now();

    @Column(name = "effective_to")
    private Instant effectiveTo;

    @PrePersist
    void prePersist() {
        if (id == null) id = UUID.randomUUID();
    }

    public UUID getId() { return id; }
    public ClassSchedule getClassSchedule() { return classSchedule; }
    public void setClassSchedule(ClassSchedule classSchedule) { this.classSchedule = classSchedule; }
    public DayOfWeek getDayOfWeek() { return dayOfWeek; }
    public void setDayOfWeek(DayOfWeek dayOfWeek) { this.dayOfWeek = dayOfWeek; }
    public LocalTime getStartTime() { return startTime; }
    public void setStartTime(LocalTime startTime) { this.startTime = startTime; }
    public LocalTime getEndTime() { return endTime; }
    public void setEndTime(LocalTime endTime) { this.endTime = endTime; }
    public Room getRoom() { return room; }
    public void setRoom(Room room) { this.room = room; }
    public ScheduleComponentType getComponentType() { return componentType; }
    public void setComponentType(ScheduleComponentType componentType) { this.componentType = componentType; }
    public ScheduleDeliveryMode getDeliveryMode() { return deliveryMode; }
    public void setDeliveryMode(ScheduleDeliveryMode deliveryMode) { this.deliveryMode = deliveryMode; }
    public String getLocationDetails() { return locationDetails; }
    public void setLocationDetails(String locationDetails) { this.locationDetails = locationDetails; }
    public int getRevisionNumber() { return revisionNumber; }
    public void setRevisionNumber(int revisionNumber) { this.revisionNumber = revisionNumber; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public Instant getEffectiveFrom() { return effectiveFrom; }
    public void setEffectiveFrom(Instant effectiveFrom) { this.effectiveFrom = effectiveFrom; }
    public Instant getEffectiveTo() { return effectiveTo; }
    public void setEffectiveTo(Instant effectiveTo) { this.effectiveTo = effectiveTo; }
}
