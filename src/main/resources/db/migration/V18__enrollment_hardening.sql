-- Administrative enrollment records belong to the Registrar workspace.
DELETE FROM role_permissions
WHERE role_id IN (
    '00000000-0000-0000-0000-000000000203',
    '00000000-0000-0000-0000-000000000204',
    '00000000-0000-0000-0000-000000000205'
)
AND permission_id = (SELECT id FROM permissions WHERE name = 'ENROLLMENT_VIEW');

CREATE INDEX idx_attendance_entries_enrollment_subject_id
    ON attendance_entries(enrollment_subject_id);

CREATE INDEX idx_enrollment_status_history_changed_at
    ON enrollment_status_history(enrollment_id, changed_at DESC);

