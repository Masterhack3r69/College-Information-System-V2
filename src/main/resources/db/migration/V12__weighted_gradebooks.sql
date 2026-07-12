INSERT INTO permissions (id, name, description) VALUES
('00000000-0000-0000-0000-000000000122', 'GRADE_REVIEW', 'Can review, return, and approve department gradebooks'),
('00000000-0000-0000-0000-000000000123', 'GRADE_LOCK', 'Can lock approved gradebooks and create academic records')
ON CONFLICT (name) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000201', id FROM permissions WHERE name IN ('GRADE_REVIEW','GRADE_LOCK') ON CONFLICT DO NOTHING;
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000203', id FROM permissions WHERE name = 'GRADE_REVIEW' ON CONFLICT DO NOTHING;
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000202', id FROM permissions WHERE name = 'GRADE_LOCK' ON CONFLICT DO NOTHING;

CREATE TABLE grading_scales (
    id UUID PRIMARY KEY, scale_code VARCHAR(60) NOT NULL UNIQUE, scale_name TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1, status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE grading_scale_bands (
    id UUID PRIMARY KEY, scale_id UUID NOT NULL REFERENCES grading_scales(id) ON DELETE CASCADE,
    minimum_percentage NUMERIC(6,2) NOT NULL, maximum_percentage NUMERIC(6,2) NOT NULL,
    grade_point NUMERIC(4,2) NOT NULL, remark VARCHAR(40) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT scale_band_percentages CHECK (minimum_percentage >= 0 AND maximum_percentage <= 100 AND minimum_percentage <= maximum_percentage),
    CONSTRAINT scale_band_grade CHECK (grade_point >= 1 AND grade_point <= 5)
);
CREATE INDEX idx_scale_bands_scale ON grading_scale_bands(scale_id, minimum_percentage);

CREATE TABLE grading_templates (
    id UUID PRIMARY KEY, template_code VARCHAR(60) NOT NULL UNIQUE, template_name TEXT NOT NULL,
    program_id UUID NOT NULL REFERENCES programs(id), course_id UUID NOT NULL REFERENCES courses(id), scale_id UUID NOT NULL REFERENCES grading_scales(id),
    version INTEGER NOT NULL DEFAULT 1, midterm_weight NUMERIC(5,2) NOT NULL, final_weight NUMERIC(5,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT template_period_weights CHECK (midterm_weight > 0 AND final_weight > 0 AND midterm_weight + final_weight = 100)
);
CREATE INDEX idx_grading_templates_program_course ON grading_templates(program_id, course_id, status);
CREATE TABLE grading_template_categories (
    id UUID PRIMARY KEY, template_id UUID NOT NULL REFERENCES grading_templates(id) ON DELETE CASCADE,
    period VARCHAR(20) NOT NULL, category_name VARCHAR(120) NOT NULL, weight NUMERIC(5,2) NOT NULL, sort_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT template_category_weight CHECK (weight > 0 AND weight <= 100),
    CONSTRAINT ux_template_category UNIQUE(template_id, period, category_name)
);

CREATE TABLE class_gradebooks (
    id UUID PRIMARY KEY, schedule_id UUID NOT NULL UNIQUE REFERENCES class_schedules(id), template_id UUID REFERENCES grading_templates(id),
    scale_id UUID REFERENCES grading_scales(id), midterm_weight NUMERIC(5,2) NOT NULL, final_weight NUMERIC(5,2) NOT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'DRAFT', latest_correction_reason TEXT,
    initialized_by UUID REFERENCES users(id), submitted_by UUID REFERENCES users(id), submitted_at TIMESTAMPTZ,
    approved_by UUID REFERENCES users(id), approved_at TIMESTAMPTZ, locked_by UUID REFERENCES users(id), locked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_class_gradebooks_status ON class_gradebooks(status);
CREATE TABLE class_gradebook_categories (
    id UUID PRIMARY KEY, gradebook_id UUID NOT NULL REFERENCES class_gradebooks(id) ON DELETE CASCADE,
    template_category_id UUID REFERENCES grading_template_categories(id), period VARCHAR(20) NOT NULL,
    category_name VARCHAR(120) NOT NULL, weight NUMERIC(5,2) NOT NULL, sort_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE grade_assessment_items (
    id UUID PRIMARY KEY, gradebook_id UUID NOT NULL REFERENCES class_gradebooks(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES class_gradebook_categories(id), title VARCHAR(160) NOT NULL,
    maximum_score NUMERIC(8,2) NOT NULL, due_date DATE, sort_order INTEGER NOT NULL, archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT assessment_item_maximum_positive CHECK (maximum_score > 0)
);
CREATE INDEX idx_grade_items_gradebook ON grade_assessment_items(gradebook_id, sort_order);
CREATE TABLE grade_scores (
    id UUID PRIMARY KEY, item_id UUID NOT NULL REFERENCES grade_assessment_items(id) ON DELETE CASCADE,
    enrollment_subject_id UUID NOT NULL REFERENCES enrollment_subjects(id), score NUMERIC(8,2), status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT grade_score_non_negative CHECK (score IS NULL OR score >= 0),
    CONSTRAINT ux_grade_score UNIQUE(item_id, enrollment_subject_id)
);
CREATE TABLE grade_result_overrides (
    id UUID PRIMARY KEY, gradebook_id UUID NOT NULL REFERENCES class_gradebooks(id) ON DELETE CASCADE,
    enrollment_subject_id UUID NOT NULL REFERENCES enrollment_subjects(id), remark VARCHAR(40) NOT NULL, reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ux_grade_result_override UNIQUE(gradebook_id, enrollment_subject_id)
);
CREATE TABLE gradebook_status_history (
    id UUID PRIMARY KEY, gradebook_id UUID NOT NULL REFERENCES class_gradebooks(id) ON DELETE CASCADE,
    from_status VARCHAR(40), to_status VARCHAR(40) NOT NULL, reason TEXT, changed_by UUID REFERENCES users(id), changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_gradebook_history ON gradebook_status_history(gradebook_id, changed_at DESC);

ALTER TABLE grades ADD COLUMN final_percentage NUMERIC(6,2);
ALTER TABLE grades ADD COLUMN midterm_percentage NUMERIC(6,2);
ALTER TABLE grades ADD COLUMN final_period_percentage NUMERIC(6,2);
