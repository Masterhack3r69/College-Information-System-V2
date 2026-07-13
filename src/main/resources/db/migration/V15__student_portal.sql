ALTER TABLE users ADD COLUMN student_id UUID REFERENCES students(id);
ALTER TABLE users ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX uq_users_student_id ON users(student_id) WHERE student_id IS NOT NULL;

INSERT INTO permissions (id,name,description) VALUES
('00000000-0000-0000-0000-000000000138','STUDENT_PORTAL_ACCESS','Can access the student portal'),
('00000000-0000-0000-0000-000000000139','STUDENT_PROFILE_SELF','Can maintain own student contact information'),
('00000000-0000-0000-0000-000000000140','STUDENT_ENROLLMENT_SELF','Can prepare and submit own enrollment'),
('00000000-0000-0000-0000-000000000141','STUDENT_ACADEMIC_SELF','Can view own schedule and academic records'),
('00000000-0000-0000-0000-000000000142','STUDENT_ATTENDANCE_SELF','Can view own attendance when enabled'),
('00000000-0000-0000-0000-000000000143','STUDENT_FINANCE_SELF','Can view own assessments and receipts'),
('00000000-0000-0000-0000-000000000144','STUDENT_CONTENT_SELF','Can view published content for enrolled classes'),
('00000000-0000-0000-0000-000000000145','STUDENT_REQUEST_SELF','Can submit and track own service requests'),
('00000000-0000-0000-0000-000000000146','STUDENT_PORTAL_ADMIN','Can administer student portal settings and requests')
ON CONFLICT (name) DO NOTHING;

INSERT INTO role_permissions(role_id,permission_id)
SELECT '00000000-0000-0000-0000-000000000207',id FROM permissions
WHERE name IN ('STUDENT_PORTAL_ACCESS','STUDENT_PROFILE_SELF','STUDENT_ENROLLMENT_SELF','STUDENT_ACADEMIC_SELF',
               'STUDENT_ATTENDANCE_SELF','STUDENT_FINANCE_SELF','STUDENT_CONTENT_SELF','STUDENT_REQUEST_SELF')
ON CONFLICT DO NOTHING;
INSERT INTO role_permissions(role_id,permission_id)
SELECT '00000000-0000-0000-0000-000000000202',id FROM permissions WHERE name='STUDENT_PORTAL_ADMIN'
ON CONFLICT DO NOTHING;
INSERT INTO role_permissions(role_id,permission_id)
SELECT '00000000-0000-0000-0000-000000000201',id FROM permissions ON CONFLICT DO NOTHING;

ALTER TABLE enrollments ADD COLUMN submitted_at TIMESTAMPTZ;

CREATE TABLE student_portal_term_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_year_id UUID NOT NULL REFERENCES school_years(id), semester_id UUID NOT NULL REFERENCES semesters(id),
    enrollment_enabled BOOLEAN NOT NULL DEFAULT false, enrollment_opens_at TIMESTAMPTZ, enrollment_closes_at TIMESTAMPTZ,
    attendance_visible BOOLEAN NOT NULL DEFAULT false, portal_notice TEXT,
    created_by UUID REFERENCES users(id), updated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ux_student_portal_term UNIQUE(school_year_id,semester_id),
    CONSTRAINT ck_student_enrollment_window CHECK(enrollment_opens_at IS NULL OR enrollment_closes_at IS NULL OR enrollment_opens_at < enrollment_closes_at)
);

CREATE TABLE portal_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), title VARCHAR(180) NOT NULL, body TEXT NOT NULL,
    audience VARCHAR(30) NOT NULL DEFAULT 'ALL', program_id UUID REFERENCES programs(id), year_level INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT', published_at TIMESTAMPTZ, author_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_portal_announcement_audience CHECK(audience IN ('ALL','PROGRAM','YEAR_LEVEL')),
    CONSTRAINT ck_portal_announcement_status CHECK(status IN ('DRAFT','PUBLISHED','ARCHIVED'))
);

CREATE TABLE student_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), title VARCHAR(180) NOT NULL, description TEXT,
    original_filename TEXT NOT NULL, stored_filename TEXT NOT NULL, mime_type VARCHAR(160) NOT NULL, file_size BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT', uploaded_by UUID NOT NULL REFERENCES users(id), published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_student_form_status CHECK(status IN ('DRAFT','PUBLISHED','ARCHIVED'))
);

CREATE TABLE student_service_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), student_id UUID NOT NULL REFERENCES students(id),
    request_type VARCHAR(30) NOT NULL, document_name VARCHAR(180), purpose TEXT NOT NULL, status VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED',
    student_comment TEXT, staff_comment TEXT, fulfilled_filename TEXT, fulfilled_stored_filename TEXT, fulfilled_mime_type VARCHAR(160),
    handled_by UUID REFERENCES users(id), handled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_student_request_type CHECK(request_type IN ('DOCUMENT','CLEARANCE')),
    CONSTRAINT ck_student_request_status CHECK(status IN ('SUBMITTED','PROCESSING','READY','COMPLETED','REJECTED','CANCELLED'))
);
CREATE TABLE student_service_request_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), request_id UUID NOT NULL REFERENCES student_service_requests(id) ON DELETE CASCADE,
    from_status VARCHAR(30), to_status VARCHAR(30) NOT NULL, comment TEXT, changed_by UUID NOT NULL REFERENCES users(id),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_portal_announcements_status ON portal_announcements(status,published_at DESC);
CREATE INDEX idx_student_requests_owner ON student_service_requests(student_id,created_at DESC);
CREATE INDEX idx_student_requests_status ON student_service_requests(status,created_at DESC);

INSERT INTO student_portal_term_settings(school_year_id,semester_id,attendance_visible)
SELECT sy.id,s.id,true FROM school_years sy CROSS JOIN semesters s WHERE sy.active=true AND s.active=true
ON CONFLICT DO NOTHING;

INSERT INTO users(id,email,username,password_hash,full_name,active,student_id,must_change_password)
SELECT gen_random_uuid(),lower(c.email_address),s.student_number,crypt(s.student_number,gen_salt('bf')),
       trim(concat_ws(' ',s.first_name,s.middle_name,s.last_name,s.suffix)),true,s.id,true
FROM students s JOIN student_contacts c ON c.student_id=s.id
WHERE s.status='ENROLLED' AND c.email_address IS NOT NULL AND btrim(c.email_address)<>''
  AND NOT EXISTS(SELECT 1 FROM users u WHERE u.student_id=s.id)
ON CONFLICT DO NOTHING;
INSERT INTO user_roles(user_id,role_id)
SELECT u.id,'00000000-0000-0000-0000-000000000207' FROM users u WHERE u.student_id IS NOT NULL
ON CONFLICT DO NOTHING;
INSERT INTO audit_logs(action,module,entity_type,entity_id,new_value)
SELECT 'STUDENT_ACCOUNT_BACKFILLED','AUTH','Student',u.student_id,jsonb_build_object('username',u.username)
FROM users u WHERE u.student_id IS NOT NULL AND u.must_change_password=true;
