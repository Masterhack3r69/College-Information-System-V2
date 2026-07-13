INSERT INTO permissions (id, name, description) VALUES
('00000000-0000-0000-0000-000000000130', 'FACULTY_PORTAL_ACCESS', 'Can access the faculty portal'),
('00000000-0000-0000-0000-000000000131', 'FACULTY_CLASS_VIEW', 'Can view assigned teaching classes'),
('00000000-0000-0000-0000-000000000132', 'ATTENDANCE_MANAGE', 'Can record attendance for assigned classes'),
('00000000-0000-0000-0000-000000000133', 'CLASS_CONTENT_MANAGE', 'Can manage content for assigned classes'),
('00000000-0000-0000-0000-000000000134', 'FACULTY_REPORT_VIEW', 'Can generate reports for assigned classes'),
('00000000-0000-0000-0000-000000000135', 'ADVISING_VIEW', 'Can use assigned adviser workspaces'),
('00000000-0000-0000-0000-000000000136', 'PROFILE_SELF_MANAGE', 'Can maintain own faculty account'),
('00000000-0000-0000-0000-000000000137', 'GRADE_CORRECTION_REQUEST', 'Can request a correction to a locked grade')
ON CONFLICT (name) DO NOTHING;

DELETE FROM role_permissions
WHERE role_id = '00000000-0000-0000-0000-000000000205'
  AND permission_id = (SELECT id FROM permissions WHERE name = 'ACADEMIC_SETUP_VIEW');

INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000205', id FROM permissions
WHERE name IN ('FACULTY_PORTAL_ACCESS','FACULTY_CLASS_VIEW','ATTENDANCE_MANAGE','GRADE_ENCODE',
               'CLASS_CONTENT_MANAGE','FACULTY_REPORT_VIEW','ADVISING_VIEW','PROFILE_SELF_MANAGE','GRADE_CORRECTION_REQUEST')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000201', id FROM permissions
ON CONFLICT DO NOTHING;

CREATE TABLE attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES class_schedules(id),
    meeting_id UUID REFERENCES schedule_meetings(id),
    meeting_date DATE NOT NULL,
    start_time TIME, end_time TIME, room_code VARCHAR(40),
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    reopened_reason TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    finalized_by UUID REFERENCES users(id), finalized_at TIMESTAMPTZ,
    version INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ux_attendance_session UNIQUE(schedule_id, meeting_date, meeting_id),
    CONSTRAINT ck_attendance_session_status CHECK (status IN ('DRAFT','FINALIZED'))
);

CREATE TABLE attendance_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    enrollment_subject_id UUID NOT NULL REFERENCES enrollment_subjects(id),
    attendance_status VARCHAR(20) NOT NULL DEFAULT 'PRESENT', notes TEXT,
    recorded_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ux_attendance_entry UNIQUE(session_id, enrollment_subject_id),
    CONSTRAINT ck_attendance_entry_status CHECK (attendance_status IN ('PRESENT','LATE','ABSENT','EXCUSED'))
);

CREATE TABLE attendance_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    action VARCHAR(40) NOT NULL, reason TEXT, changed_by UUID NOT NULL REFERENCES users(id), changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE class_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), schedule_id UUID NOT NULL REFERENCES class_schedules(id),
    title VARCHAR(180) NOT NULL, body TEXT NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    published_at TIMESTAMPTZ, author_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_announcement_status CHECK (status IN ('DRAFT','PUBLISHED','ARCHIVED'))
);

CREATE TABLE class_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), schedule_id UUID NOT NULL REFERENCES class_schedules(id),
    title VARCHAR(180) NOT NULL, description TEXT, original_filename TEXT NOT NULL, stored_filename TEXT NOT NULL,
    mime_type VARCHAR(160) NOT NULL, file_size BIGINT NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    published_at TIMESTAMPTZ, uploaded_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_material_status CHECK (status IN ('DRAFT','PUBLISHED','ARCHIVED'))
);

CREATE TABLE adviser_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), faculty_id UUID NOT NULL REFERENCES faculty(id), section_id UUID NOT NULL REFERENCES sections(id),
    school_year_id UUID NOT NULL REFERENCES school_years(id), semester_id UUID NOT NULL REFERENCES semesters(id), active BOOLEAN NOT NULL DEFAULT true,
    assigned_by UUID REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ux_adviser_assignment UNIQUE(section_id, school_year_id, semester_id)
);

CREATE TABLE advising_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), assignment_id UUID NOT NULL REFERENCES adviser_assignments(id), student_id UUID NOT NULL REFERENCES students(id),
    category VARCHAR(40) NOT NULL, narrative TEXT NOT NULL, follow_up_date DATE, author_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE grade_correction_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), grade_id UUID NOT NULL REFERENCES grades(id), schedule_id UUID NOT NULL REFERENCES class_schedules(id),
    requested_by UUID NOT NULL REFERENCES users(id), current_grade NUMERIC(4,2), proposed_grade NUMERIC(4,2), proposed_remark VARCHAR(40) NOT NULL,
    reason TEXT NOT NULL, evidence_filename TEXT, status VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED',
    reviewed_by UUID REFERENCES users(id), reviewed_at TIMESTAMPTZ, review_comment TEXT,
    posted_by UUID REFERENCES users(id), posted_at TIMESTAMPTZ, version INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_grade_correction_status CHECK (status IN ('SUBMITTED','HEAD_APPROVED','REJECTED','POSTED','CANCELLED'))
);

CREATE TABLE grade_correction_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), request_id UUID NOT NULL REFERENCES grade_correction_requests(id) ON DELETE CASCADE,
    from_status VARCHAR(30), to_status VARCHAR(30) NOT NULL, comment TEXT, changed_by UUID NOT NULL REFERENCES users(id), changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_attendance_schedule_date ON attendance_sessions(schedule_id, meeting_date);
CREATE INDEX idx_announcements_schedule ON class_announcements(schedule_id, status);
CREATE INDEX idx_materials_schedule ON class_materials(schedule_id, status);
CREATE INDEX idx_adviser_faculty_term ON adviser_assignments(faculty_id, school_year_id, semester_id, active);
CREATE INDEX idx_corrections_schedule_status ON grade_correction_requests(schedule_id, status);
