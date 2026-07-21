CREATE TABLE schedule_load_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_year_id UUID NOT NULL REFERENCES school_years(id),
    semester_id UUID NOT NULL REFERENCES semesters(id),
    faculty_type VARCHAR(40),
    maximum_weekly_contact_hours NUMERIC(6,2) NOT NULL,
    maximum_active_classes INTEGER,
    active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_schedule_load_hours CHECK (maximum_weekly_contact_hours > 0),
    CONSTRAINT ck_schedule_load_classes CHECK (maximum_active_classes IS NULL OR maximum_active_classes > 0)
);

CREATE UNIQUE INDEX ux_schedule_load_policy_scope
    ON schedule_load_policies(
        school_year_id,
        semester_id,
        COALESCE(faculty_type, '__DEFAULT__')
    ) WHERE active = true;

CREATE INDEX idx_schedule_load_policy_term
    ON schedule_load_policies(school_year_id, semester_id, active);
