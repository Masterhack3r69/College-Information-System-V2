INSERT INTO permissions (id, name, description) VALUES
('00000000-0000-0000-0000-000000000162', 'ACADEMIC_POLICY_MANAGE', 'Can configure academic-standing enrollment eligibility policies'),
('00000000-0000-0000-0000-000000000163', 'GRADUATION_AUDIT_VIEW', 'Can run and view academic graduation audits')
ON CONFLICT (name) DO NOTHING;

INSERT INTO role_permissions(role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000201', id FROM permissions
WHERE name IN ('ACADEMIC_POLICY_MANAGE','GRADUATION_AUDIT_VIEW')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000202', id FROM permissions
WHERE name IN ('ACADEMIC_POLICY_MANAGE','GRADUATION_AUDIT_VIEW')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_id, permission_id)
SELECT role_id, permission_id FROM (
    SELECT r.id AS role_id, p.id AS permission_id
    FROM roles r CROSS JOIN permissions p
    WHERE r.name IN ('DEAN','PROGRAM_HEAD') AND p.name = 'GRADUATION_AUDIT_VIEW'
) grants
ON CONFLICT DO NOTHING;

CREATE TABLE curriculum_requirement_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    curriculum_id UUID NOT NULL REFERENCES curricula(id) ON DELETE CASCADE,
    group_code VARCHAR(60) NOT NULL,
    group_name TEXT NOT NULL,
    requirement_type VARCHAR(30) NOT NULL,
    required_course_count INTEGER,
    required_units NUMERIC(8,2),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ux_curriculum_requirement_group UNIQUE(curriculum_id, group_code),
    CONSTRAINT ck_curriculum_requirement_type CHECK (requirement_type IN ('COURSE_COUNT','UNIT_TOTAL')),
    CONSTRAINT ck_curriculum_requirement_value CHECK (
        (requirement_type = 'COURSE_COUNT' AND required_course_count > 0 AND required_units IS NULL)
        OR (requirement_type = 'UNIT_TOTAL' AND required_units > 0 AND required_course_count IS NULL)
    )
);

CREATE TABLE curriculum_requirement_group_courses (
    group_id UUID NOT NULL REFERENCES curriculum_requirement_groups(id) ON DELETE CASCADE,
    curriculum_course_id UUID NOT NULL REFERENCES curriculum_courses(id) ON DELETE CASCADE,
    PRIMARY KEY(group_id, curriculum_course_id),
    CONSTRAINT ux_curriculum_course_requirement_group UNIQUE(curriculum_course_id)
);

CREATE TABLE enrollment_eligibility_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_status VARCHAR(40) NOT NULL,
    school_year_id UUID NOT NULL REFERENCES school_years(id),
    program_id UUID REFERENCES programs(id),
    enrollment_allowed BOOLEAN NOT NULL DEFAULT true,
    maximum_units NUMERIC(8,2),
    requires_approval BOOLEAN NOT NULL DEFAULT false,
    active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_eligibility_academic_status CHECK (academic_status IN ('REGULAR','IRREGULAR','PROBATION','CANDIDATE_FOR_GRADUATION','GRADUATED','DISMISSED','ON_LEAVE')),
    CONSTRAINT ck_eligibility_maximum_units CHECK (maximum_units IS NULL OR maximum_units > 0)
);

CREATE UNIQUE INDEX ux_active_eligibility_policy_scope
    ON enrollment_eligibility_policies(
        academic_status,
        school_year_id,
        COALESCE(program_id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) WHERE active = true;

CREATE TABLE enrollment_eligibility_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL UNIQUE REFERENCES enrollments(id) ON DELETE CASCADE,
    policy_id UUID NOT NULL REFERENCES enrollment_eligibility_policies(id),
    maximum_units_snapshot NUMERIC(8,2),
    approved_by UUID NOT NULL REFERENCES users(id),
    reason TEXT NOT NULL,
    approved_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE graduation_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id),
    curriculum_id UUID NOT NULL REFERENCES curricula(id),
    result VARCHAR(30) NOT NULL,
    required_units NUMERIC(8,2) NOT NULL DEFAULT 0,
    earned_units NUMERIC(8,2) NOT NULL DEFAULT 0,
    missing_required_count INTEGER NOT NULL DEFAULT 0,
    pending_evaluation_count INTEGER NOT NULL DEFAULT 0,
    unmet_elective_group_count INTEGER NOT NULL DEFAULT 0,
    run_by UUID NOT NULL REFERENCES users(id),
    run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_graduation_audit_result CHECK (result IN ('ELIGIBLE','NOT_ELIGIBLE','CONFIGURATION_INCOMPLETE'))
);

CREATE TABLE graduation_audit_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_id UUID NOT NULL REFERENCES graduation_audits(id) ON DELETE CASCADE,
    issue_type VARCHAR(40) NOT NULL,
    course_id UUID REFERENCES courses(id),
    requirement_group_id UUID REFERENCES curriculum_requirement_groups(id),
    message TEXT NOT NULL,
    CONSTRAINT ck_graduation_issue_type CHECK (issue_type IN ('MISSING_REQUIRED','FAILED','IN_PROGRESS','PENDING_EVALUATION','UNMET_ELECTIVE_GROUP','ELECTIVE_CONFIGURATION'))
);

CREATE INDEX idx_requirement_groups_curriculum ON curriculum_requirement_groups(curriculum_id, active);
CREATE INDEX idx_requirement_group_courses_course ON curriculum_requirement_group_courses(curriculum_course_id);
CREATE INDEX idx_eligibility_policies_year_status ON enrollment_eligibility_policies(school_year_id, academic_status, active);
CREATE INDEX idx_eligibility_policies_program ON enrollment_eligibility_policies(program_id);
CREATE INDEX idx_eligibility_approvals_policy ON enrollment_eligibility_approvals(policy_id);
CREATE INDEX idx_graduation_audits_student ON graduation_audits(student_id, run_at DESC);
CREATE INDEX idx_graduation_audits_curriculum ON graduation_audits(curriculum_id);
CREATE INDEX idx_graduation_audit_issues_audit ON graduation_audit_issues(audit_id);
CREATE INDEX idx_graduation_audit_issues_course ON graduation_audit_issues(course_id);

