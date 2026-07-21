CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE rooms ADD COLUMN building TEXT;
ALTER TABLE rooms ADD COLUMN room_type VARCHAR(40);

ALTER TABLE sections ADD COLUMN maximum_capacity INTEGER;
ALTER TABLE sections ADD CONSTRAINT ck_sections_maximum_capacity
    CHECK (maximum_capacity IS NULL OR maximum_capacity > 0);

WITH schedule_capacity AS (
    SELECT section_id, MAX(capacity) AS maximum_capacity
    FROM class_schedules
    GROUP BY section_id
), confirmed_population AS (
    SELECT e.section_id, COUNT(DISTINCT e.student_id)::INTEGER AS confirmed_count
    FROM enrollments e
    WHERE e.status = 'CONFIRMED' AND e.section_id IS NOT NULL
    GROUP BY e.section_id
)
UPDATE sections s
SET maximum_capacity = GREATEST(
    COALESCE(sc.maximum_capacity, 0),
    COALESCE(cp.confirmed_count, 0)
)
FROM schedule_capacity sc
FULL JOIN confirmed_population cp ON cp.section_id = sc.section_id
WHERE s.id = COALESCE(sc.section_id, cp.section_id)
  AND GREATEST(COALESCE(sc.maximum_capacity, 0), COALESCE(cp.confirmed_count, 0)) > 0;

ALTER TABLE class_schedules ALTER COLUMN room_id DROP NOT NULL;
ALTER TABLE class_schedules ADD COLUMN version BIGINT NOT NULL DEFAULT 0;

ALTER TABLE schedule_meetings ADD COLUMN room_id UUID REFERENCES rooms(id);
ALTER TABLE schedule_meetings ADD COLUMN component_type VARCHAR(24);
ALTER TABLE schedule_meetings ADD COLUMN delivery_mode VARCHAR(24);
ALTER TABLE schedule_meetings ADD COLUMN location_details TEXT;
ALTER TABLE schedule_meetings ADD COLUMN revision_number INTEGER NOT NULL DEFAULT 1;
ALTER TABLE schedule_meetings ADD COLUMN active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE schedule_meetings ADD COLUMN effective_from TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE schedule_meetings ADD COLUMN effective_to TIMESTAMPTZ;

UPDATE schedule_meetings meeting
SET room_id = schedule.room_id,
    delivery_mode = 'ONSITE',
    component_type = CASE
        WHEN course.lecture_hours_per_week > 0 AND course.laboratory_hours_per_week > 0 THEN 'COMBINED'
        WHEN course.laboratory_hours_per_week > 0 THEN 'LABORATORY'
        ELSE 'LECTURE'
    END
FROM class_schedules schedule
JOIN courses course ON course.id = schedule.course_id
WHERE schedule.id = meeting.class_schedule_id;

ALTER TABLE schedule_meetings ALTER COLUMN component_type SET NOT NULL;
ALTER TABLE schedule_meetings ALTER COLUMN delivery_mode SET NOT NULL;
ALTER TABLE schedule_meetings ADD CONSTRAINT ck_schedule_meeting_component
    CHECK (component_type IN ('LECTURE', 'LABORATORY', 'COMBINED'));
ALTER TABLE schedule_meetings ADD CONSTRAINT ck_schedule_meeting_delivery
    CHECK (delivery_mode IN ('ONSITE', 'ONLINE', 'HYBRID'));
ALTER TABLE schedule_meetings ADD CONSTRAINT ck_schedule_meeting_location
    CHECK ((delivery_mode = 'ONLINE' AND room_id IS NULL)
        OR (delivery_mode IN ('ONSITE', 'HYBRID') AND room_id IS NOT NULL));
ALTER TABLE schedule_meetings ADD CONSTRAINT ck_schedule_meeting_revision
    CHECK (revision_number > 0);
ALTER TABLE schedule_meetings ADD CONSTRAINT ck_schedule_meeting_effectivity
    CHECK (effective_to IS NULL OR effective_to >= effective_from);

CREATE UNIQUE INDEX ux_schedule_offering_open
    ON class_schedules(section_id, course_id)
    WHERE status IN ('DRAFT', 'ACTIVE');

CREATE INDEX idx_schedule_meetings_room_day_time
    ON schedule_meetings(room_id, day_of_week, start_time, end_time)
    WHERE active = true;
CREATE INDEX idx_schedule_meetings_active_schedule
    ON schedule_meetings(class_schedule_id, active, revision_number);

CREATE TABLE schedule_change_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES class_schedules(id),
    action VARCHAR(32) NOT NULL,
    reason TEXT,
    before_snapshot JSONB,
    after_snapshot JSONB,
    acknowledged_warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
    actor_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_schedule_change_action CHECK (action IN ('CREATED', 'UPDATED', 'ACTIVATED', 'REVISED', 'CANCELLED', 'ARCHIVED', 'COPIED'))
);

CREATE INDEX idx_schedule_change_history_schedule
    ON schedule_change_history(schedule_id, created_at DESC);
CREATE INDEX idx_schedule_change_history_actor
    ON schedule_change_history(actor_id, created_at DESC);

CREATE TABLE schedule_resource_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES class_schedules(id) ON DELETE CASCADE,
    meeting_id UUID NOT NULL REFERENCES schedule_meetings(id) ON DELETE CASCADE,
    school_year_id UUID NOT NULL REFERENCES school_years(id),
    semester_id UUID NOT NULL REFERENCES semesters(id),
    day_of_week VARCHAR(20) NOT NULL,
    resource_type VARCHAR(20) NOT NULL,
    resource_id UUID NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_schedule_reservation_type CHECK (resource_type IN ('ROOM', 'FACULTY', 'SECTION')),
    CONSTRAINT ck_schedule_reservation_time CHECK (end_time > start_time),
    CONSTRAINT ux_schedule_reservation_resource UNIQUE(meeting_id, resource_type, resource_id),
    CONSTRAINT ex_schedule_resource_reservation EXCLUDE USING gist (
        school_year_id WITH =,
        semester_id WITH =,
        day_of_week WITH =,
        resource_type WITH =,
        resource_id WITH =,
        int4range(EXTRACT(EPOCH FROM start_time)::INTEGER, EXTRACT(EPOCH FROM end_time)::INTEGER, '[)') WITH &&
    )
);

CREATE INDEX idx_schedule_reservations_schedule ON schedule_resource_reservations(schedule_id);
CREATE INDEX idx_schedule_reservations_meeting ON schedule_resource_reservations(meeting_id);

INSERT INTO permissions (id, name, description) VALUES
('00000000-0000-0000-0000-000000000164', 'SCHEDULE_REVISE', 'Can revise published schedules'),
('00000000-0000-0000-0000-000000000165', 'SCHEDULE_POLICY_MANAGE', 'Can configure faculty teaching-load policies'),
('00000000-0000-0000-0000-000000000166', 'SCHEDULE_OVERRIDE', 'Can acknowledge and override schedule teaching-load warnings')
ON CONFLICT (name) DO NOTHING;

INSERT INTO role_permissions(role_id, permission_id)
SELECT role.id, permission.id
FROM roles role CROSS JOIN permissions permission
WHERE role.name IN ('SUPER_ADMIN', 'REGISTRAR')
  AND permission.name IN ('SCHEDULE_REVISE', 'SCHEDULE_POLICY_MANAGE', 'SCHEDULE_OVERRIDE')
ON CONFLICT DO NOTHING;
