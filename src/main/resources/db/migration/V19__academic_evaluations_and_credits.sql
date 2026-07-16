INSERT INTO permissions (id, name, description) VALUES
('00000000-0000-0000-0000-000000000159', 'ACADEMIC_EVALUATION_VIEW', 'Can view academic evaluation cases and posted credits'),
('00000000-0000-0000-0000-000000000160', 'ACADEMIC_EVALUATION_REVIEW', 'Can review course equivalency recommendations within assigned academic scope'),
('00000000-0000-0000-0000-000000000161', 'ACADEMIC_EVALUATION_APPROVE', 'Can approve academic evaluations and post course credits')
ON CONFLICT (name) DO NOTHING;

INSERT INTO role_permissions(role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000201', id FROM permissions
WHERE name IN ('ACADEMIC_EVALUATION_VIEW','ACADEMIC_EVALUATION_REVIEW','ACADEMIC_EVALUATION_APPROVE')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000202', id FROM permissions
WHERE name IN ('ACADEMIC_EVALUATION_VIEW','ACADEMIC_EVALUATION_APPROVE')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_id, permission_id)
SELECT role_id, permission_id FROM (
    SELECT r.id AS role_id, p.id AS permission_id
    FROM roles r CROSS JOIN permissions p
    WHERE r.name IN ('DEAN','PROGRAM_HEAD')
      AND p.name IN ('ACADEMIC_EVALUATION_VIEW','ACADEMIC_EVALUATION_REVIEW')
) grants
ON CONFLICT DO NOTHING;

CREATE TABLE academic_evaluation_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id),
    evaluation_type VARCHAR(40) NOT NULL,
    source_institution TEXT,
    from_curriculum_id UUID REFERENCES curricula(id),
    target_curriculum_id UUID NOT NULL REFERENCES curricula(id),
    status VARCHAR(40) NOT NULL DEFAULT 'DRAFT',
    reason TEXT,
    submitted_by UUID REFERENCES users(id),
    submitted_at TIMESTAMPTZ,
    academic_reviewed_by UUID REFERENCES users(id),
    academic_reviewed_at TIMESTAMPTZ,
    registrar_decided_by UUID REFERENCES users(id),
    registrar_decided_at TIMESTAMPTZ,
    decision_reason TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_academic_evaluation_type CHECK (evaluation_type IN ('TRANSFER','SHIFT','SECOND_DEGREE','CURRICULUM_MIGRATION','OTHER')),
    CONSTRAINT ck_academic_evaluation_status CHECK (status IN ('DRAFT','PENDING_ACADEMIC_REVIEW','PENDING_REGISTRAR_APPROVAL','APPROVED','REJECTED','RETURNED')),
    CONSTRAINT ck_academic_evaluation_migration CHECK (
        evaluation_type <> 'CURRICULUM_MIGRATION' OR from_curriculum_id IS NOT NULL
    )
);

CREATE TABLE academic_evaluation_source_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES academic_evaluation_cases(id) ON DELETE CASCADE,
    source_type VARCHAR(30) NOT NULL DEFAULT 'EXTERNAL',
    source_reference_id UUID,
    course_code VARCHAR(80) NOT NULL,
    course_title TEXT NOT NULL,
    credit_units NUMERIC(8,2) NOT NULL,
    source_grade VARCHAR(60),
    source_remarks TEXT,
    term_label VARCHAR(80),
    school_year_label VARCHAR(40),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_academic_source_type CHECK (source_type IN ('EXTERNAL','INTERNAL_RECORD','EXISTING_CREDIT')),
    CONSTRAINT ck_academic_source_units CHECK (credit_units >= 0)
);

CREATE TABLE academic_evaluation_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES academic_evaluation_cases(id) ON DELETE CASCADE,
    target_course_id UUID NOT NULL REFERENCES courses(id),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    recommended_units NUMERIC(8,2),
    rationale TEXT,
    evaluated_by UUID REFERENCES users(id),
    evaluated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ux_academic_case_target UNIQUE(case_id, target_course_id),
    CONSTRAINT ck_academic_match_status CHECK (status IN ('PENDING','RECOMMENDED','REJECTED')),
    CONSTRAINT ck_academic_match_units CHECK (recommended_units IS NULL OR recommended_units >= 0)
);

CREATE TABLE academic_evaluation_match_sources (
    match_id UUID NOT NULL REFERENCES academic_evaluation_matches(id) ON DELETE CASCADE,
    source_course_id UUID NOT NULL REFERENCES academic_evaluation_source_courses(id) ON DELETE CASCADE,
    PRIMARY KEY(match_id, source_course_id)
);

CREATE TABLE academic_evaluation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES academic_evaluation_cases(id) ON DELETE CASCADE,
    from_status VARCHAR(40),
    to_status VARCHAR(40) NOT NULL,
    remarks TEXT,
    changed_by UUID NOT NULL REFERENCES users(id),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE student_course_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id),
    target_course_id UUID NOT NULL REFERENCES courses(id),
    evaluation_case_id UUID NOT NULL REFERENCES academic_evaluation_cases(id),
    evaluation_match_id UUID NOT NULL REFERENCES academic_evaluation_matches(id),
    credited_units NUMERIC(8,2) NOT NULL,
    source_label TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    posted_by UUID NOT NULL REFERENCES users(id),
    posted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_student_credit_units CHECK (credited_units >= 0),
    CONSTRAINT ux_student_credit_match UNIQUE(evaluation_match_id)
);

CREATE UNIQUE INDEX ux_student_active_course_credit
    ON student_course_credits(student_id, target_course_id) WHERE active = true;

CREATE TABLE student_course_credit_reversals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_id UUID NOT NULL UNIQUE REFERENCES student_course_credits(id),
    reason TEXT NOT NULL,
    reversed_by UUID NOT NULL REFERENCES users(id),
    reversed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE academic_evaluation_document_links (
    case_id UUID NOT NULL REFERENCES academic_evaluation_cases(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES student_documents(id) ON DELETE CASCADE,
    PRIMARY KEY(case_id, document_id)
);

CREATE INDEX idx_academic_cases_student ON academic_evaluation_cases(student_id, created_at DESC);
CREATE INDEX idx_academic_cases_target_curriculum ON academic_evaluation_cases(target_curriculum_id);
CREATE INDEX idx_academic_cases_status ON academic_evaluation_cases(status, created_at);
CREATE INDEX idx_academic_cases_from_curriculum ON academic_evaluation_cases(from_curriculum_id);
CREATE INDEX idx_academic_cases_created_by ON academic_evaluation_cases(created_by);
CREATE INDEX idx_academic_source_case ON academic_evaluation_source_courses(case_id);
CREATE INDEX idx_academic_matches_case ON academic_evaluation_matches(case_id);
CREATE INDEX idx_academic_matches_target_course ON academic_evaluation_matches(target_course_id);
CREATE INDEX idx_academic_match_sources_source ON academic_evaluation_match_sources(source_course_id);
CREATE INDEX idx_academic_history_case ON academic_evaluation_history(case_id, changed_at);
CREATE INDEX idx_student_course_credits_student ON student_course_credits(student_id, active);
CREATE INDEX idx_student_course_credits_course ON student_course_credits(target_course_id);
CREATE INDEX idx_student_course_credits_case ON student_course_credits(evaluation_case_id);
